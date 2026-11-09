// Project Nova: Safehouse Business Computer & Dynamic Ore/Commodity Stock Market (Phase 2)
// Clean modular implementation with zero external dependencies.

export function init(nova) {
  const T = typeof window !== 'undefined' ? (window.THREE || nova.THREE) : null;
  if (!T) return { ready: false };

  // Commodity Assets
  const state = {
    orePrice: 100,
    vlkPrice: 250,
    strPrice: 180,
    history: [95, 98, 102, 97, 100],
    holdings: {
      ore: 0,
      vlk: 0,
      str: 0
    }
  };

  try {
    const saved = localStorage.getItem('nova_market_data');
    if (saved) Object.assign(state, JSON.parse(saved));
  } catch (_) {}

  function persist() {
    try { localStorage.setItem('nova_market_data', JSON.stringify(state)); } catch (_) {}
  }

  // Market manipulation events
  function onOreMined() {
    // Increased raw supply slightly cools price (-2 to -4 CR)
    state.orePrice = Math.max(45, Math.round(state.orePrice - (2 + Math.random() * 2)));
    recordHistory();
  }

  function onConvoyRaided() {
    // Piracy on Starlifter convoys cuts supply and panics logistics (+12 to +25 CR for Ore, -15 CR for Starlifter)
    state.orePrice = Math.min(350, Math.round(state.orePrice + (12 + Math.random() * 14)));
    state.strPrice = Math.max(60, Math.round(state.strPrice - 15));
    recordHistory();
    nova.toast?.(`📈 COMMODITY SHOCK: $ORE SURGES TO ${state.orePrice} CR!`, 3200, '#00ffaa');
  }

  function onConvoyProtected() {
    // Safe logistics boosts Starlifter and Valkyrie stock
    state.strPrice = Math.min(300, Math.round(state.strPrice + 10));
    state.vlkPrice = Math.min(400, Math.round(state.vlkPrice + 12));
    recordHistory();
  }

  function recordHistory() {
    state.history.push(state.orePrice);
    if (state.history.length > 16) state.history.shift();
    persist();
  }

  // Create Business Computer Terminal mesh & interactive canvas
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  let texture = null, screenMesh = null;
  if (canvas) {
    canvas.width = 512;
    canvas.height = 384;
    texture = new T.CanvasTexture(canvas);
  }

  function drawTerminal() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#05121e';
    ctx.fillRect(0, 0, w, h);

    // Frame & CRT scanlines
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('NOVA CORP · EXECUTIVE COMMODITIES DESK', 20, 36);

    const cr = (typeof window !== 'undefined' && window.bankCredits) ? window.bankCredits : 0;
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`PORTFOLIO: ${cr.toLocaleString()} CR`, 20, 68);

    // Stock rows
    ctx.fillStyle = '#00ffcc';
    ctx.fillText(`$ORE  TITANIUM FUTURES : ${state.orePrice} CR  (HELD: ${state.holdings.ore})`, 20, 110);
    ctx.fillStyle = '#ff9944';
    ctx.fillText(`$STR  STARLIFTER CONVOY: ${state.strPrice} CR  (HELD: ${state.holdings.str})`, 20, 138);
    ctx.fillStyle = '#ff44aa';
    ctx.fillText(`$VLK  VALKYRIE DEFENSE : ${state.vlkPrice} CR  (HELD: ${state.holdings.vlk})`, 20, 166);

    // Dynamic Mini Graph for $ORE
    ctx.strokeStyle = '#225577';
    ctx.strokeRect(20, 195, 472, 110);
    ctx.beginPath();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    const step = 472 / (state.history.length - 1 || 1);
    state.history.forEach((val, i) => {
      const y = 300 - Math.min(100, Math.max(10, ((val - 40) / 200) * 100));
      if (i === 0) ctx.moveTo(20, y);
      else ctx.lineTo(20 + i * step, y);
    });
    ctx.stroke();

    ctx.fillStyle = '#88aacc';
    ctx.font = '13px monospace';
    ctx.fillText('MARKET NOTE: Supply raids drive $ORE up. Mining drops prices.', 20, 335);
    ctx.fillStyle = '#00ffff';
    ctx.fillText('[BUY +10 $ORE]     [SELL ALL $ORE]     [REFRESH]', 20, 365);

    if (texture) texture.needsUpdate = true;
  }

  drawTerminal();

  // Trade APIs
  function buyOre(qty = 10) {
    const cost = state.orePrice * qty;
    if ((window.bankCredits || 0) >= cost) {
      window.bankCredits -= cost;
      state.holdings.ore += qty;
      persist();
      drawTerminal();
      nova.toast?.(`📈 BOUGHT ${qty} $ORE FOR ${cost} CR!`, 2500, '#00ffaa');
      try { nova.sound?.cash?.(); } catch (_) {}
      return true;
    }
    nova.toast?.('⚠️ INSUFFICIENT CREDITS FOR $ORE CONTRACT', 2200, '#ff4444');
    return false;
  }

  function sellOre() {
    if (state.holdings.ore <= 0) {
      nova.toast?.('NO $ORE CONTRACTS TO SELL', 2000, '#ff8844');
      return false;
    }
    const val = state.holdings.ore * state.orePrice;
    window.bankCredits = (window.bankCredits || 0) + val;
    const qty = state.holdings.ore;
    state.holdings.ore = 0;
    persist();
    drawTerminal();
    nova.toast?.(`💰 SOLD ${qty} $ORE CONTRACTS FOR +${val.toLocaleString()} CR!`, 3000, '#00ff88');
    try { nova.sound?.cash?.(); } catch (_) {}
    return true;
  }

  if (typeof window !== 'undefined') {
    window.novaStockDesk = {
      state,
      buyOre,
      sellOre,
      onOreMined,
      onConvoyRaided,
      onConvoyProtected,
      drawTerminal
    };
  }

  return {
    ready: true,
    state,
    buyOre,
    sellOre,
    onOreMined,
    onConvoyRaided,
    onConvoyProtected,
    drawTerminal
  };
}
