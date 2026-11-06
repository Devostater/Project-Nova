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
- [x] Initial project context document drafted.
- [ ] Full source-code review and runtime/build verification.
- [ ] Inspect and compare all saved HTML versions.
- [ ] Obtain complete ChatGPT conversation export for Project Nova.
- [ ] Import original conversation attachments and images.
- [ ] Build chronological conversation index and searchable project knowledge.
- [ ] Create Antigravity operating instructions and task/decision indexes.
- [ ] Define ongoing synchronization and backup process.

## 9. Open questions for future investigation

- Which HTML file is the current canonical runtime: root `index.html`, `public/standalone.html`, or a saved AI Studio snapshot?
- Are the saved snapshots historical checkpoints, active alternatives, or exports from separate development stages?
- Which features in the metadata and commit messages are currently implemented and tested?
- What is the exact current WebXR entry flow and Quest 3 compatibility status?
- What server-side Gemini endpoints and environment variables are required?
- Is Firebase active in the runtime, and which services are used?
- What is the intended boundary between the browser build, standalone web app, and any future native Quest package?

---

**Working principle:** Project Nova's code is the product; its conversation archive is the development memory. Preserve both, keep original evidence intact, and make the AI's derived understanding traceable to the source.
