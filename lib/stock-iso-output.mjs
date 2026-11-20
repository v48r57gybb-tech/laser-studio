export function finalizeStockISO(lines,plans,lineMap){
 const requiresManualOrigin=plans.some(p=>p.type==='probe'&&p.probePreviewOnly),assumedToolGeometry=plans.some(p=>p.tool?.tool?.geometryAssumed);
 return {iso:lines.join('\n'),simulationISO:null,previewOnly:false,requiresManualOrigin,assumedToolGeometry,lineMap,candidate:true,readyForMachine:false,requiresMachineValidation:true};
}
