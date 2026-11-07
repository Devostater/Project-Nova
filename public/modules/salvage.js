// Salvage pods: shared low-cost geometry, capped at eight live drops.
export function init(nova) {
  const { THREE, scene, shipGroup } = nova;
  const pods = [];
  const contactList = [];
  const podGeometry = new THREE.IcosahedronGeometry(1, 0);
  const beaconGeometry = new THREE.SphereGeometry(0.28, 6, 5);
  const ringGeometry = new THREE.TorusGeometry(1.65, 0.045, 5, 16);
  const podMaterial = new THREE.MeshStandardMaterial({ color: 0x76818a, metalness: 0.62, roughness: 0.72 });
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x9aa7b0, transparent: true, opacity: 0.72 });
  const beaconMaterial = new THREE.MeshBasicMaterial({ color: 0xc4d5dc });
  let nextId = 0;
  let clock = 0;

  function notify(message, color = '#aab6bd') {
    try { if (nova.toast) nova.toast(message, color); } catch (e) { }
  }

  function removePod(pod) {
    const pi = pods.indexOf(pod);
    if (pi >= 0) pods.splice(pi, 1);
    const ci = contactList.indexOf(pod.contact);
    if (ci >= 0) contactList.splice(ci, 1);
    scene.remove(pod.group);
    try { if (nova.onRemoved) nova.onRemoved(pod.group); } catch (e) { }
  }

  function rollContents(info) {
    const large = info.boss || info.size >= 80;
    const heatCores = large && Math.random() < (info.boss ? 0.3 : 0.14) ? 1 : 0;
    return {
      salvage: 1,
      ore: Math.random() < (large ? 0.8 : 0.45) ? (large && Math.random() < 0.25 ? 2 : 1) : 0,
      heatCores,
      credits: Math.round(120 + Math.random() * (large ? 680 : 380))
    };
  }

  function makePod(info) {
    const id = ++nextId;
    const group = new THREE.Group();
    group.name = 'NOVA_SALVAGE_POD_' + id;
    group.userData.salvagePod = true;
    group.userData.salvageId = id;
    const body = new THREE.Mesh(podGeometry, podMaterial);
    body.scale.set(1.2, 0.78, 1.45);
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
    beacon.position.y = 1.18;
    group.add(body, ring, beacon);
    group.position.copy(info.position);
    group.position.x += (Math.random() - 0.5) * 12;
    group.position.y += (Math.random() - 0.5) * 8;
    group.position.z += (Math.random() - 0.5) * 12;
    group.userData.radius = 2.4;
    scene.add(group);

    const contact = {
      name: 'SALVAGE POD ' + String(id).padStart(2, '0'),
      type: 'salvage',
      obj: group,
      isHostile: false,
      salvage: true
    };
    const pod = {
      id, group, ring, beacon, contact, contents: rollContents(info), age: 0,
      blink: Math.random() * 6.28, tractorT: 0, tractorDur: 0, tractor: false,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 7),
      start: new THREE.Vector3(),
      source: info.name || info.slug || 'ship'
    };
    if (info.velocity && info.velocity.isVector3) pod.velocity.add(info.velocity.clone().multiplyScalar(0.25));
    pods.push(pod);
    contactList.push(contact);
  }

  function drop(info = {}) {
    const size = Number(info.size) || 0;
    const large = !!info.boss || size >= 80;
    const chance = info.boss ? 1 : large ? 0.6 : 0.25;
    if (Math.random() > chance) return 0;

    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      while (pods.length >= 8) removePod(pods[0]);
      makePod(info);
    }
    notify('SALVAGE SIGNAL: ' + count + ' pod' + (count === 1 ? '' : 's') + ' released.', '#aab6bd');
    return count;
  }

  function contacts() {
    return contactList;
  }

  function tractor(target) {
    const obj = target && (target.targetObj || target.obj);
    const pod = pods.find(p => p.group === obj && !p.tractor);
    if (!pod) { notify('SELECT A SALVAGE POD ON COMMS OR RADAR FIRST.', '#aab6bd'); return false; }
    const distance = pod.group.position.distanceTo(shipGroup.position);
    if (distance > 500) {
      notify('TRACTOR RANGE 500 M · MOVE CLOSER (' + Math.round(distance) + ' M).', '#ffaa55');
      return false;
    }
    if (nova.canCollect && !nova.canCollect(pod.contents)) {
      notify('CARGO HOLD FULL · CLEAR SPACE BEFORE TRACTORING.', '#ffaa55');
      return false;
    }
    pod.tractor = true;
    pod.start.copy(pod.group.position);
    pod.tractorT = 0;
    pod.tractorDur = THREE.MathUtils.clamp(2 + distance / 500, 2, 3);
    try { if (nova.beep) nova.beep(); } catch (e) { }
    notify('TRACTOR LOCK · PULLING SALVAGE POD IN.', '#aab6bd');
    return true;
  }

  function tick(delta) {
    const dt = Math.min(0.05, Math.max(0, Number(delta) || 0));
    clock += dt;
    for (let i = pods.length - 1; i >= 0; i--) {
      const pod = pods[i];
      pod.age += dt;
      pod.ring.rotation.z += dt * 0.24;
      pod.beacon.visible = Math.sin(clock * 4.2 + pod.blink) > -0.18;
      if (pod.tractor) {
        pod.tractorT = Math.min(pod.tractorT + dt, pod.tractorDur);
        const t = pod.tractorT / pod.tractorDur;
        const eased = t * t * (3 - 2 * t);
        pod.group.position.lerpVectors(pod.start, shipGroup.position, eased);
        pod.group.rotation.y += dt * 0.7;
        if (t >= 1 || pod.group.position.distanceTo(shipGroup.position) < 4) {
          if (nova.canCollect && !nova.canCollect(pod.contents)) {
            pod.tractor = false;
            pod.velocity.set(0, 0, 0);
            notify('CARGO HOLD FULL · SALVAGE POD RELEASED.', '#ffaa55');
          } else {
            try { if (nova.collect) nova.collect(pod.contents, pod.source); } catch (e) { }
            const label = pod.contents.heatCores ? ' · HEAT CORE RECOVERED' : '';
            notify('SALVAGE SECURED · +' + pod.contents.salvage + ' CARGO · +' + pod.contents.credits + ' CR' + label, '#aaffdd');
            try { if (nova.beep) nova.beep(); } catch (e) { }
            removePod(pod);
          }
        }
      } else {
        pod.group.position.addScaledVector(pod.velocity, dt);
        pod.velocity.multiplyScalar(Math.max(0, 1 - dt * 0.035));
        pod.group.rotation.y += dt * 0.16;
        pod.group.rotation.x += dt * 0.07;
      }
      if (pod.age >= 120 && pods.includes(pod)) {
        removePod(pod);
        notify('SALVAGE POD LOST · SIGNAL EXPIRED.', '#8b969d');
      }
    }
  }

  return { drop, contacts, tractor, tick };
}
