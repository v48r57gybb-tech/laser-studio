import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialProject} from '../lib/stock-ui-model.mjs';
import {rebaseOrigin} from '../stock-origin.mjs';
import {orientStockTriad} from '../scripts/stock-origin-build.mjs';
test('zero iniziale alto sinistro e cambio origine reversibile senza spostare fori e tasche',()=>{const p=initialProject();assert.equal(p.geometry.origin.xy,'top-left');p.operations.push({type:'drilling',parameters:{x:20,y:-30}},{type:'pocket',parameters:{x:60,y:-70}});const before=structuredClone(p),q=rebaseOrigin(p,p.geometry,'center');assert.equal(q.geometry.origin.xy,'center');assert.deepEqual(q.operations.at(-2).parameters,{x:-30,y:20});assert.deepEqual(q.operations.at(-1).parameters,{x:10,y:-20});assert.deepEqual(rebaseOrigin(q,q.geometry,'top-left'),before);assert.deepEqual(p,before);assert.deepEqual(q.tools,p.tools);});
test('origine invalida non modifica il progetto',()=>{const p=initialProject(),before=structuredClone(p);assert.throws(()=>rebaseOrigin(p,p.geometry,'non-valida'));assert.deepEqual(p,before);});
test('triade: segni interni, Z positiva e frecce',async()=>{const out=orientStockTriad(await readFile(new URL('../stock-preview.mjs',import.meta.url),'utf8'));assert(out.includes("ref.xy.startsWith('top')?'-Y':'+Y'"));assert(out.includes("ref.xy.includes('right')?'-X':'+X'"));assert(out.includes("['+Z','#89bfff'"));assert(out.includes("ctx.fillText('X0 Y0 Z0'"));assert(out.includes('Math.atan2(q.y-origin.y,q.x-origin.x)'));});
