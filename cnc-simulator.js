(function(root){
'use strict';
const COLORS={mill:'#ff901a',drill:'#ffd13b',chamfer:'#d946ef',tap:'#10b981',probe:'#ff4d6d'};
function parseISO(text){
 const ops=[],warnings=new Set(['Anteprima del percorso nominale: non verifica collisioni, correttori o misure reali.']);
 let pos={x:0,y:0,z:50},absolute=true,motion=0,cycle=null,initial=50,returnInitial=true,tool='mill',toolName='Utensile',feed=200,probe=false;
 const lines=text.split(/\r?\n/);
 for(let line=0;line<lines.length;line++){
  const raw=lines[line],code=raw.replace(/\([^)]*\)/g,'').split(';')[0].toUpperCase().trim();
  if(!code||code==='%')continue;
  const words={};for(const m of code.matchAll(/([A-Z])\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))/g))(words[m[1]]??=[]).push(Number(m[2]));
  const val=k=>words[k]?.at(-1),has=k=>words[k]!==undefined,gs=words.G||[],ms=words.M||[];
  const fail=s=>{throw Error('Riga '+(line+1)+': '+s+' — '+raw);};
  if(/[\[\]#]/.test(code))fail('Espressione macro non supportata');
  const move=(target,type='feed',extra={})=>{
   if(ops.length>200000)fail('Troppi movimenti');
   if(Object.values(target).some(n=>!Number.isFinite(n)))fail('Coordinata non valida');
   const distance=Math.hypot(target.x-pos.x,target.y-pos.y,target.z-pos.z);
   if(distance>1e-9||extra.pause||extra.dwell)ops.push({from:{...pos},to:{...target},type,tool,toolName,raw,line:line+1,feed,distance,...extra});
   pos={...target};
  };
  const axis=(k)=>has(k)?(absolute?val(k):pos[k.toLowerCase()]+val(k)):pos[k.toLowerCase()];
  if(has('F'))feed=val('F');
  if(has('T')&&ms.includes(6)){
   const context=lines.slice(Math.max(0,line-5),line+1).join(' ').toUpperCase();
   tool=probe||/SONDA|RENISHAW/.test(context)&&!/FRESA|PUNTA|SVASATORE|MASCHIO/.test(raw.toUpperCase())?'probe':/SVASATORE/.test(raw.toUpperCase())?'chamfer':/MASCHIO/.test(raw.toUpperCase())?'tap':/PUNTA/.test(raw.toUpperCase())?'drill':'mill';
   toolName='T'+val('T')+' · '+({probe:'SONDA',mill:'FRESA',drill:'PUNTA',chamfer:'SVASATORE',tap:'MASCHIO'}[tool]);cycle=null;
  }
  for(const g of gs){
   if(g===90)absolute=true;else if(g===91)absolute=false;
   else if(g===98)returnInitial=true;else if(g===99)returnInitial=false;
   else if(g===80)cycle=null;
   else if(g===0||g===1){motion=g;cycle=null;}
   else if(g===41||g===42)warnings.add('G41/G42: mostrato il percorso programmato, non la compensazione D reale.');
   else if(![4,17,21,40,43,49,56,65,73,81,82,83,84,94].includes(g))fail('G'+g+' non supportato');
  }
  if(ms.includes(30)||ms.includes(2))break;
  if(gs.includes(65)){
   const p=val('P');warnings.add('Tastatura nominale: le macro non ricostruiscono calibrazione, misure reali o aggiornamenti S3.');
   if(p===9832){probe=true;tool='probe';toolName='SONDA · '+toolName;continue;}
   if(p===9833){probe=false;continue;}
   tool='probe';
   if(p===9810||p===9811){move({x:axis('X'),y:axis('Y'),z:axis('Z')},'feed',{probeContact:p===9811});continue;}
   if(p===9812){
    const a=has('X')?'x':has('Y')?'y':null;if(!a)fail('P9812 privo di asse nominale');
    const width=val(a.toUpperCase()),center={...pos},depth=has('Z')?val('Z'):pos.z;
    if(!(width>0))fail('Larghezza tastatura non valida');
    for(const sign of [1,-1]){
     move({...pos,z:Math.max(10,center.z)},'rapid');
     move({...pos,[a]:center[a]+sign*(width/2+8)},'feed');
     move({...pos,z:depth},'feed');
     move({...pos,[a]:center[a]+sign*(width/2+3)},'feed',{probeContact:true});
     move({...pos,[a]:center[a]+sign*(width/2+8)},'feed');
    }
    move({...pos,z:Math.max(10,center.z)},'feed');move(center,'feed');continue;
   }
   fail('Macro P'+p+' non supportata');
  }
  const selected=gs.find(g=>[73,81,82,83,84].includes(g));
  if(selected!==undefined){
   if(!absolute)fail('Cicli incrementali G91 non supportati');
   initial=pos.z;cycle={code:selected,z:val('Z'),r:val('R'),q:val('Q'),p:val('P')||0};
  }
  const coords=has('X')||has('Y')||has('Z');
  if(cycle&&(selected!==undefined||has('X')||has('Y'))){
   if(!absolute)fail('Cicli incrementali G91 non supportati');
   if(has('Z'))cycle.z=val('Z');if(has('R'))cycle.r=val('R');if(has('Q'))cycle.q=val('Q');
   const c=cycle;if(!Number.isFinite(c.z)||!Number.isFinite(c.r)||c.z>=c.r)fail('Quote ciclo Z/R non valide');
   if([73,83].includes(c.code)&&(!(c.q>0)||!Number.isFinite(c.q)))fail('Q positiva richiesta');
   const returnZ=returnInitial?Math.max(initial,c.r):c.r;
   if(pos.z<c.r)move({...pos,z:c.r},'rapid');
   move({x:axis('X'),y:axis('Y'),z:pos.z},'rapid');move({...pos,z:c.r},'rapid');
   if([73,83].includes(c.code)){
    let bottom=c.r;let n=0;
    while(bottom>c.z+1e-9){
     if(++n>10000)fail('Numero affondi eccessivo');
     const next=Math.max(c.z,bottom-c.q);move({...pos,z:next},'feed',{cycle:c.code,holeEnd:next===c.z});
     bottom=next;
     if(bottom>c.z){
      if(c.code===83){move({...pos,z:c.r},'rapid');move({...pos,z:Math.min(c.r,bottom+0.5)},'rapid');}
      else{warnings.add('G73: stacco interno nominale 0,5 mm, da confrontare con i parametri macchina.');move({...pos,z:Math.min(c.r,bottom+0.5)},'rapid');}
     }
    }
   }else{
    move({...pos,z:c.z},'feed',{cycle:c.code,holeEnd:true});
    if(c.code===82&&c.p>0)move({...pos},'feed',{dwell:c.p/1000});
   }
   move({...pos,z:returnZ},c.code===84?'feed':'rapid',{cycle:c.code});continue;
  }
  if(gs.includes(4)){move({...pos},'feed',{dwell:val('P')/1000||0});continue;}
  if(coords)move({x:axis('X'),y:axis('Y'),z:axis('Z')},motion===0?'rapid':'feed');
  if(ms.includes(0))move({...pos},'feed',{pause:true});
 }
 ops.warnings=[...warnings];return ops;
}
function stockGeometry(text,mode){
 const num='([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))';
 const get=(pattern,fallback)=>Number(text.match(new RegExp(pattern,'i'))?.[1]??fallback);
 const width=get('LARGHEZZA '+num,23),height=get(' H'+num+'\\)',13.5),points=[];
 if(mode==='arc'){
  const cx=get('CENTRO CURVA X'+num,NaN),cy=get('CENTRO CURVA X[^\\n]* Y'+num,NaN),R=get('RAGGIO LINEA CENTRI FORI '+num,NaN),total=get('ANGOLO TOTALE '+num,NaN)*Math.PI/180;
  if(![cx,cy,R,total].every(Number.isFinite))throw Error('Metadati geometria arco mancanti');
  const ops=parseISO(text),first=ops.find(o=>o.holeEnd&&o.tool!=='probe')?.to;
  if(!first)throw Error('Nessun centro foro disponibile per orientare l’arco');
  const cross=(-cx)*(first.y-cy)-(-cy)*(first.x-cx),sign=cross>=0?1:-1,start=Math.atan2(-cy,-cx);
  for(let i=0;i<=160;i++){const a=start+sign*total*i/160;points.push({x:cx+R*Math.cos(a),y:cy+R*Math.sin(a),nx:Math.cos(a),ny:Math.sin(a)});}
 }else{
  const length=get('PEZZO DIRITTO L'+num,NaN);if(!Number.isFinite(length))throw Error('Lunghezza pezzo mancante nell’ISO');
  points.push({x:0,y:0,nx:0,ny:1},{x:length,y:0,nx:0,ny:1});
 }
 return {width,height,points};
}
root.CncSimulation={parseISO,stockGeometry};
if(typeof document==='undefined')return;
function initSimulator(){
 for(const s of [{outCard:'straightOutput',outText:'output',mode:'straight'},{outCard:'arcOutputCard',outText:'arcOutput',mode:'arc'}]){
  const card=document.getElementById(s.outCard),textarea=document.getElementById(s.outText);if(!card||!textarea||card.querySelector('.sim-container'))continue;
  const simBtn=document.createElement('button');simBtn.type='button';simBtn.className='btn-sim-start';simBtn.textContent='SIMULAZIONE 3D';simBtn.style.cssText='background:#ff901a;color:#031627';
  (card.querySelector('.actions')||card).append(simBtn);
  const container=document.createElement('div');container.className='sim-container';container.hidden=true;
  container.innerHTML='<p class="notice sim-warning"></p><div class="actions"><button type="button" data-do="play">Avvia / Pausa</button><button type="button" data-do="reset">Riavvia</button><button type="button" data-do="step">Blocco successivo</button><button type="button" data-do="top">Vista alto / 3D</button><button type="button" data-do="fit">Inquadra tutto</button><button type="button" data-do="follow">Segui utensile</button><button type="button" data-do="close">Chiudi</button></div><label>Velocità animazione <output class="speed-label">1×</output><input class="sim-speed" aria-label="Velocità animazione" type="range" min="0.25" max="32" step="0.25" value="1"></label><label>Posizione nel programma<input class="sim-seek" aria-label="Posizione nel programma" type="range" min="0" max="1" step="0.001" value="0"></label><canvas style="display:block;width:100%;height:440px;background:#031627;touch-action:none"></canvas><pre class="sim-status" style="white-space:pre-wrap"></pre>';
  card.insertBefore(container,textarea);
  const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d'),speed=container.querySelector('.sim-speed'),seek=container.querySelector('.sim-seek'),status=container.querySelector('.sim-status');
  let ops=[],stock=null,index=0,progress=0,playing=false,last=0,top=false,follow=false,zoom=1,panX=0,panY=0,snapshot='';
  function updateSimButtonState(){simBtn.disabled=!textarea.value.trim();if(snapshot&&snapshot!==textarea.value){playing=false;container.hidden=true;textarea.hidden=false;snapshot='';}}
  textarea.addEventListener('input', updateSimButtonState);
  textarea.addEventListener('change', updateSimButtonState);
  function projection(p){return top?{x:p.x,y:-p.y}:{x:(p.x-p.y)*0.70710678,y:(p.x+p.y)*0.38-p.z};}
  function screen(p){const a=projection(p);return{x:panX+a.x*zoom,y:panY+a.y*zoom};}
  function vertices(){if(!stock)return[];const a=stock.points.map(p=>({x:p.x+p.nx*stock.width/2,y:p.y+p.ny*stock.width/2,z:0})),b=stock.points.map(p=>({x:p.x-p.nx*stock.width/2,y:p.y-p.ny*stock.width/2,z:0}));return a.concat(b.reverse());}
  function resize(){const r=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;canvas.width=Math.max(1,r.width*dpr);canvas.height=Math.max(1,r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
  function fit(){follow=false;const points=vertices().concat(ops.flatMap(o=>[o.from,o.to])).map(projection);if(!points.length)return;const bounds=points.reduce((b,p)=>({loX:Math.min(b.loX,p.x),hiX:Math.max(b.hiX,p.x),loY:Math.min(b.loY,p.y),hiY:Math.max(b.hiY,p.y)}),{loX:Infinity,hiX:-Infinity,loY:Infinity,hiY:-Infinity}),{loX,hiX,loY,hiY}=bounds,w=canvas.clientWidth,h=canvas.clientHeight;zoom=Math.min((w-80)/Math.max(1,hiX-loX),(h-100)/Math.max(1,hiY-loY));panX=w/2-(loX+hiX)/2*zoom;panY=h/2-(loY+hiY)/2*zoom;}
  function path(points,fill,stroke){if(!points.length)return;ctx.beginPath();points.forEach((p,i)=>{const a=screen(p);if(!i)ctx.moveTo(a.x,a.y);else ctx.lineTo(a.x,a.y);});if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill();}ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
  function render(){
   ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);if(!stock||!ops.length)return;
   const op=ops[Math.min(index,ops.length-1)],t=progress,p={x:op.from.x+(op.to.x-op.from.x)*t,y:op.from.y+(op.to.y-op.from.y)*t,z:op.from.z+(op.to.z-op.from.z)*t};
   if(follow){const a=screen(p);panX+=canvas.clientWidth/2-a.x;panY+=canvas.clientHeight/2-a.y;}
   const v=vertices();if(!top){path(v.map(p=>({...p,z:-stock.height})),'#092337','#34546c');for(let j=0;j<v.length;j+=Math.max(1,Math.floor(v.length/24)))path([v[j],{...v[j],z:-stock.height}],null,'#34546c');}
   path(v,'#16435c','#65dce9');
   const done=new Set();for(let j=0;j<=index;j++){
    const o=ops[j];if(o.holeEnd&&(j<index||progress===1)){const key=o.to.x.toFixed(4)+','+o.to.y.toFixed(4);if(!done.has(key)){done.add(key);const h=screen({...o.to,z:0});ctx.beginPath();ctx.arc(h.x,h.y,3,0,Math.PI*2);ctx.fillStyle='#020c17';ctx.fill();}}
   }
   for(let j=Math.max(0,index-60);j<index;j++){const o=ops[j];path([o.from,o.to],null,o.type==='rapid'?'#52758b':COLORS[o.tool]);}
   path([op.from,p],null,COLORS[op.tool]);
   const a=screen(p);ctx.fillStyle=COLORS[op.tool];ctx.strokeStyle='#04121c';ctx.lineWidth=1;
   if(op.tool==='probe'){ctx.fillRect(a.x-2,a.y-45,4,40);ctx.beginPath();ctx.arc(a.x,a.y,6,0,Math.PI*2);ctx.fill();if(op.probeContact&&progress>0.8){ctx.strokeStyle='#54ff9c';ctx.lineWidth=3;ctx.stroke();}}
   else if(op.tool==='chamfer'||op.tool==='drill'){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x-(op.tool==='chamfer'?13:6),a.y-22);ctx.lineTo(a.x-5,a.y-46);ctx.lineTo(a.x+5,a.y-46);ctx.lineTo(a.x+(op.tool==='chamfer'?13:6),a.y-22);ctx.closePath();ctx.fill();ctx.stroke();}
   else{ctx.fillRect(a.x-7,a.y-46,14,46);for(let j=0;j<5;j++){ctx.beginPath();ctx.moveTo(a.x-7,a.y-40+j*8);ctx.lineTo(a.x+7,a.y-34+j*8);ctx.stroke();}}
   status.textContent=op.toolName+' · Riga '+op.line+' · Movimento '+(index+1)+'/'+ops.length+'\nX '+p.x.toFixed(3)+'  Y '+p.y.toFixed(3)+'  Z '+p.z.toFixed(3)+'\n'+op.raw+(op.pause?'\nM00: premere Avvia per proseguire.':'');
   seek.value=String((index+progress)/ops.length);
  }
  function loop(now){
   updateSimButtonState();
   const dt=last?Math.min(0.1,(now-last)/1000):0;last=now;
   if(!container.hidden&&playing&&ops.length){
    const op=ops[index];if(op.pause){playing=false;}else{
     progress+=dt*Number(speed.value)/Math.max(0.04,op.dwell||Math.min(1,Math.max(0.12,op.distance/200)));
     while(progress>=1&&playing){if(index===ops.length-1){progress=1;playing=false;break;}progress-=1;index++;if(ops[index].pause){progress=0;playing=false;}}
    }
   }
   if(!container.hidden)render();requestAnimationFrame(loop);
  }
  simBtn.onclick=()=>{try{const text=textarea.value;const next=parseISO(text);if(!next.length)throw Error('Nessun movimento ISO');const geom=stockGeometry(text,s.mode);ops=next;stock=geom;snapshot=text;index=0;progress=0;playing=true;textarea.hidden=true;container.hidden=false;container.querySelector('.sim-warning').textContent=ops.warnings.join(' ');resize();fit();render();}catch(error){playing=false;alert(error.message);}};
  container.addEventListener('click',e=>{const action=e.target.dataset.do;if(action==='close'){playing=false;container.hidden=true;textarea.hidden=false;}if(action==='play'){if(ops[index]?.pause&&index<ops.length-1){index++;progress=0;}playing=!playing;}if(action==='reset'){index=0;progress=0;playing=false;fit();}if(action==='top'){top=!top;fit();}if(action==='fit')fit();if(action==='follow')follow=!follow;if(action==='step'){playing=false;const line=ops[index]?.line;while(index<ops.length-1&&ops[index].line===line)index++;progress=index===ops.length-1?1:0;}render();});
  speed.oninput=()=>container.querySelector('.speed-label').textContent=speed.value+'×';
  seek.oninput=()=>{playing=false;const p=Number(seek.value)*ops.length;index=Math.min(ops.length-1,Math.floor(p));progress=index===ops.length-1&&Number(seek.value)===1?1:p-index;render();};
  const pointers=new Map();let prior=null;
  canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});prior=null;};
  canvas.onpointermove=e=>{if(!pointers.has(e.pointerId))return;const before=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});follow=false;if(pointers.size===1){panX+=e.clientX-before.x;panY+=e.clientY-before.y;}else{const a=[...pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(prior&&d>0)zoom=Math.max(0.0001,Math.min(200,zoom*d/prior));prior=d;}};
  const release=e=>{pointers.delete(e.pointerId);prior=null;};canvas.onpointerup=release;canvas.onpointercancel=release;
  canvas.addEventListener('wheel',e=>{e.preventDefault();follow=false;zoom=Math.max(0.0001,Math.min(200,zoom*Math.exp(-e.deltaY*0.001)));},{passive:false});
  window.addEventListener('resize',()=>{if(!container.hidden){resize();fit();}});updateSimButtonState();requestAnimationFrame(loop);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initSimulator);else initSimulator();
})(globalThis);
