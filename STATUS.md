# Project Nova status

Read this file and [OWNER_FEATURES.md](OWNER_FEATURES.md) (the backlog) first. Don't read anything in `docs/archive/` unless asked.

## Now
- **Lead / integrator:** Claude. It reviews, merges and pushes to `main`. ChatGPT (Codex) and Antigravity (Gemini) work on their own branches, then Claude merges.
- **Live game:** https://devostater.github.io/Project-Nova/standalone.html. GitHub Pages redeploys on every push to `main`; check `version.txt` for the deployed commit.
- **Quest app:** `com.azi.projectnova` 1.0.3 is a launcher that opens the live game in the full Quest Browser. Build it with `powershell -File tools\build_install_quest.ps1`.
- **Round in progress:** universe scale + speed (ChatGPT), pirate boarding (ChatGPT flow + Antigravity level), cinematics (ChatGPT plan → Antigravity storyboard → owner edits in CapCut → Claude's player).

## Rollback
- **`checkpoint1`** (tag and branch `backup/checkpoint1`) is commit `7c1a9d5`, the build from before the token clean-up. To roll back: `git reset --hard checkpoint1` then `git push --force-with-lease origin main` (owner approval required). Local copies of the APK and a zip are in `Documents\GitHub\Project-Nova-backups\checkpoint1\`.

## Rules (all AIs)
1. Game code: edit **`standalone.html` only**. `index.html` and `public/standalone.html` are generated (`node tools/sync_html.mjs`), untracked, and never read.
2. New systems go in `public/modules/<name>.js` (`export function init(nova)`), listed in `public/modules/manifest.json`, with an identical copy in root `modules/`.
3. Work on your own branch, starting from the latest `main`. Edit only the functions or files your task names. Never commit to `main`, and never overwrite whole files.
4. Don't read `vendor/`, `public/vendor/`, `models/`, `art/`, `art_src/`, `music*/`, `android/app/build/` or `docs/archive/`. They're large and not code you change.
5. Cheap checks before handing off: `node tools/sync_html.mjs --check` and `node --check` on changed modules plus the extracted `<script type="module">`. Say what you did **not** test.
6. Hand off by replying with the commit hash and one line per item. Claude updates this file.
