import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../project-phase-program.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf('  function refreshPreparation(){'),source.indexOf("  const status=el('p','Configurare"));
function setup(valid=true){
 const config={value:JSON.stringify({phaseId:'p',rows:[{id:'r',depth:1}]})},status={textContent:''},output={textContent:''},plan={requests:[{id:'r',phaseId:'p'},{id:'other',phaseId:'q'}]},calls=[];
 const inspect=(a,p,d)=>{calls.push({a,p,d});return {operations:[],issues:[],counts:{'preliminary-complete':0,'missing-data':0,conflict:0,unsupported:0}}};
 const refresh=new Function('config','plan','analysis','id','toolsValid','preparationStatus','preparationBody','inspectProjectPreparation',body+';return refreshPreparation;')(config,plan,{features:[]},'p',valid,status,output,inspect);
 return {config,status,output,plan,calls,refresh};
}
test('legge configurazione attuale e filtra richieste della fase',()=>{const s=setup();s.refresh();assert.equal(s.calls[0].p.requests.length,1);assert.equal(s.calls[0].d[0].rows[0].depth,1);s.config.value=JSON.stringify({phaseId:'p',rows:[{id:'r',depth:9}]});s.refresh();assert.equal(s.calls[1].d[0].rows[0].depth,9)});
test('JSON errato elimina esito precedente e non richiama il controllo',()=>{const s=setup();s.refresh();s.config.value='{';s.refresh();assert.equal(s.calls.length,1);assert.match(s.status.textContent,/non disponibile/);assert.match(s.output.textContent,/Nessun esito precedente/)});
test('piano invalidato, fase diversa e righe obsolete non producono rapporti',()=>{const invalid=setup(false);invalid.refresh();assert.equal(invalid.calls.length,0);for(const c of [{phaseId:'q',rows:[]},{phaseId:'p',rows:[{id:'old'}]}]){const s=setup();s.config.value=JSON.stringify(c);s.refresh();assert.equal(s.calls.length,0);assert.match(s.status.textContent,/non disponibile/)}});
