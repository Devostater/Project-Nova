// Project Nova: Planetary Spaceport & Safehouse Hub with Executive Commodities Desk
// Modular VR interior for Cygnus Prime surface safehouse and quiet resting hub.

export function init(nova) {
  const T = typeof window !== 'undefined' ? (window.THREE || nova.THREE) : null;
  if (!T) return { ready: false };

  const scene = nova.scene || window.scene;
  const cameraRig = nova.cameraRig || window.cameraRig;
  const camera = nova.camera || window.camera;
  const renderer = nova.renderer || window.renderer;

  // Commodity Assets & Market Engine
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

  function onOreMined() {
    state.orePrice = Math.max(45, Math.round(state.orePrice - (2 + Math.random() * 2)));
    recordHistory();
  }

  function onConvoyRaided() {
    state.orePrice = Math.min(350, Math.round(state.orePrice + (12 + Math.random() * 14)));
    state.strPrice = Math.max(60, Math.round(state.strPrice - 15));
    recordHistory();
    nova.toast?.(`📈 COMMODITY SHOCK: $ORE SURGES TO ${state.orePrice} CR!`, 3200, '#00ffaa');
  }

  function onConvoyProtected() {
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
  let texture = null;
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
    ctx.fillText('NOVA CORP • EXECUTIVE COMMODITIES DESK', 20, 36);

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

  // --- Safehouse Physical VR Interior Structure ---
  const safehouseGroup = new T.Group();
  safehouseGroup.name = 'PLANETARY_SAFEHOUSE_HUB';
  safehouseGroup.position.set(900, 350, -1400); // Anchor at Cygnus Spaceport
  safehouseGroup.visible = false;
  if (scene) scene.add(safehouseGroup);

  // Floor
  const floorGeo = new T.BoxGeometry(16, 0.2, 16);
  const floorMat = new T.MeshStandardMaterial({ color: 0x182430, roughness: 0.65, metalness: 0.5 });
  const floorMesh = new T.Mesh(floorGeo, floorMat);
  floorMesh.position.y = -0.1;
  safehouseGroup.add(floorMesh);

  // Ceiling
  const ceilGeo = new T.BoxGeometry(16, 0.2, 16);
  const ceilMat = new T.MeshStandardMaterial({ color: 0x0f1822, roughness: 0.8 });
  const ceilMesh = new T.Mesh(ceilGeo, ceilMat);
  ceilMesh.position.y = 4.2;
  safehouseGroup.add(ceilMesh);

  // Walls with Observation Bay overlooking Cygnus Prime horizon
  const wallMat = new T.MeshStandardMaterial({ color: 0x14202b, roughness: 0.7, metalness: 0.4 });
  const backWall = new T.Mesh(new T.BoxGeometry(16, 4.2, 0.3), wallMat);
  backWall.position.set(0, 2.1, 8);
  safehouseGroup.add(backWall);

  const leftWall = new T.Mesh(new T.BoxGeometry(0.3, 4.2, 16), wallMat);
  leftWall.position.set(-8, 2.1, 0);
  safehouseGroup.add(leftWall);

  const rightWall = new T.Mesh(new T.BoxGeometry(0.3, 4.2, 16), wallMat);
  rightWall.position.set(8, 2.1, 0);
  safehouseGroup.add(rightWall);

  // Panoramic Bay View overlooking the planet surface
  const windowFrameMat = new T.MeshStandardMaterial({ color: 0x0a1018, roughness: 0.3, metalness: 0.8 });
  const windowFrame = new T.Mesh(new T.BoxGeometry(16, 0.5, 0.4), windowFrameMat);
  windowFrame.position.set(0, 0.25, -8);
  safehouseGroup.add(windowFrame);

  // Soft resting ambient and safehouse lights
  const warmLight = new T.PointLight(0xffb870, 1.4, 14);
  warmLight.position.set(0, 3.5, 0);
  safehouseGroup.add(warmLight);

  const deskLight = new T.PointLight(0x00f0ff, 1.8, 6);
  deskLight.position.set(-2.4, 2.2, -2.8);
  safehouseGroup.add(deskLight);

  // Business Desk & Interactive Terminal Mesh
  const deskMat = new T.MeshStandardMaterial({ color: 0x111c26, metalness: 0.8, roughness: 0.25 });
  const deskMesh = new T.Mesh(new T.BoxGeometry(2.4, 0.85, 1.2), deskMat);
  deskMesh.position.set(-2.4, 0.425, -2.8);
  safehouseGroup.add(deskMesh);

  // Terminal Screen (Commodities Desk)
  if (texture) {
    const screenGeo = new T.PlaneGeometry(1.2, 0.9);
    const screenMat = new T.MeshBasicMaterial({ map: texture });
    const screenMesh = new T.Mesh(screenGeo, screenMat);
    screenMesh.position.set(-2.4, 1.4, -2.75);
    screenMesh.rotation.y = 0;
    safehouseGroup.add(screenMesh);

    // Desktop/VR Interactable Click on Screen
    if (typeof window !== 'undefined' && window.registerCockpitButton) {
      window.registerCockpitButton(screenMesh, 'COMMODITIES DESK', () => {
        buyOre(10);
      }, 0.6);
    }
  }

  // Lounge Resting Sofa / Quiet Area
  const couchMat = new T.MeshStandardMaterial({ color: 0x223547, roughness: 0.8, metalness: 0.1 });
  const couchSeat = new T.Mesh(new T.BoxGeometry(3.0, 0.45, 1.1), couchMat);
  couchSeat.position.set(3.2, 0.225, -1.8);
  safehouseGroup.add(couchSeat);

  const couchBack = new T.Mesh(new T.BoxGeometry(3.0, 0.9, 0.3), couchMat);
  couchBack.position.set(3.2, 0.65, -2.25);
  safehouseGroup.add(couchBack);

  // Exit Airlock Button to Launch Back to Orbit
  const airlockDoor = new T.Mesh(new T.PlaneGeometry(2.2, 3.2), new T.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.35, side: T.DoubleSide }));
  airlockDoor.position.set(0, 1.6, 7.85);
  safehouseGroup.add(airlockDoor);

  const exitBtnMat = new T.MeshStandardMaterial({ color: 0x114422, emissive: 0x00ff88, emissiveIntensity: 0.7 });
  const exitBtn = new T.Mesh(new T.BoxGeometry(0.8, 0.3, 0.1), exitBtnMat);
  exitBtn.position.set(0, 1.6, 7.78);
  safehouseGroup.add(exitBtn);

  if (typeof window !== 'undefined' && window.registerCockpitButton) {
    window.registerCockpitButton(exitBtn, 'LAUNCH TO ORBIT', () => {
      exitSafehouse();
    }, 0.35);
  }

  // Safehouse Navigation Flow
  let isInsideSafehouse = false;

  function enterSafehouse() {
    isInsideSafehouse = true;
    safehouseGroup.visible = true;
    if (window.cockpit) window.cockpit.visible = false;
    if (window.cantinaGroup) window.cantinaGroup.visible = false;
    if (window.carrierInteriorGroup) window.carrierInteriorGroup.visible = false;

    // Stop all flight state
    if (typeof window.novaCruiseStop === 'function') window.novaCruiseStop('SAFEHOUSE');
    if (window.shipBody) {
      window.shipBody.velocity.set(0, 0, 0);
      window.shipBody.angularVelocity.set(0, 0, 0);
    }
    try { if (window.isDockingInProgress) window.isDockingInProgress = false; } catch (_) {}
    try { if (window.isAutopilotActive) window.toggleAutopilot?.(false); } catch (_) {}

    // Hide ship exterior and space objects during safehouse
    if (window.shipGroup) window.shipGroup.visible = false;
    if (window.starfieldGroup) window.starfieldGroup.visible = false;
    if (window.asteroidGroup) window.asteroidGroup.visible = false;
    if (window.stationGroup) window.stationGroup.visible = false;
    if (window.planetGroup) window.planetGroup.visible = false;

    // Position player rig inside safehouse lounge
    if (cameraRig) {
      if (cameraRig.parent) cameraRig.parent.remove(cameraRig);
      scene.add(cameraRig);
      cameraRig.position.set(safehouseGroup.position.x, safehouseGroup.position.y + 1.6, safehouseGroup.position.z + 1.0);
    }
    drawTerminal();
    nova.toast?.('🏡 WELCOME TO YOUR SAFEHOUSE • CYGNUS PRIME SURFACE', 3500, '#00ffcc');
  }

  function exitSafehouse() {
    if (!isInsideSafehouse) return;
    isInsideSafehouse = false;
    safehouseGroup.visible = false;
    if (window.cockpit) window.cockpit.visible = true;

    // Restore space objects
    if (window.shipGroup) window.shipGroup.visible = true;
    if (window.starfieldGroup) window.starfieldGroup.visible = true;
    if (window.asteroidGroup) window.asteroidGroup.visible = true;
    if (window.stationGroup) window.stationGroup.visible = true;
    if (window.planetGroup) window.planetGroup.visible = true;

    // Reset ship to planetary orbit just outside atmosphere
    if (window.shipGroup && window.planetGroup) {
      window.shipGroup.position.copy(window.planetGroup.position).add(new T.Vector3(0, 320, 480));
      if (window.shipBody) {
        window.shipBody.position.copy(window.shipGroup.position);
        window.shipBody.velocity.set(0, 0, 0);
        window.shipBody.angularVelocity.set(0, 0, 0);
      }
    }
    if (cameraRig && window.shipGroup) {
      if (cameraRig.parent) cameraRig.parent.remove(cameraRig);
      window.shipGroup.add(cameraRig);
      cameraRig.position.set(0, 0, 0);
    }
    if (typeof window.recenterPilotView === 'function') window.recenterPilotView();
    nova.toast?.('🚀 LAUNCHING BACK TO ORBIT • ENGINES HOT', 3000, '#00ffaa');
  }

  if (typeof window !== 'undefined') {
    window.enterSafehouse = enterSafehouse;
    window.exitSafehouse = exitSafehouse;
    window.isInsideSafehouse = () => isInsideSafehouse;
    // Expose safehouse group for walk locomotion bounds
    if (!window.nova) window.nova = {};
    window.nova._safehouseGroup = safehouseGroup;
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
    drawTerminal,
    enterSafehouse,
    exitSafehouse
  };
}
