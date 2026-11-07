/**
 * Project Nova A3: bounded missile trails and impact/death VFX.
 *
 * Integration contract for the A4 nova loader:
 *   const fx = init(nova);
 *   fx.missileStart(id, position, velocity);
 *   fx.missileStop(id);
 *   fx.explosion(position, scale, source);
 *   fx.tick(dt); // or nova.onTick(fx.tick)
 *
 * Optional event names: missileLaunched, missileImpact, shipDestroyed.
 * All THREE objects, textures, and pool storage are allocated once in init().
 */
export function init(nova = {}) {
  const THREE = nova.THREE || globalThis.THREE;
  const scene = nova.scene;
  if (!THREE || !scene) {
    return { ready: false, missileStart() {}, missileStop() {}, explosion() {}, tick() {}, dispose() {} };
  }

  const opts = nova.options || nova.settings || globalThis.NOPT?.o || {};
  const rawTier = String(opts.gfx ?? opts.graphics ?? globalThis.NOPT?.o?.gfx ?? 'mid').toLowerCase();
  const quest = Boolean(nova.isQuest || nova.isXR || globalThis.navigator?.userAgent?.includes('Quest')) ||
    Boolean(nova.renderer?.xr?.isPresenting);
  const tier = quest ? 'low' : (rawTier.includes('ultra') ? 'ultra' : rawTier);
  const quality = tier.includes('ultra') ? 'ultra' : tier.includes('high') ? 'high' :
    (tier.includes('low') ? 'low' : 'mid');

  const cfg = quality === 'ultra'
    ? { missiles: 16, trails: 60, booms: 30, debris: 12, trailLife: 1.4, shake: 0.16 }
    : quality === 'high'
      ? { missiles: 12, trails: 25, booms: 12, debris: 4, trailLife: 0.85, shake: 0.08 }
      : { missiles: 8, trails: 10, booms: 6, debris: 0, trailLife: 0.45, shake: 0 };

  const rootUrl = (file) => new URL('../fx/' + file, import.meta.url).href;
  const loader = new THREE.TextureLoader();
  const glow = loader.load(rootUrl('vfx_engine_glow.png'));
  glow.colorSpace = THREE.SRGBColorSpace || glow.colorSpace;
  const spark = loader.load(rootUrl('vfx_spark.png'));
  spark.colorSpace = THREE.SRGBColorSpace || spark.colorSpace;
  glow.wrapS = glow.wrapT = THREE.ClampToEdgeWrapping;
  spark.wrapS = spark.wrapT = THREE.ClampToEdgeWrapping;

  const additive = THREE.AdditiveBlending;
  const spriteMat = new THREE.SpriteMaterial({
    map: glow, color: 0xffb06a, transparent: true, opacity: 0,
    blending: additive, depthWrite: false, fog: false
  });
  const ringGeo = new THREE.TorusGeometry(1, 0.025, 5, 40);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffb36b, transparent: true, opacity: 0,
    blending: additive, depthWrite: false, side: THREE.DoubleSide
  });
  const debrisGeo = new THREE.IcosahedronGeometry(0.12, 0);
  const debrisMat = new THREE.MeshBasicMaterial({
    color: 0xff9b55, transparent: true, opacity: 0, wireframe: true
  });

  const boomPool = [];
  const boomLayers = quality === 'ultra' ? 5 : quality === 'high' ? 3 : 2;
  const ringCount = quality === 'low' ? 2 : quality === 'high' ? 6 : 10;
  const debrisCount = cfg.debris;
  const boomCount = Math.min(cfg.booms, boomLayers * (quality === 'low' ? 3 : quality === 'high' ? 4 : 6));
  for (let i = 0; i < boomCount; i++) {
    const sprite = new THREE.Sprite(spriteMat);
    sprite.visible = false;
    scene.add(sprite);
    boomPool.push({ object: sprite, age: 0, life: 0, scale: 1, x: 0, y: 0, z: 0, kind: 'fire' });
  }

  const rings = [];
  for (let i = 0; i < ringCount; i++) {
    const mesh = new THREE.Mesh(ringGeo, ringMat);
    mesh.visible = false;
    scene.add(mesh);
    rings.push({ object: mesh, age: 0, life: 0, x: 0, y: 0, z: 0, scale: 1 });
  }

  const debris = [];
  for (let i = 0; i < debrisCount; i++) {
    const mesh = new THREE.Mesh(debrisGeo, debrisMat);
    mesh.visible = false;
    scene.add(mesh);
    debris.push({ object: mesh, age: 0, life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0 });
  }

  const lightCount = quality === 'ultra' ? 4 : quality === 'high' ? 2 : 1;
  const lights = [];
  for (let i = 0; i < lightCount; i++) {
    const light = new THREE.PointLight(0xffa36c, 0, quality === 'ultra' ? 18 : 9, 2);
    light.visible = false;
    scene.add(light);
    lights.push({ object: light, age: 0, life: 0, intensity: quality === 'ultra' ? 9 : 4 });
  }

  const particleCount = quality === 'ultra' ? 300 : quality === 'high' ? 150 : 60;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push({ active: false, age: 0, life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 0.1 });
    colors[i * 3] = 1; colors[i * 3 + 1] = 0.68; colors[i * 3 + 2] = 0.38;
  }
  const pointsGeo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage?.(THREE.DynamicDrawUsage);
  pointsGeo.setAttribute('position', posAttr);
  pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  pointsGeo.setDrawRange(0, 0);
  const pointMat = new THREE.PointsMaterial({
    map: glow, size: quality === 'ultra' ? 0.24 : 0.16, vertexColors: true,
    transparent: true, opacity: 0, blending: additive, depthWrite: false, sizeAttenuation: true
  });
  const points = new THREE.Points(pointsGeo, pointMat);
  points.frustumCulled = false;
  scene.add(points);

  const missiles = new Map();
  let trailClock = 0;
  let activeTrailParticles = 0;
  let boomCursor = 0;
  let ringCursor = 0;
  let debrisCursor = 0;
  let lightCursor = 0;
  let disposed = false;

  function readVec(v, axis, idx) {
    if (!v) return 0;
    const key = axis;
    return Number(v[key] ?? v[idx] ?? 0) || 0;
  }
  function vec(v) { return [readVec(v, 'x', 0), readVec(v, 'y', 1), readVec(v, 'z', 2)]; }
  function particle(x, y, z, vx, vy, vz, life, size) {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.active) continue;
      p.active = true; p.age = 0; p.life = life; p.kind = 'burst';
      p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.size = size;
      return true;
    }
    return false;
  }
  function trailParticle(x, y, z, vx, vy, vz, life, size) {
    if (activeTrailParticles >= cfg.trails) return;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.active) continue;
      p.active = true; p.age = 0; p.life = life; p.kind = 'trail';
      p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.size = size;
      activeTrailParticles++;
      return;
    }
  }
  function missileStart(id, position, velocity) {
    if (disposed || id == null) return;
    if (!missiles.has(id) && missiles.size >= cfg.missiles) return;
    const p = vec(position), v = vec(velocity);
    missiles.set(id, { x: p[0], y: p[1], z: p[2], vx: v[0], vy: v[1], vz: v[2] });
  }
  function missileStop(id) { missiles.delete(id); }
  function explosion(position, scale = 1, source = 'ship') {
    if (disposed) return;
    const p = vec(position), s = Math.max(0.5, Math.min(5, Number(scale) || 1));
    const now = boomPool.length;
    for (let n = 0; n < boomLayers; n++) {
      const b = boomPool[(boomCursor + n) % now];
      if (!b) break;
      b.age = 0; b.life = quality === 'ultra' ? 1.35 : quality === 'high' ? 0.9 : 0.55;
      b.scale = s * (0.7 + n * 0.24); b.x = p[0]; b.y = p[1]; b.z = p[2];
      b.object.visible = true;
      b.object.position.set(p[0], p[1], p[2]);
      b.object.scale.setScalar(b.scale * 2.5);
    }
    if (now) boomCursor = (boomCursor + boomLayers) % now;

    if (rings.length) {
      const r = rings[ringCursor++ % rings.length];
      r.age = 0; r.life = quality === 'ultra' ? 1.1 : quality === 'high' ? 0.75 : 0.42;
      r.scale = s; r.x = p[0]; r.y = p[1]; r.z = p[2];
      r.object.visible = true; r.object.position.set(p[0], p[1], p[2]); r.object.scale.setScalar(0.1);
    }
    const burst = quality === 'ultra' ? 42 : quality === 'high' ? 24 : 10;
    for (let i = 0; i < burst; i++) {
      const a = Math.random() * Math.PI * 2, h = Math.random() * 2 - 1;
      const q = Math.sqrt(Math.max(0, 1 - h * h));
      const speed = (0.7 + Math.random() * (quality === 'ultra' ? 5 : 2.4)) * s;
      particle(p[0], p[1], p[2], Math.cos(a) * q * speed, h * speed, Math.sin(a) * q * speed, 0.35 + Math.random() * 0.8, 0.08 + Math.random() * 0.16);
    }
    for (let i = 0; i < debris.length && source !== 'missile'; i++) {
      const d = debris[(debrisCursor++) % debris.length];
      const a = Math.random() * Math.PI * 2, h = Math.random() * 1.6 - 0.8;
      d.age = 0; d.life = 1.1 + Math.random() * 1.5;
      d.x = p[0]; d.y = p[1]; d.z = p[2];
      d.vx = Math.cos(a) * (1 + Math.random() * 4) * s; d.vy = h * (1 + Math.random() * 4) * s;
      d.vz = Math.sin(a) * (1 + Math.random() * 4) * s;
      d.rx = Math.random() * 6; d.ry = Math.random() * 6; d.rz = Math.random() * 6;
      d.object.visible = true; d.object.position.set(p[0], p[1], p[2]);
      d.object.scale.setScalar(s * (0.18 + Math.random() * 0.32));
    }
    const light = lights[lightCursor++ % lights.length];
    light.age = 0; light.life = quality === 'ultra' ? 0.32 : 0.18;
    light.object.visible = true; light.object.position.set(p[0], p[1], p[2]); light.object.intensity = light.intensity;
    if (quality === 'ultra' && cfg.shake && typeof nova.cameraShake === 'function') nova.cameraShake(cfg.shake * Math.min(s, 2));
  }

  function tick(dt) {
    if (disposed) return;
    const delta = Math.min(0.05, Math.max(0, Number(dt) || 0));
    for (const m of missiles.values()) {
      m.x += m.vx * delta; m.y += m.vy * delta; m.z += m.vz * delta;
    }
    trailClock += delta;
    if (trailClock >= 0.045) {
      trailClock %= 0.045;
      for (const m of missiles.values()) {
        const speed = Math.hypot(m.vx, m.vy, m.vz) || 1;
        const life = cfg.trailLife;
        trailParticle(m.x, m.y, m.z, -m.vx / speed * 0.12, -m.vy / speed * 0.12, -m.vz / speed * 0.12, life, 0.1 + speed * 0.006);
      }
    }
    let drawCount = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!p.active) continue;
      p.age += delta;
      if (p.age >= p.life) { if (p.kind === 'trail') activeTrailParticles--; p.active = false; continue; }
      const fade = 1 - p.age / p.life;
      positions[drawCount * 3] = p.x; positions[drawCount * 3 + 1] = p.y; positions[drawCount * 3 + 2] = p.z;
      p.x += p.vx * delta; p.y += p.vy * delta; p.z += p.vz * delta;
      p.vx *= 0.992; p.vy *= 0.992; p.vz *= 0.992;
      drawCount++;
    }
    pointMat.opacity = drawCount ? 0.84 : 0;
    pointsGeo.setDrawRange(0, drawCount);
    posAttr.needsUpdate = true;

    for (const b of boomPool) {
      if (!b.object.visible) continue;
      b.age += delta; const t = Math.min(1, b.age / b.life);
      if (t >= 1) { b.object.visible = false; continue; }
      const k = 0.75 + t * 1.6;
      b.object.position.set(b.x, b.y, b.z);
      b.object.scale.setScalar(b.scale * 2.5 * k);
      spriteMat.opacity = Math.max(0, 0.72 * (1 - t));
    }
    for (const r of rings) {
      if (!r.object.visible) continue;
      r.age += delta; const t = Math.min(1, r.age / r.life);
      if (t >= 1) { r.object.visible = false; continue; }
      r.object.position.set(r.x, r.y, r.z); r.object.scale.setScalar(r.scale * (0.2 + t * 4.5));
      ringMat.opacity = (1 - t) * 0.8;
    }
    for (const d of debris) {
      if (!d.object.visible) continue;
      d.age += delta; const t = Math.min(1, d.age / d.life);
      if (t >= 1) { d.object.visible = false; continue; }
      d.x += d.vx * delta; d.y += d.vy * delta; d.z += d.vz * delta; d.vy -= 1.2 * delta;
      d.object.position.set(d.x, d.y, d.z);
      d.object.rotation.set(d.rx + t * 4, d.ry + t * 3, d.rz + t * 2);
      debrisMat.opacity = 1 - t;
    }
    for (const l of lights) {
      if (!l.object.visible) continue;
      l.age += delta; const t = Math.min(1, l.age / l.life);
      l.object.intensity = l.intensity * Math.max(0, 1 - t);
      if (t >= 1) { l.object.visible = false; l.object.intensity = 0; }
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true; missiles.clear();
    for (const b of boomPool) scene.remove(b.object);
    for (const r of rings) scene.remove(r.object);
    for (const d of debris) scene.remove(d.object);
    for (const l of lights) scene.remove(l.object);
    scene.remove(points);
    glow.dispose?.(); spark.dispose?.(); spriteMat.dispose?.(); ringGeo.dispose?.(); ringMat.dispose?.();
    debrisGeo.dispose?.(); debrisMat.dispose?.(); pointsGeo.dispose?.(); pointMat.dispose?.();
  }

  const api = { ready: true, tier: quality, missileStart, missileStop, explosion, tick, dispose };
  if (typeof nova.onTick === 'function') nova.onTick(tick);
  if (typeof nova.on === 'function') {
    nova.on('missileLaunched', e => missileStart(e.id, e.position, e.velocity));
    nova.on('missileImpact', e => { missileStop(e.id); explosion(e.position, e.scale || 1, 'missile'); });
    nova.on('shipDestroyed', e => explosion(e.position, e.scale || 1, 'ship'));
  }
  return api;
}
