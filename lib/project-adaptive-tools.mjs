export const MARGIN=5;
const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=1000000;
const round=n=>Math.ceil(n*1000)/1000;
export const adaptiveKey=t=>[t.kind,t.diameter,t.pitch??0].join('|');
export function adaptiveLengths({depth,entryOffset=0,thickness,through=false}){
 if(!valid(thickness)||!Number.isFinite(entryOffset)||entryOffset<0||depth!==null&&!valid(depth))throw Error('Ingombro o profondità non validi');
 return {fluteLength:round((depth??thickness)+MARGIN),projection:round(Math.max(depth===null?thickness:entryOffset+depth,through?thickness:0)+MARGIN),margin:MARGIN,basis:depth===null?'envelope-assumption':'feature-geometry',collisionStatus:'not-checked'};
}
const esc=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function measure(f,pattern){
 const rows=Object.entries(f?.values??{}).filter(([k,v])=>pattern.test(k)&&!/(minore|scostamento|tolleranza|alla_punta)/i.test(k)&&v?.value!==null&&Number.isFinite(v?.value)&&!/(conflitt|conflict|mancante)/i.test(v.status??'')&&(!v.unit||v.unit==='mm'||/passo|inclinazione/.test(k)));
 const values=[...new Set(rows.map(([,v])=>v.value))];if(values.length>1)throw Error((f?.id??'Dato')+': quote semantiche discordanti per '+pattern.source);return values[0]??null;
}
function normal(p){
 if(Array.isArray(p?.frame?.w)){const v=p.frame.w;if(v.length===3&&v.every(Number.isFinite)&&Math.abs(Math.hypot(...v)-1)<.00001)return v;return null}
 const s=String(p.description??'').replaceAll('−','-');
 const m=/(?:\+W\s*=|Z locale lungo)\s*([+-])([XYZ])/i.exec(s);if(m)return ['X','Y','Z'].map(k=>k===m[2].toUpperCase()?(m[1]==='-'?-1:1):0);
 const angle=/\(sin\s*(\d+(?:[.,]\d+)?)°?\s*,\s*0\s*,\s*cos\s*\1°?\)/i.exec(s);if(angle){const n=Number(angle[1].replace(',','.'))*Math.PI/180;return [Math.sin(n),0,Math.cos(n)]}return null;
}
function boxOf(a,features){
 if(a.part?.bounds){const {min,max}=a.part.bounds;if([min,max].every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite))&&min.every((n,i)=>n<max[i]))return {min,max};throw Error('Ingombro strutturato non valido')}
 for(const f of features){const min=[],max=[];for(const axis of ['x','y','z']){min.push(measure(f,new RegExp('_'+axis+'_minimo_cad$')));max.push(measure(f,new RegExp('_'+axis+'_massimo_cad$')))}if(min.every((v,i)=>v!==null&&max[i]!==null&&max[i]>v))return {min,max}}
 return null;
}
export function buildAdaptivePlan(input,{overrides={},catalog=[]}={}){
 const a=input?.analysis??input??{},fs=Array.isArray(a.features)?a.features:[],ps=Array.isArray(a.proposals)?a.proposals:[],phases=[],requests=[],pending=[];
 const result=()=>({phases,requests,tools:[],pending,readyForISO:false,executionAuthorized:false,profile:'generic-semantic-v1'});
 if(!fs.length||!ps.length){pending.push('Caratteristiche o proposte mancanti');return result()}
 if(a.part?.units!=='mm'){pending.push('Unità mm esplicite richieste');return result()}
 const box=boxOf(a,fs),dot=(v,p)=>v.reduce((n,x,i)=>n+x*p[i],0);
 for(const p of ps.filter(p=>/^SETUP\d+$/.test(p.id)||p.kind==='setup')){const n=normal(p);let top=null,bottom=null;if(box&&n){top=n.reduce((s,v,i)=>s+v*(v>=0?box.max[i]:box.min[i]),0);bottom=n.reduce((s,v,i)=>s+v*(v>=0?box.min[i]:box.max[i]),0)}const thickness=p.thickness??(top===null?null:top-bottom);phases.push({id:p.id,normal:n,top,bottom,thickness:valid(thickness)?round(thickness):null});if(!valid(thickness))pending.push(p.id+': ingombro/orientamento da definire')}
 const category=p=>/Caratteristiche e categoria di utensile:\s*([\s\S]*?)(?=\n\s*\n|$)/i.exec(p.description??'')?.[1]??'';
 function scoped(p,source){
  if(Array.isArray(p.machining_feature_ids))return fs.filter(f=>p.machining_feature_ids.includes(f.id));
  let s=source;for(const f of fs)s=s.replace(new RegExp('\\bverso\\s+'+esc(f.id)+'(?=$|[^A-Za-z0-9_])','gi'),'');s=s.replace(/\bF(\d+)\s*[–-]\s*F?(\d+)\b/g,(whole,l,h)=>{const first=Number(l),last=Number(h);return last>=first&&last-first<1000?Array.from({length:last-first+1},(_,i)=>'F'+String(first+i).padStart(l.length,'0')).join(','):whole});
  return fs.filter(f=>new RegExp('(^|[^A-Za-z0-9_])'+esc(f.id)+'(?=$|[^A-Za-z0-9_])').test(s));
 }
 function entry(f,phase){
  if(Number.isFinite(f.entryOffset)&&f.entryOffset>=0)return f.entryOffset;
  if(phase.top===null||!phase.normal)return null;
  let point=f.entryPoint;if(!point){point=['x','y','z'].map(axis=>measure(f,new RegExp('(?:ingresso|imbocco)_(?:asse_)?'+axis+'(?:_|$)')));const text=String(f.description??'').replaceAll('−','-');for(let i=0;i<3;i++)if(point[i]===null){const m=new RegExp('(?:da |ingresso )?'+['X','Y','Z'][i]+'\\s*=\\s*(-?\\d+(?:[.,]\\d+)?)').exec(text);if(m)point[i]=Number(m[1].replace(',','.'))}}
  if(!Array.isArray(point)||point.length!==3)return null;
  if(point.some((v,i)=>!Number.isFinite(v)&&Math.abs(phase.normal[i])>1e-10))return null;
  return Math.max(0,phase.top-dot(phase.normal,point.map(v=>v??0)));
 }
 for(const p of ps.filter(p=>/^OP\d+$/.test(p.id)||p.kind==='operation')){
  const candidates=phases.filter(s=>s.id===p.setupId||(p.depends_on??[]).includes(s.id));if(candidates.length!==1){if(!/misur|collaudo|sbavatura/i.test(p.description??''))pending.push(p.id+': piazzamento non univoco');continue}const phase=candidates[0];if(!valid(phase.thickness))continue;
  const source=category(p),scope=scoped(p,source);if(!scope.length){pending.push(p.id+': caratteristiche lavorate non esplicite nella categoria o machining_feature_ids');continue}
  if(/strumenti di misura|^\s*[^.]*\.\s*misurazione/i.test(source))continue;
  for(const f of scope){
   if(/tratto non filettato oltre/i.test(f.description??''))continue;
   const kind=String(f.kind??'').toLowerCase(),s=source.toLowerCase(),fd=String(f.description??''),notes=['Scelta automatica nominale, non qualifica tecnologica'],roles=[];
   if(['hole','channel'].includes(kind))roles.push('drill');
   else if(kind==='thread')roles.push('drill','tap');
   else if(kind==='counterbore'){roles.push('mill');if(/\bH7\b|bareno|barenatura/i.test(fd+' '+source))roles.push('bore');if(/smusso/.test(s))roles.push('chamfer')}
   else if(['profile','pocket','slot','step'].includes(kind))roles.push('mill');
   else if(/smuss/i.test(fd)&&/45|smuss/i.test(source))roles.push('chamfer');
   else{if(/spianar/.test(s))roles.push('face');if(/riferimenti laterali|candela/.test(s))roles.push('mill')}
   if(!roles.length){pending.push(p.id+'/'+f.id+': famiglia non riconosciuta');continue}
   const through=f.through===true||/\bpassante\b/i.test(fd),offset=entry(f,phase),dGeom=f.diameter??measure(f,/diametro_nominale$/),radius=measure(f,/raggio_(?:nominale|terminale)$/),width=measure(f,/larghezza_minima$/)??measure(f,/larghezza_nominale$/);
   let depth=f.depth??measure(f,/profondita_(?:nominale(?:_dalla_testata)?|assiale_filetto|filettata|preparazione_totale)$|penetrazione_nominale$|dislivello_locale_nominale$|lunghezza_geometrica|lunghezza_assiale_al_piano_cad$/);
   if(depth===null&&through&&offset!==null)depth=phase.thickness-offset;
   if(depth===null)notes.push('Profondità non definita: inviluppo nominale, non quota esecutiva');
   if(offset===null)notes.push('Ingresso non localizzato: ingombro completo assunto per il modello');
   const reachOffset=offset??phase.thickness;if(offset===null&&depth!==null)notes.push('Sporgenza almeno pari all ingombro completo');
   for(const role of roles){
    let diameter,limit=null,pitch=0;
    if(kind==='thread'){const m=/\bM(\d+(?:[.,]\d+)?)(?:\s*[x×]\s*(\d+(?:[.,]\d+)?))?/i.exec(fd);const major=f.threadDiameter??(m?Number(m[1].replace(',','.')):null);pitch=f.pitch??measure(f,/passo_(?:nominale|cad)$/)??(m?.[2]?Number(m[2].replace(',','.')):null);
     const standard={3:.5,4:.7,5:.8,6:1,8:1.25,10:1.5,12:1.75};if(pitch===null&&standard[major]){pitch=standard[major];notes.push('Passo grosso metrico assunto, da confermare')}
     const drill={'3|0.5':2.5,'4|0.7':3.3,'5|0.8':4.2,'6|1':5,'8|1.25':6.8,'10|1.5':8.5,'12|1.75':10.2};diameter=role==='tap'?major:drill[major+'|'+pitch];notes.push('Maschiatura ad asportazione proposta; preforo da tabella, riserva cieco non definita; minore CAD mai usato');if(!valid(pitch))diameter=null;
    }else if(role==='drill'||role==='bore')diameter=dGeom;
    else if(role==='face')diameter=50;
    else if(role==='chamfer')diameter=12;
    else{limit=radius===null?null:2*radius;if(kind==='counterbore')limit=(dGeom??0)-.1;if(kind==='slot')limit=width===null?null:width-1;const preferred=kind==='pocket'?10:kind==='counterbore'&&dGeom<30?10:20;diameter=limit===null?preferred:[1,2,3,4,5,6,8,10,12,16,20,25,32,40].filter(n=>n<=Math.min(limit,preferred)).at(-1);}
    const id=[p.id,f.id,role,pitch??0].join(':'),o=overrides[id]??{};diameter=o.diameter??diameter;const localDepth=o.depth??depth,localOffset=o.entryOffset??reachOffset;
    if(!valid(diameter)){pending.push(id+': diametro/passo non deducibile');continue}if(limit!==null&&(!valid(limit)||diameter>limit))throw Error(id+': diametro oltre limite geometrico');
    const lengths=adaptiveLengths({depth:localDepth,entryOffset:localOffset,thickness:phase.thickness,through});if(offset===null&&o.entryOffset===undefined)lengths.projection=Math.max(lengths.projection,round(phase.thickness+MARGIN));
    requests.push({id,operationId:p.id,featureId:f.id,phaseId:phase.id,kind:role,diameter,pitch:kind==='thread'?pitch:0,depth:localDepth,entryOffset:localOffset,through,maxDiameter:limit,lengths,note:[...new Set(notes)].join('; '),sourceRefs:[p.id,f.id,phase.id],readyForISO:false,collisionStatus:'not-checked'});
   }
  }
 }
 const tools=new Map(),used=new Set();for(const r of requests){const key=adaptiveKey(r);let t=tools.get(key);if(!t){const old=catalog.find(t=>adaptiveKey(t)===key);t={id:'virtual-'+key.replaceAll('|','-'),kind:r.kind,diameter:r.diameter,pitch:r.pitch,fluteLength:Math.max(r.lengths.fluteLength,old?.fluteLength??0),projection:r.lengths.projection,gripLength:20,virtual:true,loaded:false,geometryAssumptions:['Montaggio e serraggio 20 mm nominali; nessun portautensile reale verificato'],parameters:{rpm:['face','mill'].includes(r.kind)?2200:r.kind==='tap'?300:2000,feed:['face','mill'].includes(r.kind)?1850:r.kind==='tap'?300*r.pitch:200,entryFeed:100,coolant:'off'}};tools.set(key,t)}t.fluteLength=Math.max(t.fluteLength,r.lengths.fluteLength);t.projection=Math.max(t.projection,r.lengths.projection,t.fluteLength)}
 for(const t of tools.values()){const pool=t.kind==='drill'?[11,12,13,14,15,16,17,18,19,20,...Array.from({length:27},(_,i)=>i+1)]:Array.from({length:27},(_,i)=>i+1);t.station=pool.find(n=>!used.has(n));if(!t.station)throw Error('Magazzino nominale completo');used.add(t.station);t.projection=round(t.projection);t.overallLength=round(t.projection+t.gripLength)}
 for(const r of requests){const t=tools.get(adaptiveKey(r));r.toolId=t.id;r.addresses={T:t.station,H:t.station,D:['mill','bore'].includes(r.kind)?t.station:null};r.visualGeometry={diameter:t.diameter,fluteLength:t.fluteLength,projection:t.projection,overallLength:t.overallLength}}
 return {...result(),tools:[...tools.values()]};
}
