import { mkdir, readdir, readFile, writeFile, cp } from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';
for(const args of [['--check','interface-presentation.js'],['tests/interface-presentation-unit.mjs']]){const r=spawnSync(process.execPath,args,{encoding:'utf8'});if(r.error||r.status!==0)throw Error('Presentazione: '+(r.error?.message??r.stdout+'\n'+r.stderr));process.stdout.write(r.stdout);}
await mkdir('dist/icons', {recursive:true});
for (const e of await readdir('.', {withFileTypes:true})) {
 if (e.isFile() && /\.(html|js|css|webmanifest)$/.test(e.name)) await cp(e.name, 'dist/' + e.name);
}
for (const dir of ['icons','lib']) { try { await cp(dir, 'dist/' + dir, {recursive:true}); } catch(e) { if(e.code !== 'ENOENT') throw e; } }
const source = Buffer.from((await readFile('branding/logo.webp.base64','utf8')).trim(), 'base64');
const meta = await sharp(source).metadata();
if(meta.width !== 192 || meta.height !== 192) throw new Error('Logo sorgente non valido');
for(const [size,name] of [[192,'generatore-192.png'],[512,'generatore-512.png'],[180,'apple-touch-icon.png'],[32,'favicon.png']]) {
 await sharp(source).resize(size,size).png().toFile('dist/icons/' + name);
}
let html = await readFile('index.html','utf8');
html = html.replace('</head>', '<link rel="manifest" href="/manifest.webmanifest">\n<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon.png?v=1">\n<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png?v=1">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="Generatore ISO">\n</head>');
const header = await readFile('branding/header.html','utf8');
const css = await readFile('branding/header.css','utf8');
if(!/<header>[\s\S]*?<\/header>/.test(html)) throw new Error('Intestazione non riconosciuta');
html = html.replace(/<header>[\s\S]*?<\/header>/, header);
html = html.replace('</head>', '<style>' + css + '</style>\n</head>');
html = html.replace('<title>Generatore ISO · Officina Smart</title>', '<title>Officina Smart CNC · Generatore ISO</title>');
if(html.split('</body>').length!==2)throw Error('Presentazione: chiusura body non univoca');
html=html.replace('</body>','<script src="interface-presentation.js"></script>\n</body>');
await writeFile('dist/index.html',html);
await import('./finalize-arc-ui.mjs');
console.log('Icone, manifest e interfaccia generati. Nessuna modifica ai calcoli CNC.');
await import('./apply-project-analysis-build.mjs');
