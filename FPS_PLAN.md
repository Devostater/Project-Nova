# VR FPS Combat, Boarding and Salvage Plan

**Status: Proposed.** Everything here is new design. Per [AI_CONTEXT.md](AI_CONTEXT.md), mechanics and lore stay *proposals* until the owner approves them. Open questions are at the end.

## Goals

1. **Salvage:** destroyed ships sometimes drop salvage crates, which a tractor beam pulls into the player's ship.
2. **First-person laser combat in VR:** short gunfights on foot, with Quest controllers (and keyboard/mouse in 2D).
3. **Boarding:** dock with a wreck or a disabled ship, board it, fight through a small arena and leave with loot.
4. **Test first:** a firing range and debug entry points, so combat feel can be tried on the Quest before the full loop is built.

## What already exists (observed in the game file)

| Need | Existing piece | Where |
|---|---|---|
| Walk-around interior | Cantina: moves `cameraRig` from the ship into `cantinaGroup`, hides the cockpit, MR passthrough variant | `enterCantina` / `exitCantina` |
| VR locomotion | Hand-pinch teleport with floor marker and room bounds | `novaTeleportTick` |
| 2D walking | WASD inside the cantina | cantina tick |
| Ship death hook | Runs on every faction-ship kill (explosion, bounty) | `nfKill(u, byPlayer)` |
| Tractor beam | Beam mesh + smooth pull used for docking | `novaDockTractor` / `novaDockTick` |
| Salvage economy | `cargoSalvage` cargo, sold at the black market; wrecks salvaged within 70 m | `cargoSalvage`, `novaLife.wrecks` |
| Ready models (unused) | `container.glb` (10 m cargo crate), `drone.glb` (3 m combat drone) | `public/models/` |
| VFX | Laser bolt, flare, spark, explosion sheet, small hit burst, muzzle sheet | `public/fx/` |

## Architecture

- **New code as modules** (see `AI_PLAN.md`): `public/modules/fps_core.js`, `fps_arena.js`, `fps_ai.js`, `salvage.js`. Each exports `init(nova)`. The game file only gains the small `nova` API and a loader, so several AIs can work in parallel.
- **`nova` API** (first real use of AI_PLAN Phase 2): `THREE`, `scene`, `camera`, `cameraRig`, `renderer`, `shipGroup`, `sound`, `toast()`, `onTick(fn)`, `on('shipDestroyed', fn)`, `cargo.add(type, n)`, `input` (controllers, hands, keys), `vfx` (flare, spark, boom).
- **Interior system:** generalise the cantina pattern into `novaInterior.enter(def)` / `exit()`: park the ship, move the rig into the arena group, swap the input mode, and restore everything on exit. The cantina keeps working unchanged until it is moved over.
- **Arenas are data:** a JSON-like definition (size, kit pieces, cover points, spawn points, exits, objective) built by `fps_arena.js`. Start with box geometry (a greybox), then swap in models from the owner.

## Controls

| Action | Quest controllers (required for FPS v1) | Hand tracking | 2D (keyboard/mouse) | Gamepad |
|---|---|---|---|---|
| Fire | Right trigger | — (hands can't aim well) | Left click (pointer lock) | Right trigger |
| Aim | Point the controller (the gun is held in hand) | — | Mouse look | Right stick |
| Move | Left stick: teleport by default, smooth optional | Pinch teleport (existing) | WASD | Left stick |
| Turn | Right stick: 45° snap turn | Head turn | Mouse | Right stick |
| Reload / vent heat | Grip squeeze, or hold the gun down | — | R | X |
| Use / grab loot | Grip near the item | Pinch | E | A |

**Comfort:** teleport and snap turn by default; smooth movement is optional with a tunnel vignette. The camera never moves on its own. A seated mode lifts the player's height. The MR passthrough arena (fight in your own room) reuses the cantina's passthrough code.

## Combat rules (v1)

- **Player lasers are hitscan:** an instant raycast against enemy hitboxes, with the `vfx_laser` bolt drawn for show. That's cheap and feels accurate in VR. The pistol has a heat bar instead of ammo.
- **Enemy shots are slow, visible bolts** (~12 m/s) that the player can dodge or lean away from, which is the fun part of VR. At most 8 in flight.
- **Player health:** 100 HP plus a small regenerating shield. Hits show a red vignette, a controller rumble (`gamepad.hapticActuators`) and a sound. At 0 HP the player is pulled out, keeps the ship, and loses the boarding loot.
- **Enemies v1: hovering security drones** using the existing `drone.glb`. No skeleton animation is needed, so they're quick to build. States: patrol → alert → strafe to cover → peek and shoot → retreat when damaged. At most 4 active on Quest, 6 on PC. Armed humanoid boarders come later and need rigged, animated models.

## Salvage drops (space)

1. Hook `nfKill(u, byPlayer)`. Drop chance by class: fighters 25%, frigates and carriers 60%, bosses 100%; mines and drones 0%.
2. Spawn 1–3 crates (`container.glb` at reduced scale, or a 1–2 m salvage pod) that drift with the wreck's last velocity and tumble slowly, with a blinking beacon (`vfx_flare`). They despawn after 90 s. At most 8 in space.
3. **Tractor:** within 400 m, crates show on radar and the HUD. **Hold the tractor button** (or auto-collect, an owner choice) to pull a crate over 2–3 s with a beam (reusing the docking beam mesh and the lightning texture), then it's stowed.
4. **Contents (proposal):** salvage (`cargoSalvage`, sold at the black market), credits, ore, missiles, flares or shield caps. Cargo space is checked with the existing `totalUsedTons`, and a "HOLD FULL" message appears if needed.
5. Saved with the existing save/load (`cargoSalvage` is already stored).

## Boarding loop

1. **Target:** graveyard wrecks first. They already trigger "salvage on approach" within 70 m, so add a **BOARD** choice next to the instant salvage. Later, **disabled pirate ships**: a boardable class with hull under 25% and shields down goes dark instead of exploding, for 60 s.
2. **Dock alongside:** reuse the docking approach and tractor to hold the ship next to the target.
3. **Board:** a short fade or airlock transition, then `novaInterior.enter(arenaDef)`.
4. **Arena:** clear the drones, or reach an objective (data core, captured crew, cargo), then leave by the airlock.
5. **Return:** back to the cockpit, with loot added and XP awarded. A wreck boarded this way counts as salvaged.

## Arenas (small, 10–20 m, about 3 minutes each)

| # | Arena | Purpose | Enemies |
|---|---|---|---|
| A0 | **Firing range** on Nova-1 station | Test gun feel, movement, comfort. Entered from the menu/debug, no risk | Pop-up targets |
| A1 | **Derelict corridor** (graveyard wreck) | First boarding: tight corridors, cover, dim emergency light | 2–4 drones |
| A2 | **Pirate cargo bay** | Open room, crates as cover, loot objective | 3–4 drones, 1 heavy drone |
| A3 | **MR passthrough arena** | Drones come through "portals" in your real room | 2–3 drones |

## Milestones

| M | Deliverable | Lead | Depends on |
|---|---|---|---|
| **M0** | `nova` module API + loader; `novaInterior` enter/exit; `?arena=range` debug entry and a "VR COMBAT TEST" menu button | Claude | Alpha 1.2 merged |
| **M1** | **Salvage drops + tractor pull** (space only; ships first, needs no FPS) | Claude | M0 |
| **M2** | **Firing range (A0):** laser pistol, hitscan, heat, controller/2D/gamepad input, snap turn, teleport, comfort options. **Owner tests on Quest.** | Claude | M0 |
| **M3** | Drone AI (`fps_ai.js`), player HP and hit feedback, **derelict boarding (A1)** from graveyard wrecks | Claude + GPT (AI logic as a module) | M2 |
| **M4** | Disabled pirate ships, boarding pirates (A2), loot table, MR arena (A3) | Claude | M3 |
| **M5** | Polish: models, textures, sounds, haptics, balance | All | M4 |

Each milestone is its own PR and adds a section to `TESTING.md`.

## Who does what

- **Claude:** `nova` API, interior system, weapons and hit logic, salvage, integration, testing, PRs.
- **GPT (via the owner, pasted into chat):** `fps_ai.js`, the drone state machine, written against the `nova` API as one standalone module file.
- **AI Studio (when usage allows):** wrist HUD (heat, HP, objective), boarding briefing panel. Panel code only.
- **Gemini API (run by Claude):** tileable metal floor and wall textures, hazard stripes, decals, salvage-pod beacon, target faces for the range.
- **Owner (Tripo / Blender):** the models below.

## Assets needed

| Asset | File | Size / budget | Priority | Maker |
|---|---|---|---|---|
| Laser pistol (held) | `models/laser_pistol.glb` | 0.3 m, under 6k tris, grip origin at the hand | M2 | Owner (Tripo) |
| Range targets | procedural first | — | M2 | Claude |
| Arena kit: floor, wall, doorway, pillar, low cover crate, airlock door | `models/kit_*.glb` | 2 m grid pieces, under 2k tris each | M3 | Owner (Tripo/Blender) |
| Salvage pod | `models/salvage_pod.glb` | 1.5 m, under 3k tris (or reuse `container.glb`) | M1 | Owner |
| Heavy drone | `models/drone_heavy.glb` | 2 m, under 8k tris | M4 | Owner |
| Laser rifle | `models/laser_rifle.glb` | 0.8 m, under 8k tris | M4 | Owner |
| Metal floor / wall textures | `public/art/textures/tex_metal_floor_1024.jpg` etc. | 1024², tileable | M3 | Gemini |
| Hit decal, hazard stripes, airlock signs | `public/fx/`, `public/art/` | 256–512² | M3 | Gemini |
| SFX: pistol shot, heat vent, drone hum, drone shot, crate tractor, airlock | `public/sfx/*.mp3` | short, under 50 KB each | M2–M3 | Owner / AI audio tool |

Budgets follow `ASSET_SPEC.md`. Add an `optimize_nova.py` rule for each new model type.

## Quest performance budget (interiors)

- Under 150 draw calls and 150k triangles visible.
- One directional light plus emissive materials, no real-time shadows (or one cheap blob shadow).
- At most 4 drones and 8 enemy bolts.
- Textures at 1024 px or less; reuse kit pieces with instancing.
- Hit effects use the capped VFX path (`novaVfxCheap()` in VR).

## Testing

- `?arena=range` (and later `?arena=derelict`) jumps straight into an arena in 2D or VR.
- Debug: `window.novaTest.salvage()` spawns crates next to the ship; `window.novaTest.board()` boards the nearest wreck.
- Every milestone adds a `TESTING.md` section with Quest checks: comfort, frame rate, input, hit feel.

## Open questions for the owner

1. **Salvage pickup:** auto-collect nearby crates, or hold a button to tractor each one?
2. **Ship deaths:** should some pirate ships become **disabled and boardable** instead of exploding, and how often?
3. **First enemies:** OK to start with **combat drones** (fast to build), with armed pirates later?
4. **Movement:** teleport only, or allow smooth stick movement as an option?
5. **Controllers required** for FPS sections (hand tracking only for teleport and grabbing)?
6. **Story:** who are the boarders, and what's on the derelicts? (Lore stays a proposal until you decide.)
