export function mountIsoSimulation({container,getIso,tools}){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 const button=el('button','Simulazione 3D ISO');button.type='button';
 const status=el('p','Genera prima l’ISO candidato.');status.setAttribute('role','status');
 const canvas=el('canvas');canvas.width=800;canvas.height=420;canvas.style.width='100%';canvas.style.height='420px';canvas.setAttribute('aria-label','Simulazione 3D dell’ISO candidato');
 const controls=el('div');controls.className='actions';
 const play=el('button','Avvia / Pausa');play.type='button';play.disabled=true;
 const reset=el('button','Riavvia');reset.type='button';reset.disabled=true;
 const close=el('button','Chiudi');close.type='button';close.disabled=true;
 controls.append(play,reset,close);
 const warning=el('p','Simulazione del percorso ISO: non verifica collisioni, portautensili reali, asportazione volumetrica o idoneità macchina.');warning.className='notice';
 container.append(button,status,canvas,controls,warning);
 const ctx=canvas.getContext('2d');
 let ops=[],index=0,progress=0,playing=false,raf=0,last=0;
 function stop(){playing=false;if(raf)cancelAnimationFrame(raf);raf=0}
 function project(p){return {x:(p.x-p.y)*0.70710678,y:(p.x+p.y)*0.38-p.z}}
 function fit(){
  if(!ops.length)return;
  const pts=ops.flatMap(o=>[project(o.from),project(o.to)]);
  const bounds=pts.reduce((b,p)=>({minX:Math.min(b.minX,p.x),maxX:Math.max(b.maxX,p.x),minY:Math.min(b.minY,p.y),maxY:Math.max(b.maxY,p.y)}),{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity});
  const scale=Math.min((canvas.width-80)/Math.max(1,bounds.maxX-bounds.minX),(canvas.height-100)/Math.max(1,bounds.maxY-bounds.minY));
  return {scale,ox:canvas.width/2-(bounds.minX+bounds.maxX)/2*scale,oy:canvas.height/2-(bounds.minY+bounds.maxY)/2*scale};
 }
 function draw(){
  if(!ctx||!ops.length)return;
  const view=fit();if(!view)return;
  ctx.fillStyle='#031627';ctx.fillRect(0,0,canvas.width,canvas.height);
  const screen=p=>{const q=project(p);return [view.ox+q.x*view.scale,view.oy+q.y*view.scale]};
  const colors={mill:'#ff901a',drill:'#ffd13b',chamfer:'#d946ef',tap:'#10b981',probe:'#ff4d6d'};
  for(let i=1;i<=Math.min(index,ops.length-1);i++){
   const o=ops[i-1];ctx.strokeStyle=o.type==='rapid'?'#52758b':(colors[o.tool]??'#42cfe7');ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(...screen(o.from));ctx.lineTo(...screen(o.to));ctx.stroke();
  }
  const current=ops[Math.min(index,ops.length-1)],p={x:current.from.x+(current.to.x-current.from.x)*progress,y:current.from.y+(current.to.y-current.from.y)*progress,z:current.from.z+(current.to.z-current.from.z)*progress};
  ctx.strokeStyle=colors[current.tool]??'#42cfe7';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(...screen(current.from));ctx.lineTo(...screen(p));ctx.stroke();
  status.textContent=`${current.toolName} · riga ${current.line} · movimento ${index+1}/${ops.length} · X ${p.x.toFixed(3)} Y ${p.y.toFixed(3)} Z ${p.z.toFixed(3)}`;
 }
 function tick(now){
  if(!playing)return;
  const dt=last?Math.min(0.1,(now-last)/1000):0;last=now;
  const op=ops[index];if(!op){stop();return}
  progress+=dt/Math.max(0.05,op.distance/200);
  if(progress>=1){progress=0;if(index<ops.length-1)index++;else{progress=1;stop()}}
  draw();if(playing)raf=requestAnimationFrame(tick);
 }
 function start(){
  const iso=getIso();
  if(!iso?.trim()){status.textContent='Genera prima l’ISO candidato.';return}
  const sim=globalThis.CncSimulation;
  if(!sim?.parseISO){status.textContent='Simulatore CNC non disponibile.';return}
  try{
   ops=sim.parseISO(iso);if(!ops.length)throw Error('Nessun movimento ISO riconosciuto');
   index=0;progress=0;playing=true;last=0;play.disabled=reset.disabled=close.disabled=false;status.textContent='Simulazione avviata: percorso nominale, non verifica collisioni.';draw();raf=requestAnimationFrame(tick);
  }catch(error){stop();ops=[];status.textContent='Simulazione non disponibile: '+error.message}
 }
 button.onclick=start;
 play.onclick=()=>{if(!ops.length)return;playing=!playing;if(playing){last=0;raf=requestAnimationFrame(tick)}};
 reset.onclick=()=>{index=0;progress=0;playing=false;draw()};
 close.onclick=()=>{stop();ops=[];status.textContent='Simulazione chiusa.'};
 return {invalidate(){stop();ops=[];status.textContent='ISO modificato: rigenerare e rilanciare la simulazione.'},dispose(){stop();container.remove()}};
}
