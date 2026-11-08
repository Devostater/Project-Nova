# Graphics overhaul — standalone.html patch notes

Branch: `grok/graphics-overhaul`

## Changes prepared for standalone.html

1. **NOPT default** — `gfx: 'ultra'`, `forceUltra: true`
2. **After localStorage load** — `if (NOPT.o.forceUltra === undefined) NOPT.o.forceUltra = true;`
3. **OPTIONS menu** — new row **FORCE ULTRA: ON/OFF** (toggles flag; when ON sets gfx to ultra)
4. **NOPT_GFX** — added `ultra` preset: `{ pr: 2, xr: 1.5, fov: 0.1, fx: 1.5, label: 'ULTRA: max graphics (desktop)' }`

## Modules already committed on this branch
- `public/modules/postfx.js` + `modules/postfx.js` (bloom / vignette / grain / quality tiers)
- Upgraded `fx_ultra.js` (both trees) — higher ULTRA particle/light/debris counts
- Manifests updated to include `postfx.js`

## Still needed
- Wire `postfx.render()` into the main render loop
- Vendor Three.js postprocessing addons for offline/APK (CDN fallback works for browser testing)
- Desktop playtest of ULTRA, then Quest scaling

## How to test
1. Checkout `grok/graphics-overhaul`
2. Serve `public/` or open standalone after sync
3. OPTIONS → FORCE ULTRA should show ON
4. Blow things up / fly — richer VFX when forceUltra/gfx ultra
