(function(){
'use strict';
const KEY='counterbore-arc';
const DEFAULTS={enabled:false,diameter:9.5,toolDiameter:5,depth:5.4,tool:8,offset:8,rpm:2000,feed:120,entryFeed:60,coolant:'M8',radialStep:1,minResidual:2};
function $(id){return document.getElementById(id);}
function num(v){return v==null||String(v).trim()===''?NaN:Number(String(v).replace(',','.'));}
function rad(d){return Number(d)*Math.PI/180;}
function holeRadius(d){if(d.aRadiusMode==='center')return num(d.aRadius);if(d.aRadiusMode==='inner')return num(d.aRadius)+num(d.aOffset);return num(d.aRadius)-num(d.aOffset);}
function angleFromDistance(mode,value,R){const v=num(value);if(mode==='angle')return rad(v);if(mode==='arc')return v/R;const s=v/(2*R);if(s<=-1||s>=1)return NaN;return 2*Math.asin(s);}
function calcGeometry(d){
 const R=holeRadius(d);if(!(R>0))return null;
 const t0=rad(d.aTangent),tx0=Math.cos(t0),ty0=Math.sin(t0);
 const isLeft=d.aCurve==='left';
 const nx0=isLeft?-ty0:ty0,ny0=isLeft?tx0:-tx0;
 const cx=R*nx0,cy=R*ny0;
 const a0=angleFromDistance(d.aLeftMode,d.aLeftValue,R);if(!Number.isFinite(a0)||a0<0)return null;
 const holeAngles=[a0];
 for(let i=1;i<num(d.aCount);i++){const rule=(d.aRules||[]).find(r=>Number(r.from)===i);const c=rule?num(rule.chord):num(d.aStandardChord);const da=angleFromDistance('chord',c,R);if(!Number.isFinite(da))return null;holeAngles.push(holeAngles[i-1]+da);}
 const aEnd=angleFromDistance(d.aRightMode,d.aRightValue,R);if(!Number.isFinite(aEnd)||aEnd<0)return null;
 const total=holeAngles[holeAngles.length-1]+aEnd;
 function pt(th){const c=Math.cos(th),s=Math.sin(th);return isLeft?[cx-R*nx0*c+R*tx0*s,cy-R*ny0*c+R*ty0*s]:[cx-R*nx0*c-R*tx0*s,cy-R*ny0*c-R*ty0*s];}
 return {R,cx,cy,start:0,sweep:total,direction:isLeft?1:-1,centers:holeAngles.map(pt)};
}
function readParams(){return {enabled:$('acbEnabled').checked,diameter:num($('acbDiameter').value),toolDiameter:num($('acbToolDiameter').value),depth:num($('acbDepth').value),tool:num($('acbTool').value),offset:num($('acbOffset').value),rpm:num($('acbRpm').value),feed:num($('acbFeed').value),entryFeed:num($('acbEntryFeed').value),coolant:$('acbCoolant').value,radialStep:num($('acbRadialStep').value),minResidual:num($('acbMinResidual').value)};}
function writeParams(p){$('acbEnabled').checked=p.enabled===true;$('acbDiameter').value=p.diameter;$('acbToolDiameter').value=p.toolDiameter;$('acbDepth').value=p.depth;$('acbTool').value=p.tool;$('acbOffset').value=p.offset;$('acbRpm').value=p.rpm;$('acbFeed').value=p.feed;$('acbEntryFeed').value=p.entryFeed;$('acbCoolant').value=p.coolant;$('acbRadialStep').value=p.radialStep;$('acbMinResidual').value=p.minResidual;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(readParams()));}catch(e){}}
function field(id,label,tip){return '<div class="field" id="field-'+id+'"><label for="'+id+'">'+label+(tip?'<button class="info" type="button" data-acbtip="'+id+'">i</button>':'')+'</label>'+(tip?'<p class="tip" id="acbtip-'+id+'" hidden>'+tip+'</p>':'')+'<span class="err" id="err-'+id+'"></span></div>';}
function init(){
 if(!$('arcFields')||!window.CncCounterboreCore)return;
 const section=document.createElement('section');section.className='card';section.id='counterboreArcSection';
 section.innerHTML='<h2>6 · Lamatura con fresa (Opzionale)</h2><div class="grid">'+
 '<div class="field"><label for="acbEnabled">Aggiungi lamatura dopo foratura</label><input id="acbEnabled" type="checkbox"></div>'+
 field('acbDiameter','Diametro sede lamatura (mm)','Diametro finale della sede eseguita con la fresa.')+
 field('acbToolDiameter','Diametro fresa lamatura (mm)','Diametro della fresa dedicata alla lamatura, da 3 a 8 mm.')+
 field('acbDepth','Profondità lamatura (mm)','Profondità della sede, divisa automaticamente in tre livelli.')+
 field('acbTool','Utensile fresa lamatura (T / H)','Numero torretta e correttore altezza della fresa lamatura.')+
 field('acbOffset','Correttore raggio D fresa lamatura','Correttore D usato solo per l’usura; correzione effettiva nominale zero.')+
 field('acbRpm','Giri fresa lamatura S (giri/min)','Rivoluzione della fresa lamatura.')+
 field('acbFeed','Avanzamento lamatura F (mm/min)','Avanzamento di lavoro della fresa lamatura.')+
 field('acbEntryFeed','Avanzamento discesa Z (mm/min)','Avanzamento di ingresso in profondità.')+
 '<div class="field"><label for="acbCoolant">Refrigerante</label><select id="acbCoolant"><option value="M8">Acqua esterna (M8)</option><option value="M18">Acqua interna (M18)</option><option value="off">Senza refrigerante</option></select></div>'+
 field('acbRadialStep','Passo radiale (mm)','Passo radiale massimo pari a metà diametro fresa.')+
 field('acbMinResidual','Fondo residuo minimo (mm)','Spessore minimo sotto la lamatura.')+
 '</div>';
 $('arcFields').appendChild(section);
 let params={...DEFAULTS};try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved)params={...DEFAULTS,...saved};}catch(e){}
 writeParams(params);
 section.addEventListener('click',e=>{const b=e.target.closest('[data-acbtip]');if(!b)return;e.preventDefault();const t=$('acbtip-'+b.dataset.acbtip);if(t)t.hidden=!t.hidden;});
 section.addEventListener('input',save);section.addEventListener('change',save);
 let planned=null;
 function arcData(){return {aRadiusMode:$('aRadiusMode').value,aRadius:$('aRadius').value,aOffset:$('aOffset').value,aCount:$('aCount').value,aStandardChord:$('aStandardChord').value,aLeftMode:$('aLeftMode').value,aLeftValue:$('aLeftValue').value,aRightMode:$('aRightMode').value,aRightValue:$('aRightValue').value,aWidth:$('aWidth').value,aHeight:$('aHeight').value,aTangent:$('aTangent').value,aCurve:$('aCurve').value,aRules:window.arcRules||[]};}
 $('arcForm').addEventListener('submit',e=>{
  planned=null;if(!$('acbEnabled').checked)return;
  const d=arcData();const g=calcGeometry(d);if(!g){e.preventDefault();e.stopPropagation();$('arcStatus').className='notice error';$('arcStatus').textContent='Geometria arco non valida per la lamatura.';return;}
  const config={...readParams(),holeDiameter:6.8,safeZ:num($('aSafe').value),toolChangeZ:num($('aSafe').value),compensation:'wear',effectiveWear:0,wearConfirmed:true};
  const geometry={mode:'arc',edgeType:'radial',height:num($('aHeight').value),width:num($('aWidth').value),radius:g.R,cx:g.cx,cy:g.cy,startAngle:g.start,sweep:g.sweep,direction:g.direction,centers:g.centers};
  try{CncCounterboreCore.plan(config,geometry);planned={config,geometry};}catch(err){e.preventDefault();e.stopPropagation();$('arcStatus').className='notice error';$('arcStatus').textContent=err.message;}
 },true);
 $('arcForm').addEventListener('submit',()=>{
  if(!planned)return;
  try{const lines=CncCounterboreCore.emit(planned.config,planned.geometry);$('arcOutput').value+='\n'+lines.join('\n');$('arcStatus').textContent='Dati coerenti · Programma ISO arco generato con lamatura.';}catch(err){$('arcOutput').value='';$('arcStatus').className='notice error';$('arcStatus').textContent=err.message;}
  planned=null;
 });
 $('btnSaveArchive').addEventListener('click',()=>{const name=$('progName').value.trim();if(!name)return;try{localStorage.setItem('counterbore-archive-'+name,JSON.stringify(readParams()));}catch(e){}});
 $('archiveSection').addEventListener('click',e=>{const load=e.target.closest('[data-load]');if(!load)return;const item=JSON.parse(localStorage.getItem('cnc-iso-archive')||'[]')[Number(load.dataset.load)];if(!item||item.type!=='arc')return;try{const saved=JSON.parse(localStorage.getItem('counterbore-archive-'+item.name)||'null');if(saved)writeParams({...DEFAULTS,...saved});}catch(err){}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
