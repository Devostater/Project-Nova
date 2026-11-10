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

    // Immediately pause game simulation so background space movement stops
    window.isGamePaused = true;
    window.novaCinematicPlaying = true;

    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.preload = 'auto';
    // Append to document.body with active dimensions so Meta Quest / Chromium Android hardware video pipeline decodes frames for WebGL in WebXR
    v.style.position = 'fixed';
    v.style.bottom = '0';
    v.style.left = '0';
    v.style.width = '320px';
    v.style.height = '180px';
    v.style.opacity = '0.01';
    v.style.pointerEvents = 'none';
    v.style.zIndex = '-9999';
    document.body.appendChild(v);

    const tr = document.createElement('track');
    tr.kind = 'captions';
    tr.srclang = 'en';
    tr.label = 'English';
    tr.default = true;
    v.appendChild(tr);

    let done, cleanup = [];
    const finished = new Promise(r => { done = r; });
    cleanup.push(() => {
      try { v.remove(); } catch (_) {}
    });

    // ── TOTAL SILENCE: Mute all game sounds, oscillators, engine rumble & BGM ──
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
      window.isGamePaused = false;
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

    const candidateUrls = getCandidateUrls(name, 'mp4');
    let candidateIdx = 0;
    v.addEventListener('error', (e) => {
      // Guard against seeking errors restarting the video from the beginning
      if (v.currentTime < 0.5 && v.readyState < 2 && candidateIdx < candidateUrls.length - 1) {
        candidateIdx++;
        v.src = candidateUrls[candidateIdx];
        v.play().catch(() => {});
      } else if (v.currentTime < 0.5 && v.readyState < 2) {
        console.warn(`[cinematics] Video failed to load for "${name}":`, e);
        end();
      }
    });

    // Start background media stream resolution
    (async () => {
      try {
        const videoUrl = await resolveMedia(name, 'mp4');
        const vttUrl = await resolveMedia(name, 'vtt');
        if (!playing) return;
        tr.src = vttUrl;
        v.src = videoUrl;
        candidateIdx = candidateUrls.indexOf(videoUrl);
        v.play().catch(() => {});
      } catch (e) {
        console.warn('[cinematics] Failed to load media in background:', e);
      }
    })();

    const isPresentingVR = !!(renderer && renderer.xr && renderer.xr.isPresenting);

    if (isPresentingVR && T && scene && camera) {
      // ══════════════════════════════════════════════════════════════════════════
      // VR / MR CINEMA THEATER (Curved IMAX Screen + Dark Surround Dome)
      // ══════════════════════════════════════════════════════════════════════════

      // ── 1. Hide Player Cockpit, Ship, Stars, Planets & All Space Objects ──
      const hiddenObjects = [];
      const hideMesh = (obj) => {
        if (obj && obj.visible) {
          obj.visible = false;
          hiddenObjects.push(obj);
        }
      };

      // Completely isolate the cinema from the rest of the 3D scene (no stars, planets, ship or lasers poking through)
      const prevSceneBackground = scene ? scene.background : null;
      if (scene) {
        scene.background = new T.Color(0x000000);
        if (scene.children) {
          scene.children.forEach(c => {
            if (c !== window.cameraRig && c !== camera && c !== camera.parent) {
              hideMesh(c);
            }
          });
        }
      }
      if (window.cockpit) hideMesh(window.cockpit);
      if (window.cannonGroup) hideMesh(window.cannonGroup);
      if (window.cockpitDashLight) hideMesh(window.cockpitDashLight);
      if (window.cockpitDomeLight) hideMesh(window.cockpitDomeLight);
      if (window.seatGroup) hideMesh(window.seatGroup);
      if (window.shipGroup) hideMesh(window.shipGroup);

      // In cameraRig, hide HUD and wrist beacon while in theater, keeping hands/controllers visible
      if (window.cameraRig && window.cameraRig.children) {
        window.cameraRig.children.forEach(c => {
          if (c !== camera && !c.isHand && !c.isController && !c.isControllerGrip &&
              (c.name?.includes?.('WATCH') || c.name?.includes?.('BEACON') || c.name?.includes?.('TURN') || c.name?.includes?.('HUD'))) {
            hideMesh(c);
          }
        });
      }

      cleanup.push(() => {
        if (scene) scene.background = prevSceneBackground;
        hiddenObjects.forEach(obj => {
          try { if (obj) obj.visible = true; } catch (_) {}
        });
      });

      const xrGroup = new T.Group();
      xrGroup.name = 'NOVA_VR_CINEMA';

      // ── 2. Full Surround Dark Cinema Dome (radius 18m, depthWrite = true) ──
      const backGeo = new T.SphereGeometry(18, 32, 16);
      const backMat = new T.MeshBasicMaterial({ color: 0x010204, side: T.BackSide, depthWrite: true });
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
        cleanup.push(() => { cineLoopActive = false; });
      } else {
        const videoInterval = setInterval(() => {
          if (v.readyState >= 2) {
            tex.needsUpdate = true;
          }
        }, 33);
        cleanup.push(() => {
          cineLoopActive = false;
          clearInterval(videoInterval);
        });
      }

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

      // ── 6. 3D Floating Interactive Controls Bar for Hands & Controllers ──
      const exitBtnCanvas = document.createElement('canvas');
      exitBtnCanvas.width = 1024; exitBtnCanvas.height = 128;
      const exitCtx = exitBtnCanvas.getContext('2d');
      const exitTex = new T.CanvasTexture(exitBtnCanvas);
      let hoveredBtn = null; // 'rewind', 'forward', 'exit'
      const drawControlBar = (hover = null) => {
        exitCtx.clearRect(0, 0, 1024, 128);
        // 1. Rewind Button [-10s]
        exitCtx.fillStyle = hover === 'rewind' ? 'rgba(0, 229, 255, 0.95)' : 'rgba(8, 24, 38, 0.88)';
        exitCtx.beginPath(); exitCtx.roundRect(16, 16, 290, 96, 20); exitCtx.fill();
        exitCtx.strokeStyle = hover === 'rewind' ? '#ffffff' : '#00e5ff'; exitCtx.lineWidth = 4; exitCtx.stroke();
        exitCtx.fillStyle = hover === 'rewind' ? '#001a24' : '#00e5ff';
        exitCtx.font = 'bold 32px monospace'; exitCtx.textAlign = 'center'; exitCtx.fillText('⏪ -10s', 161, 74);

        // 2. Skip Forward Button [+10s]
        exitCtx.fillStyle = hover === 'forward' ? 'rgba(0, 255, 170, 0.95)' : 'rgba(8, 38, 24, 0.88)';
        exitCtx.beginPath(); exitCtx.roundRect(326, 16, 290, 96, 20); exitCtx.fill();
        exitCtx.strokeStyle = hover === 'forward' ? '#ffffff' : '#00ffaa'; exitCtx.lineWidth = 4; exitCtx.stroke();
        exitCtx.fillStyle = hover === 'forward' ? '#001a14' : '#00ffaa';
        exitCtx.font = 'bold 32px monospace'; exitCtx.textAlign = 'center'; exitCtx.fillText('⏩ +10s', 471, 74);

        // 3. Exit Cinema Button
        exitCtx.fillStyle = hover === 'exit' ? 'rgba(255, 40, 70, 0.95)' : 'rgba(40, 12, 22, 0.88)';
        exitCtx.beginPath(); exitCtx.roundRect(636, 16, 372, 96, 20); exitCtx.fill();
        exitCtx.strokeStyle = hover === 'exit' ? '#ffffff' : '#ff4466'; exitCtx.lineWidth = 4; exitCtx.stroke();
        exitCtx.fillStyle = hover === 'exit' ? '#ffffff' : '#ff8899';
        exitCtx.font = 'bold 32px monospace'; exitCtx.textAlign = 'center'; exitCtx.fillText('✖ EXIT CINEMA', 822, 74);
        exitTex.needsUpdate = true;
      };
      drawControlBar(null);

      const exitBtnMat = new T.MeshBasicMaterial({ map: exitTex, transparent: true, side: T.DoubleSide });
      const exitBtnMesh = new T.Mesh(new T.PlaneGeometry(1.20, 0.22), exitBtnMat);
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

      // ── 8. Hand Tracking Interaction & Gesture Controls ──
      let lastSeekTouch = 0;
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

        // Touch control bar with finger or controller
        let activeHover = null;
        const now = performance.now();
        for (const pt of testPoints) {
          if (pt.pos.distanceTo(exitWorldPos) < 0.22) {
            const local = exitBtnMesh.worldToLocal(pt.pos.clone());
            if (Math.abs(local.y) < 0.12 && Math.abs(local.z) < 0.10) {
              if (local.x < -0.20) activeHover = 'rewind';
              else if (local.x > 0.16) activeHover = 'exit';
              else activeHover = 'forward';

              if (now - lastSeekTouch > 380) {
                lastSeekTouch = now;
                if (activeHover === 'rewind') {
                  v.currentTime = Math.max(0, v.currentTime - 10);
                  try { window.sound?.beep?.(650, 0.05); } catch (_) {}
                } else if (activeHover === 'forward') {
                  v.currentTime = Math.min((v.duration || 1000) - 1, v.currentTime + 10);
                  try { window.sound?.beep?.(920, 0.05); } catch (_) {}
                } else if (activeHover === 'exit') {
                  end();
                  return;
                }
              }
              break;
            }
          }
        }
        if (activeHover !== hoveredBtn) {
          hoveredBtn = activeHover;
          drawControlBar(hoveredBtn);
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

      let isScrubbing = false;
      let pendingSeek = null;
      let wasPlayingBeforeScrub = false;
      const doSeek = (e, commit = false) => {
        const rect = scrubContainer.getBoundingClientRect();
        if (rect.width <= 0) return;
        const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        if (Number.isFinite(v.duration) && v.duration > 0) {
          const targetTime = Math.max(0, Math.min(v.duration, frac * v.duration));
          scrubFill.style.width = (frac * 100) + '%';
          timeDisplay.textContent = `${fmtTime(targetTime)} / ${fmtTime(v.duration)}`;
          pendingSeek = targetTime;
          if (commit) {
            try { v.currentTime = targetTime; } catch (_) {}
          }
        }
      };

      scrubContainer.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        isScrubbing = true;
        wasPlayingBeforeScrub = !v.paused;
        if (wasPlayingBeforeScrub) v.pause();
        try { scrubContainer.setPointerCapture(e.pointerId); } catch (_) {}
        doSeek(e, false);
      });
      scrubContainer.addEventListener('pointermove', (e) => {
        if (!isScrubbing) return;
        e.stopPropagation();
        doSeek(e, false);
      });
      const endScrub = (e) => {
        if (!isScrubbing) return;
        isScrubbing = false;
        try { scrubContainer.releasePointerCapture(e.pointerId); } catch (_) {}
        doSeek(e, true);
        if (pendingSeek !== null && Number.isFinite(pendingSeek)) {
          try { v.currentTime = pendingSeek; } catch (_) {}
          pendingSeek = null;
        }
        if (wasPlayingBeforeScrub) {
          v.play().catch(() => {});
        }
      };
      scrubContainer.addEventListener('pointerup', endScrub);
      scrubContainer.addEventListener('pointercancel', endScrub);

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

      // Quality / Low-power Performance Mode
      let isEcoMode = false;
      const qBtn = document.createElement('button');
      qBtn.style.cssText = 'background:rgba(0,229,255,0.12);border:1px solid #00f0ff;color:#00f0ff;font-size:11px;font-weight:bold;cursor:pointer;padding:3px 8px;border-radius:4px;outline:none;';
      qBtn.innerHTML = '⚡ HQ';
      qBtn.title = 'Switch Video Quality / Low Power Mode';
      qBtn.onclick = (e) => {
        e.stopPropagation();
        isEcoMode = !isEcoMode;
        qBtn.innerHTML = isEcoMode ? '🌱 ECO' : '⚡ HQ';
        qBtn.style.color = isEcoMode ? '#33ff99' : '#00f0ff';
        qBtn.style.borderColor = isEcoMode ? '#33ff99' : '#00f0ff';
        if (isEcoMode) {
          v.style.imageRendering = 'pixelated';
          try { window.showToast?.('🌱 VIDEO ECO MODE: REDUCED GPU LOAD', 2000, '#33ff99'); } catch (_) {}
        } else {
          v.style.imageRendering = 'auto';
          try { window.showToast?.('⚡ VIDEO HQ MODE: MAXIMUM RESOLUTION', 2000, '#00f0ff'); } catch (_) {}
        }
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

      rightCtrls.append(qBtn, volBtn, fsBtn);
      ctrlRow.append(leftCtrls, rightCtrls);
      controls.append(scrubContainer, ctrlRow);

      // Time progress updater
      v.ontimeupdate = () => {
        if (isScrubbing) return;
        if (Number.isFinite(v.duration) && v.duration > 0) {
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
          if (Number.isFinite(v.duration) && v.duration > 0) {
            const curr = Number.isFinite(v.currentTime) ? v.currentTime : 0;
            v.currentTime = Math.min(v.duration, curr + 5);
          }
          showControls();
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          const curr = Number.isFinite(v.currentTime) ? v.currentTime : 0;
          v.currentTime = Math.max(0, curr - 5);
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
      // If browser blocked unmuted autoplay, try muted playback
      v.muted = true;
      try {
        await v.play();
        const p = document.getElementById('nova-cinematic-wrap')?.querySelector('div[style*="CLICK TO UNMUTE"]');
        if (p) p.style.display = 'block';
      } catch (err2) {
        console.warn('[cinematics] Initial autoplay blocked, waiting for VR touch/gesture/click to start playback:', err2);
        const startOnAction = () => {
          v.play().catch(() => {});
          window.removeEventListener('pointerdown', startOnAction);
        };
        window.addEventListener('pointerdown', startOnAction, { once: true });
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
