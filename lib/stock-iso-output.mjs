function nominalProbeBlock(plan){
 const number=v=>{if(!Number.isFinite(v))throw Error('Quota nominale sonda non valida');return String(v);},station=plan.tool.tool.station;
 const out=['(TASTATURA NOMINALE SONDA - SOLO SIMULAZIONE)','T'+station+' M6','G65 P9832','G0 G43 H'+station+' Z'+number(plan.changeZ)];
 for(const m of plan.moves){if(m.type==='probe-move'){let line='G65 P9810';for(const k of ['x','y','z'])if(k in m)line+=' '+k.toUpperCase()+number(m[k]);out.push(line+' F'+number(m.feed));}else if(m.type==='probe-cycle'){const tail=' Q'+number(m.q)+' S3';if(m.code===9811)out.push('G65 P9811 '+m.axis+number(m.target)+tail);else if(m.code===9812)out.push('G65 P9812 '+m.axis+number(m.width)+' Z'+number(m.z)+tail);else if(m.code===9814)for(const axis of ['X','Y'])out.push('G65 P9812 '+axis+number(m.diameter)+' Z'+number(m.z)+tail);else throw Error('Ciclo nominale sonda non supportato');}}
 out.push('G65 P9833','(FINE TASTATURA NOMINALE - NESSUNA MISURA REALE)');return out;
}
export function finalizeStockISO(lines,plans,lineMap){
 const manual=new Map(plans.filter(p=>p.type==='probe'&&p.probePreviewOnly).map(p=>[p.id,p])),requiresManualOrigin=manual.size>0,assumedToolGeometry=plans.some(p=>p.tool?.tool?.geometryAssumed);let simulationISO=null;
 if(requiresManualOrigin){const simulated=[],inserted=new Set();for(let i=0;i<lines.length;i++){const id=lineMap[i]?.operationId;if(manual.has(id)&&!inserted.has(id)){simulated.push(...nominalProbeBlock(manual.get(id)));inserted.add(id);}simulated.push(lines[i]);}if(inserted.size!==manual.size)throw Error('Mappa tastatura nominale incompleta');simulationISO=simulated.join('\n');}
 return {iso:lines.join('\n'),simulationISO,previewOnly:false,requiresManualOrigin,assumedToolGeometry,lineMap,candidate:true,readyForMachine:false,requiresMachineValidation:true};
}
