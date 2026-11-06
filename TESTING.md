# Alpha 1.1 Test Checklist

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
