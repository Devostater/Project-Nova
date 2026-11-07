/**
 * Project Nova G3 / A15: versioned save coverage for the vertical slice.
 *
 * This module owns one compact save object and migrates existing Nova keys.
 * It does not replace the three-slot game-file UI; Claude can call nova.save(),
 * nova.load(), and nova.reset() from that UI or reload after nova.load().
 */

const SAVE_KEY = 'novaStateV2';
const SCHEMA_VERSION = 2;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clone(value, fallback) {
  try {
    return value == null ? fallback : JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

export function init(nova = {}) {
  const storage = nova.storage || globalThis.localStorage;
  const listeners = [];
  let timer = 0;
  let lastReason = 'startup';
  let counts = { interiors: 0, boardings: 0 };

  function get(key) {
    try { return storage?.getItem(key); } catch { return null; }
  }
  function set(key, value) {
    try { storage?.setItem(key, value); return true; } catch { return false; }
  }
  function del(key) {
    try { storage?.removeItem(key); return true; } catch { return false; }
  }
  function json(key, fallback) {
    try { return JSON.parse(get(key) || 'null') ?? fallback; } catch { return fallback; }
  }
  function credits() {
    if (typeof nova.getCredits === 'function') return finite(nova.getCredits(), 0);
    const v13 = json('novaV13', {});
    if (Number.isFinite(Number(v13?.cr))) return Number(v13.cr);
    const pending = json('novaLoadLive', {});
    return finite(pending?.bankCredits, 0);
  }
  function salvageCargo() {
    if (typeof nova.getSalvage === 'function') return finite(nova.getSalvage(), 0);
    const pending = json('novaLoadLive', {});
    return finite(pending?.cargoSalvage, finite(get('novaCargoSalvage'), 0));
  }
  function capture(reason = 'manual') {
    const moralityLog = json('novaMoralityLog', []);
    const coldRun = json('novaColdRun', {});
    const wreckSalvage = json('novaSalv', {});
    return {
      version: SCHEMA_VERSION,
      savedAt: Date.now(),
      reason,
      heatCores: Math.max(0, Math.floor(finite(get('novaHeatCores'), 0))),
      morality: {
        value: Math.max(-100, Math.min(100, Math.round(finite(get('novaMorality'), 0)))),
        log: Array.isArray(moralityLog) ? moralityLog.slice(-20) : []
      },
      salvage: {
        cargo: Math.max(0, Math.floor(salvageCargo())),
        wrecks: wreckSalvage && typeof wreckSalvage === 'object' ? wreckSalvage : {}
      },
      credits: Math.max(0, Math.floor(credits())),
      coldRun: coldRun && typeof coldRun === 'object' ? coldRun : {},
      counts: { ...counts }
    };
  }
  function normalize(input) {
    const data = clone(input, {}) || {};
    const morality = data.morality && typeof data.morality === 'object' ? data.morality : {};
    const salvage = data.salvage && typeof data.salvage === 'object' ? data.salvage : {};
    const rawCounts = data.counts && typeof data.counts === 'object' ? data.counts : {};
    return {
      version: SCHEMA_VERSION,
      savedAt: finite(data.savedAt, Date.now()),
      reason: String(data.reason || 'loaded'),
      heatCores: Math.max(0, Math.floor(finite(data.heatCores, 0))),
      morality: {
        value: Math.max(-100, Math.min(100, Math.round(finite(morality.value, 0)))),
        log: Array.isArray(morality.log) ? morality.log.slice(-20) : []
      },
      salvage: {
        cargo: Math.max(0, Math.floor(finite(salvage.cargo, 0))),
        wrecks: salvage.wrecks && typeof salvage.wrecks === 'object' ? salvage.wrecks : {}
      },
      credits: Math.max(0, Math.floor(finite(data.credits, 0))),
      coldRun: data.coldRun && typeof data.coldRun === 'object' ? data.coldRun : {},
      counts: {
        interiors: Math.max(0, Math.floor(finite(rawCounts.interiors, 0))),
        boardings: Math.max(0, Math.floor(finite(rawCounts.boardings, 0)))
      }
    };
  }
  function persist(data) {
    const normalized = normalize(data);
    set(SAVE_KEY, JSON.stringify(normalized));
    counts = { ...normalized.counts };
    return normalized;
  }
  function save(reason = 'manual') {
    lastReason = String(reason || 'manual');
    const data = persist(capture(lastReason));
    nova.emit?.('saveWritten', { key: SAVE_KEY, data });
    return data;
  }
  function apply(data) {
    set('novaHeatCores', String(data.heatCores));
    set('novaMorality', String(data.morality.value));
    set('novaMoralityLog', JSON.stringify(data.morality.log));
    set('novaSalv', JSON.stringify(data.salvage.wrecks));
    set('novaCargoSalvage', String(data.salvage.cargo));
    set('novaColdRun', JSON.stringify(data.coldRun));

    const v13 = json('novaV13', {});
    set('novaV13', JSON.stringify({ ...(v13 && typeof v13 === 'object' ? v13 : {}), cr: data.credits }));
    const pending = json('novaLoadLive', {});
    set('novaLoadLive', JSON.stringify({
      ...(pending && typeof pending === 'object' ? pending : {}),
      bankCredits: data.credits,
      cargoSalvage: data.salvage.cargo
    }));

    counts = { ...data.counts };
    nova.setCredits?.(data.credits);
    nova.setSalvage?.(data.salvage.cargo);
    nova.emit?.('saveLoaded', { key: SAVE_KEY, data });
    return data;
  }
  function load(input) {
    let source = input;
    if (source == null) source = json(SAVE_KEY, null);
    if (!source || typeof source !== 'object') return null;
    return apply(persist(source));
  }
  function reset(options = {}) {
    if (timer) { clearTimeout(timer); timer = 0; }
    del(SAVE_KEY);
    counts = { interiors: 0, boardings: 0 };
    if (options.legacy === true) {
      [
        'novaHeatCores', 'novaMorality', 'novaMoralityLog', 'novaSalv',
        'novaCargoSalvage', 'novaColdRun'
      ].forEach(del);
    }
    nova.emit?.('saveReset', { key: SAVE_KEY, legacy: options.legacy === true });
    return true;
  }
  function migrate() {
    const current = json(SAVE_KEY, null);
    if (current && finite(current.version, 0) >= SCHEMA_VERSION) {
      counts = normalize(current).counts;
      return { data: normalize(current), migrated: false, from: [] };
    }
    const from = [
      'novaHeatCores', 'novaMorality', 'novaMoralityLog', 'novaSalv',
      'novaCargoSalvage', 'novaColdRun', 'novaV13'
    ].filter(key => get(key) != null);
    const data = save(from.length ? 'legacy-migration' : 'initial-save');
    return { data, migrated: from.length > 0, from };
  }
  function schedule(reason, delay = 120) {
    lastReason = reason;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = 0; save(lastReason); }, delay);
  }
  function on(name, fn) {
    if (typeof nova.on !== 'function') return;
    const off = nova.on(name, fn);
    if (typeof off === 'function') listeners.push(off);
  }

  ['docked', 'dockComplete', 'dockedAtLantern'].forEach(name => on(name, () => schedule(name, 0)));
  [
    'warpComplete', 'pirateWaveCleared', 'salvageStowed', 'heatCoreCollected',
    'missionStarted', 'missionBeat', 'missionProgress', 'coreSold',
    'crewReaction', 'moralityChanged'
  ].forEach(name => on(name, () => schedule(name)));
  on('interiorEntered', () => { counts.interiors += 1; schedule('interiorEntered'); });
  on('boardingComplete', () => { counts.boardings += 1; schedule('boardingComplete'); });

  const beforeUnload = () => save('beforeunload');
  globalThis.addEventListener?.('beforeunload', beforeUnload);

  const migration = migrate();
  const api = {
    ready: true,
    key: SAVE_KEY,
    version: SCHEMA_VERSION,
    save,
    load,
    reset,
    capture,
    migrate,
    get data() { return normalize(json(SAVE_KEY, capture('preview'))); },
    get migration() { return { ...migration, from: migration.from.slice() }; },
    dispose() {
      if (timer) clearTimeout(timer);
      listeners.splice(0).forEach(off => { try { off(); } catch {} });
      globalThis.removeEventListener?.('beforeunload', beforeUnload);
    }
  };
  nova.save = save;
  nova.load = load;
  nova.reset = reset;
  globalThis.novaSave = api;
  console.info('[NOVA module] save ready:', migration.migrated ? 'migrated ' + migration.from.join(', ') : 'current');
  return api;
}
