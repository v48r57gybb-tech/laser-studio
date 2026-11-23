export function preservePhaseFrame(fresh,previousText){
 const next=structuredClone(fresh);
 let previous;
 try{previous=JSON.parse(previousText)}catch{return next}
 if(previous?.phaseId!==fresh.phaseId)return next;
 const vector=v=>Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n));
 for(const key of ['origin','u','v','w'])if(vector(previous[key]))next[key]=[...previous[key]];
 for(const key of ['programNumber','safeClearance','changeClearance'])if(typeof previous[key]==='number'&&Number.isFinite(previous[key])&&previous[key]>0)next[key]=previous[key];
 // Derived rows, domain geometry, stock top and confirmations come from fresh data.
 return next;
}
