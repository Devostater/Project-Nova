/**
 * Project Nova cinematics player (intro / epilogue).
 * Plays ./video/<name>.mp4 with ./video/<name>.vtt captions when the files exist:
 *  - 2D: Immersive full-screen theater overlay with high-fidelity custom controls,
 *        native captions, volume/scrubber, play/pause, fullscreen, and quick close.
 *  - VR / MR: An immersive curved IMAX-style cinema screen positioned in front of
 *        the headset with dark surround dome blocking out the cockpit/stars.
 * Audio: Complete silence of all game noises, Web Audio oscillators, engine hums,
 *        radio chatter, and BGM during playback.
 * Navigation: Zero unwanted game spawns or launches on completion/close.
 */
export function init(nova = {}) {
  const T = nova.THREE || window.THREE;
  const renderer = nova.renderer || window.renderer;
  const scene = nova.scene || window.scene;
  const camera = nova.camera || window.camera;

  const candidateBases = [
    'video/',
    'public/video/',
    '../video/',
    '../public/video/',
    './video/',
    './public/video/',
    'news/video/',
    'public/news/video/',
    '../news/video/',
    '../public/news/video/',
    './news/video/',
    './public/news/video/'
  ];

  function getCandidateUrls(name, ext = 'mp4') {
    const list = [];
    try {
      if (typeof import.meta !== 'undefined' && import.meta.url) {
        list.push(new URL('../video/' + name + '.' + ext, import.meta.url).href);
        list.push(new URL('../../public/video/' + name + '.' + ext, import.meta.url).href);
      }
    } catch (_) {}
    candidateBases.forEach(b => list.push(b + name + '.' + ext));
    list.push('public/video/' + name + '/' + name + '.' + ext);
    list.push('video/' + name + '/' + name + '.' + ext);
    return Array.from(new Set(list));
  }

  async function resolveMedia(name, ext = 'mp4') {
    const urls = getCandidateUrls(name, ext);
    for (const u of urls) {
      try {
        const r = await fetch(u, { method: 'HEAD', cache: 'no-cache' });
        if (r.ok) return u;
      } catch (_) {}
    }
    for (const u of urls) {
      try {
        const r = await fetch(u, { method: 'GET', headers: { Range: 'bytes=0-0' }, cache: 'no-cache' });
        if (r.ok || r.status === 206) return u;
      } catch (_) {}
    }
    return urls[0];
  }

  async function exists(name) {
    const urls = getCandidateUrls(name, 'mp4');
    for (const u of urls) {
      try {
        const r = await fetch(u, { method: 'HEAD', cache: 'no-cache' });
        if (r.ok) return true;
      } catch (_) {}
      try {
        const r = await fetch(u, { method: 'GET', headers: { Range: 'bytes=0-0' }, cache: 'no-cache' });
        if (r.ok || r.status === 206) return true;
      } catch (_) {}
    }
    return false;
  }

  async function loadCues(name) {
    const urls = getCandidateUrls(name, 'vtt');
    let text = null;
    for (const u of urls) {
      try {
        const r = await fetch(u, { cache: 'no-cache' });
        if (r.ok) { text = await r.text(); break; }
      } catch (_) {}
    }
    if (!text) return [];
    try {
      const ts = s => {
        const p = s.trim().split(':').map(Number);
        return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
      };
      return text.replace(/\r/g, '').split('\n\n').map(b => {
        const lines = b.split('\n');
        const i = lines.findIndex(l => l.includes('-->'));
        if (i < 0) return null;
        const [a, z] = lines[i].split('-->').map(s => ts(s.split(' ')[0] || s));
        return { a, z, text: lines.slice(i + 1).join(' ').replace(/<[^>]+>/g, '').trim() };
      }).filter(Boolean);
    } catch (_) { return []; }
  }

  let playing = null;

  async function play(name, opts = {}) {
    if (playing) {
      try { playing.end(); } catch (_) {}
    }

    const videoUrl = await resolveMedia(name, 'mp4');
    const vttUrl = await resolveMedia(name, 'vtt');

    const v = document.createElement('video');
    v.src = videoUrl;
    v.playsInline = true;
    v.preload = 'auto';
    // Do not set v.crossOrigin = 'anonymous' for same-origin media to avoid local server CORS rejections
    const tr = document.createElement('track');
    tr.kind = 'captions';
    tr.srclang = 'en';
    tr.label = 'English';
    tr.default = true;
    tr.src = vttUrl;
    v.appendChild(tr);

    let done, cleanup = [];
    const finished = new Promise(r => { done = r; });

    // ── TOTAL SILENCE: Mute all game sounds, oscillators, engine rumble & BGM ──
    window.novaCinematicPlaying = true;
    const audioCtx = window.sound?.ctx;
    let wasCtxRunning = false;
    if (audioCtx && audioCtx.state === 'running') {
      wasCtxRunning = true;
      try { audioCtx.suspend(); } catch (_) {}
    }
    const masterGain = window.sound?._nmaster?.gain;
    let prevMasterGain = null;
    if (masterGain) {
      try {
        prevMasterGain = masterGain.value;
        masterGain.setValueAtTime(0, 0);
      } catch (_) {}
    }
    const pausedAudios = [];
    try {
      document.querySelectorAll('audio').forEach(a => {
        if (!a.paused) {
          try { a.pause(); pausedAudios.push(a); } catch (_) {}
        }
      });
      if (window.NRM?.el) {
        Object.values(window.NRM.el).forEach(a => {
          if (a && !a.paused) {
            try { a.pause(); pausedAudios.push(a); } catch (_) {}
          }
        });
      }
    } catch (_) {}
    const wasBgm = typeof window.isBgmPlaying !== 'undefined' ? window.isBgmPlaying : true;
    window.isBgmPlaying = false;

    const end = () => {
      if (!playing) return;
      playing = null;
      window.novaCinematicPlaying = false;
      try { v.pause(); } catch (_) {}
      cleanup.forEach(f => { try { f(); } catch (_) {} });

      // Only restore game audio if we are actually flying in-game (not on main menu modal)
      const menuModal = document.getElementById('modal-overlay');
      const isMenuOpen = menuModal && menuModal.style.display !== 'none';
      if (!isMenuOpen && !opts.fromMenu) {
        if (wasCtxRunning && audioCtx && audioCtx.state === 'suspended') {
          try { audioCtx.resume(); } catch (_) {}
        }
        if (masterGain && prevMasterGain !== null) {
          try { masterGain.setValueAtTime(prevMasterGain, 0); } catch (_) {}
        }
        if (wasBgm) window.isBgmPlaying = true;
        pausedAudios.forEach(a => { try { a.play().catch(() => {}); } catch (_) {} });
      }
      done(true);
    };

    playing = { name, end, video: v };
    v.addEventListener('ended', end);

    // If initial candidate video fails, try next candidate
    const candidateUrls = getCandidateUrls(name, 'mp4');
    let candidateIdx = candidateUrls.indexOf(videoUrl);
    v.addEventListener('error', (e) => {
      if (candidateIdx < candidateUrls.length - 1) {
        candidateIdx++;
        v.src = candidateUrls[candidateIdx];
        v.play().catch(() => {});
      } else {
        console.warn(`[cinematics] Video failed to load for "${name}":`, e);
        end();
      }
    });

    const isPresentingVR = !!(renderer && renderer.xr && renderer.xr.isPresenting);

    if (isPresentingVR && T && scene && camera) {
      // ══════════════════════════════════════════════════════════════════════════
      // VR / MR CINEMA THEATER (Curved IMAX Screen + Dark Surround Dome)
      // ══════════════════════════════════════════════════════════════════════════
      const xrGroup = new T.Group();
      xrGroup.name = 'NOVA_VR_CINEMA';

      // Dark surround backdrop (radius 1.8m) to completely block the cockpit & space
      const backGeo = new T.SphereGeometry(1.8, 32, 16);
      const backMat = new T.MeshBasicMaterial({ color: 0x000000, side: T.BackSide, depthWrite: false });
      const backMesh = new T.Mesh(backGeo, backMat);
      backMesh.renderOrder = -1;
      xrGroup.add(backMesh);

      // Curved Cinema Screen (width 3.2m, height 1.8m, distance 2.1m)
      const tex = new T.VideoTexture(v);
      tex.colorSpace = T.SRGBColorSpace;
      tex.minFilter = T.LinearFilter;
      tex.magFilter = T.LinearFilter;

      // Curved cylinder segment centered facing the player
      const radius = 2.1;
      const screenH = 1.8;
      const theta = 1.52; // ~87 degrees horizontal FOV
      const screenGeo = new T.CylinderGeometry(radius, radius, screenH, 32, 1, true, Math.PI - theta / 2, theta);
      screenGeo.scale(-1, 1, 1); // Flip inside out so texture maps to interior
      const screenMat = new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide, toneMapped: false });
      const screenMesh = new T.Mesh(screenGeo, screenMat);
      screenMesh.position.set(0, 0, 0);
      xrGroup.add(screenMesh);

      // Subtitles canvas plane
      const cv = document.createElement('canvas');
      cv.width = 1024; cv.height = 128;
      const cx = cv.getContext('2d');
      const capTex = new T.CanvasTexture(cv);
      const capMat = new T.MeshBasicMaterial({ map: capTex, transparent: true, depthWrite: false });
      const capMesh = new T.Mesh(new T.PlaneGeometry(2.4, 0.3), capMat);
      capMesh.position.set(0, -screenH * 0.45, -radius * 0.95);
      xrGroup.add(capMesh);

      let cues = [];
      loadCues(name).then(c => { cues = c; });
      let lastCue = null;
      const capTick = setInterval(() => {
        const t = v.currentTime;
        const c = cues.find(q => t >= q.a && t <= q.z);
        const txt = c ? c.text : '';
        if (txt === lastCue) return;
        lastCue = txt;
        cx.clearRect(0, 0, 1024, 128);
        if (txt) {
          cx.fillStyle = 'rgba(0,0,0,0.75)';
          cx.fillRect(40, 24, 944, 80);
          cx.fillStyle = '#00f0ff';
          cx.font = 'bold 34px monospace';
          cx.textAlign = 'center';
          cx.fillText(txt, 512, 78, 920);
        }
        capTex.needsUpdate = true;
      }, 80);

      // Attach cinema directly to camera so it stays centered and level
      camera.add(xrGroup);

      // WebXR controller triggers & grips to skip or pause
      const ses = renderer.xr.getSession?.();
      const onSelect = () => {
        if (v.paused) v.play().catch(() => {});
        else v.pause();
      };
      const onSqueeze = () => end();
      if (ses) {
        ses.addEventListener('selectstart', onSelect);
        ses.addEventListener('squeezestart', onSqueeze);
      }

      cleanup.push(() => {
        clearInterval(capTick);
        if (ses) {
          ses.removeEventListener('selectstart', onSelect);
          ses.removeEventListener('squeezestart', onSqueeze);
        }
        camera.remove(xrGroup);
        tex.dispose(); capTex.dispose();
        backGeo.dispose(); backMat.dispose();
        screenGeo.dispose(); screenMat.dispose(); capMat.dispose();
      });
    } else {
      // ══════════════════════════════════════════════════════════════════════════
      // 2D IMMERSIVE FULL-SCREEN THEATER OVERLAY
      // ══════════════════════════════════════════════════════════════════════════
      const wrap = document.createElement('div');
      wrap.id = 'nova-cinematic-wrap';
      wrap.style.cssText = [
        'position: fixed', 'inset: 0', 'z-index: 2147483647',
        'background: #000', 'display: flex', 'flex-direction: column',
        'align-items: center', 'justify-content: center',
        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
        'user-select: none', 'overflow: hidden'
      ].join(';');

      // ── Header Bar ──
      const header = document.createElement('div');
      header.style.cssText = [
        'position: absolute', 'top: 0', 'left: 0', 'right: 0',
        'padding: 16px 24px', 'display: flex', 'justify-content: space-between',
        'align-items: center', 'background: linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
        'z-index: 10', 'transition: opacity 0.3s ease'
      ].join(';');

      const title = document.createElement('div');
      title.innerHTML = `<span style="color:#00f0ff;font-weight:bold;letter-spacing:2px;font-size:16px;">PROJECT NOVA</span> <span style="color:#6699aa;font-size:14px;margin-left:8px;">// ${name.toUpperCase()}</span>`;
      
      const headerRight = document.createElement('div');
      headerRight.style.cssText = 'display: flex; gap: 12px; align-items: center;';

      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&#10006; CLOSE';
      closeBtn.title = 'Close video and return to menu (Esc)';
      closeBtn.style.cssText = [
        'background: rgba(40,15,25,0.7)', 'border: 1px solid #ff4466',
        'color: #ff8899', 'font-size: 13px', 'font-weight: bold',
        'padding: 7px 16px', 'border-radius: 6px', 'cursor: pointer',
        'transition: all 0.15s ease'
      ].join(';');
      closeBtn.onmouseenter = () => { closeBtn.style.background = '#ff4466'; closeBtn.style.color = '#fff'; };
      closeBtn.onmouseleave = () => { closeBtn.style.background = 'rgba(40,15,25,0.7)'; closeBtn.style.color = '#ff8899'; };
      closeBtn.onclick = (e) => { e.stopPropagation(); end(); };

      const skipBtn = document.createElement('button');
      skipBtn.innerHTML = 'SKIP &#9654;';
      skipBtn.title = 'Skip to end';
      skipBtn.style.cssText = [
        'background: rgba(0,35,50,0.7)', 'border: 1px solid #00e5ff',
        'color: #00f0ff', 'font-size: 13px', 'font-weight: bold',
        'padding: 7px 16px', 'border-radius: 6px', 'cursor: pointer',
        'transition: all 0.15s ease'
      ].join(';');
      skipBtn.onmouseenter = () => { skipBtn.style.background = '#00e5ff'; skipBtn.style.color = '#000'; };
      skipBtn.onmouseleave = () => { skipBtn.style.background = 'rgba(0,35,50,0.7)'; skipBtn.style.color = '#00f0ff'; };
      skipBtn.onclick = (e) => { e.stopPropagation(); end(); };

      headerRight.append(skipBtn, closeBtn);
      header.append(title, headerRight);

      // ── Main Video ──
      v.style.cssText = [
        'max-width: 100vw', 'max-height: 86vh', 'width: 100%',
        'height: auto', 'object-fit: contain', 'cursor: pointer',
        'box-shadow: 0 0 60px rgba(0, 229, 255, 0.15)'
      ].join(';');
      v.onclick = (e) => {
        e.stopPropagation();
        if (v.paused) v.play().catch(() => {});
        else v.pause();
        updatePlayBtn();
      };

      // ── Click to Unmute Center Overlay (if browser blocks audio autoplay) ──
      const unmutePrompt = document.createElement('div');
      unmutePrompt.innerHTML = '&#128266; CLICK TO UNMUTE AUDIO';
      unmutePrompt.style.cssText = [
        'position: absolute', 'top: 50%', 'left: 50%', 'transform: translate(-50%, -50%)',
        'background: rgba(0, 20, 35, 0.88)', 'border: 2px solid #00f0ff',
        'color: #00f0ff', 'font-size: 18px', 'font-weight: bold',
        'padding: 16px 28px', 'border-radius: 12px', 'cursor: pointer',
        'box-shadow: 0 0 30px rgba(0, 240, 255, 0.5)', 'z-index: 20', 'display: none'
      ].join(';');
      unmutePrompt.onclick = (e) => {
        e.stopPropagation();
        v.muted = false;
        v.play().catch(() => {});
        unmutePrompt.style.display = 'none';
      };

      // ── Bottom Controls Bar ──
      const controls = document.createElement('div');
      controls.style.cssText = [
        'position: absolute', 'bottom: 0', 'left: 0', 'right: 0',
        'padding: 16px 24px', 'background: linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0) 100%)',
        'display: flex', 'flex-direction: column', 'gap: 10px',
        'z-index: 10', 'transition: opacity 0.3s ease'
      ].join(';');

      // Scrubber Track
      const scrubContainer = document.createElement('div');
      scrubContainer.style.cssText = 'position: relative; width: 100%; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; cursor: pointer;';
      const scrubFill = document.createElement('div');
      scrubFill.style.cssText = 'position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: #00f0ff; border-radius: 4px; box-shadow: 0 0 10px #00f0ff;';
      scrubContainer.appendChild(scrubFill);

      scrubContainer.onclick = (e) => {
        e.stopPropagation();
        const rect = scrubContainer.getBoundingClientRect();
        const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (v.duration) v.currentTime = frac * v.duration;
      };

      // Controls row
      const ctrlRow = document.createElement('div');
      ctrlRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

      const leftCtrls = document.createElement('div');
      leftCtrls.style.cssText = 'display: flex; gap: 16px; align-items: center;';

      const playBtn = document.createElement('button');
      playBtn.style.cssText = 'background:none;border:none;color:#00f0ff;font-size:22px;cursor:pointer;padding:0;outline:none;line-height:1;';
      function updatePlayBtn() {
        playBtn.innerHTML = v.paused ? '&#9654;' : '&#10074;&#10074;';
      }
      updatePlayBtn();
      playBtn.onclick = (e) => {
        e.stopPropagation();
        if (v.paused) v.play().catch(() => {});
        else v.pause();
        updatePlayBtn();
      };

      const timeDisplay = document.createElement('span');
      timeDisplay.style.cssText = 'color: #9fc3d8; font-size: 13px; font-variant-numeric: tabular-nums;';
      const fmtTime = (s) => {
        if (!s || isNaN(s)) return '00:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      };
      timeDisplay.textContent = '00:00 / 00:00';

      leftCtrls.append(playBtn, timeDisplay);

      const rightCtrls = document.createElement('div');
      rightCtrls.style.cssText = 'display: flex; gap: 16px; align-items: center;';

      const volBtn = document.createElement('button');
      volBtn.style.cssText = 'background:none;border:none;color:#9fc3d8;font-size:18px;cursor:pointer;padding:0;outline:none;';
      volBtn.innerHTML = '&#128266;';
      volBtn.onclick = (e) => {
        e.stopPropagation();
        v.muted = !v.muted;
        volBtn.innerHTML = v.muted ? '&#128263;' : '&#128266;';
      };

      const fsBtn = document.createElement('button');
      fsBtn.style.cssText = 'background:none;border:none;color:#9fc3d8;font-size:18px;cursor:pointer;padding:0;outline:none;';
      fsBtn.innerHTML = '&#9974;';
      fsBtn.title = 'Toggle Fullscreen (F)';
      fsBtn.onclick = (e) => {
        e.stopPropagation();
        if (!document.fullscreenElement) {
          wrap.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      };

      rightCtrls.append(volBtn, fsBtn);
      ctrlRow.append(leftCtrls, rightCtrls);
      controls.append(scrubContainer, ctrlRow);

      // Time progress updater
      v.ontimeupdate = () => {
        if (v.duration) {
          const frac = (v.currentTime / v.duration) * 100;
          scrubFill.style.width = frac + '%';
          timeDisplay.textContent = `${fmtTime(v.currentTime)} / ${fmtTime(v.duration)}`;
        }
      };
      v.onplay = () => updatePlayBtn();
      v.onpause = () => updatePlayBtn();

      wrap.append(header, v, unmutePrompt, controls);
      document.body.appendChild(wrap);

      // Auto-hide controls on mouse inactivity
      let fadeTimer = null;
      const showControls = () => {
        header.style.opacity = '1';
        controls.style.opacity = '1';
        clearTimeout(fadeTimer);
        fadeTimer = setTimeout(() => {
          if (!v.paused) {
            header.style.opacity = '0';
            controls.style.opacity = '0';
          }
        }, 3000);
      };
      wrap.onmousemove = showControls;
      wrap.ontouchstart = showControls;
      showControls();

      // Keyboard hotkeys
      const onKey = (e) => {
        if (e.code === 'Escape') {
          e.preventDefault();
          end();
        } else if (e.code === 'Space' || e.code === 'KeyK') {
          e.preventDefault();
          if (v.paused) v.play().catch(() => {});
          else v.pause();
          updatePlayBtn();
          showControls();
        } else if (e.code === 'KeyF') {
          e.preventDefault();
          if (!document.fullscreenElement) wrap.requestFullscreen?.().catch(() => {});
          else document.exitFullscreen?.().catch(() => {});
        } else if (e.code === 'KeyM') {
          e.preventDefault();
          v.muted = !v.muted;
          volBtn.innerHTML = v.muted ? '&#128263;' : '&#128266;';
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          v.currentTime = Math.min(v.duration || 9999, v.currentTime + 5);
          showControls();
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - 5);
          showControls();
        }
      };
      window.addEventListener('keydown', onKey, true);
      cleanup.push(() => {
        window.removeEventListener('keydown', onKey, true);
        clearTimeout(fadeTimer);
        wrap.remove();
      });
    }

    // Attempt video playback
    try {
      await v.play();
    } catch (err) {
      // If browser blocked unmuted autoplay, mute and prompt user
      v.muted = true;
      try {
        await v.play();
        const p = document.getElementById('nova-cinematic-wrap')?.querySelector('div[style*="CLICK TO UNMUTE"]');
        if (p) p.style.display = 'block';
      } catch (err2) {
        console.warn('[cinematics] Video playback failed:', err2);
        end();
        return false;
      }
    }

    return finished;
  }

  return {
    play,
    exists,
    skip: () => playing && playing.end(),
    get playing() { return !!playing; }
  };
}
