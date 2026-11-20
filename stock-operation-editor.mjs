import {validateProject} from './lib/stock-workspace.mjs';
import {resolveGeometry,assignDrill} from './lib/stock-geometry-tools.mjs';
import {numericInput} from './lib/stock-ui-model.mjs';
import {drillingPoints} from './lib/stock-drilling-groups.mjs';

const definitions={probe:['Tastatura',['probe']],facing:['Spianatura',['face','mill']],roughing:['Sgrossatura contorno',['mill']],finishing:['Finitura contorno',['mill']],chamfer:['Smusso esterno',['chamfer']],drilling:['Foratura',['drill']],pocket:['Tasca / asola',['mill']]};
export const OPERATION_TYPES=Object.freeze(Object.entries(definitions).map(([type,[label,kinds]])=>Object.freeze({type,label,toolKinds:Object.freeze([...kinds])})));
const templates={probe:{axes:['Z','X','Y'],xyMethod:'surfaces',clearance:5,expectedError:.5,overtravel:2,positionFeed:1000,sideTipZ:-5,xSide:'min',ySide:'max',macroProfileConfirmed:false,calibrationConfirmed:false,provisionalOriginConfirmed:false,ballBottomReferenceConfirmed:false},facing:{stepOver:20},roughing:{depth:5,radialStep:3},finishing:{depth:5},chamfer:{width:1},drilling:{pattern:'single',x:0,y:0,count:1,pitch:10,angle:0,rows:1,columns:1,pitchX:10,pitchY:10,circleDiameter:20,depth:10,depthReference:'tip',mode:'blind',rPlane:2,cycle:'G81',q:1,breakthroughConfirmed:false},pocket:{shape:'rounded-rectangle',x:0,y:0,length:40,width:30,radius:10,angle:0,depth:5,stepZ:2,stepOver:1,entry:'ramp',rampAngle:3,finishLeadMargin:1,finish:false}};
const choices={xyMethod:['surfaces','midpoint'],xSide:['min','max'],ySide:['min','max'],pattern:['single','line','grid','circle','points'],depthReference:['tip'],mode:['blind','through'],cycle:['G81','G83','G73'],shape:['rounded-rectangle','obround'],entry:['ramp','predrill']};
const names={axes:'Assi X,Y,Z',xyMethod:'Metodo XY',clearance:'Margine sfera',expectedError:'Errore iniziale atteso',overtravel:'Ricerca Q',positionFeed:'Avanzamento protetto',sideTipZ:'Quota punta sfera sul fianco',xSide:'Lato X',ySide:'Lato Y',macroProfileConfirmed:'Profilo macro verificato',calibrationConfirmed:'Calibrazione verificata',provisionalOriginConfirmed:'Origine provvisoria verificata',ballBottomReferenceConfirmed:'Riferimento H sfera verificato',stepOver:'Passo laterale',depth:'Profondità',radialStep:'Impegno laterale sgrossatura',width:'Larghezza',pattern:'Schema fori',x:'X rispetto allo zero',y:'Y rispetto allo zero',count:'Numero fori',pitch:'Interasse',angle:'Angolo in gradi',rows:'Righe',columns:'Colonne',pitchX:'Passo X',pitchY:'Passo Y',circleDiameter:'Diametro distribuzione',depthReference:'Riferimento profondità',mode:'Tipo foro',rPlane:'Piano R',cycle:'Ciclo',q:'Passo Q',breakthroughConfirmed:'Uscita punta e spazio inferiore verificati',shape:'Forma',length:'Lunghezza',radius:'Raggio angoli',stepZ:'Passo Z',entry:'Ingresso',rampAngle:'Angolo rampa',finishLeadMargin:'Margine ingresso finitura',finish:'Finitura pareti'};
function definition(type){const d=OPERATION_TYPES.find(d=>d.type===type);if(!d)throw Error('Tipo lavorazione non supportato');return d;}
export function compatibleTools(project,type){return project.tools.filter(t=>definition(type).toolKinds.includes(t.kind));}
export function operationFields(type,parameters={}){
 definition(type);const defaults=templates[type];let keys=Object.keys(defaults);
 if(type==='drilling'){const pattern=parameters.pattern??'single',specific={single:['x','y'],line:['x','y','count','pitch','angle'],grid:['x','y','rows','columns','pitchX','pitchY','angle'],circle:['x','y','count','circleDiameter','angle'],points:[]}[pattern];if(!specific)throw Error('Schema fori non supportato');keys=['pattern',...specific,'depth','depthReference','mode','rPlane','cycle',...((parameters.cycle??'G81')==='G81'?[]:['q']),...((parameters.mode??'blind')==='through'?['breakthroughConfirmed']:[])];}
 if(type==='pocket')keys=keys.filter(k=>!(k==='radius'&&parameters.shape==='obround')&&!(k==='rampAngle'&&parameters.entry==='predrill'));
 return keys.map(key=>({key,label:names[key]??key,kind:choices[key]?'select':Array.isArray(defaults[key])?'axes':typeof defaults[key]==='boolean'?'boolean':'number',options:choices[key]??null}));
}
export function defaultParameters(type,project,tool){
 definition(type);const p=structuredClone(templates[type]),g=resolveGeometry(project.geometry),f=g.finished;
 if(type==='facing')p.stepOver=Math.min(20,(tool?.diameter??40)/2);
 if(['roughing','finishing','pocket','drilling'].includes(type))p.depth=Math.min(p.depth,f.height/2);
 if(type==='drilling'||type==='pocket'){p.x=Number((f.width/2-g.reference.x).toFixed(3));p.y=Number((f.depth/2-g.reference.y).toFixed(3));}
 if(type==='pocket'){p.length=Math.min(40,f.width*.6);p.width=Math.min(30,f.depth*.6,p.length);p.radius=Math.min(10,p.width/3);p.stepOver=Math.min((tool?.diameter??3)/4,p.width/4);p.stepZ=Math.min(2,p.depth);}
 return p;
}
export function createOperation(input,type,{id,toolId,diameter=6.8}={}){
 let project=validateProject(input);definition(type);
 if(type==='drilling'&&!toolId){const assigned=assignDrill(project,numericInput(diameter,'Diametro punta'));project=assigned.project;toolId=assigned.toolId;}
 const tools=compatibleTools(project,type),tool=toolId?tools.find(t=>t.id===toolId):[...tools].sort((a,b)=>type==='pocket'?a.diameter-b.diameter:0)[0];
 if(!tool)throw Error('Utensile compatibile richiesto');
 project.operations.push({id:id??'op-'+globalThis.crypto.randomUUID(),type,enabled:true,toolId:tool.id,parameters:defaultParameters(type,project,tool)});
 return validateProject(project);
}
function parseNumber(value,key){const n=numericInput(value,names[key]??key);if(Math.abs(n)>1e6)throw Error('Valore eccessivo: '+key);return n;}
export function applyOperation(input,operation,values){
 const p=validateProject(input),target=p.operations.find(o=>o.id===operation.id);if(!target||target.type!==operation.type)throw Error('Lavorazione non trovata o modificata');
 if(typeof values.enabled!=='boolean')throw Error('Stato lavorazione non valido');
 const tool=compatibleTools(p,target.type).find(t=>t.id===values.toolId);if(!tool)throw Error('Utensile non compatibile');
 const params={...defaultParameters(target.type,p,tool),...structuredClone(target.parameters)};
 for(const key of Object.keys(choices))if(Object.hasOwn(values,key)){if(!choices[key].includes(values[key]))throw Error('Scelta non valida: '+key);if(Object.hasOwn(templates[target.type],key))params[key]=values[key];}
 for(const field of operationFields(target.type,params)){
  const key=field.key,value=Object.hasOwn(values,key)?values[key]:params[key];
  if(field.kind==='boolean'){if(typeof value!=='boolean')throw Error('Conferma non valida: '+field.label);params[key]=value;}
  else if(field.kind==='select'){if(!field.options.includes(value))throw Error('Scelta non valida: '+field.label);params[key]=value;}
  else if(field.kind==='axes'){const axes=Array.isArray(value)?value:String(value).split(',').map(s=>s.trim().toUpperCase());if(!axes.length||axes.some(a=>!['X','Y','Z'].includes(a))||new Set(axes).size!==axes.length)throw Error('Assi X,Y,Z univoci richiesti');params[key]=axes;}
  else params[key]=parseNumber(value,key);
 }
 if(target.type==='drilling'){
  if(params.pattern==='points'){const points=values.points??params.points;if(!Array.isArray(points))throw Error('Coordinate dei fori richieste');params.points=points.map(q=>({x:parseNumber(q.x,'x'),y:parseNumber(q.y,'y')}));params.count=params.points.length;params.x=params.points[0]?.x??0;params.y=params.points[0]?.y??0;}
  drillingPoints(params);if(params.depth<=0||params.rPlane<0||params.cycle!=='G81'&&params.q<=0)throw Error('Profondità, piano R o passo Q non validi');
 }
 if(['roughing','finishing','pocket'].includes(target.type)&&params.depth<=0)throw Error('Profondità positiva richiesta');
 if(target.type==='roughing'&&(params.radialStep<1||params.radialStep>10))throw Error('Impegno laterale da 1 a 10 mm richiesto');
 if(target.type==='facing'&&params.stepOver<=0||target.type==='chamfer'&&params.width<=0)throw Error('Passo o larghezza positivi richiesti');
 if(target.type==='pocket'){
  if(params.length<=0||params.width<=0||params.stepZ<=0||params.stepOver<=0||params.finishLeadMargin<0)throw Error('Dimensioni e passi tasca non validi');
  if(params.shape==='obround'&&params.length<params.width)throw Error('Lunghezza asola non inferiore alla larghezza');
  if(params.shape==='rounded-rectangle'&&(params.radius<0||params.radius>Math.min(params.length,params.width)/2))throw Error('Raggio oltre metà della dimensione minore');
  if(params.entry==='ramp'&&(params.rampAngle<=0||params.rampAngle>=90))throw Error('Angolo rampa maggiore di 0 e minore di 90 richiesto');
 }
 target.enabled=values.enabled;target.toolId=tool.id;target.parameters=params;return validateProject(p);
}
export function duplicateOperation(input,id,newId){const p=validateProject(input),source=p.operations.find(o=>o.id===id);if(!source)throw Error('Lavorazione non trovata');const copy=structuredClone(source);copy.id=newId??'op-'+globalThis.crypto.randomUUID();copy.enabled=false;p.operations.splice(p.operations.indexOf(source)+1,0,copy);return validateProject(p);}
export function reorderOperation(input,id,delta){const p=validateProject(input),i=p.operations.findIndex(o=>o.id===id),j=i+delta;if(![-1,1].includes(delta)||i<0||j<0||j>=p.operations.length)throw Error('Spostamento non disponibile');[p.operations[i],p.operations[j]]=[p.operations[j],p.operations[i]];return p;}

export function mountOperationEditor({form,getProject,readProject=getProject,replaceProject,changed}){
 if(form.querySelector('#stockOperationEditor'))throw Error('Editor già montato');
 const doc=form.ownerDocument,node=(tag,text)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const panel=node('section');panel.id='stockOperationEditor';panel.className='card';
 const status=node('p');status.setAttribute('role','status');
 const type=node('select');type.setAttribute('aria-label','Nuova lavorazione');for(const d of OPERATION_TYPES){const option=node('option',d.label);option.value=d.type;type.append(option);}
 const diameter=node('input');diameter.type='number';diameter.step='any';diameter.value='6.8';const diameterLabel=node('label','Diametro nuova punta (mm)');diameterLabel.append(diameter);diameterLabel.hidden=type.value!=='drilling';type.onchange=()=>{diameterLabel.hidden=type.value!=='drilling';};
 const editor=node('fieldset'),controls=node('div'),table=node('table');table.style.width='100%';const scroll=node('div');scroll.style.overflowX='auto';scroll.append(table);
 panel.append(node('h2','Editor unificato delle lavorazioni'),node('p','Quote rispetto allo zero selezionato. I valori iniziali sono proposte geometriche. Utensili, parametri reali e prerequisiti sono verificati separatamente dal generatore.'),status,type,diameterLabel,controls,editor,scroll);
 (form.querySelector('#stockPlacement')??form.querySelector('#stOps'))?.after(panel);if(!panel.isConnected)form.append(panel);
 let selected='',draft=null,baseline='',dirty=false,scheduled=false;const undo=[],redo=[];
 const say=text=>{status.textContent=text;},current=()=>getProject().operations.find(o=>o.id===selected);
 const button=(label,fn,host)=>{const b=node('button',label);b.type='button';b.onclick=()=>{try{fn();}catch(e){say(e.message);}};host.append(b);return b;};
 function clean(){if(dirty)throw Error('Conferma o annulla la bozza prima di cambiare lavorazione');if(doc.getElementById('stockPlacement')?.dataset.pending==='true')throw Error('Conferma o annulla il posizionamento in corso');}
 function notify(){changed();form.dispatchEvent(new CustomEvent('stock:editor-updated'));}
 function commit(candidate,before){const after=validateProject(candidate);undo.push({before:structuredClone(before),after:structuredClone(after)});if(undo.length>30)undo.shift();redo.length=0;replaceProject(after);dirty=false;notify();load();}
 function capture(){for(const input of editor.querySelectorAll('[data-key]')){const key=input.dataset.key;if(key==='enabled')draft.enabled=input.checked;else if(key==='toolId')draft.toolId=input.value;else if(key==='pointsText')draft.pointsText=input.value;else draft.parameters[key]=input.type==='checkbox'?input.checked:input.value;}}
 function select(id){clean();selected=id;load();const placement=doc.getElementById('stockPlacementOperation');if(placement&&[...placement.options].some(o=>o.value===id)){placement.value=id;placement.dispatchEvent(new Event('change',{bubbles:true}));}}
 function load(){const op=current();baseline=JSON.stringify(getProject());draft=op?structuredClone(op):null;if(draft){draft.parameters={...defaultParameters(op.type,getProject(),getProject().tools.find(t=>t.id===op.toolId)),...draft.parameters};if(draft.parameters.pattern==='points')draft.pointsText=(draft.parameters.points??[]).map(q=>q.x+' '+q.y).join('\n');}dirty=false;panel.dataset.pending='false';drawEditor();drawTable();}
 function drawEditor(){editor.replaceChildren();if(!draft){editor.append(node('p','Aggiungi o seleziona una lavorazione.'));return;}
  editor.append(node('legend',definition(draft.type).label));
  function field(key,label,kind,value,options){const l=node('label',label);let input;if(options){input=node('select');for(const [v,text]of options){const option=node('option',text);option.value=v;input.append(option);}input.value=value??'';}else{input=node('input');input.type=kind==='boolean'?'checkbox':kind==='number'?'number':'text';input.step='any';if(input.type==='checkbox')input.checked=value===true;else input.value=Array.isArray(value)?value.join(','):value??'';}input.dataset.key=key;l.append(input);editor.append(l);if(['pattern','shape','entry','mode','cycle'].includes(key))input.addEventListener('change',()=>{capture();if(draft.parameters.pattern==='points'&&draft.pointsText===undefined)draft.pointsText=(draft.parameters.points??[{x:draft.parameters.x,y:draft.parameters.y}]).map(q=>q.x+' '+q.y).join('\n');dirty=true;drawEditor();});}
  field('enabled','Lavorazione attiva','boolean',draft.enabled);field('toolId','Utensile del progetto','select',draft.toolId,compatibleTools(getProject(),draft.type).map(t=>[t.id,`T${t.station} · ${t.kind} Ø${t.diameter}`]));
  for(const f of operationFields(draft.type,draft.parameters))field(f.key,f.label,f.kind,draft.parameters[f.key],f.options?.map(v=>[v,v]));
  if(draft.type==='drilling'&&draft.parameters.pattern==='points'){const l=node('label','Coordinate: una coppia X Y per riga'),area=node('textarea');area.dataset.key='pointsText';area.value=draft.pointsText??'';area.rows=6;l.append(area);editor.append(l);}
  button('Conferma lavorazione',onApply,editor);button('Annulla bozza',()=>{dirty=false;load();say('Bozza annullata; progetto conservato.');},editor);
 }
 function onApply(){capture();const p=readProject();if(JSON.stringify(p)!==baseline)throw Error('Il progetto è cambiato: annulla la bozza e riapri la lavorazione');if(doc.getElementById('stockPlacement')?.dataset.pending==='true')throw Error('Conferma o annulla prima il posizionamento');const values={...draft.parameters,enabled:draft.enabled,toolId:draft.toolId};if(draft.type==='drilling'&&draft.parameters.pattern==='points')values.points=String(draft.pointsText??'').trim().split(/\r?\n/).filter(s=>s.trim()).map((line,i)=>{const pair=line.trim().split(/[;\s]+/);if(pair.length!==2)throw Error('Riga '+(i+1)+': inserire X Y');return{x:pair[0],y:pair[1]};});const candidate=applyOperation(p,current(),values);commit(candidate,p);say('Lavorazione confermata. Rigenerare ISO per verificare geometria, utensili e sequenza.');}
 function drawTable(){table.replaceChildren();const head=node('tr');for(const text of ['#','Lavorazione','Utensile','X','Y','Stato','Azioni'])head.append(node('th',text));table.append(head);for(const [i,op]of getProject().operations.entries()){const row=node('tr'),tool=getProject().tools.find(t=>t.id===op.toolId);let label=definitions[op.type]?.[0]??op.type;if(op.type==='drilling')try{label+=' · '+drillingPoints(op.parameters).length+' fori';}catch{label+=' · quote incomplete';}for(const text of [i+1,label,tool?`T${tool.station} Ø${tool.diameter}`:'Non assegnato',op.parameters.x??'—',op.parameters.y??'—',op.enabled?'Attiva':'Disattiva'])row.append(node('td',String(text)));const actions=node('td');button('Modifica',()=>select(op.id),actions);for(const [label,delta]of [['Su',-1],['Giù',1]])button(label,()=>{clean();const p=readProject();commit(reorderOperation(p,op.id,delta),p);say('Ordine aggiornato; i prerequisiti vengono verificati alla generazione.');},actions);button('Duplica',()=>{clean();const p=readProject(),candidate=duplicateOperation(p,op.id);selected=candidate.operations[p.operations.findIndex(o=>o.id===op.id)+1].id;commit(candidate,p);say('Copia disattivata: modifica le quote prima di attivarla.');},actions);button('Elimina',()=>{clean();const p=readProject(),candidate=structuredClone(p);candidate.operations=candidate.operations.filter(o=>o.id!==op.id);commit(candidate,p);say('Lavorazione rimossa; disponibile Annulla ultima modifica.');},actions);row.append(actions);table.append(row);}}
 button('Aggiungi lavorazione',()=>{clean();const p=readProject(),candidate=createOperation(p,type.value,{diameter:diameter.value});selected=candidate.operations.at(-1).id;commit(candidate,p);say('Proposta aggiunta. Completa i dati; nessuna conferma macchina è stata attivata.');},controls);
 function restore(from,to,key){clean();const entry=from.at(-1);if(!entry)throw Error('Nessuna modifica disponibile');const p=readProject(),expected=key==='before'?entry.after:entry.before;if(JSON.stringify(p)!==JSON.stringify(expected))throw Error('Progetto cambiato fuori dall’editor: ripristino bloccato per non sovrascriverlo');replaceProject(structuredClone(entry[key]));from.pop();to.push(entry);notify();load();}
 button('Annulla ultima modifica',()=>restore(undo,redo,'before'),controls);button('Ripristina modifica',()=>restore(redo,undo,'after'),controls);
 editor.addEventListener('input',()=>{dirty=true;panel.dataset.pending='true';});editor.addEventListener('change',()=>{dirty=true;panel.dataset.pending='true';});
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;panel.dataset.pending=String(dirty);if(!dirty)load();else drawTable();});}
 for(const name of ['input','change','click','stock:invalidated','stock:editor-updated'])form.addEventListener(name,schedule);
 form.addEventListener('submit',e=>{if(dirty){e.preventDefault();e.stopImmediatePropagation();say('Conferma o annulla la bozza prima di generare ISO.');}},true);
 for(const id of ['stOpType','stAddOp','stOps','stockQuoteEditor']){const old=doc.getElementById(id);if(old)old.hidden=true;}
 const placement=doc.getElementById('stockPlacement');if(placement)for(const b of placement.querySelectorAll('button'))if(['Nuovo foro','Nuova tasca','Nuova asola'].includes(b.textContent))b.hidden=true;
 load();return {refresh:schedule};
}
