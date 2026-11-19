(function(root){
'use strict';

const TOOL_COLORS = {
 probe: '#ff4d6d',
 mill: '#ff901a',
 drill: '#ffd13b',
 chamfer: '#d946ef',
 tap: '#10b981'
};

function parseISO(text){
 if(!text) return [];
 const lines = text.split(/\r?\n/);
 const ops = [];
 let curX = 0, curY = 0, curZ = 50;
 let curTool = 'mill';
 let curToolName = 'T6 (FRESA)';

 for(let i=0; i<lines.length; i++){
  const raw = lines[i].trim();
  if(!raw) continue;

  if(/T\d+\s+M6/i.test(raw)){
   const mTool = raw.match(/T(\d+)/i);
   const tNum = mTool ? Number(mTool[1]) : 6;
   if(tNum === 28 || /OMP|SONDA/i.test(raw)){ curTool = 'probe'; curToolName = 'T' + tNum + ' · SONDA RENISHAW'; }
   else if(tNum === 4 || /PUNTA|DRILL/i.test(raw)){ curTool = 'drill'; curToolName = 'T' + tNum + ' · PUNTA FORATURA'; }
   else if(tNum === 5 || /SVASAT|CHAMFER/i.test(raw)){ curTool = 'chamfer'; curToolName = 'T' + tNum + ' · SVASATORE'; }
   else if(tNum === 7 || /MASCH|TAP/i.test(raw)){ curTool = 'tap'; curToolName = 'T' + tNum + ' · MASCHIO'; }
   else { curTool = 'mill'; curToolName = 'T' + tNum + ' · FRESA RIFILI'; }
  }

  const xm = raw.match(/(?:^|\s)X(-?\d+(?:\.\d*)?)/i);
  const ym = raw.match(/(?:^|\s)Y(-?\d+(?:\.\d*)?)/i);
  const zm = raw.match(/(?:^|\s)Z(-?\d+(?:\.\d*)?)/i);

  const newX = xm ? Number(xm[1]) : curX;
  const newY = ym ? Number(ym[1]) : curY;
  const newZ = zm ? Number(zm[1]) : curZ;

  const isRapid = /G00?\b|P9810/i.test(raw) && !/G8[1-4]|G73/i.test(raw);
  const isCut = /G0?1\b|P9811|P9812/i.test(raw);
  const isCycle = /G8[1-4]|G73/i.test(raw);

  if(xm || ym || zm || isCycle || isCut){
   if(isCycle){
    const rMatch = raw.match(/R(-?\d+(?:\.\d*)?)/i);
    const rPlane = rMatch ? Number(rMatch[1]) : 3;
    ops.push({ type: 'cycle', x: newX, y: newY, z: newZ, r: rPlane, tool: curTool, toolName: curToolName, raw });
   } else {
    ops.push({ type: isRapid ? 'rapid' : 'feed', from: { x: curX, y: curY, z: curZ }, to: { x: newX, y: newY, z: newZ }, tool: curTool, toolName: curToolName, raw });
   }
   curX = newX; curY = newY; curZ = newZ;
  }
 }
 return ops;
}

function initSimulator(){
 const sections = [
  { outCard: 'straightOutput', outText: 'output', mode: 'straight' },
  { outCard: 'arcOutputCard', outText: 'arcOutput', mode: 'arc' }
 ];

 for(const s of sections){
  const card = document.getElementById(s.outCard);
  const textarea = document.getElementById(s.outText);
  if(!card || !textarea || card.querySelector('.sim-container')) continue;

  const actions = card.querySelector('.actions');
  const simBtn = document.createElement('button');
  simBtn.type = 'button';
  simBtn.className = 'btn-sim-start';
  simBtn.style.cssText = 'background:#ff901a!important;color:#031627!important;border-color:#ff901a!important;font-weight:750;box-shadow:0 0 14px rgba(255,144,26,0.4);';
  simBtn.innerHTML = '▶ SIMULAZIONE 3D';
  simBtn.disabled = true;

  if(actions) actions.insertBefore(simBtn, actions.firstChild);

  const container = document.createElement('div');
  container.className = 'sim-container';
  container.hidden = true;
  container.style.cssText = 'position:relative;width:100%;background:#02101e;border:2px solid #00dce9;border-radius:14px;padding:12px;margin:12px 0;box-shadow:inset 0 0 24px #000;';

  container.innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px;justify-content:space-between;">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <button type="button" class="sim-play" style="background:#00dce9;color:#031627;font-weight:700;">Avvia</button>
        <button type="button" class="sim-reset">Reset</button>
        <button type="button" class="sim-view-top">Vista dall’alto</button>
        <button type="button" class="sim-view-3d">Vista 3D</button>
        <button type="button" class="sim-focus-tool" style="background:#153c56;color:#65f3ff;">Inquadra utensile</button>
        <button type="button" class="sim-focus-all">Inquadra tutto</button>
      </div>
      <div>
        <button type="button" class="sim-close" style="background:#471c30;color:#ffd6df;border-color:#ff93aa;">Chiudi Simulazione</button>
      </div>
    </div>
    <div style="position:relative;width:100%;height:520px;border-radius:10px;overflow:hidden;background:#031627;touch-action:none;">
      <canvas class="sim-canvas" style="display:block;width:100%;height:100%;"></canvas>
      <div class="sim-hud" style="position:absolute;bottom:10px;left:14px;right:14px;display:flex;justify-content:space-between;align-items:center;pointer-events:none;color:#eaf4fc;font:13px monospace;background:rgba(3,22,39,0.85);padding:8px 14px;border-radius:8px;border:1px solid #1a4a68;">
        <span class="sim-tool-info">Utensile: —</span>
        <span class="sim-coord-info">X: 0.00  Y: 0.00  Z: 50.00</span>
      </div>
    </div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-top:10px;font-size:13px;color:#bdd0de;">
      <span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:12px;height:12px;border-radius:50%;background:#ff4d6d;display:inline-block;"></span> Sonda Renishaw</span>
      <span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:12px;height:12px;border-radius:50%;background:#ff901a;display:inline-block;"></span> Fresa Rifili</span>
      <span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:12px;height:12px;border-radius:50%;background:#ffd13b;display:inline-block;"></span> Punta Foratura</span>
      <span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:12px;height:12px;border-radius:50%;background:#d946ef;display:inline-block;"></span> Svasatore</span>
      <span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:12px;height:12px;border-radius:50%;background:#10b981;display:inline-block;"></span> Maschio</span>
      <span style="margin-left:auto;color:#65f3ff;">Usa un dito per spostare (Pan) · Due dita per ingrandire (Pinch-zoom)</span>
    </div>
  `;

  card.insertBefore(container, textarea);

  const canvas = container.querySelector('.sim-canvas');
  const ctx = canvas.getContext('2d');
  const playBtn = container.querySelector('.sim-play');
  const resetBtn = container.querySelector('.sim-reset');
  const topViewBtn = container.querySelector('.sim-view-top');
  const view3dBtn = container.querySelector('.sim-view-3d');
  const focusToolBtn = container.querySelector('.sim-focus-tool');
  const focusAllBtn = container.querySelector('.sim-focus-all');
  const closeBtn = container.querySelector('.sim-close');
  const toolInfo = container.querySelector('.sim-tool-info');
  const coordInfo = container.querySelector('.sim-coord-info');

  let state = {
   mode: s.mode,
   ops: [],
   stepIndex: 0,
   stepProgress: 0,
   playing: false,
   viewMode: '3d', // '3d' | 'top'
   followTool: false,
   camera: {
    x: 0,
    y: 0,
    zoom: 1.5,
    angle: Math.PI / 6,
    tilt: 0.55
   },
   holesDone: new Set(),
   probeFlash: 0
  };

  function updateSimButtonState(){
   simBtn.disabled = !textarea.value.trim();
  }
  const observer = new MutationObserver(updateSimButtonState);
  observer.observe(textarea, { attributes: true, childList: true, characterData: true });
  textarea.addEventListener('input', updateSimButtonState);
  textarea.addEventListener('change', updateSimButtonState);

  function resizeCanvas(){
   const rect = canvas.getBoundingClientRect();
   canvas.width = rect.width * (window.devicePixelRatio || 1);
   canvas.height = rect.height * (window.devicePixelRatio || 1);
  }

  function getGeometry(){
   if(state.mode === 'straight'){
    const length = Number(document.getElementById('length')?.value) || 1000;
    const width = Number(document.getElementById('width')?.value) || 23;
    const height = Number(document.getElementById('height')?.value) || 13.5;
    return { type: 'straight', length, width, height };
   } else {
    const R = Number(document.getElementById('aRadius')?.value) || 990;
    const width = Number(document.getElementById('aWidth')?.value) || 23;
    const height = Number(document.getElementById('aHeight')?.value) || 13.5;
    const count = Number(document.getElementById('aCount')?.value) || 19;
    const chord = Number(document.getElementById('aStandardChord')?.value) || 172.568;
    const leftVal = Number(document.getElementById('aLeftValue')?.value) || 64.795;
    const rightVal = Number(document.getElementById('aRightValue')?.value) || 64.795;
    const a0 = leftVal / R;
    const da = 2 * Math.asin(chord / (2 * R));
    const totalAngle = a0 + (count - 1) * da + (rightVal / R);
    return { type: 'arc', R, width, height, count, chord, a0, da, totalAngle };
   }
  }

  function resetView(autoFit){
   const geom = getGeometry();
   state.followTool = false;
   if(state.mode === 'straight'){
    state.camera.zoom = canvas.width / (geom.length * 1.35);
    state.camera.x = canvas.width * 0.15;
    state.camera.y = canvas.height * 0.55;
   } else {
    state.camera.zoom = canvas.width / (geom.R * 1.5);
    state.camera.x = canvas.width * 0.25;
    state.camera.y = canvas.height * 0.65;
   }
  }

  function toScreen(x, y, z){
   const zm = state.camera.zoom;
   if(state.viewMode === 'top'){
    return {
     x: state.camera.x + x * zm,
     y: state.camera.y - y * zm
    };
   }
   const cosA = Math.cos(state.camera.angle);
   const sinA = Math.sin(state.camera.angle);
   const tilt = state.camera.tilt;
   const isoX = (x * cosA - y * sinA) * zm;
   const isoY = ((x * sinA + y * cosA) * tilt - z * 0.9) * zm;
   return {
    x: state.camera.x + isoX,
    y: state.camera.y + isoY
   };
  }

  function drawPiece(){
   const geom = getGeometry();
   ctx.save();

   if(geom.type === 'straight'){
    const p1 = toScreen(0, -geom.width/2, 0);
    const p2 = toScreen(geom.length, -geom.width/2, 0);
    const p3 = toScreen(geom.length, geom.width/2, 0);
    const p4 = toScreen(0, geom.width/2, 0);

    const b1 = toScreen(0, -geom.width/2, -geom.height);
    const b2 = toScreen(geom.length, -geom.width/2, -geom.height);
    const b3 = toScreen(geom.length, geom.width/2, -geom.height);
    const b4 = toScreen(0, geom.width/2, -geom.height);

    ctx.fillStyle = '#0a2943';
    ctx.strokeStyle = '#376078';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(b1.x, b1.y); ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#123c54';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath();
    ctx.fill(); ctx.stroke();

    const o = toScreen(0, 0, 0);
    const ox = toScreen(40, 0, 0);
    const oy = toScreen(0, 40, 0);
    const oz = toScreen(0, 0, 40);

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ff4d6d'; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(ox.x, ox.y); ctx.stroke();
    ctx.strokeStyle = '#54d98c'; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(oy.x, oy.y); ctx.stroke();
    ctx.strokeStyle = '#00dce9'; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(oz.x, oz.y); ctx.stroke();

   } else {
    const R = geom.R;
    const w = geom.width;
    const h = geom.height;
    const N = 70;
    const dTh = geom.totalAngle / N;

    ctx.fillStyle = '#123c54';
    ctx.strokeStyle = '#00dce9';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    for(let i=0; i<=N; i++){
     const th = i * dTh;
     const rInner = R - w/2;
     const x = R - rInner * Math.cos(th);
     const y = rInner * Math.sin(th);
     const pt = toScreen(x, y, 0);
     if(i===0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
    }
    for(let i=N; i>=0; i--){
     const th = i * dTh;
     const rOuter = R + w/2;
     const x = R - rOuter * Math.cos(th);
     const y = rOuter * Math.sin(th);
     const pt = toScreen(x, y, 0);
     ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#65f3ff';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for(let i=0; i<=N; i++){
     const th = i * dTh;
     const x = R - R * Math.cos(th);
     const y = R * Math.sin(th);
     const pt = toScreen(x, y, 0);
     if(i===0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
   }

   ctx.restore();
  }

  function drawHoles(){
   for(const holeKey of state.holesDone){
    const [hx, hy] = holeKey.split(',').map(Number);
    const pt = toScreen(hx, hy, 0);
    ctx.save();
    ctx.fillStyle = '#031627';
    ctx.strokeStyle = '#ffd13b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, Math.max(3, 4 * state.camera.zoom * 0.2), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
   }
  }

  function drawTool(x, y, z, toolType){
   const p = toScreen(x, y, z);
   const col = TOOL_COLORS[toolType] || '#fff';
   ctx.save();

   if(toolType === 'probe'){
    ctx.strokeStyle = '#00dce9';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 50);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2);
    ctx.fill();

    if(state.probeFlash > 0){
     ctx.strokeStyle = '#54d98c';
     ctx.lineWidth = 3;
     ctx.beginPath();
     ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
     ctx.stroke();
     state.probeFlash--;
    }
   } else if(toolType === 'mill'){
    ctx.fillStyle = col;
    ctx.fillRect(p.x - 7, p.y - 45, 14, 45);
    ctx.strokeStyle = '#031627';
    ctx.lineWidth = 1.5;
    for(let i=0; i<3; i++){
     ctx.beginPath();
     ctx.moveTo(p.x - 7, p.y - 35 + i * 12);
     ctx.lineTo(p.x + 7, p.y - 27 + i * 12);
     ctx.stroke();
    }
   } else if(toolType === 'drill'){
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(p.x - 6, p.y - 45);
    ctx.lineTo(p.x + 6, p.y - 45);
    ctx.lineTo(p.x + 6, p.y - 8);
    ctx.lineTo(p.x, p.y);
    ctx.lineTo(p.x - 6, p.y - 8);
    ctx.closePath();
    ctx.fill();
   } else if(toolType === 'chamfer'){
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(p.x - 12, p.y - 25);
    ctx.lineTo(p.x + 12, p.y - 25);
    ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#668399';
    ctx.fillRect(p.x - 4, p.y - 45, 8, 20);
   } else if(toolType === 'tap'){
    ctx.fillStyle = col;
    ctx.fillRect(p.x - 6, p.y - 45, 12, 45);
    ctx.strokeStyle = '#031627';
    ctx.lineWidth = 1.5;
    for(let i=0; i<5; i++){
     ctx.beginPath();
     ctx.moveTo(p.x - 6, p.y - 40 + i * 8);
     ctx.lineTo(p.x + 6, p.y - 36 + i * 8);
     ctx.stroke();
    }
   }

   ctx.restore();
  }

  function render(){
   ctx.clearRect(0, 0, canvas.width, canvas.height);

   ctx.strokeStyle = 'rgba(55,96,120,0.2)';
   ctx.lineWidth = 1;
   const gridStep = 40;
   for(let gx=0; gx<canvas.width; gx+=gridStep){
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke();
   }
   for(let gy=0; gy<canvas.height; gy+=gridStep){
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke();
   }

   drawPiece();
   drawHoles();

   let curX = 0, curY = 0, curZ = 50, curTool = 'mill';

   if(state.ops.length > 0 && state.stepIndex < state.ops.length){
    const op = state.ops[state.stepIndex];
    curTool = op.tool;
    toolInfo.textContent = op.toolName;

    if(op.type === 'cycle'){
     curX = op.x; curY = op.y;
     const zTop = 10, zBottom = op.z;
     const p = state.stepProgress;
     curZ = p < 0.5 ? zTop - (zTop - zBottom) * (p * 2) : zBottom + (zTop - zBottom) * ((p - 0.5) * 2);
     if(p > 0.48) state.holesDone.add(curX.toFixed(2) + ',' + curY.toFixed(2));
    } else {
     const t = state.stepProgress;
     curX = op.from.x + (op.to.x - op.from.x) * t;
     curY = op.from.y + (op.to.y - op.from.y) * t;
     curZ = op.from.z + (op.to.z - op.from.z) * t;
     if(op.tool === 'probe' && /P9811|P9812/i.test(op.raw) && t > 0.85) state.probeFlash = 4;
    }

    coordInfo.textContent = `X: ${curX.toFixed(2)}  Y: ${curY.toFixed(2)}  Z: ${curZ.toFixed(2)}`;

    if(state.followTool){
     const scr = toScreen(curX, curY, curZ);
     state.camera.x += (canvas.width / 2 - scr.x) * 0.05;
     state.camera.y += (canvas.height / 2 - scr.y) * 0.05;
    }
   }

   drawTool(curX, curY, curZ, curTool);
  }

  function loop(){
   if(state.playing && state.ops.length > 0){
    state.stepProgress += 0.045;
    if(state.stepProgress >= 1){
     state.stepProgress = 0;
     state.stepIndex++;
     if(state.stepIndex >= state.ops.length){
      state.stepIndex = state.ops.length - 1;
      state.playing = false;
      playBtn.textContent = 'Avvia';
     }
    }
   }
   render();
   requestAnimationFrame(loop);
  }

  simBtn.addEventListener('click', () => {
   const isoText = textarea.value;
   if(!isoText.trim()){ alert('Genera prima il programma ISO!'); return; }
   state.ops = parseISO(isoText);
   state.stepIndex = 0;
   state.stepProgress = 0;
   state.holesDone.clear();
   state.playing = true;
   playBtn.textContent = 'Pausa';
   textarea.hidden = true;
   container.hidden = false;
   resizeCanvas();
   resetView(true);
  });

  closeBtn.addEventListener('click', () => {
   state.playing = false;
   container.hidden = true;
   textarea.hidden = false;
  });

  playBtn.addEventListener('click', () => {
   state.playing = !state.playing;
   playBtn.textContent = state.playing ? 'Pausa' : 'Riprendi';
  });

  resetBtn.addEventListener('click', () => {
   state.stepIndex = 0;
   state.stepProgress = 0;
   state.holesDone.clear();
   state.playing = false;
   playBtn.textContent = 'Avvia';
   resetView(false);
  });

  topViewBtn.addEventListener('click', () => {
   state.viewMode = 'top';
   render();
  });

  view3dBtn.addEventListener('click', () => {
   state.viewMode = '3d';
   render();
  });

  focusToolBtn.addEventListener('click', () => {
   state.followTool = !state.followTool;
   focusToolBtn.style.background = state.followTool ? '#00dce9' : '#153c56';
   focusToolBtn.style.color = state.followTool ? '#031627' : '#65f3ff';
  });

  focusAllBtn.addEventListener('click', () => {
   resetView(true);
  });

  let isDragging = false;
  let lastTouchX = 0, lastTouchY = 0;
  let pinchStartDist = 0;
  let pinchStartZoom = 1;

  function dist(t1, t2){
   return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  }

  canvas.addEventListener('mousedown', e => {
   isDragging = true;
   lastTouchX = e.clientX;
   lastTouchY = e.clientY;
  });
  window.addEventListener('mousemove', e => {
   if(!isDragging) return;
   const dx = e.clientX - lastTouchX;
   const dy = e.clientY - lastTouchY;
   state.camera.x += dx;
   state.camera.y += dy;
   lastTouchX = e.clientX;
   lastTouchY = e.clientY;
  });
  window.addEventListener('mouseup', () => { isDragging = false; });

  canvas.addEventListener('wheel', e => {
   e.preventDefault();
   const factor = e.deltaY < 0 ? 1.15 : 0.85;
   state.camera.zoom = Math.max(0.1, Math.min(30, state.camera.zoom * factor));
  }, { passive: false });

  canvas.addEventListener('touchstart', e => {
   if(e.touches.length === 1){
    isDragging = true;
    lastTouchX = e.touches[0].clientX;
    lastTouchY = e.touches[0].clientY;
   } else if(e.touches.length === 2){
    isDragging = false;
    pinchStartDist = dist(e.touches[0], e.touches[1]);
    pinchStartZoom = state.camera.zoom;
   }
  }, { passive: true });

  canvas.addEventListener('touchmove', e => {
   if(e.touches.length === 1 && isDragging){
    const dx = e.touches[0].clientX - lastTouchX;
    const dy = e.touches[0].clientY - lastTouchY;
    state.camera.x += dx;
    state.camera.y += dy;
    lastTouchX = e.touches[0].clientX;
    lastTouchY = e.touches[0].clientY;
   } else if(e.touches.length === 2){
    const curDist = dist(e.touches[0], e.touches[1]);
    if(pinchStartDist > 0){
     const factor = curDist / pinchStartDist;
     state.camera.zoom = Math.max(0.1, Math.min(30, pinchStartZoom * factor));
    }
   }
  }, { passive: true });

  canvas.addEventListener('touchend', e => {
   if(e.touches.length === 0) isDragging = false;
   if(e.touches.length < 2) pinchStartDist = 0;
  });

  window.addEventListener('resize', () => {
   if(!container.hidden) resizeCanvas();
  });

  requestAnimationFrame(loop);
 }
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSimulator); else initSimulator();
})(globalThis);
