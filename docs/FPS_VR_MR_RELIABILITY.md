# FPS / VR / MR Reliability Pass

## Goal

Make every on-foot sequence reliable with desktop, tracked controllers, and optical hands in both immersive VR and MR passthrough. This pass keeps the existing movement and combat feel while removing stale-input, collision, interaction, and compositing failures.

## Implementation phases

1. **Input ownership**
   - Detect the active WebXR source per hand every frame.
   - Never read hand joints from a controller source or controller buttons from a hand source.
   - Hide cockpit hand/controller visuals while the FPS system owns the player, then restore them on exit.
   - Keep trigger polling source-aware so controller-slot changes cannot leave a stale listener behind.

2. **Hand-only parity**
   - Right pinch fires while the weapon is drawn.
   - Left quick pinch draws or holsters; left deliberate hold activates USE.
   - Holding both pinches deliberately exits/evacuates.
   - Existing fist locomotion and snap turn remain available.

3. **Physical boundaries**
   - Locomotion slides along declared solid rectangles instead of entering them.
   - Room-scale head motion is corrected at the same boundaries.
   - Player shots and enemy bolts stop at marked walls and cover.

4. **MR-safe effects**
   - Tracers, muzzle flashes, and enemy bolts use alpha-preserving custom light blending.
   - Opaque station geometry remains opaque; luminous effects add light without writing black alpha into passthrough.

5. **Testability and synchronization**
   - Expose compact FPS state for the test console.
   - Keep `public/modules/` and root `modules/` byte-identical.
   - Run module syntax checks, extracted standalone script syntax check, and HTML synchronization check.

## Acceptance matrix

| Mode | Required checks |
|---|---|
| Desktop | Enter range, move/aim/fire/use/exit; cover blocks movement and shots. |
| Quest VR controllers | Both sticks, trigger fire, A/X use, B/Y exit; swap controller slot/order without a frozen hand or lost trigger. |
| Quest VR hands | Fist move, snap turn, draw/fire, hold-to-use, two-pinch exit; no cockpit ghost hands. |
| Quest hot-swap | Put controllers down, use hands, pick controllers back up; only the current source drives each side. |
| Quest MR | Repeat controller and hand checks; tracers/bolts have no black silhouettes and station walls remain opaque. |
| Boarding | Walls/cover block body and shots; checkpoint/loot/exit prompts work with hands and controllers. |

## Quick test entry points

- Firing range: `window.novaRange()`
- Pirate boarding setup: `window.novaTest.pirateBoarding()`
- FPS diagnostic snapshot: `window.novaTest.fpsState()`

## Build status

- Implemented on `codex/fps-vr-mr`: source-aware hot-swap, hand-only USE/EXIT, cockpit visual ownership, declared collision volumes, shot/bolt occlusion, and MR-safe combat blending.
- Automated checks cover synchronized files and JavaScript syntax.
- Physical Quest VR/MR checks remain required because desktop automation cannot supply optical hand joints or a real passthrough compositor.

