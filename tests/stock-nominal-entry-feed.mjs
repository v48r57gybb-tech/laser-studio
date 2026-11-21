import assert from 'node:assert/strict';
import {applyNominalTools,setNominalToolValue,captureNominalProfile,restoreNominalProfile} from '../lib/stock-nominal-tools.mjs';
const tool=(kind='mill',entryFeed=null,extra={})=>({kind,diameter:6,loaded:false,parameters:{rpm:null,feed:null,entryFeed,coolant:'off'},...extra});
const fresh={tools:[tool(),tool('face'),tool('drill'),tool('tap')]};
applyNominalTools(fresh);
for(const t of fresh.tools.slice(0,2)){assert.equal(t.parameters.entryFeed,100);assert.equal(t.nominalAssumptions.entryFeed,100);assert.equal(t.parameters.feed,1850);assert.equal(t.parameters.rpm,2200);assert.equal(t.loaded,false);}
assert.equal(fresh.tools[2].parameters.entryFeed,null);assert.equal(fresh.tools[3].parameters.entryFeed,null);
const old=tool('mill',10,{nominalAssumptions:{entryFeed:10}});applyNominalTools({tools:[old]});assert.equal(old.parameters.entryFeed,100);assert.equal(old.nominalAssumptions.entryFeed,100);
const once=JSON.stringify(old);applyNominalTools({tools:[old]});assert.equal(JSON.stringify(old),once);
const explicit=tool('mill',10);applyNominalTools({tools:[explicit]});assert.equal(explicit.parameters.entryFeed,10);assert.equal(explicit.nominalAssumptions.entryFeed,undefined);
const manual=tool('mill',10,{parameterMode:'manual',nominalAssumptions:{entryFeed:10}});applyNominalTools({tools:[manual]});assert.equal(manual.parameters.entryFeed,10);
const edited=tool('mill',75,{nominalAssumptions:{entryFeed:10}});applyNominalTools({tools:[edited]});assert.equal(edited.parameters.entryFeed,75);assert.equal(edited.nominalAssumptions.entryFeed,undefined);
setNominalToolValue(old,'entryFeed',80);applyNominalTools({tools:[old]});assert.equal(old.parameters.entryFeed,80);
const saved=captureNominalProfile(tool('mill',10,{parameterMode:'nominal',nominalAssumptions:{entryFeed:10}}));const restored=tool();restoreNominalProfile(restored,saved);applyNominalTools({tools:[restored]});assert.equal(restored.parameters.entryFeed,100);assert.equal(saved.values.entryFeed,10);
assert.throws(()=>setNominalToolValue(old,'entryFeed',0));
console.log('PASS F ingresso nominale 100: nuovi utensili, migrazione del solo F10 automatico, idempotenza, valori manuali preservati, profili ricaricati e famiglie escluse. ISO completo e CNC da collaudare.');
