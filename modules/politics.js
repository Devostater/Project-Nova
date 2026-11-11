// Politics: the Nova Accord Council and "The Council Floor" channel.
// Seat-holding factions propose motions; each motion runs a timed vote (in active play time). The player can lobby
// for or against with credits (cost scales with how far the vote must move). Passed motions become laws with real
// gameplay effects, read by the game through window.novaLaws (multipliers, default 1). News goes to NOVA NET and a toast.
// UI: the COUNCIL panel in the galaxy map room (galaxy_map.js) shows the motion and LOBBY YES / NO buttons; keys
// [ and ] lobby too. State is saved in localStorage.
const KEY = 'novaPoliticsV1';
const FACTIONS = {
  nova_1: { name: 'Nova-1 Authority', seats: 3, col: '#33e6ff' },
  nova_defense_compact: { name: 'Nova Defense Compact (EDF)', seats: 3, col: '#5aa8ff' },
  ceres_mining: { name: 'Ceres Mining Co-op', seats: 2, col: '#ffb347' },
  meridian_combine: { name: 'Meridian Combine', seats: 2, col: '#b98cff' },
  lantern_freeports: { name: 'Lantern Freeports', seats: 1, col: '#ffcc55' },
  neutral_civilian: { name: 'Civilian Network', seats: 2, col: '#9fd8a8' },
};
// effect keys → window.novaLaws multipliers the game reads
const MOTIONS = [
  { id: 'core_tax', title: 'Heat-Core Export Levy', sponsor: 'nova_1', text: 'Tax heat cores sold at stations to fund colony heating.', law: { heatCoreSell: 0.8 }, lean: { nova_1: 1, neutral_civilian: 1, ceres_mining: -1, lantern_freeports: -1 } },
  { id: 'core_subsidy', title: 'Warm Worlds Subsidy', sponsor: 'neutral_civilian', text: 'The council buys heat cores at a premium for freezing colonies.', law: { heatCoreSell: 1.3 }, lean: { neutral_civilian: 1, ceres_mining: 1, meridian_combine: -1 } },
  { id: 'red_wake_bounty', title: 'Red Wake Bounty Act', sponsor: 'nova_defense_compact', text: 'Double the bounty on Red Wake pirate ships.', law: { bounty: 2.0 }, lean: { nova_defense_compact: 1, nova_1: 1, neutral_civilian: 1, lantern_freeports: -1 } },
  { id: 'patrol_cuts', title: 'Patrol Budget Cuts', sponsor: 'meridian_combine', text: 'Cut EDF patrols to lower station fees. Pirates may grow bolder.', law: { pirateActivity: 1.4, bounty: 1.2 }, lean: { meridian_combine: 1, lantern_freeports: 1, nova_defense_compact: -1 } },
  { id: 'patrol_surge', title: 'Patrol Surge Order', sponsor: 'nova_defense_compact', text: 'More EDF patrols on the lanes. Fewer pirate raids, smaller bounties.', law: { pirateActivity: 0.7, bounty: 0.85 }, lean: { nova_defense_compact: 1, nova_1: 1, lantern_freeports: -1, meridian_combine: -1 } },
  { id: 'free_lanes', title: 'Free Lanes Charter', sponsor: 'lantern_freeports', text: 'Cut warp-core fees on the trade lanes.', law: { warpCost: 0.8 }, lean: { lantern_freeports: 1, ceres_mining: 1, meridian_combine: 1, nova_1: -1 } },
  { id: 'fuel_rationing', title: 'Core Fuel Rationing', sponsor: 'nova_1', text: 'Ration warp-core fuel for the cold season.', law: { warpCost: 1.25 }, lean: { nova_1: 1, neutral_civilian: 1, lantern_freeports: -1, ceres_mining: -1 } },
  { id: 'mining_rights', title: 'Open Mining Rights', sponsor: 'ceres_mining', text: 'Open more asteroid claims to independent pilots: better ore prices.', law: { oreSell: 1.25 }, lean: { ceres_mining: 1, neutral_civilian: 1, meridian_combine: -1 } },
];
export function init(nova) {
  const ls = (v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(KEY) || 'null'); localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { return null; } };
  const S = ls() || { laws: {}, active: null, next: 90, history: [], lobbied: 0 };   // laws: motionId → true while in force
  const laws = () => { const L = { heatCoreSell: 1, bounty: 1, pirateActivity: 1, warpCost: 1, oreSell: 1 }; Object.keys(S.laws).forEach(id => { const m = MOTIONS.find(x => x.id === id); if (m) Object.entries(m.law).forEach(([k, v]) => { L[k] *= v; }); }); const tn = window.novaTune || {}; Object.keys(L).forEach(k => { const t = Number(tn[k]); if (isFinite(t) && t > 0) L[k] *= t; }); return L; };   // owner tunes (Construction Bay) stack with laws
  function publishLaws() { window.novaLaws = laws(); }
  const save = () => ls(S);
  const credits = () => (typeof window.novaCredits === 'function' ? window.novaCredits() : null);
  function news(headline, body, tone) {
    try { nova.toast && nova.toast('🏛 COUNCIL FLOOR · ' + headline, 3600, tone || '#c9a8ff'); } catch (e) { }
    try { nova.emit && nova.emit('novaNetPublish', { id: 'council_' + Date.now(), headline: 'The Council Floor: ' + headline, dek: 'Nova Accord Council', body, category: 'politics' }); } catch (e) { }
  }
  function tally(m) {   // seats for / against before lobbying
    let yes = 0, no = 0; Object.entries(FACTIONS).forEach(([k, f]) => { const l = (m.lean[k] || 0) + (k === m.sponsor ? 1 : 0); if (l > 0) yes += f.seats; else if (l < 0) no += f.seats; else { if (Math.random() < 0.5) yes += f.seats; else no += f.seats; } }); return { yes, no };
  }
  function propose() {
    const pool = MOTIONS.filter(m => !S.laws[m.id] && (!S.active || S.active.id !== m.id)); if (!pool.length) return;
    const m = pool[Math.floor(Math.random() * pool.length)], t = tally(m);
    S.active = { id: m.id, left: 180, yes: t.yes, no: t.no, swing: 0 }; save();
    news(`${m.title} tabled`, `${FACTIONS[m.sponsor].name} tables "${m.title}": ${m.text} Vote in 3 minutes. Current count ${t.yes} for, ${t.no} against.`);
  }
  function resolve() {
    const a = S.active; if (!a) return; const m = MOTIONS.find(x => x.id === a.id); S.active = null;
    const yes = a.yes + Math.max(0, a.swing), no = a.no + Math.max(0, -a.swing), pass = yes > no;
    // conflicting laws: a new law replaces any in force that touch the same effect in the opposite direction
    if (pass) { Object.keys(S.laws).forEach(id => { const o = MOTIONS.find(x => x.id === id); if (o && Object.keys(o.law).some(k => k in m.law)) delete S.laws[id]; }); S.laws[m.id] = true; }
    S.history.unshift({ id: m.id, title: m.title, pass, yes, no, t: Date.now() }); S.history = S.history.slice(0, 12);
    S.next = 240 + Math.random() * 240; save(); publishLaws();
    news(`${m.title} ${pass ? 'PASSES' : 'FAILS'} ${yes}–${no}`, pass ? `Now in force: ${m.text}` : `The council rejects "${m.title}".`, pass ? '#33ff99' : '#ff8877');
    try { nova.emit && nova.emit('politicsVote', { id: m.id, pass, yes, no, laws: window.novaLaws }); } catch (e) { }
  }
  function lobbyCost() { const a = S.active; return a ? 400 + 250 * Math.abs(a.swing) : 0; }
  function lobby(side) {
    const a = S.active; if (!a) { news('No motion on the floor', 'Nothing to lobby for right now.'); return false; }
    const cost = lobbyCost(), have = credits();
    if (have !== null && have < cost) { try { nova.toast && nova.toast(`LOBBYING NEEDS ${cost} CR`, 2000, '#ff8877'); } catch (e) { } return false; }
    try { if (window.novaSpendCredits) window.novaSpendCredits(cost); } catch (e) { }
    a.swing += side > 0 ? 1 : -1; S.lobbied++; save();
    try { nova.toast && nova.toast(`LOBBIED ${side > 0 ? 'FOR' : 'AGAINST'} · -${cost} CR · swing ${a.swing > 0 ? '+' : ''}${a.swing}`, 2200, '#c9a8ff'); } catch (e) { }
    return true;
  }
  let acc = 0;
  function tick(dt) {
    const d = Math.min(0.2, Math.max(0, Number(dt) || 0)); acc += d; if (acc < 1) return; const step = acc; acc = 0;
    if (S.active) { S.active.left -= step; if (S.active.left <= 0) resolve(); else if (Math.random() < 0.05) save(); }
    else { S.next -= step; if (S.next <= 0) propose(); }
  }
  addEventListener('keydown', e => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (e.code === 'BracketRight') lobby(1); else if (e.code === 'BracketLeft') lobby(-1); });
  publishLaws();
  const off = nova.onTick ? nova.onTick(tick) : null;
  const api = {
    ready: true, FACTIONS, MOTIONS, lobby, lobbyCost, propose, resolve, refresh: publishLaws,
    get state() { const a = S.active, m = a && MOTIONS.find(x => x.id === a.id); return { active: a ? { ...a, title: m.title, text: m.text, sponsor: FACTIONS[m.sponsor].name } : null, laws: Object.keys(S.laws).map(id => MOTIONS.find(x => x.id === id)).filter(Boolean).map(m => ({ id: m.id, title: m.title, law: m.law })), history: S.history.slice(), effects: window.novaLaws }; },
    dispose() { off && off(); save(); }
  };
  window.novaPolitics = api;
  window.novaTest = Object.assign(window.novaTest || {}, { politics: () => api.state, politicsPropose: () => (propose(), api.state), politicsResolve: () => (resolve(), api.state) });
  return api;
}
