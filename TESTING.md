# Alpha 1.1 Test Checklist

Alpha 1.1 bundles today's work: restored gamepad/tablet/device detection, GLB models loading in the web build, the VFX texture pack (clean atlas explosions, lasers, shields, beams), and AI Studio's panel updates.

Mark each line ✅ / ❌ and note anything odd. Report back to Claude with the ❌ lines (a screenshot or photo helps).

## Start

- [ ] **Quest 3 (easiest, no PC needed):** in the Quest browser open **https://devostater.github.io/Project-Nova/** and bookmark it. It updates automatically after each merge to `main`; `version.txt` on the site shows which commit is live.
- [ ] **PC:** open the same link in Chrome, or double-click `start_server.bat` for a local copy.
- [ ] **Quest over USB (fallback):** run `tools/play_on_quest.bat`, or open `https://<PC-IP>:8443/standalone.html`.
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
