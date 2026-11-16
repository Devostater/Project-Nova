# Project Nova build pipeline

Repo: https://github.com/Devostater/Project-Nova (branch `main`)
Local workspace: `C:\Users\devos\OneDrive\Documents\AZI\NOVA`

Git clone (push from here): `C:\Users\devos\Documents\GitHub\Project-Nova`
Git binary (not on PATH): `C:\Users\devos\AppData\Local\GitHubDesktop\app-3.6.10\resources\app\git\cmd\git.exe`, signed in through GitHub Desktop.

## Roles
- **Claude (lead):** keeps this plan and AI_HANDOFF.md current, splits work into tasks, reviews results, merges, commits and pushes.
- **Antigravity (Gemini):** coding tasks. Claude types each task into its chat with the target file(s) and the acceptance check.
- **ChatGPT:** textures and images, plus the APK install flow it is setting up now.
- **NOVA AI (offline, on this PC):** small coding tasks from GitHub issues. It reads the issue, makes the change (the user approves each edit), commits only the files it changed, pushes, comments on the issue and closes it. Runs on a local 7B model, so keep its tasks small and specific (one file, clear done-when).

## Loop per task
1. Claude pulls the latest `main` into the local folder.
2. Claude writes a task (goal, files, done-when) and sends it to Antigravity or ChatGPT.
3. Each agent edits only the files named in its task. Images go into `art/` or `models/`.
4. Claude reviews the diff, runs the optimiser (`optimize_nova.bat`) if assets changed, and checks the page loads at https://localhost:8443/standalone.html.
5. Claude commits with a clear message and pushes to `main`, then updates AI_HANDOFF.md.

## APK build + install (from ChatGPT's working setup)
- One command, run from the clone: `powershell -File tools\build_install_quest.ps1` (`-SkipBuild` to reinstall the last APK, `-Launch` to start it).
- Steps: Bubblewrap/Gradle `assembleRelease` → zipalign → apksigner with the debug keystore → `adb install -r` → verify version.
- Package `com.azi.projectnova`. Signed with `~\.android\debug.keystore` (debug key; fine for sideloading, not for the store).
- User needed: Quest 3 on USB, Developer Mode on, accept the USB-debugging prompt, headset awake.
- Risk: the Bubblewrap project lives in `%TEMP%\nova-quest-pwa-abb54…` and can be wiped by cleanup. Move it into the repo next.

## Rules
- Never commit `*.pem` / `*.key` (already in .gitignore).
- One agent per file at a time.
