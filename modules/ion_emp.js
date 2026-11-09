/**
 * Ion / EMP Disruptor & Emergency Cockpit Reboot System
 * Simulates high-voltage ion cannon hits, EMP blackout, cockpit electrical tripouts,
 * and multi-step manual reboot sequences.
 */
export function init(nova = {}) {
  const T = nova.THREE || (typeof window !== 'undefined' ? window.THREE : null);
  const scene = nova.scene || (typeof window !== 'undefined' ? window.scene : null);
  const cockpit = nova.cockpit || (typeof window !== 'undefined' ? window.cockpit : null);
  const shipGroup = nova.shipGroup || (typeof window !== 'undefined' ? window.shipGroup : null);

  if (!T || !scene || !cockpit) {
    console.warn('[ion_emp] prerequisites missing, standing by');
    return { ready: false };
  }

  const root = new T.Group();
  root.name = 'NOVA_ION_EMP_SYSTEM';
  cockpit.add(root);

  // ── Audio Synthesizer for Electrical Arcing & EMP Shockwaves ──
  function playSound(type) {
    try {
      const ctx = window.sound?.ctx;
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      if (type === 'emp_blast') {
        // Deep bass shockwave + high-frequency electric sizzle
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(28, t + 0.9);
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t); osc.stop(t + 1.2);

        // Electric zap sizzle
        const zap = ctx.createOscillator();
        const zg = ctx.createGain();
        zap.type = 'square';
        zap.frequency.setValueAtTime(1400, t);
        zap.frequency.exponentialRampToValueAtTime(180, t + 0.5);
        zg.gain.setValueAtTime(0.35, t);
        zg.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        zap.connect(zg); zg.connect(ctx.destination);
        zap.start(t); zap.stop(t + 0.5);
      } else if (type === 'switch_flip') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(620, t);
        osc.frequency.setValueAtTime(880, t + 0.04);
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.09);
      } else if (type === 'purge_hiss') {
        // Atmospheric / static discharge hiss
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(90, t + 0.4);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.45);
      } else if (type === 'power_online') {
        // Ascending harmonic turbine spool-up chime
        [440, 554, 659, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + i * 0.08);
          g.gain.setValueAtTime(0.2, t + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.35);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(t + i * 0.08); osc.stop(t + i * 0.08 + 0.35);
        });
      }
    } catch (_) {}
  }

  // ── Visual Overload Elements ──
  // Emergency Red Cockpit Strobe Light
  const emergencyLight = new T.PointLight(0xff1122, 0, 4.5, 1.8);
  emergencyLight.position.set(0, 0.75, -0.10);
  root.add(emergencyLight);

  // Electrical arc mesh planes floating over canopy
  const arcMat = new T.MeshBasicMaterial({
    color: 0x88ddff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: T.AdditiveBlending,
    side: T.DoubleSide
  });
  const arcGeo = new T.PlaneGeometry(0.55, 0.35);
  const arcMesh = new T.Mesh(arcGeo, arcMat);
  arcMesh.position.set(0, 0.45, -0.32);
  arcMesh.rotation.x = -0.35;
  root.add(arcMesh);

  // ── Interactive Cockpit Reboot Console Bench ──
  // Mounted on lower left dash console (x = -0.38, y = 0.26, z = -0.38)
  const rebootConsole = new T.Group();
  rebootConsole.position.set(-0.36, 0.28, -0.42);
  rebootConsole.rotation.set(-0.25, 0.42, 0);
  root.add(rebootConsole);

  // Base Plate
  const plateGeo = new T.BoxGeometry(0.16, 0.08, 0.015);
  const plateMat = new T.MeshStandardMaterial({ color: 0x091420, metalness: 0.8, roughness: 0.3 });
  const plate = new T.Mesh(plateGeo, plateMat);
  rebootConsole.add(plate);

  // Breaker Switch (Aux Battery)
  const swGeo = new T.BoxGeometry(0.024, 0.038, 0.02);
  const swMat = new T.MeshStandardMaterial({ color: 0xff3344, emissive: 0x440011, emissiveIntensity: 0.8 });
  const swMesh = new T.Mesh(swGeo, swMat);
  swMesh.position.set(-0.048, 0, 0.014);
  rebootConsole.add(swMesh);

  // Static Bleed Valve Toggle
  const valveGeo = new T.CylinderGeometry(0.014, 0.014, 0.03, 12);
  const valveMat = new T.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x332200, emissiveIntensity: 0.8 });
  const valveMesh = new T.Mesh(valveGeo, valveMat);
  valveMesh.position.set(0, 0, 0.014);
  valveMesh.rotation.x = Math.PI / 2;
  rebootConsole.add(valveMesh);

  // Main Ignition Lever
  const ignGeo = new T.BoxGeometry(0.028, 0.042, 0.02);
  const ignMat = new T.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x002233, emissiveIntensity: 0.8 });
  const ignMesh = new T.Mesh(ignGeo, ignMat);
  ignMesh.position.set(0.048, 0, 0.014);
  rebootConsole.add(ignMesh);

  // Status Indicator LED Strip
  const ledMat = new T.MeshBasicMaterial({ color: 0x33ff88, toneMapped: false });
  const ledMesh = new T.Mesh(new T.BoxGeometry(0.14, 0.008, 0.005), ledMat);
  ledMesh.position.set(0, 0.030, 0.012);
  rebootConsole.add(ledMesh);

  // State
  const state = {
    isBlackout: false,
    severity: 'none',
    needExteriorEva: false,
    auxBreaker: true,
    staticPurge: true,
    coreIgnition: true,
    exteriorFuse: true,
    blackoutTimer: 0
  };

  function updateVisuals() {
    if (state.isBlackout) {
      swMat.color.setHex(state.auxBreaker ? 0x33ff88 : 0xff2233);
      swMat.emissive.setHex(state.auxBreaker ? 0x004411 : 0x440011);

      valveMat.color.setHex(state.staticPurge ? 0x33ff88 : 0xffaa00);
      valveMat.emissive.setHex(state.staticPurge ? 0x004411 : 0x442200);

      ignMat.color.setHex(state.coreIgnition ? 0x33ff88 : 0x00aacc);
      ignMat.emissive.setHex(state.coreIgnition ? 0x004411 : 0x002233);

      ledMat.color.setHex(state.needExteriorEva ? 0xff0033 : 0xffaa00);
    } else {
      swMat.color.setHex(0x33ff88);
      valveMat.color.setHex(0x00e5ff);
      ignMat.color.setHex(0x33ff88);
      ledMat.color.setHex(0x00ffcc);
      emergencyLight.intensity = 0;
      arcMat.opacity = 0;
    }
  }

  // ── Trigger EMP / Ion Overload ──
  function triggerEMP(opts = {}) {
    const sev = opts.severity || 'light';
    state.isBlackout = true;
    state.severity = sev;
    state.auxBreaker = false;
    state.staticPurge = false;
    state.coreIgnition = false;
    state.needExteriorEva = (sev === 'critical');
    state.exteriorFuse = (sev !== 'critical');
    state.blackoutTimer = 0;

    // Shut down ship flight throttle
    if (typeof window.throttlePct !== 'undefined') window.throttlePct = 0;
    window.isBlackoutActive = true;

    playSound('emp_blast');
    updateVisuals();

    const toastMsg = state.needExteriorEva
      ? '⚡ CRITICAL EMP CASCADE! FUSE BLOWN · EVA REBOOT REQUIRED!'
      : '⚡ ION CASCADE OVERLOAD! SYSTEMS SHUT DOWN · EXECUTE REBOOT!';
    window.showToast?.(toastMsg, 3500, '#ff3344');
  }

  // ── Reboot Actions ──
  function flipAuxBreaker() {
    if (!state.isBlackout) return;
    state.auxBreaker = !state.auxBreaker;
    playSound('switch_flip');
    updateVisuals();
    window.showToast?.(state.auxBreaker ? '✓ AUXILIARY BATTERY: ONLINE' : 'AUXILIARY BATTERY: OFF', 1800, state.auxBreaker ? '#33ff99' : '#ffaa00');
    checkRebootReady();
  }

  function pullStaticPurge() {
    if (!state.isBlackout) return;
    if (!state.auxBreaker) {
      window.showToast?.('⚠ TRIP: AUX BATTERY MUST BE ONLINE FIRST', 2000, '#ffaa00');
      return;
    }
    state.staticPurge = true;
    playSound('purge_hiss');
    updateVisuals();
    window.showToast?.('✓ STATIC DISCHARGE PURGED: ACCUMULATOR ZEROED', 2000, '#33ff99');
    checkRebootReady();
  }

  function crankIgnition() {
    if (!state.isBlackout) return;
    if (!state.auxBreaker || !state.staticPurge) {
      window.showToast?.('⚠ TRIP: COMPLETE AUX & PURGE STEPS FIRST', 2000, '#ffaa00');
      return;
    }
    if (state.needExteriorEva && !state.exteriorFuse) {
      window.showToast?.('⚠ BLOWN FUSE: MAIN JUNCTION DEAD · POP CANOPY FOR EVA REPAIR!', 2800, '#ff3344');
      return;
    }
    state.coreIgnition = true;
    updateVisuals();
    restorePower();
  }

  function restorePower() {
    state.isBlackout = false;
    state.severity = 'none';
    state.needExteriorEva = false;
    state.auxBreaker = true;
    state.staticPurge = true;
    state.coreIgnition = true;
    state.exteriorFuse = true;
    window.isBlackoutActive = false;

    playSound('power_online');
    updateVisuals();

    window.showToast?.('✨ COLD-BOOT COMPLETE: STARFIGHTER ONLINE & READY!', 3500, '#00ffcc');
  }

  function repairExteriorFuse() {
    state.exteriorFuse = true;
    state.needExteriorEva = false;
    playSound('switch_flip');
    updateVisuals();
    window.showToast?.('✓ EXTERIOR JUNCTION FUSE RESET! BOARD COCKPIT TO IGNITE', 3000, '#33ff99');
  }

  function checkRebootReady() {
    if (state.auxBreaker && state.staticPurge && state.exteriorFuse) {
      window.showToast?.('⚡ READY: CRANK MAIN IGNITION LEVER TO POWER UP', 2200, '#00e5ff');
    }
  }

  // Register cockpit touch/click buttons
  if (typeof window.registerCockpitButton === 'function') {
    window.registerCockpitButton(swMesh, 'AUX BREAKER', flipAuxBreaker, 0.035);
    window.registerCockpitButton(valveMesh, 'ION PURGE', pullStaticPurge, 0.035);
    window.registerCockpitButton(ignMesh, 'MAIN IGNITION', crankIgnition, 0.035);
  }

  // ── Frame Tick ──
  function frame(dt = 0.016) {
    if (state.isBlackout) {
      state.blackoutTimer += dt;
      // Pulse emergency crimson beacon
      const strobe = Math.sin(state.blackoutTimer * 7.5);
      emergencyLight.intensity = (strobe > 0.2) ? 2.4 : 0.1;

      // Occasional canopy arc spark
      if (Math.random() < 0.12) {
        arcMat.opacity = Math.random() * 0.45;
        arcMesh.rotation.z = Math.random() * Math.PI;
      } else {
        arcMat.opacity = Math.max(0, arcMat.opacity - dt * 4.0);
      }
    }
  }

  // Hook into tick
  if (typeof nova.onTick === 'function') {
    nova.onTick(frame);
  }

  // Exports
  const api = {
    triggerEMP,
    restorePower,
    flipAuxBreaker,
    pullStaticPurge,
    crankIgnition,
    repairExteriorFuse,
    frame,
    get isBlackout() { return state.isBlackout; },
    get needExteriorEva() { return state.needExteriorEva; },
    state: () => ({ ...state })
  };

  window.novaIonEmp = api;
  window.novaTest = Object.assign(window.novaTest || {}, {
    emp: (critical = false) => { triggerEMP({ severity: critical ? 'critical' : 'light' }); return state; },
    reboot: () => { restorePower(); return state; }
  });

  return api;
}
