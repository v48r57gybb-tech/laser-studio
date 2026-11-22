const CONFIRM_STORE='officina-project-auto-confirm-v1';
export function nominalParameters({kind,diameter,pitch=0,teeth=3}){
 if(!Number.isFinite(diameter)||diameter<=0)throw Error('Diametro utensile non valido per parametri nominali');
 const rpm=Math.round(80000/(Math.PI*diameter));
 let feed;
 if(kind==='tap')feed=Math.round(rpm*pitch);
 else if(kind==='drill'||kind==='bore')feed=Math.round(rpm*0.05);
 else feed=Math.round(rpm*teeth*0.05);
 return {rpm,feed,entryFeed:Math.max(1,Math.round(feed*0.25)),coolant:'on',basis:'nominal-test'};
}
export function autoConfirm(storage,key,value){
 let data;try{data=JSON.parse(storage.getItem(CONFIRM_STORE)||'{}')}catch{data={}}
 if(data[key]===undefined){data[key]=value;storage.setItem(CONFIRM_STORE,JSON.stringify(data));return {accepted:true,first:true}}
 return {accepted:data[key]===value,first:false};
}
export function reuseTool(catalog,request){
 const key=[request.kind,request.diameter,request.pitch??0].join('|');
 return catalog.find(t=>[t.kind,t.diameter,t.pitch??0].join('|')===key)||null;
}
