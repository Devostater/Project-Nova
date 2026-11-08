/**
 * Project Nova — Aggressive Post-Processing (ULTRA-first)
 *
 * Provides cinematic post-processing for the max-graphics pass:
 *   - UnrealBloomPass (strong)
 *   - Tone mapping
 *   - Vignette
 *   - Optional film grain
 *
 * Integration (same contract as other modules):
 *   const post = init(nova);
 *   // then either:
 *   //   post.render() every frame instead of renderer.render()
 *   // or let it wrap the existing render loop if nova allows it.
 *
 * Quality tiers (reads NOPT.o.gfx or nova.options.gfx):
 *   ultra  → full cinematic (default for this aggressive pass)
 *   high   → strong but cheaper
 *   mid    → moderate bloom
 *   low    → minimal / off (Quest-friendly later)
 *
 * Requires Three.js postprocessing addons:
 *   EffectComposer, RenderPass, UnrealBloomPass, OutputPass (or ShaderPass)
 * These can be loaded via import map, vendor, or CDN.
 */

export function init(nova = {}) {
  const THREE = nova.THREE || globalThis.THREE;
  const renderer = nova.renderer;
  const scene = nova.scene;
  const camera = nova.camera;

  if (!THREE || !renderer || !scene || !camera) {
    console.warn('[postfx] Missing THREE / renderer / scene / camera — post-processing disabled');
    return {
      ready: false,
      tier: 'off',
      render() {},
      setQuality() {},
      resize() {},
      dispose() {}
    };
  }

  // ---------- Quality tier ----------
  const opts = nova.options || nova.settings || globalThis.NOPT?.o || {};
  const raw = String(opts.gfx ?? opts.graphics ?? globalThis.NOPT?.o?.gfx ?? 'ultra').toLowerCase();
  const isQuest = Boolean(
    nova.isQuest || nova.isXR ||
    globalThis.navigator?.userAgent?.includes('Quest') ||
    renderer.xr?.isPresenting
  );

  // Aggressive pass: default to ultra unless on Quest or explicitly lower
  let tier = isQuest ? 'low' : (raw.includes('ultra') ? 'ultra' :
    raw.includes('high') ? 'high' :
    raw.includes('low') ? 'low' : 'mid');

  const PRESETS = {
    ultra: {
      bloomStrength: 1.35,
      bloomRadius: 0.55,
      bloomThreshold: 0.22,
      vignette: 0.38,
      grain: 0.035,
      exposure: 1.05,
      resolutionScale: 1.0
    },
    high: {
      bloomStrength: 0.95,
      bloomRadius: 0.42,
      bloomThreshold: 0.32,
      vignette: 0.28,
      grain: 0.02,
      exposure: 1.0,
      resolutionScale: 1.0
    },
    mid: {
      bloomStrength: 0.55,
      bloomRadius: 0.32,
      bloomThreshold: 0.45,
      vignette: 0.18,
      grain: 0.0,
      exposure: 1.0,
      resolutionScale: 0.85
    },
    low: {
      bloomStrength: 0.0,
      bloomRadius: 0.0,
      bloomThreshold: 1.0,
      vignette: 0.0,
      grain: 0.0,
      exposure: 1.0,
      resolutionScale: 0.7
    }
  };

  let settings = { ...PRESETS[tier] };

  // ---------- Try to load postprocessing addons ----------
  let EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass;

  const addons = nova.postprocessing || globalThis.THREE_POST || {};
  EffectComposer = addons.EffectComposer || THREE.EffectComposer;
  RenderPass     = addons.RenderPass     || THREE.RenderPass;
  UnrealBloomPass= addons.UnrealBloomPass|| THREE.UnrealBloomPass;
  OutputPass     = addons.OutputPass     || THREE.OutputPass;
  ShaderPass     = addons.ShaderPass     || THREE.ShaderPass;

  let composer = null;
  let bloomPass = null;
  let vignettePass = null;
  let ready = false;
  let disposed = false;

  async function tryLoadAddons() {
    if (EffectComposer && RenderPass && UnrealBloomPass) return true;

    try {
      const base = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/';
      const [
        { EffectComposer: EC },
        { RenderPass: RP },
        { UnrealBloomPass: UBP },
        { OutputPass: OP }
      ] = await Promise.all([
        import(base + 'EffectComposer.js'),
        import(base + 'RenderPass.js'),
        import(base + 'UnrealBloomPass.js'),
        import(base + 'OutputPass.js').catch(() => ({ OutputPass: null }))
      ]);
      EffectComposer = EC;
      RenderPass = RP;
      UnrealBloomPass = UBP;
      OutputPass = OP;
      return true;
    } catch (err) {
      console.warn('[postfx] Could not load Three.js postprocessing addons:', err.message);
      return false;
    }
  }

  function makeVignetteGrainShader(THREE) {
    return {
      uniforms: {
        tDiffuse: { value: null },
        vignette: { value: 0.35 },
        grain: { value: 0.03 },
        time: { value: 0 }
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform float vignette;
        uniform float grain;
        uniform float time;
        varying vec2 vUv;

        float rand(vec2 co) {
          return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);

          vec2 uv = vUv - 0.5;
          float dist = length(uv);
          float vig = smoothstep(0.8, 0.2, dist * (0.6 + vignette * 1.4));
          color.rgb *= mix(1.0 - vignette * 0.85, 1.0, vig);

          if (grain > 0.001) {
            float g = (rand(vUv + fract(time)) - 0.5) * grain;
            color.rgb += g;
          }

          gl_FragColor = color;
        }
      `
    };
  }

  async function buildComposer() {
    const ok = await tryLoadAddons();
    if (!ok || !EffectComposer || !RenderPass || !UnrealBloomPass) {
      console.warn('[postfx] Post-processing addons unavailable — running without bloom');
      ready = false;
      return;
    }

    const size = new THREE.Vector2();
    renderer.getSize(size);
    const pixelRatio = Math.min(renderer.getPixelRatio(), 2);
    const w = Math.floor(size.x * settings.resolutionScale);
    const h = Math.floor(size.y * settings.resolutionScale);

    composer = new EffectComposer(renderer);
    composer.setSize(w, h);
    composer.setPixelRatio(pixelRatio);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      settings.bloomStrength,
      settings.bloomRadius,
      settings.bloomThreshold
    );
    composer.addPass(bloomPass);

    if (ShaderPass || THREE.ShaderPass) {
      const SP = ShaderPass || THREE.ShaderPass;
      const shader = makeVignetteGrainShader(THREE);
      vignettePass = new SP(new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(shader.uniforms),
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader
      }));
      vignettePass.uniforms.vignette.value = settings.vignette;
      vignettePass.uniforms.grain.value = settings.grain;
      composer.addPass(vignettePass);
    }

    if (OutputPass) {
      composer.addPass(new OutputPass());
    }

    if (renderer.toneMapping !== undefined) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping || THREE.LinearToneMapping;
      renderer.toneMappingExposure = settings.exposure;
    }
    if (renderer.outputColorSpace !== undefined) {
      renderer.outputColorSpace = THREE.SRGBColorSpace || renderer.outputColorSpace;
    }

    ready = true;
    console.log(`[postfx] Ready — tier: ${tier} (aggressive max-graphics pass)`);
  }

  const loadPromise = buildComposer();

  function applySettings() {
    if (bloomPass) {
      bloomPass.strength = settings.bloomStrength;
      bloomPass.radius = settings.bloomRadius;
      bloomPass.threshold = settings.bloomThreshold;
    }
    if (vignettePass?.uniforms) {
      vignettePass.uniforms.vignette.value = settings.vignette;
      vignettePass.uniforms.grain.value = settings.grain;
    }
    if (renderer.toneMappingExposure !== undefined) {
      renderer.toneMappingExposure = settings.exposure;
    }
  }

  function setQuality(newTier) {
    const t = String(newTier || '').toLowerCase();
    if (!PRESETS[t]) return;
    tier = t;
    settings = { ...PRESETS[tier] };
    applySettings();
    resize();
    console.log(`[postfx] Quality set to ${tier}`);
  }

  function resize() {
    if (!composer || disposed) return;
    const size = new THREE.Vector2();
    renderer.getSize(size);
    const w = Math.floor(size.x * settings.resolutionScale);
    const h = Math.floor(size.y * settings.resolutionScale);
    composer.setSize(w, h);
    if (bloomPass) bloomPass.resolution.set(w, h);
  }

  let time = 0;
  function render(delta = 0.016) {
    if (disposed) return;
    if (!ready || !composer) {
      renderer.render(scene, camera);
      return;
    }
    time += delta;
    if (vignettePass?.uniforms?.time) {
      vignettePass.uniforms.time.value = time;
    }
    composer.render();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    ready = false;
    if (composer) {
      composer.passes.forEach(p => p.dispose?.());
      composer.dispose?.();
    }
    composer = null;
    bloomPass = null;
    vignettePass = null;
  }

  if (typeof nova.setRenderFunction === 'function') {
    loadPromise.then(() => {
      if (ready) nova.setRenderFunction(render);
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => resize());
  }

  return {
    ready: () => ready,
    tier: () => tier,
    render,
    setQuality,
    resize,
    dispose,
    whenReady: () => loadPromise,
    _composer: () => composer,
    _settings: () => ({ ...settings })
  };
}
