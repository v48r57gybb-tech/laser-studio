export function isExplicitFacingRequest(input,request){
 const analysis=input?.analysis??input;
 if(!request||typeof request.featureId!=='string'||!/^F\d+$/.test(request.featureId))return false;
 const operation=analysis?.proposals?.find(p=>p.id===request.operationId);
 if(typeof operation?.description!=='string')return false;
 const header=operation.description.split(/\r?\n\s*\r?\n/)[0];
 const prefix=new RegExp('^\\s*-\\s*'+request.featureId+'\\s*:\\s*(.*)$','i');
 const entries=header.split(/\r?\n/).map(line=>prefix.exec(line)?.[1]).filter(value=>value!==undefined);
 return entries.length===1&&/^(?:fresatura\s+di\s+)?spianatura\b/i.test(entries[0]);
}
