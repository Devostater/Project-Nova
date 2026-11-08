# Gemini Image Generation Prompts — Nova News & Faction Drama

This document contains production-ready prompts designed for Google Gemini (Imagen 3 / Multimodal image generation). Use these prompts to generate visual assets for the news terminal, VR cockpit HUDs, news articles, icons, and video chyrons in *Project Nova*.

---

## 📐 Strict Art Direction & Quality Rules

1. **The Core Lore Anchor**:
   > *“Humanity is growing colder. Heat cores and fusion cores are sought after across the system.”*
   Emphasize cold, austere, utilitarian metal hulls contrasted with precious, warm pools of practical light (golden-orange thermal radiators, amber-core glows, deep tungsten lamps).
2. **NO IN-IMAGE TEXT OR WATERMARKS**:
   - **Crucial Rule**: Never generate text, headlines, faux-English letters, alien alphabets, logos, or watermarks in the image.
   - All headlines, dates, and chyrons are rendered directly by the game UI code or overlaid in CapCut.
3. **Aspect Ratios & Framing**:
   - **Articles**: 16:9 widescreen (`--aspect 16:9`). Always keep critical action within the central 1:1 square safe zone so it renders seamlessly on VR cockpit multi-function displays (MFDs) and wrist screens.
   - **Icons / Badges**: 1:1 square (`--aspect 1:1`). Centered, isolated insignia, high-contrast silhouette.
   - **Banners / Chyrons**: 21:9 ultrawide (`--aspect 21:9`). Cinematic panoramic vistas.
4. **Output Target**:
   - Save original high-resolution outputs to `art_src/news/`.
   - Export 512×288 or 1024×576 WebP images to `public/news/` for in-game use.

---

## 📰 Part 1: News Article Hero Images (16:9)

### Article 01 — Sector 4 Life Support Freeze Out
* **Story Context**: Grid failure on an outer civilian habitat. Life support is dropping to sub-zero temperatures.
* **Aspect Ratio**: 16:9 (Square crop safe)
* **Prompt**:
> `16:9 cinematic concept art for Project Nova; sci-fi space sim; humanity is growing colder; heat and fusion cores are sought after. Inside a freezing industrial space station habitat, heavy frost and ice crystals creep across titanium bulkheads and reinforced observation glass. Silhouettes of bundled civilian workers in heavy pressurized survival jackets huddle around a single warm glowing cylindrical heat core resting on an equipment crate. Cold industrial lighting with high contrast warm amber-gold radiance from the thermal core. Believable hard-surface sci-fi, realistic atmospheric haze, gritty textures. No text, no letters, no logos, no watermarks; central square crop safe.`

---

### Article 02 — EDF Core Embargo & Fleet Blockade
* **Story Context**: Earth Defense Fleet dreadnoughts enforce strict military rationing, interdicting private haulers at the Helios Jump Gate.
* **Aspect Ratio**: 16:9 (Square crop safe)
* **Prompt**:
> `16:9 cinematic space scene for Project Nova; humanity is growing colder; heat and fusion cores are sought after. An immense, angular Earth Defense Fleet military dreadnought in dark naval grey steel hovers in deep space, casting an imposing silhouette. Powerful spotlights from the dreadnought illuminate a small, weathered civilian cargo freighter held stationary in space. Cold, dark void background with distant frozen starfields and subtle solar flare rim lighting. Realistic hard-surface aerospace design, utilitarian naval plating. No text, no captions, no HUD markings, no watermarks; central square crop safe.`

---

### Article 03 — Corsair Raider Ambush on Core Convoy
* **Story Context**: Pirate skiffs attack a corporate fuel transport in the jagged asteroid fields.
* **Aspect Ratio**: 16:9 (Square crop safe)
* **Prompt**:
> `16:9 cinematic action frame for Project Nova; humanity is growing colder. In the treacherous shadow of a dense asteroid debris field, three sleek predatory pirate raider starfighters with rust-red trim maneuver closely around a crippled heavy freighter. Magnetic tow cables latch onto a luminous, glowing orange fusion core battery being hoisted out of the freighter's exposed hull. Jagged floating rock fragments catch sharp rim light from a distant cold sun. Gritty, dynamic space combat concept art, realistic sparks and thruster trails. No text, no words, no watermarks; central square crop safe.`

---

### Article 04 — The Clanker Awakening: Alien Automaton Derelict
* **Story Context**: A mysterious non-human derelict begins radiating power in deep nebular space.
* **Aspect Ratio**: 16:9 (Square crop safe)
* **Prompt**:
> `16:9 cinematic sci-fi concept art for Project Nova; space exploration. Deep inside a cold, dark blue reflective gas nebula, a massive dormant alien automaton starship stirs to life. Intricate, geometric, non-human hull architecture with ancient biomechanical lines and iridescent emerald-green energy veins pulsing slowly through the hull fractures. A tiny human scout starfighter observes from a cautious distance, dwarfed by the scale of the alien craft. Atmospheric, mysterious, high fidelity hard sci-fi. No text, no labels, no watermarks; central square crop safe.`

---

### Article 05 — Cantina Shadow Market Standoff
* **Story Context**: A rogue pilot attempts to auction a military-grade heat core in the dimly lit Nova-1 cantina.
* **Aspect Ratio**: 16:9 (Square crop safe)
* **Prompt**:
> `16:9 cinematic interior shot for Project Nova; station cantina. Grimy, atmospheric space station cantina under low tungsten and cyan neon mood lighting. In a corner booth, a cloaked pilot in worn flight gear guards an open shockproof case holding a vibrant pulsing orange heat core. Shadowy patrons and alien silhouettes look on with tense postures; one stands with a hand lingering near a holstered sidearm. Dense cyberpunk-space-sim atmosphere, frosted drink glasses on steel tables, volumetric cigarette smoke and condensation haze. No text, no UI, no watermarks; central square crop safe.`

---

### Article 06 — Hazard Operation: Core Extraction from Capital Wreck
* **Story Context**: Hazardous salvage teams race against time to extract a volatile core from a drifting wreck.
* **Aspect Ratio**: 16:9 (Square crop safe)
* **Prompt**:
> `16:9 cinematic space salvage scene for Project Nova; humanity is growing colder. A lone pilot's starfighter hovers meters above the torn open reactor bay of a drifting shattered capital ship hull. A bright beam of tractor light locks onto an exposed, radiant supercritical fusion core pulsating with blinding yellow-white plasma sparks. Twisted steel girders, severed conduit cables, and floating micro-debris glint in the beam. Hyper-detailed, photoreal cinematic sci-fi render, deep space contrast. No text, no numbers, no watermarks; central square crop safe.`

---

### Article 07 — The Long Winter: Refugee Flotilla
* **Story Context**: Civilians abandon an unheated lunar colony, migrating in makeshift convoys across the black.
* **Aspect Ratio**: 16:9 (Square crop safe)
* **Prompt**:
> `16:9 cinematic wide shot for Project Nova. A desperate civilian refugee flotilla traversing the vast dark expanse of deep space. Converted cargo containers, aging modular haulers, and patched shuttlecraft fly in tight defensive formation, their hulls frosted with pale white ice buildup. Faint warm amber light shines through tiny cabin portholes against the infinite cold vacuum. Emotional, grand scale, grounded hard science fiction. No text, no graphics, no watermarks; central square crop safe.`

---

## 🏷️ Part 2: Faction Crests & Topic Badges (1:1 Square)

Generate these with isolated centers and clean backgrounds (dark slate or transparent) for use as channel icons, holographic HUD emblems, and news category markers.

### Icon 01 — Nova Net Official News Crest
* **Prompt**:
> `1:1 square centered sci-fi emblem; holographic communication network crest for Nova Net. A minimalist stylized orbital relay satellite surrounded by clean radial broadcast signal rings and concentric telemetry arcs. Luminous cyan and electric blue hologram vector style, sharp geometric lines, dark carbon background, sleek UI asset, no text, no letters, no watermarks.`

### Icon 02 — Earth Defense Fleet (EDF) Insignia
* **Prompt**:
> `1:1 square centered military faction badge; Earth Defense Fleet. An angular, heavy-duty naval shield crest featuring stylized hawk wings flanking a sharp five-pointed navigational star. Cold battleship steel, titanium trim, deep navy blue enamel inlay, subtle gold edge highlight, industrial military aesthetic. Completely isolated on a neutral dark graphite background, no text, no words, no watermarks.`

### Icon 03 — Corsair Raiders / Pirate Clan Badge
* **Prompt**:
> `1:1 square centered outlaw insignia; Corsair Pirate Clan. Stylized cybernetic skull formed from geometric thruster nozzles and crossed industrial plasma torches. Distorted holographic glitch aesthetic, aggressive sharp silhouette, crimson red and warning orange glowing lines against pitch black. No text, no letters, no watermarks.`

### Icon 04 — Alien Automaton / Clanker Glyph
* **Prompt**:
> `1:1 square centered alien faction emblem; ancient automaton intelligence. An enigmatic non-human glyph composed of interlocking floating geometric crystal shards and organic circuit vectors. Iridescent jade green and pale gold bioluminescent glow, subtle ancient artifact patina, floating in deep dark space. No text, no letters, no watermarks.`

### Icon 05 — Thermal Crisis / Deep Freeze Alert
* **Prompt**:
> `1:1 square centered emergency warning icon; space station thermal crisis. A hexagonal industrial hazard icon containing a fractured ice snowflake split in half by a warning thermometer gauge. High contrast safety hazard yellow and warning amber with ice frost highlights on dark matte metal. Clean UI game icon, no text, no numbers, no watermarks.`

### Icon 06 — Heat Core / Salvage Bounty
* **Prompt**:
> `1:1 square centered sci-fi commodity icon; salvage heat core. A heavy-duty cylindrical magnetic containment core battery, glowing intensely with warm fusion plasma from inside reinforced cooling vents. Centered inside a subtle circular targeting reticle. Realistic metal textures, clean icon framing, dark background, no text, no watermarks.`

### Icon 07 — Audio Podcast / Comms Wave Crest
* **Prompt**:
> `1:1 square centered media icon; deep space radio broadcast. A stylized retro-futuristic flight helmet comms mic intersecting with a glowing digital audio equalizer waveform circle. Luminous amber and warm copper hologram aesthetic, dark background, clean UI iconography, no text, no letters, no watermarks.`

---

## 📺 Part 3: News Banners & Chyrons (21:9 Ultrawide)

Use these ultra-wide banners for news ticker headers, loading screens, and video broadcast backdrops in CapCut.

### Banner 01 — Deep Freeze Orbital Shipyard
* **Prompt**:
> `21:9 ultrawide panoramic cinematic vista for Project Nova. An immense orbital construction shipyard in deep space, completely shut down and locked in creeping glacial frost and ice sheets. Cold blue star in the far distance casts long dramatic shadows across derelict scaffolding and dormant ship hulls. Lone emergency strobe beacons blink in amber along the perimeter. Photorealistic hard sci-fi environment, expansive scale. No text, no chyrons, no watermarks.`

### Banner 02 — Border Sector War Mobilization
* **Prompt**:
> `21:9 ultrawide cinematic military panorama for Project Nova. An armada of EDF warships and heavy cruisers arrayed in defensive line formation along the perimeter of an asteroid belt, engines glowing pale blue. Distant laser flak bursts illuminate dust plumes on the dark horizon. High tension military sci-fi atmosphere, wide angle lens. No text, no HUD, no watermarks.`

### Banner 03 — Pirate Radio Cockpit Studio
* **Prompt**:
> `21:9 ultrawide panoramic interior shot for Project Nova. The cramped, customized cockpit of a smuggler vessel converted into an underground pirate radio broadcast studio. Cluttered with diagnostic monitors casting warm amber and red glow, analog audio knobs, jury-rigged comms transceivers, and viewports looking out at spinning space debris. Moody, gritty, atmospheric space outlaw den. No readable text, no letters, no watermarks.`
