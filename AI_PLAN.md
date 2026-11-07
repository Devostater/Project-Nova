# AI Team Plan

How the owner, Claude, GPT/Codex, Gemini/AI Studio and the 3D tools work on Project Nova together without overwriting each other. Rules: [AI_WORKFLOW.md](AI_WORKFLOW.md). Live claims: [AI_STATUS.md](AI_STATUS.md). Art rules: [ASSET_SPEC.md](ASSET_SPEC.md).

## Why lanes

Almost the whole game is one ~17,000-line file (`public/standalone.html`, mirrored in `standalone.html` and `index.html`). Two AIs editing it at once, or one copying an old snapshot over it, silently deletes the other's work. That has happened twice. So:

- **Only one AI holds the game file at a time.** It is claimed in `AI_STATUS.md` and released when done. Claude holds it by default.
- **Everyone else works in separate files** that are reviewed and then plugged in.

## Lanes

| Lane | Default AI | Works in | Does not touch while another AI holds it |
|---|---|---|---|
| Game code and integration | **Claude** | `public/standalone.html`, `standalone.html`, `index.html` | — |
| Feature modules (parallel coding) | **Any AI**, one module each | `public/modules/<feature>.js` (new files) | the game files |
| Code review | **Gemini Code Assist** (free GitHub app) | PR reviews | the game files |
| Tooling and docs (optional) | **GPT / Codex** (only if the owner has a paid ChatGPT plan) | `tools/`, `sw.js`, docs | the game files |
| 2D art | **Gemini / AI Studio** | `public/fx/`, `public/art/`, `Concept art/` | any code |
| 3D models | **Tripo / Blender** (+ Claude Desktop with Blender) | `public/models/` and `manifest.json` via `optimize_nova` | any code |
| Decisions, merges, Quest testing | **Owner** | — | — |

### Taking turns on the game file

Any AI may code in the game file when it **claims** it in `AI_STATUS.md`, works on its own branch, and **releases** it in its handoff. While it is claimed, nobody else edits it.

### Parallel coding with modules

To work at the same time as the game-file owner, write the feature as a **separate ES module**:

1. Create `public/modules/<feature>.js` that exports `init(nova)`. `nova` is the game API object (scene, camera, player, events) that Claude adds to the game file.
2. Don't edit the game files. Note in your PR the one line needed to load the module.
3. Claude (or whoever holds the game file) reviews it, adds the load line and tests it.

Until the `nova` API exists (see Phase 2), modules can only use the `window.*` globals the game already exposes (e.g. `window.NOVA_VFX`, `window.NFM`).

### A4 module API and loader

The runtime exposes `window.nova` with `THREE`, `scene`, `camera`, `cameraRig`, `renderer`, `shipGroup`, `sound`, and `toast(message, duration, color)`. Modules can register frame work with `nova.onTick(fn)`; the callback receives delta time in seconds. Event modules use `nova.on(name, fn)` and `nova.emit(name, payload)`. Both registration methods return an unsubscribe function. Events available to feature modules include `shipDestroyed`, `missileLaunched`, `missileImpact`, and `salvageStowed`; the feature integration emits these at the owning gameplay hook.

The loader fetches `modules/manifest.json` relative to the running standalone build, then imports each listed JavaScript file and awaits its `init(nova)` export. A module may return an instance, stored in `nova.modules`. Root-hosted and `public/` builds keep matching `modules/` copies and service-worker cache entries. Add every new module to both manifests and both cache lists until a generated manifest workflow exists. The A4 `demo.js` logs `[NOVA module] demo ready` when loaded.

### Never do

- Copy a whole file from an older copy, another build, or another tool over a newer one. Merge changes instead.
- Use AI Studio's "sync to GitHub" or "export to GitHub" for code. It replaces whole files; use it for images only.
- Commit to `main`, force-push, or merge without the owner asking.

## Phases

### Phase 1: Foundation (Claude) ✅ in this PR
- Add the missing `public/vendor` files for three.js r187 (`three.core.js`, `GLTFLoader`, `BufferGeometryUtils`, `SkeletonUtils`), so GLB models load in the web/Vite build.
- Add `ASSET_SPEC.md`, this plan, and multi-claim `AI_STATUS.md`.

### Phase 2: Parallel work
- ~~**Claude:** fix the sprite-sheet rendering from PR #3~~. Done in PR #3: clean textures in `public/fx/`, one atlas frame at a time, capped explosion layers.
- **Claude:** add the `nova` module API and the `public/modules/` loader.
- **Gemini / AI Studio:** remake the 5 VFX sheets and add missing effects to `ASSET_SPEC.md`.
- **Tripo / Blender:** next ships and stations to spec.
- **Gemini Code Assist:** reviews every PR automatically (free). Codex is optional and needs a paid ChatGPT plan.

### Phase 3: Integration loop (repeats)
1. An asset or module lands on its own branch.
2. Claude wires it in and tests it in headless Chromium.
3. Gemini Code Assist reviews.
4. The owner tests on the Quest and merges.

## Prompts for the other AIs

Paste these to start each AI. Fill in the bracketed parts.

**GPT / Codex: review**
```
You're working on github.com/Devostater/Project-Nova. Claude is the primary AI.
Read AI_WORKFLOW.md, AI_PLAN.md, AI_STATUS.md, AI_CONTEXT.md and ASSET_SPEC.md on main first.
Your lane: code review and tooling. Don't edit public/standalone.html, standalone.html or
index.html unless AI_STATUS.md shows them free and you claim them first.
Task: review pull request #[N]. Look for bugs, VR/Quest performance problems, and anything that
breaks gamepad, tablet, 2D or VR modes. Comment on the PR; don't push to its branch.
```

**GPT / Codex: feature module (parallel coding)**
```
You're working on github.com/Devostater/Project-Nova. Read AI_WORKFLOW.md, AI_PLAN.md and AI_STATUS.md first.
Claim this task in AI_STATUS.md, then work on branch codex/[feature].
Task: [feature]. Write it ONLY as a new file public/modules/[feature].js that exports init(nova).
Do not edit the game files. In your PR, give the one line Claude should add to load it,
and how to test it. Record a handoff in AI_STATUS.md when done.
```

**Gemini / AI Studio: art (images only)**
```
You're making 2D art for Project Nova, a WebXR space-flight sim
(github.com/Devostater/Project-Nova). Follow ASSET_SPEC.md exactly.
Images only: don't write code and don't sync or export the app to GitHub.
Task: [effect from the ASSET_SPEC effect list], e.g. vfx_explosion_large_8x8.png:
2048x2048 PNG, 8x8 equal frames, NO grid lines or borders, pure black background,
centered with padding, fading fully to black by the last frame.
```
The owner then uploads the PNG to `public/fx/` on a branch and tells Claude.

**Tripo / Blender: 3D model**
```
Model a [ship type] for Project Nova, a VR starfighter sim seen up close from a Quest 3 cockpit.
Real-world size: [e.g. 20 m long pirate raider]. Hard-surface sci-fi, clear silhouette.
Game-ready: under [budget from ASSET_SPEC.md] triangles, PBR materials, textures 1024px max.
+Y up, nose toward -Z, origin at the center of mass. Export GLB.
```
Then name the file to match `optimize_nova.py`, run `optimize_nova.bat`, and upload the result to `public/models/` on a branch.

## Automating handoffs

Both review AIs are connected through GitHub apps. Claude (or the owner) triggers them with a PR comment:

| AI | Trigger in a PR comment | Repo config | Setup (owner, one time) |
|---|---|---|---|
| **Codex (GPT)** | `@codex review`, or `@codex <task>` to start a task | `AGENTS.md` | chatgpt.com/codex: connect GitHub, allow this repo, turn on Code review |
| **Gemini Code Assist** | `/gemini review`, `/gemini summary`, or `@gemini-code-assist <question>` | `.gemini/config.yaml`, `.gemini/styleguide.md` | Install "Gemini Code Assist" from GitHub Marketplace on this repo |

Gemini also reviews each new PR automatically; Codex reviews when asked, unless automatic reviews are turned on in its settings.

**APIs:** the `project-nova` Claude environment has a Gemini API key (network secret on `generativelanguage.googleapis.com`). Image generation needs billing on that Google project; text calls are free-tier. An OpenAI or Tripo key could be added the same way.
