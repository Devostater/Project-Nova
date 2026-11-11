// CONSTRUCTION BAY: an owner workshop for testing and small fixes without editing code.
//   Room   : OPTIONS → CONSTRUCTION BAY (VR or PC), or the console command `bay`. A hangar room far below the map.
//   Console: F2 on PC opens a typed command line anywhere; the room's CONSOLE tab has the same commands as buttons.
//   Tune   : sliders for game numbers (prices, bounties, warp cost, pirates, bloom, exposure, FOV, deadzone, retro look).
//            Saved on this device as window.novaTune; RESET puts everything back.
//   Fix    : bug reports with the game state attached. Saved on this device; when the game runs from PLAY_NOVA.bat the local
//            server also appends them to requests/fix_requests.jsonl in the project, where the AIs pick them up and fix them.
// The game never runs system commands or edits its own code: fixes go through the AIs and the owner's "merge".
const TUNE_KEY = 'novaTuneV1', FIX_KEY = 'novaFixQueueV1';
export function init(nova) {
  const T = nova && nova.THREE; if (!T) return { ready: false };
  const { scene, camera, renderer } = nova, rig = nova.cameraRig || camera;
  const ls = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  const toast = (m, ms, c) => { try { nova.toast && nova.toast(m, ms || 2200, c || '#ffb347'); } catch (e) { } };
  const LOG = []; const log = (t, c) => { String(t).split('\n').forEach(l => LOG.push({ t: l, c: c || '#cfe9ff' })); while (LOG.length > 60) LOG.shift(); draw(); overlayLog(); };

  // ── TUNE ──
  const NOPT = () => window.NOPT && window.NOPT.o;
  const TUNES = [
    { k: 'warpCost', l: 'WARP CORE COST', min: 0.2, max: 3, step: 0.1, def: 1, law: true },
    { k: 'bounty', l: 'BOUNTY PAYOUT', min: 0.2, max: 5, step: 0.1, def: 1, law: true },
    { k: 'oreSell', l: 'ORE PRICE', min: 0.2, max: 5, step: 0.1, def: 1, law: true },
    { k: 'heatCoreSell', l: 'HEAT CORE PRICE', min: 0.2, max: 5, step: 0.1, def: 1, law: true },
    { k: 'pirateActivity', l: 'PIRATE ACTIVITY', min: 0, max: 3, step: 0.1, def: 1, law: true },
    { k: 'bloom', l: 'BLOOM (PC)', min: 0, max: 1.5, step: 0.05, def: null, get: () => NOPT() ? (NOPT().bloomStrength ?? 0.35) : 0.35, set: v => { const o = NOPT(); if (o) { o.bloomStrength = v; window.noptSave && window.noptSave(); } try { window.novaPostfx && window.novaPostfx.updateSettings({ bloomStrength: v }); } catch (e) { } } },
    { k: 'exposure', l: 'EXPOSURE', min: 0.4, max: 2, step: 0.05, def: 1, set: v => { try { renderer.toneMappingExposure = v; } catch (e) { } } },
    { k: 'fov', l: 'FIELD OF VIEW (PC)', min: 50, max: 100, step: 2, def: null, get: () => camera.fov, set: v => { if (renderer.xr.isPresenting) return; camera.fov = v; camera.updateProjectionMatrix(); } },
    { k: 'deadzone', l: 'JOYSTICK DEADZONE', min: 0.02, max: 0.3, step: 0.01, def: null, get: () => NOPT() ? (NOPT().deadzone ?? 0.12) : 0.12, set: v => { const o = NOPT(); if (o) { o.deadzone = v; window.noptSave && window.noptSave(); } } },
    { k: 'fx', l: 'EFFECTS AMOUNT', min: 0.25, max: 2, step: 0.05, def: null, get: () => window.novaFxScale || 1, set: v => { window.novaFxScale = v; } },
    { k: 'retro', l: 'RETRO LOOK STRENGTH', min: 0, max: 1, step: 0.05, def: null, get: () => window.novaRetro ? (window.novaRetro.on ? window.novaRetro.amt : 0) : 0, set: v => { const R = window.novaRetro; if (!R) return; if (v <= 0) R.set(false); else { if (!R.on) R.set(true); R.strength(v); } } },
    { k: 'retroBands', l: 'RETRO PAINT BANDS', min: 2, max: 8, step: 1, def: null, get: () => window.novaRetro ? window.novaRetro.state.bands : 4, set: v => { window.novaRetro && window.novaRetro.bands(v); } },
  ];
  const tune = window.novaTune = Object.assign({}, ls(TUNE_KEY) || {});
  const tget = t => t.get ? t.get() : (tune[t.k] ?? t.def);
  const fmt = (t, v) => (t.step >= 1 ? String(Math.round(v)) : Number(v).toFixed(2)) + (t.law ? 'x' : '');
  function tset(t, v) {
    v = +Math.max(t.min, Math.min(t.max, Math.round(Number(v) / t.step) * t.step)).toFixed(4);
    if (t.set) t.set(v); if (!t.get) { tune[t.k] = v; ls(TUNE_KEY, tune); }
    if (t.law) try { window.novaPolitics && window.novaPolitics.refresh && window.novaPolitics.refresh(); } catch (e) { }
    return v;
  }
  function treset() { Object.keys(tune).forEach(k => delete tune[k]); ls(TUNE_KEY, tune); TUNES.forEach(t => { if (t.def !== null && t.set) t.set(t.def); }); try { window.novaPolitics && window.novaPolitics.refresh && window.novaPolitics.refresh(); } catch (e) { } }
  TUNES.forEach(t => { if (!t.get && tune[t.k] !== undefined && t.set) t.set(tune[t.k]); });

  // ── FIX REQUESTS ──
  const fixes = ls(FIX_KEY) || [];
  function snapshot() {
    const s = {}; try { s.state = window.novaState ? window.novaState() : null; } catch (e) { }
    try { const p = nova.shipGroup.position; s.pos = [Math.round(p.x), Math.round(p.y), Math.round(p.z)]; let best = null; (window.NW_DESTS || []).forEach(d => { if (!d.pos) return; const dd = d.pos().distanceTo(p); if (!best || dd < best.d) best = { n: d.name, d: Math.round(dd) }; }); s.near = best; } catch (e) { }
    s.build = window.NOVA_BUILD ? `${window.NOVA_BUILD.version} ${window.NOVA_BUILD.codename} ${window.NOVA_BUILD.commit}` : null;
    s.xr = !!renderer.xr.isPresenting; s.ua = navigator.userAgent.slice(0, 120); s.gfx = window.novaGfx || null; s.retro = !!(window.novaRetro && window.novaRetro.on); s.onFoot = !!(window.novaOnFoot && window.novaOnFoot());
    return s;
  }
  async function send(r) { try { const res = await fetch('/__nova/fix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) }); return res.ok; } catch (e) { return false; } }
  async function fileFix(cat, text) {
    const r = { id: 'fix_' + Date.now().toString(36), at: new Date().toISOString(), cat: cat || 'OTHER', text: String(text || '').slice(0, 1000), ...snapshot(), sent: false };
    fixes.unshift(r); fixes.length = Math.min(fixes.length, 40); ls(FIX_KEY, fixes);
    r.sent = await send(r); ls(FIX_KEY, fixes);
    log(`fix saved: [${r.cat}] ${r.text || '(no text)'}  ${r.sent ? '→ sent to the project folder' : '→ saved on this device (use EXPORT FILE, or play from PLAY_NOVA.bat)'}`, '#ffb347');
    toast(r.sent ? 'FIX REQUEST SENT · the AIs will pick it up' : 'FIX REQUEST SAVED ON THIS DEVICE', 2600);
    return r;
  }
  async function resend() { let n = 0; for (const r of fixes) if (!r.sent && (r.sent = await send(r))) n++; ls(FIX_KEY, fixes); log(n ? `${n} saved request(s) sent` : 'nothing sent (no local server, or all already sent)'); }
  function exportFixes() {
    try { const b = new Blob([fixes.map(r => JSON.stringify(r)).join('\n') + '\n'], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'fix_requests.jsonl'; a.click(); log('exported ' + fixes.length + ' request(s) to fix_requests.jsonl (put it in the project\'s requests/ folder)'); } catch (e) { log('export failed: ' + e.message, '#ff8877'); }
  }

  // ── COMMANDS ──
  const destIds = () => (window.NW_DESTS || []).map(d => d.id);
  const CMD = {
    help: () => 'commands: status · version · warp <place> · places · unlock <place|all> · credits <n> · cores <n> · heal · pirate\n  tune [list | <name> <value> | reset] · retro [on|off|<0-1>] · gfx <low|mid|high|ultra> · radio <drift|beacon|ledger|off>\n  laws · motion [new|vote] · deadzone <v> · fix <what is wrong> · fixes · resend · export · save · bay · clear',
    status: () => { const s = snapshot(); return `credits ${window.novaCredits ? window.novaCredits() : '?'} · heat cores ${window.novaHeatCores ? window.novaHeatCores() : '?'} · hull ${Math.round(window.novaHull ?? 0)} · shield ${Math.round(window.novaShield ?? 0)}\nnear ${s.near ? s.near.n + ' (' + s.near.d + ' m)' : '-'} · gfx ${s.gfx} · retro ${s.retro ? 'on' : 'off'} · ${s.xr ? 'VR' : 'flat screen'}`; },
    version: () => window.NOVA_BUILD ? `${window.NOVA_BUILD.version} · ${window.NOVA_BUILD.codename} · build ${window.NOVA_BUILD.commit} · ${window.NOVA_BUILD.date}` : (document.getElementById('menu-build') || {}).textContent || 'unknown',
    places: () => (window.NW_DESTS || []).map(d => d.id + (d.lock && d.lock() ? ' (locked)' : '')).join(' · '),
    warp: a => { const id = a[0]; if (!id || !destIds().includes(id)) return 'warp to one of: ' + CMD.places(); close(); setTimeout(() => { try { window.novaWarpStart(id); } catch (e) { } }, 300); return 'warping to ' + id; },
    unlock: a => { const P = window.novaPlaces; if (!P) return 'places not loaded'; const ids = a[0] === 'all' ? P.list.filter(x => x.locked).map(x => x.id) : [a[0]]; ids.forEach(id => P.unlock(id, 'Construction Bay: route to ' + id + ' added.')); return ids.length ? 'unlocked ' + ids.join(', ') : 'nothing locked'; },
    credits: a => { const n = Number(a[0]); if (!isFinite(n)) return 'credits <amount>'; return 'credits now ' + (window.novaAddCredits ? window.novaAddCredits(n) : '?'); },
    cores: a => { const n = Number(a[0]); if (!isFinite(n)) return 'cores <amount>'; return 'heat cores now ' + (window.novaAddHeatCores ? window.novaAddHeatCores(n) : '?'); },
    heal: () => { window.novaHull = 100; window.novaShield = 100; return 'hull and shields 100'; },
    pirate: () => { try { window.novaTestPirate && window.novaTestPirate(); return 'pirate boss spawned ahead of the ship'; } catch (e) { return 'could not spawn: ' + e.message; } },
    tune: a => {
      if (!a.length || a[0] === 'list') return TUNES.map(t => `${t.k} = ${fmt(t, tget(t))}  (${t.min}–${t.max})`).join('\n');
      if (a[0] === 'reset') { treset(); return 'all tunes reset'; }
      const t = TUNES.find(x => x.k.toLowerCase() === a[0].toLowerCase()); if (!t) return 'unknown tune, try: tune list';
      if (a[1] === undefined) return `${t.k} = ${fmt(t, tget(t))}`; return `${t.k} = ${fmt(t, tset(t, a[1]))}`;
    },
    retro: a => { const R = window.novaRetro; if (!R) return 'retro look not loaded'; if (a[0] === 'on') R.set(true); else if (a[0] === 'off') R.set(false); else if (a[0] !== undefined) { R.set(true); R.strength(a[0]); } else R.set(); return 'retro ' + (R.on ? 'on, strength ' + R.amt : 'off'); },
    gfx: a => { const o = NOPT(); if (!o || !['low', 'mid', 'high', 'ultra'].includes(a[0])) return 'gfx low|mid|high|ultra'; o.gfx = a[0]; if (a[0] !== 'ultra') o.forceUltra = false; window.noptSave && window.noptSave(); window.noptApplyGfx && window.noptApplyGfx(); return 'graphics ' + a[0]; },
    radio: a => { const m = window.novaMusic; if (!m) return 'radio not loaded'; if (a[0] === 'off') { window.novaRadio && window.novaRadio.tune(null); return 'radio off'; } return m.tune(a[0]) ? 'tuned ' + a[0] : 'radio drift|beacon|ledger|off'; },
    laws: () => { const p = window.novaPolitics; if (!p) return 'politics not loaded'; const s = p.state; return 'laws: ' + (s.laws.map(l => l.title).join(', ') || 'none') + '\nfloor: ' + (s.active ? `${s.active.title} (${Math.round(s.active.left)} s left)` : 'no motion'); },
    motion: a => { const p = window.novaPolitics; if (!p) return 'politics not loaded'; if (a[0] === 'vote') p.resolve(); else p.propose(); return CMD.laws(); },
    deadzone: a => CMD.tune(['deadzone', a[0]]),
    fix: a => { const text = a.join(' '); if (!text) return 'fix <what is wrong>, e.g. fix the canopy button does nothing in VR'; fileFix('TYPED', text); return ''; },
    fixes: () => fixes.length ? fixes.slice(0, 10).map(r => `${r.at.slice(5, 16).replace('T', ' ')} [${r.cat}] ${r.text || ''} ${r.sent ? '✓ sent' : '· local'}`).join('\n') : 'no fix requests yet',
    resend: () => { resend(); return ''; },
    export: () => { exportFixes(); return ''; },
    save: () => { try { window.novaSaveGame && window.novaSaveGame(1); return 'game saved'; } catch (e) { return 'save failed'; } },
    bay: () => { open(); return 'construction bay open'; },
    clear: () => { LOG.length = 0; return ''; },
  };
  function run(line) {
    line = String(line || '').trim(); if (!line) return; log('> ' + line, '#7fffd0');
    const [c, ...a] = line.split(/\s+/); const f = CMD[c.toLowerCase()];
    let out; try { out = f ? f(a) : `unknown command "${c}". type help`; } catch (e) { out = 'error: ' + e.message; }
    if (out) log(out, f ? '#cfe9ff' : '#ff8877');
  }

  // ── ROOM ──
  const ORIGIN = new T.Vector3(0, -90000, 0);
  const root = new T.Group(); root.name = 'NOVA_CONSTRUCTION_BAY'; root.position.copy(ORIGIN); root.visible = false; scene.add(root);
  {
    const steel = new T.MeshStandardMaterial({ color: 0x2b333c, metalness: 0.7, roughness: 0.6 }), dark = new T.MeshStandardMaterial({ color: 0x11161c, metalness: 0.5, roughness: 0.85 });
    const hz = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 32; const g = c.getContext('2d'); g.fillStyle = '#16191d'; g.fillRect(0, 0, 256, 32); g.fillStyle = '#ffb000'; for (let x = -32; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 16, 32); g.lineTo(x + 32, 0); g.lineTo(x + 16, 0); g.fill(); } const t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; t.repeat.set(6, 1); t.colorSpace = T.SRGBColorSpace; return new T.MeshStandardMaterial({ map: t, roughness: 0.8 }); })();
    const box = (w, h, d, m, x, y, z) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); root.add(o); return o; };
    box(16, 0.2, 16, dark, 0, -0.1, -3);
    const grid = new T.GridHelper(16, 32, 0xff8a2a, 0x223344); grid.position.set(0, 0.01, -3); root.add(grid);
    box(16, 7, 0.3, steel, 0, 3.5, -10); box(0.3, 7, 16, steel, -8, 3.5, -3); box(0.3, 7, 16, steel, 8, 3.5, -3);
    for (let i = -3; i <= 3; i++) { box(0.4, 7, 0.4, dark, i * 2.4, 3.5, -9.7); box(0.4, 0.4, 16, dark, i * 2.4, 6.8, -3); }
    box(16, 0.25, 0.05, hz, 0, 0.13, -1); box(3.2, 0.8, 0.7, steel, 0, 0.4, -2.25);
    const lamp = (x, z, c) => { const l = new T.PointLight(c, 18, 14, 1.6); l.position.set(x, 6, z); root.add(l); box(0.8, 0.15, 0.8, new T.MeshBasicMaterial({ color: c }), x, 6.7, z); };
    lamp(-4, -4, 0xffb070); lamp(4, -4, 0x9fd0ff); lamp(0, -7, 0xffffff);
    root.add(new T.AmbientLight(0x334455, 1.2));
    // a ship frame on a gantry (the "under construction" part)
    const frame = new T.Group(); frame.position.set(0, 2.4, -6.5); root.add(frame);
    const rib = new T.MeshStandardMaterial({ color: 0x8a96a4, metalness: 0.85, roughness: 0.35 });
    for (let i = 0; i < 7; i++) { const r = new T.Mesh(new T.TorusGeometry(1.4 - Math.abs(i - 3) * 0.16, 0.06, 6, 24), rib); r.position.z = (i - 3) * 0.7; frame.add(r); }
    const spine = new T.Mesh(new T.BoxGeometry(0.16, 0.16, 5), rib); spine.position.y = -1.3; frame.add(spine);
    const torch = new T.PointLight(0x7fd8ff, 6, 6, 2); torch.position.set(0.9, 0.4, 0.7); frame.add(torch);
    root.userData.tick = (dt, now) => { frame.rotation.z = Math.sin(now * 0.1) * 0.05; torch.intensity = Math.random() < 0.25 ? 9 + Math.random() * 8 : 2; };
  }
  // the console: one canvas panel, buttons are rectangles on it (hit-tested by UV)
  const PW = 1600, PH = 1000;
  const pc = document.createElement('canvas'); pc.width = PW; pc.height = PH; const pg = pc.getContext('2d');
  const ptex = new T.CanvasTexture(pc); ptex.colorSpace = T.SRGBColorSpace; ptex.anisotropy = 8;
  const panel = new T.Mesh(new T.PlaneGeometry(2.4, 1.5), new T.MeshBasicMaterial({ map: ptex, toneMapped: false }));
  panel.position.set(0, 1.62, -2.0); panel.rotation.x = -0.1; root.add(panel);
  const UI = { tab: 'CONSOLE', page: 0, btns: [], fixCat: 'VISUAL' };
  const QUICK = [['HELP', 'help'], ['STATUS', 'status'], ['HEAL', 'heal'], ['+1000 CR', 'credits 1000'], ['+1 HEAT CORE', 'cores 1'], ['SPAWN PIRATE', 'pirate'],
    ['RETRO ON/OFF', 'retro'], ['NEW MOTION', 'motion new'], ['TUNE DRIFT 77.7', 'radio drift'], ['UNLOCK PLACES', 'unlock all'], ['SAVE GAME', 'save'], ['VERSION', 'version']];
  const CATS = ['VISUAL', 'CONTROLS', 'AUDIO', 'PANELS / UI', 'STUCK / CRASH', 'OTHER'];
  const btn = (x, y, w, h, label, col, fn, lit) => { UI.btns.push({ x, y, w, h, fn });
    pg.fillStyle = lit ? 'rgba(255,138,42,0.28)' : 'rgba(14,26,38,0.95)'; pg.fillRect(x, y, w, h); pg.strokeStyle = col; pg.lineWidth = 4; pg.strokeRect(x + 2, y + 2, w - 4, h - 4);
    pg.fillStyle = '#ffffff'; pg.font = `bold ${Math.min(34, h * 0.42)}px monospace`; pg.textAlign = 'center'; pg.textBaseline = 'middle'; pg.fillText(label, x + w / 2, y + h / 2 + 2, w - 16); pg.textAlign = 'left'; pg.textBaseline = 'alphabetic'; };
  const txt = (t, x, y, font, col, maxW) => { pg.font = font; pg.fillStyle = col; pg.fillText(t, x, y, maxW); };
  function draw() {
    if (!S.open) return;
    UI.btns = []; pg.fillStyle = '#05080c'; pg.fillRect(0, 0, PW, PH);
    pg.strokeStyle = '#ff8a2a'; pg.lineWidth = 6; pg.strokeRect(6, 6, PW - 12, PH - 12);
    txt('CONSTRUCTION BAY', 40, 70, 'bold 46px monospace', '#ff8a2a'); txt(CMD.version(), 560, 66, '24px monospace', '#7fb6d0', 700);
    ['CONSOLE', 'TUNE', 'FIX REQUESTS'].forEach((t, i) => btn(40 + i * 300, 100, 285, 70, t, '#ff8a2a', () => { UI.tab = t; UI.page = 0; draw(); }, UI.tab === t));
    btn(PW - 300, 100, 260, 70, '✕ EXIT BAY', '#ff6b7d', () => close());
    if (UI.tab === 'CONSOLE') {
      QUICK.forEach((q, i) => btn(40 + (i % 3) * 250, 200 + Math.floor(i / 3) * 95, 235, 80, q[0], '#33e6ff', () => run(q[1])));
      pg.fillStyle = '#020406'; pg.fillRect(800, 200, 760, 760); pg.strokeStyle = '#33ff99'; pg.lineWidth = 2; pg.strokeRect(800, 200, 760, 760);
      const lines = []; LOG.forEach(l => { let s = l.t; while (s.length > 54) { lines.push({ t: s.slice(0, 54), c: l.c }); s = '  ' + s.slice(54); } lines.push({ t: s, c: l.c }); });
      lines.slice(-27).forEach((l, i) => txt(l.t, 815, 235 + i * 27, '21px monospace', l.c));
      txt('PC: press F2 to type commands · VR: use the buttons', 40, 620, '24px monospace', '#7fb6d0', 740);
      txt('Nothing here changes code. Fixes go through FIX REQUESTS', 40, 660, '24px monospace', '#7fb6d0', 740);
      txt('to the AIs, and you approve them with "merge".', 40, 692, '24px monospace', '#7fb6d0', 740);
    } else if (UI.tab === 'TUNE') {
      const per = 7, pages = Math.ceil(TUNES.length / per); UI.page = Math.min(UI.page, pages - 1);
      TUNES.slice(UI.page * per, UI.page * per + per).forEach((t, i) => {
        const y = 200 + i * 100, v = tget(t), changed = t.def !== null ? Math.abs(v - t.def) > 1e-6 : false;
        pg.fillStyle = 'rgba(255,255,255,0.04)'; pg.fillRect(40, y, 1520, 86);
        txt(t.l, 60, y + 54, 'bold 32px monospace', changed ? '#ffb347' : '#d6eefc', 560);
        const f = (v - t.min) / (t.max - t.min); pg.fillStyle = '#16222e'; pg.fillRect(640, y + 30, 420, 26); pg.fillStyle = '#ff8a2a'; pg.fillRect(640, y + 30, 420 * Math.max(0, Math.min(1, f)), 26);
        txt(fmt(t, v), 1080, y + 54, 'bold 32px monospace', '#ffffff', 140);
        btn(1230, y + 8, 100, 70, '−', '#33e6ff', () => { tset(t, tget(t) - t.step); draw(); });
        btn(1340, y + 8, 100, 70, '+', '#33e6ff', () => { tset(t, tget(t) + t.step); draw(); });
        btn(1450, y + 8, 100, 70, 'RST', '#9fb4c8', () => { tset(t, t.def !== null ? t.def : (t.k === 'fov' ? 70 : t.k === 'deadzone' ? 0.12 : t.k === 'bloom' ? 0.35 : t.k === 'fx' ? 1 : 0)); draw(); });
      });
      btn(40, 910, 240, 66, '◀ PAGE', '#33e6ff', () => { UI.page = (UI.page - 1 + pages) % pages; draw(); });
      txt(`${UI.page + 1} / ${pages}`, 310, 955, 'bold 30px monospace', '#7fb6d0');
      btn(420, 910, 240, 66, 'PAGE ▶', '#33e6ff', () => { UI.page = (UI.page + 1) % pages; draw(); });
      btn(1220, 910, 340, 66, 'RESET ALL TUNES', '#ff6b7d', () => { treset(); draw(); });
      txt('Price / bounty / warp / pirate tunes stack with council laws.', 700, 952, '22px monospace', '#7fb6d0', 500);
    } else {
      txt('1. WHAT KIND OF PROBLEM?', 40, 230, 'bold 30px monospace', '#ffb347');
      CATS.forEach((c, i) => btn(40 + (i % 3) * 250, 250 + Math.floor(i / 3) * 90, 235, 76, c, '#ffb347', () => { UI.fixCat = c; draw(); }, UI.fixCat === c));
      txt('2. SAY OR TYPE WHAT IS WRONG (optional)', 40, 470, 'bold 30px monospace', '#ffb347');
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      btn(40, 490, 360, 80, SR ? (UI.listening ? '● LISTENING…' : '🎤 DICTATE') : '🎤 (not on this device)', SR ? '#33ff99' : '#556677', () => dictate(), UI.listening);
      btn(410, 490, 330, 80, '⌨ TYPE (PC: F2)', '#33e6ff', () => openOverlay('fix '));
      pg.fillStyle = '#0b141c'; pg.fillRect(40, 590, 700, 110); txt(UI.note ? '“' + UI.note.slice(0, 110) + '”' : 'no note: the report still records where you are and', 56, 635, '22px monospace', UI.note ? '#ffffff' : '#7fb6d0', 670); if (!UI.note) txt('the game state, so "something is off here" is useful.', 56, 668, '22px monospace', '#7fb6d0', 670);
      btn(40, 720, 700, 90, '3. SAVE FIX REQUEST', '#33ff99', () => { fileFix(UI.fixCat, UI.note || ''); UI.note = ''; draw(); });
      btn(40, 830, 340, 70, 'RESEND SAVED', '#33e6ff', () => resend());
      btn(400, 830, 340, 70, 'EXPORT FILE', '#33e6ff', () => exportFixes());
      txt('RECENT REQUESTS', 800, 230, 'bold 30px monospace', '#ffb347');
      fixes.slice(0, 11).forEach((r, i) => { const y = 270 + i * 62; pg.fillStyle = 'rgba(255,255,255,0.04)'; pg.fillRect(800, y, 760, 54);
        txt(`${r.at.slice(5, 16).replace('T', ' ')}  ${r.cat}`, 816, y + 24, 'bold 20px monospace', '#ffb347', 520); txt(r.sent ? '✓ SENT' : 'ON DEVICE', 1440, y + 24, 'bold 20px monospace', r.sent ? '#33ff99' : '#9fb4c8');
        txt((r.text || '(no note)') + (r.near ? '  · near ' + r.near.n : ''), 816, y + 47, '19px monospace', '#d6eefc', 730); });
      if (!fixes.length) txt('none yet', 800, 290, '24px monospace', '#7fb6d0');
    }
    ptex.needsUpdate = true;
  }
  function dictate() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR || UI.listening) return;
    try { const r = new SR(); r.lang = 'en-US'; r.interimResults = false; UI.listening = true; draw();
      r.onresult = e => { UI.note = Array.from(e.results).map(x => x[0].transcript).join(' '); }; r.onend = r.onerror = () => { UI.listening = false; draw(); }; r.start(); } catch (e) { UI.listening = false; draw(); }
  }
  // ── open / close (same pattern as the galaxy map room) ──
  const S = { open: false, prev: null };
  const ray = new T.Raycaster(), mouse = new T.Vector2(), tmpM = new T.Matrix4();
  function press(hit) { if (!hit || !hit.uv) return false; const x = hit.uv.x * PW, y = (1 - hit.uv.y) * PH; const b = UI.btns.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h); if (b) { try { b.fn(); } catch (e) { log('error: ' + e.message, '#ff8877'); } return true; } return false; }
  function down(e) { if (!S.open || (e.target && /^(INPUT|TEXTAREA|BUTTON|SELECT|A)$/.test(e.target.tagName)) || overlay.contains(e.target)) return; const r = renderer.domElement.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, camera); if (press(ray.intersectObject(panel, false)[0])) { e.preventDefault(); e.stopImmediatePropagation(); } }
  function xrSelect(ev) { if (!S.open) return; const c = ev.target; tmpM.identity().extractRotation(c.matrixWorld); ray.ray.origin.setFromMatrixPosition(c.matrixWorld); ray.ray.direction.set(0, 0, -1).applyMatrix4(tmpM); press(ray.intersectObject(panel, false)[0]); }
  function key(e) { if (!S.open || overlay.style.display === 'block') return; if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } }
  function open() {
    if (S.open) return true;
    if (window.novaOnFoot && window.novaOnFoot()) { toast('The Construction Bay opens from the cockpit.'); return false; }
    if (window.novaGalaxyOpen) { try { window.novaGalaxyMap && window.novaGalaxyMap.close && window.novaGalaxyMap.close(); } catch (e) { } }
    S.prev = { parent: rig.parent, pos: rig.position.clone(), q: rig.quaternion.clone(), cam: camera.rotation.clone() };
    root.visible = true; scene.add(rig); rig.position.copy(ORIGIN).add(new T.Vector3(0, renderer.xr.isPresenting ? 0 : 1.62, 0.55)); rig.quaternion.identity();
    if (!renderer.xr.isPresenting) camera.rotation.set(-0.08, 0, 0);
    S.open = true; window.novaGalaxyOpen = true;   // shared "in a room" flag: ads, places and flight stand down
    addEventListener('pointerdown', down, true); addEventListener('keydown', key, true);
    try { renderer.xr.getController(0).addEventListener('selectstart', xrSelect); renderer.xr.getController(1).addEventListener('selectstart', xrSelect); } catch (e) { }
    if (!LOG.length) log('Construction Bay online. Type or touch HELP.', '#33ff99');
    draw(); toast('CONSTRUCTION BAY · tune, test and file fixes', 2400, '#ff8a2a'); return true;
  }
  function close() {
    if (!S.open) return; S.open = false; window.novaGalaxyOpen = false; root.visible = false;
    const p = S.prev; if (p) { (p.parent || scene).add(rig); rig.position.copy(p.pos); rig.quaternion.copy(p.q); camera.rotation.copy(p.cam); }
    removeEventListener('pointerdown', down, true); removeEventListener('keydown', key, true);
    try { renderer.xr.getController(0).removeEventListener('selectstart', xrSelect); renderer.xr.getController(1).removeEventListener('selectstart', xrSelect); } catch (e) { }
  }
  // ── PC typed console overlay (` key) ──
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;left:0;right:0;top:0;height:42vh;z-index:9998;display:none;background:rgba(3,6,10,0.94);border-bottom:3px solid #ff8a2a;font:15px monospace;color:#cfe9ff;box-sizing:border-box;padding:10px 14px;';
  overlay.innerHTML = '<div style="color:#ff8a2a;font-weight:bold;margin-bottom:6px">NOVA CONSTRUCTION CONSOLE · type help · F2 or Esc closes</div><div data-log style="height:calc(42vh - 80px);overflow-y:auto;white-space:pre-wrap"></div><input data-in spellcheck="false" autocomplete="off" style="width:100%;box-sizing:border-box;background:#0b141c;color:#7fffd0;border:1px solid #33ff99;font:16px monospace;padding:6px">';
  document.body.appendChild(overlay);
  const ovLog = overlay.querySelector('[data-log]'), ovIn = overlay.querySelector('[data-in]'); const hist = []; let hi = 0;
  function overlayLog() { if (overlay.style.display !== 'block') return; ovLog.innerHTML = ''; LOG.slice(-200).forEach(l => { const d = document.createElement('div'); d.style.color = l.c; d.textContent = l.t; ovLog.appendChild(d); }); ovLog.scrollTop = ovLog.scrollHeight; }
  function openOverlay(prefill) { overlay.style.display = 'block'; if (!LOG.length) log('Construction console. Type help.', '#33ff99'); overlayLog(); ovIn.value = prefill || ''; setTimeout(() => ovIn.focus(), 0); try { document.exitPointerLock && document.exitPointerLock(); } catch (e) { } }
  function closeOverlay() { overlay.style.display = 'none'; ovIn.blur(); }
  ovIn.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') { const v = ovIn.value; if (v.trim()) { hist.push(v); hi = hist.length; } ovIn.value = ''; run(v); }
    else if (e.key === 'Escape' || e.key === 'F2') { e.preventDefault(); closeOverlay(); }
    else if (e.key === 'ArrowUp') { hi = Math.max(0, hi - 1); ovIn.value = hist[hi] || ''; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { hi = Math.min(hist.length, hi + 1); ovIn.value = hist[hi] || ''; e.preventDefault(); }
  });
  ['keyup', 'keypress'].forEach(t => ovIn.addEventListener(t, e => e.stopPropagation()));
  addEventListener('keydown', e => { if (e.code !== 'F2' || e.repeat) return; if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName) && e.target !== ovIn) return; e.preventDefault(); e.stopImmediatePropagation(); overlay.style.display === 'block' ? closeOverlay() : openOverlay(); }, true);

  const off = nova.onTick ? nova.onTick(dt => { if (!S.open) return; const now = performance.now() / 1000; try { root.userData.tick(dt, now); } catch (e) { } }) : null;
  const api = { ready: true, open, close, toggle: () => (S.open ? (close(), false) : open()), run, fileFix, get isOpen() { return S.open; }, get fixes() { return fixes.slice(); }, get tune() { return { ...tune }; }, get log() { return LOG.map(l => l.t); }, press: (u, v) => press({ uv: { x: u, y: v } }),
    dispose() { off && off(); close(); overlay.remove(); scene.remove(root); } };
  window.novaBay = api;
  window.novaTest = Object.assign(window.novaTest || {}, { bay: () => ({ open: S.open, tab: UI.tab, fixes: fixes.length, tune: { ...tune } }), bayRun: l => (run(l), LOG.slice(-6).map(x => x.t)) });
  return api;
}
