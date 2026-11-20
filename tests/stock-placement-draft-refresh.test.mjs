import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {fixPlacementCoordinates} from '../scripts/stock-placement-fix.mjs';
const source=fixPlacementCoordinates(await readFile(new URL('../stock-placement.mjs',import.meta.url),'utf8'));
const refresh=source.slice(source.indexOf('function refresh()'),source.indexOf('function schedule()'));
function context(){const op={id:'op',type:'drilling',toolId:'drill',parameters:{depth:10}};return {operation:()=>op,staged:{tools:[{id:'drill',diameter:6.8}]},renderedId:'op',panel:{dataset:{}},apply:{},cancel:{},inputs:{depth:{value:'6',parentElement:{}}},diameter:{value:'8',parentElement:{}},document:{activeElement:{}},status:{},live:()=>({operations:[op],tools:[{id:'drill',diameter:6.8}]})};}
test('refresh dopo perdita focus non ripristina profondità o diametro precedenti durante la bozza',()=>{const c=context();runInNewContext(refresh+';refresh();',c);assert.equal(c.inputs.depth.value,'6');assert.equal(c.diameter.value,'8');});
test('annullamento ripristina i valori confermati',()=>{const c=context();c.staged=null;runInNewContext(refresh+';refresh();',c);assert.equal(c.inputs.depth.value,10);assert.equal(c.diameter.value,6.8);});
test('una nuova selezione inizializza i campi anche con bozza attiva',()=>{const c=context();c.renderedId='altra-op';runInNewContext(refresh+';refresh();',c);assert.equal(c.inputs.depth.value,10);assert.equal(c.diameter.value,6.8);});
