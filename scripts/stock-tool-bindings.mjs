import assert from 'node:assert/strict';
export function fixToolBindings(source){
 const changes=[
 ['t.loaded=check.checked;',"const current=project.tools.find(item=>item.id===t.id);if(!current)throw Error('Utensile non trovato nel progetto');current.loaded=check.checked;"],
 ["if(key==='fluteLength')t[key]=value;else t.parameters[key]=value;","const current=project.tools.find(item=>item.id===t.id);if(!current)throw Error('Utensile non trovato nel progetto');if(key==='fluteLength')current[key]=value;else current.parameters[key]=value;"],
 ["archiveDetails.append(archiveTitle);const oldHeading=","archiveDetails.append(archiveTitle);form.append(archiveDetails);const oldHeading="]
 ];
 let result=source;
 for(const [before,after]of changes){assert.equal(result.split(before).length,2,'Patch interfaccia: sorgente UI cambiato, verificare collegamenti e montaggio archivio');result=result.replace(before,after);}
 return result;
}
