# Project Nova Context

> **Purpose:** Portable project memory for ChatGPT, Google Antigravity, Google AI Studio, and future development agents.
> **Last reviewed:** 2026-11-06
> **Repository:** https://github.com/Devostater/Project-Nova
> **Working branch for this document:** `migration/context-bootstrap`
> **Default branch at review:** `main`

## 1. Project identity

**Project Nova** is a 6DOF WebXR starfighter / space-flight simulator. The repository metadata describes it as a standalone 6DOF Newtonian WebXR simulator with HOTAS cockpit controls, Proportional Navigation dogfighting AI, branching wingman communications, and tractor-beam station docking.

The project's broader goal is to support both:
- A browser-based experience, including WebXR where supported.
- A standalone experience suitable for Meta Quest 3 workflows.

Do not assume that a browser build and a native Quest APK are the same deliverable. As of the 2026-11-04 project discussion, a native Quest APK had **not** been built.

## 2. Product and design direction

### Confirmed direction
- Target headset: **Meta Quest 3**.
- Support both browser and standalone application formats.
- Preserve the earlier / original 3D cockpit simulator as a separate build while developing the Quest 3 WebXR stage.
- Project progression discussed on 2026-11-04:
  - **Stage 2:** larger 3D cockpit simulator.
  - **Stage 3:** Quest 3 WebXR support.
- Do not discard earlier working versions when experimenting with newer implementations.

### Current capability claims to verify against implementation
The repository metadata and commit history describe:
- 6DOF Newtonian flight.
- HOTAS support.
- 3D radar.
- Proportional Navigation dogfighting AI.
- Wingman communications with branching dialogue.
- Tractor-beam docking.
- Tablet virtual flight controller with dual analog sticks, throttle track, and action buttons.
- Device detection and optional VR/passthrough rather than mandatory VR startup.

These are project descriptions and commit claims, not a completed QA report. Verify each capability in the current source before treating it as working.

## 3. Technology and repository inventory

### Verified package configuration
- React 19
- Vite 8
- Three.js 0.187
- Cannon-es 0.20
- Google GenAI SDK (`@google/genai`)
- Firebase 13
- Express 4
- Tailwind CSS 4
- Motion
- Lucide React
- TypeScript tooling

Package scripts:
- `npm run dev`: Vite on port 3000, host 0.0.0.0
- `npm run build`: production build
- `npm run preview`: Vite preview
- `npm run lint`: `tsc --noEmit`
- `npm run clean`: removes dist and server.js

### Current tracked tree observed on 2026-11-06
```
.
├── .gitignore
├── README.md
├── index.html
├── metadata.json
├── package.json
└── public/
    ├── assets/
    │   └── aistudio/
    │       ├── standalone_2c263d49.html
    │       ├── standalone_34636a7c.html
    │       └── standalone_fae5c9c7.html
    ├── manifest.json
    ├── standalone.html
    └── vendor/
        ├── cannon-es.js
        └── three.module.js
```

The root `index.html` is approximately 1.08 MB. `public/standalone.html` is approximately 1.08 MB. Three saved AI Studio HTML snapshots are tracked under `public/assets/aistudio/`. This is currently a very small repository tree with a large amount of application code concentrated in HTML files. Inspect the actual source before recommending a refactor; preserve a known-working build first.

The README currently contains only a short project label and description. `metadata.json` identifies the project as “Project Nova — 6DOF WebXR Starfighter Simulator” and lists a server-side Gemini API capability.

## 4. Recent Git history observed

Default branch: `main`

Head commit on 2026-11-06:
- `53e0bf27f2d507431c26412b795ee5ac8bdd704a`
- Message: **Fix nmFrame reference error**

Recent preceding commits include:
- `18a11a1`: Add mapped tablet virtual flight controller with dual analog sticks, throttle track and action buttons.
- `2d62a03`: Remove mandatory VR/passthrough, add automatic device detection, streamline main menu.
- `ee5460d`: Update repository origin configuration and add repo archive download.
- `f09c2e9`: Add Meta Quest connection helper and GitHub collaboration guide.
- `ce03c13`: Project Nova Alpha 1.0 - 6DOF WebXR Starfighter Sim with HOTAS, 3D radar & AI collaboration support.
- `c24fd83`: Initial commit.

Only the `main` branch was visible during this inventory. It was not protected at the time of inspection.

## 5. Quest 3 / WebXR history and lessons

Prior project work on 2026-11-04 established:
- The target headset is Meta Quest 3.
- WebXR immersive VR requires a secure context (HTTPS), except for browser-recognized localhost contexts.
- A previous Quest-oriented bundle included a VR entry button, stereo rendering, PWA manifest/service-worker work, and vendor assets.
- A previous implementation had two reported issues:
  1. An asynchronous `isSessionSupported()` check could consume the user-gesture timing needed to request an immersive session.
  2. A forced HTTPS port 8443 caused hosting friction.
- The prior correction was referred to as `project_nova_quest3_fixed.html` / bundle. Keep the vendor assets with the build and compare against the last known working version before replacing anything.
- A local Python server plus a secure tunnel (Cloudflare was discussed) was suggested for testing from the headset.
- Native Quest APK packaging was not completed as of that discussion.

Treat these as historical notes. Re-test on the actual Quest 3 browser/runtime and current source before assuming the fixes remain present.

## 6. Historical design decisions and preservation rules

1. Keep the Stage 2 larger 3D cockpit simulator as a separate build while Stage 3 WebXR work continues.
2. Support both browser and standalone formats.
3. Do not make VR or passthrough mandatory at initial application launch; detect device capability and let the user enter VR deliberately.
4. Keep the last known working HTML versions and AI Studio snapshots available for comparison.
5. Preserve conversation history, screenshots, source attachments, brainstorming, failed experiments, and abandoned approaches. Do not silently replace historical ideas with current decisions.
6. Label knowledge by status: **current**, **implemented**, **planned**, **experimental**, **superseded**, **abandoned**, or **unverified**.
7. Never treat a commit message or metadata description as proof that a feature works.

## 7. AI collaboration and integration

The project uses Google's AI ecosystem, including Google AI Studio / Gemini. The package includes `@google/genai`, and the project metadata indicates a server-side Gemini API capability.

For Google Antigravity and other coding agents:
- Read this file before editing.
- Inspect the current working tree and recent commits before proposing changes.
- Identify the current build and last known working version.
- Make small, isolated changes.
- Explain which files are affected and why.
- Run available checks (`npm run build`, and `npm run lint` where practical).
- Report test coverage honestly, especially when physical Quest hardware is not available.
- Never commit secrets, API keys, access tokens, or private credentials. Use environment variables and document required variable names without recording values.
- Do not rewrite or reorganize the large HTML application as a first step. First establish behavior and regression tests.

## 8. Migration archive plan

The complete project archive is intentionally broader than the Git repository. Preserve all project-related ChatGPT conversations, original exports, attachments, images, screenshots, design notes, and AI Studio versions.

Recommended archive layout:
```
PROJECT_NOVA/
├── 00_OVERVIEW/
│   └── PROJECT_NOVA_CONTEXT.md
├── 01_SOURCE_CODE/
│   └── GitHub repository reference and snapshots
├── 02_ARCHITECTURE/
├── 03_CONVERSATION_ARCHIVE/
│   ├── Original_Exports/
│   ├── Chronological/
│   └── Attachments/
├── 04_BRAINSTORMING/
├── 05_IMAGES_AND_ASSETS/
├── 06_DECISIONS_AND_HISTORY/
│   ├── Approved/
│   ├── Implemented/
│   ├── Superseded/
│   └── Abandoned/
├── 07_TASKS_AND_ROADMAP/
├── 08_PROJECT_MEMORY/
├── 09_ANTIGRAVITY/
└── 10_INTEGRATIONS/
```

**Archive integrity rule:** Original conversation exports and original assets are immutable source material. AI-generated summaries, extracted decisions, indexes, and embeddings belong in separate derived folders and must link back to their source conversation or file.

### Current migration status
- [x] GitHub repository access confirmed.
- [x] Repository metadata, root tree, package configuration, metadata, branch, and recent commit history inventoried.
- [x] Initial project context document drafted and merged into `main`.
- [x] Full source-code review and runtime/build verification (`npm run build` + `npm run lint`).
- [x] Reconciled Alpha 1.0 RC assets (`models/`, `VFX/`, `art/`, `music/`, `Alien/`, `EDF/`, `Pirate/`, `vendor/`) with the latest NOVA14 controls, tablet flight controller, gamepad menu navigation, 3D ship radar, and `NOVA_VFX` texture pipeline.
- [ ] Obtain complete ChatGPT conversation export for Project Nova.
- [ ] Import original conversation attachments and images.
- [ ] Build chronological conversation index and searchable project knowledge.
- [ ] Create Antigravity operating instructions and task/decision indexes.
- [ ] Define ongoing synchronization and backup process.

## 9. Resolved & Open Questions

- **Canonical HTML runtime (Resolved):** Root `index.html` (Vite entry point) and `public/standalone.html` / root `standalone.html` (1-file standalone builds with `./vendor/` importmap) are generated from root `standalone.html` (the single source) by `tools/sync_html.mjs` and form the canonical NOVA14 + `NOVA_VFX` runtime. Saved files under `public/assets/aistudio/` are historical checkpoints.
- **Implemented & Verified Features (Resolved):**
  - Automatic device detection (`window.novaDevice`) with non-mandatory VR/MR entry and streamlined main menu (`PLAY`, `OPTIONS & MODES`, `EXIT`).
  - Gamepad/controller navigation across main/options menus and in-flight 2D/tablet modes.
  - Mapped on-screen tablet virtual flight controller (`#tablet-controller`).
  - 3D Holo-Radar (`NH`) with 3D ship meshes and full assembly toggle (`window.novaRadarToggle`).
  - `NOVA_VFX` texture integration (`VFX/lasers.jpg`, `VFX/glows and flares.jpg`, `VFX/energy shields.jpg`, `VFX/explosion VFX1.jpg`, `VFX/lightning.jpg`) wired into player/faction lasers, shields, beams, tractor corridors, and multi-stage explosions.
- What server-side Gemini endpoints and environment variables are required for future AI wingman expansions?
- What is the intended boundary between the browser build, standalone web app, and any future native Quest APK package?

---

**Working principle:** Project Nova's code is the product; its conversation archive is the development memory. Preserve both, keep original evidence intact, and make the AI's derived understanding traceable to the source.

---

## AI Context: Absolute Zero Interactive Reference Library

This is the starting point for AI tools generating prompts, assets, game designs, scripts, descriptions, or project plans for Absolute Zero Interactive.

### Confirmed studio structure
- **Absolute Zero Interactive (AZI)** is the current **parent studio**, previously associated with the name Zero Horizon Music.
- **Mind Space** is AZI's sci-fi FPS game-development property.
- **Matrix** is AZI's cyberpunk AI character, DJ/media persona, and envisioned assistant.
- **Project Nova** is the WebXR starfighter/space-flight project in this repository. **Its relationship to Mind Space remains unconfirmed**; never assume they are the same game or share canon.

### Read these before generating
1. [PROJECT_NOVA_CONTEXT.md](PROJECT_NOVA_CONTEXT.md) for the reference map.
2. [Mind Space game bible](reference/mind-space/GAME_BIBLE.md) and [prompt guide](reference/mind-space/PROMPT_GUIDE.md) for FPS game work.
3. [Matrix character identity](reference/matrix/CHARACTER_IDENTITY.md), [personality/media](reference/matrix/PERSONALITY_AND_MEDIA.md), and [prompt guide](reference/matrix/PROMPT_GUIDE.md) for character, image, music, or assistant work.
4. [AZI studio identity](reference/azi/STUDIO_IDENTITY.md) and [brand guide](reference/azi/BRAND_GUIDE.md) for studio branding.
5. [Project Nova note](reference/mind-space/PROJECT_NOVA_NOTE.md) for repository-backed observations. Consult actual source files for current code behavior.

### Evidence and confidence labels
- **Owner-confirmed:** explicitly chosen by the creator (e.g., AZI parent-studio structure).
- **Owner-discussed direction:** established brainstorm/design intention, **not necessarily implemented or finalized** (e.g., Mind Space gameplay features; Matrix visual motifs).
- **Repository-observed:** supported by current source/assets, not necessarily final canon.
- **Proposed:** newly generated idea, pending approval.
- **Open:** unresolved; ask rather than invent.

### Non-negotiable generation rules
- Preserve project boundaries and historical naming.
- Never convert a proposed mechanic, character biography, logo, or marketing claim into established fact.
- Use **AZI** for current studio attribution, but preserve historical artist/release credits.
- Keep Mind Space's sci-fi FPS premise separate from Project Nova's WebXR flight-sim mechanics unless the owner confirms a link.
- For Matrix, preserve the owner-discussed female cyberpunk operative/DJ, purple/black, holographic headphones, and transmission aesthetic, while treating precise appearance and voice as open.
- For Mind Space, preserve the cryogenic station opening, repeat-run progression concept, and distinction between persistent unlocks and per-run upgrades.
- For any prompt, identify the property, output medium, desired scope, known anchors, exclusions, and any proposed additions.
- Never claim code is implemented, content published, or integrations live without verification.

### Maintenance
When the owner approves a new decision, update the relevant reference and index. For code behavior, check current repository state rather than treating this creative reference as a changelog.

## AZI Project Index

| Property | Role | Status | Primary reference |
|---|---|---|---|
| **Absolute Zero Interactive (AZI)** | Parent studio | Owner-confirmed | [Studio identity](reference/azi/STUDIO_IDENTITY.md) |
| **Mind Space** | AZI sci-fi FPS game property | Owner-confirmed property; owner-discussed design direction | [Game bible](reference/mind-space/GAME_BIBLE.md) |
| **Matrix** | AZI AI operative/DJ/media persona and envisioned assistant | Owner-confirmed property; owner-discussed character direction | [Character identity](reference/matrix/CHARACTER_IDENTITY.md) |
| **Project Nova** | WebXR starfighter/space-flight simulator in this repository | Repository-observed; relationship to Mind Space open | [Project Nova note](reference/mind-space/PROJECT_NOVA_NOTE.md) |

### Reference map
### AZI
- [Studio identity](reference/azi/STUDIO_IDENTITY.md)
- [Brand guide](reference/azi/BRAND_GUIDE.md)

### Mind Space
- [Game bible](reference/mind-space/GAME_BIBLE.md): cryo station premise, repeat-run loop, objectives, combat, progression, and open canon.
- [Prompt guide](reference/mind-space/PROMPT_GUIDE.md): game, art, and narrative prompt templates.
- [Project Nova note](reference/mind-space/PROJECT_NOVA_NOTE.md): separate repository observations and unresolved relationship.

### Matrix
- [Character identity](reference/matrix/CHARACTER_IDENTITY.md): cyberpunk operative/DJ identity and visual motifs.
- [Personality and media](reference/matrix/PERSONALITY_AND_MEDIA.md): media history, transmission themes, and open voice choices.
- [Prompt guide](reference/matrix/PROMPT_GUIDE.md): art, broadcast, and assistant templates.

### Evidence rules
**Owner-confirmed** means explicit decision; **owner-discussed** means creative intention, not necessarily final or implemented; **repository-observed** means current source/assets; **proposed** means not approved; **open** means unresolved. Do not merge these categories.

Start at [PROJECT_NOVA_CONTEXT.md](PROJECT_NOVA_CONTEXT.md) when onboarding an AI tool.
