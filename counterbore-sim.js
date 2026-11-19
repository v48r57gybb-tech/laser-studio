(function(){
'use strict';
const MODES=[
 {card:'straightOutput',text:'output',key:'counterbore-straight'},
 {card:'arcOutputCard',text:'arcOutput',key:'counterbore-arc'}
];
function $(id){return document.getElementById(id);}
function num(v){return v==null||String(v).trim()===''?NaN:Number(String(v).replace(',','.'));}
function extractCounterbore(text){
 const lines=text.split(/\r?\n/);
 const start=lines.findIndex(l=>/LAMATURA/i.test(l));
 if(start<0)return null;
 let end=lines.findIndex((l,i)=>i>start&&/\bM30\b|\bM02\b/.test(l));
 if(end<0)end=lines.length;
 return lines.slice(start,end);
}
function parseToolpath(lines){
 const segments=[];let pos={x:0,y:0,z:0};
 for(const raw of lines){
  const code=raw.replace(/\([^)]*\)/g,'').split(';')[0].toUpperCase().trim();
  if(!code)continue;
  const words={};
  for(const m of code.matchAll(/([XYZ])\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))/g))words[m[1]]=Number(m[2]);
  const cutting=/\bG0?1\b/.test(code);
  const target={x:words.X??pos.x,y:words.Y??pos.y,z:words.Z??pos.z};
  if(words.X!==undefined||words.Y!==undefined||words.Z!==undefined){
   if(cutting&&(target.z<pos.z-1e-9||Math.hypot(target.x-pos.x,target.y-pos.y)>1e-9))
    segments.push({from:{...pos},to:{...target}});
   pos=target;
  }
 }
 return segments;
}
function initOverlay(mode){
 const card=$(mode.card),textarea=$(mode.text);
 if(!card||!textarea||card.querySelector('.cb-sim'))return;
 const button=document.createElement('button');
 button.type='button';button.className='btn-cb-sim';
 button.textContent='SIMULAZIONE LAMATURA';
 button.style.cssText='background:#10b981;color:#031627';
 (card.querySelector('.actions')||card).append(button);
 const overlay=document.createElement('div');
 overlay.className='cb-sim';overlay.hidden=true;
 overlay.innerHTML='<div class="actions"><button type="button" data-do="play">Avvia / Pausa</button><button type="button" data-do="reset">Riavvia</button><button type="button" data-do="record">Registra video</button><button type="button" data-do="close">Chiudi</button></div><label>Velocità <output>1×</output><input type="range" min="0.25" max="16" step="0.25" value="1"></label><canvas style="display:block;width:100%;height:420px;background:#031627"></canvas><p class="notice">Asportazione nominale della lamatura: verde = materiale rimosso, grigio-blu = fondo residuo. La registrazione produce un file WebM.</p>';
 card.insertBefore(overlay,textarea);
 const canvas=overlay.querySelector('canvas'),ctx=canvas.getContext('2d');
 const speed=overlay.querySelector('input'),label=overlay.querySelector('output');
 const recordButton=overlay.querySelector('[data-do=record]');
 let segments=[],grid=null,cell=1,index=0,progress=0,playing=false,last=0,recorder=null,recording=false,chunks=[];
 function readConfig(){
  try{return JSON.parse(localStorage.getItem(mode.key)||'null')||{};}catch(e){return{};}
 }
 function buildGrid(){
  const cfg=readConfig();
  const toolR=Math.max(0.5,num(cfg.toolDiameter)||5)/2;
  const depth=Math.max(0.1,num(cfg.depth)||5.4);
  if(!segments.length)throw Error('Nessun percorso di lamatura disponibile.');
  let loX=Infinity,hiX=-Infinity,loY=Infinity,hiY=-Infinity;
  for(const s of segments)for(const p of [s.from,s.to]){
   loX=Math.min(loX,p.x);hiX=Math.max(hiX,p.x);
   loY=Math.min(loY,p.y);hiY=Math.max(hiY,p.y);
  }
  loX-=toolR+2;hiX+=toolR+2;loY-=toolR+2;hiY+=toolR+2;
  cell=Math.max(0.25,toolR/3);
  const cols=Math.ceil((hiX-loX)/cell),rows=Math.ceil((hiY-loY)/cell);
  if(cols*rows>1200000)throw Error('Area di simulazione troppo grande.');
  grid={loX,loY,cols,rows,cell,toolR,depth,height:new Float32Array(cols*rows).fill(0)};
 }
 function stamp(x,y,z){
  const g=grid,r=g.toolR;
  const c0=Math.max(0,Math.floor((x-r-g.loX)/g.cell)),c1=Math.min(g.cols-1,Math.ceil((x+r-g.loX)/g.cell));
  const r0=Math.max(0,Math.floor((y-r-g.loY)/g.cell)),r1=Math.min(g.rows-1,Math.ceil((y+r-g.loY)/g.cell));
  for(let row=r0;row<=r1;row++)for(let col=c0;col<=c1;col++){
   const px=g.loX+(col+0.5)*g.cell,py=g.loY+(row+0.5)*g.cell;
   if(Math.hypot(px-x,py-y)<=r){
    const i=row*g.cols+col;
    if(z<g.height[i])g.height[i]=z;
   }
  }
 }
 function removeMaterial(upto){
  const g=grid;
  for(let i=0;i<upto&&i<segments.length;i++){
   const s=segments[i],len=Math.hypot(s.to.x-s.from.x,s.to.y-s.from.y,s.to.z-s.from.z);
   const steps=Math.max(1,Math.ceil(len/(g.toolR/2)));
   for(let k=0;k<=steps;k++){
    const t=k/steps;
    stamp(s.from.x+(s.to.x-s.from.x)*t,s.from.y+(s.to.y-s.from.y)*t,s.from.z+(s.to.z-s.from.z)*t);
   }
  }
 }
 function render(){
  const g=grid;if(!g)return;
  ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);
  const scale=Math.min(canvas.clientWidth/g.cols,canvas.clientHeight/g.rows);
  const offX=(canvas.clientWidth-g.cols*scale)/2,offY=(canvas.clientHeight-g.rows*scale)/2;
  for(let row=0;row<g.rows;row++)for(let col=0;col<g.cols;col++){
   const h=g.height[row*g.cols+col];
   const removed=h<-1e-6;
   ctx.fillStyle=removed?'rgb('+Math.round(30+120*Math.min(1,-h/g.depth))+','+Math.round(180-80*Math.min(1,-h/g.depth))+',110)':'#16435c';
   ctx.fillRect(offX+col*scale,offY+row*scale,Math.ceil(scale),Math.ceil(scale));
  }
  if(index<segments.length){
   const s=segments[index],t=progress;
   const x=s.from.x+(s.to.x-s.from.x)*t,y=s.from.y+(s.to.y-s.from.y)*t;
   ctx.beginPath();
   ctx.arc(offX+(x-g.loX)/g.cell*scale,offY+(y-g.loY)/g.cell*scale,Math.max(2,g.toolR/2*scale),0,Math.PI*2);
   ctx.strokeStyle='#ff901a';ctx.lineWidth=2;ctx.stroke();
  }
 }
 function loop(now){
  const dt=last?Math.min(0.1,(now-last)/1000):0;last=now;
  if(!overlay.hidden&&playing&&segments.length){
   progress+=dt*Number(speed.value)*8;
   while(progress>=1&&playing){
    progress-=1;index++;
    if(index>=segments.length){index=segments.length-1;progress=1;playing=false;break;}
   }
   removeMaterial(index+1);
  }
  if(!overlay.hidden)render();
  if(recording&&index===segments.length-1&&progress>=1){
   recording=false;playing=false;
   if(recorder&&recorder.state!=='inactive')recorder.stop();
  }
  requestAnimationFrame(loop);
 }
 function startSimulation(){
  const cb=extractCounterbore(textarea.value);
  if(!cb)throw Error('Genera prima il programma con la lamatura attiva.');
  segments=parseToolpath(cb);
  if(!segments.length)throw Error('Nessun movimento di asportazione trovato.');
  buildGrid();index=0;progress=0;
  textarea.hidden=true;overlay.hidden=false;
  removeMaterial(1);render();
 }
 button.onclick=()=>{
  try{startSimulation();playing=true;}catch(error){playing=false;alert(error.message);}
 };
 overlay.addEventListener('click',e=>{
  const action=e.target.dataset.do;if(!action)return;
  if(action==='close'){
   playing=false;recording=false;
   if(recorder&&recorder.state!=='inactive')recorder.stop();
   overlay.hidden=true;textarea.hidden=false;
  }
  if(action==='play')playing=!playing;
  if(action==='reset'){index=0;progress=0;playing=false;grid.height.fill(0);removeMaterial(1);}
  if(action==='record'){
   if(!canvas.captureStream||!window.MediaRecorder){alert('La registrazione video non è supportata da questo browser.');return;}
   try{
    startSimulation();
    chunks=[];
    const stream=canvas.captureStream(30);
    recorder=new MediaRecorder(stream,{mimeType:'video/webm'});
    recorder.ondataavailable=ev=>{if(ev.data.size)chunks.push(ev.data);};
    recorder.onstop=()=>{
     const blob=new Blob(chunks,{type:'video/webm'});
     const url=URL.createObjectURL(blob);
     const a=document.createElement('a');
     a.href=url;a.download='lamatura-'+mode.key+'.webm';a.click();
     setTimeout(()=>URL.revokeObjectURL(url),1000);
     recordButton.textContent='Registra video';
    };
    recorder.start();recording=true;playing=true;
    recordButton.textContent='Registrazione…';
   }catch(error){recording=false;playing=false;alert(error.message);}
  }
  render();
 });
 speed.oninput=()=>label.textContent=speed.value+'×';
 window.addEventListener('resize',()=>{if(!overlay.hidden)render();});
 requestAnimationFrame(loop);
}
function init(){MODES.forEach(initOverlay);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
