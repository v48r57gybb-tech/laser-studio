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
html = html.replace('</head>', '<link rel="manifest" href="/manifest.webmanifest">\n<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon.png?v=1">\n<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png?v=1">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="Generatore ISO">\n<style>.brand-heading{display:flex;align-items:center;gap:20px}.brand-heading img{width:112px;height:112px;flex-shrink:0;border-radius:22px}.brand-heading h1{color:#f3f8fc;font-size:clamp(28px,5vw,46px)}.brand-product{color:#ff901a;font-size:clamp(23px,4vw,34px);font-weight:750;margin:8px 0}.brand-credit{clear:both;border-top:1px solid #376078;padding-top:16px;margin-top:20px;color:#bdd0de;font-size:15px;line-height:1.7}.brand-credit strong{color:#65f3ff}.brand-initials{color:#ffb55b;white-space:nowrap}@media(max-width:480px){.brand-heading{gap:12px}.brand-heading img{width:76px;height:76px;border-radius:16px}}</style>\n</head>');
const header = `<header><div><div class="brand-heading"><img src="/icons/generatore-512.png?v=1" alt="Logo Generatore ISO" width="112" height="112"><div><h1>Officina Smart CNC</h1><p class="brand-product">Generatore ISO</p></div></div><p>Rifili · Forature · Svasature · Maschiature</p><p>Controlli di riferimento: FANUC 0i-MF · FANUC 0i-MD</p><p class="muted">Programmi da verificare sul controllo e sulla macchina prima dell’utilizzo.</p><p class="brand-credit">Progettata e realizzata da <strong>CNC Process Optimizer</strong><br><span class="brand-initials">M. H. O.</span></p></div></header>`;
if(!/<header>[\s\S]*?<\/header>/.test(html)) throw new Error('Intestazione non riconosciuta');
html = html.replace(/<header>[\s\S]*?<\/header>/, header);
html = html.replace('<title>Generatore ISO · Officina Smart</title>', '<title>Officina Smart CNC · Generatore ISO</title>');
await writeFile('dist/index.html',html);
console.log('Logo, icone PNG, manifest e intestazione generati; generatori CNC copiati senza modifiche.');
