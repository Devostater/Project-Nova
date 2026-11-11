// New places to warp to (data: ../data/places.json). Each place is a warp destination (pushed into window.NW_DESTS, so it
// shows on the WARP tab and in the galaxy map room), a piece of scenery built here from the place's "kind", and a small
// activity that runs when you fly there:
//   nebula      VEIL OUTPOST     fly through 3 survey buoys: credits per buoy, bonus + full shields for all three
//   ice         KORVA ICE WORKS  buys all your ore above the station rate, free hull repair (cooldown)
//   ruin        THE SILENT GATE  read 4 glyph pylons: lore, then a one-time heat core + credits
//   battlefield ASHFALL FIELD    salvage crates (credits; one holds a nav chip that unlocks the hideout) and live mines
//   hideout     BLACK ANCHOR     locked until the nav chip or until Orin leaks it on The Drift Report; fence pays per visit
//   planet      TALOS IV         a second planet to orbit (landing comes later)
// Scenery is hidden beyond ~14 km. State is saved in localStorage.
const KEY = 'novaPlacesV1';
export function init(nova) {
  const T = nova && nova.THREE; if (!T) return { ready: false };
  const scene = nova.scene, WS = window.novaWorldScale || 3;
  const ld = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const S = Object.assign({ seen: {}, unlock: {}, t: 0, cd: {}, glyphs: {}, gateDone: false, rumors: 0, chip: false }, ld() || {});
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
  const toast = (m, ms, c) => { try { nova.toast && nova.toast(m, ms || 3000, c || '#9fefff'); } catch (e) { } };
  const credits = n => { try { window.novaAddCredits && window.novaAddCredits(n); } catch (e) { } };
  const news = (headline, body) => { try { nova.emit && nova.emit('novaNetPublish', { id: 'place_' + Date.now(), headline, dek: 'Navigation notice', body, category: 'exploration' }); } catch (e) { } };
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed & 0xffff) / 0xffff; }; const rr = (a, b) => a + rnd() * (b - a);
  const M = {
    hull: new T.MeshStandardMaterial({ color: 0x3a424c, metalness: 0.75, roughness: 0.55 }), dark: new T.MeshStandardMaterial({ color: 0x14181d, metalness: 0.6, roughness: 0.8 }),
    panel: new T.MeshStandardMaterial({ color: 0x16284a, metalness: 0.9, roughness: 0.25, emissive: 0x0a1c44, emissiveIntensity: 0.6 }),
    rock: new T.MeshStandardMaterial({ color: 0x2a2623, metalness: 0.1, roughness: 0.95, flatShading: true }),
    ice: new T.MeshStandardMaterial({ color: 0xbfe8ff, metalness: 0.15, roughness: 0.22, emissive: 0x16384a, emissiveIntensity: 0.5, flatShading: true }),
    stone: new T.MeshStandardMaterial({ color: 0x20262a, metalness: 0.35, roughness: 0.7, flatShading: true }),
  };
  const glow = hex => new T.MeshBasicMaterial({ color: hex, toneMapped: false });
  const box = (g, w, h, d, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };
  const cyl = (g, r1, r2, h, m, x = 0, y = 0, z = 0, seg = 16) => { const o = new T.Mesh(new T.CylinderGeometry(r1, r2, h, seg), m); o.position.set(x, y, z); g.add(o); return o; };
  // soft round sprite texture (shared)
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; })();
  const light = (g, hex, size, x, y, z, op = 0.9) => { const s = new T.Sprite(new T.SpriteMaterial({ map: dot, color: hex, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false })); s.scale.setScalar(size); s.position.set(x, y, z); g.add(s); return s; };
  // lumpy rock / ice: displaced icosahedron
  function lump(radius, detail, mat, amp) {
    const geo = new T.IcosahedronGeometry(radius, detail), p = geo.attributes.position, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * 0.021 + 1.3) * Math.cos(v.y * 0.017 - 0.4) + Math.sin(v.z * 0.026 + v.x * 0.011) * 0.6 + Math.sin(v.y * 0.05 + v.z * 0.04) * 0.25; v.multiplyScalar(1 + n * amp); p.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals(); return new T.Mesh(geo, mat);
  }
  function wreck(g, len, x, y, z) {
    const h = new T.Group(); box(h, len * 0.22, len * 0.14, len, M.hull); box(h, len * 0.14, len * 0.1, len * 0.3, M.dark, 0, len * 0.11, -len * 0.25, 0, 0, 0.1);
    box(h, len * 0.5, len * 0.02, len * 0.2, M.dark, len * 0.14, 0, len * 0.2, 0.2, 0.3, 0.5); box(h, len * 0.06, len * 0.06, len * 0.5, M.dark, -len * 0.16, -len * 0.04, len * 0.1, 0.1, 0.2, 0);
    h.position.set(x, y, z); h.rotation.set(rr(0, 3), rr(0, 6), rr(0, 3)); g.add(h); return h;
  }

  // ── scenery builders: each returns { g, tick?(dt, now, shipLocal, dist), reset?() } ──
  const BUILD = {
    nebula(P) {
      const g = new T.Group(), col = new T.Color(P.col), col2 = new T.Color(0x4fd0ff);
      for (let i = 0; i < 70; i++) { const c = (i % 3 ? col : col2).clone().multiplyScalar(rr(0.5, 1)); const s = light(g, c, rr(260, 620), rr(-900, 900), rr(-420, 420), rr(-900, 900), rr(0.05, 0.13)); s.userData.cloud = true; }
      // ring outpost
      const st = new T.Group(); g.add(st);
      const ring = new T.Mesh(new T.TorusGeometry(46, 5, 12, 48), M.hull); ring.rotation.x = Math.PI / 2; st.add(ring);
      const win = new T.Mesh(new T.TorusGeometry(46, 5.15, 4, 48, Math.PI * 2), glow(0xffe2a8)); win.rotation.x = Math.PI / 2; win.scale.set(1, 1, 0.12); st.add(win);
      cyl(st, 9, 9, 34, M.hull); cyl(st, 4, 9, 10, M.dark, 0, 22, 0); cyl(st, 1, 1, 40, M.dark, 0, 46, 0, 6); light(st, 0xff4466, 14, 0, 67, 0);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, sp = box(st, 3, 3, 40, M.dark, Math.cos(a) * 25, 0, Math.sin(a) * 25); sp.rotation.y = -a + Math.PI / 2; }
      [-1, 1].forEach(s => { box(st, 60, 0.8, 22, M.panel, s * 86, 0, 0); box(st, 12, 1.5, 2, M.dark, s * 52, 0, 0); });
      light(st, new T.Color(P.col), 60, 0, 0, 0, 0.5);
      const buoys = [[230, 60, -120], [-260, -40, 150], [40, 150, 270]].map(([x, y, z], i) => {
        const b = new T.Group(); b.position.set(x, y, z); const core = new T.Mesh(new T.OctahedronGeometry(6), glow(0x7fffe0)); b.add(core);
        const hoop = new T.Mesh(new T.TorusGeometry(32, 1.2, 8, 40), glow(0x7fffe0)); b.add(hoop); b.userData.sp = light(b, 0x7fffe0, 46, 0, 0, 0, 0.7); g.add(b); return { b, hoop, i };
      });
      const cdKey = 'veil';
      return { g, tick(dt, now, sl) {
        st.rotation.y += dt * 0.05;
        const ready = (S.cd[cdKey] || 0) <= S.t; if (ready && S.veilGot && S.veilGot.length >= 3) S.veilGot = [];
        const got = S.veilGot || (S.veilGot = []);
        buoys.forEach(o => { const done = got.includes(o.i); o.b.visible = !done; o.hoop.rotation.y += dt * 0.8; o.b.lookAt(sl); if (done) return;
          if (o.b.position.distanceTo(sl) < 42) { got.push(o.i); credits(350); toast(`SURVEY BUOY ${got.length}/3 LOGGED  +350 CR`, 2200, '#7fffe0');
            if (got.length >= 3) { credits(800); try { window.novaShield = 100; } catch (e) { } S.cd[cdKey] = S.t + 600; toast('VEIL SURVEY COMPLETE  +800 CR · shields recharged by the outpost', 3600, '#c58cff'); nova.emit && nova.emit('placeActivity', { id: P.id, what: 'survey' }); }
            save(); } });
      } };
    },
    ice(P) {
      const g = new T.Group(); const big = lump(190, 4, M.ice, 0.07); g.add(big);
      for (let i = 0; i < 14; i++) { const c = lump(rr(8, 34), 1, M.ice, 0.22); const a = rr(0, 6.28), d = rr(260, 620); c.position.set(Math.cos(a) * d, rr(-160, 160), Math.sin(a) * d); c.rotation.set(rr(0, 3), rr(0, 3), 0); g.add(c); }
      // colony on the "top" of the comet
      const col = new T.Group(); col.position.set(0, 196, 0); g.add(col);
      [[0, 0, 26], [48, -30, 18], [-44, 26, 16], [20, 52, 13]].forEach(([x, z, r]) => { const d = new T.Mesh(new T.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.hull); d.position.set(x, -6, z); col.add(d);
        const band = new T.Mesh(new T.CylinderGeometry(r * 0.985, r * 0.985, r * 0.16, 20, 1, true), glow(0xffd9a0)); band.position.set(x, -6 + r * 0.3, z); band.scale.setScalar(0.96); col.add(band); });
      box(col, 60, 3, 4, M.dark, 24, -2, -15, 0, 0.55, 0); box(col, 50, 3, 4, M.dark, -22, -2, 13, 0, -0.52, 0);
      const drills = [[-70, -50], [78, 40], [-10, -84]].map(([x, z]) => { const d = new T.Group(); d.position.set(x, -8, z); cyl(d, 3, 6, 70, M.dark, 0, 35, 0, 8); cyl(d, 7, 7, 6, M.hull, 0, 68, 0, 8); const bit = cyl(d, 1.2, 1.2, 60, glow(0x8fe8ff), 0, 20, 0, 6); light(d, 0xff5533, 12, 0, 76, 0); light(d, 0x8fe8ff, 40, 0, 2, 0, 0.6); col.add(d); return bit; });
      [[-110, 30, 40], [120, 20, -60], [10, 40, 120]].forEach(([x, y, z]) => light(col, 0xffffff, 70, x, y, z, 0.55));
      const pad = cyl(col, 34, 34, 2, M.dark, 110, 2, 70, 24); const pr = new T.Mesh(new T.TorusGeometry(30, 0.8, 6, 40), glow(0x33ff99)); pr.rotation.x = Math.PI / 2; pr.position.copy(pad.position).y += 1.4; col.add(pr);
      return { g, tick(dt, now, sl, dist) {
        big.rotation.y += dt * 0.004; drills.forEach((b, i) => { b.material.color.setHSL(0.53, 1, 0.55 + 0.25 * Math.sin(now * 6 + i)); });
        if (dist > P.r * WS * 0.9) return;
        const ore = window.novaOre ? window.novaOre() : 0;
        if (ore > 0 && window.novaSellOre) { const cr = window.novaSellOre(140); if (cr) toast(`KORVA ICE WORKS BOUGHT ${ore}t ORE  +${cr} CR (above station rate)`, 3400, '#9be8ff'); }
        if ((S.cd.korva || 0) <= S.t && typeof window.novaHull === 'number' && window.novaHull > 0 && window.novaHull < 100) { window.novaHull = 100; S.cd.korva = S.t + 300; save(); toast('KORVA YARD CREW PATCHED YOUR HULL · free for miners', 3000, '#33ff99'); }
      } };
    },
    ruin(P) {
      const g = new T.Group(), gm = glow(0x66ffcc);
      // broken gate: 300 degrees of a huge ring, leaning
      const arc = new T.Mesh(new T.TorusGeometry(240, 16, 8, 60, Math.PI * 1.62), M.stone); arc.rotation.set(0.25, 0.4, 0.3); g.add(arc);
      const inlay = new T.Mesh(new T.TorusGeometry(240, 16.6, 3, 60, Math.PI * 1.62), gm); inlay.scale.set(1, 1, 0.06); arc.add(inlay);
      for (let i = 0; i < 9; i++) { const c = lump(rr(10, 30), 1, M.stone, 0.25); c.position.set(rr(120, 280), rr(-200, -60), rr(-80, 80)); c.rotation.set(rr(0, 3), rr(0, 3), 0); g.add(c); }
      const orb = new T.Mesh(new T.SphereGeometry(14, 24, 16), gm); g.add(orb); const halo = light(g, 0x66ffcc, 160, 0, 0, 0, 0.55);
      const glyphTex = k => { const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d'); x.strokeStyle = '#a8ffe6'; x.lineWidth = 7; x.lineCap = 'round'; let s2 = 31 + k * 97; const r2 = () => { s2 = (s2 * 16807) % 2147483647; return (s2 & 0xffff) / 0xffff; };
        for (let j = 0; j < 4; j++) { const cy = 36 + j * 60; x.beginPath(); x.arc(64, cy, 18 + r2() * 8, r2() * 6, r2() * 6 + 2 + r2() * 3); x.stroke(); x.beginPath(); x.moveTo(30 + r2() * 20, cy - 20); x.lineTo(80 + r2() * 20, cy + 16); x.stroke(); if (r2() > 0.5) { x.beginPath(); x.arc(64, cy, 4, 0, 6.3); x.stroke(); } }
        const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };
      const LORE = ['FIRST GLYPH: "We built the gate to leave the cold behind."', 'SECOND GLYPH: "The cores were our suns. We carried them with us."', 'THIRD GLYPH: "One gate was closed from the far side."', 'FOURTH GLYPH: "What followed us is patient. Keep your cores warm."'];
      const pyl = [0, 1, 2, 3].map(k => { const p = new T.Group(), a = k * Math.PI / 2 + 0.6; p.position.set(Math.cos(a) * 190, (k % 2 ? 60 : -50), Math.sin(a) * 190);
        const slab = box(p, 22, 110, 14, M.stone); slab.rotation.z = (k - 1.5) * 0.06; const face = new T.Mesh(new T.PlaneGeometry(16, 60), new T.MeshBasicMaterial({ map: glyphTex(k), transparent: true, toneMapped: false, side: T.DoubleSide })); face.position.z = 7.2; p.add(face); const f2 = face.clone(); f2.position.z = -7.2; p.add(f2);
        p.lookAt(0, p.position.y, 0); const sp = light(p, 0x66ffcc, 50, 0, 62, 0, 0.7); g.add(p); return { p, sp, face, f2, k }; });
      return { g, tick(dt, now, sl) {
        orb.scale.setScalar(1 + 0.12 * Math.sin(now * 1.3)); halo.material.opacity = 0.4 + 0.2 * Math.sin(now * 1.3); arc.rotation.z += dt * 0.006;
        pyl.forEach(o => { const read = !!S.glyphs[o.k]; o.sp.material.opacity = read ? 0.25 : 0.55 + 0.35 * Math.sin(now * 3 + o.k); o.face.material.opacity = o.f2.material.opacity = read ? 1 : 0.55;
          if (!read && o.p.position.distanceTo(sl) < 75) { S.glyphs[o.k] = true; save(); toast('◈ ' + LORE[o.k], 5200, '#66ffcc');
            if (Object.keys(S.glyphs).length >= 4 && !S.gateDone) { S.gateDone = true; credits(1500); try { window.novaAddHeatCores && window.novaAddHeatCores(1); } catch (e) { } save(); toast('THE GATE ANSWERS. A dormant heat core drifts free.  +1 HEAT CORE  +1500 CR', 5200, '#ffb347');
              news('The Silent Gate wakes', 'A pilot read all four glyph pylons at the Silent Gate. The ring gave up a dormant heat core. Scholars at Veil Outpost want the recordings.'); nova.emit && nova.emit('placeActivity', { id: P.id, what: 'glyphs' }); } } });
      } };
    },
    battlefield(P) {
      const g = new T.Group();
      for (let i = 0; i < 11; i++) wreck(g, rr(50, 170), rr(-520, 520), rr(-220, 220), rr(-520, 520));
      const cap = new T.Group(); box(cap, 60, 44, 330, M.hull, 0, 0, -90, 0.05, 0.1, 0.04); box(cap, 60, 44, 210, M.hull, 30, -20, 190, -0.2, -0.25, 0.3); box(cap, 26, 30, 60, M.dark, 0, 34, -150); for (let i = 0; i < 6; i++) light(cap, 0xff6a2a, rr(14, 30), rr(-30, 30), rr(-20, 20), rr(40, 90), 0.8); g.add(cap);
      const dp = new Float32Array(900 * 3); for (let i = 0; i < 900; i++) { dp[i * 3] = rr(-650, 650); dp[i * 3 + 1] = rr(-280, 280); dp[i * 3 + 2] = rr(-650, 650); }
      const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(dp, 3)); g.add(new T.Points(dg, new T.PointsMaterial({ color: 0x9aa4ad, size: 2.2, sizeAttenuation: true })));
      const crates = [], mines = [];
      for (let i = 0; i < 8; i++) { const c = new T.Group(); box(c, 7, 7, 10, M.dark); box(c, 7.4, 1.2, 10.4, glow(0xffb347)); light(c, 0xffb347, 26, 0, 0, 0, 0.7); c.userData.home = new T.Vector3(rr(-430, 430), rr(-170, 170), rr(-430, 430)); c.position.copy(c.userData.home); g.add(c); crates.push(c); }
      for (let i = 0; i < 7; i++) { const m = new T.Group(); m.add(new T.Mesh(new T.IcosahedronGeometry(4.5, 0), M.dark)); for (let k = 0; k < 6; k++) { const sp = cyl(m, 0.3, 0.7, 5, M.hull, 0, 0, 0, 5); sp.rotation.set(k < 2 ? 0 : Math.PI / 2, 0, k % 2 ? Math.PI / 2 : 0); sp.translateY(k % 2 ? 5.5 : -5.5); }
        m.userData.l = light(m, 0xff2233, 18, 0, 0, 0, 0.9); m.position.set(rr(-380, 380), rr(-150, 150), rr(-380, 380)); g.add(m); mines.push(m); }
      const reset = () => { crates.forEach(c => { c.visible = true; }); mines.forEach(m => { m.visible = true; }); };
      return { g, reset, tick(dt, now, sl) {
        if ((S.cd.ashfall || 0) && S.cd.ashfall <= S.t) { S.cd.ashfall = 0; reset(); save(); }
        crates.forEach((c, i) => { if (!c.visible) return; c.rotation.y += dt * 0.5; c.rotation.x += dt * 0.2;
          if (c.position.distanceTo(sl) < 34) { c.visible = false; if (!S.cd.ashfall) S.cd.ashfall = S.t + 480;
            if (i === 5 && !S.chip) { S.chip = true; unlock('anchor', 'NAV CHIP RECOVERED: a Red Wake route. New signal on the WARP list: BLACK ANCHOR.'); credits(150); }
            else { const cr = 150 + Math.floor(rnd() * 6) * 50; credits(cr); toast(`SALVAGE CRATE  +${cr} CR`, 2000, '#ffb347'); } save(); } });
        mines.forEach((m, i) => { if (!m.visible) return; const d = m.position.distanceTo(sl); m.userData.l.material.opacity = d < 140 ? (Math.sin(now * 14) > 0 ? 1 : 0.15) : 0.5 + 0.4 * Math.sin(now * 2 + i);
          if (d < 140 && d > 26 && !m.userData.warned) { m.userData.warned = true; toast('⚠ PROXIMITY MINE CLOSE · steer clear', 1800, '#ff5544'); }
          if (d < 26) { m.visible = false; if (!S.cd.ashfall) S.cd.ashfall = S.t + 480; try { window.novaBoom && window.novaBoom(m.getWorldPosition(new T.Vector3()), 1.4); } catch (e) { } try { window.novaDamage && window.novaDamage(22); } catch (e) { } toast('MINE DETONATED', 1800, '#ff3344'); } });
      } };
    },
    hideout(P) {
      const g = new T.Group(); const rock = lump(170, 3, M.rock, 0.1); g.add(rock);
      // mouth of the hollow: dark disc + gantry, red lights
      const mouth = new T.Mesh(new T.CircleGeometry(62, 28), new T.MeshBasicMaterial({ color: 0x050405 })); mouth.position.set(0, 0, 190); g.add(mouth);
      const rim = new T.Mesh(new T.TorusGeometry(62, 3, 8, 36), M.hull); rim.position.copy(mouth.position); g.add(rim);
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; light(g, 0xff2a2a, 16, Math.cos(a) * 62, Math.sin(a) * 62, 193, 0.9).userData.blink = i; }
      box(g, 8, 8, 120, M.hull, 0, -50, 228); box(g, 70, 2, 40, M.dark, 0, -46, 270); [[-26, 262], [26, 262], [-26, 284], [26, 284]].forEach(([x, z]) => light(g, 0xffaa33, 10, x, -43, z));
      for (let i = 0; i < 9; i++) box(g, rr(5, 9), rr(5, 8), rr(6, 12), i % 3 ? M.dark : M.hull, rr(-28, 28), -41, rr(256, 286), 0, rr(0, 1), 0);
      box(g, 3, 60, 3, M.dark, 110, 150, 40, 0.3, 0, -0.4); light(g, 0xff2a2a, 22, 126, 178, 50);
      const interior = light(g, 0xff5522, 150, 0, 0, 150, 0.35);
      return { g, tick(dt, now, sl, dist) {
        rock.rotation.z += dt * 0.003; g.children.forEach(o => { if (o.userData.blink !== undefined) o.material.opacity = (Math.floor(now * 3) + o.userData.blink) % 8 < 2 ? 1 : 0.2; }); interior.material.opacity = 0.3 + 0.08 * Math.sin(now * 2);
        if (dist < P.r * WS * 0.9 && (S.cd.anchor || 0) <= S.t) { S.cd.anchor = S.t + 420; const cr = 600; credits(cr); save(); toast(`BLACK ANCHOR FENCE: "Your sensor logs are worth something. Do not ask to whom."  +${cr} CR`, 4600, '#ff8a3c'); nova.emit && nova.emit('placeActivity', { id: P.id, what: 'fence' }); }
      } };
    },
    planet(P) {
      const g = new T.Group(), R = 2600;
      const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d');
      for (let y = 0; y < 512; y++) { const v = y / 512, n = Math.sin(v * 38) * 0.5 + Math.sin(v * 91 + 1.7) * 0.3 + Math.sin(v * 13) * 0.6; x.fillStyle = `hsl(${28 + n * 9}, ${46 + n * 12}%, ${44 + n * 13}%)`; x.fillRect(0, y, 1024, 1); }
      for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${rnd() > 0.5 ? '255,236,200' : '90,48,30'},${rr(0.04, 0.14)})`; x.beginPath(); x.ellipse(rr(0, 1024), rr(0, 512), rr(20, 150), rr(4, 18), 0, 0, 6.3); x.fill(); }
      const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.wrapS = T.RepeatWrapping;
      const ball = new T.Mesh(new T.SphereGeometry(R, 96, 64), new T.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 })); g.add(ball);
      const atm = new T.Mesh(new T.SphereGeometry(R * 1.035, 64, 48), new T.MeshBasicMaterial({ color: 0xffc890, transparent: true, opacity: 0.13, side: T.BackSide, blending: T.AdditiveBlending, depthWrite: false })); g.add(atm);
      const rc = document.createElement('canvas'); rc.width = 512; rc.height = 4; const rx = rc.getContext('2d'); for (let i = 0; i < 512; i++) { const a = Math.max(0, Math.sin(i * 0.11) * 0.35 + Math.sin(i * 0.37) * 0.25 + 0.3) * (i > 20 && i < 500 ? 1 : 0); rx.fillStyle = `rgba(232,205,170,${a.toFixed(3)})`; rx.fillRect(i, 0, 1, 4); }
      const rt = new T.CanvasTexture(rc); rt.colorSpace = T.SRGBColorSpace;
      const rg = new T.RingGeometry(R * 1.35, R * 2.05, 128, 1), uv = rg.attributes.uv, pos = rg.attributes.position, v = new T.Vector3(); for (let i = 0; i < uv.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - R * 1.35) / (R * 0.7), 0.5); }
      const ring = new T.Mesh(rg, new T.MeshBasicMaterial({ map: rt, transparent: true, side: T.DoubleSide, depthWrite: false })); ring.rotation.x = Math.PI / 2 - 0.35; ring.rotation.y = 0.2; g.add(ring);
      return { g, far: 60000, tick(dt, now, sl, dist) { ball.rotation.y += dt * 0.006; if (dist < P.r * WS && (S.cd.talos || 0) <= S.t) { S.cd.talos = S.t + 900; save(); toast('TALOS IV ORBIT · landing sites are not charted yet', 3600, '#e8b070'); } } };
    },
  };

  const places = []; let ready = false;
  function unlock(id, msg) { if (S.unlock[id]) return false; S.unlock[id] = true; save(); toast('📡 ' + msg, 5200, '#ff8a3c'); news('New signal: ' + id.toUpperCase(), msg); try { nova.emit && nova.emit('placeUnlocked', { id }); } catch (e) { } return true; }
  function setup(data) {
    (data.places || []).forEach(P => {
      if (!BUILD[P.kind] || (window.NW_DESTS || []).some(d => d.id === P.id)) return;
      const pos = new T.Vector3(P.pos[0], P.pos[1], P.pos[2]).multiplyScalar(WS);
      let built; try { seed = 7 + P.id.length * 131 + P.id.charCodeAt(0); built = BUILD[P.kind](P); } catch (e) { console.warn('[places] build failed', P.id, e); return; }
      built.g.name = 'NOVA_PLACE_' + P.id.toUpperCase(); built.g.position.copy(pos); built.g.visible = false; built.g.traverse(o => { o.raycast = () => { }; }); scene.add(built.g);
      const terr = P.terr ? [P.terr[0], parseInt(String(P.terr[1]).replace('#', ''), 16), P.terr[2]] : null;
      const def = { id: P.id, name: P.name, r: P.r, pos: () => pos, extra: true, meta: { col: P.col, l3: P.l3 }, terr, ads: P.ads || null, blurb: P.blurb };
      if (P.locked) def.lock = () => !S.unlock[P.id];
      (window.NW_DESTS || (window.NW_DESTS = [])).push(def);
      places.push({ P, pos, built, def });
    });
    ready = true;
  }
  fetch(new URL('../data/places.json', import.meta.url).href).then(r => r.json()).then(setup).catch(e => console.warn('[places] no data', e));
  // Orin leaks the hideout after you have heard a few of his rumor / tip segments
  const offRadio = nova.on && nova.on('radioLine', e => { if (!e || e.channel !== 'drift' || S.unlock.anchor) return; if (e.title === 'Rumor mill' || e.title === 'A little bird' || e.title === 'Black market') { S.rumors = (S.rumors || 0) + 1; save(); if (S.rumors >= 6) unlock('anchor', 'Orin Rook: "Somebody left a route lying around. Black Anchor. You did not get it from me." New signal on the WARP list.'); } });
  const ship = new T.Vector3(), local = new T.Vector3(); let acc = 0;
  function tick(dt) {
    if (!ready) return; const d = Math.min(0.25, Math.max(0, Number(dt) || 0)); S.t += d; acc += d;
    try { nova.shipGroup.getWorldPosition(ship); } catch (e) { return; }
    const now = performance.now() / 1000, inside = !!(window.novaOnFoot && window.novaOnFoot()) || !!window.novaGalaxyOpen;
    for (const pl of places) {
      const dist = ship.distanceTo(pl.pos), locked = pl.def.lock && pl.def.lock();
      const vis = !inside && !locked && dist < (pl.built.far || 14000); pl.built.g.visible = vis; if (!vis) continue;
      if (dist < pl.P.r * WS * 1.6 + 600) {
        if (!S.seen[pl.P.id]) { S.seen[pl.P.id] = true; save(); toast(`◆ DISCOVERED: ${pl.P.name} — ${pl.P.blurb}`, 6500, pl.P.col); news('Arrived: ' + pl.P.name, pl.P.blurb); try { nova.emit && nova.emit('placeVisited', { id: pl.P.id, name: pl.P.name }); } catch (e) { } }
        local.copy(ship).sub(pl.pos);
        try { pl.built.tick && pl.built.tick(d, now, local, dist); } catch (e) { if (!pl.err) { pl.err = 1; console.warn('[places] tick', pl.P.id, e); } }
      }
    }
    if (acc > 20) { acc = 0; save(); }
  }
  const off = nova.onTick ? nova.onTick(tick) : null;
  const api = {
    get ready() { return ready; }, unlock, get state() { return JSON.parse(JSON.stringify(S)); },
    get list() { return places.map(p => ({ id: p.P.id, name: p.P.name, kind: p.P.kind, locked: !!(p.def.lock && p.def.lock()), visible: p.built.g.visible, pos: p.pos.toArray() })); },
    reset() { Object.keys(S).forEach(k => delete S[k]); Object.assign(S, { seen: {}, unlock: {}, t: 0, cd: {}, glyphs: {}, gateDone: false, rumors: 0, chip: false }); save(); places.forEach(p => p.built.reset && p.built.reset()); },
    dispose() { off && off(); typeof offRadio === 'function' && offRadio(); places.forEach(p => scene.remove(p.built.g)); }
  };
  window.novaPlaces = api;
  window.novaTest = Object.assign(window.novaTest || {}, { places: () => ({ list: api.list, state: api.state }), placeGo: (id, off2 = 0) => { const p = places.find(q => q.P.id === id); if (!p) return false; const v = p.pos.clone().add(new T.Vector3(off2, 0, p.P.r * WS * 0.5)); if (window.novaTestTeleport) window.novaTestTeleport(v); else nova.shipGroup.position.copy(v); return true; } });
  return api;
}
