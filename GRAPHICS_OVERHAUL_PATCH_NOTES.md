# Graphics overhaul (branch `grok/graphics-overhaul`)

## Status
Grok is temporary lead (Claude + ChatGPT at weekly limits).

## Already on branch
- `postfx.js` (public + root modules) — bloom, vignette, grain, quality tiers
- Upgraded `fx_ultra.js` — aggressive ULTRA particle/light/debris counts
- Manifests include `postfx.js`
- STATUS.md updated

## Apply FORCE ULTRA to standalone.html
From repo root:
```bash
patch -p0 < tools/patches/standalone_force_ultra.patch
# or apply the three hunks manually (NOPT default, forceUltra guard, OPTIONS row + NOPT_GFX ultra)
node tools/sync_html.mjs
```

Then test in browser. FORCE ULTRA should appear in OPTIONS and default ON.

## Still open
1. Wire postfx into main render loop
2. Vendor Three postprocessing addons for APK/offline
3. More VFX polish after desktop test
