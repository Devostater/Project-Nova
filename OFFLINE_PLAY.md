# Play Project Nova offline on Quest

The game is already an installable web app (PWA): `public/manifest.webmanifest` + `public/sw.js` precaches **112 files / ~87 MB** (everything except the optional ULTRA original-detail ships in `Alien/ EDF/ Pirate/`). After **one full online load from an HTTPS address**, it runs with no internet.

> Why not straight from the PC? The Quest only installs and caches web apps from a trusted HTTPS site. The PC server's self-signed `https://<PC-IP>:8443` works for playing but not for installing or offline use.

## Step 1: host it once (pick one)

**A. Cloudflare Pages (free; keeps the repo private). Recommended.**
1. Go to dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**, then pick `Devostater/Project-Nova`.
2. Build settings: **Framework: None**, **Build command:** *(leave empty)*, **Output directory:** `public`.
3. Deploy. You get `https://project-nova-xxx.pages.dev`, which updates on every merge to `main`.

**B. GitHub Pages** (needs a public repo or GitHub Pro): Settings → Pages → Source: **GitHub Actions**, then Actions → **Deploy game to GitHub Pages** → Run workflow. The address is `https://devostater.github.io/Project-Nova/`.

## Step 2: install on the Quest

**Easiest:** in the Quest Browser open `<your-url>/standalone.html`, wait until the toast **MODELS: N loaded** appears (everything is cached by then), then use the browser menu **⋮ → Install app** (or Add to Library). Launch it from your Library from then on, online or offline.

**With your Meta SDK (sideloaded APK, shows in the Library like a store app):**
1. Have `ovr-platform-util` (Meta Quest Platform Utility) and the Android SDK installed.
2. Run `tools\make_quest_apk.bat <your-url>`. It writes `ProjectNova.apk`.
3. Sideload: `adb install -r ProjectNova.apk` (or drag it into SideQuest / the Meta Quest Developer Hub).
4. Open it once while online so the service worker caches the game; after that it works offline.

## Updating

New versions arrive on the next online launch (the page is network-first; assets are cache-first). Each release bumps the cache name in `sw.js` (`nova-alpha-x.y`), so old files are replaced.

## Troubleshooting

- **Old version still showing:** open it online and reload once.
- **Offline shows nothing:** the first load didn't finish. Open online and wait for "MODELS: N loaded".
- **ULTRA graphics offline:** the original-detail ships aren't precached (about 93 MB); use LOW–HIGH offline.
