import {createProject,validateProject,exportProject,importProject,prepare,createArchive} from './lib/stock-workspace.mjs';
import {generateProgram} from './lib/stock-program.mjs';

const $=id=>document.getElementById(id);
let project=createProject(),archive=null,revision=0;

const OP_FIELDS={
 probe:[['axes','Assi (X,Y,Z)','text'],['xyMethod','Strategia XY','select',['surfaces','midpoint']],['clearance','Margine sfera','number'],['expectedError','Errore atteso','number'],['overtravel','Q ricerca','number'],['positionFeed','F protetto','number'],['topPointX','Punto Z X','number'],['topPointY','Punto Z Y','number'],['sideTipZ','Z laterale punta','number'],['xSide','Lato X','select',['min','max']],['ySide','Lato Y','select',['min','max']],['macroProfileConfirmed','Profilo macro confermato','bool'],['calibrationConfirmed','Calibrazione confermata','bool'],['provisionalOriginConfirmed','Origine provvisoria confermata','bool'],['ballBottomReferenceConfirmed','Riferimento punta sfera confermato','bool']],
 facing:[['stepOver','Passo laterale','number']],
 roughing:[['depth','Profondita','number'],['radialStep','Impegno laterale','number']],
 finishing:[['depth','Profondita','number']],
 chamfer:[['width','Larghezza smusso','number']],
 drilling:[['pattern','Schema','select',['single','line','grid','circle']],['x','X','number'],['y','Y','number'],['count','Numero','number'],['pitch','Interasse','number'],['angle','Angolo','number'],['rows','Righe','number'],['columns','Colonne','number'],['pitchX','Passo X','number'],['pitchY','Passo Y','number'],['circleDiameter','Diametro cerchio','number'],['depth','Profondita','number'],['depthReference','Riferimento','select',['tip']],['mode','Modo','select',['blind','through']],['rPlane','Piano R','number'],['cycle','Ciclo','select',['G81','G83','G73']],['q','Q','number'],['breakthroughConfirmed','Passante confermato','bool']],
 pocket:[['shape','Forma','select',['obround','rounded-rectangle']],['x','Centro X','number'],['y','Centro Y','number'],['length','Lunghezza','number'],['width','Larghezza','number'],['radius','Raggio','number'],['angle','Angolo','number'],['depth','Profondita','number'],['stepZ','Passo Z','number'],['stepOver','Passo laterale','number'],['entry','Ingresso','select',['ramp','predrill']],['rampAngle','Angolo rampa','number'],['finishLeadMargin','Margine finitura','number'],['finish','Finitura','bool']]
};

const DEFAULTS={
 probe:()=>({axes:['Z','X','Y'],xyMethod:'surfaces',clearance:5,expectedError:0.5,overtravel:2,positionFeed:1000,topPoint:{x:0,y:0},sideTipZ:-5,xSide:'min',ySide:'max',macroProfileConfirmed:false,calibrationConfirmed:false,provisionalOriginConfirmed:false,ballBottomReferenceConfirmed:false}),
 facing:()=>({stepOver:20}),
 roughing:()=>({depth:5,radialStep:3}),
 finishing:()=>({depth:5}),
 chamfer:()=>({width:1}),
 drilling:()=>({pattern:'single',x:10,y:10,count:1,pitch:10,angle:0,rows:1,columns:1,pitchX:10,pitchY:10,circleDiameter:20,depth:10,depthReference:'tip',mode:'blind',rPlane:2,cycle:'G81',q:1,breakthroughConfirmed:false}),
 pocket:()=>({shape:'obround',x:25,y:15,length:40,width:16,radius:8,angle:0,depth:5,stepZ:2,stepOver:5,entry:'ramp',rampAngle:5,finishLeadMargin:1.5,finish:false})
};

function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function bool(v){return v===true||v==='true';}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function status(msg,err){const s=$('stStatus');s.className='notice'+(err?' error':' success');s.textContent=msg;}

function readProject(){
 const g=project.geometry,f=g.finished;
 f.type=$('stType').value;
 if(['box','plate'].includes(f.type)){f.width=num($('stWidth').value);f.depth=num($('stDepth').value);}
 if(f.type!=='custom')f.height=num($('stHeight').value);
 if(['cylinder','tube'].includes(f.type)){f.diameter=num($('stDiameter').value);if(f.type==='tube')f.innerDiameter=num($('stInner').value);}
 if(['L','U','T'].includes(f.type))f.thickness=num($('stThickness').value);
 if(f.type==='custom'){try{f.points=JSON.parse($('stPoints').value);}catch(e){}}
 g.origin.xy=$('stOrigin').value;
 for(const k of ['xMinus','xPlus','yMinus','yPlus','zMinus','zPlus'])g.allowances[k]=num($('st_'+k).value);
 project.setup={safeZ:num($('stSafeZ').value),changeZ:num($('stChangeZ').value),externalMargin:num($('stMargin').value),topFacedConfirmed:bool($('stTopFaced').value),externalFinishedConfirmed:bool($('stExtFinished').value),finishStockConfirmed:bool($('stFinishStock').value)};
 return project;
}

function fillStatic(){
 const g=project.geometry,f=g.finished;
 $('stType').value=f.type;$('stOrigin').value=g.origin.xy;
 $('stWidth').value=f.width??'';$('stDepth').value=f.depth??'';$('stHeight').value=f.height??'';
 $('stDiameter').value=f.diameter??'';$('stInner').value=f.innerDiameter??'';$('stThickness').value=f.thickness??'';
 $('stPoints').value=f.points?JSON.stringify(f.points):'[]';
 for(const k of ['xMinus','xPlus','yMinus','yPlus','zMinus','zPlus'])$('st_'+k).value=g.allowances[k];
 const s=project.setup||{};$('stSafeZ').value=s.safeZ??'';$('stChangeZ').value=s.changeZ??'';$('stMargin').value=s.externalMargin??'';
 $('stTopFaced').checked=!!s.topFacedConfirmed;$('stExtFinished').checked=!!s.externalFinishedConfirmed;$('stFinishStock').checked=!!s.finishStockConfirmed;
}

function renderTools(){
 $('stTools').innerHTML=project.tools.map(t=>{
  const extra=[];
  if(t.kind==='mill')extra.push(`<label><input type="checkbox" data-tk="centerCutting" ${t.centerCutting?'checked':''}> centro tagliente</label><input type="number" data-tk="maxRampAngle" placeholder="Angolo rampa" value="${t.maxRampAngle??''}">`);
  if(t.kind==='chamfer')extra.push(`<input type="number" data-tk="angle" placeholder="Angolo" value="${t.angle??''}"><input type="number" data-tk="tipDiameter" placeholder="Punta" value="${t.tipDiameter??''}"><input type="number" data-tk="fluteLength" placeholder="Tagliente" value="${t.fluteLength??''}">`);
  if(t.kind==='drill')extra.push(`<input type="number" data-tk="tipAngle" placeholder="Angolo punta" value="${t.tipAngle??''}"><input type="number" data-tk="fluteLength" placeholder="Tagliente" value="${t.fluteLength??''}">`);
  return `<div class="rule" data-tool="${t.id}"><span>T${t.station} ${esc(t.kind)} ${t.diameter}</span><label><input type="checkbox" data-tk="loaded" ${t.loaded?'checked':''}> caricato</label><input type="number" data-tk="rpm" placeholder="S" value="${t.parameters.rpm??''}"><input type="number" data-tk="feed" placeholder="F" value="${t.parameters.feed??''}"><input type="number" data-tk="entryFeed" placeholder="Fz" value="${t.parameters.entryFeed??''}"><select data-tk="coolant">${['off','M8','M18'].map(c=>`<option value="${c}" ${t.parameters.coolant===c?'selected':''}>${c}</option>`).join('')}</select>${extra.join('')}</div>`;
 }).join('');
}

function defaultParams(type){return JSON.parse(JSON.stringify(DEFAULTS[type]()));}

function addOp(){
 const type=$('stOpType').value;
 project.operations.push({id:'op-'+Date.now(),type,enabled:true,toolId:type==='probe'?'tool-28':type==='pocket'?'tool-4':'tool-1',parameters:defaultParams(type)});
 renderOps();
}

function renderOps(){
 $('stOps').innerHTML=project.operations.map((op,i)=>{
  const fields=OP_FIELDS[op.type].map(([k,label,kind,options])=>{
   let val=op.parameters[k];
   if(op.type==='probe'&&k==='axes')val=(op.parameters.axes||[]).join(',');
   if(op.type==='probe'&&k==='topPointX')val=op.parameters.topPoint?.x??'';
   if(op.type==='probe'&&k==='topPointY')val=op.parameters.topPoint?.y??'';
   if(kind==='select')return `<div class="field"><label>${label}</label><select data-op="${i}" data-k="${k}">${options.map(o=>`<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join('')}</select></div>`;
   if(kind==='bool')return `<div class="field"><label><input type="checkbox" data-op="${i}" data-k="${k}" ${val?'checked':''}> ${label}</label></div>`;
   return `<div class="field"><label>${label}</label><input type="${kind==='number'?'number':'text'}" data-op="${i}" data-k="${k}" value="${val??''}"></div>`;
  }).join('');
  return `<div class="card" data-opcard="${i}"><h4>${op.type} · ${op.enabled?'attiva':'disattiva'}</h4><div class="grid">${fields}</div><div class="actions"><label>Utensile <select data-op="${i}" data-k="toolId">${project.tools.map(t=>`<option value="${t.id}" ${op.toolId===t.id?'selected':''}>T${t.station} ${t.kind} ${t.diameter}</option>`).join('')}</select></label><label><input type="checkbox" data-op="${i}" data-k="enabled" ${op.enabled?'checked':''}> attiva</label><button type="button" data-delop="${i}">Elimina</button></div></div>`;
 }).join('');
}

function readOps(){
 project.operations.forEach((op,i)=>{
  const card=document.querySelector(`[data-opcard="${i}"]`);if(!card)return;
  op.enabled=card.querySelector('[data-k="enabled"]').checked;
  op.toolId=card.querySelector('[data-k="toolId"]').value;
  OP_FIELDS[op.type].forEach(([k,,kind])=>{
   const inp=card.querySelector(`[data-k="${k}"]`);if(!inp)return;
   const raw=kind==='bool'?inp.checked:inp.value;
   if(op.type==='probe'){
    if(k==='axes')op.parameters.axes=String(raw).split(',').map(s=>s.trim()).filter(Boolean);
    else if(k==='topPointX')op.parameters.topPoint={...op.parameters.topPoint,x:num(raw)};
    else if(k==='topPointY')op.parameters.topPoint={...op.parameters.topPoint,y:num(raw)};
    else if(kind==='number')op.parameters[k]=num(raw);
    else if(kind==='bool')op.parameters[k]=bool(raw);
    else op.parameters[k]=raw;
   }else{
    if(kind==='number')op.parameters[k]=num(raw);
    else if(kind==='bool')op.parameters[k]=bool(raw);
    else op.parameters[k]=raw;
   }
  });
 });
}

function save(){
 readProject();readOps();
 const id=$('stRecordId').value.trim();
 if(!id){status('Inserisci un ID progetto',true);return;}
 const a=archive.read();revision=a.revision;
 try{archive.save(project,{recordId:id,expectedRevision:revision});revision++;status('Progetto salvato');}catch(e){status(e.message,true);}
}

function load(){
 const id=$('stRecordId').value.trim();const a=archive.read();revision=a.revision;
 const item=a.items.find(i=>i.id===id);
 if(!item){status('Progetto non trovato',true);return;}
 project=item.project;fillStatic();renderTools();renderOps();status('Progetto caricato');
}

function remove(){
 const id=$('stRecordId').value.trim();const a=archive.read();revision=a.revision;
 try{archive.remove(id,{expectedRevision:revision,confirmed:true});revision++;status('Progetto eliminato');}catch(e){status(e.message,true);}
}

function exportProj(){readProject();readOps();$('stArchiveIO').value=exportProject(project);status('Progetto esportato');}

function importProj(){
 try{project=importProject($('stArchiveIO').value);revision=archive.read().revision;fillStatic();renderTools();renderOps();status('Progetto importato');}catch(e){status(e.message,true);}
}

function generate(e){
 e.preventDefault();readProject();readOps();
 window.__stockProject=project;
 try{
  const res=generateProgram(project);
  $('stOutput').value=res.iso;$('stockOutputCard').hidden=false;$('stCopy').disabled=false;$('stDownload').disabled=false;
  status('ISO candidato generato. Verificare correttori, attrezzaggio e programma sul controllo.');
 }catch(err){status(err.message,true);}
}

function bind(){
 $('stockForm').addEventListener('submit',generate);
 $('stAddOp').addEventListener('click',addOp);
 $('stTools').addEventListener('change',e=>{
  const row=e.target.closest('[data-tool]');if(!row)return;
  const t=project.tools.find(t=>t.id===row.dataset.tool);if(!t)return;
  const k=e.target.dataset.tk;if(!k)return;
  if(k==='loaded')t.loaded=e.target.checked;
  else if(k==='coolant')t.parameters.coolant=e.target.value;
  else if(['rpm','feed','entryFeed'].includes(k))t.parameters[k]=e.target.value===''?null:num(e.target.value);
  else if(k==='centerCutting')t.centerCutting=e.target.checked;
  else if(k==='maxRampAngle')t.maxRampAngle=num(e.target.value);
  else t[k]=e.target.value===''?undefined:num(e.target.value);
 });
 $('stOps').addEventListener('change',readOps);
 $('stOps').addEventListener('click',e=>{const b=e.target.closest('[data-delop]');if(!b)return;project.operations.splice(Number(b.dataset.delop),1);renderOps();});
 $('stSave').addEventListener('click',save);
 $('stLoad').addEventListener('click',load);
 $('stDelete').addEventListener('click',remove);
 $('stExport').addEventListener('click',exportProj);
 $('stImport').addEventListener('click',importProj);
 $('stCopy').addEventListener('click',()=>{navigator.clipboard.writeText($('stOutput').value);});
 $('stDownload').addEventListener('click',()=>{const blob=new Blob([$('stOutput').value],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='grezzo.nc';a.click();});
}

function init(){
 archive=createArchive(localStorage);
 const a=archive.read();revision=a.revision;
 if(a.items.length)project=a.items[0].project;
 project.tools.forEach(t=>{if(t.kind==='mill'&&t.centerCutting===undefined){t.centerCutting=false;t.maxRampAngle=0;}});
 fillStatic();renderTools();renderOps();bind();
}

init();