// Talk radio: three in-world shows the player tunes on the MUSIC panel (after the music stations).
//   THE DRIFT REPORT 77.7  Orin "Subspace" Rook: raspy pirate radio; black-market talk, bounties, fleet movements
//   THE BEACON 101.1       factual shipping, hazard and space-weather report
//   SUBSPACE LEDGER 88.4   dry list of bounties, prices, council votes and laws; no commentary
// Bulletins are built from live game state (council laws and motions, raid timer, distances, hull) mixed with written
// in-world lines. Each line is spoken with the browser's speech voice (when one exists and radio voice is not muted)
// and shown as a subtitle toast and on the MUSIC panel. The game calls tune(id) / tune(null); see standalone.html (NMS).
export const CHANNELS = {
  drift: { id: 'drift', name: 'THE DRIFT REPORT', freq: '77.7', short: 'DRIFT 77.7', host: 'Orin "Subspace" Rook', sub: 'pirate radio · Orin "Subspace" Rook', col: '#ff8a3c', pitch: 0.45, rate: 0.9, voice: /(male|david|george|daniel|fred|guy|mark|james|arthur)/i },
  beacon: { id: 'beacon', name: 'THE BEACON', freq: '101.1', short: 'BEACON 101.1', host: 'Beacon automated service', sub: 'shipping, hazards and space weather', col: '#7fe3ff', pitch: 1.1, rate: 1.0, voice: /(female|zira|samantha|aria|jenny|susan|hazel|karen)/i },
  ledger: { id: 'ledger', name: 'SUBSPACE LEDGER', freq: '88.4', short: 'LEDGER 88.4', host: 'Ledger desk', sub: 'bounties, prices and council votes', col: '#c9e27a', pitch: 0.8, rate: 1.06, voice: /(google uk english male|ryan|thomas|oliver|richard)/i },
};
export function init(nova) {
  const T = nova && nova.THREE;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const pct = m => Math.round((m || 1) * 100);
  const S = { ch: null, onAir: false, title: '', line: '', log: [], queue: [], wait: 0, gap: 0, lastKey: {}, spoken: 0 };
  // ── live game state (every read is optional: a missing hook just drops that line) ──
  const laws = () => window.novaLaws || {};
  const pol = () => { try { return window.novaPolitics ? window.novaPolitics.state : null; } catch (e) { return null; } };
  const gs = () => { try { return window.novaState ? window.novaState() : {}; } catch (e) { return {}; } };
  const places = () => {
    const out = []; try {
      const me = nova.shipGroup.getWorldPosition(new T.Vector3());
      (window.NW_DESTS || []).forEach(d => { if (d.pos) out.push({ name: d.name, km: d.pos().distanceTo(me) / 1000, dy: d.pos().y - me.y }); });
    } catch (e) { } return out.sort((a, b) => a.km - b.km);
  };
  const kmTxt = k => (k < 10 ? k.toFixed(1) : Math.round(k)) + ' kilometres';
  const mins = s => { const m = Math.max(1, Math.round(s / 60)); return m === 1 ? 'one minute' : m + ' minutes'; };
  const nice = n => String(n || '').toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()).replace(/Nova-1/i, 'Nova One').replace(/\bEdf\b/, 'E D F');

  // ── segment writers: each returns { key, title, lines } or null ──
  const SEG = {
    beacon: [
      () => { const P = places(); if (!P.length) return null; return { key: 'lanes', title: 'Lane distances', lines: ['Lane distances from your position.'].concat(P.slice(0, 4).map(p => `${nice(p.name)}: ${kmTxt(p.km)}${Math.abs(p.dy) > 300 ? (p.dy > 0 ? ', above your plane' : ', below your plane') : ''}.`)) }; },
      () => { const a = laws().pirateActivity || 1, r = gs().raidIn; const L = [`Hostile activity index: ${a > 1.1 ? 'elevated' : a < 0.9 ? 'reduced' : 'normal'}, ${pct(a)} percent of baseline.`];
        if (typeof r === 'number' && r > 0 && r < 240) L.push(`Hazard notice. Hostile contacts are expected near Nova One within ${mins(r)}.`); else L.push('No raid warnings are in effect for Nova One.');
        return { key: 'hazard', title: 'Hazard notice', lines: L }; },
      () => { const w = laws().warpCost || 1; return { key: 'warp', title: 'Warp lane notice', lines: [`Warp-core fees are at ${pct(w)} percent of the standard rate.`, w > 1 ? 'Fuel rationing is in force. Plan shorter jumps.' : w < 1 ? 'The Free Lanes Charter is in force.' : 'No fee orders are in force.'] }; },
      () => { const s = gs(); if (typeof s.hull !== 'number' || s.hull >= 60) return null; return { key: 'hull', title: 'Vessel advisory', lines: [`Advisory for your vessel. Hull integrity ${s.hull} percent.`, 'Repair docks are open at Nova One Station.'] }; },
      () => ({ key: 'wx', title: 'Space weather', lines: [`Space weather. Solar wind ${pick(['light', 'moderate', 'steady', 'gusting'])}. Ion storm risk ${pick(['low', 'low', 'moderate', 'low near the reef'])}.`, `Micrometeoroid density ${pick(['nominal', 'nominal', 'raised near the asteroid fields', 'low'])}. Canopy polarizers recommended sunward.`] }),
      () => ({ key: 'ship', title: 'Shipping notice', lines: [pick(['Hauler convoys are running the Nova One to Cygnus Colony lane on the hour.', 'Salvage tugs are working the wreck fields. Keep two hundred metres clear.', 'Mining barges are outbound to the asteroid fields. Expect slow traffic.', 'Docking queue at Nova One Station is short. Request clearance on approach.'])] }),
    ],
    ledger: [
      () => { const b = laws().bounty || 1; return { key: 'bounty', title: 'Bounties', lines: [`Bounties. Red Wake hulls are paying ${pct(b)} percent of the base rate.`, 'Claims are paid on confirmed kills. Disabled hulls pay salvage only.'] }; },
      () => { const L = laws(), hc = Math.round(2400 * (L.heatCoreSell || 1)); return { key: 'prices', title: 'Prices', lines: [`Prices. Heat cores: ${hc} credits at station desks, ${Math.round(3200 * (L.heatCoreSell || 1))} at salvage desks.`, `Ore is selling at ${pct(L.oreSell)} percent of the posted rate.`, `Warp-core fees: ${pct(L.warpCost)} percent.`] }; },
      () => { const p = pol(); if (!p) return null; const a = p.active; if (!a) return { key: 'floor', title: 'Council floor', lines: ['Council floor. No motion is tabled.'] };
        const y = a.yes + Math.max(0, a.swing), n = a.no + Math.max(0, -a.swing); return { key: 'floor', title: 'Council floor', lines: [`Council floor. Motion tabled: ${a.title}. Sponsor: ${a.sponsor}.`, `Count: ${y} for, ${n} against. Vote closes in ${mins(a.left)}.`] }; },
      () => { const p = pol(); if (!p) return null; const L = p.laws || []; return { key: 'laws', title: 'Laws in force', lines: L.length ? ['Laws in force.'].concat(L.slice(0, 4).map(l => l.title + '.')) : ['Laws in force: none.'] }; },
      () => { const p = pol(); const h = p && p.history && p.history[0]; if (!h) return null; return { key: 'result', title: 'Last vote', lines: [`Last vote. ${h.title}: ${h.pass ? 'passed' : 'failed'}, ${h.yes} to ${h.no}.`] }; },
      () => ({ key: 'seats', title: 'Council seats', lines: ['Council seats. Nova One Authority, three. Nova Defense Compact, three. Ceres Mining Co-op, two. Meridian Combine, two. Civilian Network, two. Lantern Freeports, one.'] }),
    ],
    drift: [
      () => ({ key: 'open', title: 'The Drift Report', lines: [pick(['You are riding seventy-seven point seven. This is Orin Rook, and this is The Drift Report.', 'Seventy-seven point seven, the frequency they keep trying to jam. Orin Rook here. Pull up a crate.', 'If you can hear this, you are either lost or interesting. Orin Rook, The Drift Report.'])] }),
      () => { const b = laws().bounty || 1; if (b > 1.05) return { key: 'bounty', title: 'Bounty talk', lines: [`Council has Red Wake bounties at ${pct(b)} percent. Good week to own a gun.`, 'Bad week to own a red paint job. You know who you are.'] };
        if (b < 0.95) return { key: 'bounty', title: 'Bounty talk', lines: ['Bounties are thin this week. The Compact wants the glory and none of the paperwork.'] }; return null; },
      () => { const a = laws().pirateActivity || 1; if (a > 1.1) return { key: 'patrol', title: 'Fleet movements', lines: ['Patrols got cut. The lanes are wide open and everybody knows it.', 'Haulers, fly in pairs. Or do not, and make somebody rich.'] };
        if (a < 0.9) return { key: 'patrol', title: 'Fleet movements', lines: ['E D F is thick on the lanes this week. Transponders on, friends. Smile for the scanners.'] };
        return { key: 'patrol', title: 'Fleet movements', lines: [pick(['Compact patrols are keeping to the usual loops. Predictable. I like predictable.', 'Corporate escorts are running heavy near Meridian freight. Somebody is moving something they love.'])] }; },
      () => { const r = gs().raidIn; if (typeof r !== 'number' || r <= 0 || r > 240) return null; return { key: 'raid', title: 'A little bird', lines: [`A little bird says somebody near Nova One is about to have a bad day. ${mins(r)}, give or take.`, 'You did not hear it from me.'] }; },
      () => { const p = pol(), a = p && p.active; if (!a) return null; const y = a.yes + Math.max(0, a.swing), n = a.no + Math.max(0, -a.swing);
        return { key: 'floor', title: 'Word from the floor', lines: [`Word from the council floor. They are pushing the ${a.title}. Count is ${y} to ${n}.`, 'A few credits in the right pocket could tip that. The map room has a panel for it. Imagine that.'] }; },
      () => { const hc = Math.round(3200 * (laws().heatCoreSell || 1)); return { key: 'cores', title: 'Black market', lines: [`Heat cores are moving at ${hc} at the salvage desks. Colonies are cold and credits are warm.`, pick(['Ask at the reef if you want a better number. Bring a friend with a gun.', 'Strip a wreck before the tugs get there and you eat for a month.'])] }; },
      () => ({ key: 'rumor', title: 'Rumor mill', lines: [pick(['Rumor mill. A Meridian courier went dark past the graveyard. Cargo unlisted. Draw your own map.', 'Rumor mill. Somebody at Lantern is paying triple for clean transponder codes. I am not saying who.', 'Rumor mill. The Red Wake has a new gunship. Ugly thing. Missiles first, questions never.', 'Rumor mill. An old hauler captain swears the ice past the colony is hollow. He also swears his ship talks to him.', 'Rumor mill. Clanker Yard is buying droid parts, no questions. That means somebody is building something.'])] }),
      () => ({ key: 'close', title: 'Sign-off', lines: [pick(['Keep your core warm and your transponder honest. Mostly honest. Rook out.', 'That is the drift. If they ask, you were listening to The Beacon. Rook out.', 'Fly low, pay cash. This has been The Drift Report.'])] }),
    ],
  };
  function nextSegment() {
    const list = SEG[S.ch]; if (!list) return null;
    for (let k = 0; k < 12; k++) { let seg = null; try { seg = pick(list)(); } catch (e) { } if (seg && seg.lines.length && seg.key !== S.lastKey[S.ch]) { S.lastKey[S.ch] = seg.key; return seg; } }
    return null;
  }
  // ── audio: tuning static and speech ──
  let ac = null;
  function staticBurst(len = 0.3) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      const n = Math.floor(ac.sampleRate * len), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = ac.createBufferSource(); src.buffer = buf; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.8;
      const g = ac.createGain(); g.gain.value = 0.07; src.connect(bp); bp.connect(g); g.connect(ac.destination); src.start();
    } catch (e) { }
  }
  const muted = () => { try { return !!(window.novaCommsMuted && window.novaCommsMuted()); } catch (e) { return false; } };
  let utter = null;
  function say(text, c) {
    utter = null;
    try {
      if (muted() || !('speechSynthesis' in window)) return false;
      const u = new SpeechSynthesisUtterance(text), vs = window.speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
      const v = vs.find(x => c.voice.test(x.name)) || vs[0]; if (v) u.voice = v;
      u.pitch = c.pitch; u.rate = c.rate; u.volume = 0.9; u.onend = u.onerror = () => { if (utter === u) { utter = null; S.wait = Math.min(S.wait, 0.7); } };
      utter = u; window.speechSynthesis.speak(u); S.spoken++; return true;
    } catch (e) { utter = null; return false; }
  }
  const hush = () => { try { if (utter && 'speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) { } utter = null; };
  function playLine() {
    const c = CHANNELS[S.ch], text = S.queue.shift(); if (!c || !text) return;
    S.line = text;
    const est = Math.max(2.6, text.split(/\s+/).length * 0.4 / c.rate + 0.8);
    const speaking = say(text, c); S.wait = speaking ? est * 1.7 : est;
    try { nova.toast && nova.toast(`📻 ${c.short} · ${text}`, Math.round(est * 1000), c.col); } catch (e) { }
    try { nova.emit && nova.emit('radioLine', { channel: S.ch, title: S.title, text }); } catch (e) { }
  }
  function startSegment(seg) {
    seg = seg || nextSegment(); if (!seg) { S.gap = 5; return; }
    S.title = seg.title; S.queue = seg.lines.slice(); S.log.unshift({ title: seg.title, lines: seg.lines.slice(), ch: S.ch }); S.log = S.log.slice(0, 8);
    playLine();
  }
  function tick(dt) {
    if (!S.ch || !S.onAir) return; const d = Math.min(0.25, Math.max(0, Number(dt) || 0));
    if (window.novaCinematicPlaying) return;
    if (S.wait > 0) { S.wait -= d; return; }
    if (S.queue.length) { playLine(); return; }
    if (S.gap > 0) { S.gap -= d; if (S.gap <= 0) startSegment(); return; }
    S.line = ''; S.gap = 3 + Math.random() * 4;
  }
  function tune(id) {
    hush(); S.queue = []; S.wait = 0; S.line = ''; S.title = '';
    if (!id || !CHANNELS[id]) { S.ch = null; S.onAir = false; return false; }
    S.ch = id; S.onAir = true; S.log = S.log.filter(l => l.ch === id); staticBurst(); S.gap = 0.6; return true;
  }
  function toggle() { if (!S.ch) return false; S.onAir = !S.onAir; if (!S.onAir) { hush(); S.queue = []; S.line = ''; } else { staticBurst(0.2); S.gap = 0.4; } return S.onAir; }
  function skip() { if (!S.ch) return; hush(); S.queue = []; S.wait = 0; S.onAir = true; staticBurst(0.15); startSegment(); }
  function replay(i) { const l = S.log[i]; if (!l || !S.ch) return; hush(); S.wait = 0; S.onAir = true; S.title = l.title; S.queue = l.lines.slice(); playLine(); }
  const off = nova.onTick ? nova.onTick(tick) : null; let iv = null; if (!off) iv = setInterval(() => tick(0.25), 250);
  const api = {
    ready: true, CHANNELS, tune, toggle, skip, replay,
    get state() { return { channel: S.ch, onAir: S.onAir, title: S.title, line: S.line, log: S.log.slice(), spoken: S.spoken }; },
    dispose() { off && off(); iv && clearInterval(iv); hush(); }
  };
  window.novaRadio = api;
  window.novaTest = Object.assign(window.novaTest || {}, { radio: () => api.state, radioSegments: () => Object.fromEntries(Object.keys(SEG).map(k => [k, SEG[k].map(f => { try { return f(); } catch (e) { return 'ERR ' + e.message; } })])) });
  return api;
}
