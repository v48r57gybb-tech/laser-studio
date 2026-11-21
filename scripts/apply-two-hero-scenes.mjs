import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const htmlPath='dist/index.html',html=await readFile(htmlPath,'utf8'),ui=await readFile('dist/interface-presentation.js','utf8');
assert(html.includes('id="heroCompactLayout"'),'Applicare prima il layout compatto');
assert.equal((html.match(/id="cncHeroWorkpiece"/g)||[]).length,1,'Deve restare una sola vignetta');
assert(!html.includes('id="cncHeroPause"')&&!html.includes('id="cncHeroHint"'),'Pausa e istruzioni visibili non devono ricomparire');
assert(!ui.includes("const canvas=document.createElement('canvas')"),'Animazione duplicata ancora presente');
assert(html.indexOf('src="stock-tool-visuals.js"')>=0&&html.indexOf('src="stock-tool-visuals.js"')<html.indexOf('src="hero-workpiece.js"'),'Ordine renderer utensili non valido');
for(const args of [['--check','hero-two-scenes.js'],['tests/hero-two-scenes.cjs']]){const r=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(r.status,0,r.stdout+'\n'+r.stderr);process.stdout.write(r.stdout);}
const changed=html.replace(/(<canvas\b[^>]*\bid="cncHeroWorkpiece"[^>]*\baria-label=")[^"]*(")/, '$1Due scene CNC illustrative: zero al centro oppure sullo spigolo; spianatura, contorno, finitura, smusso, fori, tasca e scanalature X Y.$2');
assert.notEqual(changed,html,'Descrizione accessibile canvas non individuata');
await copyFile('hero-two-scenes.js','dist/hero-workpiece.js');await writeFile(htmlPath,changed);
console.log('Due scene integrate nella sola vignetta compatta. Utensili condivisi, layout e controlli esistenti conservati. ISO, simulatore operativo e autenticazione non modificati. Verifica visiva browser ancora necessaria.');
