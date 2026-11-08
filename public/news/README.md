# NOVA NEWS — In-Universe Media, Faction Drama & Broadcasting Hub

Welcome to **Nova News** (also broadcast across the system as **Nova Net** and underground pirate frequencies). This system powers the dynamic story branch, faction politics, and audio-visual atmosphere of *Project Nova*.

---

## 🌌 Lore & World Anchor

> **"Humanity is growing colder. Heat cores and fusion cores are sought after across the system."**

As stellar output wanes and stations freeze over:
- **Earth Defense Fleet (EDF)** locks down civilian core stockpiles under wartime rationing and security embargoes.
- **Corsair Raider Clans / Pirates** hunt isolated core convoys and sell warm kilowatts on the lawless black market.
- **The Alien Swarm / Automaton Derelicts ("Clankers")** stir in deep space near exotic energy anomalies.
- **Nova-1 & Independent Outposts** are caught in the crossfire—ordinary miners, haulers, and cantina pilots deciding each day whether to freeze, fight, or compromise their morals.

---

## 📁 Directory Structure

```text
Project-Nova/
├── news/
│   ├── README.md                           <- This master guide
│   ├── prompts/
│   │   └── GEMINI_IMAGE_PROMPTS.md         <- Ready-to-run prompts for Gemini / Imagen 3
│   ├── audio/
│   │   ├── ELEVENLABS_GUIDE_AND_SCRIPTS.md <- Voice personas, podcast scripts, newsflashes
│   │   └── sample_captions.vtt             <- Subtitle format for in-engine player
│   └── articles/
│       ├── NEWS_BRANCHING_STORIES.md       <- Full article copy & player moral choice trees
│       └── news_feed.json                  <- Structured JSON feed for game engine integration
├── art_src/news/                           <- Drop folder for raw Gemini generated images
└── public/news/                            <- Web-optimized webp/png and audio/video files for runtime
```

---

## 🎨 Asset Generation Pipelines

### 1. Visuals (Gemini / Imagen 3)
- Prompts are curated in [`prompts/GEMINI_IMAGE_PROMPTS.md`](prompts/GEMINI_IMAGE_PROMPTS.md).
- **Format**:
  - **Hero Articles**: 16:9 cinematic concept stills (central 1:1 safe area for VR cockpits).
  - **Topic & Faction Icons**: 1:1 square holographic crests and status badges.
  - **Chyron / Header Banners**: 21:9 ultrawide panoramic broadcast backdrops.
- **Golden Rule**: Never generate text, captions, or watermarks in AI images. Real text is layered cleanly via the game UI or CapCut.
- **Delivery**: Save raw high-res outputs to `art_src/news/`.

### 2. Audio & AI Podcasts (ElevenLabs)
- Scripts and voice presets are detailed in [`audio/ELEVENLABS_GUIDE_AND_SCRIPTS.md`](audio/ELEVENLABS_GUIDE_AND_SCRIPTS.md).
- **Content Types**:
  - **Short Breaking Newsflashes (20–40s)**: Station alerts, military warnings, market crashes.
  - **Radio Talk Shows / AI Podcasts (2–4 min)**: Dual-host debates (*"The Deep Cold Dispatch"*), pirate transmissions (*"Radio Corsair"*).
- **Post-Processing**: Apply a gentle bandpass/radio EQ filter and slight tape saturation for that authentic cockpit comms feel.
- **Delivery**: Save audio files to `public/news/audio/` with paired `.vtt` caption files.

### 3. Video Broadcasts (CapCut)
- Combine Gemini stills (with slow 2.5D camera pushes/parallaxes) + ElevenLabs voiceovers + in-universe HUD chyron overlays.
- Master at **1920×1080 30fps H.264 MP4**, fast-start optimized, targeted under 15 MB.
- Save to `public/news/video/`.
