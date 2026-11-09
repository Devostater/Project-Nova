import { GLTFLoader } from '../vendor/GLTFLoader.js';

// WebXR hand visuals for Project Nova. The source glove is used for controller
// grip poses; tracked hands use a lightweight articulated glove driven directly
// from XR joints. Visuals never consume select/squeeze events, so cockpit grabs
// remain owned by the game file.
export function init(nova) {
  const T = nova?.THREE;
  const renderer = nova?.renderer;
  const scene = nova?.scene;
  if (!T || !renderer?.xr || !scene) return { ready: false, state: () => ({ ready: false }) };

  const SEGMENTS = [
    ['wrist', 'thumb-metacarpal'], ['thumb-metacarpal', 'thumb-phalanx-proximal'],
    ['thumb-phalanx-proximal', 'thumb-phalanx-distal'], ['thumb-phalanx-distal', 'thumb-tip'],
    ['wrist', 'index-finger-metacarpal'], ['index-finger-metacarpal', 'index-finger-phalanx-proximal'],
    ['index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate'],
    ['index-finger-phalanx-intermediate', 'index-finger-phalanx-distal'], ['index-finger-phalanx-distal', 'index-finger-tip'],
    ['wrist', 'middle-finger-metacarpal'], ['middle-finger-metacarpal', 'middle-finger-phalanx-proximal'],
    ['middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate'],
    ['middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal'], ['middle-finger-phalanx-distal', 'middle-finger-tip'],
    ['wrist', 'ring-finger-metacarpal'], ['ring-finger-metacarpal', 'ring-finger-phalanx-proximal'],
    ['ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate'],
    ['ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal'], ['ring-finger-phalanx-distal', 'ring-finger-tip'],
    ['wrist', 'pinky-finger-metacarpal'], ['pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal'],
    ['pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate'],
    ['pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal'], ['pinky-finger-phalanx-distal', 'pinky-finger-tip']
  ];
  const UP = new T.Vector3(0, 1, 0);
  const geometry = new T.CapsuleGeometry(.0085, 1, 4, 6);
  const materials = {
    left: new T.MeshStandardMaterial({ color: 0x1b3644, emissive: 0x003746, emissiveIntensity: .55, metalness: .55, roughness: .36 }),
    right: new T.MeshStandardMaterial({ color: 0x243242, emissive: 0x40102c, emissiveIntensity: .45, metalness: .55, roughness: .36 })
  };
  const hands = {};
  for (const side of ['left', 'right']) {
    const mesh = new T.InstancedMesh(geometry, materials[side], SEGMENTS.length);
    mesh.name = `NOVA_XR_GLOVE_${side.toUpperCase()}`;
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.visible = false;
    mesh.raycast = () => {};
    scene.add(mesh);
    hands[side] = {
      mesh, tracked: null, grip: null, controllerModel: null, source: null,
      a: new T.Vector3(), b: new T.Vector3(), mid: new T.Vector3(), dir: new T.Vector3(),
      q: new T.Quaternion(), scale: new T.Vector3(), matrix: new T.Matrix4()
    };
  }

  let template = null;
  let ready = false;
  let session = null;
  let sessionStart = null;
  let sessionEnd = null;

  function disableRaycast(root) {
    root?.traverse?.(node => {
      if (node.isMesh || node.isLine || node.isPoints) node.raycast = () => {};
    });
  }

  function hideStockJointSpheres(hand) {
    hand?.traverse?.(node => {
      if (!node || node.name?.startsWith?.('NOVA_')) return;
      const renderable = node.isMesh || node.isPoints || node.isLine;
      const sphere = node.geometry?.type === 'SphereGeometry';
      const named = /joint|sphere|point|hand-model/i.test(node.name || '');
      if (renderable && (sphere || named)) node.visible = false;
    });
  }

  function makeControllerGlove(side, grip) {
    const h = hands[side];
    if (!template || !grip || h.controllerModel?.parent === grip) return;
    h.controllerModel?.removeFromParent?.();
    const named = template.getObjectByName(side === 'left' ? 'hand_L' : 'hand_R');
    const visual = (named || template).clone(true);
    visual.name = `NOVA_CONTROLLER_GLOVE_${side.toUpperCase()}`;
    visual.position.set(side === 'left' ? -.015 : .015, -.035, .095);
    visual.rotation.set(-.18, side === 'left' ? .08 : -.08, side === 'left' ? .12 : -.12);
    const box = new T.Box3().setFromObject(visual);
    const size = box.getSize(new T.Vector3());
    visual.scale.setScalar(.19 / Math.max(size.x, size.y, size.z, .001));
    visual.frustumCulled = false;
    disableRaycast(visual);
    grip.add(visual);
    h.controllerModel = visual;
  }

  function joint(hand, name) {
    return hand?.getObjectByName?.(name) || null;
  }

  function updateTracked(side) {
    const h = hands[side];
    if (!h.tracked) { h.mesh.visible = false; h.mesh.count = 0; return; }
    hideStockJointSpheres(h.tracked);
    let count = 0;
    for (const [from, to] of SEGMENTS) {
      const ja = joint(h.tracked, from), jb = joint(h.tracked, to);
      if (!ja || !jb) continue;
      ja.getWorldPosition(h.a); jb.getWorldPosition(h.b);
      h.dir.subVectors(h.b, h.a);
      const length = h.dir.length();
      if (!(length > .002 && length < .25)) continue;
      h.dir.multiplyScalar(1 / length);
      h.mid.copy(h.a).add(h.b).multiplyScalar(.5);
      h.q.setFromUnitVectors(UP, h.dir);
      const radius = Math.max(.006, Math.min(.014, (ja.jointRadius || jb.jointRadius || .008) * 1.08));
      h.scale.set(radius / .0085, Math.max(.001, length - radius * 1.4), radius / .0085);
      h.matrix.compose(h.mid, h.q, h.scale);
      h.mesh.setMatrixAt(count++, h.matrix);
    }
    h.mesh.count = count;
    h.mesh.visible = count > 0;
    if (count) h.mesh.instanceMatrix.needsUpdate = true;
  }

  function bindInputSources() {
    session = renderer.xr.getSession?.() || null;
    const sources = session ? Array.from(session.inputSources || []) : [];
    for (const side of ['left', 'right']) {
      const h = hands[side];
      const source = sources.find(item => item.handedness === side) || null;
      const index = source ? sources.indexOf(source) : -1;
      h.source = source;
      h.tracked = index >= 0 && source?.hand ? renderer.xr.getHand?.(index) || null : null;
      h.grip = index >= 0 ? (renderer.xr.getControllerGrip?.(index) || renderer.xr.getController?.(index) || null) : null;
      if (h.tracked) {
        h.controllerModel && (h.controllerModel.visible = false);
        hideStockJointSpheres(h.tracked);
      } else {
        makeControllerGlove(side, h.grip);
        if (h.controllerModel) h.controllerModel.visible = !!source;
      }
    }
  }

  function frame() {
    const next = renderer.xr.getSession?.() || null;
    if (next !== session) bindInputSources();
    if (!session) return;
    for (const side of ['left', 'right']) updateTracked(side);
  }

  function setGrip(side, active) {
    const model = hands[side]?.controllerModel;
    if (!model) return false;
    model.rotation.x = active ? -.32 : -.18;
    model.rotation.z = (side === 'left' ? 1 : -1) * (active ? .2 : .12);
    return true;
  }

  function state() {
    return {
      ready,
      presenting: !!renderer.xr.getSession?.(),
      left: hands.left.tracked ? 'tracked' : hands.left.source ? 'controller' : 'none',
      right: hands.right.tracked ? 'tracked' : hands.right.source ? 'controller' : 'none'
    };
  }

  function dispose() {
    const current = renderer.xr.getSession?.();
    if (current) {
      sessionStart && current.removeEventListener('inputsourceschange', sessionStart);
      sessionEnd && current.removeEventListener('end', sessionEnd);
    }
    for (const side of ['left', 'right']) {
      hands[side].mesh.removeFromParent();
      hands[side].controllerModel?.removeFromParent?.();
    }
    geometry.dispose(); materials.left.dispose(); materials.right.dispose();
  }

  new GLTFLoader().load('models/vr_hands.glb', gltf => {
    template = gltf.scene;
    disableRaycast(template);
    ready = true;
    bindInputSources();
    nova.emit?.('vrHandsReady', state());
  }, undefined, error => {
    console.warn('[NOVA VR hands] glove model failed; tracked-joint glove remains available', error);
    ready = true;
  });

  sessionStart = () => bindInputSources();
  sessionEnd = () => {
    session = null;
    for (const side of ['left', 'right']) {
      hands[side].mesh.visible = false;
      if (hands[side].controllerModel) hands[side].controllerModel.visible = false;
    }
  };
  renderer.xr.addEventListener?.('sessionstart', () => {
    bindInputSources();
    const current = renderer.xr.getSession?.();
    current?.addEventListener?.('inputsourceschange', sessionStart);
    current?.addEventListener?.('end', sessionEnd, { once: true });
  });
  renderer.xr.addEventListener?.('sessionend', sessionEnd);

  return { ready: true, frame, state, setGrip, refresh: bindInputSources, dispose };
}

