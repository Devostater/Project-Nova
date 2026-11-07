// Project Nova: morality meter (AI_QUEUE A13).
// One number from -100 (ruthless) to +100 (merciful), saved in localStorage.novaMorality,
// with a short log of the choices that moved it. Crew comment on each change.
//
// Use from the game:  novaMorality.add(+10, 'Spared the surrendered pirate')
//                     novaMorality.choice('fusion_core', 'return' | 'sell' | 'keep')
//                     novaMorality.value, .label(), .log

const KEY = 'novaMorality', LOGKEY = 'novaMoralityLog';
const CHOICES = {
  // The Cold Run choice: a fusion core recovered from the freighter
  fusion_core: {
    return: { d: +25, why: 'Returned the fusion core to the freezing colony', crew: 'Ten thousand people stay warm tonight. That was right.' },
    keep:   { d: -5,  why: 'Kept the fusion core for the ship',               crew: 'We needed it too. I suppose.' },
    sell:   { d: -25, why: 'Sold the fusion core to the broker',              crew: 'Good money. Cold people. I hope you sleep well.' },
  },
  surrender: {
    spare:   { d: +10, why: 'Spared a surrendering pilot',  crew: 'Mercy out here is rare. They will remember it.' },
    execute: { d: -15, why: 'Shot a surrendering pilot',    crew: '...They had their hands up.' },
  },
  self_destruct: {
    scuttle: { d: -5, why: 'Scuttled a boarded ship with its crew aboard', crew: 'No witnesses. Efficient.' },
    leave:   { d: +5, why: 'Left a boarded ship drifting with its crew alive', crew: 'They will limp home. Fair enough.' },
  },
};

export function init(api = {}) {
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  let value = Number(ls(KEY)) || 0;
  let log = []; try { log = JSON.parse(ls(LOGKEY) || '[]'); } catch (e) { log = []; }

  const label = () => value >= 60 ? 'GUARDIAN' : value >= 20 ? 'HONEST' : value > -20 ? 'NEUTRAL' : value > -60 ? 'MERCENARY' : 'RUTHLESS';
  const color = () => value >= 20 ? '#66ddff' : value > -20 ? '#cfefff' : '#ff5544';
  function save() { ls(KEY, String(value)); ls(LOGKEY, JSON.stringify(log.slice(-20))); }

  function add(d, why, crewLine) {
    const before = label();
    value = Math.max(-100, Math.min(100, Math.round(value + d)));
    log.push({ d, why: why || '', t: Date.now() }); save();
    api.toast && api.toast(`MORALITY ${d > 0 ? '+' : ''}${d}: ${why || ''}`, 2600, d >= 0 ? '#66ddff' : '#ff5544');
    if (crewLine && api.crew) setTimeout(() => api.crew(crewLine), 1400);
    if (label() !== before && api.toast) setTimeout(() => api.toast(`REPUTATION: ${label()}`, 2600, color()), 3200);
    return value;
  }
  function choice(id, opt) {
    const c = CHOICES[id] && CHOICES[id][opt]; if (!c) return null;
    const result = add(c.d, c.why, c.crew);
    api.emit?.('crewReaction', { phase: 'choice', id, option: opt });
    return result;
  }
  function reset() { value = 0; log = []; save(); }
  function line() { return `MORALITY ${value > 0 ? '+' : ''}${value} · ${label()}`; }

  return { add, choice, reset, label, color, line, get value() { return value; }, get log() { return log.slice(); }, CHOICES };
}
