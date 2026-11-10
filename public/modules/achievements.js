/**
 * Achievements, Combat Streaks & Audio Fanfare System ("Bells & Whistles")
 * Ultra-lightweight (zero per-frame GC allocations), offline-ready, Quest 3 optimized.
 */
export function init(nova = {}) {
  const CATALOG = [
    { id: 'first_flight', title: 'First Flight', desc: 'Launch starfighter into deep space', icon: '🚀', reward: 500 },
    { id: 'deadeye', title: 'Deadeye', desc: 'Destroy an enemy fighter or drone', icon: '🎯', reward: 1000 },
    { id: 'scrapper', title: 'Scrapper', desc: 'Tractor in or salvage floating debris', icon: '🧲', reward: 750 },
    { id: 'dock_master', title: 'Dock Master', desc: 'Clamp into an orbital station dock', icon: '⚓', reward: 500 },
    { id: 'warp_speed', title: 'Hyperspace', desc: 'Engage lightspeed warp jump', icon: '⚡', reward: 500 },
    { id: 'spacewalker', title: 'Spacewalker', desc: 'Exit cockpit into Zero-G EVA', icon: '👨‍🚀', reward: 1000 },
    { id: 'reboot_ace', title: 'Resurrection', desc: 'Reboot after an EMP / Ion blackout', icon: '⚡', reward: 1200 },
    { id: 'fox_two', title: 'Fox Two', desc: 'Fire a homing missile at a locked threat', icon: '🚀', reward: 600 },
    { id: 'cantina_patron', title: 'Cantina Regular', desc: 'Step into the Starbase Cantina', icon: '🍹', reward: 400 },
    { id: 'reality_blend', title: 'Reality Blend', desc: 'Activate Mixed Reality passthrough in VR', icon: '👁️', reward: 500 },
    { id: 'lore_hound', title: 'Nova Wire', desc: 'Watch or listen to a Nova News broadcast', icon: '📰', reward: 400 },
    { id: 'high_roller', title: 'High Roller', desc: 'Accumulate over 15,000 Credits', icon: '🪙', reward: 1500 },
    { id: 'overdrive', title: 'Speed Demon', desc: 'Push afterburners past 250 m/s', icon: '🔥', reward: 800 },
    { id: 'ace_pilot', title: 'Ace in a Day', desc: 'Score a multi-kill streak in dogfighting', icon: '🏆', reward: 2000 },
    { id: 'hull_mechanic', title: 'Hull Mechanic', desc: 'Reset exterior maintenance fuse in EVA', icon: '🔧', reward: 1200 }
  ];

  // Load persistence
  const unlocked = (() => {
    try { return JSON.parse(localStorage.getItem('novaAchievements') || '{}'); }
    catch (_) { return {}; }
  })();

  const stats = (() => {
    try {
      return Object.assign({
        kills: 0,
        salvage: 0,
        dockings: 0,
        warps: 0,
        missiles: 0,
        evaCount: 0,
        maxSpeed: 0
      }, JSON.parse(localStorage.getItem('novaStats') || '{}'));
    } catch (_) {
      return { kills: 0, salvage: 0, dockings: 0, warps: 0, missiles: 0, evaCount: 0, maxSpeed: 0 };
    }
  })();

  function save() {
    try {
      localStorage.setItem('novaAchievements', JSON.stringify(unlocked));
      localStorage.setItem('novaStats', JSON.stringify(stats));
    } catch (_) {}
  }

  // ── High-Satisfaction Web Audio Fanfare & SFX ──
  function playFanfare() {
    try {
      const ctx = window.sound?.ctx;
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;

      // 4-chord ascending celebratory arpeggio: C5 (523), E5 (659), G5 (784), C6 (1046)
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);

        gain.gain.setValueAtTime(0.001, t + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.28, t + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.08 + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.56);
      });

      // Warm background brass chord
      const chord = ctx.createOscillator();
      const cg = ctx.createGain();
      chord.type = 'sine';
      chord.frequency.setValueAtTime(523.25, t + 0.24);
      cg.gain.setValueAtTime(0.18, t + 0.24);
      cg.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      chord.connect(cg);
      cg.connect(ctx.destination);
      chord.start(t + 0.24);
      chord.stop(t + 1.15);
    } catch (_) {}
  }

  function playStreakChime(streakCount) {
    try {
      const ctx = window.sound?.ctx;
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      const baseFreq = streakCount === 2 ? 659.25 : streakCount === 3 ? 880 : 1046.50;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.18);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    } catch (_) {}
  }

  function playOverdriveBoom() {
    try {
      const ctx = window.sound?.ctx;
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;

      // Sub-bass rumble boom
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.7);

      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.86);
    } catch (_) {}
  }

  function triggerHaptics(strength = 0.7, duration = 180) {
    try {
      if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        const gps = navigator.getGamepads();
        for (let i = 0; i < gps.length; i++) {
          const gp = gps[i];
          if (gp && gp.hapticActuators && gp.hapticActuators[0]) {
            gp.hapticActuators[0].pulse(strength, duration);
          }
        }
      }
    } catch (_) {}
  }

  // ── Unlock API ──
  function unlock(id) {
    if (unlocked[id]) return false;
    const a = CATALOG.find(item => item.id === id);
    if (!a) return false;

    unlocked[id] = { time: Date.now() };
    save();

    // Reward credits
    if (a.reward && typeof window.bankCredits === 'number') {
      window.bankCredits += a.reward;
      try {
        if (typeof window.novaPilot === 'object') window.novaPilot.credits = window.bankCredits;
        if (typeof window.novaSavePilot === 'function') window.novaSavePilot();
      } catch (_) {}
    }

    // Audio & Toast & Dash Ticker & Haptics
    playFanfare();
    triggerHaptics(0.85, 220);
    const rewardTxt = a.reward ? ` (+${a.reward} CR)` : '';
    const msg = `🏆 UNLOCKED: ${a.icon} ${a.title.toUpperCase()}${rewardTxt}`;
    if (typeof window.showToast === 'function') {
      window.showToast(msg, 3800, '#ffd24a');
    }
    if (typeof window.novaTriggerVrToast === 'function') {
      window.novaTriggerVrToast(msg, 3800, '#ffd24a');
    }

    try { nova.emit?.('achievementUnlocked', { id, achievement: a }); } catch (_) {}
    return true;
  }

  function trackStat(statName, delta = 1) {
    if (typeof stats[statName] === 'number') {
      stats[statName] += delta;
      save();
    }
  }

  // ── Multi-Kill Dogfight Streak Tracker ──
  const killTimes = [];
  function recordKill() {
    trackStat('kills', 1);
    unlock('deadeye');

    const now = performance.now();
    killTimes.push(now);
    // Remove kills older than 18 seconds
    while (killTimes.length && now - killTimes[0] > 18000) {
      killTimes.shift();
    }

    const streak = killTimes.length;
    if (streak >= 2) {
      unlock('ace_pilot');
      playStreakChime(streak);
      triggerHaptics(0.6, 150);
      const title = streak === 2 ? '⚡ DOUBLE KILL!' : streak === 3 ? '🔥 TRIPLE KILL! (x2 BOUNTY)' : '☠️ ACE PILOT RAMPAGE!';
      const bonus = streak * 300;
      if (typeof window.bankCredits === 'number') window.bankCredits += bonus;
      window.showToast?.(`${title} +${bonus} CR`, 2600, '#ff3355');
    }
  }

  // ── Event Listeners ──
  if (typeof nova.on === 'function') {
    nova.on('pirateWaveCleared', () => recordKill());
    nova.on('salvageStowed', () => {
      trackStat('salvage', 1);
      unlock('scrapper');
    });
    nova.on('dockedAtLantern', () => {
      trackStat('dockings', 1);
      unlock('dock_master');
    });
    nova.on('warpComplete', () => {
      trackStat('warps', 1);
      unlock('warp_speed');
    });
    nova.on('evaEnter', () => {
      trackStat('evaCount', 1);
      unlock('spacewalker');
    });
    nova.on('evaFuseReset', () => {
      unlock('hull_mechanic');
    });
    nova.on('ionRebootComplete', () => {
      unlock('reboot_ace');
    });
    nova.on('missileFired', () => {
      trackStat('missiles', 1);
      unlock('fox_two');
    });
    nova.on('interiorEnter', () => {
      unlock('cantina_patron');
    });
    nova.on('passthroughToggled', e => {
      if (e && e.active) unlock('reality_blend');
    });
    nova.on('newsBroadcastViewed', () => {
      unlock('lore_hound');
    });
  }

  // ── Frame Tick Monitor (Speed Overdrive, High Roller, First Flight) ──
  let speedCheckT = 0;
  function frame(dt = 0.016) {
    speedCheckT += dt;
    if (speedCheckT < 0.25) return;
    speedCheckT = 0;

    // Check High Roller
    if (typeof window.bankCredits === 'number' && window.bankCredits >= 15000) {
      unlock('high_roller');
    }

    // Check First Flight
    if (typeof window.shipBody !== 'undefined' && window.shipBody && window.shipBody.velocity) {
      const spd = window.shipBody.velocity.length();
      if (spd > 15) unlock('first_flight');
      if (spd > stats.maxSpeed) {
        stats.maxSpeed = Math.round(spd);
        save();
      }
      if (spd >= 250 && !unlocked['overdrive']) {
        unlock('overdrive');
        playOverdriveBoom();
        window.showToast?.('⚡ OVERDRIVE REACHED (>250 M/S)!', 2400, '#00e5ff');
      }
    }
  }

  if (typeof nova.onTick === 'function') {
    nova.onTick(frame);
  }

  // ── Canvas Drawing Helper for Cockpit Console (NP_ACHIEVE) ──
  function drawPanel(ctx, w = 1024, h = 600, scroll = 0) {
    ctx.clearRect(0, 0, w, h);

    // Deep space dark console backing
    ctx.fillStyle = '#060f1c';
    ctx.fillRect(0, 0, w, h);

    // Header bar
    ctx.fillStyle = 'rgba(255,210,74,0.12)';
    ctx.fillRect(8, 8, w - 16, 42);
    ctx.strokeStyle = '#ffd24a';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, w - 16, 42);

    const unlockedCount = CATALOG.filter(a => !!unlocked[a.id]).length;
    const pct = Math.round((unlockedCount / CATALOG.length) * 100);

    ctx.textAlign = 'left';
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ffd24a';
    ctx.fillText(`🏆 PILOT MEDALS & AWARDS: ${unlockedCount} / ${CATALOG.length} (${pct}%)`, 24, 37);

    ctx.textAlign = 'right';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#7fb6d0';
    ctx.fillText(`KILLS ${stats.kills} · SALVAGE ${stats.salvage} · DOCKS ${stats.dockings}`, w - 24, 37);
    ctx.textAlign = 'left';

    // 2-column achievement grid: 6 items visible per page
    const pageSize = 6;
    const startIndex = Math.max(0, Math.min(scroll, CATALOG.length - pageSize));
    const visible = CATALOG.slice(startIndex, startIndex + pageSize);

    visible.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = 16 + col * 498;
      const by = 62 + row * 138;
      const bw = 484;
      const bh = 126;
      const isDone = !!unlocked[item.id];

      ctx.fillStyle = isDone ? 'rgba(255,210,74,0.10)' : 'rgba(12,28,42,0.65)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = isDone ? '#ffd24a' : 'rgba(102,230,255,0.25)';
      ctx.lineWidth = isDone ? 2.5 : 1.5;
      ctx.strokeRect(bx, by, bw, bh);

      // Icon badge box
      ctx.fillStyle = isDone ? 'rgba(255,210,74,0.25)' : 'rgba(20,40,55,0.5)';
      ctx.fillRect(bx + 14, by + 14, 60, 60);
      ctx.strokeStyle = isDone ? '#ffd24a' : '#557788';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx + 14, by + 14, 60, 60);

      ctx.textAlign = 'center';
      ctx.font = '32px monospace';
      ctx.fillText(isDone ? item.icon : '🔒', bx + 44, by + 56);
      ctx.textAlign = 'left';

      // Title & Desc
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = isDone ? '#ffffff' : '#7799aa';
      ctx.fillText(item.title.toUpperCase(), bx + 86, by + 40);

      ctx.font = '15px monospace';
      ctx.fillStyle = isDone ? '#9fc3d8' : '#557788';
      ctx.fillText(item.desc, bx + 86, by + 68);

      // Reward & Status footer
      ctx.font = 'bold 14px monospace';
      if (isDone) {
        ctx.fillStyle = '#33ff99';
        ctx.fillText('✓ UNLOCKED', bx + 86, by + 104);
        ctx.fillStyle = '#ffd24a';
        ctx.fillText(`+${item.reward} CR`, bx + 220, by + 104);
      } else {
        ctx.fillStyle = '#668899';
        ctx.fillText(`REWARD: +${item.reward} CR`, bx + 86, by + 104);
      }
    });

    // Navigation hints at bottom
    ctx.fillStyle = 'rgba(8,24,36,0.85)';
    ctx.fillRect(8, 488, w - 16, 96);
    ctx.strokeStyle = 'rgba(102,230,255,0.3)';
    ctx.strokeRect(8, 488, w - 16, 96);

    ctx.textAlign = 'center';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.fillText('◀ SCROLL TOUCHPADS / BUTTONS TO VIEW MORE AWARDS ▶', w / 2, 545);
    ctx.textAlign = 'left';
  }

  const instance = {
    catalog: CATALOG,
    unlocked,
    stats,
    unlock,
    trackStat,
    recordKill,
    playFanfare,
    playStreakChime,
    playOverdriveBoom,
    drawPanel,
    getProgress: () => {
      const done = CATALOG.filter(a => !!unlocked[a.id]).length;
      return { unlocked: done, total: CATALOG.length, percent: Math.round((done / CATALOG.length) * 100) };
    }
  };

  window.novaAchievements = instance;
  console.info('[achievements] system ready, unlocked:', Object.keys(unlocked).length);
  return instance;
}
