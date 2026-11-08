/**
 * Project Nova cinematics player (intro / epilogue).
 * Plays ./video/<name>.mp4 with ./video/<name>.vtt captions when the files exist:
 *  - 2D: full-screen <video> overlay with native captions and skip button.
 *  - VR / MR: an immersive curved cinema screen positioned directly in front of the headset
 *    (VideoTexture on camera child group) with black surround dome and live canvas captions.
 * Audio: Automatically mutes/pauses background music, ship noises, and ambient sound effects
 * during playback, restoring them cleanly upon completion.
 * Skippable with any key, click, Esc, gamepad button, XR trigger, grip squeeze or hand pinch.
 */
export function init(nova) {
  const T = nova.THREE, renderer = nova.renderer, scene = nova.scene, camera = nova.camera;
  const base = new URL('../video/', import.meta.url).href;
  const known = {};
  let playing = null;

  async function exists(name) {
    if (name in known) return known[name];
    try { const r = await fetch(base + name + '.mp4', { method: 'HEAD', cache: 'no-cache' }); known[name] = r.ok; }
    catch (e) { known[name] = false; }
    return known[name];
  }

  async function loadCues(name) {
    try {
      const r = await fetch(base + name + '.vtt', { cache: 'no-cache' }); if (!r.ok) return [];
      const ts = s => { const p = s.trim().split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
      return (await r.text()).replace(/\r/g, '').split('\n\n').map(b => {
        const lines = b.split('\n'), i = lines.findIndex(l => l.includes('-->')); if (i < 0) return null;
        const [a, z] = lines[i].split('-->').map(s => ts(s.split(' ')[0] || s));
        return { a, z, text: lines.slice(i + 1).join(' ').replace(/<[^>]+>/g, '') };
      }).filter(Boolean);
    } catch (e) { return []; }
  }

  function makeVideo(name) {
    const v = document.createElement('video');
    v.src = base + name + '.mp4'; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
    const tr = document.createElement('track'); tr.kind = 'captions'; tr.srclang = 'en'; tr.label = 'English'; tr.default = true; tr.src = base + name + '.vtt';
    v.appendChild(tr);
    return v;
  }

  async function play(name) {
    if (playing) return true;
    if (!(await exists(name))) return false;
    const v = makeVideo(name);
    let done, cleanup = [];
    const finished = new Promise(r => { done = r; });

    // Mute game noises / BGM during video playback
    window.novaCinematicPlaying = true;
    const pausedAudios = [];
    try {
      document.querySelectorAll('audio').forEach(a => {
        if (!a.paused) { try { a.pause(); pausedAudios.push(a); } catch (_) { } }
      });
      if (window.NRM?.el) {
        Object.values(window.NRM.el).forEach(a => {
          if (!a.paused) { try { a.pause(); pausedAudios.push(a); } catch (_) { } }
        });
      }
    } catch (_) { }

    const end = () => {
      if (!playing) return;
      playing = null;
      window.novaCinematicPlaying = false;
      try { v.pause(); } catch (_) { }
      cleanup.forEach(f => { try { f(); } catch (_) { } });
      // Restore paused audio
      pausedAudios.forEach(a => { try { a.play().catch(() => { }); } catch (_) { } });
      done(true);
    };
    playing = { name, end };
    v.addEventListener('ended', end);
    v.addEventListener('error', () => { known[name] = false; end(); });

    // Skip inputs (keyboard + gamepads)
    const onKey = e => { if (e.repeat) return; e.preventDefault(); end(); };
    setTimeout(() => { if (playing) { addEventListener('keydown', onKey, true); cleanup.push(() => removeEventListener('keydown', onKey, true)); } }, 500);
    const pads = setInterval(() => { for (const p of (navigator.getGamepads?.() || [])) if (p && p.buttons.some(b => b.pressed)) { end(); break; } }, 100);
    cleanup.push(() => clearInterval(pads));

    // Setup 2D or VR presentation
    let xrGroup = null;
    function setupVR() {
      if (xrGroup) return;
      const ses = renderer.xr.getSession?.();
      const tex = new T.VideoTexture(v); tex.colorSpace = T.SRGBColorSpace;
      const W = 3.6, H = 2.02; // 16:9 widescreen cinema
      xrGroup = new T.Group(); xrGroup.name = 'NOVA_VR_CINEMA';

      // Movie theater dark surround backdrop (curved cylinder)
      const backGeo = new T.CylinderGeometry(4.5, 4.5, 5, 32, 1, true, 0, Math.PI * 2);
      const backMat = new T.MeshBasicMaterial({ color: 0x010204, side: T.BackSide });
      const back = new T.Mesh(backGeo, backMat);
      back.position.set(0, 0, 0);

      // Curved or flat screen directly 2.4m in front of camera
      const screenGeo = new T.PlaneGeometry(W, H, 16, 1);
      const screenMat = new T.MeshBasicMaterial({ map: tex, toneMapped: false, side: T.DoubleSide });
      const screen = new T.Mesh(screenGeo, screenMat);
      screen.position.set(0, 0, -2.4);

      // Subtitles canvas plane
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 128;
      const cx = cv.getContext('2d'), capTex = new T.CanvasTexture(cv);
      const capMat = new T.MeshBasicMaterial({ map: capTex, transparent: true, depthWrite: false });
      const cap = new T.Mesh(new T.PlaneGeometry(W, W / 8), capMat);
      cap.position.set(0, -H / 2 - 0.22, -2.38);

      xrGroup.add(back, screen, cap);
      camera.add(xrGroup); // Attached to camera so it tracks head position and ship motion smoothly!

      let cues = []; loadCues(name).then(c => { cues = c; });
      let lastCue = null;
      const capTick = setInterval(() => {
        const t = v.currentTime, c = cues.find(c => t >= c.a && t <= c.z), txt = c ? c.text : '';
        if (txt === lastCue) return; lastCue = txt;
        cx.clearRect(0, 0, 1024, 128);
        if (txt) {
          cx.fillStyle = 'rgba(0,0,0,.72)'; cx.fillRect(0, 20, 1024, 88);
          cx.fillStyle = '#00f0ff'; cx.font = 'bold 36px monospace'; cx.textAlign = 'center';
          cx.fillText(txt, 512, 76, 1000);
        }
        capTex.needsUpdate = true;
      }, 90);

      // XR controller buttons / squeezes / pinches to skip
      const onSel = () => end();
      if (ses) {
        ses.addEventListener('selectstart', onSel);
        ses.addEventListener('squeezestart', onSel);
      }
      cleanup.push(() => {
        clearInterval(capTick);
        if (ses) { ses.removeEventListener('selectstart', onSel); ses.removeEventListener('squeezestart', onSel); }
        camera.remove(xrGroup);
        tex.dispose(); capTex.dispose();
        backGeo.dispose(); backMat.dispose(); screenGeo.dispose(); screenMat.dispose(); capMat.dispose();
        xrGroup = null;
      });
    }

    if (renderer.xr.isPresenting) {
      setupVR();
    } else {
      // 2D display on screen
      const wrap = document.createElement('div');
      wrap.id = 'nova-cinematic-wrap';
      wrap.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#000;display:flex;align-items:center;justify-content:center;cursor:pointer';
      v.style.cssText = 'max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain';
      const skip = document.createElement('div');
      skip.textContent = 'SKIP ▶';
      skip.style.cssText = 'position:absolute;right:24px;bottom:24px;color:#9fd6ee;font:bold 18px monospace;padding:10px 18px;border:2px solid #00e5ff;border-radius:8px;background:rgba(0,20,30,.8);box-shadow:0 0 16px rgba(0,229,255,.4)';
      wrap.append(v, skip);
      document.body.appendChild(wrap);
      setTimeout(() => wrap.addEventListener('click', end), 500);
      cleanup.push(() => wrap.remove());

      // If WebXR session starts during playback, transition to VR cinema screen
      const onSessionStart = () => {
        wrap.style.display = 'none';
        setupVR();
      };
      renderer.xr.addEventListener('sessionstart', onSessionStart);
      cleanup.push(() => renderer.xr.removeEventListener('sessionstart', onSessionStart));
    }

    try { await v.play(); } catch (e) {
      v.muted = true;
      try { await v.play(); } catch (e2) { end(); return false; }
    }
    return finished;
  }

  return { play, exists, skip: () => playing && playing.end(), get playing() { return !!playing; } };
}
