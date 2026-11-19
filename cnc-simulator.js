(function(){
'use strict';

function parseIso(isoText){
 const lines=isoText.split(/\r?\n/);
 const moves=[];
 let currentTool=null;
 let currentFamily='mill';
 let x=0,y=0,z=100;
 let isProbeCycle=false;

 for(let line of lines){
  const clean=line.trim();
  if(!clean || clean.startsWith('%')) continue;

  const tMatch=clean.match(/T(\d+)\s*M6/i);
  if(tMatch){
   currentTool=Number(tMatch[1]);
   if(currentTool===28) currentFamily='probe';
   else if(clean.includes('FRESA')) currentFamily='mill';
   else if(clean.includes('PUNTA')) currentFamily='drill';
   else if(clean.includes('SVASATORE')) currentFamily='chamfer';
   else if(clean.includes('MASCHIO')) currentFamily='tap';
  }

  if(clean.includes('G65 P9811') || clean.includes('G65 P9812')){
   const zM=clean.match(/Z(-?\d+(?:\.\d*)?)/i);
   const xM=clean.match(/X(-?\d+(?:\.\d*)?)/i);
   const yM=clean.match(/Y(-?\d+(?:\.\d*)?)/i);
   moves.push({
    tool:currentTool||28,
    family:'probe',
    type:'probe',
    x:xM?Number(xM[1]):x,
    y:yM?Number(yM[1]):y,
    z:zM?Number(zM[1]):z,
    desc:'Tastatura'
   });
   continue;
  }

  if(clean.match(/G98\s+(G81|G82|G83|G73|G84)/i)){
   const cycle=clean.match(/G98\s+(G\d+)/i)[1].toUpperCase();
   const zM=clean.match(/Z(-?\d+(?:\.\d*)?)/i);
   const rM=clean.match(/R(-?\d+(?:\.\d*)?)/i);
   const targetZ=zM?Number(zM[1]):-10;
   const planeR=rM?Number(rM[1]):3;
   moves.push({
    tool:currentTool,
    family:currentFamily,
    type:'cycle',
    cycle,
    x,y,
    planeR,
    targetZ,
    desc:cycle
   });
   continue;
  }

  const xm=clean.match(/(?:^|\s)X(-?\d+(?:\.\d*)?)/i);
  const ym=clean.match(/(?:^|\s)Y(-?\d+(?:\.\d*)?)/i);
  const zm=clean.match(/(?:^|\s)Z(-?\d+(?:\.\d*)?)/i);

  if(xm) x=Number(xm[1]);
  if(ym) y=Number(ym[1]);
  if(zm) z=Number(zm[1]);

  if(xm||ym||zm){
   const isRapid=clean.includes('G0 ') || clean.includes('G00') || clean.includes('P9810');
   moves.push({
    tool:currentTool,
    family:currentFamily,
    type:isRapid?'rapid':'feed',
    x,y,z,
    desc:isRapid?'G0 Rapido':'G1 Taglio'
   });
  }
 }
 return moves;
}

function initEngine(mode){
 const isArc=mode==='arc';
 const btn=document.getElementById(isArc?'simBtnArc':'simBtnStraight');
 const box=document.getElementById(isArc?'simBoxArc':'simBoxStraight');
 const output=document.getElementById(isArc?'arcOutput':'output');
 const canvas=document.getElementById(isArc?'simCanvasArc':'simCanvasStraight');
 const feedText=document.getElementById(isArc?'simFeedArc':'simFeedStraight');
 const playBtn=document.getElementById(isArc?'simPlayArc':'simPlayStraight');
 const resetBtn=document.getElementById(isArc?'simResetArc':'simResetStraight');
 const viewTopBtn=document.getElementById(isArc?'simViewTopArc':'simViewTopStraight');
 const viewIsoBtn=document.getElementById(isArc?'simViewIsoArc':'simViewIsoStraight');
 const closeBtn=document.getElementById(isArc?'simCloseArc':'simCloseStraight');

 if(!btn||!box||!output||!canvas) return;

 const colors={
  probe:'#ff4d6d',
  mill:'#ff901a',
  drill:'#ffd000',
  chamfer:'#d946ef',
  tap:'#10b981'
 };

 let moves=[];
 let stepIndex=0;
 let isPlaying=false;
 let viewMode='3d';
 let animFrame=null;
 let lastTime=0;

 function syncCanvas(){
  const rect=canvas.parentElement.getBoundingClientRect();
  canvas.width=rect.width*window.devicePixelRatio||900;
  canvas.height=rect.height*window.devicePixelRatio||520;
 }

 function getPartParams(){
  if(!isArc){
   const len=Number(document.getElementById('length')?.value)||1000;
   const wid=Number(document.getElementById('width')?.value)||16.5;
   const hgt=Number(document.getElementById('height')?.value)||10;
   return {len,wid,hgt};
  }else{
   const rad=Number(document.getElementById('aRadius')?.value)||990;
   const wid=Number(document.getElementById('aWidth')?.value)||23;
   const hgt=Number(document.getElementById('aHeight')?.value)||13.5;
   const isLeft=document.getElementById('aCurve')?.value==='left';
   return {rad,wid,hgt,isLeft};
  }
 }

 function project(px,py,pz,cx,cy,scale){
  if(viewMode==='top'){
   return [cx + px*scale, cy - py*scale];
  }
  const isoX = (px - py) * 0.866;
  const isoY = (px + py) * 0.5 * 0.5 - pz * 0.8;
  return [cx + isoX*scale, cy + isoY*scale];
 }

 function render(){
  const ctx=canvas.getContext('2d');
  const w=canvas.width, h=canvas.height;
  ctx.clearRect(0,0,w,h);

  const part=getPartParams();
  let scale=1;
  let cx=w/2, cy=h/2;

  if(!isArc){
   scale=Math.min(w/(part.len*1.4), h/(part.wid*12));
   if(viewMode==='3d') scale*=0.85;
   cx = w*0.15;
   cy = h*0.55;
  }else{
   scale=Math.min(w/(part.rad*2.4), h/(part.rad*2.4));
   if(viewMode==='3d') scale*=0.75;
   cx = w*0.45;
   cy = h*0.65;
  }

  ctx.strokeStyle='#10384f';
  ctx.lineWidth=1;
  for(let x=40;x<w;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  for(let y=40;y<h;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}

  ctx.fillStyle='#0f3854';
  ctx.strokeStyle='#376078';
  ctx.lineWidth=2;

  if(!isArc){
   const p1=project(0,-part.wid/2,0,cx,cy,scale);
   const p2=project(part.len,-part.wid/2,0,cx,cy,scale);
   const p3=project(part.len,part.wid/2,0,cx,cy,scale);
   const p4=project(0,part.wid/2,0,cx,cy,scale);
   ctx.beginPath();
   ctx.moveTo(p1[0],p1[1]);
   ctx.lineTo(p2[0],p2[1]);
   ctx.lineTo(p3[0],p3[1]);
   ctx.lineTo(p4[0],p4[1]);
   ctx.closePath();
   ctx.fill();
   ctx.stroke();

   if(viewMode==='3d'){
    const b1=project(0,-part.wid/2,-part.hgt,cx,cy,scale);
    const b2=project(part.len,-part.wid/2,-part.hgt,cx,cy,scale);
    const b3=project(part.len,part.wid/2,-part.hgt,cx,cy,scale);
    ctx.beginPath();
    ctx.moveTo(p1[0],p1[1]);ctx.lineTo(b1[0],b1[1]);
    ctx.lineTo(b2[0],b2[1]);ctx.lineTo(p2[0],p2[1]);
    ctx.lineTo(p3[0],p3[1]);ctx.lineTo(b3[0],b3[1]);
    ctx.stroke();
   }
  }else{
   ctx.beginPath();
   const totalAng=Math.PI/2.5;
   const sign=part.isLeft?1:-1;
   const segs=40;
   const outerPts=[], innerPts=[];
   for(let i=0;i<=segs;i++){
    const th=(i/segs)*totalAng;
    const rOut=part.rad+part.wid/2;
    const rIn=part.rad-part.wid/2;
    const ox=rOut*Math.sin(th)*sign, oy=rOut*(1-Math.cos(th));
    const ix=rIn*Math.sin(th)*sign, iy=rIn*(1-Math.cos(th));
    outerPts.push(project(ox,oy,0,cx,cy,scale));
    innerPts.push(project(ix,iy,0,cx,cy,scale));
   }
   ctx.moveTo(outerPts[0][0],outerPts[0][1]);
   for(let p of outerPts) ctx.lineTo(p[0],p[1]);
   for(let i=innerPts.length-1;i>=0;i--) ctx.lineTo(innerPts[i][0],innerPts[i][1]);
   ctx.closePath();
   ctx.fill();
   ctx.stroke();
  }

  const orig=project(0,0,0,cx,cy,scale);
  const axX=project(40,0,0,cx,cy,scale);
  const axY=project(0,40,0,cx,cy,scale);
  const axZ=project(0,0,40,cx,cy,scale);

  ctx.lineWidth=3;
  ctx.strokeStyle='#ff4d6d';ctx.beginPath();ctx.moveTo(orig[0],orig[1]);ctx.lineTo(axX[0],axX[1]);ctx.stroke();
  ctx.strokeStyle='#54d98c';ctx.beginPath();ctx.moveTo(orig[0],orig[1]);ctx.lineTo(axY[0],axY[1]);ctx.stroke();
  if(viewMode==='3d'){
   ctx.strokeStyle='#00dce9';ctx.beginPath();ctx.moveTo(orig[0],orig[1]);ctx.lineTo(axZ[0],axZ[1]);ctx.stroke();
  }

  ctx.fillStyle='#fff';
  ctx.font='12px system-ui';
  ctx.fillText('X',axX[0]+4,axX[1]);
  ctx.fillText('Y',axY[0]+4,axY[1]);
  if(viewMode==='3d') ctx.fillText('Z',axZ[0]+4,axZ[1]-4);
  ctx.fillText('G56 (X0 Y0 Z0)',orig[0]-20,orig[1]-10);

  if(!moves.length) return;

  const count=Math.min(stepIndex,moves.length);
  ctx.lineWidth=2;

  for(let i=1;i<count;i++){
   const m1=moves[i-1], m2=moves[i];
   const pStart=project(m1.x,m1.y,m1.z,cx,cy,scale);
   const pEnd=project(m2.x,m2.y,m2.z,cx,cy,scale);

   if(m2.type==='rapid'){
    ctx.setLineDash([4,4]);
    ctx.strokeStyle='rgba(143,246,255,0.45)';
   }else{
    ctx.setLineDash([]);
    ctx.strokeStyle=colors[m2.family]||'#fff';
   }

   ctx.beginPath();
   ctx.moveTo(pStart[0],pStart[1]);
   ctx.lineTo(pEnd[0],pEnd[1]);
   ctx.stroke();
  }
  ctx.setLineDash([]);

  const currentMove=moves[Math.min(count,moves.length-1)];
  if(currentMove){
   const toolPos=project(currentMove.x,currentMove.y,currentMove.z,cx,cy,scale);
   const toolTop=project(currentMove.x,currentMove.y,currentMove.z+60,cx,cy,scale);
   const tCol=colors[currentMove.family]||'#00dce9';

   ctx.strokeStyle=tCol;
   ctx.lineWidth=6;
   ctx.beginPath();
   ctx.moveTo(toolTop[0],toolTop[1]);
   ctx.lineTo(toolPos[0],toolPos[1]);
   ctx.stroke();

   if(currentMove.family==='probe'){
    ctx.fillStyle='#ff4d6d';
    ctx.beginPath();
    ctx.arc(toolPos[0],toolPos[1],6,0,Math.PI*2);
    ctx.fill();
    if(currentMove.type==='probe'){
     ctx.strokeStyle='#54d98c';
     ctx.lineWidth=3;
     ctx.beginPath();
     ctx.arc(toolPos[0],toolPos[1],14,0,Math.PI*2);
     ctx.stroke();
    }
   }else{
    ctx.fillStyle=tCol;
    ctx.beginPath();
    ctx.arc(toolPos[0],toolPos[1],5,0,Math.PI*2);
    ctx.fill();
   }

   feedText.textContent='Utensile: T'+(currentMove.tool||'—')+' ('+currentMove.family.toUpperCase()+') · X: '+currentMove.x.toFixed(2)+'  Y: '+currentMove.y.toFixed(2)+'  Z: '+currentMove.z.toFixed(2)+' · '+currentMove.desc;
  }
 }

 function loop(ts){
  if(!isPlaying) return;
  if(ts-lastTime>40){
   stepIndex++;
   if(stepIndex>=moves.length){
    stepIndex=moves.length;
    isPlaying=false;
    playBtn.textContent='Riavvia';
   }
   lastTime=ts;
   render();
  }
  if(isPlaying) animFrame=requestAnimationFrame(loop);
 }

 function openSim(){
  const iso=output.value.trim();
  if(!iso) return;
  moves=parseIso(iso);
  stepIndex=0;
  box.hidden=false;
  output.hidden=true;
  syncCanvas();
  render();
  box.scrollIntoView({behavior:'smooth',block:'center'});
 }

 function closeSim(){
  isPlaying=false;
  if(animFrame) cancelAnimationFrame(animFrame);
  box.hidden=true;
  output.hidden=false;
 }

 btn.addEventListener('click',openSim);
 closeBtn.addEventListener('click',closeSim);

 playBtn.addEventListener('click',()=>{
  if(stepIndex>=moves.length) stepIndex=0;
  isPlaying=!isPlaying;
  playBtn.textContent=isPlaying?'Pausa':'Riprendi';
  if(isPlaying){
   lastTime=performance.now();
   animFrame=requestAnimationFrame(loop);
  }else if(animFrame){
   cancelAnimationFrame(animFrame);
  }
 });

 resetBtn.addEventListener('click',()=>{
  isPlaying=false;
  if(animFrame) cancelAnimationFrame(animFrame);
  playBtn.textContent='Avvia';
  stepIndex=0;
  render();
 });

 viewTopBtn.addEventListener('click',()=>{
  viewMode='top';
  render();
 });

 viewIsoBtn.addEventListener('click',()=>{
  viewMode='3d';
  render();
 });

 window.addEventListener('resize',()=>{
  if(!box.hidden){
   syncCanvas();
   render();
  }
 });
}

function boot(){
 initEngine('straight');
 initEngine('arc');
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
else boot();
})();
