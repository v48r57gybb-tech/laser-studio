const EPS=1e-9;
export function createRemoval({validateProject,resolveGeometry}){
 if(typeof validateProject!=='function'||typeof resolveGeometry!=='function')throw Error('Motore geometrico non collegato');
 function domain(project){const p=validateProject(project),g=resolveGeometry(p.geometry);return {project:p,geometry:g}}
 function sweep(tool,from,to,voxels,{resolution=1}={}){
  if(!tool||!Number.isFinite(tool.diameter)||tool.diameter<=0)throw Error('Utensile non valido');if(!from||!to)throw Error('Estremi percorso mancanti');if(!Array.isArray(voxels))throw Error('Voxel non validi');if(!Number.isFinite(resolution)||resolution<=0||resolution>50)throw Error('Risoluzione non valida');
  const radius=tool.diameter/2,d=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z),steps=Math.max(1,Math.ceil(d/resolution));
  for(let i=0;i<=steps;i++){const t=i/steps,c={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,z:from.z+(to.z-from.z)*t};for(const v of voxels){if(v.removed)continue;const dist=Math.hypot(v.x-c.x,v.y-c.y,v.z-c.z);if(dist<=radius+EPS)v.removed=true}}
  return voxels.filter(v=>v.removed).length
 }
 function materialRemoved(voxels){if(!Array.isArray(voxels))throw Error('Voxel non validi');return voxels.every(v=>v.removed)}
 return {domain,sweep,materialRemoved}
}
