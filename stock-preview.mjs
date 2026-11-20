import {resolveGeometry} from './lib/stock-geometry-tools.mjs';
import {geometryFields,numericInput} from './lib/stock-ui-model.mjs';
export function mountStockPreview({form,getGeometry}){
 const panel=document.createElement('section');panel.className='card';panel.id='stockPreview';
 const heading=document.createElement('h2');heading.textContent='Il tuo pezzo · Vista 3D';
 const actions=document.createElement('div');actions.className='actions';
 const canvas=document.createElement('canvas');canvas.id='stockPreviewCanvas';canvas.setAttribute('aria-label','Vista geometrica tridimensionale del grezzo e del finito');canvas.style.cssText='display:block;width:100%;height:420px;border-radius:16px;background:#031627;touch-action:none';
 const status=document.createElement('p');status.id='stockPreviewStatus';status.setAttribute('role','status');
 const note=document.createElement('p');note.className='muted';note.textContent='Trascina per ruotare; usa la rotella o i pulsanti per lo zoom. Verde: finito. Ambra: grezzo. Anteprima geometrica, non simulazione di lavorazione o controllo collisioni.';
 panel.append(heading,actions,canvas,status,note);form.prepend(panel);
 const ctx=canvas.getContext('2d');let geometry=null,error='',az=-.7,el=.65,zoom=1,showStock=true,showFinished=true,w=1,h=1;
 const ids={width:'stWidth',depth:'stDepth',height:'stHeight',diameter:'stDiameter',innerDiameter:'stInner',thickness:'stThickness',points:'stPoints'};
 function control(text,fn){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;actions.append(b);return b;}
 control('Vue 3D',()=>{az=-.7;el=.65;zoom=1;draw();}).textContent='Vista 3D';
 control('Dall’alto',()=>{az=0;el=Math.PI/2;zoom=1;draw();});
 control('Frontale',()=>{az=0;el=.02;zoom=1;draw();});
 control('Zoom +',()=>{zoom=Math.min(8,zoom*1.2);draw();});control('Zoom −',()=>{zoom=Math.max(.2,zoom/1.2);draw();});
 for(const [label,key]of [['Mostra grezzo','stock'],['Mostra finito','finished']]){const l=document.createElement('label'),i=document.createElement('input');i.type='checkbox';i.checked=true;i.onchange=()=>{if(key==='stock')showStock=i.checked;else showFinished=i.checked;draw();};l.append(i,document.createTextNode(label));actions.append(l);}
 function read(){try{const g=structuredClone(getGeometry()),f={type:document.getElementById('stType').value};for(const key of geometryFields(f.type)){const raw=document.getElementById(ids[key]).value;if(key==='points'){try{f.points=JSON.parse(raw);}catch{throw Error('Vertici del profilo non validi');}}else f[key]=numericInput(raw,key);}g.finished=f;g.origin.xy=document.getElementById('stOrigin').value;for(const key of Object.keys(g.allowances))g.allowances[key]=numericInput(document.getElementById('st_'+key).value,key);geometry=resolveGeometry(g);error='';status.textContent=`Finito: ${geometry.finished.width} × ${geometry.finished.depth} × ${geometry.finished.height} mm · Z0 faccia superiore · Origine ${g.origin.xy==='center'?'centrale':'nello spigolo selezionato'}. Grezzo: ${geometry.stock.type==='box'?'blocco rettangolare':geometry.stock.type==='plate'?'piastra':geometry.stock.type}.`;panel.dataset.valid='true';}catch(e){geometry=null;error=e.message;status.textContent=error;panel.dataset.valid='false';}draw();}
 function raw(p){const ca=Math.cos(az),sa=Math.sin(az),ce=Math.cos(el),se=Math.sin(el),x=ca*p.x-sa*p.y,y=sa*p.x+ca*p.y;return{x,y:y*se-p.z*ce,depth:y*ce+p.z*se};}
 function outline(s){if(s.radius)return Array.from({length:96},(_,i)=>{const a=i*Math.PI/48;return{x:s.radius+s.radius*Math.cos(a),y:s.radius+s.radius*Math.sin(a)};});return s.points;}
 function rings(s,offset){const list=[outline(s)];if(s.innerRadius)list.push(Array.from({length:96},(_,i)=>{const a=-i*Math.PI/48;return{x:s.radius+s.innerRadius*Math.cos(a),y:s.radius+s.innerRadius*Math.sin(a)};}));return list.map(r=>r.map(p=>({x:p.x+offset.x,y:p.y+offset.y})));}
 function draw(){ctx.clearRect(0,0,w,h);const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#102d46');bg.addColorStop(1,'#020e1b');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);if(!geometry){ctx.fillStyle='#ffb8c6';ctx.font='15px system-ui';ctx.fillText(error?'Correggi le misure per aggiornare il pezzo':'Caricamento geometria',20,40);return;}
 const g=geometry,s=g.stock,sp=g.stockPlacement,ref=g.reference;
 const corners=[];for(const x of [sp.x,sp.x+s.width])for(const y of [sp.y,sp.y+s.depth])for(const z of [s.zMin,s.zMax])corners.push(raw({x:x-ref.x,y:y-ref.y,z}));
 const minX=Math.min(...corners.map(p=>p.x)),maxX=Math.max(...corners.map(p=>p.x)),minY=Math.min(...corners.map(p=>p.y)),maxY=Math.max(...corners.map(p=>p.y));
 const scale=Math.min((w-90)/Math.max(1,maxX-minX),(h-100)/Math.max(1,maxY-minY))*zoom,cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 const project=p=>{const q=raw({x:p.x-ref.x,y:p.y-ref.y,z:p.z});return{x:w/2+(q.x-cx)*scale,y:h/2+(q.y-cy)*scale,depth:q.depth};};
 function path(loops){ctx.beginPath();for(const loop of loops){loop.forEach((p,i)=>{const q=project(p);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});ctx.closePath();}}
 const faces=[];
 function addSolid(s,offset,color,alpha){const rs=rings(s,offset);for(const z of [s.zMin,s.zMax])faces.push({loops:rs.map(r=>r.map(p=>({...p,z}))),color,alpha,top:true});for(const ring of rs)ring.forEach((p,i)=>{const q=ring[(i+1)%ring.length];faces.push({loops:[[{...p,z:s.zMin},{...q,z:s.zMin},{...q,z:s.zMax},{...p,z:s.zMax}]],color,alpha,top:false});});}
 if(showFinished)addSolid(g.finished,{x:0,y:0},'#29b8ac',1);
 if(showStock)addSolid(g.stock,g.stockPlacement,'#ffb454',showFinished?.13:.85);
 for(const face of faces)face.depth=face.loops.flat().reduce((v,p)=>v+project(p).depth,0)/face.loops.flat().length;
 faces.sort((a,b)=>a.depth-b.depth);
 for(const face of faces){path(face.loops);ctx.globalAlpha=face.alpha;ctx.fillStyle=face.color;ctx.fill('evenodd');ctx.globalAlpha=face.alpha===1?.45:.5;ctx.lineWidth=.6;ctx.strokeStyle=face.alpha===1?'#a9fff1':'#ffc875';ctx.stroke();}ctx.globalAlpha=1;
 const origin=project({x:ref.x,y:ref.y,z:0}),len=Math.min(g.finished.width,g.finished.depth,g.finished.height)*.35;
 for(const [axis,color,p]of [['X','#ff8091',{x:ref.x+len,y:ref.y,z:0}],['Y','#86edaf',{x:ref.x,y:ref.y+len,z:0}],['Z','#89bfff',{x:ref.x,y:ref.y,z:len}]]){const q=project(p);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(origin.x,origin.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.fillStyle=color;ctx.font='bold 13px system-ui';ctx.fillText(axis,q.x+5,q.y-4);}ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(origin.x,origin.y,4,0,Math.PI*2);ctx.fill();ctx.font='12px system-ui';ctx.fillText('0',origin.x+6,origin.y+15);
 }
 function resize(){const rect=canvas.getBoundingClientRect();if(rect.width<1)return;w=rect.width;h=420;const dpr=Math.min(2,devicePixelRatio||1);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
 let pointer=null;canvas.onpointerdown=e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(pointer?.id!==e.pointerId)return;az+=(e.clientX-pointer.x)*.01;el=Math.max(.02,Math.min(Math.PI/2,(el+(e.clientY-pointer.y)*.01)));pointer={id:e.pointerId,x:e.clientX,y:e.clientY};draw();};const end=()=>pointer=null;canvas.onpointerup=end;canvas.onpointercancel=end;
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.2,Math.min(8,zoom*Math.exp(-e.deltaY*.001)));draw();},{passive:false});
 let scheduled=false;function update(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;read();});}form.addEventListener('input',update);form.addEventListener('change',update);form.addEventListener('click',update);new ResizeObserver(resize).observe(canvas);read();resize();
}
