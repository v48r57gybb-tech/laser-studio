(function(){
'use strict';
const KEY='counterbore-straight';
const DEFAULTS={enabled:false,diameter:9.5,toolDiameter:5,depth:5.4,tool:8,offset:8,rpm:2000,feed:120,entryFeed:60,coolant:'M8',radialStep:1,minResidual:2};
function $(id){return document.getElementById(id);}
function num(v){return v==null||String(v).trim()===''?NaN:Number(String(v).replace(',','.'));}
function holeDiameter(){
 const mode=$('drillMode').value;
 if(mode==='custom')return num($('drillCustomDia').value);
 if(mode==='step1')return 5.5;
 return 6.5;
}
function readParams(){
 return {enabled:$('cbEnabled').checked,diameter:num($('cbDiameter').value),toolDiameter:num($('cbToolDiameter').value),depth:num($('cbDepth').value),tool:num($('cbTool').value),offset:num($('cbOffset').value),rpm:num($('cbRpm').value),feed:num($('cbFeed').value),entryFeed:num($('cbEntryFeed').value),coolant:$('cbCoolant').value,radialStep:num($('cbRadialStep').value),minResidual:num($('cbMinResidual').value)};
}
function writeParams(p){
 $('cbEnabled').checked=p.enabled===true;$('cbDiameter').value=p.diameter;$('cbToolDiameter').value=p.toolDiameter;$('cbDepth').value=p.depth;$('cbTool').value=p.tool;$('cbOffset').value=p.offset;$('cbRpm').value=p.rpm;$('cbFeed').value=p.feed;$('cbEntryFeed').value=p.entryFeed;$('cbCoolant').value=p.coolant;$('cbRadialStep').value=p.radialStep;$('cbMinResidual').value=p.minResidual;
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(readParams()));}catch(e){}}
function field(id,label,tip){
 return '<div class="field" id="field-'+id+'"><label for="'+id+'">'+label+(tip?'<button class="info" type="button" data-cbtip="'+id+'" aria-label="Informazioni '+label+'">i</button>':'')+'</label>'+(tip?'<p class="tip" id="cbtip-'+id+'" hidden>'+tip+'</p>':'')+'<span class="err" id="err-'+id+'"></span></div>';
}
function init(){
 if(!$('fields')||!window.CncCounterboreCore)return;
 const section=document.createElement('section');
 section.className='card';section.id='counterboreSection';
 section.innerHTML='<h2>6 · Lamatura con fresa (Opzionale)</h2><div class="grid">'+
 '<div class="field"><label for="cbEnabled">Aggiungi lamatura dopo foratura</label><input id="cbEnabled" type="checkbox"></div>'+
 field('cbDiameter','Diametro sede lamatura (mm)','Diametro finale della sede eseguita con la fresa.')+
 field('cbToolDiameter','Diametro fresa lamatura (mm)','Diametro della fresa dedicata alla lamatura, da 3 a 8 mm.')+
 field('cbDepth','Profondità lamatura (mm)','Profondità della sede, divisa automaticamente in tre livelli.')+
 field('cbTool','Utensile fresa lamatura (T / H)','Numero torretta e correttore altezza della fresa lamatura.')+
 field('cbOffset','Correttore raggio D fresa lamatura','Correttore D usato solo per l’usura; la correzione effettiva nominale è zero.')+
 field('cbRpm','Giri fresa lamatura S (giri/min)','Rivoluzione della fresa lamatura.')+
 field('cbFeed','Avanzamento lamatura F (mm/min)','Avanzamento di lavoro della fresa lamatura.')+
 field('cbEntryFeed','Avanzamento discesa Z (mm/min)','Avanzamento di ingresso in profondità.')+
 '<div class="field"><label for="cbCoolant">Refrigerante</label><select id="cbCoolant"><option value="M8">Acqua esterna (M8)</option><option value="M18">Acqua interna (M18)</option><option value="off">Senza refrigerante</option></select></div>'+
 field('cbRadialStep','Passo radiale (mm)','Passo radiale massimo pari a metà diametro fresa.')+
 field('cbMinResidual','Fondo residuo minimo (mm)','Spessore minimo che deve rimanere sotto la lamatura.')+
 '</div>';
 $('fields').appendChild(section);
 let params={...DEFAULTS};
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved)params={...DEFAULTS,...saved};}catch(e){}
 writeParams(params);
 section.addEventListener('click',e=>{const b=e.target.closest('[data-cbtip]');if(!b)return;e.preventDefault();const t=$('cbtip-'+b.dataset.cbtip);if(t)t.hidden=!t.hidden;});
 section.addEventListener('input',save);section.addEventListener('change',save);
 let planned=null;
 $('form').addEventListener('submit',e=>{
  planned=null;if(!$('cbEnabled').checked)return;
  const p=readParams();const hole=holeDiameter();
  const config={...p,holeDiameter:hole,safeZ:num($('safe').value),toolChangeZ:num($('safe').value),compensation:'wear',effectiveWear:0,wearConfirmed:true};
  const count=num($('count').value),pitch=num($('pitch').value),left=num($('left').value);
  const centers=Array.from({length:count},(_,i)=>[left+i*pitch,0]);
  const geometry={mode:'straight',height:num($('height').value),width:num($('width').value),length:num($('length').value),centers};
  try{CncCounterboreCore.plan(config,geometry);planned={config,geometry};}
  catch(err){e.preventDefault();e.stopPropagation();$('status').className='notice error';$('status').textContent=err.message;}
 },true);
 $('form').addEventListener('submit',()=>{
  if(!planned)return;
  try{const lines=CncCounterboreCore.emit(planned.config,planned.geometry);$('output').value+='\n'+lines.join('\n');$('status').textContent='Dati coerenti · Programma ISO dritto generato con lamatura.';}
  catch(err){$('output').value='';$('status').className='notice error';$('status').textContent=err.message;}
  planned=null;
 });
 $('btnSaveArchive').addEventListener('click',()=>{const name=$('progName').value.trim();if(!name)return;try{localStorage.setItem('counterbore-archive-'+name,JSON.stringify(readParams()));}catch(e){}});
 $('archiveSection').addEventListener('click',e=>{
  const load=e.target.closest('[data-load]');if(!load)return;
  const item=JSON.parse(localStorage.getItem('cnc-iso-archive')||'[]')[Number(load.dataset.load)];
  if(!item||item.type!=='straight')return;
  try{const saved=JSON.parse(localStorage.getItem('counterbore-archive-'+item.name)||'null');if(saved)writeParams({...DEFAULTS,...saved});}catch(err){}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
