(function(root){
'use strict';
const TAU=2*Math.PI,EPS=1e-7;
function number(v){return v===null||v===undefined||String(v).trim()===''?NaN:Number(String(v).replace(',','.'));}
function fail(message){throw new Error('Lamatura: '+message);}
function positive(v,label){const n=number(v);if(!Number.isFinite(n)||n<=0)fail(label+' deve essere positivo.');return n;}
function fmt(v){const n=number(v);if(!Number.isFinite(n))fail('numero ISO non finito.');const r=Number(n.toFixed(4));return String(r)+(Number.isInteger(r)?'.':'');}
function point(p){const x=number(Array.isArray(p)?p[0]:p.x),y=number(Array.isArray(p)?p[1]:p.y);if(!Number.isFinite(x)||!Number.isFinite(y))fail('centro foro non valido.');return{x,y};}
function distanceSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
function plan(config,geometry){
 if(config.enabled!==true)return {enabled:false,centers:[],levels:[],radii:[]};
 const seat=positive(config.diameter,'diametro sede'),tool=positive(config.toolDiameter,'diametro fresa'),hole=positive(config.holeDiameter,'diametro foro di ingresso');
 if(tool<3||tool>8)fail('fresa ammessa da 3 a 8 mm.');
 if(seat<=tool||seat<=hole)fail('la sede deve essere maggiore di fresa e foro.');
 const clearance=number(config.entryMargin??0);if(!Number.isFinite(clearance)||clearance<0)fail('margine ingresso non valido.');
 if((hole-tool)/2<=clearance)fail('il foro non consente l’ingresso con il margine indicato.');
 if(config.compensation!=='wear'||config.wearConfirmed!==true)fail('confermare D per sola usura e correzione effettiva nominale zero.');
 const wear=number(config.effectiveWear);if(!Number.isFinite(wear)||wear!==0)fail('questo nucleo supporta solo correzione effettiva D pari a zero; usura non nulla non implementata.');
 const depth=positive(config.depth,'profondità'),safe=positive(config.safeZ,'Z sicurezza'),change=positive(config.toolChangeZ,'Z cambio utensile');
 if(safe<5||change<safe)fail('Z sicurezza almeno +5 e cambio utensile non inferiore alla sicurezza.');
 const height=positive(geometry.height,'spessore'),width=positive(geometry.width,'larghezza'),residual=number(config.minResidual);
 if(!Number.isFinite(residual)||residual<0||depth>=height||height-depth<residual-EPS)fail('fondo residuo insufficiente o non definito.');
 const station=number(config.tool),offset=number(config.offset);
 if(!Number.isInteger(station)||station<1||station>28||!Number.isInteger(offset)||offset<1||offset>28)fail('T/H e D devono essere interi da 1 a 28.');
 const rpm=positive(config.rpm,'giri S'),feed=positive(config.feed,'avanzamento F'),entryFeed=positive(config.entryFeed,'avanzamento ingresso');
 if(!['M8','M18','off'].includes(config.coolant))fail('refrigerante non valido.');
 const step=positive(config.radialStep,'passo radiale');if(step>tool/2)fail('passo radiale massimo pari a metà diametro fresa.');
 const levels=[1,2,3].map(n=>Number((-depth*n/3).toFixed(4)));
 if(!(levels[0]<0&&levels[1]<levels[0]&&levels[2]<levels[1]))fail('tre livelli non distinguibili alla risoluzione di 0,0001 mm.');
 const finish=(seat-tool)/2,lead=Number(Math.min(finish,(hole-tool-2*clearance)/4,step/2).toFixed(4));
 if(lead<=0||lead>finish||lead+tool/2>=hole/2-clearance)fail('spazio di ingresso/cancellazione compensazione insufficiente alla risoluzione configurata.');
 const n=Math.max(1,Math.ceil((finish-lead)/step));if(n>2000)fail('troppe passate radiali.');
 const radii=[lead,...Array.from({length:n},(_,i)=>lead+(finish-lead)*(i+1)/n)].filter((r,i,a)=>!i||r>a[i-1]+EPS);
 const centers=(geometry.centers||[]).map(point);if(!centers.length||centers.length>1000)fail('elenco centri assente o troppo lungo.');
 if(centers.length*levels.length*radii.length*2>50000)fail('numero di archi eccessivo.');
 const radius=seat/2;
 if(geometry.mode==='straight'){
  const length=positive(geometry.length,'lunghezza');
  for(const p of centers)if(p.x<radius-EPS||length-p.x<radius-EPS||Math.abs(p.y)+radius>width/2+EPS)fail('sede oltre i bordi del pezzo dritto.');
 }else if(geometry.mode==='arc'){
  if(geometry.edgeType!=='radial')fail('validazione dei rifili arco rettilinei non ancora implementata.');
  const R=positive(geometry.radius,'raggio arco'),cx=number(geometry.cx),cy=number(geometry.cy),start=number(geometry.startAngle),sweep=positive(geometry.sweep,'angolo arco'),direction=number(geometry.direction);
  if(![cx,cy,start].every(Number.isFinite)||![1,-1].includes(direction)||sweep>=TAU||R<=width/2)fail('settore arco non supportato o non valido.');
  const a=start,b=start+direction*sweep;
  const edge=t=>[{x:cx+(R-width/2)*Math.cos(t),y:cy+(R-width/2)*Math.sin(t)},{x:cx+(R+width/2)*Math.cos(t),y:cy+(R+width/2)*Math.sin(t)}];
  const e0=edge(a),e1=edge(b);
  for(const p of centers){
   const r=Math.hypot(p.x-cx,p.y-cy),angle=((direction*(Math.atan2(p.y-cy,p.x-cx)-start))%TAU+TAU)%TAU;
   if(Math.abs(r-R)>0.001||angle>sweep+EPS||r-radius<R-width/2-EPS||r+radius>R+width/2+EPS||distanceSegment(p,...e0)<radius-EPS||distanceSegment(p,...e1)<radius-EPS)fail('sede oltre i bordi o i rifili radiali dell’arco.');
  }
 }else fail('geometria non supportata.');
 for(let i=0;i<centers.length;i++)for(let j=i+1;j<centers.length;j++)if(Math.hypot(centers[i].x-centers[j].x,centers[i].y-centers[j].y)<seat-EPS)fail('lamature sovrapposte.');
 return {enabled:true,seat,tool,hole,depth,safe,change,height,width,residual,station,offset,rpm,feed,entryFeed,coolant:config.coolant,levels,radii,lead,centers,finish};
}
function emit(config,geometry){
 const p=plan(config,geometry);if(!p.enabled)return [];
 const a=['','(LAMATURA CON FRESA - PERCORSO CENTRO UTENSILE - D SOLO USURA ZERO)','T'+p.station+' M6 (FRESA LAMATURA D'+fmt(p.tool)+')','G90 G94 G17','G0 G43 H'+p.station+' Z'+fmt(p.change),'S'+fmt(p.rpm)+' M3',p.coolant==='off'?'M9':p.coolant];
 for(let i=0;i<p.centers.length;i++){
  const c=p.centers[i];a.push('(LAMATURA FORO '+(i+1)+')','G0 X'+fmt(c.x)+' Y'+fmt(c.y),'G0 Z'+fmt(p.safe));
  for(const z of p.levels){
   a.push('G1 Z'+fmt(z)+' F'+fmt(p.entryFeed),'G1 G41 D'+p.offset+' X'+fmt(c.x+p.lead)+' Y'+fmt(c.y)+' F'+fmt(p.feed));
   for(const r of p.radii){
    a.push('G1 X'+fmt(c.x+r)+' Y'+fmt(c.y)+' F'+fmt(p.feed));
    a.push('G3 X'+fmt(c.x-r)+' Y'+fmt(c.y)+' I'+fmt(-r)+' J0. F'+fmt(p.feed));
    a.push('G3 X'+fmt(c.x+r)+' Y'+fmt(c.y)+' I'+fmt(r)+' J0. F'+fmt(p.feed));
   }
   a.push('G1 X'+fmt(c.x+p.lead)+' Y'+fmt(c.y)+' F'+fmt(p.feed),'G1 G40 X'+fmt(c.x)+' Y'+fmt(c.y)+' F'+fmt(p.feed),'G0 Z'+fmt(p.safe));
  }
 }
 a.push('G0 Z'+fmt(p.change),'M9','M5','M1');return a;
}
root.CncCounterboreCore=Object.freeze({number,fmt,plan,emit});
})(globalThis);
