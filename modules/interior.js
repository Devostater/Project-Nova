// Project Nova: interior / arena system (AI_QUEUE A10).
// novaInterior.enter(def) moves the player out of the cockpit into a small walkable arena;
// exit() puts them back in the seat. While active, the game loop skips flight and calls frame().
// First arena: the firing range (?arena=range). Movement and weapons are owned by A11 fps_core.
//
// Controls
//   PC: WASD move, drag mouse (or arrow keys) to look, click / Space to fire, Esc to leave.
//   Gamepad: left stick move, right stick turn, RT fire, B leave.
//   Quest: left thumbstick smooth move (head-relative), right thumbstick snap turn, right trigger fire, B leave.

export function init(api) {
  const { THREE, scene, camera, cameraRig, renderer, shipGroup, toast } = api;
  const ORIGIN = new THREE.Vector3(0, -40000, 0);   // far below the play space so nothing in flight overlaps
  const tl = new THREE.TextureLoader();
  const tex = (f, rx, ry) => { const t = tl.load(f); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

  const S = { active: false, def: null, root: null, targets: [], bolts: [], pos: new THREE.Vector3(), yaw: 0, pitch: 0, keys: {}, cd: 0, score: 0, shots: 0, hits: 0, snapHeld: false, btnB: false, drag: null, sign: null, prevParent: null };

  function sign() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
    m.userData.draw = () => {
      const g = c.getContext('2d'); g.fillStyle = '#04121c'; g.fillRect(0, 0, 1024, 256);
      g.strokeStyle = '#00e5ff'; g.lineWidth = 8; g.strokeRect(6, 6, 1012, 244);
      g.fillStyle = '#00e5ff'; g.font = 'bold 64px monospace'; g.textAlign = 'center'; g.fillText('FIRING RANGE', 512, 90);
      const acc = S.shots ? Math.round(100 * S.hits / S.shots) : 0;
      g.fillStyle = '#ffcc00'; g.font = 'bold 54px monospace'; g.fillText(`SCORE ${S.score}   HITS ${S.hits}/${S.shots}   ${acc}%`, 512, 180);
      g.fillStyle = '#557788'; g.font = '30px monospace'; g.fillText('Walk to the exit door, or press Esc / B to leave', 512, 235);
      t.needsUpdate = true;
    };
    return m;
  }

  function buildRange() {
    const root = new THREE.Group(); root.name = 'NOVA_RANGE'; root.position.copy(ORIGIN);
    const W = 16, L = 60, H = 7;
    const floorM = new THREE.MeshStandardMaterial({ map: tex('art/textures/tex_metal_floor_1024.jpg', W / 4, L / 4), roughness: 0.55, metalness: 0.7 });
    const wallM = new THREE.MeshStandardMaterial({ map: tex('art/textures/tex_metal_wall_1024.jpg', L / 6, H / 6), roughness: 0.6, metalness: 0.6 });
    const endM = new THREE.MeshStandardMaterial({ map: tex('art/textures/tex_metal_wall_1024.jpg', W / 6, H / 6), roughness: 0.6, metalness: 0.6 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), floorM); floor.rotation.x = -Math.PI / 2; floor.position.z = -L / 2 + 6; root.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ color: 0x1a2128, roughness: 0.9 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, -L / 2 + 6); root.add(ceil);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(L, H), wallM); w.rotation.y = -s * Math.PI / 2; w.position.set(s * W / 2, H / 2, -L / 2 + 6); root.add(w); }
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), endM); back.position.set(0, H / 2, -L + 6); root.add(back);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(W, H), endM); front.rotation.y = Math.PI; front.position.set(0, H / 2, 6); root.add(front);
    // firing line: hazard stripe strip + waist-high rail
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.6), new THREE.MeshStandardMaterial({ map: tex('art/textures/tex_hazard_stripes_1024.jpg', 8, 0.3), roughness: 0.5 }));
    stripe.rotation.x = -Math.PI / 2; stripe.position.set(0, 0.01, -2); root.add(stripe);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(W - 1, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: 0xffaa22, emissive: 0x442200, metalness: 0.8, roughness: 0.3 })); rail.position.set(0, 1.0, -2.2); root.add(rail);
    // light strips along the ceiling
    for (let z = 2; z > -L + 6; z -= 8) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(W * 0.7, 0.05, 0.3), new THREE.MeshBasicMaterial({ color: 0xcfefff, toneMapped: false })); strip.position.set(0, H - 0.05, z); root.add(strip);
      const pl = new THREE.PointLight(0xcfefff, 18, 16, 1.6); pl.position.set(0, H - 0.6, z); root.add(pl);
    }
    root.add(new THREE.HemisphereLight(0x8fb8d8, 0x202428, 0.6));
    // exit door behind the start
    const door = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.35, toneMapped: false }));
    door.rotation.y = Math.PI; door.position.set(0, 1.6, 5.95); root.add(door); S.door = door;
    // score board over the lanes
    S.sign = sign(); S.sign.position.set(0, 5.2, -3); root.add(S.sign); S.sign.userData.draw();
    // targets: lit discs on posts, at 8–45 m
    S.targets = [];
    const discM = () => new THREE.MeshStandardMaterial({ color: 0xff3344, emissive: 0xff2233, emissiveIntensity: 1.2, metalness: 0.3, roughness: 0.4 });
    const spots = [[-5, -10], [0, -14], [5, -10], [-4, -24], [3, -30], [-1, -42], [6, -46], [-6, -36]];
    for (const [x, z] of spots) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4), new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.8 })); post.position.set(x, 0.7, z); root.add(post);
      const pivot = new THREE.Group(); pivot.position.set(x, 1.4, z); root.add(pivot);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 32), discM()); disc.rotation.x = Math.PI / 2; disc.position.y = 0.55; pivot.add(disc);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); ring.position.set(0, 0.55, 0.05); pivot.add(ring);
      const target = { pivot, disc, down: 0, x, z, sway: Math.random() * 6 };
      disc.userData.rangeTarget = true;
      disc.userData.onHit = () => { if (target.down > 0) return; target.down = 2; S.hits++; S.score += 100; if (S.sign?.userData.draw) S.sign.userData.draw(); };
      S.targets.push(target);
    }
    return root;
  }

  const ARENAS = { range: { build: buildRange, start: [0, 0, 3], bounds: [-7.4, 7.4, -52, 5.4], name: 'FIRING RANGE' } };

  function enter(def) {
    if (S.active) return;
    if (typeof def === 'string') def = ARENAS[def];
    if (!def) return;
    S.def = def; S.root = def.build(); scene.add(S.root);
    S.pos.set(def.start[0], 0, def.start[2]); S.yaw = 0; S.pitch = 0; S.score = S.shots = S.hits = 0;
    S.prevParent = cameraRig.parent; S.prevRigPos = cameraRig.position.clone(); S.prevRigQ = cameraRig.quaternion.clone();
    scene.add(cameraRig); cameraRig.quaternion.identity();
    S.active = true;
    cameraRig.position.set(ORIGIN.x + S.pos.x, ORIGIN.y + 1.65, ORIGIN.z + S.pos.z); cameraRig.rotation.set(0, 0, 0);
    api.setActive && api.setActive(true);
    api.modules?.fps_core?.enable?.(); api.modules?.fps_ai?.start?.();
    toast && toast(`${def.name}: shoot the red targets. Esc / B to leave.`, 4000, '#00e5ff');
  }

  function exit() {
    if (!S.active) return;
    api.modules?.fps_ai?.stop?.(); api.modules?.fps_core?.disable?.();
    S.active = false; api.setActive && api.setActive(false);
    (S.prevParent || shipGroup).add(cameraRig); cameraRig.position.copy(S.prevRigPos || new THREE.Vector3()); cameraRig.quaternion.copy(S.prevRigQ || new THREE.Quaternion());
    camera.rotation.set(0, 0, 0);
    for (const b of S.bolts) S.root.remove(b.m);
    S.bolts = [];
    scene.remove(S.root);
    S.root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    S.root = null;
    toast && toast(`Left the range. Score ${S.score}, ${S.hits}/${S.shots} hits.`, 3000, '#00e5ff');
    api.onExit && api.onExit({ score: S.score, hits: S.hits, shots: S.shots });
  }

  // ── input ──
  addEventListener('keydown', e => { if (!S.active) return; S.keys[e.code] = true; if (e.code === 'Escape') exit(); if (e.code === 'Space') fireReq = true; });
  addEventListener('keyup', e => { S.keys[e.code] = false; });
  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', e => { if (!S.active) return; S.drag = { x: e.clientX, y: e.clientY, moved: 0 }; });
  addEventListener('pointermove', e => { if (!S.active || !S.drag) return; const dx = e.clientX - S.drag.x, dy = e.clientY - S.drag.y; S.drag.x = e.clientX; S.drag.y = e.clientY; S.drag.moved += Math.abs(dx) + Math.abs(dy); S.yaw -= dx * 0.004; S.pitch = THREE.MathUtils.clamp(S.pitch - dy * 0.004, -1.2, 1.2); });
  addEventListener('pointerup', () => { if (S.active && S.drag && S.drag.moved < 6) fireReq = true; S.drag = null; });
  let fireReq = false;

  const V = () => new THREE.Vector3();
  const tmp = { a: V(), b: V(), q: new THREE.Quaternion() };

  function fire(from, dir) {
    if (S.cd > 0) return; S.cd = 0.22; S.shots++;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 6), new THREE.MeshBasicMaterial({ color: 0x66f6ff, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.geometry.rotateX(Math.PI / 2);
    const local = from.clone().sub(ORIGIN);
    m.position.copy(local); m.lookAt(local.clone().add(dir)); S.root.add(m);
    S.bolts.push({ m, dir: dir.clone(), life: 1.2, prev: local.clone() });
    api.sound && api.sound('fire');
  }

  function hitTest(p0, p1) {
    for (const t of S.targets) {
      if (t.down > 0) continue;
      const c = t.disc.getWorldPosition(tmp.a).sub(ORIGIN);
      const ab = tmp.b.subVectors(p1, p0), u = THREE.MathUtils.clamp(c.clone().sub(p0).dot(ab) / Math.max(ab.lengthSq(), 1e-6), 0, 1);
      const d = p0.clone().addScaledVector(ab, u).distanceTo(c);
      if (d < 0.6) {
        t.down = 3; S.hits++;
        const dist = Math.hypot(t.x - S.pos.x, t.z - S.pos.z);
        const pts = Math.round(10 + dist * 2 + (d < 0.3 ? 25 : 0)); S.score += pts;
        toast && toast(d < 0.3 ? `BULLSEYE +${pts}` : `HIT +${pts}`, 900, d < 0.3 ? '#ffcc00' : '#00ff88');
        api.sound && api.sound('hit');
        S.sign.userData.draw(); return true;
      }
    }
    return false;
  }

  function padRead() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.connected && p.mapping === 'standard') return p;
    return null;
  }

  function frame(dt) {
    if (!S.active) return;
    S.cd -= dt;
    // A11 owns movement, view and firing; A10 keeps the lane targets and score board alive.
    S.pos.set(cameraRig.position.x - ORIGIN.x, 0, cameraRig.position.z - ORIGIN.z);
    S.pos.x = THREE.MathUtils.clamp(S.pos.x, S.def.bounds[0], S.def.bounds[1]);
    S.pos.z = THREE.MathUtils.clamp(S.pos.z, S.def.bounds[2], S.def.bounds[3]);
    cameraRig.position.x = ORIGIN.x + S.pos.x; cameraRig.position.z = ORIGIN.z + S.pos.z;
    if (S.pos.z > 5.2 && Math.abs(S.pos.x) < 1.2) { exit(); return; }
    const tRange = performance.now() * 0.001;
    for (const t of S.targets) {
      if (t.down > 0) { t.down -= dt; t.pivot.rotation.x = Math.max(-Math.PI / 2, t.pivot.rotation.x - dt * 8); }
      else t.pivot.rotation.x = Math.min(0, t.pivot.rotation.x + dt * 4);
      t.pivot.position.x = t.x + Math.sin(tRange * 0.6 + t.sway) * (Math.abs(t.z) > 20 ? 1.5 : 0.4);
    }
    S.door.material.opacity = 0.25 + 0.15 * Math.sin(tRange * 3);
    return;
    const xr = renderer.xr.isPresenting, session = renderer.xr.getSession && renderer.xr.getSession();
    let mx = 0, mz = 0, turn = 0, fireNow = fireReq; fireReq = false;
    // keyboard
    if (S.keys.KeyW) mz -= 1; if (S.keys.KeyS) mz += 1; if (S.keys.KeyA) mx -= 1; if (S.keys.KeyD) mx += 1;
    if (S.keys.ArrowLeft) turn += 1; if (S.keys.ArrowRight) turn -= 1;
    if (S.keys.ArrowUp) S.pitch = Math.min(1.2, S.pitch + dt); if (S.keys.ArrowDown) S.pitch = Math.max(-1.2, S.pitch - dt);
    // gamepad
    const gp = !xr && padRead();
    if (gp) {
      const dz = v => Math.abs(v) < 0.15 ? 0 : v;
      mx += dz(gp.axes[0]); mz += dz(gp.axes[1]); turn -= dz(gp.axes[2]) * 1.6; S.pitch = THREE.MathUtils.clamp(S.pitch - dz(gp.axes[3]) * dt * 1.6, -1.2, 1.2);
      if (gp.buttons[7] && gp.buttons[7].value > 0.5) fireNow = true;
      const b = gp.buttons[1] && gp.buttons[1].pressed; if (b && !S.btnB) { S.btnB = true; exit(); return; } S.btnB = !!b;
    }
    let vrFire = null;
    if (xr && session) {
      for (const src of session.inputSources) {
        const g = src.gamepad; if (!g) continue;
        const ax = g.axes.length >= 4 ? [g.axes[2], g.axes[3]] : [g.axes[0] || 0, g.axes[1] || 0];
        if (src.handedness === 'left') { if (Math.abs(ax[0]) > 0.15) mx += ax[0]; if (Math.abs(ax[1]) > 0.15) mz += ax[1]; }
        if (src.handedness === 'right') {
          if (Math.abs(ax[0]) > 0.6) { if (!S.snapHeld) { S.snapHeld = true; S.yaw -= Math.sign(ax[0]) * Math.PI / 6; } } else S.snapHeld = false;
          if (g.buttons[0] && g.buttons[0].value > 0.5) vrFire = renderer.xr.getController(src === session.inputSources[0] ? 0 : 1);
          const b = g.buttons[5] && g.buttons[5].pressed; if (b && !S.btnB) { S.btnB = true; exit(); return; } S.btnB = !!b;
        }
      }
    }
    S.yaw += turn * dt * 1.8;
    // move relative to where the player faces (head yaw in VR)
    let fy = S.yaw;
    if (xr) { camera.getWorldDirection(tmp.a); fy = Math.atan2(-tmp.a.x, -tmp.a.z); }
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      const sp = 3.2 * Math.min(1, len) / len * dt, s = Math.sin(fy), c = Math.cos(fy);
      S.pos.x += (mx * c + mz * s) * sp; S.pos.z += (-mx * s + mz * c) * sp;
      const B = S.def.bounds; S.pos.x = THREE.MathUtils.clamp(S.pos.x, B[0], B[1]); S.pos.z = THREE.MathUtils.clamp(S.pos.z, Math.max(B[2], -1.6), B[3]);   // stay behind the firing line
      if (S.pos.z > 5.2 && Math.abs(S.pos.x) < 1.2) { exit(); return; }   // walked into the exit door
    }
    cameraRig.position.set(ORIGIN.x + S.pos.x, ORIGIN.y + (xr ? 0 : 1.65), ORIGIN.z + S.pos.z);
    cameraRig.rotation.set(0, S.yaw, 0);
    if (!xr) camera.rotation.set(S.pitch, 0, 0, 'YXZ');
    // fire
    if (vrFire) { const p = vrFire.getWorldPosition(V()), d = V().set(0, 0, -1).applyQuaternion(vrFire.getWorldQuaternion(tmp.q)); fire(p, d); }
    else if (fireNow) { const p = camera.getWorldPosition(V()), d = camera.getWorldDirection(V()); fire(p.addScaledVector(d, 0.4).add(V(0, -0.15, 0)), d); }
    // bolts
    for (let i = S.bolts.length - 1; i >= 0; i--) {
      const b = S.bolts[i]; b.life -= dt; b.prev.copy(b.m.position);
      b.m.position.addScaledVector(b.dir, 70 * dt);   // slow enough to watch in VR
      if (hitTest(b.prev, b.m.position) || b.life <= 0) { S.root.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); S.bolts.splice(i, 1); }
    }
    // targets sway and pop back up
    const t0 = performance.now() * 0.001;
    for (const t of S.targets) {
      if (t.down > 0) { t.down -= dt; t.pivot.rotation.x = Math.max(-Math.PI / 2, t.pivot.rotation.x - dt * 8); }
      else t.pivot.rotation.x = Math.min(0, t.pivot.rotation.x + dt * 4);
      t.pivot.position.x = t.x + Math.sin(t0 * 0.6 + t.sway) * (Math.abs(t.z) > 20 ? 1.5 : 0.4);
    }
    S.door.material.opacity = 0.25 + 0.15 * Math.sin(t0 * 3);
  }

  return { enter, exit, frame, get active() { return S.active; }, state: () => ({ active: S.active, pos: S.pos.toArray(), score: S.score, hits: S.hits, shots: S.shots, targets: S.targets.length }), _fireAt: (i) => { const t = S.targets[i]; if (!t) return; const p = camera.getWorldPosition(V()); const c = t.disc.getWorldPosition(V()); fire(p, c.sub(p).normalize()); } };
}
