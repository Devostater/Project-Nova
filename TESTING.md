# Alpha 1.4 Demo Test Checklist

Alpha 1.1 bundles today's work: restored gamepad/tablet/device detection, GLB models loading in the web build, the VFX texture pack (clean atlas explosions, lasers, shields, beams), and AI Studio's panel updates.

Mark each line ✅ / ❌ and note anything odd. Report back to Claude with the ❌ lines (a screenshot or photo helps).

## Start

- [ ] **Update the local NOVA folder first:** in GitHub Desktop, **Fetch origin**, then **Pull** (on `main`, after the Alpha 1.1 PR is merged). That updates `standalone.html` and the `fx/`, `vendor/` and `models/` folders that the local server uses.
- [ ] **PC:** double-click `start_server.bat`. Chrome opens the game.
- [ ] **Quest 3:** run `tools/play_on_quest.bat` (USB), or open `https://<PC-IP>:8443/standalone.html` in the Quest browser while `start_server.bat` runs.
- [ ] *(Later, optional)* GitHub Pages link **https://devostater.github.io/Project-Nova/**, once Pages is enabled and the deploy workflow is run.
- [ ] The menu says **"Alpha 1.1"** (Options → credits) and the device line matches what you're on (Desktop / Tablet / Quest).
- [ ] After the first load, quit and reload once. It should still start (offline cache `nova-alpha-1.1`).

## Every mode

| Check | PC 2D | Tablet | Gamepad | Quest VR |
|---|---|---|---|---|
| Menu opens; PLAY starts a flight | | | | |
| Toast "MODELS: N loaded" appears; ships, station and cockpit are real 3D models, not boxes | | | | |
| Fly: pitch, yaw, roll, throttle all respond | | | | |
| Fire lasers: cyan bolts with a bright tip, no rectangles or grid lines | | | | |
| Destroy something: **one** fireball that grows and fades to smoke (not a grid of tiny explosions) | | | | |
| Shield hit: blue hex shimmer on the target | | | | |
| Panels: AI Studio's new panel updates open, read correctly, and close | | | | |
| Pause / menu and back to flight works | | | | |

- **Tablet:** the on-screen flight controller (dual sticks, throttle track, buttons) shows on touch devices and hides in VR.
- **Gamepad:** the menus can be navigated with the D-pad/stick and A/B; in flight, the sticks steer and the triggers fire.

## Quest-specific

- [ ] Shield dome, faction beams and the tractor beam **animate** in the headset (a reviewer questioned this).
- [ ] In a big fight (several explosions at once) the frame rate stays smooth: no stutter or judder. If it drops, note roughly how many explosions were on screen.
- [ ] Hand/controller grip on the joystick and throttle still works; the stick springs back.
- [ ] Passthrough (MR) and full VR both enter and exit cleanly.

## If something fails

Note the mode, what you did, and what happened. On PC, press **F12 → Console** and copy any red errors. On the Quest, a photo of the screen is fine.

## New in Alpha 1.3–1.4 (demo)

- [ ] **Salvage:** destroy a pirate or alien ship. Sometimes grey **SALVAGE** pods drop. Lock one (COMMS list, radar, or target cycle), then **TRACTOR** (COMMS button, **G** on keyboard, or the gamepad **View/Back** button) within 500 m. The pod is pulled in and its contents are added.
- [ ] **Heat cores:** orange-glowing pods. They show in **CARGO → HEAT CORES** and sell at any market (SELL HEAT CORE).
- [ ] **Music (right panel → MUSIC):** ◀/▶ stations, the station logo shows, PREV/PLAY/NEXT, VOL −/+, RANDOM, and AUTO (soundtrack follows cantina/flight/combat).
- [ ] **Warp:** star streaks fly past outside the canopy (never through the cockpit).
- [ ] **3D radar (right-dash position):** easy to reach with the right hand.
- [ ] **Right panel** is bigger and readable in VR.
- [ ] **Frame rate on Quest in a busy area** (station + fighters). Known risk: about 280 draw calls and 770k triangles per frame measured headless (budget about 150 / 300k). Note any judder.
