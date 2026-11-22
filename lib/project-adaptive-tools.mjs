export const MARGIN=5;
const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=1000000;
const round=n=>Math.ceil(n*1000)/1000;
export const adaptiveKey=t=>[t.kind,t.diameter,t.pitch??0].join('|');
export function adaptiveLengths({depth,entryOffset=0,thickness,through=false}){
 if(!valid(thickness)||!Number.isFinite(entryOffset)||entryOffset<0||depth!==null&&!valid(depth))throw Error('Ingombro o profondità non validi');
 const reach=depth===null?thickness:entryOffset+depth;
 return {fluteLength:round((depth??thickness)+MARGIN),projection:round(Math.max(reach,through?thickness:0)+MARGIN),margin:MARGIN,basis:depth===null?'envelope-assumption':'feature-geometry',collisionStatus:'not-checked'};
}
export function buildAdaptivePlan(input,{overrides={},catalog=[]}={}){
 const a=input?.analysis??input,features=new Map((a?.features??[]).map(f=>[f.id,f])),phases=[],requests=[],pending=[];
 if(a?.part?.code!=='RIC0075')return {phases,requests,tools:[],pending:['Adattatore geometrico non disponibile per questo schema/pezzo; nessun ingombro inventato'],readyForISO:false};
 const value=(id,key)=>{const v=features.get(id)?.values?.[key];return v&&v.status!=='conflitto'&&Number.isFinite(v.value)?v.value:null};
 const x=value('F001','q009_larghezza_nominale'),z=value('F001','q011_spessore_massimo_nominale');
 if(!valid(x)||!valid(z))throw Error('Ingombro F001 mancante');
 const angle=value('F019','q057_inclinazione_nominale');
 const back=value('F004','m002_z_spalle_cad'),rear=value('F004','m002_z_piano_posteriore_cad');
 const specs=new Map((a.proposals??[]).map(p=>[p.id,p]));
 const sizes={SETUP01:z,SETUP02:z,SETUP03:x,SETUP04:angle===null?null:x*Math.sin(angle*Math.PI/180)+z*Math.cos(angle*Math.PI/180),SETUP05:x};
 for(const id of Object.keys(sizes))if(specs.has(id))phases.push({id,thickness:round(sizes[id]??0)});
 function add(op,feature,kind,diameter,depth,entryOffset=0,note='',extra={}){
  const p=specs.get(op);if(!p)return;
  const ids=(p.depends_on??[]).filter(id=>sizes[id]!==undefined);if(ids.length!==1){pending.push(op+': piazzamento non univoco');return}
  const phase=phases.find(f=>f.id===ids[0]),id=[op,feature,kind,extra.pitch??0].join(':'),o=overrides[id]??{};
  diameter=o.diameter??diameter;depth=o.depth??depth;entryOffset=o.entryOffset??entryOffset;
  if(!valid(diameter)||!valid(phase?.thickness)||!Number.isFinite(entryOffset)||entryOffset<0){pending.push(id+': dati geometrici indispensabili mancanti');return}
  if(extra.maxDiameter&&diameter>extra.maxDiameter)throw Error(id+': diametro supera il limite geometrico '+extra.maxDiameter);
  const lengths=adaptiveLengths({depth,entryOffset,thickness:phase.thickness,through:extra.through??false});
  requests.push({id,operationId:op,featureId:feature,phaseId:phase.id,kind,diameter,depth,entryOffset,...extra,lengths,note,sourceRefs:[feature],readyForISO:false});
 }
 const assumption='Scelta automatica nominale; verificare accessi e strategia';
 add('OP002','F001','face',50,null,0,assumption+'; sovramateriale effettivo non definito');
 add('OP002','F001','mill',20,null,0,assumption+'; riferimenti laterali solo se autorizzati');
 add('OP003','F005','mill',20,value('F005','q025_profondita_nominale'),0,assumption);
 add('OP004','F006','mill',2*value('F006','q029_raggio_terminale'),value('F006','q030_dislivello_locale_nominale'),0,assumption,{maxDiameter:2*value('F006','q029_raggio_terminale')});
 const wall=value('F007','x002_spessore_parete_con_fessura_cad');
 add('OP005','F007','mill',2*value('F007','q034_raggio_nominale'),wall,0,'Raggiungimento della pelle CAD, non profondità di sfondamento approvata',{maxDiameter:2*value('F007','q034_raggio_nominale')});
 add('OP006','F020','drill',value('F020','q064_diametro_nominale'),value('F020','q065_profondita_nominale'),0,'Profondità geometrica, quota alla punta da confermare');
 add('OP006','F021','drill',value('F021','q066_diametro_nominale'),value('F021','x006_lunghezza_geometrica_foro_4_basso'),Math.abs(value('F021','m014_ingresso_z_cad')??NaN),'Ingresso ribassato distinto dalla profondità locale; punta da confermare');
 add('OP007','F004','face',50,null,0,assumption+'; stock map non definita');
 add('OP007','F002','mill',20,value('F002','q015_dislivello_spalla_alta'),0,assumption+'; raccordi da qualificare');
 add('OP007','F030','chamfer',12,null,0,'Utensile 45° nominale; richiamo R minimo e accessi da qualificare');
 for(const f of ['F009','F010','F011','F012']){
  const entry=['F009','F010'].includes(f)?back:rear;
  add('OP008',f,'drill',value(f,'q038_diametro_nominale'),entry===null?null:Math.abs(entry),entry===null?NaN:z-Math.abs(entry),'Attraversamento geometrico completo; margine utensile non equivale a sfondamento ISO',{through:true});
 }
 for(const f of ['F013','F014','F015','F016']){
  const high=['F013','F014'].includes(f),entry=value(f,high?'m008_ingresso_z_alti_cad':'m008_ingresso_z_bassi_cad');
  add('OP009',f,'mill',10,value(f,'q040_profondita_nominale'),entry===null?NaN:z-Math.abs(entry),'Scelta nominale interpolazione, non lamatrice al diametro finale',{maxDiameter:(value(f,'q039_diametro_nominale')??0)-.1});
 }
 function thread(op,f,diameter,pitch,depth,offset){
  add(op,f,'drill',diameter===6?5:6.8,depth,offset,'Preforo proposto da tabella per maschio ad asportazione; riserva cieco e processo non approvati',{threadDiameter:diameter,pitch});
  add(op,f,'tap',diameter,depth,offset,'Maschio ad asportazione scelto nominalmente fra le alternative; non maschio a rullare',{pitch});
 }
 for(const f of ['F022','F023','F024','F025'])thread('OP010',f,6,1,value(f,'q067_profondita_assiale_filetto'),z-Math.abs(rear??NaN));
 thread('OP010','F028',8,1.25,value('F029','q076_profondita_preparazione_totale'),z-Math.abs(back??NaN));
 const m8=requests.find(r=>r.operationId==='OP010'&&r.kind==='tap'&&r.featureId==='F028');if(m8){m8.depth=value('F028','q075_profondita_filettata');m8.lengths=adaptiveLengths({depth:m8.depth,entryOffset:m8.entryOffset,thickness:z})}
 add('OP011','F017','drill',value('F017','q049_diametro_nominale'),value('F017','q050_profondita_nominale_dalla_testata'),0,'Fondo piano CAD: punta e metodo di finitura da definire');
 for(const f of ['F026','F027'])thread('OP011',f,6,1,value(f,'q072_profondita_assiale_filetto'),0);
 add('OP012','F018','mill',20,value('F018','q054_profondita_nominale'),0,'Sgrossatura nominale; non garantisce H7');
 add('OP012','F018','bore',value('F018','q053_diametro_nominale'),value('F018','q054_profondita_nominale'),0,'Diametro di lavoro bareno, non diametro corpo/portautensile; H7 da qualificare');
 add('OP012','F018','chamfer',12,value('F018','q055_larghezza_smusso'),0,assumption);
 const offset=angle===null?NaN:(x-(value('F019','m011_imbocco_x_cad')??NaN))*Math.sin(angle*Math.PI/180);
 add('OP013','F019','drill',value('F019','q056_diametro_nominale'),value('F019','x005_lunghezza_assiale_al_piano_cad'),offset,'Solo geometria CAD: conflitto posizione 82/83 e profondità alla punta restano bloccanti');
 add('OP014','F008','mill',4,value('F008','q037_penetrazione_nominale'),0,'Scelta primaria candela; collo/gambo, eccentricità, rigidezza e disco alternativo non verificati',{maxDiameter:value('F008','q035_larghezza_minima')});
 const tools=new Map();
 for(const r of requests){const key=adaptiveKey(r);let t=tools.get(key);if(!t){const old=catalog.find(t=>adaptiveKey(t)===key);t={id:'virtual-'+key.replaceAll('|','-'),kind:r.kind,diameter:r.diameter,pitch:r.pitch??0,fluteLength:Math.max(r.lengths.fluteLength,old?.fluteLength??0),projection:r.lengths.projection,gripLength:20,virtual:true,loaded:false,geometryAssumptions:['Modello digitale adattivo, non utensile fisico verificato','Serraggio nominale 20 mm; portautensile reale non definito'],parameters:{rpm:['mill','face'].includes(r.kind)?2200:r.kind==='tap'?300:2000,feed:['mill','face'].includes(r.kind)?1850:r.kind==='tap'?300*r.pitch:200,entryFeed:100,coolant:'off'}};tools.set(key,t)}t.fluteLength=Math.max(t.fluteLength,r.lengths.fluteLength);t.projection=Math.max(t.projection,r.lengths.projection,t.fluteLength)}
 const used=new Set();for(const t of tools.values()){const pool=t.kind==='drill'?[11,12,13,14,15,16,17,18,19,20,...Array.from({length:27},(_,i)=>i+1)]:Array.from({length:27},(_,i)=>i+1);t.station=pool.find(n=>!used.has(n));if(!t.station)throw Error('Magazzino nominale completo');used.add(t.station);t.overallLength=round(t.projection+t.gripLength);t.projection=round(t.projection)}
 for(const r of requests){const t=tools.get(adaptiveKey(r));r.toolId=t.id;r.addresses={T:t.station,H:t.station,D:['mill','bore'].includes(t.kind)?t.station:null};r.visualGeometry={diameter:t.diameter,fluteLength:t.fluteLength,projection:t.projection,overallLength:t.overallLength};r.collisionStatus='not-checked'}
 return {phases,requests,tools:[...tools.values()],pending,readyForISO:false,executionAuthorized:false,profile:'RIC0075-nominal-v1'};
}
