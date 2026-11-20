import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {alignStockPreview,orientStockTriad} from '../scripts/stock-origin-build.mjs';
const original=await readFile(new URL('../stock-preview.mjs',import.meta.url),'utf8'),source=orientStockTriad(original);
const raw=source.slice(source.indexOf('function raw(p)'),source.indexOf('\n function outline'));
function project(p,az=0,el=Math.PI/2){return runInNewContext('('+raw+')(p)',{p,az,el,Math});}
test('dall’alto: tutti gli angoli coincidono con la pianta, X destra e Y positiva in alto',()=>{for(const [p,x,y]of [[{x:0,y:100,z:0},0,-100],[{x:160,y:100,z:0},160,-100],[{x:0,y:0,z:0},0,0],[{x:160,y:0,z:0},160,0]]){const q=project(p);assert(Math.abs(q.x-x)<1e-9);assert(Math.abs(q.y-y)<1e-9);}});
test('vista 3D iniziale: alto sinistra è il vertice sinistro e i due versi interni entrano nel pezzo',()=>{const origin=project({x:0,y:100,z:0},.7,.65),alongX=project({x:10,y:100,z:0},.7,.65),alongMinusY=project({x:0,y:90,z:0},.7,.65);assert(alongX.x>origin.x);assert(alongMinusY.x>origin.x);assert(alongX.y<origin.y);assert(alongMinusY.y>origin.y);});
test('Z positiva sale e la superficie superiore viene disegnata davanti a quella inferiore',()=>{for(const az of [-1,0,.7,2])for(const el of [.02,.65,1.3]){const top=project({x:30,y:40,z:0},az,el),up=project({x:30,y:40,z:10},az,el),bottom=project({x:30,y:40,z:-20},az,el);assert(up.y<top.y);assert(top.depth>bottom.depth);}});
test('vista iniziale e ripristino usano lo stesso orientamento, patch non applicabile due volte',()=>{assert.equal(source.split('az=.7').length,3);assert.throws(()=>alignStockPreview(source));});
