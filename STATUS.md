# Project Nova status

Read this file and [OWNER_FEATURES.md](OWNER_FEATURES.md) (the backlog) first. Don't read anything in `docs/archive/` unless asked.

## Now
- **Lead / integrator:** Claude. It reviews, merges and pushes to `main`. ChatGPT (Codex) and Antigravity (Gemini) work on their own branches, then Claude merges.
- **Live game:** https://devostater.github.io/Project-Nova/standalone.html. GitHub Pages redeploys on every push to `main`; check `version.txt` for the deployed commit.
- **Quest app:** `com.azi.projectnova` 1.0.3 is a launcher that opens the live game in the full Quest Browser. Build it with `powershell -File tools\build_install_quest.ps1`.
- **Live build:** `7f7d257` (2026-11-07). Everything below is merged into `main` and deployed; none of it has been playtested on the Quest yet.

## Handoff (2026-11-07, end of Claude session): Claude is OFF, nothing scheduled

**Merged today by Claude (PRs):** #39 fixed main (module tick crash), #40 Cold Run end to end, #44 on-foot fixes + side panels fill glass + big market, #48 owner models (cantina furniture/poster, gunship, civ traffic, cruiser, clanker yard, containers, faction missiles), #50 COMMS hologram / names on / overhead DOCK / vertical sites / simpler WARP, #52 asteroid boost, #53 cantina room rebuild + plan, #54 playtest fixes (gun, right panel 1.22, SYS/OPT tall tiles, big BACK/NEXT, autopilot stand-off, DOCK needs target, intro video path, PLAY INTRO on menu + watch).

**Open for GPT (next):** `OWNER_FEATURES.md` → "Playtest 2026-11-07" items 5 (ADVANCED flight yaw thrust) and 6 (missiles in VR). Then its own open PRs #41–#47, #49 one at a time on current `main` (they predate the one-game-file clean-up: rebase, edit `standalone.html` only).
**Owner:** playtest on Quest (intro video, cantina, autopilot, DOCK, range gun); answer: third-faction name, bartender, seat_v2.
**Whoever leads next** updates this section first.

## Handoff (2026-11-07): who did what, and what's next
| AI | Done and merged | Open / next | Working copy |
|---|---|---|---|
| **Claude** (lead) | checkpoint1 backup; token clean-up (one game file, docs → `docs/archive/`, ignore files, 23 merged branches deleted); debrief arrow, range/Cold Run start timing, FPS right hand + fist walk; cinematics player (`modules/cinematics.js`, falls back to slides/ending) | Merge the owner's `public/video/intro.mp4` (+ `.vtt`) when uploaded; review the 17 unmerged old branches with the owner | `Project-Nova-claude` (clean) |
| **ChatGPT** (Codex) | flight controls (stick roll, throttle yaw, ARCADE/ADVANCED, grips), DOCK with selected target, laser MR blending, wrist/L-R debounce; universe ×3 + cruise (`eb55dff`); `docs/CINEMATICS.md` (`8a72c58`); pirate boarding (`modules/boarding_levels.js`, `modules/pirate_boarding.js`, `novaTest.pirateBoarding()`) (`1056adf`); bartender Matrix animations (`ab3f8d8`) | Ready for the next card. Suggested: boarding polish after the owner playtests it; add the clean-up block to all image prompts in CINEMATICS.md | `Project-Nova` (branch `codex/pirate-boarding`, fully merged) |
| **Antigravity** (Gemini) | Storyboard frames 01–14 complete (`art_src/storyboard/`); Cantina 3D kit 01–14 + 16 (Patron) modeled, validated and composed into `standalone.html` (`9e9734e`) | Asset 18 (Gray Alien Patron) 2D source queued for quota reset (~04:06 UTC); Codex VFX source queue (6 transparent PNGs in `art_src/vfx/`) | `Project-Nova` (branch `gemini/fps-gun-model`) |
| **Owner** | | Make `intro.mp4` in CapCut from `art_src/storyboard` (prompts and timings in `docs/CINEMATICS.md`) and drop it in `public/video/`. Playtest: universe and cruise, boarding (`novaTest.pirateBoarding()`), flight model, debrief arrow, FIRING RANGE, FPS hands | |

Notes: Antigravity stalls on large code tasks, so give it art and small single-file cards. ChatGPT is reliable for code. The Quest app is a launcher: an "old version" on the headset means a stale browser tab (see CLAUDE.md).

## Rollback
- **`checkpoint1`** (tag and branch `backup/checkpoint1`) is commit `7c1a9d5`, the build from before the token clean-up. To roll back: `git reset --hard checkpoint1` then `git push --force-with-lease origin main` (owner approval required). Local copies of the APK and a zip are in `Documents\GitHub\Project-Nova-backups\checkpoint1\`.

## Rules (all AIs)
1. Game code: edit **`standalone.html` only**. `index.html` and `public/standalone.html` are generated (`node tools/sync_html.mjs`), untracked, and never read.
2. New systems go in `public/modules/<name>.js` (`export function init(nova)`), listed in `public/modules/manifest.json`, with an identical copy in root `modules/`.
3. Work on your own branch, starting from the latest `main`. Edit only the functions or files your task names. Never commit to `main`, and never overwrite whole files.
4. Don't read `vendor/`, `public/vendor/`, `models/`, `art/`, `art_src/`, `music*/`, `android/app/build/` or `docs/archive/`. They're large and not code you change.
5. Cheap checks before handing off: `node tools/sync_html.mjs --check` and `node --check` on changed modules plus the extracted `<script type="module">`. Say what you did **not** test.
6. Hand off by replying with the commit hash and one line per item. Claude updates this file.
