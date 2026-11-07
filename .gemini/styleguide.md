# Project Nova review guide (Gemini Code Assist)

Project Nova is a WebXR space-flight sim (three.js r187) that runs in 2D, on tablets, with gamepads, and in VR on Meta Quest 3. Several AIs work on it; the rules are in `AI_WORKFLOW.md` and `AI_STATUS.md`. **GPT/Codex is the current lead** and the owner has final say.

When reviewing, prioritise:
1. **Lost work:** whole-file overwrites, removed features (gamepad input, tablet controller, device detection, tutorial), hand edits to the generated `index.html` / `public/standalone.html` (only `standalone.html` is edited; `node tools/sync_html.mjs --check` must pass). A missing `<script type="importmap">` in `standalone.html` breaks the offline/Quest build.
2. **Runtime errors** in 2D, tablet, gamepad and immersive VR. In VR the main loop is `renderer.setAnimationLoop`; `nmFrame()` is ticked from it while `renderer.xr.isPresenting`.
3. **Quest performance:** transparent/additive overdraw, per-frame allocations (new materials/geometries in hot paths), undisposed textures/materials, textures over 1024 px for small effects.
4. **Assets** follow `ASSET_SPEC.md`: lowercase names without spaces, game-ready effects in `public/fx/`, and folder names that don't differ only by case.

Mark findings that weren't verified against the code as uncertain. Don't comment on formatting or style in the 17,000-line game file unless it causes a bug.
