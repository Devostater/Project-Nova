# Vertical Slice: "Cold Run" (target: Beta demo)

One complete, polished 25–30 minute session that shows every pillar of Project Nova at **MAX/ULTRA quality** (owner target). It builds on Alpha 1.4 in `main`.

| # | Beat | Pillar | Built? |
|---|---|---|---|
| 1 | Launch from Nova-1, cockpit intro, companion line | Cockpit / VR presence | ✅ |
| 2 | Free flight, music stations, warp to the Graveyard | Flight / warp / music | ✅ |
| 3 | Pirate ambush: dogfight, missile trails, big explosions | Space combat | ✅ (A3) |
| 4 | Salvage: tractor pods; one holds a **heat core** | Salvage / economy | ✅ (A2) |
| 5 | A derelict's distress beacon: dock and **BOARD** | Boarding | ❌ A10–A12 |
| 6 | On foot: right-hand laser gun, fist-joystick movement, drones in a dark corridor | VR FPS | ❌ A10, A11, A5 |
| 7 | The derelict's **fusion core**: take it (morality −) or leave it for the crew pods (morality +) | Morality / story | ❌ A13 |
| 8 | Return, sell cores at the Lantern, the crew comments on your choice | Economy / companions | partial |
| 9 | End card: flight record, morality, stats, "to be continued" | Progression | ❌ A14 |

## Follow-on social-space slice: first cantina

This slice extends the Cold Run return leg into a believable station stop. It reuses the owner's bar, booth, stool, glasses and bottle assets, with the existing alien-pilot model as the temporary bartender. The layout is deliberately modular so later stations can reuse the room logic with different lighting, emblems, NPCs and services.

### Floor plan and player flow

Use a **16 m wide (X) × 22 m deep (Z) × 6 m high** room. The player enters from the dock/airlock at the south center (`z=+10.5`) facing north. Maintain a minimum **1.5 m accessible path**, a **2.2 m main aisle**, 2.1 m standing head clearance and comfortable VR turn space at every terminal.

1. **Dock threshold / return point — south, z +10.5:** 2.4 m airlock, station status panel and one-action return-to-ship control. Exiting and re-entering must preserve the player's ship/cockpit state.
2. **Arrival sightline — center aisle:** keep the middle visually open. From the door the player immediately sees the alien bartender, the cyan NOVA NET display and the raised rear landing; no booth or prop blocks this line.
3. **Bar — west wall, x −7 to −3:** 7 m counter from z +5 to −2 with a 3 m return toward the room center. Place 6–7 stools at 0.8 m centers. Leave a 1 m staff lane behind it and put bottles/glasses on the backbar rather than loose across the player path.
4. **Crew booths — east wall, x +4.5 to +7.5:** four 2.4 × 1.8 m booth bays from z +6 to −4. The nearest booth is a recruit/crew conversation hotspot; the others support ambient patrons and short incidents.
5. **NOVA NET terminal — northeast, x +5.8 / z −6:** wall screen center at 1.45 m with a 2 × 2 m clear approach zone. It shows scrollable event articles and response windows without blocking flight input when the player leaves the terminal.
6. **Crew network — northwest beside bar end, x −5.2 / z −6:** freestanding terminal for recruit, roster, wing, fleet, colors and emblem management. Keep it separated from the bartender interaction so both can be used independently.
7. **Incident floor — center, x 0 / z 0:** a clear 5 × 6 m zone for a dispute, recruitment scene, small station event or NPC gathering. Normal navigation never spawns furniture here.
8. **Rear mezzanine — north, z −9.5 at y +2.4:** 1.4 m stair on the east, railings, two overlook tables and a closed future-content door. It provides depth and silhouettes but is optional for the first interactive pass.
9. **Service/exit landmarks:** warm amber airlock lights, cyan services, magenta social signage and red only for alarms. Every entrance has a visible route back; Escape/B and a physical EXIT panel both return safely.

### Interaction and population pass

- First playable population: alien bartender, one recruitable pilot, two seated patrons and two standing ambient patrons. Cap close animated characters at six for the first Quest test; use distant silhouettes or seated idle loops for atmosphere.
- Bartender offers three concise choices: local news, buy a drink/rumor, or ask about crew. The recruit offers professional, empathetic and risky responses plus recruit/decline. Conversation state belongs to the crew network, not the room mesh.
- NOVA NET and crew terminals use ≥7 cm world-space buttons and scrolling that works by ray, controller, gamepad, mouse and touch. Their UI canvases remain independent from decorative holo screens.
- Cantina incidents run only after entry settles, never while a dialogue, purchase or mandatory choice is open. The central zone stays clear so an incident can be staged without moving permanent furniture.
- Glasses, bottles, stools and booth modules are instanced/shared; no geometry or material allocation occurs per frame. Static shell pieces should be merged by material after layout is approved, while doors, screens, props and seats remain separate.

### Acceptance for the social-space pass

- Dock → airlock → cantina → terminal/conversation → return to ship works in 2D, keyboard/mouse, gamepad and Quest VR.
- The bar, one booth interaction, NOVA NET, crew network and exit are reachable without teleporting through furniture; seated eye lines and standing controls are readable at human scale.
- The bartender uses the alien-pilot placeholder without changing the source model; later bartender/recruit models can replace it through named spawn anchors.
- MAX/ULTRA keeps the hero materials and lighting target. Quest receives LOD/instancing/culling, not a reduction of the source-quality art.
- No per-frame geometry/material creation, no lost cockpit state, no trapped FPS mode, and no terminal that steals flight input after exit.

**Acceptance:** playable start to finish in 2D, gamepad and VR without errors; saves and resumes; no placeholder text; ULTRA looks storefront-ready.

Rules: as in `AI_QUEUE.md` (latest `main`, own branch plus a draft PR, three game files in sync, LF line endings, questions in `OWNER_QUESTIONS.md` with a default, and a handoff in `AI_STATUS.md`).
