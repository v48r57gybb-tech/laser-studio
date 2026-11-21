import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

export function simplifyAccess(code){
  assert(code.includes('const guestMaps=[]'),'Applicare prima il modulo visitatore');
  assert(!code.includes('Simplified local activation;'),'Primo accesso già semplificato');
  const oldChecks="if(document.getElementById('officinaTokenInput').value!==token)throw Error('Codice temporaneo non corretto');if(entered!==document.getElementById('officinaConfirm').value)throw Error('Le password non coincidono');if(!document.getElementById('officinaAccept').checked)throw Error('Conferma le condizioni del salvataggio locale');profile={operator:document.getElementById('officinaOperator').value.trim(),company:document.getElementById('officinaCompany').value.trim(),machine:document.getElementById('officinaMachine').value.trim()};";
  const newChecks="if(oldRows.length)throw Error('Trovati dati locali precedenti: attivazione sospesa per conservarli. Non cancellare i dati del sito; serve una migrazione dedicata.');profile={operator:'Amministratore locale',company:'',machine:''};";
  assert.equal(code.split(oldChecks).length,2,'Primo accesso cambiato: nessuna modifica applicata');
  return code.replace(oldChecks,newChecks)+"\n// Simplified local activation; not a global administrator account.\n{\n  const hiddenStyle=document.createElement('style');\n  hiddenStyle.textContent='#officinaGate [hidden]{display:none!important}';\n  document.head.append(hiddenStyle);\n  setup.hidden=true;\n  for(const id of ['officinaConfirm','officinaOperator','officinaCompany','officinaMachine','officinaAccept','officinaTokenInput']){\n    const field=document.getElementById(id);field.required=false;field.disabled=true;\n  }\n  const submit=document.getElementById('officinaSubmit');\n  if(!raw){\n    password.minLength=12;password.autocomplete='new-password';\n    submit.textContent='Attiva e accedi';\n    status('Primo accesso locale: scegli una password di almeno 12 caratteri. Attiva e accedi crea un archivio cifrato solo in questo browser e a questo indirizzo. Conserva la password: non è recuperabile. Nessun account amministratore globale viene creato.');\n  }else if(!submit.disabled){\n    submit.textContent='Entra';\n    status('Inserisci la password esistente del tuo archivio locale. Nessuna nuova registrazione.');\n  }\n}\n";
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const path='dist/local-access.js';
  const original=await readFile(path,'utf8');
  const next=simplifyAccess(original);
  const checked=spawnSync(process.execPath,['--input-type=module','--check'],{input:next,encoding:'utf8'});
  assert.equal(checked.status,0,checked.stderr);
  await writeFile(path,next);
  console.log('Primo accesso locale semplificato: una password; archivi esistenti e visitatore preservati. Collaudo browser necessario.');
}
