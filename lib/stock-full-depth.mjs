export function fullHeightPreset(p){
 const height=p.geometry.finished.height;if(!(Number.isFinite(height)&&height>0))throw Error('Altezza pezzo non valida');
 for(const op of p.operations){if(!['roughing','finishing'].includes(op.type))continue;const v=op.parameters;v.fullDepth??=true;if(v.fullDepth)v.depth=height;if(op.type==='finishing'){if(!v.finishingToolPresetApplied){let tool=p.tools.find(t=>t.kind==='mill'&&t.diameter===20);if(!tool){const station=Array.from({length:27},(_,i)=>i+1).find(n=>!p.tools.some(t=>t.station===n));if(!station)throw Error('Nessuna postazione libera per fresa finitura Ø20');tool={id:'finish20-'+station,station,kind:'mill',diameter:20,loaded:false,parameters:{rpm:2000,feed:1000,entryFeed:10,coolant:'off'}};p.tools.push(tool);}op.toolId=tool.id;v.finishingToolPresetApplied=true;}v.finishRpm??=2000;v.finishFeed??=1000;v.stepZ=v.depth;}else v.stepZ??=3;}
 const used=new Set(p.operations.filter(o=>o.enabled&&o.type!=='probe').map(o=>o.toolId));
 for(const t of p.tools){if(!used.has(t.id)||t.lengthMode==='manual')continue;t.nominalReach=height+5;t.lengthMode='nominal-height-plus-5';t.geometryAssumed=true;if(['mill','drill','spot','tap'].includes(t.kind))t.fluteLength=height+5;else t.fluteLength=Math.min(t.fluteLength||8,height+5);t.shankLength=Math.max(0,height+5-t.fluteLength);}
 return p;
}
