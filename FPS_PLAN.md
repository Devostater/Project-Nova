# VR FPS Combat, Boarding and Salvage Plan

**Status:** the owner answered the design questions on 2026-11-07 (marked **Owner decision** below). Anything else new stays a *proposal* until approved, per [AI_CONTEXT.md](AI_CONTEXT.md).

## Story anchor (Established, owner-confirmed)

> **Humanity is growing colder. Heat cores and fusion cores are sought after across the system.**

This drives the loot and the boarding objectives: heat and fusion cores are the most valuable salvage, and most boarding missions are about a ship's core. (Who hunts the cores, and why the system is cooling, is still open.)

## Goals

1. **Salvage:** destroyed ships can drop salvage. The player selects it as a target and tractors it in.
2. **First-person laser combat in VR:** fast gunfights on foot, mainly with hand tracking, plus controllers, 2D and gamepad.
3. **Big boarding missions:** board a large pirate ship for about **15 minutes** of running and gunning, then choose to **salvage it or self-destruct it**.
4. **Morality meter:** big choices (boarding endings, sparing crew, taking cores) move a meter shown in the flight log and player stats.
5. **All enemy types**, plus upgraded **enemy missiles and explosions**, with an **ULTRA graphics** tier for storefront-quality testing.
6. **Test first:** a firing range and debug entry points, so the combat feel can be tried on the Quest early.

## What already exists (observed in the game file)

| Need | Existing piece | Where |
|---|---|---|
| Walk-around interior | Cantina: moves `cameraRig` from the ship into a room, hides the cockpit, MR passthrough variant | `enterCantina` / `exitCantina` |
| VR locomotion | Hand-pinch teleport | `novaTeleportTick` |
| Ship death hook | Runs on every faction-ship kill | `nfKill(u, byPlayer)` |
| Tractor beam | Beam mesh + smooth pull used for docking | `novaDockTractor` / `novaDockTick` |
| Targeting | Radar contacts, the 3D holo-radar, the comms/contacts panel, `currentLockedTarget` | `nmContactList`, `NH`, `NP_COMMS` |
| Salvage economy | `cargoSalvage` sold at the black market; graveyard wrecks salvaged within 70 m | `cargoSalvage`, `novaLife.wrecks` |
| Reputation and choices | Crew affinity bars, pirate standing, "Code of the Nova" lessons, story choices | `novaAff`, `novaPirRep`, `novaLesson`, `novaStory` |
| Enemy ships | Alien fighter/carrier/mothership/drones/support/spore turret, pirate fighter/frigate/stealth, EDF fighter/carrier | `NF_ASSETS` |
| ULTRA graphics | Loads the original full-detail ship models | `NF_ORIG`, `NOPT_GFX.ultra` |
| Rigged characters | `alien_crew.glb` (walk, wait, bow, wave); `matrix_character.glb` (13 animations); `obi_cat.glb` | `public/models/` |
| Unused models | `container.glb` (cargo crate), `drone.glb` (combat drone) | `public/models/` |
| VFX | Laser, flare, spark, 2048 px explosion sheet, small hit burst, muzzle sheet, engine glow, warp streaks | `public/fx/` |

## Architecture

- **New code as modules** (see `AI_PLAN.md`): `public/modules/salvage.js`, `fps_core.js` (weapons, health, input), `fps_arena.js` (levels), `fps_ai.js` (enemies), `morality.js`. Each exports `init(nova)`. The game file only gains a small `nova` API and a loader, so several AIs can work in parallel.
- **`nova` API:** `THREE`, `scene`, `camera`, `cameraRig`, `renderer`, `shipGroup`, `sound`, `toast()`, `onTick(fn)`, `on('shipDestroyed', fn)`, `cargo.add(type, n)`, `targets.add/remove` (so salvage shows in radar and comms), `input` (hands, controllers, keys), `vfx`, `morality.add(delta, reason)`.
- **Interior system:** generalise the cantina into `novaInterior.enter(def)` / `exit()`.
- **Levels are data:** small arenas and large multi-deck ships are both built from the same kit pieces and level definitions.

## 1. Salvage: select, then tractor (Owner decision)

1. On `nfKill`, there's a chance of a drop: fighters 25%, frigates and carriers 60%, bosses 100%. Big ships can drop a **heat core** (rare, valuable).
2. Drops are 1–3 salvage pods that drift with the wreck's velocity, with a blinking beacon, and despawn after 120 s. At most 8 in space.
3. **They're listed as targets on the radar, the 3D holo-radar and the comms/contacts page, in a greyed-out "salvage" style** (grey with a salvage icon, never red or green), so they never look like a threat.
4. **Select one** by tapping it on the radar, on the comms page, or with NEXT TARGET, **then press the TRACTOR button** (a new cockpit button next to DOCK). It works within 500 m. A beam (reusing the docking beam with the lightning texture) pulls the pod in over 2–3 s. Out of range shows "MOVE CLOSER".
5. **Contents:** salvage (`cargoSalvage`), **heat cores** (new cargo, high value), credits, ore, missiles, flares or shield caps. Cargo space is checked with the existing `totalUsedTons`.

## 2. Hands-first VR combat controls (Owner decision)

| Action | Hand tracking (primary) | Quest controllers | 2D | Gamepad |
|---|---|---|---|---|
| **Weapon** | **The gun sticks to the right hand.** It's always in hand while weapons mode is on | Held in the right controller | On screen | On screen |
| **Fire** | **Fires by itself when the gun is aimed at an enemy**: a narrow aim cone (about 4°) along the hand's pointing direction, at the weapon's fire rate | Right trigger, with the same aim assist | Left click | Right trigger |
| **Switch weapons / hands** | **Pinch** (right) toggles gun ↔ empty hand (to grab loot and press buttons). Pinch (left) cycles weapons | B / Y | Q / 1–3 | Y |
| **Move** | **Left-fist virtual joystick:** close the left hand into a fist with the thumb up to anchor it; moving the fist away from the anchor moves you in that direction, and further means faster. Open the hand to stop | Left stick (smooth) | WASD | Left stick |
| **Turn** | Head turn, or a right-fist twist for snap turn | Right stick: snap or smooth | Mouse | Right stick |
| **Use / grab** | Empty-hand pinch or grab | Grip | E | A |

- **Smooth movement is the default** (owner preference). Comfort options: a tunnel vignette while moving, snap or smooth turning, a speed slider, and teleport as a fallback.
- **Auto-fire rules:** it only fires at enemies (never at crew, allies or salvage), not while the hand is fisted or pinching, and it shows a small aim reticle on the target so you can see what will be hit.

## 3. Combat rules

- **Player weapons (hitscan):** laser pistol (heat bar), laser rifle (higher damage, slower), scatter blaster (short range). Hits use the `vfx_laser` bolt, small hit bursts and decals.
- **Enemy shots are slow, visible bolts** you can dodge or lean away from. At most 10 in flight (16 on ULTRA).
- **Player health:** 100 HP plus a small regenerating shield; red vignette, controller or hand-tracking haptics where available, and sound. At 0 HP the player is pulled out, keeps the ship, and loses the boarding loot.
- **Enemy roster (all types, staged):**

| Enemy | Model | Behaviour | Stage |
|---|---|---|---|
| Security drone | `drone.glb` (exists) | Hover, strafe, shoot | First |
| Heavy drone | new `drone_heavy.glb` | Slow, shielded, burst fire | Next |
| Alien crew | `alien_crew.glb` (exists, rigged: walk, wait) | Walk to cover, shoot; needs a shoot/hit animation (Tripo/Mixamo) | Next |
| Pirate grunt | new rigged humanoid | Cover, peek, shoot, retreat | Next |
| Pirate heavy / captain | new rigged humanoid | Shielded mini-boss, grenades | Big pirate ship |
| Spore turret | scaled `alien_spore_turret` | Fixed, area denial | Alien levels |
| Wall / ceiling turrets | kit piece | Fixed, can be destroyed | All ships |
| Boarding mines / hazards | kit piece | Area damage | All ships |

At most 4 active enemies on Quest, 8 on PC and ULTRA.

## 4. Big pirate ship boarding (about 15 minutes) (Owner decision)

1. **Disable:** large pirate ships (frigate class and up) go **dark and disabled** instead of exploding when the hull drops under 20% with shields down. They stay dark for 90 s.
2. **Dock alongside** with the tractor, then **BOARD**.
3. **Decks (multi-section level):** airlock → corridors and crew quarters → cargo bay (big fight, crates as cover) → engineering (the **fusion core**) → bridge (pirate captain). Checkpoints between decks, about 3–4 minutes per section.
4. **Finale choice (feeds the morality meter):**
   - **Salvage the ship:** clear the bridge and take the ship's core and cargo for big loot and a reputation change. *(Proposal: leaving surviving crew without a core in a cooling system is a morality hit.)*
   - **Self-destruct:** set the core to overload and run to the airlock against a timer, then watch it explode from the cockpit. Less loot, and morality depends on who's still aboard.
   - *(Proposal)* **Spare the crew:** let survivors escape in pods before either choice. Morality goes up and loot goes down.
5. **Smaller boardings** (graveyard derelicts, about 3 minutes) reuse the same system with one or two sections.

## 5. Morality meter (Owner decision)

- A single value from **-100 to +100**, shown in the **flight log** ("FLIGHT RECORD" page) and **player stats**, with a short history of what changed it ("Spared the crew of the *Red Gull*: +8").
- It builds on the existing systems rather than replacing them. `novaLesson` ("Code of the Nova"), `novaAff` (crew) and `novaPirRep` stay; morality is the overall conscience score, and some lessons and choices feed it.
- *(Proposal)* Effects: crew comments and affinity react, prices at the black market and the station shift, and some contracts or endings unlock at high or low morality.
- Saved with the existing save data.

## 6. Enemy missiles, explosions and ULTRA graphics (Owner decision)

Goal: storefront-quality footage on PC and ULTRA, while staying smooth on Quest.

- **Enemy missiles:** smoke and fire trail (sprite particles, using `vfx_engine_glow` plus soft smoke), a flickering exhaust, lock-on warning tone and HUD arrow, and a proper impact explosion. Currently missiles have no trail.
- **Explosions:** layered fireball (the new 2048 sheet) + **shockwave ring** + **debris chunks** (pieces of the ship's model flying apart, then fading) + **point-light flash** + small **camera shake** when close. Large ships: secondary explosions and a slow break-up.
- **Graphics tiers:**

| | Quest (LOW/MID) | HIGH | **ULTRA** (PC VR / desktop, storefront) |
|---|---|---|---|
| Explosion layers | 1–2, cap 6 | 3, cap 12 | 5 + shockwave + debris + light, cap 30 |
| Missile trails | short, 10 particles | 25 | 60, plus smoke that lingers |
| Debris | none | 4 chunks | 12 chunks with physics |
| Ships | low-detail | optimized | **original full-detail** (`NF_ORIG`) |
| Post effects | none | none | bloom, plus optional film grain and vignette for trailers |

- A **photo/trailer mode** (proposal): hide the HUD, free camera, slow motion, for capturing storefront shots.

## Milestones (updated)

| M | Deliverable | Lead |
|---|---|---|
| **M0** | `nova` module API + loader; `novaInterior`; `?arena=range`; "VR COMBAT TEST" menu button | Claude |
| **M1** | **Salvage:** drops, greyed salvage targets on the radar and comms, **TRACTOR button**, heat cores as cargo | Claude |
| **M2** | **Firing range:** right-hand gun, **auto-fire aim cone**, **pinch weapon/hand toggle**, **left-fist joystick**, smooth movement and comfort, controller/2D/gamepad. **Owner tests on Quest.** | Claude |
| **M3** | **Missiles + explosions + ULTRA tier:** trails, shockwave, debris, light flash, tier caps, bloom on ULTRA | Claude (+ Gemini textures) |
| **M4** | Enemy AI v1 (drones, turrets), HP and hit feedback, **derelict boarding** (short) | Claude + GPT (`fps_ai.js` module) |
| **M5** | **Morality meter** in the flight log and stats; disabled-ship state; **big pirate ship boarding (about 15 min)** with the salvage / self-destruct finale | Claude |
| **M6** | Alien crew and pirate humanoids (rigged), heavy drone, captain boss; MR passthrough arena | Claude + owner models |
| **M7** | Polish: sound, haptics, balance, photo mode | All |

Each milestone is its own PR with a `TESTING.md` section.

## Who does what

- **Claude:** `nova` API, interiors, weapons, hand input, salvage, VFX tiers, morality, integration, testing.
- **GPT / Codex (pushes to `codex/...` branches):** `fps_ai.js` (enemy state machines) and other self-contained modules. **Must keep LF line endings** (`.gitattributes` now enforces this).
- **AI Studio:** wrist HUD (heat, HP, objective), morality page layout, boarding briefing panel. Panel code only.
- **Gemini API (run by Claude):** metal and deck textures, decals, hazard stripes, smoke puff sheet for trails, shockwave ring, salvage-pod and heat-core glow, target faces.
- **Owner (Tripo / Blender / Mixamo):** the models below.

## Assets needed (owner)

| Asset | File | Budget | For |
|---|---|---|---|
| Laser pistol (held) | `models/laser_pistol.glb` | 0.3 m, under 6k tris, grip origin at the hand | M2 |
| Salvage pod + heat core | `models/salvage_pod.glb`, `models/heat_core.glb` | 1.5 m / 0.5 m, under 3k tris | M1 |
| Arena kit (floor, wall, door, pillar, cover crate, airlock, stairs, wall turret) | `models/kit_*.glb` | 2 m grid, under 2k tris each | M4 |
| Pirate ship interior set (bridge console, engine core, bunks, cargo racks) | `models/kit_pirate_*.glb` | under 5k tris each | M5 |
| Fusion core (engineering centrepiece) | `models/fusion_core.glb` | 3 m, under 10k tris, emissive | M5 |
| Laser rifle, scatter blaster | `models/laser_rifle.glb`, `models/scatter.glb` | 0.8 m, under 8k tris | M5 |
| Heavy drone | `models/drone_heavy.glb` | 2 m, under 8k tris | M6 |
| Pirate grunt, pirate captain (**rigged**: idle, walk, run, shoot, hit, die) | `models/pirate_grunt.glb`, `models/pirate_captain.glb` | under 15k tris | M6 |
| Alien crew combat animations (shoot, hit, die) | added to `alien_crew.glb` | — | M6 |
| SFX: pistol, rifle, heat vent, drone hum, enemy shot, tractor, airlock, alarm, self-destruct countdown | `public/sfx/*.mp3` | under 60 KB each | M2–M5 |

Budgets follow `ASSET_SPEC.md`. Add an `optimize_nova.py` rule for each new model type.

## Quest performance budget (interiors)

- Under 150 draw calls and 150k triangles visible.
- One light plus emissive materials, no real-time shadows.
- At most 4 enemies and 10 enemy bolts.
- Textures at 1024 px or less; kit pieces instanced.
- The capped VFX path in VR. ULTRA is for PC only.

## Testing

- `?arena=range`, `?arena=derelict`, `?board=pirate` jump straight in, in 2D or VR.
- `window.novaTest.salvage()` spawns pods; `.board()` boards the nearest target; `.boom('ultra')` shows the new explosion.
- Each milestone adds `TESTING.md` checks: comfort, frame rate on Quest, hand gun accuracy, fist movement, tractor selection.

## Still open (owner)

1. Who hunts the heat cores, and why is the system cooling? (Lore beyond the anchor sentence.)
2. Morality effects: which unlocks or penalties do you want? (The list above is a proposal.)
3. Should the 3D holo-radar move? It currently sits over the centre telemetry screen (see the radar placement question).
