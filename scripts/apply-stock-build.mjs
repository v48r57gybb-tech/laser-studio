import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fixToolBindings} from './stock-tool-bindings.mjs';

const files=['stock-ui.js','stock-sim.js'];
const libs=['stock-geometry-tools.mjs','stock-planning.mjs','stock-program.mjs','stock-workspace.mjs','stock-ui-model.mjs'];

await mkdir('dist/lib',{recursive:true});
for(const f of files)await copyFile(f,'dist/'+f);
for(const f of libs)await copyFile('lib/'+f,'dist/lib/'+f);
await writeFile('dist/stock-ui.js',fixToolBindings(await readFile('dist/stock-ui.js','utf8')));

let html=await readFile('dist/index.html','utf8');
if(!html.includes('<script src="stock-sim.js"></script>'))html=html.replace('</body>','<script src="stock-sim.js"></script>\n</body>');
if(!html.includes('<script type="module" src="stock-ui.js"></script>'))html=html.replace('</body>','<script type="module" src="stock-ui.js"></script>\n</body>');
await writeFile('dist/index.html',html);

for(const f of [...files,...libs.map(l=>'lib/'+l)]){
 if(!existsSync('dist/'+f))throw new Error('File build mancante: '+f);
}

console.log('Moduli lavorazione da grezzo inclusi nella build; collegamenti utensile corretti.');
