const ANGLE_TOLERANCE=.05,DIAMETER_TOLERANCE=.05,POSITION_TOLERANCE=.05;
function fail(message){throw Error(message);}
function finite(v,label){if(typeof v!=='number'||!Number.isFinite(v))fail(label+': valore numerico non valido');return v;}
function vector(values,label){if(!Array.isArray(values)||values.length!==3)fail(label+': vettore non valido');return values.map((v,i)=>finite(v,label+'['+i+']'));}
function normalize(v,label){const length=Math.hypot(...v);if(!Number.isFinite(length)||length<1e-9)fail(label+': direzione nulla');return v.map(x=>x/length);}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function angleBetween(a,b){return Math.acos(Math.max(-1,Math.min(1,dot(normalize(a,'angolo'),normalize(b,'angolo')))))*180/Math.PI;}
function value(row,name,label){const v=row?.values?.[name];if(!v||v.value===null)fail(label+': quota '+name+' assente');return finite(v.value,label+'.'+name);}
export function createLinker(analysis){
 if(!analysis?.analysis?.features)fail('Analisi non disponibile');
 const features=new Map(analysis.analysis.features.map(f=>[f.id,f]));
 const overrides=new Map(),links=new Map();
 function feature(id){const f=features.get(id);if(!f)fail('Caratteristica inesistente: '+id);return f;}
 function override(id,field,value,reason='Conferma operatore'){
  const f=feature(id);if(typeof field!=='string'||!field.trim()||field.length>200)fail('Campo override non valido');
  if(value!==null&&(typeof value!=='number'||!Number.isFinite(value)))fail('Valore override non valido');
  if(!f.values[field])fail('Quota inesistente per override: '+field);
  if(!['conflitto','mancante','ambiguo','letto','misurato_cad','calcolato','proposto'].includes(f.values[field].status))fail('Stato quota non idoneo all’override');
  overrides.set(id+':'+field,{feature_id:id,field,value,reason:String(reason).slice(0,500),confirmed_at:new Date().toISOString(),source:'operator_confirmation'});
  return getOverride(id,field);}
 function getOverride(id,field){const record=overrides.get(id+':'+field);return record?{...record,status:'confermato_operatore'}:null;}
 function effective(id,field){const f=feature(id),raw=f.values[field];if(!raw)return null;const o=getOverride(id,field);return o?{...raw,value:o.value,status:'confermato_operatore',source_ids:[...raw.source_ids],method:o.reason,input_ids:[...raw.input_ids]}:raw;}
 function link(id,geometry,method='geometric_match'){
  const f=feature(id);if(!geometry||typeof geometry!=='object'||Array.isArray(geometry))fail('Geometria non valida');
  const kind=String(geometry.kind??'');if(!['cylinder','cone','plane','slot','profile','point'].includes(kind))fail('Tipo geometria non supportato');
  if(kind==='cylinder'||kind==='cone'){vector(geometry.axis,'asse');vector(geometry.center,'centro');finite(geometry.diameter,'diametro');if(geometry.diameter<=0)fail('Diametro non positivo');}
  if(kind==='cone')finite(geometry.halfAngle,'semi-angolo');
  if(kind==='plane')vector(geometry.normal,'normale');
  if(kind==='slot'){vector(geometry.axis,'asse');vector(geometry.center,'centro');finite(geometry.width,'larghezza');}
  if(kind==='point')vector(geometry.center,'punto');
  if(kind==='profile')finite(geometry.area,'area');
  const record={feature_id:id,geometry,method,linked_at:new Date().toISOString(),match:'proposed'};
  links.set(id,record);return getLink(id);}
 function getLink(id){const record=links.get(id);if(!record)return null;const f=feature(id);
  if(['cylinder','cone'].includes(record.geometry.kind)){const axis=normalize(record.geometry.axis,'asse'),expected=expectedAxis(f),diameter=value(f,diameterKey(f),'diametro');
   const angle=expected?angleBetween(axis,expected.axis):null,position=expected?Math.hypot(record.geometry.center[0]-expected.center[0],record.geometry.center[1]-expected.center[1],record.geometry.center[2]-expected.center[2]):null;
   record.match=(!expected||((angle===null||angle<=ANGLE_TOLERANCE)&&(position===null||position<=POSITION_TOLERANCE)))&&Math.abs(record.geometry.diameter-diameter)<=DIAMETER_TOLERANCE?'matched':'mismatch';}
  else record.match='manual';return record;}
 function diameterKey(f){if(['hole','counterbore','countersink','thread','channel'].includes(f.kind))return Object.keys(f.values).find(k=>/diametro/i.test(k));return null;}
 function expectedAxis(f){const values=f.values??{};
  if(f.id==='F019'){const x=finite(values.m011direzionexcad?.value??0,'F019 X'),y=finite(values.m011direzioneycad?.value??0,'F019 Y'),z=finite(values.m011direzionezcad?.value??-1,'F019 Z');return {axis:normalize([x,y,z],'F019'),center:[finite(values.m011imboccoxcad?.value??83,'F019 X'),finite(values.m011imboccoycad?.value??94,'F019 Y'),finite(values.m011imboccozcad?.value??0,'F019 Z')]};}
  if(f.id==='F017'){return {axis:[1,0,0],center:[finite(values.m009ingressoassexcad?.value??0,'F017 X'),finite(values.m009ingressoasseycad?.value??95,'F017 Y'),finite(values.m009ingressoassezcad?.value??-45,'F017 Z')]};}
  if(['F009','F010','F011','F012'].includes(f.id)){const key=f.id.toLowerCase();return {axis:[0,0,1],center:[finite(values[key+'xcad']?.value??0,f.id+' X'),finite(values[key+'ycad']?.value??0,f.id+' Y'),0]};}
  if(['F020','F021'].includes(f.id)){const key=f.id.toLowerCase();return {axis:[0,0,1],center:[finite(values[key+'ingressoxcad']?.value??113.5,f.id+' X'),finite(values[key+'ingressoycad']?.value??(f.id==='F020'?136:16),f.id+' Y'),finite(values[key+'ingressozcad']?.value??0,f.id+' Z')]};}
  return null;}
 function summary(){const linked=[...links.values()];return {features:features.size,linked:linked.length,matched:linked.filter(x=>x.match==='matched').length,mismatched:linked.filter(x=>x.match==='mismatch').length,manual:linked.filter(x=>x.match==='manual').length,overrides:[...overrides.values()],links:linked};}
 return {feature,override,getOverride,effective,link,getLink,summary,confirmedInclinedChannel(){const f=feature('F019'),axis=effective('F019','m011inclinazionecad'),position=effective('F019','q060posizioneasseimbocco');
  if(!position||position.value!==83)fail('Quota asse F019 non confermata a 83 mm');return {feature_id:'F019',axis_position_mm:83,inclination_deg:axis?.value??13,diameter_mm:value(f,'m011diametrocad','F019'),status:'operator_confirmed'};}};}