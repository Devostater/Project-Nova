// Faction emblems as hull decals (G2 follow-up). Reads art/emblems/manifest.json (owner-revisable mapping)
// and puts the faction's cut-out decal (art/emblems/decal_XX.png) on both sides of every NF ship once its model is in.
export function init(nova) {
  const T = nova && nova.THREE; if (!T) return { ready: false };
  const base = new URL('../art/emblems/', import.meta.url).href;
  const FAC = { edf: 'nova_defense_compact', pirate: 'red_wake', alien: 'veyran_assembly', civ: 'neutral_civilian' };
  const mats = {}; let map = null;
  fetch(base + 'manifest.json', { cache: 'no-cache' }).then(r => r.json()).then(m => {
    map = {}; (m.emblems || []).forEach(e => { map[e.faction] = e.id.replace('emblem_', ''); });
  }).catch(e => console.warn('[emblems] manifest', e));
  const tl = new T.TextureLoader();
  function mat(id) {
    if (mats[id]) return mats[id];
    const t = tl.load(base + 'decal_' + id + '.png'); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
    return mats[id] = new T.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.35, roughness: 0.5, metalness: 0.3,
      emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.35, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false, side: T.DoubleSide });
  }
  const geo = new T.PlaneGeometry(1, 1), box = new T.Box3(), q = new T.Quaternion(), c = new T.Vector3(), s = new T.Vector3();
  function dress(u) {
    const g = u.g; let meshes = 0; g.traverse(o => { if (o.isMesh && o.visible && o.geometry && o.geometry.attributes.position.count > 200) meshes++; });
    if (!meshes) return false;   // model not loaded yet
    const id = map[FAC[u.fac]]; if (!id) return true;
    q.copy(g.quaternion); const p = g.position.clone(); g.quaternion.identity(); g.position.set(0, 0, 0); g.updateMatrixWorld(true);
    box.setFromObject(g); g.quaternion.copy(q); g.position.copy(p); g.updateMatrixWorld(true);
    if (box.isEmpty()) return true;
    box.getCenter(c); box.getSize(s);
    // find the real hull surface with rays (bounding boxes put decals in mid-air beside wings)
    const ray = new T.Raycaster(); ray.camera = nova.camera;
    const targets = []; g.traverse(o => { if (o.isMesh && o.name !== 'NOVA_EMBLEM' && !o.isSprite && o.visible) targets.push(o); });
    q.copy(g.quaternion); g.quaternion.identity(); g.position.set(0, 0, 0); g.updateMatrixWorld(true);
    const flat = s.y < Math.max(s.x, s.z) * 0.35, spots = [];
    const hit = (o, d) => { ray.set(o, d); const h = ray.intersectObjects(targets, false).find(h => h.face); return h || null; };
    [-1, 1].forEach(side => {
      let h = null; if (flat) for (const f of [0.28, 0.2, 0.13, 0.07]) { h = hit(new T.Vector3(c.x + side * s.x * f, box.max.y + 5, c.z), new T.Vector3(0, -1, 0)) || hit(new T.Vector3(c.x + side * s.x * f, box.max.y + 5, c.z + s.z * 0.15), new T.Vector3(0, -1, 0)); if (h) break; }
      if (!flat) h = hit(new T.Vector3(side > 0 ? box.max.x + 5 : box.min.x - 5, c.y, c.z), new T.Vector3(-side, 0, 0));
      if (h) { const n = h.face.normal.clone().transformDirection(h.object.matrixWorld); spots.push({ p: h.point.clone().addScaledVector(n, 0.04), n }); }
    });
    g.quaternion.copy(q); g.position.copy(p); g.updateMatrixWorld(true);
    const size = Math.max(0.6, Math.min(flat ? s.x * 0.2 : s.y * 0.6, s.z * 0.25, 40));
    spots.forEach(sp => {
      const d = new T.Mesh(geo, mat(id)); d.scale.setScalar(size); d.raycast = () => { };
      d.position.copy(sp.p); d.lookAt(sp.p.clone().add(sp.n)); d.name = 'NOVA_EMBLEM'; g.add(d);
    });
    return true;
  }
  const timer = setInterval(() => {
    try { const NF = window.NF; if (!map || !NF) return; NF.units.forEach(u => { if (u.alive && !u.emblem && u.slug !== 'mine' && FAC[u.fac]) { if (dress(u)) u.emblem = true; } }); } catch (e) { }
  }, 1500);
  return { ready: true, dispose() { clearInterval(timer); } };
}
