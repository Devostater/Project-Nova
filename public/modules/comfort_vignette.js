/**
 * Project Nova: Dynamic Comfort Vignette Module
 * Meta Quest 3 WebXR Comfort Optimization (72Hz / 90Hz)
 *
 * Implements an adaptive peripheral field-of-view limiter (dynamic vignette)
 * that smoothly narrows peripheral vision during rapid angular maneuvers
 * (high roll, pitch, or yaw rates) to eliminate vestibular mismatch and pass
 * Meta VR Comfort checks. Zero garbage collection in animation loop.
 */

export function init(nova = {}) {
  const THREE = nova.THREE || window.THREE;
  const camera = nova.camera || window.camera;
  const shipBody = nova.shipBody || window.shipBody;

  if (!THREE || !camera) {
    console.warn('[comfort_vignette] THREE or camera not available, deferring.');
    return null;
  }

  // Pre-allocated math variables (Zero GC)
  let currentIntensity = 0.0;
  let targetIntensity = 0.0;
  let enabled = true;

  // Custom Vignette GLSL Shader
  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  const fragmentShader = `
    precision mediump float;
    varying vec2 vUv;
    uniform float uIntensity;
    uniform float uRadius;
    uniform float uSmoothness;
    uniform vec3 uColor;

    void main() {
      if (uIntensity <= 0.001) {
        discard;
      }
      vec2 center = vUv - vec2(0.5);
      // Account for typical aspect ratio or keep circular
      float dist = length(center) * 2.0;
      // Smooth falloff from clear center (uRadius) to black edge
      float edge0 = uRadius;
      float edge1 = uRadius + uSmoothness;
      float vignette = smoothstep(edge0, edge1, dist);
      float alpha = vignette * uIntensity;
      gl_FragColor = vec4(uColor, alpha);
    }
  `;

  const uniforms = {
    uIntensity: { value: 0.0 },
    uRadius: { value: 0.52 },
    uSmoothness: { value: 0.45 },
    uColor: { value: new THREE.Color(0x020408) }
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  // Screen-space fullscreen quad attached to camera
  const geo = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 99999;
  mesh.visible = false;
  camera.add(mesh);

  function updateComfort(delta) {
    // Check global settings
    const nopt = window.NOPT?.o || nova.options || {};
    if (nopt.vignette === false || nopt.comfortVignette === false) {
      if (mesh.visible) {
        mesh.visible = false;
        uniforms.uIntensity.value = 0.0;
        currentIntensity = 0.0;
      }
      return;
    }

    // Determine ship angular rotation rate from Cannon body or inputs
    let angSpeed = 0.0;
    if (shipBody && shipBody.angularVelocity) {
      const av = shipBody.angularVelocity;
      angSpeed = Math.sqrt(av.x * av.x + av.y * av.y + av.z * av.z);
    }

    // Determine translational boost/accel effect
    const boostActive = !!window.isAfterburnerActive;
    if (boostActive) angSpeed += 0.4;

    // Thresholds: low angular rates (< 0.25 rad/s) keep vignette invisible
    const DEADZONE = 0.22;
    if (angSpeed > DEADZONE) {
      // Scale smoothly up to ~0.75 max darkening
      const excess = angSpeed - DEADZONE;
      targetIntensity = Math.min(0.78, excess * 0.45);
    } else {
      targetIntensity = 0.0;
    }

    // Smooth dampening towards target (rapid attack, smooth decay)
    const lerpRate = targetIntensity > currentIntensity ? 12.0 : 6.0;
    currentIntensity += (targetIntensity - currentIntensity) * Math.min(1.0, delta * lerpRate);

    if (currentIntensity > 0.005) {
      mesh.visible = true;
      uniforms.uIntensity.value = currentIntensity;
    } else {
      if (mesh.visible) {
        mesh.visible = false;
        uniforms.uIntensity.value = 0.0;
      }
    }
  }

  // Hook into nova's tick system
  if (typeof nova.onTick === 'function') {
    nova.onTick(updateComfort);
  }

  console.info('[comfort_vignette] initialized successfully');

  return {
    mesh,
    get intensity() { return currentIntensity; },
    setEnabled: (val) => { enabled = !!val; if (!enabled) uniforms.uIntensity.value = 0; },
    update: updateComfort,
    dispose: () => {
      camera.remove(mesh);
      geo.dispose();
      mat.dispose();
    }
  };
}
