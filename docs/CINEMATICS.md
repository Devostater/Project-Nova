# Cinematics — Project Nova / AZI

Proposed treatment of the owner's plan: short, skippable, captioned, replayable, locally packaged intro and campaign-state epilogue, with in-engine fallback. This is a storyboard handoff, not finished video or new canon.

## Art direction and lore

Read [AZI studio identity](../reference/azi/STUDIO_IDENTITY.md), [brand guide](../reference/azi/BRAND_GUIDE.md) and [Project Nova note](../reference/mind-space/PROJECT_NOVA_NOTE.md). AZI is the parent studio; no official logo, palette, typeface or tagline is approved. Cold metal with small pools of warm practical light is a proposed Project Nova treatment, not official AZI branding. Do not import Mind Space cryogenic/repeat-run lore or Matrix biography. Use existing station/ship references rather than redesigning familiar silhouettes.

Established anchor: **humanity is growing colder; heat/fusion cores are sought after**. Why the system cools and who hunts cores remain open. Voice lines below are proposed anonymous narration/comms; do not assign them to named companions without approval. Every spoken line gets a matching separate caption cue. Generated art must contain no captions, readable UI text, logos or watermarks; add title/credits in CapCut.

## CapCut / delivery notes

Master: **1920×1080, 16:9, 30fps, H.264 MP4**, AAC stereo, fast-start/web optimized. Target **under approximately 25 MB per film**. Start at 1.8 Mbps video + 128 kbps audio for the 80s intro (~19.3 MB before container overhead); 2.8 Mbps + 128 kbps for the 48s epilogue (~17.6 MB). Check actual file sizes; lower bitrate if needed. Keep a higher-quality editing master separately.

Export **1440×1440 VR covers** from the same scenes, reframed rather than squeezed. Default deliverable is a cover image; if square video previews are needed, export separately at 30fps H.264 within the same size budget. Keep important subjects in a central-square safe area. These are flat cinematic compositions, not 360° video.

Runtime targets: `public/video/intro.mp4`, `public/video/intro.vtt`, `public/video/epilogue.mp4`, `public/video/epilogue.vtt`. Suggested covers: `public/video/intro-cover.jpg`, `public/video/epilogue-cover.jpg`. Caption files are separate UTF-8 **WebVTT**, beginning with `WEBVTT`, synchronized to recorded dialogue, maximum two readable lines per cue, **not burned into the MP4**. Split the lines below into speech-timed cues, not one caption held over an entire silent shot. Titles and credits are separate editorial graphics.

Use owner-cleared original music, preserve actual artist credits, duck music under narration and avoid clipping. Slow pans/2.5D moves, stable horizon, no camera shake or flashing cuts. Owner edits/reviews in CapCut; Antigravity supplies storyboard images; Claude implements playback, caption toggle, skip/replay, seen flags, state selection and offline fallback. Do not create placeholder runtime videos from this document.

## Intro — 80 seconds (target 60–90s)

Introduce the cold crisis and the delivery/choice loop; leave the exact first objective to the current mission state. Prompts below each stand alone and request one storyboard still.

1. **I01 — 10s, 00:00–00:10.** Camera: slow drift from deep space toward Nova-1. Action: tiny station lights emerge against the immense system. Voice/caption: “Humanity is growing colder.” Music: sustained low synth and distant radio texture. Transition: fade from black, dissolve toward hull.

   **Antigravity prompt:** 16:9 cinematic storyboard still for Project Nova under Absolute Zero Interactive (AZI); humanity is growing colder; heat/fusion cores are sought after. Nova-1 tiny against immense dark space, a few warm occupied windows on cold industrial hull, grounded existing ship/station shapes. Proposed cold-metal/warm-practical-light treatment, no invented AZI branding or other-property lore. No text, captions or watermark; central-square crop safe.

2. **I02 — 10s, 00:10–00:20.** Camera: gentle lateral track along station window. Action: bundled crew shelter beside a dim heater while a supply ship approaches outside. Voice/caption: “Across the system, heat cores and fusion cores are sought after.” Music: restrained two-note pulse enters. Transition: match warm window light to core glow.

   **Antigravity prompt:** 16:9 cinematic Project Nova storyboard for AZI; humanity is growing colder; heat/fusion cores are sought after. Station observation window, bundled civilian silhouettes near a modest heater, supply ship approaching outside; practical metal construction, scarce warm light against cold space, no explanation of the cold's cause. No official invented AZI palette/logo, no Mind Space crossover, no words or captions; square-crop safe.

3. **I03 — 10s, 00:20–00:30.** Camera: slow push toward cargo cradle. Action: gloved hands secure a luminous core in transport restraints. Voice/caption: “A core can keep a ship moving. Or a station alive.” Music: soft mechanical beat joins pulse. Transition: cut on restraint lock.

   **Antigravity prompt:** 16:9 cinematic Project Nova / AZI storyboard; humanity is growing colder; heat/fusion cores are sought after. Close view of gloved hands securing a luminous heat core in rugged cargo restraints, believable engineering, warm reflected light on cold metal, no new technical labels or faction symbols. Proposed property-specific treatment, no invented studio branding or crossover lore; no text/captions/watermark; central-square safe.

4. **I04 — 10s, 00:30–00:40.** Camera: measured pan across cantina counter. Action: a pilot receives a delivery assignment; patrons glance toward an abstract news display. Voice/caption: “Every delivery has a destination. Every choice has a cost.” Music: muted melody over room tone. Transition: glass reflection dissolves to cockpit glass.

   **Antigravity prompt:** 16:9 cinematic Project Nova / AZI storyboard; humanity is growing colder; heat/fusion cores are sought after. Nova-1 cantina, alien bartender behind bar, pilot silhouette receiving a job, cups and restrained warm lamps in a cold industrial room, abstract unreadable news graphics. Use existing environment references, no new named characters or AZI logo, no Mind Space lore; no words/captions/watermark; square-crop safe.

5. **I05 — 10s, 00:40–00:50.** Camera: seated cockpit framing, gentle focus shift forward. Action: hands settle on left throttle/right stick; route becomes visible. Voice/caption: “Nova-Lead, your flight is ready.” Music: steady beat and quiet comms chime. Transition: cut along forward sightline.

   **Antigravity prompt:** 16:9 cinematic Project Nova / AZI storyboard; humanity is growing colder; heat/fusion cores are sought after. Seated pilot cockpit, gloved hands at left throttle and right flight stick, clear forward window, subtle holographic route lines without readable text; grounded familiar cockpit geometry, warm controls against cold space. No invented AZI mark or crossover lore; no captions/watermark; square-crop safe.

6. **I06 — 10s, 00:50–01:00.** Camera: slow tracking behind departing fighter. Action: station recedes; distant convoy crosses the route. Voice/caption: “Fly the route. Watch your contacts. Bring the cargo home.” Music: wider synth texture and measured bass. Transition: match distant route light to salvage beacon.

   **Antigravity prompt:** 16:9 cinematic Project Nova / AZI storyboard; humanity is growing colder; heat/fusion cores are sought after. Player starfighter departing Nova-1 into spacious flight lanes, distant convoy and carrier silhouette, readable scale, warm station behind and vast cold space ahead, existing-model silhouettes. Proposed art treatment only, no unapproved factions/branding; no text or captions; square-crop safe.

7. **I07 — 10s, 01:00–01:10.** Camera: cautious approach to dark derelict without rapid rotation. Action: beacon blinks; a faint core glow remains inside damaged engineering. Voice/caption: “Out here, what you take matters. So does what you leave.” Music: beat thins, brief radio hush. Transition: beacon dissolves to cockpit target light.

   **Antigravity prompt:** 16:9 cinematic Project Nova / AZI storyboard; humanity is growing colder; heat/fusion cores are sought after. Disabled derelict in dark space, tiny salvage beacon and faint warm fusion-core glow through damaged engineering, isolated player fighter in foreground, grounded industrial detail, moral uncertainty without new lore. No invented AZI logo or crossover, no words/captions/watermark; central-square safe.

8. **I08 — 10s, 01:10–01:20.** Camera: calm cockpit-forward hold. Action: editor-added Project Nova title fades up, then hands back to gameplay. Voice/caption: “Project Nova. Your next choice is ahead.” Music: motif resolves without final crash, ambience continues into play. Transition: fade title, match gameplay framing.

   **Antigravity prompt:** 16:9 cinematic Project Nova / AZI storyboard; humanity is growing colder; heat/fusion cores are sought after. Stable forward starfighter cockpit opening onto immense starfield, one distant warm station light, hopeful uncertainty, central negative space for editor-added title; cold metal and practical warmth, no official invented AZI design or other-property lore. No generated text/captions/watermark; square-crop safe.

## Epilogue — 48 seconds (target 45–60s)

Use actual saved outcomes for supply/territory, crew relationships, morality and owned fleet/carrier. Missing facts use neutral plates and neutral voice, never an invented death, victory or purchase. Keep six-shot timing identical across approved variants. One base image prompt per shot; owner can derive approved outcome plates from those references. Record only the selected alternate, never both.

1. **E01 — 8s, 00:00–00:08.** Camera: slow station approach. Action: player returns; damage/light grade reflects earned outcome. Voice/caption: “You came back. The system remembers what you brought with you.” Music: intro motif returns softly. Transition: fade from gameplay to exterior.

   **Antigravity prompt:** 16:9 cinematic Project Nova / AZI storyboard; humanity is growing colder; heat/fusion cores are sought after. Returning starfighter approaching station, lived-in hull wear, restrained warm arrival lights against cold space; neutral base suitable for alternate outcome grade, no unearned victory or named casualties. No invented AZI logo or crossover lore, no text/captions/watermark; square-crop safe.

2. **E02 — 8s, 00:08–00:16.** Camera: gentle push toward engineering window. Action: supply outcome shows maintained lights or a reduced pool of warmth. Voice/caption: protected supply: “The lights stayed on.” Lost supply: “Some lights did not return.” Neutral: “The work of keeping them lit goes on.” Music: sustained chord and machinery tone. Transition: soft dissolve to crew scene.

   **Antigravity prompt:** 16:9 cinematic Project Nova / AZI storyboard; humanity is growing colder; heat/fusion cores are sought after. Station engineering window showing a secured core supplying practical lights, unnamed maintenance silhouettes, warmth concentrated around core amid cold metal; neutral composition usable for dimmed outcome variant. No invented causes, factions, branding or crossovers; no words/captions/watermark; square-crop safe.

3. **E03 — 8s, 00:16–00:24.** Camera: slow cantina lateral move. Action: crew presence reflects saved relationships; avoid implying death from an empty seat. Voice/caption: supported crew: “There were people waiting.” Otherwise: “There were empty places, too.” Neutral: “Every return has a story.” Music: intimate melodic phrase over room tone. Transition: match cantina seat to hangar foreground.

   **Antigravity prompt:** 16:9 cinematic Project Nova / AZI storyboard; humanity is growing colder; heat/fusion cores are sought after. Nova-1 cantina, alien bartender, unnamed crew silhouettes and a foreground empty chair, intimate practical lamps in cold industrial surroundings, reflective atmosphere without implying a named death. Existing environment references; no invented AZI logo/crossover lore, no words/captions; square-crop safe.

4. **E04 — 8s, 00:24–00:32.** Camera: steady wide across hangar opening. Action: show carrier/fleet only if owned; otherwise single player ship. Voice/caption: carrier owned: “You built a place for others to fly from.” Otherwise: “One ship was enough to make a difference.” Neutral: “There is still another flight ahead.” Music: broaden motif gently, no victory fanfare. Transition: dissolve hangar opening into space route.

   **Antigravity prompt:** 16:9 cinematic Project Nova / AZI storyboard; humanity is growing colder; heat/fusion cores are sought after. Spacious hangar threshold with single player starfighter and dark empty berths, composition allowing earned owned-fleet/carrier inserts in editing, believable existing ship shapes and restrained warmth. No invented purchases, factions, AZI mark or other-property lore; no text/captions/watermark; square-crop safe.

5. **E05 — 8s, 00:32–00:40.** Camera: slow drift along quiet route. Action: core transport continues toward distant beacon. Voice/caption: “Humanity is still growing colder. The next delivery still matters.” Music: brief quiet under opening words, motif returns. Transition: route lights fade toward one beacon.

   **Antigravity prompt:** 16:9 cinematic Project Nova / AZI storyboard; humanity is growing colder; heat/fusion cores are sought after. Small transport with secured luminous core crossing immense quiet space toward distant station beacon, fragile warm cargo glow against cold darkness, grounded engineering, no revelation of why the system cools. No invented AZI branding or crossover; no words/captions/watermark; central-square safe.

6. **E06 — 8s, 00:40–00:48.** Camera: locked wide, breathing space. Action: editor-added flight-record/credits overlay; actual return/replay control belongs to game player. Voice/caption: “Your flight is recorded. Your choices remain.” Music: soft resolution; two-second ambience tail within eight seconds. Transition: picture and music fade to black, return to game.

   **Antigravity prompt:** 16:9 cinematic Project Nova / AZI storyboard; humanity is growing colder; heat/fusion cores are sought after. Sparse starfield, tiny departing fighter and one warm beacon, reflective open ending, generous negative space for editor-added flight record and Absolute Zero Interactive credits. No generated logo or type, no crossover lore, no captions/watermark; square-crop safe.

## Review / integration checklist

Name stills I01–I08 and E01–E06. Check model/lighting continuity, both export crops, duration and actual file size. Caption text must match final recorded alternates. Retain a neutral epilogue; list any approved state-specific cuts in Claude's player manifest rather than silently overwriting the neutral file. Use approved stills for the in-engine fallback. Test offline decode, caption toggle, skip/replay, first-run seen state and comfortable Quest framing during integration; none of these runtime checks is claimed by this planning commit.
