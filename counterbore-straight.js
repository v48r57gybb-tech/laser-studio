(function(){
'use strict';
const $=id=>document.getElementById(id);
const N=v=>String(v??'').trim()===''?NaN:Number(String(v).replace(',','.'));
const D={enabled:false,diameter:9.5,toolDiameter:5,depth:5.4,tool:8,offset:8,rpm:2000,feed:120,entryFeed:60,radialStep:1,minResidual:2,coolant:'M8',confirmed:false};
const labels={diameter:'Diametro sede (mm)',toolDiameter:'Diametro fresa (mm)',depth:'Profondità positiva (mm)',tool:'Utensile T/H',offset:'Registro D sola usura',rpm:'Giri mandrino S',feed:'Avanzamento XY (mm/min)',entryFeed:'Avanzamento Z (mm/min)',radialStep:'Passo radiale (mm)',minResidual:'Fondo residuo minimo (mm)'};
const snapshots=new Map();
window.CncCounterboreIntegration={snapshots};
function init(){
 for(const m of [{mode:'straight',form:'form',fields:'fields',out:'output',status:'status',prefix:'cb',base:''},{mode:'arc',form:'arcForm',fields:'arcFields',out:'arcOutput',status:'arcStatus',prefix:'acb',base:'a'}])setup(m);
}
function setup(m){
 const form=$(m.form),out=$(m.out),status=$(m.status);if(!form||!out)return;
 const id=k=>m.prefix+'-'+k;
 const section=document.createElement('section');section.className='card';
 section.innerHTML='<h2>6 · Lamatura con fresa</h2><label><input type="checkbox" id="'+id('enabled')+'">Abilita lamatura</label><div class="grid">'+Object.entries(labels).map(([k,label])=>'<div class="field"><label for="'+id(k)+'">'+label+'</label><input type="text" inputmode="decimal" id="'+id(k)+'"></div>').join('')+'<div class="field"><label>Refrigerante</label><select id="'+id('coolant')+'"><option>M8</option><option>M18</option><option value="off">Spento</option></select></div></div><label><input type="checkbox" id="'+id('confirmed')+'">Confermo D effettivo zero: percorso centro fresa già compensato. Non inserire il raggio nominale nel registro D.</label><p>Anteprima nominale, non collaudo CNC. Usura diversa da zero non supportata.</p>';
 $(m.fields).append(section);
 const key='counterbore-'+m.mode;
 function read(){const p={};for(const k of Object.keys(D)){const el=$(id(k));p[k]=['enabled','confirmed'].includes(k)?el.checked:k==='coolant'?el.value:N(el.value);}return p;}
 function write(p){p={...D,...p};for(const k of Object.keys(D)){const el=$(id(k));if(['enabled','confirmed'].includes(k))el.checked=p[k]===true;else el.value=p[k];}}
 try{write(JSON.parse(localStorage.getItem(key)||'null')||D);}catch(e){write(D);}
 section.addEventListener('input',()=>{try{localStorage.setItem(key,JSON.stringify(read()));}catch(e){}snapshots.delete(m.mode);});
 form.addEventListener('submit',()=>{
  snapshots.delete(m.mode);const p=read();if(!p.enabled||!out.value.trim()||status.classList.contains('error'))return;
  try{
   if(!p.confirmed)throw Error('Confermare il registro D effettivo zero.');
   if(!window.CncSimulation)throw Error('Parser del programma non disponibile.');
   const base=out.value;const ops=CncSimulation.parseISO(base);
   const centers=[],seen=new Set();for(const o of ops){if(o.holeEnd&&o.tool==='drill'){const k=o.to.x.toFixed(4)+','+o.to.y.toFixed(4);if(!seen.has(k)){seen.add(k);centers.push({x:o.to.x,y:o.to.y});}}}
   const v=k=>$(m.base?m.base+k[0].toUpperCase()+k.slice(1):k)?.value;
   const config={...p,holeDiameter:v('drillMode')==='custom'?N(v('drillCustomDia')):v('drillMode')==='step1'?5.5:6.5,safeZ:N(v('safe')),toolChangeZ:N(v('safe')),compensation:'wear',effectiveWear:0,wearConfirmed:p.confirmed};
   let geometry={mode:m.mode,height:N(v('height')),width:N(v('width')),centers};
   if(m.mode==='straight')geometry.length=N(v('length'));
   else{
    const d=window.readArcData?.();if(!d)throw Error('Dati arco non disponibili.');
    if(d.aEdgeType!=='radial')throw Error('Lamatura disponibile solo con rifili radiali.');
    const match=(re)=>{const x=base.match(re);if(!x)throw Error('Metadati arco mancanti.');return N(x[1]);};
    const cx=match(/CENTRO CURVA X([+\-\d.]+)/),cy=match(/CENTRO CURVA X[^\n]* Y([+\-\d.]+)/);
    const R=match(/RAGGIO LINEA CENTRI FORI ([+\-\d.]+)/),sweep=match(/ANGOLO TOTALE ([+\-\d.]+)/)*Math.PI/180;
    if(centers.length<2)throw Error('Centri arco insufficienti.');
    const a=centers[0],b=centers[1],cross=(a.x-cx)*(b.y-cy)-(a.y-cy)*(b.x-cx);
    geometry={...geometry,edgeType:'radial',radius:R,cx,cy,startAngle:Math.atan2(-cy,-cx),sweep,direction:cross>=0?1:-1};
   }
   const plan=CncCounterboreCore.plan(config,geometry),lines=CncCounterboreCore.emit(config,geometry);
   const footer=base.lastIndexOf('\nG49');if(footer<0||!/^M30$/m.test(base.slice(footer)))throw Error('Fine programma non riconosciuto: generazione bloccata.');
   out.value=base.slice(0,footer)+'\n'+lines.join('\n')+base.slice(footer);
   snapshots.set(m.mode,{text:out.value,plan,geometry,lines});
   status.className='notice success';status.textContent='ISO generato con lamatura. Verificare prima dell’impiego CNC.';
   out.dispatchEvent(new Event('input'));
  }catch(e){out.value='';status.className='notice error';status.textContent='Lamatura: '+e.message;for(const x of m.mode==='arc'?['arcCopy','arcDownload']:['copy','download'])if($(x))$(x).disabled=true;}
 });
 $('btnSaveArchive')?.addEventListener('click',()=>{
  if(($('partType').value==='arc'?'arc':'straight')!==m.mode)return;
  try{const list=JSON.parse(localStorage.getItem('cnc-iso-archive')||'[]');if(list[0]?.type!==m.mode)return;list[0].counterbore=read();localStorage.setItem('cnc-iso-archive',JSON.stringify(list));}catch(e){alert('Parametri lamatura non salvati: '+e.message);}
 });
 $('archiveSection')?.addEventListener('click',e=>{const b=e.target.closest('[data-load]');if(!b)return;try{const item=JSON.parse(localStorage.getItem('cnc-iso-archive')||'[]')[Number(b.dataset.load)];if(item?.type===m.mode)write(item.counterbore||D);}catch(err){write(D);}},true);
}
function start(){
 if(window.CncCounterboreCore){init();return;}
 const s=document.createElement('script');s.src=new URL('counterbore-core.js',document.baseURI).href;s.onload=init;s.onerror=()=>{for(const id of ['status','arcStatus'])if($(id))$(id).textContent='Nucleo lamatura non caricato. Ricaricare la pagina; non usare ISO lamatura.';};document.head.append(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
