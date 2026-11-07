/**
 * Project Nova G1: faction ship roster expansion.
 *
 * This module only registers data. Claude owns the game-file spawn hooks.
 * It deliberately reuses existing optimized GLBs, so it adds no geometry,
 * materials, loaders, or per-frame work.
 */

const ASSETS = Object.freeze({
  alien_worker_drone: {
    file: 'alien_support', lo: 'alien_support_lo', size: 20,
    yaw: Math.PI / 2, loAt: 320
  },
  alien_carrier_drone: {
    file: 'alien_attack_drone', lo: 'alien_attack_drone_lo', size: 10,
    yaw: Math.PI / 2, loAt: 180
  },
  alien_spiked_orb: {
    file: 'alien_spore_turret', lo: 'alien_spore_turret_lo', size: 30,
    yaw: 0, loAt: 400
  },
  pirate_stealth_bomber: {
    file: 'pirate_stealth', lo: 'pirate_stealth_lo', size: 18,
    yaw: Math.PI / 2, loAt: 280
  },
  pirate_raider_gunship: {
    file: 'pirate_raider', size: 20,
    yaw: -Math.PI / 2, loAt: 420
  },
  pirate_missile_frigate: {
    file: 'pirate_frigate', lo: 'pirate_frigate_lo', size: 110,
    yaw: -Math.PI / 2, loAt: 850
  },
  edf_frigate_carrier: {
    file: 'edf_carrier', lo: 'edf_carrier_lo', size: 200,
    yaw: -Math.PI / 2, loAt: 1100
  }
});

const STATS = Object.freeze({
  alien_worker_drone: {
    fac: 'alien', name: 'HARVESTER DRONE',
    hp: 80, sh: 25, spd: 46, turn: 1.0, ai: 'support',
    heal: 8, aggro: 320, bounty: 300, unarmed: true,
    roster: { role: 'logistics', color: 0x7dffd8, loadout: 'repair beam + cargo pods' }
  },
  alien_carrier_drone: {
    fac: 'alien', name: 'BROOD INTERCEPTOR',
    hp: 34, sh: 12, spd: 132, turn: 2.9, ai: 'dog',
    gun: { dmg: 2.2, cd: 0.22, spd: 300, col: 0x8affdd, range: 380, twin: true },
    aggro: 1050, bounty: 210,
    roster: { role: 'interceptor', color: 0x8affdd, loadout: 'twin rapid plasma' }
  },
  alien_spiked_orb: {
    fac: 'alien', name: 'THORN ORB',
    hp: 190, sh: 70, spd: 24, turn: 0.9, ai: 'dog',
    gun: { beam: true, dmg: 10, cd: 2.8, range: 980, col: 0xff66cc },
    aggro: 1100, bounty: 950,
    roster: { role: 'artillery', color: 0xff66cc, loadout: 'long-range thorn beam' }
  },
  pirate_stealth_bomber: {
    fac: 'pirate', name: 'WRAITH BOMBER',
    hp: 58, sh: 38, spd: 92, turn: 1.35, ai: 'stealth',
    msl: { dmg: 30, cd: 9, range: 620 },
    aggro: 1350, bounty: 1250,
    roster: { role: 'stealth bomber', color: 0xd981ff, loadout: 'heavy seeker missiles' }
  },
  pirate_raider_gunship: {
    fac: 'pirate', name: 'REEF RAIDER',
    hp: 180, sh: 55, spd: 62, turn: 0.75, ai: 'dog',
    gun: { dmg: 4.5, cd: 0.32, spd: 270, col: 0xffb33b, range: 600, burst: 5 },
    msl: { dmg: 18, cd: 12, range: 720 },
    aggro: 1200, bounty: 1050,
    roster: { role: 'assault gunship', color: 0xffb33b, loadout: 'burst cannon + light missiles' }
  },
  pirate_missile_frigate: {
    fac: 'pirate', name: 'CORSAIR ARSENAL',
    hp: 470, sh: 180, spd: 17, turn: 0.18, ai: 'frigate',
    gun: { dmg: 4.5, cd: 1.8, spd: 240, col: 0xff6633, range: 850, broadside: 2 },
    msl: { dmg: 26, cd: 8, range: 1050 },
    aggro: 1500, bounty: 3100,
    roster: { role: 'missile frigate', color: 0xff6633, loadout: 'broadside guns + heavy missiles' }
  },
  edf_frigate_carrier: {
    fac: 'edf', name: 'EDF AEGIS',
    hp: 1500, sh: 1100, spd: 8, turn: 0.08, ai: 'ecarrier',
    spawn: { slug: 'edf_fighter', cd: 18, max: 3 },
    safe: 260, aggro: 1500,
    roster: { role: 'escort carrier', color: 0x66bbff, loadout: 'fighter wing + repair field' }
  }
});

function copyEntry(value) {
  const out = { ...value };
  if (value.gun) out.gun = { ...value.gun };
  if (value.msl) out.msl = { ...value.msl };
  if (value.spawn) out.spawn = { ...value.spawn };
  if (value.roster) out.roster = { ...value.roster };
  return out;
}

export function register(nova = {}) {
  const assets = globalThis.NF_ASSETS;
  const stats = globalThis.NF_STATS;
  if (!assets || !stats || typeof assets !== 'object' || typeof stats !== 'object') {
    return {
      ready: false,
      reason: 'NF_ASSETS/NF_STATS are not available yet',
      registered: [],
      skipped: Object.keys(STATS)
    };
  }

  const registered = [];
  const skipped = [];
  for (const slug of Object.keys(STATS)) {
    let changed = false;
    if (!Object.prototype.hasOwnProperty.call(assets, slug)) {
      assets[slug] = copyEntry(ASSETS[slug]);
      changed = true;
    }
    if (!Object.prototype.hasOwnProperty.call(stats, slug)) {
      stats[slug] = copyEntry(STATS[slug]);
      changed = true;
    }
    (changed ? registered : skipped).push(slug);
  }

  const api = {
    ready: true,
    registered,
    skipped,
    slugs: Object.freeze(Object.keys(STATS)),
    assets: ASSETS,
    stats: STATS,
    get(slug) {
      return STATS[slug] ? { asset: ASSETS[slug], stats: STATS[slug] } : null;
    }
  };
  globalThis.novaRoster = api;
  if (nova && typeof nova === 'object') nova.roster = api;
  console.info('[NOVA module] roster ready:', registered.length, 'new variants');
  return api;
}

export function init(nova) {
  return register(nova);
}
