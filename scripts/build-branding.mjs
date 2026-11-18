import { mkdir, readdir, readFile, writeFile, cp } from 'node:fs/promises';
import sharp from 'sharp';
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
html = html.replace('<header><div>', '<header><div><img src="/icons/generatore-512.png?v=1" alt="Logo Generatore ISO" width="96" height="96" style="float:right;margin:0 0 16px 16px;border-radius:20px;max-width:25%;height:auto">');
if(!html.includes('alt="Logo Generatore ISO"')) throw new Error('Intestazione non riconosciuta');
await writeFile('dist/index.html',html);
console.log('Logo, icone PNG e manifest generati; generatori CNC copiati senza modifiche.');
