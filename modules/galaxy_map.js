// Galaxy map room (NEXT_UPDATE task 23, first step). A holographic map room you step into: every warp destination
// floats over a holo table in true 3D (height included). Pick one, read distance / height / core cost / ETA, then WARP.
// Open: H key, the WARP tab's GALAXY MAP pad, or nova.modules galaxy_map.open(). Close: Esc / H / B / CLOSE.
// Desktop: drag = rotate, wheel = zoom, click = select. Gamepad: left stick L/R = cycle, right stick = rotate,
// A = warp, B = close. VR: point and pull the trigger (or pinch) at a system or button; thumbstick rotates.
export function init(nova) {
  const T = nova && nova.THREE; if (!T) return { ready: false };
  const { scene, camera, cameraRig: rig, renderer } = nova;
  const ORIGIN = new T.Vector3(0, -60000, 0), MAP_R = 1.15;   // hologram radius in metres
  const S = { open: false, sel: 0, items: [], yaw: 0, zoom: 1, drag: null, prev: null, padHeld: {}, pinch: false };
  const root = new T.Group(); root.name = 'NOVA_GALAXY_MAP'; root.position.copy(ORIGIN); root.visible = false; scene.add(root);
  const ray = new T.Raycaster();

  // ── room: dome, floor, holo table, lights ──
  const dome = new T.Mesh(new T.SphereGeometry(9, 48, 24), new T.MeshBasicMaterial({ color: 0x020812, side: T.BackSide }));
  root.add(dome);
  const starGeo = new T.BufferGeometry(), sp = [];
  for (let i = 0; i < 1400; i++) { const v = new T.Vector3().randomDirection().multiplyScalar(8.6); sp.push(v.x, Math.abs(v.y) * 0.9 + 0.3, v.z); }
  starGeo.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
  root.add(new T.Points(starGeo, new T.PointsMaterial({ color: 0x9fd8ff, size: 0.03, transparent: true, opacity: 0.8 })));
  const floor = new T.Mesh(new T.CircleGeometry(9, 64), new T.MeshStandardMaterial({ color: 0x0a1622, metalness: 0.8, roughness: 0.35 }));
  floor.rotation.x = -Math.PI / 2; root.add(floor);
  for (let r = 2; r <= 8; r += 2) { const ring = new T.Mesh(new T.RingGeometry(r - 0.02, r, 96), new T.MeshBasicMaterial({ color: 0x00a8c8, transparent: true, opacity: 0.25 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; root.add(ring); }
  const table = new T.Mesh(new T.CylinderGeometry(1.25, 1.4, 0.9, 64), new T.MeshStandardMaterial({ color: 0x15232f, metalness: 0.9, roughness: 0.3 }));
  table.position.set(0, 0.45, -1.7); root.add(table);
  const rim = new T.Mesh(new T.TorusGeometry(1.25, 0.025, 8, 96), new T.MeshBasicMaterial({ color: 0x33e6ff })); rim.rotation.x = Math.PI / 2; rim.position.set(0, 0.91, -1.7); root.add(rim);
  const beam = new T.Mesh(new T.CylinderGeometry(1.2, 1.2, 2.4, 64, 1, true), new T.MeshBasicMaterial({ color: 0x33ccff, transparent: true, opacity: 0.05, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
  beam.position.set(0, 2.1, -1.7); root.add(beam);
  root.add(new T.HemisphereLight(0x9fd8ff, 0x101820, 1.2));
  const pl = new T.PointLight(0x33ccff, 8, 6); pl.position.set(0, 2.2, -1.7); root.add(pl);

  // ── hologram ──
  const holo = new T.Group(); holo.position.set(0, 2.05, -1.7); root.add(holo);
  const nodeGeo = new T.SphereGeometry(0.045, 20, 14), haloGeo = new T.RingGeometry(0.07, 0.085, 32);
  const lineMat = new T.LineBasicMaterial({ color: 0x33e6ff, transparent: true, opacity: 0.9 });
  const route = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]), lineMat); holo.add(route);
  const shipMark = new T.Mesh(new T.ConeGeometry(0.035, 0.1, 12), new T.MeshBasicMaterial({ color: 0x33ff99 })); holo.add(shipMark);
  const grid = new T.PolarGridHelper(MAP_R, 12, 4, 64, 0x1d5a70, 0x0e2a38); holo.add(grid);
  function label(text, col, w = 0.5) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d');
    g.fillStyle = 'rgba(2,10,20,0.75)'; g.fillRect(0, 0, 512, 96); g.strokeStyle = col; g.lineWidth = 4; g.strokeRect(2, 2, 508, 92);
    g.fillStyle = col; g.font = 'bold 40px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 50);
    const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false })); s.scale.set(w, w * 96 / 512, 1); return s;
  }
  // info panel + buttons (canvas planes) beside the table
  const panelC = document.createElement('canvas'); panelC.width = 1024; panelC.height = 640; const panelT = new T.CanvasTexture(panelC);
  const panel = new T.Mesh(new T.PlaneGeometry(1.6, 1.0), new T.MeshBasicMaterial({ map: panelT, transparent: true, toneMapped: false }));
  panel.position.set(1.75, 1.65, -1.2); panel.rotation.y = -0.6; root.add(panel);
  function button(text, col, x, y, fn) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 160; const g = c.getContext('2d');
    g.fillStyle = 'rgba(4,16,28,0.92)'; g.fillRect(0, 0, 512, 160); g.strokeStyle = col; g.lineWidth = 10; g.strokeRect(5, 5, 502, 150);
    g.fillStyle = col; g.font = 'bold 64px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 84);
    const m = new T.Mesh(new T.PlaneGeometry(0.62, 0.195), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), toneMapped: false }));
    m.position.set(x, y, -1.2); m.userData.gmAction = fn; m.rotation.y = -0.6; m.position.x = x; root.add(m); return m;
  }
  const btnWarp = button('⚡ WARP', '#33ff99', 1.5, 0.95, () => warp());
  const btnClose = button('✕ CLOSE', '#ff6b7d', 2.05, 0.95, () => close());
  btnClose.position.z = -0.85;
  const btnPrev = button('◀ PREV', '#33e6ff', -1.6, 1.25, () => step(-1)); btnPrev.rotation.y = 0.6; btnPrev.position.z = -1.0;
  const btnNext = button('NEXT ▶', '#33e6ff', -1.6, 0.98, () => step(1)); btnNext.rotation.y = 0.6; btnNext.position.z = -1.0;

  function dests() { return (window.NW_DESTS || []).filter(d => d.id !== 'fwd' && d.pos); }
  function rebuild() {
    S.items.forEach(it => holo.remove(it.g)); S.items = [];
    const L = dests(); if (!L.length) return;
    const ship = window.shipGroup ? window.shipGroup.position : new T.Vector3();
    const pts = L.map(d => { try { return d.pos().clone(); } catch (e) { return new T.Vector3(); } });
    const c = pts.reduce((a, p) => a.add(p), ship.clone()).multiplyScalar(1 / (pts.length + 1));
    const ext = Math.max(...pts.map(p => p.distanceTo(c)), ship.distanceTo(c), 1);
    const k = MAP_R / ext;
    S.map = (p) => p.clone().sub(c).multiplyScalar(k);
    L.forEach((d, i) => {
      const locked = !!(d.lock && d.lock()); const g = new T.Group(); g.position.copy(S.map(pts[i]));
      const col = locked ? 0x556677 : 0x33e6ff;
      const n = new T.Mesh(nodeGeo, new T.MeshBasicMaterial({ color: col })); n.userData.gmIndex = i; g.add(n);
      const h = new T.Mesh(haloGeo, new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, side: T.DoubleSide })); h.userData.gmIndex = i; g.add(h);
      const stem = new T.Mesh(new T.CylinderGeometry(0.004, 0.004, Math.abs(g.position.y), 6), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35 }));
      stem.position.y = -g.position.y / 2; g.add(stem);   // drop line to the plane shows height
      const lab = label(locked ? '??? SIGNAL' : d.name, locked ? '#667788' : '#9fefff', 0.42); lab.position.y = 0.1; g.add(lab);
      holo.add(g); S.items.push({ d, g, n, h, locked });
    });
    shipMark.position.copy(S.map(ship.clone()));
    S.sel = Math.min(S.sel, S.items.length - 1); select(S.sel);
  }
  function info(d) { try { return window.novaWarpInfo ? window.novaWarpInfo(d.id) : {}; } catch (e) { return {}; } }
  function select(i) {
    if (!S.items.length) return; S.sel = (i + S.items.length) % S.items.length;
    S.items.forEach((it, k) => { const on = k === S.sel; it.n.scale.setScalar(on ? 1.7 : 1); it.h.material.opacity = on ? 1 : 0.5; });
    const it = S.items[S.sel]; route.geometry.setFromPoints([shipMark.position.clone(), it.g.position.clone()]);
    drawPanel();
  }
  function step(d) { select(S.sel + d); try { nova.sound && nova.sound.beep && nova.sound.beep(700, 0.05); } catch (e) { } }
  function drawPanel() {
    const g = panelC.getContext('2d'), it = S.items[S.sel]; g.clearRect(0, 0, 1024, 640);
    g.fillStyle = 'rgba(3,12,22,0.92)'; g.fillRect(0, 0, 1024, 640); g.strokeStyle = '#33e6ff'; g.lineWidth = 8; g.strokeRect(4, 4, 1016, 632);
    g.fillStyle = '#33e6ff'; g.font = 'bold 44px monospace'; g.fillText('GALAXY MAP', 40, 70);
    if (!it) { g.fillStyle = '#9fc3d8'; g.font = '32px monospace'; g.fillText('No routes on file.', 40, 160); panelT.needsUpdate = true; return; }
    const inf = info(it.d), ship = window.shipGroup ? window.shipGroup.position : new T.Vector3();
    let dy = 0; try { dy = it.d.pos().y - ship.y; } catch (e) { }
    g.fillStyle = it.locked ? '#778899' : '#ffffff'; g.font = 'bold 52px monospace'; g.fillText(it.locked ? '??? UNKNOWN SIGNAL' : it.d.name, 40, 150);
    g.font = '34px monospace'; g.fillStyle = '#ffd24a';
    if (it.locked) { g.fillText('No route on file. The story, a contact', 40, 230); g.fillText('or a scan will reveal it.', 40, 280); }
    else {
      g.fillText(`DISTANCE  ${Math.round((inf.dist || 0) / 10) / 100} km`, 40, 230);
      g.fillText(`HEIGHT    ${Math.abs(dy) < 60 ? 'LEVEL' : (dy > 0 ? '▲ ' : '▼ ') + Math.round(Math.abs(dy)) + ' m'}`, 40, 285);
      g.fillText(`CORE COST ${inf.cost || 0}%    ETA ${Math.round(inf.eta || 0)} s`, 40, 340);
      g.fillStyle = inf.why ? '#ff8877' : '#33ff99'; g.font = 'bold 40px monospace'; g.fillText(inf.why ? '✕ ' + inf.why : '✓ READY TO JUMP', 40, 420);
    }
    g.fillStyle = '#6f9ab3'; g.font = '26px monospace';
    g.fillText(`${S.sel + 1} / ${S.items.length}   ·   H / Esc / B closes`, 40, 590);
    panelT.needsUpdate = true;
  }
  function warp() {
    const it = S.items[S.sel]; if (!it || it.locked) { try { nova.toast && nova.toast('No route to that signal yet.', 1800, '#ff8877'); } catch (e) { } return; }
    const inf = info(it.d); if (inf.why) { drawPanel(); try { nova.toast && nova.toast('WARP: ' + inf.why, 2200, '#ff6644'); } catch (e) { } return; }
    const id = it.d.id; close(); setTimeout(() => { try { window.novaWarpStart && window.novaWarpStart(id); } catch (e) { } }, 250);
  }

  // ── open / close ──
  function open() {
    if (S.open) return true;
    if (window.novaOnFoot && window.novaOnFoot()) { try { nova.toast && nova.toast('Galaxy map is available from the cockpit.', 2000); } catch (e) { } return false; }
    S.prev = { parent: rig.parent, pos: rig.position.clone(), q: rig.quaternion.clone(), cam: camera.rotation.clone() };
    root.visible = true; scene.add(rig); rig.position.copy(ORIGIN).add(new T.Vector3(0, renderer.xr.isPresenting ? 0 : 1.7, 1.7)); rig.quaternion.identity();
    if (!renderer.xr.isPresenting) camera.rotation.set(-0.12, 0, 0);
    S.open = true; window.novaGalaxyOpen = true; S.yaw = 0; S.zoom = 1; rebuild();
    addEventListener('keydown', key, true); addEventListener('pointerdown', down, true); addEventListener('pointermove', move, true); addEventListener('pointerup', up, true); addEventListener('wheel', wheel, { passive: false, capture: true });
    try { renderer.xr.getController(0).addEventListener('selectstart', xrSelect); renderer.xr.getController(1).addEventListener('selectstart', xrSelect); } catch (e) { }
    try { nova.toast && nova.toast('GALAXY MAP · pick a system, then WARP', 2400, '#33e6ff'); } catch (e) { }
    return true;
  }
  function close() {
    if (!S.open) return; S.open = false; window.novaGalaxyOpen = false; root.visible = false;
    const p = S.prev; if (p) { (p.parent || scene).add(rig); rig.position.copy(p.pos); rig.quaternion.copy(p.q); camera.rotation.copy(p.cam); }
    removeEventListener('keydown', key, true); removeEventListener('pointerdown', down, true); removeEventListener('pointermove', move, true); removeEventListener('pointerup', up, true); removeEventListener('wheel', wheel, { capture: true });
    try { renderer.xr.getController(0).removeEventListener('selectstart', xrSelect); renderer.xr.getController(1).removeEventListener('selectstart', xrSelect); } catch (e) { }
  }
  function toggle() { return S.open ? (close(), false) : open(); }

  // ── input ──
  function pick(origin, dir) {
    ray.set(origin, dir); ray.camera = camera;
    const targets = []; S.items.forEach(it => targets.push(it.n, it.h)); targets.push(btnWarp, btnClose, btnPrev, btnNext);
    const h = ray.intersectObjects(targets, false)[0]; if (!h) return false;
    if (h.object.userData.gmAction) { h.object.userData.gmAction(); return true; }
    if (h.object.userData.gmIndex !== undefined) { select(h.object.userData.gmIndex); return true; }
    return false;
  }
  function key(e) {
    if (!S.open) return; e.stopImmediatePropagation();
    if (e.code === 'Escape' || e.code === 'KeyH') { e.preventDefault(); close(); }
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') step(1); else if (e.code === 'ArrowLeft' || e.code === 'KeyA') step(-1);
    else if (e.code === 'Enter' || e.code === 'Space') warp();
  }
  function down(e) { if (!S.open || renderer.xr.isPresenting) return; if (e.target && e.target.closest && e.target.closest('button,input,select')) return; e.stopImmediatePropagation(); S.drag = { x: e.clientX, y: e.clientY, moved: 0 }; }
  function move(e) { if (!S.open || !S.drag) return; const dx = e.clientX - S.drag.x; S.drag.x = e.clientX; S.drag.moved += Math.abs(dx); S.yaw += dx * 0.008; }
  function up(e) {
    if (!S.open || !S.drag) return; const d = S.drag; S.drag = null; if (d.moved > 6) return;
    const r = renderer.domElement.getBoundingClientRect(), v = new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v, camera); pick(ray.ray.origin.clone(), ray.ray.direction.clone());
  }
  function wheel(e) { if (!S.open) return; e.preventDefault(); e.stopImmediatePropagation(); S.zoom = T.MathUtils.clamp(S.zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.5, 2.5); }
  function xrSelect(ev) { if (!S.open) return; const c = ev.target, o = c.getWorldPosition(new T.Vector3()), d = new T.Vector3(0, 0, -1).applyQuaternion(c.getWorldQuaternion(new T.Quaternion())); pick(o, d); }
  function tick(dt) {
    if (!S.open) return;
    holo.rotation.y = S.yaw; holo.scale.setScalar(S.zoom); S.items.forEach(it => it.h.lookAt(camera.getWorldPosition(new T.Vector3())));
    beam.material.opacity = 0.04 + Math.sin(performance.now() * 0.002) * 0.015;
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const ses = renderer.xr.getSession && renderer.xr.getSession(); if (ses) for (const s of ses.inputSources) if (s.gamepad) pads.push(s.gamepad);
    pads.forEach((g, gi) => {
      const ax = g.axes || [], lx = ax.length >= 4 && ses ? ax[2] : ax[0] || 0, rx = ax.length >= 4 ? ax[2] : 0;
      if (!ses) { S.yaw -= (Math.abs(rx) > 0.2 ? rx : 0) * dt * 1.6; }
      else if (Math.abs(lx) > 0.3) S.yaw -= lx * dt * 1.4;
      const held = k => !!(g.buttons[k] && g.buttons[k].pressed), edge = (k, fn) => { const id = gi + ':' + k; if (held(k) && !S.padHeld[id]) fn(); S.padHeld[id] = held(k); };
      if (!ses) {
        const id = gi + ':lx'; const dir = (ax[0] || 0) > 0.6 ? 1 : (ax[0] || 0) < -0.6 ? -1 : 0; if (dir && !S.padHeld[id]) step(dir); S.padHeld[id] = !!dir;
        edge(0, warp); edge(1, close); edge(14, () => step(-1)); edge(15, () => step(1));
      } else { edge(5, close); }
    });
    if (S.items.length && Math.random() < 0.05) drawPanel();   // keep core / cooling status fresh
  }
  const off = nova.onTick ? nova.onTick(tick) : null;
  addEventListener('keydown', e => { if (!S.open && e.code === 'KeyH' && !(window.novaOnFoot && window.novaOnFoot()) && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) { e.preventDefault(); open(); } });
  window.novaGalaxyMap = { open, close, toggle };
  window.novaTest = Object.assign(window.novaTest || {}, { galaxy: () => (open(), { open: S.open, items: S.items.map(it => it.d.name), sel: S.sel }), galaxyPick: i => (select(i), drawPanel(), S.items[S.sel] && S.items[S.sel].d.id) });
  return { ready: true, open, close, toggle, get active() { return S.open; }, dispose() { close(); off && off(); scene.remove(root); } };
}
