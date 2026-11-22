import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const path='dist/stock-feedback.mjs',before=await readFile(path,'utf8');
const changes=[['<h3>Motore di calcolo</h3>','<h3>Preparazione programma ISO</h3>'],['<p>Programma già calcolato: presentazione dei dati ISO, non avanzamento del calcolo CNC né simulazione macchina.</p>',''],['Preparazione della presentazione','Preparazione del programma ISO']];
let source=before;for(const [oldText,newText]of changes){assert.equal(source.split(oldText).length,2,'Testo barra ISO cambiato: '+oldText);source=source.replace(oldText,newText);}
let expected=before;for(const [oldText,newText]of changes)expected=expected.replace(oldText,newText);assert.equal(source,expected);
for(const anchor of ['gate.start','gate.stop','stream.scrollTop','engine.frames','stock:invalidated'])assert.equal(source.split(anchor).length,before.split(anchor).length);
assert(!source.includes('Programma già calcolato:'));assert(source.includes('<h3>Preparazione programma ISO</h3>'));
await writeFile(path,source);const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
console.log('Testi barra ISO aggiornati. Modificati soltanto titolo, nota e nome della fase iniziale; logica e durata invariate.');
