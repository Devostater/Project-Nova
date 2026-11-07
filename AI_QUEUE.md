# AI Work Queue: road to a full AAA VR simulation

The owner is away. Each AI takes the **next unclaimed card in its own lane**, works it, opens a PR and records a handoff, then takes the next card. Claude may be out of usage; nothing here needs Claude to start.

## Golden rules (every AI, every card)

1. **Start from the latest GitHub `main`.** Never an old local copy (twice now, an old copy has wiped other work).
2. **Work on your own branch** (`codex/<card>`, `gemini/<card>`, `aistudio/<card>`) and open a **draft PR**. Never push to `main`. Never merge.
3. **Game files:** edit `standalone.html` only. `public/standalone.html` and `index.html` are generated from it by `node tools/sync_html.mjs`; never edit or read them. Run the script before committing.
4. **One AI per game-file area.** Claim the card in `AI_STATUS.md` (Active claims) before starting; only touch the functions the card lists. New systems go in **new module files** (`public/modules/<name>.js`, exporting `init(nova)`) whenever possible.
5. **LF line endings** (`.gitattributes` enforces this). No whole-file rewrites.
6. **Graphics target (owner, 2026-11-07): MAX / ULTRA quality.** It runs great at ULTRA; don't reduce model or texture detail for performance. Keep the Quest low tier working but never at the cost of ULTRA quality. Was: **Quest first:** under about 150 draw calls; no new materials or geometry per frame; textures at 1024 px or less unless the ULTRA tier.
7. **Lore:** only the anchor is established ("Humanity is growing colder; heat and fusion cores are sought after"). Anything new is a *proposal* (`PROJECT_NOVA_CONTEXT.md`).
8. **Questions:** don't stop and wait; add the question to `OWNER_QUESTIONS.md` with the default you'll use, and keep going.
9. **Finish:** a handoff in `AI_STATUS.md`: what changed, how to test it (2D, gamepad, Quest), and what wasn't tested.

Merge order when the owner returns: open Claude PRs first (#11), then the queue PRs oldest first. Claude resolves any conflicts.

---

## Lane A: GPT / Codex (code)

| # | Card | Scope / files | Done when |
|---|---|---|---|
| A1 | **Docking polish** | `executeDocking`, `novaDock*`, `ndk*`, `novaAutoDockPress` only | Smooth approach, clear HUD guidance, works in 2D/VR |
| A2 | **Salvage drops + tractor** (FPS_PLAN M1) | new `public/modules/salvage.js`; one hook line in `nfKill`; a TRACTOR cockpit button | Pods drop, show grey on radar/comms, select → TRACTOR pulls them in, cargo + heat cores |
| A3 | **Enemy missile trails + explosion upgrade** (FPS_PLAN §6) | new `public/modules/fx_ultra.js`; uses `public/fx/*` textures; tier caps by `NOPT.o.gfx` | Missile smoke trails, shockwave ring, debris, light flash; ULTRA tier richer; Quest capped |
| A4 | **`nova` module API + loader** (FPS_PLAN M0) | a small `window.nova` object + `<script type="module">` loader for `public/modules/*.js` | Modules load in both builds; documented in `AI_WORKFLOW.md` |
| A5 | **Enemy AI module** (FPS_PLAN M4) | `public/modules/fps_ai.js`: drone state machine against the `nova` API | Patrol → cover → shoot → retreat, testable via `?arena=range` |
| A6 | **Morality meter** (FPS_PLAN §5) | `public/modules/morality.js` + one flight-log line | −100…+100, history list, saved |
| A8 | **Side panels fit the cockpit mesh** (GPT, in progress) | panel placement/scale only (`npBuild`, `NP_SW/NP_SH`, panel roots) | Panels sit flush on their console screens in 2D and VR |
| A9 | **Offline APK check** | `tools/make_quest_apk.bat`, `OFFLINE_PLAY.md` | Owner can build and sideload the APK; it runs offline after the first load |
| A7 | **Performance pass** (Claude, in progress) | measured: about 282 draw calls / 772k tris in flight; target about 150 / 300k on Quest | Quest-tier draw calls and tris inside budget |


### Lane A, vertical slice cards (GPT/Codex). Do them in order; see `VERTICAL_SLICE.md`

| # | Card | Scope / files | Done when |
|---|---|---|---|
| **A4** | **Module system** (prerequisite) | `window.nova` API (THREE, scene, camera, cameraRig, renderer, shipGroup, sound, toast, onTick, on/emit: shipDestroyed, missileLaunched, missileImpact, salvageStowed) + a loader for `public/modules/*.js`; mirror to root `modules/`; add to `sw.js` | A demo module logs "ready" |
| **A10** | **Interior/arena system + firing range** | `public/modules/interior.js`: `novaInterior.enter(def)/exit()`; `?arena=range`; `public/art/textures/tex_metal_*` | Walk the range in 2D and VR, then exit |
| **A11** | **On-foot controls** (FPS_PLAN §2) | `public/modules/fps_core.js`: right-hand gun, aim-cone auto-fire, pinch gun/hand toggle, left-fist joystick (smooth movement default), fallbacks, comfort vignette | Targets can be shot in every input mode |
| **A5** | **Enemy drones** | `public/modules/fps_ai.js` + `drone.glb`: patrol → cover → shoot (slow, dodgeable bolts) → retreat; player HP + hit feedback | Two drones fight you in the range |
| **A12** | **Derelict boarding** | Graveyard wreck → BOARD → corridor arena → loot → airlock exit | Board, fight, loot a heat core, return |
| **A13** | **Morality meter + the fusion-core choice** | `public/modules/morality.js`; FLIGHT RECORD line; crew reaction lines | The choice changes morality; the crew comment |
| **A14** | **"Cold Run" mission + end card** | beats 1–9 as one objective chain; end card with stats | Fresh save → end card in one session |
| **A15** | **Save/load coverage** | heat cores, morality, salvage and slice progress in save/load | Quit mid-slice and resume |
| **A16** | **Planning: Beta → 1.0** | `ROADMAP.md`: 3 sectors, 6 missions, 4 boardable ship types, store prep | Owner reviews |

## Lane B: Gemini (art; images only, no code)

**Status 2026-11-07: all of B1–B6 is delivered** (made via the Gemini API by Claude, or by the owner): station logos (in game), arena textures `public/art/textures/tex_*_1024.jpg`, `public/fx/vfx_heat_core.jpg`, `vfx_salvage_beacon.png`, `vfx_shockwave.png`, `vfx_smoke_8x8.jpg`, store art in `art_src/store/`. Planets 2048 are in the owner's Drive `gemini_art_inbox`. New art requests go in `OWNER_QUESTIONS.md` or `ASSET_BACKLOG.md`.

Follow `ASSET_SPEC.md`. Black background for additive effects; no text, labels or borders. Upload to a `gemini/<card>` branch (files go to the folder listed).

| # | Card | Files |
|---|---|---|
| B1 | Station logos for the music page (256², transparent) | `public/art/station_*.png` (NOVA-1 FM, SYNTHWAVE 88, DEEP SPACE RADIO, PIRATE RADIO, OBI'S MIX) |
| B2 | Arena textures: deck floor, corridor wall, hazard stripes (1024² seamless) | `public/art/textures/tex_*.jpg/png` |
| B3 | Heat core / fusion core glow, salvage pod beacon (512², additive) | `public/fx/vfx_heat_core.png`, `vfx_salvage_beacon.png` |
| B4 | Smoke puff sheet 8×8 (1024²) and shockwave ring (1024²) for explosions and trails | `public/fx/vfx_smoke_8x8.png`, `vfx_shockwave.png` |
| B5 | Higher-res planets (2048×1024 equirectangular): ice, lava, red, teal | `public/art/planet_*_2048.jpg` |
| B6 | Storefront key art (1920×1080) + VR store cover (1440×1440): cockpit view with warp | `art_src/store/*` |

## Lane C: AI Studio (UI panels; only when it has usage)

Panel code only (`np*`, `NP_*`). Push via its own `aistudio/<card>` branch; never sync over `main`.

| # | Card |
|---|---|
| C1 | Music page: show the B1 station logos in the station header |
| C2 | Wrist HUD layout (HP, heat, objective) for the FPS mode, as a canvas-drawn panel |
| C3 | Morality page in the FLIGHT RECORD (after A6) |
| C4 | Boarding briefing panel (target ship, decks, loot, morality warning) |

## Lane D: Owner (Tripo / Blender, when back)

From `FPS_PLAN.md`: laser pistol, salvage pod + heat core, arena kit pieces, fusion core, rigged pirate grunt and captain. Run `optimize_nova.bat`, then upload to `public/models/`.

---

## AAA milestones (the big picture)

| Stage | Goal | Main cards |
|---|---|---|
| **Alpha 1.4** | Polished flight: docking, salvage, missiles/explosions, music stations | A1–A3, B1, B4, C1 |
| **Alpha 2.0** | First on-foot combat: firing range + derelict boarding | A4, A5, B2, B3, C2 + owner pistol/kit |
| **Beta 1** | Big pirate-ship boarding, morality, full enemy roster | A6, C3, C4 + rigged enemies |
| **Beta 2** | ULTRA graphics tier, performance pass, storefront art | A3 (ULTRA), A7, B5, B6 |
| **1.0** | Content, balance, audio, accessibility, Quest store submission | all lanes |
