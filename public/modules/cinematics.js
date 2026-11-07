/**
 * Project Nova cinematics player (intro / epilogue).
 * Plays ./video/<name>.mp4 with ./video/<name>.vtt captions when the files exist:
 *  - 2D: full-screen <video> overlay with native captions.
 *  - VR / MR: a large screen in front of the player (VideoTexture) with captions drawn underneath.
 * Skippable with any key, click, Esc, gamepad/XR button or pinch. Missing files -> play() resolves false
 * so the game falls back to its in-engine intro/ending.
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
    const xr = renderer.xr.isPresenting, v = makeVideo(name);
    let done, cleanup = [];
    const finished = new Promise(r => { done = r; });
    const end = () => { if (!playing) return; playing = null; try { v.pause(); } catch (e) { } cleanup.forEach(f => { try { f(); } catch (e) { } }); done(true); };
    playing = { name, end };
    v.addEventListener('ended', end); v.addEventListener('error', () => { known[name] = false; end(); });

    // skip inputs (shared by 2D and XR)
    const onKey = e => { if (e.repeat) return; e.preventDefault(); end(); };
    setTimeout(() => { if (playing) { addEventListener('keydown', onKey, true); cleanup.push(() => removeEventListener('keydown', onKey, true)); } }, 600);
    const pads = setInterval(() => { for (const p of (navigator.getGamepads?.() || [])) if (p && p.buttons.some(b => b.pressed)) { end(); break; } }, 120);
    cleanup.push(() => clearInterval(pads));

    if (!xr) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000;display:flex;align-items:center;justify-content:center;cursor:pointer';
      v.style.cssText = 'max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain';
      const skip = document.createElement('div');
      skip.textContent = 'SKIP ▶'; skip.style.cssText = 'position:absolute;right:24px;bottom:20px;color:#9fd6ee;font:bold 16px monospace;padding:8px 14px;border:1px solid #00e5ff;border-radius:6px;background:rgba(0,20,30,.6)';
      wrap.append(v, skip); document.body.appendChild(wrap);
      setTimeout(() => wrap.addEventListener('click', end), 600);
      cleanup.push(() => wrap.remove());
    } else {
      const ses = renderer.xr.getSession();
      const tex = new T.VideoTexture(v); tex.colorSpace = T.SRGBColorSpace;
      const W = 3.2, H = 1.8, group = new T.Group();
      const screen = new T.Mesh(new T.PlaneGeometry(W, H), new T.MeshBasicMaterial({ map: tex, toneMapped: false }));
      const back = new T.Mesh(new T.PlaneGeometry(W * 3, H * 3), new T.MeshBasicMaterial({ color: 0x000000 })); back.position.z = -0.05;
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 128;
      const cx = cv.getContext('2d'), capTex = new T.CanvasTexture(cv);
      const cap = new T.Mesh(new T.PlaneGeometry(W, W / 8), new T.MeshBasicMaterial({ map: capTex, transparent: true, depthWrite: false })); cap.position.y = -H / 2 - 0.25;
      group.add(back, screen, cap);
      const p = camera.getWorldPosition(new T.Vector3()), q = camera.getWorldQuaternion(new T.Quaternion());
      const fwd = new T.Vector3(0, 0, -1).applyQuaternion(q); fwd.y = 0; if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize();
      group.position.copy(p).addScaledVector(fwd, 2.6); group.lookAt(p.x, group.position.y, p.z);
      scene.add(group);
      let cues = []; loadCues(name).then(c => { cues = c; });
      let lastCue = null;
      const capTick = setInterval(() => {
        const t = v.currentTime, c = cues.find(c => t >= c.a && t <= c.z), txt = c ? c.text : '';
        if (txt === lastCue) return; lastCue = txt;
        cx.clearRect(0, 0, 1024, 128); if (txt) { cx.fillStyle = 'rgba(0,0,0,.65)'; cx.fillRect(0, 20, 1024, 88); cx.fillStyle = '#fff'; cx.font = '34px sans-serif'; cx.textAlign = 'center'; cx.fillText(txt, 512, 76, 1000); }
        capTex.needsUpdate = true;
      }, 100);
      const onSel = () => end();
      setTimeout(() => { if (playing && ses) { ses.addEventListener('selectstart', onSel); ses.addEventListener('squeezestart', onSel); } }, 800);
      cleanup.push(() => { clearInterval(capTick); if (ses) { ses.removeEventListener('selectstart', onSel); ses.removeEventListener('squeezestart', onSel); } scene.remove(group); tex.dispose(); capTex.dispose(); group.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); });
    }
    try { await v.play(); } catch (e) { v.muted = true; try { await v.play(); } catch (e2) { end(); return false; } }
    return finished;
  }

  return { play, exists, skip: () => playing && playing.end(), get playing() { return !!playing; } };
}
