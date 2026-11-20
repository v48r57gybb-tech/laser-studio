import assert from 'node:assert/strict';
import {Script,createContext} from 'node:vm';
export function patchSimulationArcs(source){
 const replace=(a,b)=>{assert.equal(source.split(a).length,2,'Parser simulatore cambiato: '+a);source=source.replace(a,b);};
 replace('else if(g===0||g===1){motion=g;cycle=null;}','else if([0,1,2,3].includes(g)){motion=g;cycle=null;}');
 replace("if(coords)move({x:axis('X'),y:axis('Y'),z:axis('Z')},motion===0?'rapid':'feed');",`if((motion===2||motion===3)&&(coords||has('I')||has('J'))){
   if(has('R')||has('K')||(!has('I')&&!has('J')))fail('Arco: richiesto centro incrementale I/J nel piano G17; R/K non supportati');
   const start={...pos},end={x:axis('X'),y:axis('Y'),z:axis('Z')},i=val('I')??0,j=val('J')??0,cx=start.x+i,cy=start.y+j,r=Math.hypot(i,j);
   const endRadius=Math.hypot(end.x-cx,end.y-cy);
   if(!Number.isFinite(r)||r<=0.0001||Math.abs(r-endRadius)>0.001)fail('Arco I/J degenere o raggi incoerenti');
   const a=Math.atan2(start.y-cy,start.x-cx),b=Math.atan2(end.y-cy,end.x-cx),tau=2*Math.PI;
   let sweep=motion===2?-((a-b+tau)%tau):((b-a+tau)%tau);
   if(Math.hypot(end.x-start.x,end.y-start.y)<1e-9)sweep=motion===2?-tau:tau;
   if(Math.abs(sweep)<1e-12)fail('Arco con ampiezza nulla');
   const angularStep=Math.min(Math.PI/36,2*Math.acos(Math.max(-1,Math.min(1,1-0.01/r))),0.5/r);
   const count=Math.ceil(Math.abs(sweep)/angularStep);
   if(!Number.isFinite(count)||count<1||count>200000-ops.length)fail('Arco troppo lungo per la simulazione');
   warnings.add('Archi G2/G3 nominali G17 I/J discretizzati: errore di corda massimo 0,01 mm; nessuna compensazione D reale.');
   for(let step=1;step<=count;step++){
    const t=step/count,angle=a+sweep*t;
    move(step===count?end:{x:cx+r*Math.cos(angle),y:cy+r*Math.sin(angle),z:start.z+(end.z-start.z)*t},'feed',{arc:motion});
   }
  }else if(coords)move({x:axis('X'),y:axis('Y'),z:axis('Z')},motion===0?'rapid':'feed');`);
 const context=createContext({});new Script(source).runInContext(context,{timeout:3000});
 const parse=context.CncSimulation.parseISO;
 const arc=(g)=>parse('G17 G90\nG0 X1 Y0 Z0\n'+g+' X0 Y1 I-1 J0 F100').filter(o=>o.arc);
 for(const g of ['G2','G3']){const a=arc(g);assert.ok(a.length>2);assert.equal(a.at(-1).to.x,0);assert.equal(a.at(-1).to.y,1);for(const o of a){assert.ok(Math.abs(Math.hypot(o.to.x,o.to.y)-1)<1e-9);assert.ok(o.distance<=0.501);assert.equal(o.line,3);}}
 assert.ok(arc('G2')[0].to.y<0);assert.ok(arc('G3')[0].to.y>0);
 const full=parse('G0 X1 Y0 Z0\nG2 I-1 J0');assert.ok(full.filter(o=>o.arc).length>50);assert.equal(full.at(-1).to.x,1);assert.equal(full.at(-1).to.y,0);
 const modal=parse('G0 X1 Y0 Z0\nG3 X0 Y1 I-1 J0\nX-1 Y0 I0 J-1');assert.equal(modal.at(-1).to.x,-1);assert.equal(modal.at(-1).arc,3);
 const incremental=parse('G0 X1 Y0 Z0\nG91 G3 X-1 Y1 I-1 J0');assert.equal(incremental.at(-1).to.x,0);assert.equal(incremental.at(-1).to.y,1);
 const screenshot=parse(Array(166).fill('(test)').join('\n')+'\nG0 X0 Y-100.5 Z0\nG2 X-0.5 Y-100. I0. J0.5 F1000.');assert.equal(screenshot.at(-1).line,168);assert.equal(screenshot.at(-1).to.x,-0.5);assert.equal(screenshot.at(-1).to.y,-100);
 for(const invalid of ['G2 X2 Y0 I-1 J0','G2 X0 Y1 R1','G2 X0 Y1 I0 J0','G18 G2 X0 Z1 I-1 K0'])assert.throws(()=>parse('G0 X1 Y0 Z0\n'+invalid));
 const linear=parse('G0 X0 Y0 Z10\nG1 X5 Y6 Z-1 F100');assert.equal(linear.at(-1).to.x,5);assert.equal(linear.at(-1).to.z,-1);assert.equal(linear.at(-1).arc,undefined);
 return source;
}
