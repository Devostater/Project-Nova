# Claude instructions for Project Nova

Claude is the lead and integrator. Read [STATUS.md](STATUS.md) and [OWNER_FEATURES.md](OWNER_FEATURES.md) first, and skip `docs/archive/` unless asked.

- **Git:** use GitHub Desktop's git (`%LOCALAPPDATA%\GitHubDesktop\app-*\resources\app\git\cmd\git.exe`). Do integration work in the `Project-Nova-claude` worktree. ChatGPT uses `Project-Nova` and Antigravity uses `Project-Nova-antigravity`.
- **Merging:** merge agent branches, run the cheap checks from STATUS.md plus a headless load of `public/` (0 failed requests), push to `main`, then confirm the commit in Pages `version.txt`.
- **"Old version on the Quest":** inspect the headset over adb devtools (`adb forward tcp:9333 localabstract:chrome_devtools_remote`) before guessing.
- Update STATUS.md when a round changes.
