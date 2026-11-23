import { createHash } from 'node:crypto';

export const PACKAGE_FORMAT = 'officina-project-v2';
export const CONTRACT_VERSION = 'project-v2/1';

const TOP_LEVEL = ['manifest','sources','requirements','features','frames','setups','operations','targets','toolRequirements','tools','holders','assemblies','usages','machine','postprocessor','issues','decisions','coverage','validations','lineage','artifacts'];
const INPUT_FIELDS = ['sources','requirements','features','frames','setups','operations','targets','toolRequirements','tools','holders','assemblies','usages','machine','postprocessor','issues'];
const ID_COLLECTIONS = ['sources','requirements','features','frames','setups','operations','targets','toolRequirements','tools','holders','assemblies','usages','machine','postprocessor','issues','decisions','coverage','validations','lineage','artifacts'];

function fail(message){ throw new Error(message); }
function isPlainObject(value){ return value !== null && typeof value === 'object' && !Array.isArray(value); }
function requireObject(value,label){ if(!isPlainObject(value)) fail(label+': oggetto atteso'); return value; }
function requireArray(value,label){ if(!Array.isArray(value)) fail(label+': elenco atteso'); return value; }
function requireId(value,label){ if(typeof value !== 'string' || !/^[A-Za-z0-9_.-]+$/.test(value)) fail(label+': identificatore non valido'); return value; }
function requireFiniteNumber(value,label){ if(typeof value !== 'number' || !Number.isFinite(value)) fail(label+': numero atteso'); return value; }

export function canonicalize(value){
  if(value === null || typeof value !== 'object') return JSON.stringify(value);
  if(Array.isArray(value)) return '['+value.map(canonicalize).join(',')+']';
  return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonicalize(value[key])).join(',')+'}';
}

export function projectInputs(pkg){
  requireObject(pkg,'pacchetto');
  const projection={};
  for(const field of INPUT_FIELDS) projection[field]=structuredClone(pkg[field]??null);
  return projection;
}

export async function computeInputDigest(pkg){
  const bytes=new TextEncoder().encode(canonicalize(projectInputs(pkg)));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

export function validatePackage(pkg){
  requireObject(pkg,'pacchetto');
  const keys=Object.keys(pkg);
  for(const key of keys) if(!TOP_LEVEL.includes(key)) fail('campo di primo livello non previsto: '+key);
  for(const field of TOP_LEVEL) if(!Object.hasOwn(pkg,field)) fail('campo mancante: '+field);
  const manifest=requireObject(pkg.manifest,'manifest');
  if(manifest.format!==PACKAGE_FORMAT) fail('formato pacchetto non supportato');
  if(manifest.contractVersion!==CONTRACT_VERSION) fail('versione di contratto non supportata: '+manifest.contractVersion);
  requireId(manifest.projectId,'manifest.projectId');
  if(typeof manifest.revision!=='string'||!manifest.revision.trim()) fail('manifest.revision non valido');
  if(typeof manifest.inputDigest!=='string'||!/^[0-9a-f]{64}$/.test(manifest.inputDigest)) fail('manifest.inputDigest non valido');
  const ids=new Map();
  for(const field of ID_COLLECTIONS){
    const rows=requireArray(pkg[field],field); const set=new Set();
    for(const row of rows){ requireObject(row,field); const id=requireId(row.id,field+'.id'); if(set.has(id)) fail(field+': ID duplicato '+id); set.add(id); }
    ids.set(field,set);
  }
  const ref=(value,field,label)=>{ if(value!==null&&value!==undefined){ requireId(value,label); if(!ids.get(field)?.has(value)) fail(label+' riferisce '+field+' inesistente: '+value); } };
  for(const feature of pkg.features) ref(feature.frameId,'frames','features.'+feature.id+'.frameId');
  for(const setup of pkg.setups) ref(setup.frameId,'frames','setups.'+setup.id+'.frameId');
  for(const operation of pkg.operations) ref(operation.setupId,'setups','operations.'+operation.id+'.setupId');
  for(const target of pkg.targets){ ref(target.operationId,'operations','targets.'+target.id+'.operationId'); ref(target.featureId,'features','targets.'+target.id+'.featureId'); }
  for(const requirement of pkg.toolRequirements){ ref(requirement.operationId,'operations','toolRequirements.'+requirement.id+'.operationId'); ref(requirement.targetId,'targets','toolRequirements.'+requirement.id+'.targetId'); }
  for(const tool of pkg.tools) ref(tool.holderId,'holders','tools.'+tool.id+'.holderId');
  for(const assembly of pkg.assemblies) ref(assembly.holderId,'holders','assemblies.'+assembly.id+'.holderId');
  for(const usage of pkg.usages){ ref(usage.operationId,'operations','usages.'+usage.id+'.operationId'); ref(usage.targetId,'targets','usages.'+usage.id+'.targetId'); ref(usage.toolId,'tools','usages.'+usage.id+'.toolId'); ref(usage.assemblyId,'assemblies','usages.'+usage.id+'.assemblyId'); }
  for(const source of pkg.sources) for(const limit of requireArray(source.readingLimits,'sources.'+source.id+'.readingLimits')) if(typeof limit!=='string') fail('limite di lettura non valido');
  for(const requirement of pkg.requirements){ for(const sourceId of requireArray(requirement.sourceIds,'requirements.'+requirement.id+'.sourceIds')) ref(sourceId,'sources','requirements.'+requirement.id+'.sourceIds'); if(requirement.reviewStatus!=='unreviewed') fail('requisito non in bozza'); }
  for(const feature of pkg.features) for(const requirementId of requireArray(feature.requirementIds,'features.'+feature.id+'.requirementIds')) ref(requirementId,'requirements','features.'+feature.id+'.requirementIds');
  for(const frame of pkg.frames){ for(const axis of ['u','v','w']){ const vector=requireArray(frame[axis],'frames.'+frame.id+'.'+axis); if(vector.length!==3) fail('frame deve avere assi a 3 componenti'); for(const value of vector) requireFiniteNumber(value,'frame axis'); } for(const value of requireArray(frame.origin,'frames.'+frame.id+'.origin')) requireFiniteNumber(value,'frame origin'); }
  return pkg;
}

export async function validatePackageWithDigest(pkg){
  validatePackage(pkg);
  const expected=await computeInputDigest(pkg);
  if(pkg.manifest.inputDigest!==expected) fail('inputDigest non coerente con gli input del pacchetto');
  return pkg;
}
