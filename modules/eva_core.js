/**
 * Zero-G EVA Spacewalk & Quest 3 Mixed Reality Passthrough Module
 * Supports vacuum floating, 6DOF cold-gas hand thrusters, umbilical safety tether,
 * Quest 3 color passthrough (walking around your starfighter in your living room),
 * and exterior hull maintenance repair.
 */
export function init(nova = {}) {
  const T = nova.THREE || (typeof window !== 'undefined' ? window.THREE : null);
  const scene = nova.scene || (typeof window !== 'undefined' ? window.scene : null);
  const camera = nova.camera || (typeof window !== 'undefined' ? window.camera : null);
  const cameraRig = nova.cameraRig || (typeof window !== 'undefined' ? window.cameraRig : null);
  const shipGroup = nova.shipGroup || (typeof window !== 'undefined' ? window.shipGroup : null);
  const renderer = nova.renderer || (typeof window !== 'undefined' ? window.renderer : null);

  if (!T || !scene || !camera || !cameraRig || !shipGroup) {
    console.warn('[eva_core] prerequisites missing, standing by');
    return { ready: false };
  }

  const root = new T.Group();
  root.name = 'NOVA_EVA_SYSTEM';
  scene.add(root);

  // ── State ──
  const S = {
    active: false,
    passthrough: false,
    prevParent: null,
    prevRigPos: new T.Vector3(),
    prevRigQ: new T.Quaternion(),
    prevSceneBg: null,
    vel: new T.Vector3(),
    pos: new T.Vector3(),
    tetherLength: 26.0,
    isReeling: false,
    t: 0,
    leftThrustHeld: false,
    rightThrustHeld: false,
    lastThrustPuff: 0,
    hatchPos: new T.Vector3(0, 0.82, -0.15)
  };

  // ── Audio Synthesizer for Cold-Gas RCS Thrusters & Decompression ──
  function playSound(type) {
    try {
      const ctx = window.sound?.ctx;
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      if (type === 'canopy_hiss') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.65);
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.7);
      } else if (type === 'rcs_puff') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(340, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
        g.gain.setValueAtTime(0.28, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.09);
      } else if (type === 'canopy_seal') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.setValueAtTime(480, t + 0.06);
        g.gain.setValueAtTime(0.45, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.18);
      }
    } catch (_) {}
  }

  // ── Exterior Maintenance Junction Panel on Starboard Hull ──
  // Mounted on outer right ship hull (x = 0.74, y = 0.32, z = -0.45)
  const maintJunction = new T.Group();
  maintJunction.name = 'NOVA_MAINT_JUNCTION';
  maintJunction.position.set(0.74, 0.32, -0.45);
  maintJunction.rotation.set(0, -Math.PI / 2, 0);
  shipGroup.add(maintJunction);

  // Junction Bezel Frame
  const jFrameMat = new T.MeshStandardMaterial({ color: 0x162230, metalness: 0.85, roughness: 0.3 });
  const jFrame = new T.Mesh(new T.BoxGeometry(0.24, 0.20, 0.03), jFrameMat);
  maintJunction.add(jFrame);

  // Hinged Door
  const jDoorPivot = new T.Group();
  jDoorPivot.position.set(-0.12, 0, 0.016);
  maintJunction.add(jDoorPivot);

  const jDoorMat = new T.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.7, roughness: 0.4 });
  const jDoor = new T.Mesh(new T.BoxGeometry(0.23, 0.19, 0.01), jDoorMat);
  jDoor.position.set(0.115, 0, 0);
  jDoorPivot.add(jDoor);

  // High Voltage Ion Fuse / Breaker inside junction
  const fuseMat = new T.MeshStandardMaterial({ color: 0xff2244, emissive: 0x660011, emissiveIntensity: 1.2 });
  const fuseMesh = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 0.09, 16), fuseMat);
  fuseMesh.rotation.z = Math.PI / 2;
  fuseMesh.position.set(0, 0, -0.004);
  maintJunction.add(fuseMesh);

  // Indicator LED on junction
  const jLedMat = new T.MeshBasicMaterial({ color: 0xff2244, toneMapped: false });
  const jLed = new T.Mesh(new T.SphereGeometry(0.012, 8, 8), jLedMat);
  jLed.position.set(0.08, 0.07, 0.018);
  maintJunction.add(jLed);

  let isJunctionOpen = false;
  function toggleJunctionDoor() {
    isJunctionOpen = !isJunctionOpen;
    jDoorPivot.rotation.y = isJunctionOpen ? -Math.PI * 0.72 : 0;
    playSound('rcs_puff');
    window.showToast?.(isJunctionOpen ? '🔧 MAINTENANCE HATCH OPEN' : '🔧 MAINTENANCE HATCH CLOSED', 1800, '#ffaa00');
  }

  function interactFuse() {
    fuseMat.color.setHex(0x00ffcc);
    fuseMat.emissive.setHex(0x004433);
    jLedMat.color.setHex(0x00ffcc);
    playSound('rcs_puff');
    if (typeof window.novaIonEmp?.repairExteriorFuse === 'function') {
      window.novaIonEmp.repairExteriorFuse();
    } else {
      window.showToast?.('✓ MAIN JUNCTION FUSE RESET & RESTORED!', 2500, '#00ffcc');
    }
  }

  if (typeof window.registerCockpitButton === 'function') {
    window.registerCockpitButton(jDoor, 'HULL HATCH', toggleJunctionDoor, 0.12);
    window.registerCockpitButton(fuseMesh, 'RESET FUSE', interactFuse, 0.08);
  }

  // ── Safety Umbilical Tether (Glowing Braided Cable) ──
  const tetherPoints = [new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3()];
  const tetherCurve = new T.CatmullRomCurve3(tetherPoints);
  const tetherGeo = new T.TubeGeometry(tetherCurve, 20, 0.008, 6, false);
  const tetherMat = new T.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.65,
    wireframe: true,
    toneMapped: false
  });
  const tetherMesh = new T.Mesh(tetherGeo, tetherMat);
  tetherMesh.visible = false;
  root.add(tetherMesh);

  // ── Cold-Gas RCS Hand Jet Thruster Visuals ──
  const rcsVfxGeo = new T.ConeGeometry(0.035, 0.14, 8);
  const rcsVfxMat = new T.MeshBasicMaterial({
    color: 0xcfefff,
    transparent: true,
    opacity: 0.75,
    blending: T.AdditiveBlending,
    depthWrite: false
  });
  const leftRcsCone = new T.Mesh(rcsVfxGeo, rcsVfxMat);
  const rightRcsCone = new T.Mesh(rcsVfxGeo, rcsVfxMat);
  leftRcsCone.visible = false;
  rightRcsCone.visible = false;
  root.add(leftRcsCone, rightRcsCone);

  // ── Wrist Smartwatch EVA HUD Controls ──
  const evaWristCanvas = document.createElement('canvas');
  evaWristCanvas.width = 512;
  evaWristCanvas.height = 256;
  const evaWristCtx = evaWristCanvas.getContext('2d');
  const evaWristTex = new T.CanvasTexture(evaWristCanvas);

  const evaWristMesh = new T.Mesh(
    new T.PlaneGeometry(0.09, 0.045),
    new T.MeshBasicMaterial({ map: evaWristTex, transparent: true, toneMapped: false, side: T.DoubleSide })
  );
  evaWristMesh.visible = false;
  root.add(evaWristMesh);

  function drawWristHud() {
    const x = evaWristCtx, w = 512, h = 256;
    x.clearRect(0, 0, w, h);
    x.fillStyle = 'rgba(2, 14, 26, 0.9)';
    x.fillRect(0, 0, w, h);
    x.strokeStyle = '#00f0ff';
    x.lineWidth = 4;
    x.strokeRect(4, 4, w - 8, h - 8);

    // Header
    x.fillStyle = '#00f0ff';
    x.font = 'bold 26px monospace';
    x.fillText('EVA SUIT · ZERO-G', 20, 38);

    // Tether dist
    const dist = S.pos.length();
    x.fillStyle = dist > 20 ? '#ff3344' : '#ffffff';
    x.font = 'bold 22px monospace';
    x.fillText(`TETHER: ${dist.toFixed(1)}m / ${S.tetherLength}m`, 20, 80);

    // Mode Buttons
    // Left Tile: [ 🌐 MR PASSTHROUGH ]
    x.fillStyle = S.passthrough ? 'rgba(0, 255, 204, 0.3)' : 'rgba(20, 40, 60, 0.6)';
    x.fillRect(20, 110, 220, 120);
    x.strokeStyle = S.passthrough ? '#00ffcc' : '#446688';
    x.lineWidth = 3;
    x.strokeRect(20, 110, 220, 120);
    x.fillStyle = S.passthrough ? '#00ffcc' : '#88aacc';
    x.font = 'bold 22px monospace';
    x.textAlign = 'center';
    x.fillText('🌐 PASSTHROUGH', 130, 160);
    x.font = '16px monospace';
    x.fillText(S.passthrough ? '[ ACTIVE ]' : '[ SPACE ]', 130, 195);

    // Right Tile: [ ⚓ REEL / INGRESS ]
    const nearHatch = dist < 2.0;
    x.fillStyle = nearHatch ? 'rgba(51, 255, 153, 0.35)' : 'rgba(0, 180, 255, 0.25)';
    x.fillRect(272, 110, 220, 120);
    x.strokeStyle = nearHatch ? '#33ff99' : '#00e5ff';
    x.lineWidth = 3;
    x.strokeRect(272, 110, 220, 120);
    x.fillStyle = nearHatch ? '#33ff99' : '#00e5ff';
    x.fillText(nearHatch ? '🚀 BOARD COCKPIT' : '⚓ REEL TETHER', 382, 160);
    x.font = '16px monospace';
    x.fillText(nearHatch ? '[ INGRESS ]' : '[ RETURN ]', 382, 195);
    x.textAlign = 'left';

    evaWristTex.needsUpdate = true;
  }

  // ── Enter Zero-G Spacewalk ──
  function enterEVA(opts = {}) {
    if (S.active) return true;
    S.active = true;
    window.novaIsEvaActive = true;

    // Pop open canopy
    playSound('canopy_hiss');
    if (typeof window.novaToggleCanopy === 'function') {
      window.novaToggleCanopy(true);
    }

    // Detach cameraRig from cockpit chair to free floating space body
    S.prevParent = cameraRig.parent;
    S.prevRigPos.copy(cameraRig.position);
    S.prevRigQ.copy(cameraRig.quaternion);

    // Anchor player floating 1.2m above canopy
    S.pos.set(0, 1.45, -0.15);
    S.vel.set(0, 0, 0);

    // Attach to shipGroup so if ship drifts or is in orbit, player moves with it
    shipGroup.add(cameraRig);
    cameraRig.position.copy(S.pos);

    // Passthrough handling
    if (opts.passthrough) {
      togglePassthrough(true);
    }

    tetherMesh.visible = true;
    evaWristMesh.visible = true;
    drawWristHud();

    window.showToast?.('👨‍🚀 ZERO-G EVA ACTIVE: SQUEEZE HANDS FOR THRUSTERS', 3500, '#00f0ff');
    return true;
  }

  // ── Return to Cockpit (Ingress) ──
  function exitEVA() {
    if (!S.active) return false;
    S.active = false;
    window.novaIsEvaActive = false;

    // Restore background if passthrough was on
    if (S.passthrough) {
      togglePassthrough(false);
    }

    // Smoothly reseat into cockpit chair
    (S.prevParent || shipGroup).add(cameraRig);
    cameraRig.position.set(0, 0.66, -0.02);
    cameraRig.quaternion.identity();

    tetherMesh.visible = false;
    evaWristMesh.visible = false;
    leftRcsCone.visible = false;
    rightRcsCone.visible = false;

    // Close canopy
    playSound('canopy_seal');
    if (typeof window.novaToggleCanopy === 'function') {
      window.novaToggleCanopy(false);
    }

    window.recenterPilotView?.(true);
    window.showToast?.('🚀 INGRESS COMPLETE · SEATED IN COCKPIT CHAIR', 2500, '#00ff88');
    return true;
  }

  // ── Quest 3 Mixed Reality Passthrough Toggle ──
  function togglePassthrough(force) {
    S.passthrough = (typeof force === 'boolean') ? force : !S.passthrough;
    window.isPassthroughActive = S.passthrough;

    if (S.passthrough) {
      S.prevSceneBg = scene.background;
      scene.background = null;
      if (renderer) renderer.setClearColor(0x000000, 0);
      window.showToast?.('🌐 QUEST 3 PASSTHROUGH ACTIVE · ROOM MIXED WITH STARFIGHTER', 3000, '#00ffcc');
    } else {
      if (S.prevSceneBg) scene.background = S.prevSceneBg;
      else scene.background = new T.Color(0x060e18);
      if (renderer) renderer.setClearColor(0x060e18, 1);
      window.showToast?.('🌌 SPACE VACUUM RESTORED', 2000, '#00e5ff');
    }
    drawWristHud();
    return S.passthrough;
  }

  // ── Auto-Reel Tether ──
  function reelTether() {
    S.isReeling = true;
    playSound('rcs_puff');
    window.showToast?.('⚓ REELING UMBILICAL TETHER...', 1500, '#00f0ff');
  }

  // ── Frame Tick ──
  const fwd = new T.Vector3(), rightVec = new T.Vector3(), upVec = new T.Vector3();
  const wristWorldPos = new T.Vector3();

  function frame(dt = 0.016) {
    if (!S.active) return;
    S.t += dt;

    // 1. Process XR / Desktop Inputs for Hand RCS
    let thrustX = 0, thrustY = 0, thrustZ = 0;
    const ses = renderer?.xr?.getSession?.();
    const sources = ses ? Array.from(ses.inputSources || []) : [];

    let leftGripDown = false, rightGripDown = false;
    sources.forEach(src => {
      const gp = src.gamepad;
      if (!gp) return;
      const trig = (gp.buttons?.[0]?.value > 0.4 || gp.buttons?.[0]?.pressed);
      const grip = (gp.buttons?.[1]?.value > 0.4 || gp.buttons?.[1]?.pressed);
      if (src.handedness === 'left' && (trig || grip)) leftGripDown = true;
      if (src.handedness === 'right' && (trig || grip)) rightGripDown = true;
    });

    camera.getWorldDirection(fwd);
    rightVec.crossVectors(fwd, camera.up).normalize();
    upVec.crossVectors(rightVec, fwd).normalize();

    // Cold-gas forward puff on left grip, vertical puff on right grip
    if (leftGripDown) {
      thrustZ += 1.0;
      leftRcsCone.visible = true;
    } else {
      leftRcsCone.visible = false;
    }

    if (rightGripDown) {
      thrustY += 1.0;
      rightRcsCone.visible = true;
    } else {
      rightRcsCone.visible = false;
    }

    // Keyboard support (WASD + Space / Shift)
    const down = (typeof window !== 'undefined' && window.down) ? window.down : new Set();
    if (down.has?.('KeyW')) thrustZ += 1.0;
    if (down.has?.('KeyS')) thrustZ -= 1.0;
    if (down.has?.('KeyA')) thrustX -= 1.0;
    if (down.has?.('KeyD')) thrustX += 1.0;
    if (down.has?.('Space')) thrustY += 1.0;
    if (down.has?.('ShiftLeft') || down.has?.('KeyC')) thrustY -= 1.0;

    // Thruster Audio Chuff
    const isThrusting = (thrustX !== 0 || thrustY !== 0 || thrustZ !== 0);
    if (isThrusting && (performance.now() - S.lastThrustPuff > 180)) {
      S.lastThrustPuff = performance.now();
      playSound('rcs_puff');
    }

    // Accelerate zero-g velocity
    const accel = 2.8;
    if (thrustZ !== 0) S.vel.addScaledVector(fwd, thrustZ * accel * dt);
    if (thrustX !== 0) S.vel.addScaledVector(rightVec, thrustX * accel * dt);
    if (thrustY !== 0) S.vel.addScaledVector(upVec, thrustY * accel * dt);

    // Auto-reeling pull
    if (S.isReeling) {
      const toHatch = S.hatchPos.clone().sub(S.pos);
      const d = toHatch.length();
      if (d > 0.3) {
        S.vel.addScaledVector(toHatch.normalize(), 4.5 * dt);
      } else {
        S.isReeling = false;
        S.vel.multiplyScalar(0.2);
        if (d < 1.8) {
          exitEVA();
          return;
        }
      }
    }

    // Exponential drag dampening in vacuum
    S.vel.multiplyScalar(Math.exp(-dt * 0.85));
    S.pos.addScaledVector(S.vel, dt);

    // Tether elastic limit (max 26 meters)
    const tetherDist = S.pos.length();
    if (tetherDist > S.tetherLength) {
      const pullDir = S.pos.clone().negate().normalize();
      const excess = tetherDist - S.tetherLength;
      S.vel.addScaledVector(pullDir, excess * 4.0 * dt);
      S.pos.normalize().multiplyScalar(S.tetherLength);
    }

    cameraRig.position.copy(S.pos);

    // 2. Update Safety Tether Spline
    if (tetherMesh.visible) {
      tetherPoints[0].copy(S.hatchPos);
      tetherPoints[3].copy(S.pos).add(new T.Vector3(0, -0.2, 0));
      // Sag / bow curve in zero-g
      tetherPoints[1].copy(tetherPoints[0]).lerp(tetherPoints[3], 0.33).add(new T.Vector3(0, -0.15, 0));
      tetherPoints[2].copy(tetherPoints[0]).lerp(tetherPoints[3], 0.66).add(new T.Vector3(0, -0.25, 0));
      tetherCurve.points = tetherPoints;
      tetherMesh.geometry.dispose();
      tetherMesh.geometry = new T.TubeGeometry(tetherCurve, 16, 0.007, 6, false);
    }

    // 3. Wrist HUD tracking on left arm
    if (evaWristMesh.visible) {
      camera.getWorldPosition(wristWorldPos);
      evaWristMesh.position.copy(wristWorldPos).addScaledVector(fwd, 0.42).addScaledVector(rightVec, -0.22).addScaledVector(upVec, -0.16);
      evaWristMesh.quaternion.copy(camera.quaternion);
      if (Math.random() < 0.15) drawWristHud();
    }
  }

  // Hook into tick
  if (typeof nova.onTick === 'function') {
    nova.onTick(frame);
  }

  // Hotkey: KeyP for Passthrough, KeyX / KeyR for EVA
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code === 'KeyP' && S.active) togglePassthrough();
    if (e.code === 'KeyR' && S.active) reelTether();
  });

  const api = {
    enter: enterEVA,
    exit: exitEVA,
    togglePassthrough,
    reelTether,
    frame,
    get active() { return S.active; },
    get passthrough() { return S.passthrough; },
    state: () => ({ ...S, pos: S.pos.toArray(), vel: S.vel.toArray() })
  };

  window.novaEva = api;
  window.novaTest = Object.assign(window.novaTest || {}, {
    evaEnter: (pt = false) => enterEVA({ passthrough: pt }),
    evaExit: () => exitEVA(),
    evaPassthrough: (f) => togglePassthrough(f),
    evaReel: () => reelTether()
  });

  return api;
}
