# Play Project Nova offline on Quest

Project Nova is a Progressive Web App. Its service worker precaches the root/public game bundle after a successful HTTPS load, so the same installed build can start without a network connection. The APK is a signed Meta Quest PWA wrapper around the hosted site; it does **not** embed the entire game in the APK.

Meta's current packaging path uses `@meta-quest/bubblewrap-cli`, not the older `ovr-platform-util create-pwa` command.

## Prerequisites

- Node.js 18 or newer.
- A public HTTPS deployment whose web root is this repository's `public/` directory.
- A Meta Quest in Developer Mode.
- Android Platform Tools (`adb`) for sideloading.
- A Java/Android signing setup accepted by Bubblewrap. Keep signing keys and passwords outside this repository.
- For store distribution, create the app in the Meta Horizon Developer Dashboard. A local sideload test does not publish anything.

Official references:

- [Meta: Package a PWA](https://developers.meta.com/vr/documentation/web/pwa-packaging/)
- [Meta: Progressive Web Apps](https://developers.meta.com/vr/documentation/web/pwa-overview/)
- [Android: adb](https://developer.android.com/tools/adb)

## 1. Audit the offline bundle

From PowerShell at the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/check_offline_cache.ps1
```

The audit verifies that:

- both service workers list the same files;
- every listed file exists in its matching root/public tree;
- neither cache list contains duplicates;
- both web manifests are valid JSON with a name, start URL and icons.

Run this before every APK build and after adding a model, module, texture, audio file or video intended to work offline.

## 2. Deploy the PWA over HTTPS

Choose one:

- **Cloudflare Pages:** framework None, no build command, output directory `public`.
- **GitHub Pages:** use the repository's Pages workflow and its generated HTTPS URL.

Confirm these URLs load before packaging:

```text
https://YOUR-HOST/manifest.webmanifest
https://YOUR-HOST/standalone.html
https://YOUR-HOST/sw.js
```

Service workers require a secure context. A normal public deployment must use HTTPS.

## 3. Build the Quest APK

Run:

```powershell
tools\make_quest_apk.bat https://YOUR-HOST
```

Or call the PowerShell entry point directly:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/make_quest_apk.ps1 `
  -SiteUrl https://YOUR-HOST
```

The script:

1. checks Node/npx and the hosted manifest, game and service worker;
2. initializes a Meta Quest Bubblewrap project with the pinned CLI version;
3. applies Meta's current Quest Gradle compatibility adjustments (target SDK 32 and `mavenCentral()`);
4. performs the signed build;
5. copies the result to `dist/ProjectNova-Quest.apk`.

Bubblewrap may prompt for signing information. Do not commit the generated `.build/` project, keystore, passwords or APK.

To rebuild the generated working directory:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/make_quest_apk.ps1 `
  -SiteUrl https://YOUR-HOST -Force
```

To build and immediately install on the connected Quest:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/make_quest_apk.ps1 `
  -SiteUrl https://YOUR-HOST -Force -Install
```

Or install manually:

```powershell
adb install -r dist/ProjectNova-Quest.apk
```

## 4. Prime and test offline operation

1. Connect the Quest to Wi-Fi.
2. Launch the installed Project Nova APK.
3. Wait for the game and model-loaded indicator to finish. Visit the firing range once if it is part of the build being tested.
4. Exit the app completely.
5. Disable Wi-Fi on the Quest or use an isolated router profile.
6. Relaunch the APK.
7. Verify cockpit load, saved progress, flight, cached audio/textures/models, range entry/exit and return to cockpit.
8. Re-enable Wi-Fi and launch once more to confirm update recovery.

Record the tested commit, cache version, Quest model and Horizon OS version in the PR handoff. A desktop browser's Offline checkbox is useful but does not replace the headset test.

## Browser-only installation

Packaging is optional. In Quest Browser, open `https://YOUR-HOST/standalone.html`, allow the first load to finish, then use the browser's install/add-to-library action if available. The same offline priming requirement applies.

## Updating and troubleshooting

- **Old version:** launch online and reload so the new service worker/cache version activates.
- **Blank offline launch:** the first load or cache installation did not complete. Reconnect, clear the site/app data, launch again and wait for loading to finish.
- **Build cannot find Bubblewrap:** confirm Node 18+ and that `npx` is on PATH.
- **Gradle/SDK error:** install the Android SDK components requested by Bubblewrap, then rebuild with `-Force`.
- **Signing error:** reuse the same protected keystore for updates; changing the key prevents an in-place APK update.
- **Multiple adb devices:** specify the Quest with `adb -s SERIAL install -r dist/ProjectNova-Quest.apk`.
- **A newly added asset is missing offline:** add it to both `sw.js` FILES lists and rerun `tools/check_offline_cache.ps1`.
