// RETRO 2002: optional late-90s / early-2000s animated sci-fi look (OPTIONS → RETRO 2002, or the Construction Bay).
// Works the same on PC and Quest because it lives inside the materials, not in post-processing (post is off in VR):
//   lit materials (Standard / Physical / Lambert / Phong / Toon): light falls into 4 cel-paint bands, a dark ink line on
//     silhouettes, a thin rim light, and a colour grade (crushed blacks, blue shadows, warm orange highlights)
//   cockpit screens (canvas-drawn panels on the ship / rig): CRT scanlines, edge vignette, phosphor glow
// A material is patched the first time the look is switched on (one recompile); after that ON/OFF and the strength are
// a shared uniform, so toggling costs nothing. Materials created later are picked up by a slow scan of the scene.
const KEY = 'novaRetroV1';
export function init(nova) {
  const T = nova && nova.THREE; if (!T) return { ready: false };
  const scene = nova.scene;
  const ld = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const S = Object.assign({ on: false, amt: 1, bands: 4, crt: 1 }, ld() || {});
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
  const U = { uRetro: { value: 0 }, uRetroBands: { value: S.bands }, uRetroRim: { value: new T.Color(0x7fc8ff) }, uRetroInk: { value: 0.7 } };
  const CRT = { value: 0 };
  const LIT = new Set(['MeshStandardMaterial', 'MeshPhysicalMaterial', 'MeshLambertMaterial', 'MeshPhongMaterial', 'MeshToonMaterial']);
  const RETRO_GLSL = `
  {
    // cel bands: quantize a compressed brightness, then scale the colour to match
    float nrL = max(max(outgoingLight.r, outgoingLight.g), outgoingLight.b);
    if (nrL > 0.0001) {
      float nrX = nrL / (1.0 + nrL);
      float nrQ = clamp(floor(nrX * uRetroBands + 0.35) / uRetroBands, 0.0, 0.92);
      float nrB = max(nrQ / (1.0 - nrQ), nrL * 0.45);
      outgoingLight *= mix(1.0, nrB / nrL, uRetro);
    }
    // ink on silhouettes + rim light
    vec3 nrV = normalize(vViewPosition);
    float nrF = 1.0 - clamp(abs(dot(normalize(normal), nrV)), 0.0, 1.0);
    float nrInk = smoothstep(0.80, 0.93, nrF);
    float nrRim = smoothstep(0.45, 0.78, nrF) * (1.0 - nrInk);
    outgoingLight *= 1.0 - uRetroInk * nrInk * uRetro;
    outgoingLight += uRetroRim * nrRim * 0.16 * uRetro;
    // grade: blue shadows, warm highlights, crushed blacks
    float nrLum = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
    vec3 nrG = outgoingLight * mix(vec3(0.80, 0.93, 1.22), vec3(1.14, 0.98, 0.80), smoothstep(0.05, 0.65, nrLum));
    nrG = max(nrG - 0.01, 0.0) * 1.01;
    outgoingLight = mix(outgoingLight, nrG, uRetro);
  }
  #include <opaque_fragment>`;
  function patchLit(m) {
    if (m.userData.nvRetro) return; m.userData.nvRetro = 1;
    const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : null;
    m.onBeforeCompile = function (sh, r) {
      try { if (prev) prev.call(this, sh, r); } catch (e) { }
      if (!sh.fragmentShader.includes('#include <opaque_fragment>') || !/varying vec3 vViewPosition/.test(sh.fragmentShader)) return;
      Object.assign(sh.uniforms, U);
      sh.fragmentShader = 'uniform float uRetro;\nuniform float uRetroBands;\nuniform vec3 uRetroRim;\nuniform float uRetroInk;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', RETRO_GLSL);
    };
    m.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|nvRetro';
    m.needsUpdate = true;
  }
  function patchCrt(m) {
    if (m.userData.nvCrt) return; m.userData.nvCrt = 1;
    const img = m.map && m.map.image, lines = { value: Math.max(60, Math.round(((img && img.height) || 512) / 4)) };
    const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : null;
    m.onBeforeCompile = function (sh, r) {
      try { if (prev) prev.call(this, sh, r); } catch (e) { }
      if (!sh.fragmentShader.includes('#include <map_fragment>')) return;
      sh.uniforms.uCrt = CRT; sh.uniforms.uCrtLines = lines;
      sh.fragmentShader = 'uniform float uCrt;\nuniform float uCrtLines;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      #ifdef USE_MAP
      {
        float ncS = 0.5 + 0.5 * sin(vMapUv.y * uCrtLines * 6.2831853);
        vec2 ncE = vMapUv - 0.5;
        float ncV = clamp(1.0 - dot(ncE, ncE) * 1.2, 0.55, 1.0);
        vec3 ncC = diffuseColor.rgb * (0.80 + 0.20 * ncS) * ncV;
        ncC += diffuseColor.rgb * diffuseColor.rgb * 0.22;
        diffuseColor.rgb = mix(diffuseColor.rgb, ncC, uCrt);
      }
      #endif`);
    };
    m.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|nvCrt';
    m.needsUpdate = true;
  }
  const isCockpit = o => { for (let p = o; p; p = p.parent) if (p === nova.shipGroup || p === nova.cameraRig) return true; return false; };
  let patched = 0;
  function scan() {
    scene.traverse(o => {
      if (!o.isMesh || !o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        if (!m || m.userData.nvRetro || m.userData.nvCrt) return;
        if (LIT.has(m.type)) { if ((m.transparent && m.opacity < 0.97) || m.transmission > 0 || m.blending === T.AdditiveBlending) return; patchLit(m); patched++; }   // glass and glows stay as they are
        else if (m.type === 'MeshBasicMaterial' && m.map && m.map.isCanvasTexture && isCockpit(o)) { patchCrt(m); patched++; }
      });
    });
  }
  function apply() { U.uRetro.value = S.on ? S.amt : 0; U.uRetroBands.value = S.bands; CRT.value = S.on ? S.crt * Math.min(1, S.amt + 0.2) : 0; if (S.on) scan(); }
  function set(on) { S.on = on === undefined ? !S.on : !!on; save(); apply(); try { nova.toast && nova.toast('RETRO 2002 LOOK: ' + (S.on ? 'ON' : 'OFF'), 1800, '#ff8a2a'); } catch (e) { } return S.on; }
  function strength(v) { S.amt = Math.max(0, Math.min(1, Number(v))); save(); apply(); return S.amt; }
  function bands(v) { S.bands = Math.max(2, Math.min(8, Math.round(Number(v) || 4))); save(); apply(); return S.bands; }
  let acc = 0;
  const off = nova.onTick ? nova.onTick(dt => { if (!S.on) return; acc += dt || 0; if (acc > 3) { acc = 0; scan(); } }) : null;
  apply();
  const api = { ready: true, set, strength, bands, get on() { return S.on; }, get amt() { return S.amt; }, get state() { return { ...S, patched }; }, dispose() { off && off(); } };
  window.novaRetro = api;
  window.novaTest = Object.assign(window.novaTest || {}, { retro: () => api.state });
  return api;
}
