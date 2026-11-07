/** Cantina-only bartender and lightweight XR grab/throw props. No physics engine. */
export function init(nova) {
  const T = nova.THREE, xr = nova.renderer?.xr, rig = nova.cameraRig;
  const room = window.cantinaGroup;
  if (!T || !xr || !rig || !room) return { ready: false };
  const root = new T.Group(); root.name = 'NOVA_CANTINA_PROPS'; room.add(root);
  const radius = 0.045, height = 0.13, gravity = 9.81;
  const bar = { minX: -2.1, maxX: 2.1, minZ: -4.35, maxZ: -1.85, top: 1.05, model: null };
  const ray = new T.Raycaster(), box = new T.Box3(), point = new T.Vector3();
  const inverse = new T.Quaternion(), rigQ = new T.Quaternion(), spin = new T.Quaternion();
  const axis = new T.Vector3(1, 0.6, 0.3).normalize();
  const sources = new Map();
  let time = 0, wasActive = false, disposed = false, bartender = null, bartenderMixer = null, bartenderAction = null, bartenderAnimTime = 0, bartenderAnimIndex = -1;
  let bartenderClips = [];
  const cupGeo = new T.CylinderGeometry(radius, radius * 0.75, height, 12, 1, true);
  const bottomGeo = new T.CylinderGeometry(radius * 0.75, radius * 0.75, 0.008, 12);
  const shardGeo = new T.TetrahedronGeometry(0.025, 0);
  const colors = [0x66dccc, 0xe5bc81, 0x98c5ed, 0xc9a6dd, 0xd1dfdf];
  const cups = colors.map((color, i) => {
    const material = new T.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.24, side: T.DoubleSide });
    const mesh = new T.Group(); mesh.name = `CANTINA_CUP_${i + 1}`;
    mesh.add(new T.Mesh(cupGeo, material));
    const bottom = new T.Mesh(bottomGeo, material); bottom.position.y = -height / 2 + 0.004; mesh.add(bottom);
    root.add(mesh);
    // Eight shards per cup; five cups means at most forty shards in the room.
    const shardMat = new T.MeshStandardMaterial({ color, transparent: true, depthWrite: false, roughness: 0.4 });
    const shards = new T.InstancedMesh(shardGeo, shardMat, 8); shards.visible = false;
    shards.instanceMatrix.setUsage(T.DynamicDrawUsage); shards.frustumCulled = false; root.add(shards);
    return { mesh, material, shards, shardMat, pieces: Array.from({ length: 8 }, () => ({ p: new T.Vector3(), v: new T.Vector3(), q: new T.Quaternion() })), home: new T.Vector3(), v: new T.Vector3(), holder: null, offset: new T.Vector3(), offsetQ: new T.Quaternion(), state: 'rest', age: 0, shardAge: 0 };
  });
  const dummy = new T.Object3D();
  function surface(x, z) {
    if (!bar.model) return bar.top;
    ray.set(room.localToWorld(new T.Vector3(x, bar.top + 1, z)), new T.Vector3(0, -1, 0).transformDirection(room.matrixWorld));
    // Existing bar meshes intentionally disable picking; use Mesh.raycast directly.
    const hits = [];
    bar.model.traverse(o => { if (o.isMesh) T.Mesh.prototype.raycast.call(o, ray, hits); });
    return hits.length ? Math.max(...hits.map(h => room.worldToLocal(h.point.clone()).y)) : bar.top;
  }
  function reset(c) {
    c.mesh.position.copy(c.home); c.mesh.quaternion.identity(); c.mesh.visible = true;
    c.v.set(0, 0, 0); c.holder = null; c.state = 'rest'; c.age = 0;
  }
  function layout() {
    room.updateWorldMatrix(true, true);
    cups.forEach((c, i) => {
      const x = (i - 2) * 0.61, z = bar.maxZ - 0.22;
      c.home.set(x, surface(x, z) + height / 2 + 0.006, z); reset(c);
    });
    if (bartender) bartender.scale.setScalar(Math.max(1.8, bar.top + 0.6) / bartender.userData.height);
  }
  function findBar() {
    const model = room.children.find(o => o !== root && o.isGroup && Math.abs(o.position.z + 3.1) < 0.01 && Math.abs(o.position.x) < 0.01 && o.children.length);
    if (!model || model === bar.model) return;
    room.updateWorldMatrix(true, true);
    // The current cantina is unrotated; transform the bounds back into room space.
    box.setFromObject(model).applyMatrix4(room.matrixWorld.clone().invert());
    bar.model = model; bar.minX = box.min.x; bar.maxX = box.max.x; bar.minZ = box.min.z; bar.maxZ = box.max.z; bar.top = box.max.y;
    layout();
  }
  function rigKey(name) {
    return String(name || '').toLowerCase().replace(/mixamorig|armature|skeleton|rig|bone/g, '').replace(/[^a-z0-9]/g, '');
  }
  function retargetClip(clip, model) {
    const byKey = new Map(); model.traverse(o => { const key = rigKey(o.name); if (key && !byKey.has(key)) byKey.set(key, o); });
    const tracks = [];
    for (const source of clip.tracks || []) {
      let nodeName = '';
      try { nodeName = T.PropertyBinding.parseTrackName(source.name).nodeName || ''; } catch (_) { nodeName = source.name.slice(0, source.name.lastIndexOf('.')); }
      const leaf = nodeName.split(/[|/:]/).pop(), target = model.getObjectByName(nodeName) || model.getObjectByName(leaf) || byKey.get(rigKey(leaf));
      if (!target?.name) continue;
      const dot = source.name.lastIndexOf('.'); if (dot < 0) continue;
      const track = source.clone(); track.name = target.name + source.name.slice(dot); tracks.push(track);
    }
    return tracks.length ? new T.AnimationClip(clip.name, clip.duration, tracks) : null;
  }
  function playBartenderClip(index) {
    if (!bartenderMixer || !bartenderClips.length) return;
    bartenderAnimIndex = (index + bartenderClips.length) % bartenderClips.length;
    const next = bartenderMixer.clipAction(bartenderClips[bartenderAnimIndex]);
    if (bartenderAction && bartenderAction !== next) bartenderAction.fadeOut(0.45);
    bartenderAction = next.reset().setLoop(T.LoopRepeat, Infinity).fadeIn(0.45); bartenderAction.play();
    bartenderAnimTime = Math.max(7, Math.min(15, bartenderClips[bartenderAnimIndex].duration * 2.5));
  }
  layout();
  const loaded = import(new URL('../vendor/loaders/GLTFLoader.js', import.meta.url).href)
    .then(async ({ GLTFLoader }) => {
      const loader = new GLTFLoader(), alien = await loader.loadAsync(new URL('../models/alien_crew.glb', import.meta.url).href);
      const matrix = await loader.loadAsync(new URL('../models/matrix_character.glb', import.meta.url).href).catch(() => null);
      return { alien, matrix };
    })
    .then(({ alien, matrix }) => {
      if (disposed) return;
      const model = alien.scene; model.updateMatrixWorld(true);
      box.setFromObject(model); const center = box.getCenter(new T.Vector3());
      const modelHeight = Math.max(0.01, box.max.y - box.min.y);
      model.position.add(new T.Vector3(-center.x, -box.min.y, -center.z));
      bartender = new T.Group(); bartender.name = 'CANTINA_TEST_BARTENDER'; bartender.userData.height = modelHeight;
      bartender.add(model); bartender.scale.setScalar(Math.max(1.8, bar.top + 0.6) / modelHeight);
      bartender.position.set(0, 0, bar.minZ - 0.55); // GLB faces +Z, toward the room.
      root.add(bartender);
      if (matrix?.animations?.length) {
        const calm = matrix.animations.filter(a => !/walk|run|jump|attack|combat|death/i.test(a.name));
        const source = (calm.length ? calm : matrix.animations).slice().sort((a, b) => {
          const score = n => /idle/i.test(n) ? 0 : /talk|gesture/i.test(n) ? 1 : /wave|greet/i.test(n) ? 2 : /dance/i.test(n) ? 3 : 4;
          return score(a.name) - score(b.name);
        }).slice(0, 5);
        bartenderClips = source.map(clip => retargetClip(clip, model)).filter(clip => clip && clip.tracks.length >= 3);
        if (bartenderClips.length) { bartenderMixer = new T.AnimationMixer(model); playBartenderClip(0); }
        matrix.scene?.traverse(o => { o.geometry?.dispose?.(); const mats = Array.isArray(o.material) ? o.material : [o.material]; mats.forEach(m => m?.dispose?.()); });
      }
    }).catch(error => console.warn('[cantina_props] Bartender load failed', error));
  function shatter(c) {
    c.state = 'broken'; c.age = 0; c.mesh.visible = false; c.shardAge = 0;
    c.shards.visible = true; c.shardMat.opacity = 1;
    c.pieces.forEach(p => {
      p.p.copy(c.mesh.position); p.p.y = Math.max(0.03, p.p.y);
      p.v.copy(c.v).multiplyScalar(0.22).add(new T.Vector3((Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3));
      p.q.random();
    });
  }
  function release(c, velocity) {
    c.holder = null; c.state = 'flying'; c.age = 0;
    c.v.copy(velocity || point.set(0, 0, 0)).clampLength(0, 12);
  }
  function readSource(src, frame, ref) {
    let state = sources.get(src);
    if (!state) {
      state = { p: new T.Vector3(), q: new T.Quaternion(), pressed: false, valid: false, samples: [], cup: null };
      sources.set(src, state);
    }
    let pose, pressed = false;
    if (src.hand) {
      const index = src.hand.get('index-finger-tip'), thumb = src.hand.get('thumb-tip');
      const a = index && frame.getJointPose(index, ref), b = thumb && frame.getJointPose(thumb, ref);
      if (a && b) {
        pose = a; point.copy(a.transform.position);
        const distance = point.distanceTo(new T.Vector3().copy(b.transform.position));
        pressed = distance < (state.pressed ? 0.045 : 0.028);
        point.lerp(b.transform.position, 0.5);
      }
    } else {
      pose = src.gripSpace && frame.getPose(src.gripSpace, ref);
      if (pose) point.copy(pose.transform.position);
      pressed = !!src.gamepad?.buttons[1]?.pressed;
    }
    if (!pose) {
      if (state.cup) release(state.cup); state.cup = null;
      state.valid = false; state.pressed = false; state.samples.length = 0; return;
    }
    rig.localToWorld(point); root.worldToLocal(point); state.p.copy(point);
    state.q.copy(inverse).multiply(rigQ).multiply(new T.Quaternion().copy(pose.transform.orientation));
    if (!state.valid) state.pressed = pressed; // acquiring tracking while closed cannot grab
    state.valid = true;
    state.samples.push({ t: time, p: state.p.clone() });
    while (state.samples.length > 2 && state.samples[1].t < time - 0.1) state.samples.shift();
    if (pressed && !state.pressed) {
      let nearest = null, distance = 0.13;
      for (const c of cups) if (!c.holder && c.state !== 'broken') {
        const d = c.mesh.position.distanceTo(state.p); if (d < distance) { nearest = c; distance = d; }
      }
      if (nearest) {
        nearest.holder = state; nearest.state = 'held'; state.cup = nearest;
        nearest.offset.copy(nearest.mesh.position).sub(state.p).applyQuaternion(state.q.clone().invert());
        nearest.offsetQ.copy(state.q).invert().multiply(nearest.mesh.quaternion);
      }
    }
    if (state.cup) {
      const c = state.cup;
      c.mesh.position.copy(c.offset).applyQuaternion(state.q).add(state.p); c.mesh.quaternion.copy(state.q).multiply(c.offsetQ);
      if (!pressed) {
        const first = state.samples[0], span = time - first.t;
        const velocity = span > 0.015 ? state.p.clone().sub(first.p).divideScalar(span) : new T.Vector3();
        release(c, velocity); state.cup = null;
      }
    }
    state.pressed = pressed;
  }
  function physics(c, dt) {
    c.age += dt;
    if (c.state === 'broken' || c.age > 8) { if (c.age >= (c.state === 'broken' ? 5 : 8)) reset(c); return; }
    const steps = Math.ceil(dt / (1 / 120)), h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const previousY = c.mesh.position.y;
      c.v.y -= gravity * h; c.mesh.position.addScaledVector(c.v, h);
      const p = c.mesh.position; let hit = false, impact = 0;
      // Analytic floor, room walls and ceiling; substeps prevent fast throws tunnelling.
      for (const [key, lo, hi] of [['x', -18 + radius, 18 - radius], ['z', -18 + radius, 18 - radius], ['y', height / 2, 6.5 - height / 2]]) {
        if (p[key] < lo || p[key] > hi) { impact = Math.max(impact, Math.abs(c.v[key])); p[key] = T.MathUtils.clamp(p[key], lo, hi); c.v[key] *= -0.25; hit = true; }
      }
      if (hit && impact > 2) { shatter(c); break; }
      // Catch gentle drops onto the counter instead of letting cups pass through it.
      if (p.x > bar.minX && p.x < bar.maxX && p.z > bar.minZ && p.z < bar.maxZ && previousY >= bar.top + height / 2 && p.y < bar.top + height / 2) {
        p.y = bar.top + height / 2; c.v.y = Math.abs(c.v.y) * 0.2; hit = true;
      }
      if (hit) { c.v.x *= 0.75; c.v.z *= 0.75; }
      spin.setFromAxisAngle(axis, h * c.v.length() * 2); c.mesh.quaternion.premultiply(spin);
    }
  }
  function tick(delta) {
    const dt = Math.min(0.05, Math.max(0, Number(delta) || 0)); if (!dt || disposed) return;
    time += dt; findBar();
    const active = room.visible && !!window.isInsideCantina?.();
    root.visible = active;
    if (!active) {
      if (wasActive) { cups.forEach(reset); sources.clear(); cups.forEach(c => { c.shards.visible = false; }); }
      wasActive = false; return;
    }
    wasActive = true;
    if (bartender) {
      bartender.position.set(0, Math.sin(time * 0.8) * 0.012, bar.minZ - 0.55); bartender.rotation.y = Math.sin(time * 0.35) * 0.1;
      if (bartenderMixer) { bartenderMixer.update(dt); bartenderAnimTime -= dt; if (bartenderAnimTime <= 0 && bartenderClips.length > 1) playBartenderClip(bartenderAnimIndex + 1); }
    }
    rig.updateWorldMatrix(true, true); root.updateWorldMatrix(true, true);
    inverse.copy(root.getWorldQuaternion(new T.Quaternion())).invert(); rig.getWorldQuaternion(rigQ);
    const session = xr.getSession(), frame = xr.getFrame?.(), ref = xr.getReferenceSpace();
    const live = new Set(session && frame && ref ? session.inputSources : []);
    for (const [src, state] of sources) if (!live.has(src)) { if (state.cup) release(state.cup); sources.delete(src); }
    for (const src of live) readSource(src, frame, ref);
    for (const c of cups) {
      if (c.state === 'flying' || c.state === 'broken') physics(c, dt);
      if (c.shards.visible) {
        c.shardAge += dt;
        if (c.shardAge >= 2) { c.shards.visible = false; continue; }
        c.shardMat.opacity = 1 - c.shardAge / 2;
        c.pieces.forEach((p, i) => {
          p.v.y -= gravity * dt; p.p.addScaledVector(p.v, dt);
          if (p.p.y < 0.02) { p.p.y = 0.02; p.v.y = Math.abs(p.v.y) * 0.2; p.v.x *= 0.8; p.v.z *= 0.8; }
          dummy.position.copy(p.p); dummy.quaternion.copy(p.q); dummy.updateMatrix(); c.shards.setMatrixAt(i, dummy.matrix);
        }); c.shards.instanceMatrix.needsUpdate = true;
      }
    }
  }
  const off = nova.onTick(tick);
  return { ready: true, root, cups, loaded, dispose() {
    disposed = true; off?.(); root.removeFromParent(); sources.clear(); bartenderMixer?.stopAllAction();
    cupGeo.dispose(); bottomGeo.dispose(); shardGeo.dispose();
    cups.forEach(c => { c.material.dispose(); c.shardMat.dispose(); c.shards.dispose(); });
  } };
}
