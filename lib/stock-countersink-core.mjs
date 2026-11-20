const E=1e-7;
const fail=s=>{throw Error('Svasatura: '+s);};
const num=(v,k)=>{if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e6)fail(k+' non valido');return v;};
const pos=(v,k)=>{if(num(v,k)<=0)fail(k+' positivo richiesto');return v;};
export function seatGeometry({diameter,referenceDiameter,toolDiameter,angle,tipDiameter,baseDepth=0,height,minResidual=0,lowerClearance=0,bottomClearanceConfirmed=false}){
 pos(diameter,'diametro sede');pos(referenceDiameter,'diametro riferimento');pos(toolDiameter,'diametro utensile');pos(height,'altezza');num(tipDiameter,'punta piana');num(baseDepth,'quota riferimento');num(minResidual,'residuo');num(lowerClearance,'spazio inferiore');
 if(![90,100].includes(angle))fail('angolo incluso 90 o 100 gradi richiesto');
 if(tipDiameter<0||tipDiameter>=referenceDiameter||baseDepth<0||minResidual<0||lowerClearance<0)fail('geometria o margini non validi');
 if(diameter<=referenceDiameter+E||diameter>toolDiameter+E)fail('diametro sede maggiore del riferimento e non oltre l’utensile richiesto');
 const tangent=Math.tan(angle*Math.PI/360),annularDepth=(diameter-referenceDiameter)/(2*tangent),tipDepth=baseDepth+(diameter-tipDiameter)/(2*tangent);
 if(baseDepth+annularDepth>=height-minResidual-E)fail('sede troppo profonda per altezza e residuo dichiarati');
 const beyond=Math.max(0,tipDepth-height);
 if(beyond>E&&(bottomClearanceConfirmed!==true||lowerClearance+E<beyond))fail('confermare almeno '+beyond.toFixed(3)+' mm liberi sotto il pezzo per la punta dello svasatore');
 return {diameter,referenceDiameter,toolDiameter,tipDiameter,baseDepth,tangent,annularDepth,annularEnd:baseDepth+annularDepth,tipDepth,z:-tipDepth,lowerClearanceRequired:beyond};
}
export function checkPredrill(seat,{holeDiameter,tipDepth,tipAngle,fullDiameterDepth,height,counterbore=null}){
 pos(holeDiameter,'diametro preforo');pos(tipDepth,'profondità preforo');pos(height,'altezza');
 let full,tan=null;
 if(fullDiameterDepth!==undefined){full=num(fullDiameterDepth,'profondità a diametro pieno');if(full<0||full>tipDepth+E)fail('profondità cilindrica oltre la punta del preforo');}
 else {if(typeof tipAngle!=='number'||!Number.isFinite(tipAngle)||tipAngle<=0||tipAngle>=180)fail('specificare angolo reale della punta o profondità a diametro pieno');tan=Math.tan(tipAngle*Math.PI/360);full=tipDepth-holeDiameter/(2*tan);}
 if(full<0)fail('preforo non arriva al diametro nominale sulla faccia superiore');
 if(counterbore&&(counterbore.diameter<=holeDiameter||counterbore.depth<=0||counterbore.depth>=height))fail('lamatura di riferimento non valida');
 const end=Math.min(seat.tipDepth,height);
 const radius=(z,below)=>{if(counterbore&&(below?z<counterbore.depth-E:z<=counterbore.depth+E))return counterbore.diameter/2;if(z<=full+E)return holeDiameter/2;return tan?Math.max(0,(tipDepth-z)*tan):0;};
 const breaks=[seat.annularEnd,end,full,tipDepth,...(counterbore?[counterbore.depth]:[])].filter(z=>z>=seat.annularEnd-E&&z<=end+E);
 for(const z of breaks){const cutter=Math.max(seat.tipDiameter/2,seat.diameter/2-(z-seat.baseDepth)*seat.tangent),available=Math.min(radius(z,false),z<end-E?radius(z,true):Infinity);if(cutter>available+E)fail('preforo insufficiente a Z-'+z.toFixed(3)+': raggio disponibile '+available.toFixed(3)+' mm, richiesto '+cutter.toFixed(3)+' mm; aumentare il preforo o ridurre la sede');}
 return {fullDiameterDepth:full};
}
export function diskFits(g,p,r){const f=g.finished,q={x:p.x+g.reference.x,y:p.y+g.reference.y};if(f.radius){const d=Math.hypot(q.x-f.radius,q.y-f.radius);return d+r<=f.radius+E&&(!f.innerRadius||d-r>=f.innerRadius-E);}let inside=false;for(let i=0,j=f.points.length-1;i<f.points.length;j=i++){const a=f.points[j],b=f.points[i];if((a.y>q.y)!==(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)inside=!inside;const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/(dx*dx+dy*dy||1)));if(Math.hypot(q.x-a.x-t*dx,q.y-a.y-t*dy)<r-E)return false;}return inside;}
