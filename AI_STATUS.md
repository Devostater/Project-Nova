# AI Work Status

## Current lead: Claude (from 2026-11-07, evening)

The owner handed the lead back to Claude after Claude's usage reset. Claude owns the three game files, integration and merges the owner approves. **GPT/Codex does the heavy lifting in modules, tools and docs** (jobs below); list any game-file hooks you need in your PR and Claude wires them.

**Claude, branch `claude/lead-polish` (PR open):**
- Fixed `main`: `novaRunTicks` used `novaTickHandlers` before it was initialised, so every frame threw and modules never loaded.
- Took #38 (GPT FPS flow + helmet HUD) and fixed a literal `\n` syntax error in `fps_core.js` that stopped it loading; camera now levels when you step out of the cockpit.
- Took #33 and wired it: Gemini missile plume on enemy and player missiles, faction-coloured engine glow on every ship. `novaTest.vfxShow()` spawns a pirate + missiles for a check.
- Checked headless: all 8 modules load, range enters/fires/exits, no page errors.

**Claude, branch `claude/cold-run-pass`:** Cold Run director in the game file. Menu button ❄ COLD RUN; intro beat completes; warp → 3-fighter ambush spawns; a heat core always drops and tractoring it advances the mission; a boardable derelict hauler (cyan beacon, in targets/COMMS) appears; COMMS DOCK or V boards within 150 m; Lantern dock triggers the crew line and finishes the run; mission objective shown in LOG; morality emits `moralityChanged`. Headless: all 9 beats to the end card, no errors. Test hooks `novaTest.coldRun()`, `coldAmbushWin()`, `coldStowCore()`, `coldNearDerelict()`.

## GPT/Codex jobs (in order; modules/tools/docs only)

Each job: own branch `gpt/<job>`, draft PR, `node --check` every module, `public/modules` = `modules`, both `sw.js` lists, handoff here.

1. **G1 Ship roster expansion (`modules/roster.js` + `optimize_nova.py`).** Register more ship variants from the existing GLBs in `public/Alien`, `public/EDF`, `public/Pirate` (e.g. pirate stealth, alien worker drone, spiked orb, EDF frigate-carrier) as new `NF_STATS`-style entries with distinct roles, colours and loadouts. Export `register(nova)` that adds them through `window.NF_STATS`/`NF_ASSETS`; Claude wires spawning. Owner will add new GLBs later: add an `optimize_nova.py` rule for each.
2. **G2 Faction emblems.** Move the owner's `EM v5.png`…`Emv10.png`, `emblem v2–v4.png` from the repo root to `public/art/emblems/` (+ root `art/emblems/`) with clean names, make 512 px PNG copies, and list in `OWNER_QUESTIONS.md` which emblem belongs to which faction (owner decides). Delete the stray root `three.module.js` / `GLTFLoader.js` (r170; the game uses r187 in `vendor/`) after asking the owner.
3. **G3 A15 save/load (`modules/save.js`).** One versioned save object (heat cores, morality + log, salvage, credits, Cold Run progress, interior/boarding counts); autosave on dock and on mission events; `nova.save()/load()/reset()`; a migration path for old localStorage keys.
4. **G4 VR hands (`modules/vr_hands.js`).** Rigged glove driven by XR joints; grip pose on controllers; hide joint spheres when loaded; cockpit stick/throttle grab must still work (see the owner's hands brief).
5. **G5 NOVA NET feed (`modules/novanet.js`)** from #37's ROADMAP: event-driven news articles with response windows. Data + UI canvas; Claude docks it into the right panel.
6. **G6 Cantina expansion brief.** Using `Concept art/` (bar, booth, stool), write the model list for Tripo with sizes/triangle budgets in `ASSET_BACKLOG.md` P4, and the cantina layout in `VERTICAL_SLICE.md`.

Open PRs: #37 (planning doc, ready), #9 (stale; owner may close).

> Read [AI_WORKFLOW.md](AI_WORKFLOW.md) before starting or taking over work.

## ▶ Owner away: work from `AI_QUEUE.md`

Each AI takes the next unclaimed card in its lane (A = GPT/Codex, B = Gemini, C = AI Studio), claims it under Active claims, works on its own branch and opens a draft PR. Claude's PR #11 is merged.

## ⚠ Read first: work from the latest GitHub `main`, never an old local copy

On 2026-11-07, GPT edited the **repo-root `standalone.html` from the owner's old local copy (Alpha 1.0 RC)** and pushed straight to `main`. That replaced Alpha 1.2 in that file (VFX pack, shield, gamepad and so on), and `public/standalone.html` and `index.html` were left unchanged and out of sync. Claude merged both sides as **Alpha 1.3** (branch `claude/merge-gpt-cockpit`). Before editing: pull `main`, edit **all three** game files the same way (or let Claude sync them), and use a branch and PR.

## Primary AI

**GPT/Codex** is the current lead under the owner’s 2026-11-07 handoff; the owner retains final authority.

## Game file

The game files (`public/standalone.html`, `standalone.html`, `index.html`) are held by **one AI at a time**.

**Held by:** GPT/Codex as lead. PR #38 changes FPS modules only; the three game files are unchanged.

## Active claims

Several AIs may hold claims at once, as long as their files don't overlap. Add a row before starting; remove it in your handoff.

| AI/tool | Task | Branch | Files / behavior owned | State | PR |
|---|---|---|---|---|---|
| GPT (ChatGPT) | Docking update | none (GPT can't push; owner pastes the result to Claude) | docking code only: `executeDocking`, `novaDock*`, `ndk*`, `novaAutoDockPress` | Active | — |


## Waiting for review / merge

| AI/tool | Work | PR | Notes |
|---|---|---|---|
| GPT/Codex | G2 faction emblem normalization | [Draft PR #42](https://github.com/Devostater/Project-Nova/pull/42) | Eight real 512px PNGs plus preserved emblem-02 source; owner mapping/conversion/loader-cleanup decisions recorded. |
| Gemini | Missile-plume and thruster-glow textures | [Draft PR #33](https://github.com/Devostater/Project-Nova/pull/33) | Four image files only: root and public mirrors; owner approval required before merge. |
| GPT/Codex | FPS flow, controls and helmet HUD | [Draft PR #38](https://github.com/Devostater/Project-Nova/pull/38) | Range exit, desktop/gamepad/Quest FPS input, helmet visor HUD, boarding lifecycle and drone combat coordinates; awaiting runtime review. |
| GPT/Codex | Territories and campaign scope plan | [Draft PR #37](https://github.com/Devostater/Project-Nova/pull/37) | Planning only; proposed factions, territory simulation, news, traffic, cinematics and full-release checklist. |
| Codex | Tablet touch HUD visibility | [Draft PR #21](https://github.com/Devostater/Project-Nova/pull/21) | Three game builds synced; waiting for review. |

## Done / handoffs

Newest first. Keep each entry short: what changed, the PR, checks run, and the next step.

- **GPT/Codex: G2 faction emblems** ([draft PR #42](https://github.com/Devostater/Project-Nova/pull/42), branch `gpt/g2-faction-emblems`). Replaces the nine inconsistent root upload names with mirrored neutral `art/emblems/` paths. Eight sources were converted from mislabeled 1024px WebP to real 512×512 PNGs (`emblem_03`–`emblem_10`); the blocked ninth source is preserved losslessly as `emblem_02_source.webp` pending an owner-provided or approved source. Both service workers cache the pack. Q17 asks for faction mapping, Q18 asks permission before deleting stray root r170 Three.js files, and Q19 records the missing conversion. Checks: PNG signature/dimensions, root/public blob identity, service-worker parity, LF/conflict markers. Not tested: browser/offline cache or device runtime. No game HTML/module changes. Next: owner/Claude reviews #42; GPT starts G3 on a separate branch.

- **GPT/Codex: FPS flow, controls, combat and helmet HUD** ([draft PR #38](https://github.com/Devostater/Project-Nova/pull/38), branch `gpt/fps-flow-hud`). Repairs the range EXIT door and all exit inputs; adds pointer-lock mouse look, keyboard/gamepad/Quest controller and hand input; adds a camera-mounted helmet visor HUD; unifies range/boarding entry and return; and places pooled drone combat in the correct interior coordinate space. Root/public copies of `fps_core.js`, `interior.js`, `fps_ai.js` and `boarding.js` match with LF endings. Static review only; browser, physical gamepad, tablet and Quest runtime were not tested. Next: play `?arena=range` and `?arena=boarding` in desktop/gamepad/Quest before merge.

- **GPT/Codex: lead handoff and module integration** ([PR #35](https://github.com/Devostater/Project-Nova/pull/35), merged as `406b4ed4a568bdfc6f563d70a9e67a08ea671986`, branch `gpt/integrate-modules`). PR #34 is merged. #24, #27, #29, #30, and #32 are also merged in the requested order, preserving the existing interior and morality modules. PR #35 adds module manifests/cache entries, A11 range movement, A5 drones, A12 BOARD, A14 mission events, phone/tablet-only touch controls, and desktop gamepad steering/actions. Checks: `node --check` on all eight module files, the A4 loader script, touch visibility handler, desktop gamepad poll, and flight input handler; LF, conflict-marker, game-file parity and manifest/cache checks passed. Not tested: browser/device runtime or mission progression. Next: owner approval to merge image-only #33, then wire missile plume/engine glow, A15 save/load, and VR hands.



- **Codex: A14 Cold Run mission/end card** ([draft PR #32](https://github.com/Devostater/Project-Nova/pull/32), branch `codex/a14-cold-run`). Adds mirrored `mission.js`, strict saved 9-beat progress/resume, mission statistics and a 2D/VR canvas end card. Q10 default: all beats in order, save each transition. How to test after integration: start `?mission=cold-run`, complete each beat in 2D/gamepad/Quest, reload mid-run, then close the end card. Checks not run: runtime, 2D, gamepad, tablet, Quest, automated. A12 emits boarding events; PR #28 supplies morality. PR #35 wires the mission events and manifest/cache entries. Next: Claude runtime test, then A15 save/load coverage.

- **Codex: A12 derelict boarding** ([draft PR #30](https://github.com/Devostater/Project-Nova/pull/30), branch `codex/a12-boarding`). Adds mirrored textured corridor and fusion-core choice; BOARD validates disabled+docked nearby wreck, E/gamepad A/right XR selects take, Q/gamepad B/left XR selects leave. PR #28 supplies the existing morality API; this pass adapts take/leave to `return`/`keep` and removes the duplicate PR #31 dependency. Emits boarding lifecycle events; airlock exit restores cockpit and pose. Q8 default: disabled+docked within 20 m; query mode for testing. How to test after integration: 2D WASD/E/Q, gamepad left stick/A/B, Quest left/right controller or hand input; confirm choice, saved counts and return. Checks not run: browser runtime, 2D, gamepad, tablet, Quest, automated. PR #35 adds the BOARD hook and module/cache entries. Next: Claude runtime test.

- **Codex: A5 enemy drones** ([draft PR #29](https://github.com/Devostater/Project-Nova/pull/29), branch `codex/a5-enemy-drones`). Adds two mirrored range drones cycling patrol → cover → shoot → retreat; firing uses pooled, slow bolts and routes player hits through `fps_core.damage`. Exposes manual `start()`/`stop()` for A12 boarding. Loads the existing ULTRA `alien_attack_drone.glb` with procedural fallback. Q7 default: keep the high-detail asset for ULTRA. How to test after integration: `?arena=range`; 2D WASD/click, gamepad left stick/right trigger, Quest aim/fire and dodge; confirm hits, retreat, and HP feedback. Checks not run: runtime, 2D, gamepad, tablet, Quest, automated. With A4/A11 now in main and A10 in PR #28, add `fps_ai.js` after interior/fps_core in both manifests and service-worker caches. Next: A12 boarding.

- **Codex: A11 on-foot controls** ([draft PR #27](https://github.com/Devostater/Project-Nova/pull/27), branch `codex/a11-fps-controls`). Adds mirrored `fps_core.js` for pistol/target hits, player HP and shield feedback, WASD/gamepad/XR controller and hand-tracking input; fixes pinch toggle and reuses per-frame scratch vectors. A4 loader and the PR #28 range are now in main; this integration pass loads `fps_core.js` after `interior.js`. How to test: 2D WASD/click targets; gamepad left stick/right trigger; Quest controller trigger/left stick and hand pinch/fist movement, then confirm Escape/door exits restore the cockpit. Checks not run: runtime, 2D, gamepad, tablet, Quest, automated. Next: A5 enemy drones.

- **Codex: A4 Module system** ([draft PR #24](https://github.com/Devostater/Project-Nova/pull/24), branch `codex/a4-module-system`). Added `window.nova`, tick and event subscriptions, manifest-driven loader, mirrored demo/manifest files, offline cache entries, and API docs; Q3 defaults to the firing range for this vertical slice. Checks: mirror parity confirmed for three builds, mirrored modules and service workers. Not run: runtime, gamepad, tablet, Quest/offline. Next: merge/review A4, then A10 interior/range; A10 module can be prepared against the documented API meanwhile.

- **Codex: tablet touch HUD visibility** ([draft PR #21](https://github.com/Devostater/Project-Nova/pull/21), branch `codex/tablet-touch-hud`). The DOM HUD overlay and version badge are hidden while tablet touch controls are active; auto device detection and manual toggle both update the state. All three game files are synchronized. How to test: on desktop compare controls off/on; on tablet enable and disable touch controls and confirm the HUD follows the state. Checks not run: browser runtime, automated, tablet, gamepad, Quest. Next: review PR #21.

- **Codex + Claude: A3 missile trails + explosion upgrade** (`claude/fx-ultra-wire`, built on `codex/fx-ultra`). Codex wrote `public/modules/fx_ultra.js` (pooled trail and explosion particles, tiers low/mid/high/ultra, Quest forced to low) and ran out of usage before wiring it in. Claude loads it with a dynamic `import()` (copied to root `modules/` for the PC servers, added to the offline cache), feeds **live** missile positions every `nmFrame` (enemy `NF.msl` and player `activeMissiles`; velocity from frame-to-frame motion, because the module dead-reckons and homing missiles turn), stops trails on impact, and adds module explosions from `novaBoom` and missile impacts **except on the low/Quest tier**. Checks: `node --check` on both; headless root and public builds load tier HIGH, fire missiles and explosions, no errors. Not checked: the look in the headset.
- **Claude: Alpha 1.4 demo polish** (`claude/demo-polish`). Heat cores are listed in CARGO and sellable at every market; the gamepad View/Back button triggers TRACTOR; version Alpha 1.4, cache `nova-alpha-1.4`; `TESTING.md` demo checklist. Audit: headless runs of both builds (all panel tabs, keys, salvage, music) showed **0 errors, warnings or 404s**. **Perf risk for Quest:** flight scene about **282 draw calls, 772k tris, 607 visible meshes, 365 materials, 5 lights** (budget about 150 calls / 300k tris). That's card A7: merge static cockpit meshes, share materials, LOD/cull distant ships and asteroids. Note: commit 6eeda36's message says it adds arena textures, but it only added the station logos.
- **Claude: salvage drops + TRACTOR (AI_QUEUE A2)** (`claude/modules-salvage`). Faction kills drop salvage pods (fighters 25%, big ships 60% ×2, bosses 100% ×3; at most 8 in space; despawn after 120 s). Contents: salvage, credits, ore, missiles, flares, shield caps, or a **heat core** (rare; more likely from big ships; counted in `localStorage.novaHeatCores`). Pods appear as grey `salvage` contacts in the target cycle, holo-radar and COMMS list. Lock one, then **TRACTOR** (a COMMS pad that appears only when a pod is locked, or **G** on keyboard) pulls it in within 500 m. Test hooks: `novaTest.salvage()`, `.lockSalvage()`, `.salvageState()`. Built inline, not yet as a module (A4 still open). Checks: `node --check`; headless spawn → lock → tractor stows a heat core, no errors. Not checked: COMMS-list display on Quest, gamepad binding.
- **Claude: cockpit tweaks** (`claude/cockpit-tweaks`, owner requests). The right-dash 3D radar moved inward (x 0.28 → 0.19, slightly lower and closer); right side panel scale 0.86 → 1.0 (left unchanged); the music page has 5 stations (NOVA-1 FM soundtrack with AUTO, SYNTHWAVE 88, DEEP SPACE RADIO, PIRATE RADIO, OBI'S MIX), 6 new synth tracks with per-track waveform and gain, and working touch controls on the right panel (◀/▶ station, PREV / PLAY-PAUSE / NEXT, VOL −/+, RANDOM, AUTO; the right panel had no pad hit zones, so the old music pads couldn't be pressed). Warp: 600 star streaks in a 12–80 m tube that stretch with warp and fly past per star (`novaWarpFxTick`); GPT's starfield dots were sub-pixel and moved as one block. Checks: `node --check`; headless Chromium: music API, stations, track step and volume work, the music page renders, the right panel is at 1.0, warp streaks render, no errors. Warp and radar reach not checked on Quest.
- **Claude: Alpha 1.3, GPT cockpit work merged with Alpha 1.2** (`claude/merge-gpt-cockpit`). GPT's 18 commits on `main` (crew/fleet tab, VR-sized SYSTEM buttons, joystick deadzone, throttle grip, COMMS→chat, right-dash radar with split zoom, clean warp starfield, Obi gated behind purchase, cargo scrolling, objective shortcut) started from 74ed760. Three-way merged onto Alpha 1.2. All non-panel Alpha 1.2 work is kept (Gemini VFX pack, shield hex, gamepad/tablet, laser impacts, explosion caps, clean sky). In the panel section (`const NP = {` to `nmkIcon`), **GPT's version is taken whole**, so AI Studio's STORY tab and SYSTEM card grid are dropped, with no dangling references. Claude's unfinished LEFT/HIGH radar toggle is shelved (GPT's right-dash placement kept; stash `claude radar-toggle WIP`). All three files are synced; version Alpha 1.3, cache `nova-alpha-1.3`. Checks: `node --check`; headless Chromium from the repo root and `public/` (Alpha 1.3, panels built, every VFX texture loads, no 404s or errors). Not tested on Quest.
- **Claude: warp lines removed, see-through holo-radar** (`claude/alpha-1.2`, owner request). The 1,000 warp streak lines are no longer added to the scene (they ran through the cockpit and converged over the consoles); the hyperspace star particles and backdrop remain. The 3D holo-radar is fainter (sphere, disc, rings, sweep, stalks, mini ships) and its emitter cone is off. Its position is waiting on the owner's choice. Checks: `node --check`; headless Chromium screenshot shows the telemetry screen readable through the radar.
- **Codex + Claude: laser impacts, flight-log wording, clean skybox** (PR #9 integrated into `claude/alpha-1.2`). Codex added localized laser-hit flares and sparks (`novaVfxLaserImpact`) and reworded campaign objectives and flight-log headings, and found the pole-seam streaks in `sky.jpg`. Its push converted all three game files to CRLF (about 36k changed lines for a 33-line change), so Claude merged only the real lines with LF endings, swapped in the clean `art/sky_v014_backup.jpg` as `sky.jpg`, and added `.gitattributes` to keep LF from now on. Checks: three-way merge without conflicts; headless Chromium.
- **Claude: Gemini VFX pack** (branch `claude/alpha-1.2`). Seven Gemini source images (`art_src/gemini/`: fireball, smoke, sparks, laser, muzzle, engine, warp) built into game textures by `tools/vfx_build.py`. In game: a 2048 px 8×8 explosion (fireball → smoke) and grayscale laser, flare and spark. Delivered but not wired yet: small hit burst, muzzle sheet, engine glow, warp streaks. `vfx_cut.py` now only makes lightning and the legacy shield cell. Checks: headless Chromium from the repo root and `public/` (all textures load, rendered in front of the camera, explosions run, no 404s or errors).
- **Google AI Studio + Claude: side panel layouts** (branch `claude/alpha-1.2`). AI Studio ran out of usage, so the owner uploaded its `standalone.html`. It was based on 642938b and changed only the panel/UI code (`np*` panels, gestures, keyboard `novaKb*`, `novaChoice*`). Claude three-way merged it onto the shield branch with no conflicts, kept all later fixes (VFX, fx/, shield hex, gamepad), restored the import map, and set the version to Alpha 1.2 (cache `nova-alpha-1.2`). Checks: `node --check`; headless Chromium shows the side panels, with no 404s or errors.
- **Claude: Gemini shield texture** (branch `claude/shield-hex`). First asset generated through the Gemini API (`gemini-3.1-flash-image`): a seamless 1024 px hex shield, stored grayscale (387 KB) in `public/fx/` and `fx/`. It replaces the 128 px hex on the shield dome, shield hits and drone rings; offline cache bumped to `nova-alpha-1.1b`. Only the NOVA_VFX texture map and shield repeat lines changed. Checks: headless Chromium (loads at 1024², no 404s or errors, rendered on a dome).
- **Claude: Alpha 1.1** (PR #5). Version bump, offline cache `nova-alpha-1.1` (now includes `vendor/three.core.js`, `SkeletonUtils.js` and `fx/`), root `fx/` textures for the PC servers, `TESTING.md`, `ASSET_BACKLOG.md`, and a manual GitHub Pages deploy workflow. Checks: headless Chromium serving both the repo root and `public/` (textures and models load, no 404s or errors). Next: the owner pulls in GitHub Desktop and runs `TESTING.md` on PC and Quest; then Claude merges AI Studio's panels and GPT's docking into Alpha 1.2.
- **Claude: Phase 1 foundation** (PR #4, merged). three.js r187 vendor files so GLB models load in the web build; `ASSET_SPEC.md`, `AI_WORKFLOW.md`, multi-claim status; `AGENTS.md` and `.gemini/` review configs. Checks: headless Chromium (models load, no 404s).
- **Google AI Studio Build + Claude: VFX texture pack** (PR #3, merged). AI Studio wired VFX into weapons, shields, beams and explosions and reconciled Alpha 1.0 RC with NOVA14. Claude restored the dropped import map, cut clean textures into `public/fx/` (`tools/vfx_cut.py`), made explosions play one atlas frame at a time and capped explosion layers for Quest. Checks: headless Chromium. Still needs an owner test on the Quest.
- **Claude: restore lost features** (PR #1, merged). Restored gamepad input, the tablet controller and device detection after the Alpha 1.0 RC push overwrote them. Checks: `node --check` and a headless Chromium run.
- **Codex: AI handoff workflow** (PR #2, merged). Added `AI_WORKFLOW.md`, `AI_STATUS.md` and `CLAUDE.md`.

## How to claim work

1. Check the latest `main` and open PRs. Make sure nobody holds the files you need.
2. Add a row to **Active claims**: AI/tool, task, branch, files, state (Active / Paused / Handoff), PR.
3. If you need the game file and it says **Nobody**, put your name there.
4. When you pause or finish, remove your row, release the game file if you held it, and add a short entry to **Done / handoffs** (or **Waiting for review** if a PR is open). Include the branch or PR, files changed, checks run, and the exact next step.

## Claude — 2026-11-07 — `claude/combat-warp` (PR #25, draft)
- Done: warp tunnel texture + round warp stars, pirate missile models, frigate missiles, VR combat pacing (NF_STATS scaling after the table).
- Files: standalone.html (all 3 copies), sw.js (both), fx/vfx_warp_tunnel.jpg (both). Check run: node --check, headless load with no errors.
- Next: owner playtests in the Quest; then A10 firing range and A13 morality meter on a new branch. Files released.

## Claude — 2026-11-07 — `claude/range-morality` (A10 + A13)
- A10: `public/modules/interior.js` (`novaInterior.enter('range')/exit()`), firing range with the Gemini metal/hazard textures, 8 swaying pop-up targets, score board, exit door. Open with `?arena=range` or the FIRING RANGE menu button. Controls: WASD/mouse/click, gamepad sticks + RT + B, Quest left-stick move, right-stick snap turn, right trigger fire, B exit. Flight is paused while inside (early return in `novaGameLoop`).
- A13: `public/modules/morality.js` (`novaMorality.add/choice/line`), saved in localStorage, shown as a MORALITY bar in the PILOT RECORD (LOG), crew comment through `ncAnnounce`. Choices ready: `fusion_core` (return/keep/sell), `surrender`, `self_destruct`. The Cold Run beat that triggers `fusion_core` is A14.
- Checks: node --check; headless enter range → hit → walk → exit; no errors. Not checked on Quest.
- Next: A11 on-foot controls (right-hand gun, pinch toggle, left-fist joystick) should replace the stand-in movement in interior.js. Files released.
