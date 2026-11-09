// Project Nova: Piracy, Police Enforcers & Station Impound (Phase 1)
// Clean modular implementation with zero external dependencies.

export function init(nova) {
  const T = typeof window !== 'undefined' ? (window.THREE || nova.THREE) : null;
  if (!T) return { ready: false };

  const scene = nova.scene || window.scene;
  const shipGroup = nova.shipGroup || window.shipGroup;
  const shipBody = nova.shipBody || window.shipBody;

  let notoriety = 0;
  let policeTimer = 0;
  let impoundFined = false;
  let isGrounded = false;
  let decayAccum = 0;

  try {
    const saved = localStorage.getItem('nova_notoriety');
    if (saved) notoriety = Math.max(0, parseInt(saved, 10) || 0);
  } catch (_) {}

  function persist() {
    try { localStorage.setItem('nova_notoriety', String(notoriety)); } catch (_) {}
  }

  function addNotoriety(pts = 1, reason = 'PIRACY DETECTED') {
    notoriety = Math.min(5, Math.max(0, notoriety + pts));
    persist();
    if (pts > 0) {
      if (typeof window.novaTriggerRedAlert === 'function') window.novaTriggerRedAlert('POLICE DISPATCH');
      nova.toast?.(`🚨 WANTED LEVEL ${notoriety}★ · ${reason}`, 3000, '#ff2244');
      try { nova.sound?.beep?.(1800, 0.12, 'sawtooth'); } catch (_) {}
    }
  }

  // Active police interceptors pool
  const policeUnits = [];
  const policeMat = new T.MeshStandardMaterial({ color: 0x0a2244, metalness: 0.9, roughness: 0.25 });
  const sirenRedMat = new T.MeshBasicMaterial({ color: 0xff0033 });
  const sirenBlueMat = new T.MeshBasicMaterial({ color: 0x0066ff });

  function spawnPoliceInterceptor() {
    if (policeUnits.length >= 2 || !shipGroup) return;
    const g = new T.Group();
    g.name = 'SYSTEM_POLICE_INTERCEPTOR';
    const hull = new T.Mesh(new T.ConeGeometry(2.2, 8.5, 5), policeMat);
    hull.rotation.x = Math.PI / 2;
    g.add(hull);

    const sL = new T.Mesh(new T.BoxGeometry(0.3, 0.3, 0.8), sirenRedMat);
    sL.position.set(-1.2, 0.8, -1.0);
    const sR = new T.Mesh(new T.BoxGeometry(0.3, 0.3, 0.8), sirenBlueMat);
    sR.position.set(1.2, 0.8, -1.0);
    g.add(sL, sR);

    // Spawn 400m ahead/flank of player
    const spawnPos = shipGroup.position.clone().add(new T.Vector3((Math.random() - 0.5) * 200, 40, -450).applyQuaternion(shipGroup.quaternion));
    g.position.copy(spawnPos);
    g.userData = {
      hp: 120,
      isEnemy: true,
      isHostile: true,
      isPolice: true,
      name: 'POLICE ENFORCER',
      onHit: (dmg) => {
        g.userData.hp -= dmg;
        if (g.userData.hp <= 0) destroyPolice(g);
      }
    };
    scene.add(g);
    policeUnits.push({ group: g, sL, sR, fireTimer: 1.0 });
    nova.toast?.('🚨 SYSTEM POLICE PATROL INTERCEPTING!', 3000, '#00d0ff');
  }

  function destroyPolice(g) {
    const idx = policeUnits.findIndex(p => p.group === g);
    if (idx >= 0) policeUnits.splice(idx, 1);
    scene.remove(g);
    try { nova.sound?.explosion?.(); } catch (_) {}
    nova.toast?.('💥 POLICE INTERCEPTOR NEUTRALIZED', 2500, '#ff8800');
  }

  // Frame tick: update notoriety decay, police sirens & dogfight pursuit
  function frame(delta) {
    if (!shipGroup) return;

    // Decay notoriety: 1 point every 100 seconds clean
    if (notoriety > 0) {
      decayAccum += delta;
      if (decayAccum >= 100) {
        decayAccum = 0;
        notoriety = Math.max(0, notoriety - 1);
        persist();
        nova.toast?.(`🛡️ POLICE HEAT SUBSIDING · WANTED ${notoriety}★`, 2400, '#00ffcc');
      }
    }

    // Spawn police when notoriety >= 2
    if (notoriety >= 2 && policeUnits.length === 0) {
      policeTimer += delta;
      if (policeTimer > 6.0) {
        policeTimer = 0;
        spawnPoliceInterceptor();
      }
    }

    // Update active police ships
    const now = performance.now();
    for (let i = policeUnits.length - 1; i >= 0; i--) {
      const p = policeUnits[i];
      const g = p.group;
      const flash = Math.sin(now * 0.015) > 0;
      p.sL.visible = flash;
      p.sR.visible = !flash;

      // Pursue player ship
      const toPlayer = shipGroup.position.clone().sub(g.position);
      const dist = toPlayer.length();
      if (dist > 2500) {
        scene.remove(g);
        policeUnits.splice(i, 1);
        continue;
      }

      g.quaternion.slerp(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, -1), toPlayer.clone().normalize()), 3.0 * delta);
      if (dist > 85) {
        g.position.addScaledVector(toPlayer.clone().normalize(), 85 * delta);
      }

      // Police warning / EMP disruptor laser fire
      p.fireTimer -= delta;
      if (p.fireTimer <= 0 && dist < 450) {
        p.fireTimer = 2.4;
        try { nova.sound?.laser?.(); } catch (_) {}
        if (typeof window.novaDamageShip === 'function') {
          window.novaDamageShip(12);
          nova.toast?.('⚡ POLICE EMP SHIELD DISRUPTOR HIT!', 1800, '#00e5ff');
        }
      }
    }
  }

  // Hook into friendly fire / piracy
  if (typeof window !== 'undefined') {
    window.novaRecordPiracy = function(targetName = 'CARGO HAULER') {
      addNotoriety(2, `PIRACY: FIRED ON ${targetName.toUpperCase()}`);
    };

    window.novaCheckImpound = function() {
      if (notoriety > 0) {
        isGrounded = true;
        const fine = notoriety * 1500;
        return { grounded: true, notoriety, fine };
      }
      isGrounded = false;
      return { grounded: false, notoriety: 0, fine: 0 };
    };

    window.novaPayImpoundFine = function() {
      const fine = notoriety * 1500;
      const credits = window.bankCredits || 0;
      if (credits >= fine) {
        if (typeof window.bankCredits === 'number') window.bankCredits -= fine;
        notoriety = 0;
        persist();
        isGrounded = false;
        nova.toast?.(`⚖️ IMPOUND FINE PAID: -${fine} CR · FLIGHT CLEARED!`, 3200, '#00ff88');
        try { nova.sound?.cash?.(); } catch (_) {}
        return true;
      } else {
        nova.toast?.(`⚠️ INSUFFICIENT CREDITS! NEED ${fine} CR TO CLEAR IMPOUND`, 2800, '#ff4444');
        return false;
      }
    };
  }

  return {
    ready: true,
    frame,
    addNotoriety,
    get notoriety() { return notoriety; },
    get isGrounded() { return isGrounded; },
    clearNotoriety: () => { notoriety = 0; persist(); isGrounded = false; }
  };
}
