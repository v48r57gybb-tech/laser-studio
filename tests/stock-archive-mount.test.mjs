import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixToolBindings} from '../scripts/stock-tool-bindings.mjs';
test('archivio montato prima di spostare e ricercare ID progetto',async()=>{
 const source=await readFile(new URL('../stock-ui.js',import.meta.url),'utf8');
 const patched=fixToolBindings(source);
 const mount=patched.indexOf('archiveDetails.append(archiveTitle);form.append(archiveDetails);');
 const relocate=patched.indexOf("archiveDetails.append(grid,$('stArchiveIO'));");
 const lookup=patched.indexOf("$('stRecordId').closest('.field').hidden=true;");
 assert(mount>=0&&relocate>mount&&lookup>relocate,'Il contenitore deve essere nel DOM prima della ricerca del campo spostato');
});
