(function(root){
'use strict';
const f=n=>{if(!Number.isFinite(Number(n)))throw Error('Numero ISO non valido');return Number(Number(n).toFixed(4)).toString()+ (Number.isInteger(Number(Number(n).toFixed(4)))?'.':'');};
function emitRadius(p){
 const a=['(CB-BEGIN R'+f(p.tool/2)+')','(LAMATURA - D CONTIENE IL RAGGIO NOMINALE '+f(p.tool/2)+' MM)','G90 G94 G17 G40 G80','T'+p.station+' M6 (FRESA LAMATURA D'+f(p.tool)+')','G0 G43 H'+p.station+' Z'+f(p.change),'S'+f(p.rpm)+' M3',p.coolant==='off'?'M9':p.coolant];
 const R=p.tool/2,L=R+1;
 for(const c of p.centers)for(const z of p.levels)for(const r of p.radii){
  const q=Number((r+R).toFixed(4));
  a.push('(LIVELLO Z'+f(z)+' - RAGGIO PROFILO '+f(q)+')','G0 Z'+f(p.safe),'G0 X'+f(c.x+q)+' Y'+f(c.y-L),'G1 G41 D'+p.offset+' X'+f(c.x+q)+' Y'+f(c.y)+' F'+f(p.feed),'G1 Z'+f(z)+' F'+f(p.entryFeed),'G3 X'+f(c.x-q)+' Y'+f(c.y)+' I'+f(-q)+' J0. F'+f(p.feed),'G3 X'+f(c.x+q)+' Y'+f(c.y)+' I'+f(q)+' J0. F'+f(p.feed),'G0 Z'+f(p.safe),'G1 G40 X'+f(c.x+q)+' Y'+f(c.y+L)+' F'+f(p.feed));
 }
 a.push('G0 Z'+f(p.change),'M9','M5','M1','(CB-END)');return a;
}
root.CncLamaturaV3={emitRadius};
if(typeof document==='undefined')return;
const $=id=>document.getElementById(id),N=v=>String(v??'').trim()===''?NaN:Number(String(v).replace(',','.'));
const D={enabled:false,diameter:9.5,toolDiameter:5,depthChoice:'-5.4',customZ:-5.4,tool:8,rpm:5000,feed:500,entryFeed:60,radialStep:1,minResidual:2,coolant:'M8'};
const snapshots=new Map();root.CncCounterboreIntegration={snapshots};
const choices=(list,value)=>list.map(v=>'<option value="'+v+'"'+(String(value)===String(v)?' selected':'')+'>'+v+'</option>').join('');
function setup(m){
 const form=$(m.form),out=$(m.out),status=$(m.status);if(!form||!out)return;
 const id=k=>m.prefix+'-'+k,key='counterbore-v3-'+m.mode;
 const section=document.createElement('section');section.className='card';
 const input=(k,label,value)=>'<div class="field"><label for="'+id(k)+'">'+label+'</label><input id="'+id(k)+'" inputmode="decimal" value="'+value+'"></div>';
 section.innerHTML='<h2>6 · Lamatura (Opzionale)</h2><label><input type="checkbox" id="'+id('enabled')+'">Aggiungi lamatura dopo la foratura</label><div id="'+id('details')+'" hidden><div class="grid"><div class="field"><label for="'+id('tool')+'">Utensile T / H / D</label><select id="'+id('tool')+'">'+Array.from({length:28},(_,i)=>'<option value="'+(i+1)+'">T'+(i+1)+' / H'+(i+1)+' / D'+(i+1)+'</option>').join('')+'</select></div><div class="field"><label for="'+id('toolDiameter')+'">Diametro fresa (mm)</label><select id="'+id('toolDiameter')+'">'+choices([3,4,5,6,7,8],5)+'</select></div>'+input('diameter','Diametro sede (mm)',9.5)+'<div class="field"><label for="'+id('depthChoice')+'">Z finale lamatura (mm)</label><select id="'+id('depthChoice')+'"><option value="-5.4">Z−5,4</option><option value="-6.4">Z−6,4</option><option value="custom">Personalizzata</option></select></div><div id="'+id('customBox')+'">'+input('customZ','Z personalizzata negativa (mm)',-5.4)+'</div>'+input('rpm','Giri S',5000)+input('feed','Avanzamento XY F (mm/min)',500)+input('entryFeed','Avanzamento Z (mm/min)',60)+input('radialStep','Passo radiale massimo (mm)',1)+input('minResidual','Fondo residuo minimo (mm)',2)+'<div class="field"><label for="'+id('coolant')+'">Refrigerante</label><select id="'+id('coolant')+'"><option>M8</option><option>M18</option><option value="off">Spento</option></select></div></div><p id="'+id('help')+'"></p><p>Fresa adatta all’affondo assiale: ogni anello viene raggiunto a Z di sicurezza, poi lavorato su tre livelli. S5000/F500 sono valori iniziali modificabili, non raccomandazioni di taglio. Verificare ingresso e compensazione sul controllo CNC.</p></div>';
 $(m.fields).append(section);
 function sync(){$(id('details')).hidden=!$(id('enabled')).checked;$(id('customBox')).hidden=$(id('depthChoice')).value!=='custom';$(id('help')).textContent='T'+$(id('tool')).value+' / H'+$(id('tool')).value+' / D'+$(id('tool')).value+': inserire nel registro D il raggio nominale '+f(N($(id('toolDiameter')).value)/2)+' mm. Non D zero.';}
 function read(){const p={};for(const k of Object.keys(D)){const el=$(id(k));p[k]=k==='enabled'?el.checked:['depthChoice','coolant'].includes(k)?el.value:N(el.value);}return p;}
 function write(p){p={...D,...p};for(const k of Object.keys(D)){const el=$(id(k));if(k==='enabled')el.checked=p[k]===true;else el.value=p[k];}sync();}
 try{write(JSON.parse(localStorage.getItem(key)||'null')||D);}catch(e){write(D);}
 section.addEventListener('input',()=>{sync();snapshots.delete(m.mode);try{localStorage.setItem(key,JSON.stringify(read()));}catch(e){}});section.addEventListener('change',sync);
 form.addEventListener('submit',()=>{
  snapshots.delete(m.mode);const p=read();if(!p.enabled||!out.value.trim()||status.classList.contains('error'))return;
  try{
   const base=out.value,ops=root.CncSimulation.parseISO(base),centers=[],seen=new Set();for(const o of ops)if(o.holeEnd&&o.tool==='drill'){const k=o.to.x.toFixed(4)+','+o.to.y.toFixed(4);if(!seen.has(k)){seen.add(k);centers.push({x:o.to.x,y:o.to.y});}}
   const v=k=>$(m.mode==='arc'?'a'+k[0].toUpperCase()+k.slice(1):k)?.value;
   const z=p.depthChoice==='custom'?p.customZ:N(p.depthChoice);if(!Number.isFinite(z)||z>=0)throw Error('La Z finale deve essere negativa.');
   const config={...p,depth:-z,offset:p.tool,holeDiameter:v('drillMode')==='custom'?N(v('drillCustomDia')):v('drillMode')==='step1'?5.5:6.5,safeZ:N(v('safe')),toolChangeZ:N(v('safe')),compensation:'wear',effectiveWear:0,wearConfirmed:true};
   let geometry={mode:m.mode,height:N(v('height')),width:N(v('width')),centers};
   if(m.mode==='straight')geometry.length=N(v('length'));
   else{const d=root.readArcData?.();if(!d||d.aEdgeType!=='radial')throw Error('Per la lamatura arco selezionare rifili radiali.');const get=re=>{const a=base.match(re);if(!a)throw Error('Metadati arco assenti');return N(a[1]);};const cx=get(/CENTRO CURVA X([+\-\d.]+)/),cy=get(/CENTRO CURVA X[^\n]* Y([+\-\d.]+)/);if(centers.length<2)throw Error('Centri arco insufficienti');const [a,b]=centers;geometry={...geometry,edgeType:'radial',radius:get(/RAGGIO LINEA CENTRI FORI ([+\-\d.]+)/),cx,cy,startAngle:Math.atan2(-cy,-cx),sweep:get(/ANGOLO TOTALE ([+\-\d.]+)/)*Math.PI/180,direction:(a.x-cx)*(b.y-cy)-(a.y-cy)*(b.x-cx)>=0?1:-1};}
   const plan=root.CncCounterboreCore.plan(config,geometry),lines=emitRadius(plan);
   const re=/\nT\d+ M6 \((?:SVASATORE|MASCHIO)[^\n]*\)/;const match=re.exec(base),footer=base.lastIndexOf('\nG49'),at=match?match.index:footer;if(at<0||!/^M30$/m.test(base.slice(at)))throw Error('Fine programma non riconosciuto');
   out.value=base.slice(0,at)+'\n'+lines.join('\n')+base.slice(at);snapshots.set(m.mode,{text:out.value,plan,geometry,lines});status.className='notice success';status.textContent='Programma unico con lamatura e D a raggio nominale. Verificare prima dell’impiego CNC.';out.dispatchEvent(new Event('input'));
  }catch(e){out.value='';status.className='notice error';status.textContent='Lamatura: '+e.message;for(const id of m.mode==='arc'?['arcCopy','arcDownload']:['copy','download'])if($(id))$(id).disabled=true;}
 });
 let pendingName='';$('btnSaveArchive')?.addEventListener('click',()=>{pendingName=$('progName').value.trim();},true);
 $('btnSaveArchive')?.addEventListener('click',()=>{if(!pendingName||($('partType').value==='arc'?'arc':'straight')!==m.mode)return;try{const a=JSON.parse(localStorage.getItem('cnc-iso-archive')||'[]');if(a[0]?.name===pendingName&&a[0].type===m.mode){a[0].counterboreV3=read();localStorage.setItem('cnc-iso-archive',JSON.stringify(a));}}catch(e){alert('Salvataggio lamatura fallito');}});
 $('archiveSection')?.addEventListener('click',e=>{const b=e.target.closest('[data-load]');if(!b)return;try{const item=JSON.parse(localStorage.getItem('cnc-iso-archive')||'[]')[Number(b.dataset.load)];if(item?.type===m.mode)write(item.counterboreV3||D);}catch(e){write(D);}},true);
}
function start(){const init=()=>{for(const m of [{mode:'straight',form:'form',fields:'fields',out:'output',status:'status',prefix:'cb'},{mode:'arc',form:'arcForm',fields:'arcFields',out:'arcOutput',status:'arcStatus',prefix:'acb'}])setup(m);};if(root.CncCounterboreCore)init();else{const s=document.createElement('script');s.src=new URL('counterbore-core.js',document.baseURI).href;s.onload=init;s.onerror=()=>alert('Nucleo lamatura non disponibile');document.head.append(s);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})(globalThis);
