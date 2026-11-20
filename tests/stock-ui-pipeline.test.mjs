import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {prepareStockUI} from '../scripts/stock-ui-pipeline.mjs';
test('UI completa trasformata sintatticamente valida e collegata ai dati correnti',async()=>{const source=await readFile(new URL('../stock-ui.js',import.meta.url),'utf8'),ui=prepareStockUI(source);const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:ui,encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(ui,/current\.parameters\[key\]=value/);assert.match(ui,/checkStockInputs\(p\)/);assert.match(ui,/stockInfo\(host,text\)/);assert.match(ui,/project=assignDrill/);});
