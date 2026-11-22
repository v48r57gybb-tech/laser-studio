import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePhasePreviewISO as parse} from '../lib/project-phase-preview-iso.mjs';
const head='G21 G17 G90 G94\nT1 M6\nG0 X10 Y0 Z0\n';
const arc=(block)=>parse(head+block+'\nM30');
test('G3: quarto di cerchio, centro, riga originale e punto finale',()=>{
 const moves=arc('G3 X0 Y10 I-10 J0 F100'),a=moves.slice(1);
 assert.ok(a.length>=18);assert.ok(a.every(p=>p.x>=-1e-8&&p.y>=0));
 for(const p of a){assert.ok(Math.abs(Math.hypot(p.x,p.y)-10)<1e-8);assert.equal(p.line,4);assert.equal(p.tool,1);assert.equal(p.feed,100)}
 assert.equal(a.at(-1).x,0);assert.equal(a.at(-1).y,10);
});
test('G2: quarto orario e arco maggiore',()=>{
 const cw=arc('G2 X0 Y-10 I-10 J0 F100');assert.ok(cw.slice(1).every(p=>p.y<=1e-8&&p.x>=-1e-8));
 const major=arc('G2 X0 Y10 I-10 J0 F100');assert.ok(major.some(p=>p.x<-9));assert.ok(major.some(p=>p.y<-9));
});
test('cerchio completo in entrambe le direzioni',()=>{
 for(const g of [2,3]){const m=arc('G'+g+' I-10 J0 F100');assert.ok(m.length>=73);assert.equal(m.at(-1).x,10);assert.equal(m.at(-1).y,0);assert.equal(Math.sign(m[1].y),g===2?-1:1)}
});
test('modalita arco e ritorno lineare',()=>{
 const m=arc('G3 X0 Y10 I-10 F100\nX-10 Y0 J-10\nG1 X-15');
 assert.equal(m.at(-1).x,-15);assert.equal(m.at(-1).y,0);assert.equal(m.at(-1).arc,undefined);
});
test('regressione lineare e coordinate modali',()=>{
 const m=arc('G1 Z-2 F200\nX20\nG0 Z5');assert.equal(m.length,4);
 assert.deepEqual(m.at(-1),{x:20,y:0,z:5,rapid:true,tool:1,feed:null,line:6});
});
test('geometrie e formati non supportati vengono rifiutati',()=>{
 for(const block of ['G3 X0 Y10 F100','G3 X0 Y9 I-10 F100','G3 X0 Y10 I0 J0 F100','G3 X0 Y10 Z1 I-10 F100','G3 X0 Y10 R10 F100','G18','G19','G91','G90.1','G91.1','G20','G81 X0','G2 G3 I-10 F100','G1 X1 X2 F100','G1 X1 I1 F100'])assert.throws(()=>arc(block),undefined,block);
 assert.throws(()=>parse('G21 G90\nT1\nG0 X10 Y0 Z0\nG3 I-10 F100'),/G17/);
 assert.throws(()=>parse('G21 G17 G90\nT1\nG3 X0 Y10 I-10 F100'),/inizializzato/);
 assert.throws(()=>arc('G3 X0 Y10 I-10'),/Avanzamento/);
});
test('sintassi, fine programma e limite punti',()=>{
 assert.throws(()=>arc('G3 X0 Y10 I-10 F100 #1'),/Sintassi/);
 assert.throws(()=>parse(head+'M30\nG1 X2 F100'),/dopo M30/);
 assert.throws(()=>parse(head+'G3 I-10 F100\n'+'I-10\n'.repeat(300)),/Limite/);
});
