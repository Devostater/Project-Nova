const STORAGE_KEY = 'novaNovaNetV1';
const VERSION = 1;

export function init(nova) {
  const T = nova?.THREE;
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const texture = T ? new T.CanvasTexture(canvas) : null;
  if (texture && T.SRGBColorSpace) texture.colorSpace = T.SRGBColorSpace;

  const state = loadState();
  let screen = 'list';
  let selectedId = state.selectedId || null;
  let scroll = 0;
  let focus = 0;
  let paused = false;
  let dirty = true;
  let saveTimer = 0;
  let lastSecond = -1;
  const targets = [];
  const unsubs = [];

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (raw?.version === VERSION && Array.isArray(raw.articles)) return raw;
    } catch (error) { console.warn('[NOVA NET] save ignored', error); }
    return { version: VERSION, activeSeconds: 0, selectedId: null, articles: [] };
  }

  function save() {
    state.selectedId = selectedId;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    nova?.emit?.('novaNetChanged', snapshot());
    saveTimer = 0;
  }

  function cleanText(value, fallback = '') {
    return String(value ?? fallback).replace(/[<>]/g, '').slice(0, 2400);
  }

  function normalizeOption(option, index) {
    if (typeof option === 'string') return { id: `option_${index + 1}`, label: cleanText(option).slice(0, 48), kind: 'acknowledge' };
    return {
      id: cleanText(option?.id || `option_${index + 1}`).slice(0, 64),
      label: cleanText(option?.label || option?.id || 'RESPOND').slice(0, 48),
      kind: cleanText(option?.kind || 'acknowledge').slice(0, 32),
      payload: option?.payload && typeof option.payload === 'object' ? option.payload : null
    };
  }

  function publish(input = {}) {
    const id = cleanText(input.id || `net_${Date.now()}_${state.articles.length}`).slice(0, 96);
    const existing = state.articles.find(article => article.id === id);
    const deadline = Math.max(0, Number(input.responseSeconds ?? input.deadlineSeconds) || 0);
    const article = {
      id,
      headline: cleanText(input.headline, 'SECTOR UPDATE').slice(0, 100),
      dek: cleanText(input.dek || input.summary, '').slice(0, 180),
      body: cleanText(input.body, 'Details are still developing.'),
      source: cleanText(input.source, 'NOVA NET DESK').slice(0, 56),
      sector: cleanText(input.sector, 'LOCAL').slice(0, 36),
      location: cleanText(input.location, 'UNCONFIRMED').slice(0, 48),
      confidence: Math.max(0, Math.min(100, Number(input.confidence ?? 70) || 0)),
      severity: Math.max(0, Math.min(3, Number(input.severity) || 0)),
      factions: Array.isArray(input.factions) ? input.factions.map(item => cleanText(item).slice(0, 40)).slice(0, 6) : [],
      publishedAt: existing?.publishedAt || state.activeSeconds,
      remaining: deadline || existing?.remaining || 0,
      initialDeadline: deadline || existing?.initialDeadline || 0,
      warned: existing?.warned || [],
      status: existing?.status || 'active',
      consequence: cleanText(input.consequence, '').slice(0, 240),
      contactId: cleanText(input.contactId, '').slice(0, 64),
      contractId: cleanText(input.contractId, '').slice(0, 64),
      options: (Array.isArray(input.options) ? input.options : []).map(normalizeOption).slice(0, 4),
      response: existing?.response || null,
      unread: existing ? existing.unread : true,
      saved: existing?.saved || false
    };
    if (existing) Object.assign(existing, article);
    else state.articles.unshift(article);
    state.articles = state.articles.slice(0, 80);
    dirty = true; save();
    nova?.emit?.('novaNetPublished', { id, article: publicArticle(article) });
    return id;
  }

  function publicArticle(article) {
    return article ? JSON.parse(JSON.stringify(article)) : null;
  }

  function getArticle(id) { return state.articles.find(article => article.id === id) || null; }

  function select(id) {
    const article = getArticle(id);
    if (!article) return false;
    selectedId = id; article.unread = false; screen = 'article'; scroll = 0; focus = 0; dirty = true; saveTimer = .25;
    nova?.emit?.('novaNetOpened', { id });
    return true;
  }

  function back() {
    if (screen === 'article') { screen = 'list'; scroll = 0; focus = 0; dirty = true; return true; }
    return false;
  }

  function respond(id, optionId) {
    const article = getArticle(id);
    if (!article || article.status !== 'active') return false;
    const option = article.options.find(item => item.id === optionId);
    if (!option) return false;
    article.response = { optionId: option.id, kind: option.kind, at: state.activeSeconds };
    article.status = 'prevented'; article.remaining = 0; article.unread = false;
    dirty = true; save();
    nova?.emit?.('novaNetResponse', { article: publicArticle(article), option: { ...option } });
    return true;
  }

  function setStatus(id, status, consequence) {
    const article = getArticle(id);
    if (!article) return false;
    article.status = ['active', 'resolved', 'prevented', 'failed', 'superseded'].includes(status) ? status : 'resolved';
    if (consequence != null) article.consequence = cleanText(consequence).slice(0, 240);
    if (article.status !== 'active') article.remaining = 0;
    dirty = true; save(); return true;
  }

  function toggleSaved(id = selectedId) {
    const article = getArticle(id); if (!article) return false;
    article.saved = !article.saved; dirty = true; saveTimer = .25; return article.saved;
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.ceil(seconds));
    if (value >= 3600) return `${Math.floor(value / 3600)}H ${Math.ceil((value % 3600) / 60)}M`;
    if (value >= 60) return `${Math.ceil(value / 60)} MIN`;
    return `${value} SEC`;
  }

  function wrap(text, maxWidth, maxLines = 20) {
    const words = cleanText(text).split(/\s+/); const lines = []; let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; if (lines.length >= maxLines) break; }
      else line = next;
    }
    if (line && lines.length < maxLines) lines.push(line);
    return lines;
  }

  function button(x, y, w, h, label, action, tone = '#00e5ff') {
    ctx.fillStyle = 'rgba(5,23,34,.96)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = tone; ctx.lineWidth = 5; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = tone; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2, w - 20);
    targets.push({ x, y, w, h, action });
  }

  function header(title, subtitle) {
    ctx.fillStyle = '#04121c'; ctx.fillRect(0, 0, 1024, 1024);
    ctx.fillStyle = '#00e5ff'; ctx.fillRect(0, 0, 1024, 88);
    ctx.fillStyle = '#04121c'; ctx.font = 'bold 43px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(title, 34, 43);
    ctx.textAlign = 'right'; ctx.font = 'bold 22px monospace'; ctx.fillText(subtitle, 990, 43);
    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 4; ctx.strokeRect(8, 8, 1008, 1008);
  }

  function drawList() {
    const articles = state.articles;
    header('NOVA NET', `${articles.filter(item => item.unread).length} NEW · ${articles.length} STORIES`);
    ctx.fillStyle = '#8db9c8'; ctx.font = '22px monospace'; ctx.textAlign = 'left'; ctx.fillText('SECTOR DESK · VERIFIED SOURCES LABELLED · ACTIVE-PLAY DEADLINES', 30, 122);
    const rowH = 142, top = 150, visible = 5;
    scroll = Math.max(0, Math.min(scroll, Math.max(0, articles.length - visible)));
    for (let index = 0; index < visible; index++) {
      const article = articles[index + scroll]; if (!article) break;
      const y = top + index * rowH; const tone = article.status === 'failed' ? '#ff5269' : article.severity >= 2 ? '#ffbd4a' : '#00e5ff';
      ctx.fillStyle = index === focus ? 'rgba(0,229,255,.18)' : 'rgba(11,36,49,.88)'; ctx.fillRect(28, y, 968, rowH - 12);
      ctx.strokeStyle = tone; ctx.lineWidth = article.unread ? 6 : 3; ctx.strokeRect(28, y, 968, rowH - 12);
      ctx.fillStyle = tone; ctx.font = 'bold 25px monospace'; ctx.textAlign = 'left'; ctx.fillText(`${article.unread ? '● ' : ''}${article.source} · ${article.sector}`, 48, y + 31, 900);
      ctx.fillStyle = '#e8fbff'; ctx.font = 'bold 30px sans-serif'; ctx.fillText(article.headline, 48, y + 70, 790);
      ctx.fillStyle = '#9fc4cf'; ctx.font = '21px sans-serif'; ctx.fillText(article.dek || article.location, 48, y + 104, 790);
      if (article.status === 'active' && article.remaining > 0) { ctx.fillStyle = '#ffbd4a'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'right'; ctx.fillText(formatTime(article.remaining), 972, y + 70); }
      else { ctx.fillStyle = tone; ctx.font = 'bold 19px monospace'; ctx.textAlign = 'right'; ctx.fillText(article.status.toUpperCase(), 972, y + 70); }
      targets.push({ x: 28, y, w: 968, h: rowH - 12, action: () => select(article.id) });
    }
    button(30, 902, 230, 88, '▲ PREV', () => scrollBy(-1));
    button(280, 902, 230, 88, 'OPEN', () => activate());
    button(530, 902, 230, 88, '▼ NEXT', () => scrollBy(1));
    button(780, 902, 214, 88, 'REFRESH', () => { dirty = true; });
  }

  function drawArticle() {
    const article = getArticle(selectedId);
    if (!article) { screen = 'list'; drawList(); return; }
    header('NOVA NET · BRIEF', article.status.toUpperCase());
    const tone = article.severity >= 2 ? '#ffbd4a' : '#00e5ff';
    ctx.fillStyle = tone; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`${article.source} · ${article.sector} / ${article.location} · CONFIDENCE ${article.confidence}%`, 34, 126, 956);
    ctx.fillStyle = '#effcff'; ctx.font = 'bold 43px sans-serif';
    const titleLines = wrap(article.headline, 930, 2); titleLines.forEach((line, index) => ctx.fillText(line, 34, 184 + index * 49));
    let y = 296; ctx.fillStyle = '#b8d5de'; ctx.font = '27px sans-serif';
    for (const line of wrap(article.body, 930, 12)) { ctx.fillText(line, 34, y); y += 36; }
    if (article.consequence) { ctx.fillStyle = '#ffbd4a'; ctx.font = 'bold 22px monospace'; ctx.fillText('LIKELY CONSEQUENCE', 34, y + 18); y += 52; ctx.fillStyle = '#d8edf3'; ctx.font = '24px sans-serif'; for (const line of wrap(article.consequence, 930, 3)) { ctx.fillText(line, 34, y); y += 31; } }
    if (article.status === 'active' && article.remaining > 0) { ctx.fillStyle = '#ffbd4a'; ctx.font = 'bold 27px monospace'; ctx.fillText(`RESPONSE WINDOW · ${formatTime(article.remaining)}`, 34, 760); }
    const options = article.status === 'active' ? article.options : [];
    const width = options.length ? Math.floor(700 / options.length) : 0;
    options.forEach((option, index) => button(34 + index * (width + 12), 806, width, 82, option.label, () => respond(article.id, option.id), '#ffbd4a'));
    button(34, 914, 210, 76, '← BACK', back);
    button(262, 914, 230, 76, article.saved ? '★ SAVED' : '☆ SAVE', () => toggleSaved(article.id));
    if (article.contactId) button(510, 914, 230, 76, 'VIEW CONTACT', () => nova?.emit?.('novaNetContact', { article: publicArticle(article), contactId: article.contactId }));
    if (article.contractId) button(758, 914, 236, 76, 'VIEW CONTRACT', () => nova?.emit?.('novaNetContract', { article: publicArticle(article), contractId: article.contractId }));
  }

  function draw() {
    targets.length = 0;
    if (screen === 'article') drawArticle(); else drawList();
    if (texture) texture.needsUpdate = true;
    dirty = false;
  }

  function press(x, y) {
    const px = x <= 1 ? x * 1024 : x, py = y <= 1 ? y * 1024 : y;
    const target = targets.find(item => px >= item.x && px <= item.x + item.w && py >= item.y && py <= item.y + item.h);
    if (!target) return false; target.action(); dirty = true; return true;
  }

  function scrollBy(amount) {
    if (screen !== 'list') return false;
    const max = Math.max(0, state.articles.length - 5); scroll = Math.max(0, Math.min(max, scroll + Math.sign(amount)));
    dirty = true; return true;
  }

  function navigate(amount) {
    if (screen !== 'list') return false;
    focus = Math.max(0, Math.min(4, focus + Math.sign(amount)));
    if (focus >= Math.min(4, state.articles.length - scroll)) { scrollBy(amount); focus = Math.max(0, Math.min(4, state.articles.length - 1 - scroll)); }
    dirty = true; return true;
  }

  function activate() {
    if (screen === 'article') return false;
    const article = state.articles[scroll + focus]; return article ? select(article.id) : false;
  }

  function tickDeadlines(dt) {
    let changed = false;
    for (const article of state.articles) {
      if (article.status !== 'active' || article.remaining <= 0) continue;
      const before = article.remaining; article.remaining = Math.max(0, before - dt);
      const ratios = [.5, .25, .1];
      for (const ratio of ratios) {
        if (before > article.initialDeadline * ratio && article.remaining <= article.initialDeadline * ratio && !article.warned.includes(ratio)) {
          article.warned.push(ratio); nova?.emit?.('novaNetWarning', { id: article.id, ratio, remaining: article.remaining });
        }
      }
      if (article.remaining === 0) { article.status = 'failed'; article.unread = true; nova?.emit?.('novaNetExpired', { article: publicArticle(article) }); }
      changed = true;
    }
    return changed;
  }

  function frame(dt) {
    const delta = Math.max(0, Math.min(.25, Number(dt) || 0));
    if (!paused && delta) {
      state.activeSeconds += delta;
      if (tickDeadlines(delta)) { saveTimer += delta; dirty = true; }
    }
    if (saveTimer > 0) { saveTimer += delta; if (saveTimer >= 1) save(); }
    const second = Math.floor(state.activeSeconds);
    if (second !== lastSecond && state.articles.some(item => item.status === 'active' && item.remaining > 0)) { lastSecond = second; dirty = true; }
    if (dirty) draw();
  }

  function setPaused(value) { paused = !!value; }
  function snapshot() { return { version: VERSION, activeSeconds: state.activeSeconds, articles: state.articles.map(publicArticle) }; }
  function reset() { state.activeSeconds = 0; state.articles.length = 0; selectedId = null; screen = 'list'; scroll = focus = 0; dirty = true; save(); seedWelcome(); }

  function seedWelcome() {
    if (state.articles.length) return;
    publish({ id: 'nova_net_online', headline: 'NOVA NET sector desk is online', dek: 'Live bulletins, response windows and crew dispatches will appear here.', body: 'NOVA NET collects station bulletins and verified sector reports. Urgent stories may offer a route, contract, cargo contribution or fleet response. Deadlines count active flight time only.', source: 'NOVA NET DESK', sector: 'NETWORK', location: 'ALL RELAYS', confidence: 100, severity: 0 });
  }

  function listen(name, fn) {
    const off = nova?.on?.(name, fn); if (typeof off === 'function') unsubs.push(off);
  }
  listen('cinematicStarted', () => setPaused(true));
  listen('cinematicEnded', () => setPaused(false));
  listen('mandatoryChoiceStarted', () => setPaused(true));
  listen('mandatoryChoiceEnded', () => setPaused(false));
  listen('territoryChanged', event => publish({ id: event?.id || `territory_${Date.now()}`, headline: event?.headline || `${event?.location || 'A sector'} changes control`, body: event?.body || event?.reason || 'Control shifted after sustained local pressure.', source: event?.source || 'SECTOR AUTHORITY', sector: event?.sector, location: event?.location, confidence: event?.confidence ?? 90, severity: event?.severity ?? 2, consequence: event?.consequence, factions: event?.factions, options: event?.options, responseSeconds: event?.responseSeconds }));
  listen('novaNetPublish', publish);

  seedWelcome(); draw();
  return {
    ready: true, canvas, texture, frame, publish, select, back, respond, setStatus, toggleSaved,
    press, scroll: scrollBy, navigate, activate, setPaused, state: snapshot, article: id => publicArticle(getArticle(id)), reset,
    dispose() { save(); texture?.dispose?.(); unsubs.splice(0).forEach(off => off()); }
  };
}

