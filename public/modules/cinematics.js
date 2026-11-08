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
        list.push(new URL('../news/video/' + name + '.' + ext, import.meta.url).href);
        list.push(new URL('../news/video/' + name + '/' + name + '.' + ext, import.meta.url).href);
      }
    } catch (_) {}
    candidateBases.forEach(b => {
      list.push(b + name + '.' + ext);
      list.push(b + name + '/' + name + '.' + ext);
    });
    list.push('public/video/' + name + '/' + name + '.' + ext);
    list.push('video/' + name + '/' + name + '.' + ext);
    list.push('public/news/video/' + name + '/' + name + '.' + ext);
    list.push('news/video/' + name + '/' + name + '.' + ext);
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
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.preload = 'auto';
    // Append to document.body so Meta Quest / Chromium Android hardware video pipeline decodes frames for WebGL in WebXR
    v.style.position = 'fixed';
    v.style.top = '0';
    v.style.left = '0';
    v.style.width = '1px';
    v.style.height = '1px';
    v.style.opacity = '0.001';
    v.style.pointerEvents = 'none';
    v.style.zIndex = '-9999';
    document.body.appendChild(v);

    const tr = document.createElement('track');
    tr.kind = 'captions';
    tr.srclang = 'en';
    tr.label = 'English';
    tr.default = true;
    tr.src = vttUrl;
    v.appendChild(tr);

    let done, cleanup = [];
    const finished = new Promise(r => { done = r; });
    cleanup.push(() => {
      try { v.remove(); } catch (_) {}
    });

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

      // ── 1. Hide Player Cockpit, Seat, Canopies & Ship Meshes ──
      const hiddenObjects = [];
      const hideMesh = (obj) => {
        if (obj && obj.visible) {
          obj.visible = false;
          hiddenObjects.push(obj);
        }
      };
      if (window.cockpit) hideMesh(window.cockpit);
      if (window.cannonGroup) hideMesh(window.cannonGroup);
      if (window.cockpitDashLight) hideMesh(window.cockpitDashLight);
      if (window.cockpitDomeLight) hideMesh(window.cockpitDomeLight);
      if (window.seatGroup) hideMesh(window.seatGroup);
      if (window.shipGroup) {
        window.shipGroup.children.forEach(c => {
          if (c !== window.cameraRig && c !== camera && c !== camera.parent) {
            hideMesh(c);
          }
        });
      }

      cleanup.push(() => {
        hiddenObjects.forEach(obj => {
          try { if (obj) obj.visible = true; } catch (_) {}
        });
      });

      const xrGroup = new T.Group();
      xrGroup.name = 'NOVA_VR_CINEMA';

      // ── 2. Full Surround Dark Cinema Dome (radius 25m, depthWrite = true) ──
      const backGeo = new T.SphereGeometry(25, 32, 16);
      const backMat = new T.MeshBasicMaterial({ color: 0x020306, side: T.BackSide, depthWrite: true });
      const backMesh = new T.Mesh(backGeo, backMat);
      backMesh.renderOrder = 0;
      xrGroup.add(backMesh);

      // ── 3. Curved IMAX Cinema Screen (16:9 aspect, radius 2.3m, arc 66 deg) ──
      const tex = new T.VideoTexture(v);
      tex.colorSpace = T.SRGBColorSpace;
      tex.minFilter = T.LinearFilter;
      tex.magFilter = T.LinearFilter;
      tex.generateMipmaps = false;

      const radius = 2.3;
      const screenH = 1.35;
      const theta = 1.15; // ~66 degree horizontal arc
      const screenGeo = new T.CylinderGeometry(radius, radius, screenH, 40, 1, true, Math.PI - theta / 2, theta);
      screenGeo.scale(-1, 1, 1); // Flip inside out so texture maps to interior facing viewer
      const screenMat = new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide, toneMapped: false });
      const screenMesh = new T.Mesh(screenGeo, screenMat);
      screenMesh.position.set(0, 0, 0);
      screenMesh.renderOrder = 1;
      xrGroup.add(screenMesh);

      // ── 4. WebXR Video Texture Frame Update Loop ──
      let cineLoopActive = true;
      const updateVideoFrame = () => {
        if (!cineLoopActive) return;
        if (v.readyState >= 2) {
          tex.needsUpdate = true;
        }
        if ('requestVideoFrameCallback' in v) {
          v.requestVideoFrameCallback(updateVideoFrame);
        }
      };
      if ('requestVideoFrameCallback' in v) {
        v.requestVideoFrameCallback(updateVideoFrame);
      }
      const videoInterval = setInterval(() => {
        if (v.readyState >= 2) {
          tex.needsUpdate = true;
        }
      }, 33);
      cleanup.push(() => {
        cineLoopActive = false;
        clearInterval(videoInterval);
      });

      // ── 5. Subtitles Canvas Plane ──
      const cv = document.createElement('canvas');
      cv.width = 1024; cv.height = 128;
      const cx = cv.getContext('2d');
      const capTex = new T.CanvasTexture(cv);
      const capMat = new T.MeshBasicMaterial({ map: capTex, transparent: true, depthWrite: false });
      const capMesh = new T.Mesh(new T.PlaneGeometry(2.4, 0.3), capMat);
      capMesh.position.set(0, -screenH * 0.42, -radius * 0.95);
      capMesh.renderOrder = 2;
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
      cleanup.push(() => clearInterval(capTick));

      // ── 6. 3D Floating Interactive Exit Button for Hands & Controllers ──
      const exitBtnCanvas = document.createElement('canvas');
      exitBtnCanvas.width = 512; exitBtnCanvas.height = 128;
      const exitCtx = exitBtnCanvas.getContext('2d');
      const exitTex = new T.CanvasTexture(exitBtnCanvas);
      const drawExitBtn = (hovered = false) => {
        exitCtx.clearRect(0, 0, 512, 128);
        exitCtx.fillStyle = hovered ? 'rgba(255, 40, 70, 0.95)' : 'rgba(40, 12, 22, 0.88)';
        exitCtx.beginPath();
        exitCtx.roundRect(16, 16, 480, 96, 24);
        exitCtx.fill();
        exitCtx.strokeStyle = hovered ? '#ffffff' : '#ff4466';
        exitCtx.lineWidth = 6;
        exitCtx.stroke();
        exitCtx.fillStyle = hovered ? '#ffffff' : '#ff8899';
        exitCtx.font = 'bold 38px monospace';
        exitCtx.textAlign = 'center';
        exitCtx.fillText('✖ EXIT CINEMA (TOUCH)', 256, 76);
        exitTex.needsUpdate = true;
      };
      drawExitBtn(false);

      const exitBtnMat = new T.MeshBasicMaterial({ map: exitTex, transparent: true, side: T.DoubleSide });
      const exitBtnMesh = new T.Mesh(new T.PlaneGeometry(0.85, 0.22), exitBtnMat);
      exitBtnMesh.position.set(0, -screenH * 0.62, -radius * 0.92);
      exitBtnMesh.renderOrder = 3;
      xrGroup.add(exitBtnMesh);

      // ── 7. Anchor Cinema to CameraRig / Scene Facing Viewer ──
      const host = window.cameraRig || scene;
      if (host === window.cameraRig) {
        xrGroup.position.set(camera.position.x, camera.position.y, camera.position.z);
        xrGroup.rotation.y = camera.rotation.y;
      } else {
        const headPos = new T.Vector3();
        camera.getWorldPosition(headPos);
        xrGroup.position.copy(headPos);
        const headEuler = new T.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
        xrGroup.rotation.y = headEuler.y;
      }
      host.add(xrGroup);

      // ── 8. Hand Tracking Interaction & Gesture Exit ──
      let exitHovered = false;
      let lastPinchTime = 0;
      const handCheckTick = setInterval(() => {
        if (!isPresentingVR) return;
        const exitWorldPos = new T.Vector3();
        exitBtnMesh.getWorldPosition(exitWorldPos);

        const testPoints = [];
        const h1 = renderer.xr.getHand ? renderer.xr.getHand(0) : null;
        const h2 = renderer.xr.getHand ? renderer.xr.getHand(1) : null;
        [h1, h2].forEach(h => {
          if (!h || !h.joints) return;
          ['index-finger-tip', 'thumb-tip', 'wrist'].forEach(jn => {
            const j = h.joints[jn];
            if (j && j.visible !== false) {
              const p = new T.Vector3();
              j.getWorldPosition(p);
              testPoints.push({ pos: p, isIndex: jn === 'index-finger-tip', isWrist: jn === 'wrist' });
            }
          });
        });

        const c1 = renderer.xr.getController ? renderer.xr.getController(0) : null;
        const c2 = renderer.xr.getController ? renderer.xr.getController(1) : null;
        [c1, c2].forEach(c => {
          if (c && c.visible !== false) {
            const p = new T.Vector3();
            c.getWorldPosition(p);
            testPoints.push({ pos: p, isIndex: true });
          }
        });

        // Touch exit button with finger or controller
        let touched = false;
        for (const pt of testPoints) {
          if (pt.pos.distanceTo(exitWorldPos) < 0.16) {
            touched = true;
            break;
          }
        }
        if (touched !== exitHovered) {
          exitHovered = touched;
          drawExitBtn(exitHovered);
        }
        if (touched) {
          end();
          return;
        }

        // Hand brought to headset / face (< 0.18m from camera) -> intuitive hand exit
        const camPos = new T.Vector3();
        camera.getWorldPosition(camPos);
        for (const pt of testPoints) {
          if (pt.isIndex && pt.pos.distanceTo(camPos) < 0.18) {
            end();
            return;
          }
        }
      }, 50);

      const ses = renderer.xr.getSession?.();
      const onSelect = () => {
        const now = performance.now();
        if (exitHovered || (now - lastPinchTime < 450)) {
          end();
        } else {
          lastPinchTime = now;
          if (v.paused) v.play().catch(() => {});
          else v.pause();
        }
      };
      const onSqueeze = () => end();
      if (ses) {
        ses.addEventListener('selectstart', onSelect);
        ses.addEventListener('squeezestart', onSqueeze);
        ses.addEventListener('end', end);
      }

      cleanup.push(() => {
        clearInterval(handCheckTick);
        if (ses) {
          ses.removeEventListener('selectstart', onSelect);
          ses.removeEventListener('squeezestart', onSqueeze);
          ses.removeEventListener('end', end);
        }
        host.remove(xrGroup);
        tex.dispose(); capTex.dispose(); exitTex.dispose();
        backGeo.dispose(); backMat.dispose();
        screenGeo.dispose(); screenMat.dispose(); capMat.dispose(); exitBtnMat.dispose();
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
