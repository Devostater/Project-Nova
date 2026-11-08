# Quest playtest handoff — 2026-11-07

Branch: `codex/fps-vr-mr`

## Completed and pushed

- FPS/VR/MR input ownership, hand/controller hot-swap, hand-only USE/EXIT, collision and MR-safe combat blending.
- Epilogue at `public/video/epilogue.mp4`, optimized to 23 MB H.264/AAC, 1280×720, 30 fps, 60 seconds.
- Cantina rule: VR renders the complete room; MR hides walls/ceiling but retains the game floor.
- Hand pose smoothing for cockpit joints and on-foot pistol/gloves.
- Wrist L/R requires a small contact zone plus a 350 ms right-hand pinch, 900 ms cooldown and release to rearm.
- Firing range waits until the Quest loading safe-zone is dismissed, preventing recenter back to the ship.
- Radar now rebuilds from live attached objects, removes dead/hidden/detached/salvaged contacts, applies range to major contacts, deduplicates objects, clears lost locks, refreshes holograms when async models arrive, and shows incoming missiles as blinking red contacts.

## Quest retest still required

1. Cantina in VR: floor, walls and ceiling render.
2. Cantina in MR: floor renders; walls and ceiling reveal passthrough.
3. Optical hands: no shaking/frozen duplicate hands in cockpit or range.
4. Wrist L/R: no activation from casual fingertip passes; deliberate pinch-hold turns once.
5. Firing range: after pulling the safe-zone trigger, the range replaces the ship view.
6. Radar: destroyed/despawned/far contacts disappear, live ships move, newly loaded models refresh, and incoming missiles blink red.

## Local Quest test path

Serve `public/`, use `adb reverse tcp:8011 tcp:8011`, then open `http://localhost:8011/standalone.html?sync=<commit>` in Quest Browser. Do not serve the repository root.
