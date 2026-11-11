// Floating holo-billboards around the stations and travel lanes (sci-fi atmosphere).
// Each billboard: framed screen that cycles in-world ads (art/ads/*.jpg) with a scanline flicker, neon frame,
// corner beacons and a support spar; it slowly turns to face the player. Nova-1 also gets small ad drones that orbit it.
// Billboards beyond ~4 km are hidden.
export function init(nova) {
  const T = nova && nova.THREE; if (!T) return { ready: false };
  const scene = nova.scene;
  const base = new URL('../art/ads/', import.meta.url).href, tl = new T.TextureLoader();
  const ADS = ['ad_cantina', 'ad_heatcore', 'ad_edf', 'ad_radio', 'ad_insurance', 'ad_thruster', 'ad_ceres', 'ad_lantern'];
  const tex = {}; const getTex = n => tex[n] || (tex[n] = (() => { const t = tl.load(base + n + '.jpg'); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; })());
  const SITE = { station: ['ad_cantina', 'ad_heatcore', 'ad_edf', 'ad_radio', 'ad_insurance', 'ad_thruster'], ceres: ['ad_ceres', 'ad_heatcore', 'ad_insurance'],
    colony: ['ad_ceres', 'ad_insurance', 'ad_radio'], lantern: ['ad_lantern', 'ad_drift', 'ad_heatcore', 'ad_thruster'], meridian: ['ad_insurance', 'ad_thruster', 'ad_edf'],
    graveyard: ['ad_drift', 'ad_insurance', 'ad_heatcore'], frost: ['ad_heatcore', 'ad_radio'], reef: ['ad_drift', 'ad_lantern', 'ad_thruster'] };
  // scanlines overlay (shared)
  const sc = document.createElement('canvas'); sc.width = 4; sc.height = 64; const sg = sc.getContext('2d');
  for (let y = 0; y < 64; y += 4) { sg.fillStyle = 'rgba(0,0,0,0.35)'; sg.fillRect(0, y, 4, 2); }
  const scanTex = new T.CanvasTexture(sc); scanTex.wrapS = scanTex.wrapT = T.RepeatWrapping; scanTex.repeat.set(1, 40);
  const frameCols = [0x33e6ff, 0xff4fa8, 0xffb347, 0x9b6bff];
  const boards = [], drones = [];
  function makeBoard(list, w, col) {
    const g = new T.Group(); g.name = 'NOVA_AD_BILLBOARD';
    const h = w * 9 / 16;
    const back = new T.Mesh(new T.BoxGeometry(w * 1.06, h * 1.1, w * 0.03), new T.MeshStandardMaterial({ color: 0x0b1118, metalness: 0.85, roughness: 0.35 }));
    back.position.z = -w * 0.02; g.add(back);
    const scr = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: getTex(list[0]), toneMapped: false, transparent: true }));
    scr.position.z = 0.002 * w; g.add(scr);
    const scan = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: scanTex, transparent: true, depthWrite: false, opacity: 0.55 }));
    scan.position.z = 0.004 * w; g.add(scan);
    const fm = new T.MeshBasicMaterial({ color: col, toneMapped: false });
    const t = w * 0.012;
    [[w + t * 2, t, 0, h / 2 + t / 2], [w + t * 2, t, 0, -h / 2 - t / 2], [t, h, -w / 2 - t / 2, 0], [t, h, w / 2 + t / 2, 0]].forEach(([bw, bh, x, y]) => { const b = new T.Mesh(new T.BoxGeometry(bw, bh, t), fm); b.position.set(x, y, 0.004 * w); g.add(b); });
    const spar = new T.Mesh(new T.CylinderGeometry(w * 0.012, w * 0.02, h * 1.4, 10), new T.MeshStandardMaterial({ color: 0x1a232c, metalness: 0.9, roughness: 0.3 }));
    spar.position.set(0, -h * 1.2, -w * 0.03); g.add(spar);
    const beaconM = new T.SpriteMaterial({ color: col, transparent: true, blending: T.AdditiveBlending, depthWrite: false });
    const beacons = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy]) => { const s = new T.Sprite(beaconM); s.scale.setScalar(w * 0.05); s.position.set(sx * (w / 2 + t), sy * (h / 2 + t), w * 0.01); g.add(s); return s; });
    g.traverse(o => { o.raycast = () => { }; });
    return { g, scr, scan, beaconM, list, i: Math.floor(Math.random() * list.length), t: 4 + Math.random() * 6, flick: 0, w };
  }
  function placeAll() {
    const D = (window.NW_DESTS || []).filter(d => d.pos && (d.ads || SITE[d.id]) && !(d.lock && d.lock()));
    if (!D.length) return false;
    D.forEach((d, di) => {
      const list = d.ads || SITE[d.id], n = d.id === 'station' ? 4 : 2, c = d.pos();
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + di, R = (d.r || 250) * (d.id === 'station' ? 1.15 : 1.4) + 120;
        const b = makeBoard(list.slice(k % list.length).concat(list.slice(0, k % list.length)), d.id === 'station' ? 64 : 48, frameCols[(di + k) % frameCols.length]);
        b.g.position.copy(c).add(new T.Vector3(Math.cos(a) * R, 40 + (k % 2 ? 70 : -30), Math.sin(a) * R));
        b.home = b.g.position.clone(); b.bob = Math.random() * 6;
        b.scr.material.map = getTex(b.list[b.i % b.list.length]);
        scene.add(b.g); boards.push(b);
      }
    });
    // ad drones circling Nova-1
    const st = D.find(d => d.id === 'station');
    if (st) for (let k = 0; k < 3; k++) {
      const b = makeBoard(ADS.slice(k * 2, k * 2 + 3), 16, frameCols[k]); b.orbit = { c: st.pos(), r: (st.r || 260) * 0.9 + 60 + k * 40, a: k * 2.1, s: 0.04 + k * 0.015, y: 20 + k * 25 };
      scene.add(b.g); drones.push(b); boards.push(b);
    }
    return true;
  }
  let placed = false, acc = 0;
  const camPos = new T.Vector3(), tmp = new T.Vector3();
  function tick(dt) {
    if (!placed) { acc += dt; if (acc > 1) { acc = 0; try { placed = placeAll(); } catch (e) { placed = true; console.warn('[space_ads]', e); } } return; }
    nova.camera.getWorldPosition(camPos);
    const now = performance.now() * 0.001, inside = !!(window.novaOnFoot && window.novaOnFoot()) || !!window.novaGalaxyOpen;
    for (const b of boards) {
      if (b.orbit) { const o = b.orbit; o.a += o.s * dt; o.c = o.c || camPos; b.g.position.set(o.c.x + Math.cos(o.a) * o.r, o.c.y + o.y + Math.sin(now * 0.6 + o.a) * 4, o.c.z + Math.sin(o.a) * o.r); }
      else b.g.position.y = b.home.y + Math.sin(now * 0.3 + b.bob) * 3;
      const d = b.g.position.distanceTo(camPos), vis = !inside && d < 4000; b.g.visible = vis; if (!vis) continue;
      tmp.set(camPos.x, b.g.position.y, camPos.z); const want = Math.atan2(tmp.x - b.g.position.x, tmp.z - b.g.position.z);
      let dy = want - b.g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); b.g.rotation.y += dy * Math.min(1, dt * 0.4);   // slow turn toward the viewer
      b.scan.material.map.offset.y = (now * 0.15) % 1;
      b.beaconM.opacity = 0.55 + 0.45 * Math.sin(now * 3 + b.bob);
      b.t -= dt;
      if (b.t <= 0) { b.flick = 0.35; b.t = 7 + Math.random() * 4; b.i = (b.i + 1) % b.list.length; }
      if (b.flick > 0) { b.flick -= dt; b.scr.material.opacity = Math.random() < 0.5 ? 0.25 : 1; if (b.flick < 0.18) b.scr.material.map = getTex(b.list[b.i]); if (b.flick <= 0) b.scr.material.opacity = 1; }
    }
  }
  const off = nova.onTick ? nova.onTick(tick) : null;
  window.novaTest = Object.assign(window.novaTest || {}, { ads: () => ({ placed, boards: boards.length, drones: drones.length }) });
  return { ready: true, get count() { return boards.length; }, dispose() { off && off(); boards.forEach(b => scene.remove(b.g)); } };
}
