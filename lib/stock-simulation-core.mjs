const E=1e-7;
const number=(n,label)=>{if(typeof n!=='number'||!Number.isFinite(n))throw Error(label+' non valido');return n;};
function inside(x,y,points){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[j],b=points[i];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
export function createStock(g,{resolution=80}={}){
 if(!Number.isInteger(resolution)||resolution<8||resolution>256)throw Error('Risoluzione 8–256 richiesta');
 const s=g.stock,ref=g.reference,placement=g.stockPlacement,w=number(s.width,'Larghezza grezzo'),d=number(s.depth,'Profondità grezzo');if(w<=0||d<=0||s.zMax<=s.zMin)throw Error('Ingombro grezzo non valido');
 const target=Math.max(w,d)/resolution,nx=Math.max(1,Math.ceil(w/target)),ny=Math.max(1,Math.ceil(d/target)),dx=w/nx,dy=d/ny,x0=placement.x-ref.x,y0=placement.y-ref.y;
 const h=new Float32Array(nx*ny).fill(s.zMax),voidMask=new Uint8Array(nx*ny);
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=(i+.5)*dx,y=(j+.5)*dy;let material;if(s.radius){const r=Math.hypot(x-s.radius,y-s.radius);material=r<=s.radius&&(!s.innerRadius||r>=s.innerRadius);}else{if(!Array.isArray(s.points))throw Error('Sezione reale del grezzo mancante');material=inside(x,y,s.points);}if(!material)voidMask[j*nx+i]=1;}
 return {x0,y0,x1:x0+w,y1:y0+d,z0:s.zMin,z1:s.zMax,nx,ny,dx,dy,h,voidMask};
}
export function cutterSurface(tool,tipZ,radius){
 const R=number(tool.diameter,'Diametro utensile')/2;if(R<=0)throw Error('Diametro utensile positivo richiesto');number(tipZ,'Z punta');number(radius,'Distanza radiale');if(radius<0||radius>R+E)return null;
 if(['face','mill'].includes(tool.kind))return tipZ;
 if(!['drill','chamfer','spot'].includes(tool.kind))return null;
 const angle=tool.kind==='drill'?tool.tipAngle:tool.angle;
 if(typeof angle!=='number'||!Number.isFinite(angle)||angle<=0||angle>=180)throw Error('Angolo reale mancante per '+tool.kind+' T'+tool.station);
 const flat=tool.kind==='drill'?0:tool.tipDiameter;if(typeof flat!=='number'||!Number.isFinite(flat)||flat<0||flat>=tool.diameter)throw Error('Diametro punta piana mancante/non valido per T'+tool.station);
 return tipZ+Math.max(0,radius-flat/2)/Math.tan(angle*Math.PI/360);
}
export function removeAt(grid,tool,x,y,z){
 const R=tool.diameter/2;number(x,'X utensile');number(y,'Y utensile');cutterSurface(tool,z,0);
 const i0=Math.max(0,Math.floor((x-R-grid.x0)/grid.dx)),i1=Math.min(grid.nx-1,Math.ceil((x+R-grid.x0)/grid.dx)),j0=Math.max(0,Math.floor((y-R-grid.y0)/grid.dy)),j1=Math.min(grid.ny-1,Math.ceil((y+R-grid.y0)/grid.dy));
 for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=j*grid.nx+i;if(grid.voidMask[k])continue;const r=Math.hypot(grid.x0+(i+.5)*grid.dx-x,grid.y0+(j+.5)*grid.dy-y),surface=cutterSurface(tool,z,r);if(surface!==null)grid.h[k]=Math.max(grid.z0,Math.min(grid.h[k],surface));}
}
export function cutInterval(grid,op,a,b){
 if(op.type!=='feed'||op.compensationActive||!op.geometryTool||!['face','mill','drill','chamfer','spot'].includes(op.geometryTool.kind)||b<=a)return 0;
 if(a<0||b>1)throw Error('Intervallo simulazione non valido');const from=op.from,to=op.to,distance=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z),n=Math.max(1,Math.ceil(distance*(b-a)/(Math.min(grid.dx,grid.dy)/2)));if(n>200000)throw Error('Segmento troppo lungo per questa risoluzione');
 for(let j=0;j<=n;j++){const t=a+(b-a)*j/n;removeAt(grid,op.geometryTool,from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t,from.z+(to.z-from.z)*t);}return n+1;
}
export function replay(g,ops,index,progress,options){if(!Number.isInteger(index)||index<0||index>=ops.length||progress<0||progress>1)throw Error('Posizione simulazione non valida');const grid=createStock(g,options);let samples=0;for(let i=0;i<=index;i++){samples+=cutInterval(grid,ops[i],0,i===index?progress:1);if(samples>1000000)throw Error('Riproduzione troppo lunga: ridurre risoluzione o programma');}return grid;}
export function stockStats(grid){let min=Infinity,max=-Infinity,removedVolume=0,cells=0;for(let i=0;i<grid.h.length;i++)if(!grid.voidMask[i]){cells++;min=Math.min(min,grid.h[i]);max=Math.max(max,grid.h[i]);removedVolume+=(grid.z1-grid.h[i])*grid.dx*grid.dy;}return {min:cells?min:null,max:cells?max:null,removedVolume,cells};}
export function geometrySuggestions(project,g){const items=[],margin=project.setup?.externalMargin,safe=project.setup?.safeZ;if(typeof margin==='number'&&margin>0){const proposed=g.stock.zMax+margin;if(!(safe>g.stock.zMax))items.push({kind:'safeZ',value:proposed,label:'Proponi Z sicura '+proposed.toFixed(3)+' mm (grezzo + margine dichiarato; staffe da verificare)'});const required=Math.max(safe??0,proposed);if(!(project.setup.changeZ>required))items.push({kind:'changeZ',value:required+margin,label:'Proponi cambio Z '+(required+margin).toFixed(3)+' mm (corse e attrezzaggio da verificare)'});}
 for(const op of project.operations.filter(o=>o.enabled&&o.type==='pocket')){const p=op.parameters,t=project.tools.find(t=>t.id===op.toolId),cap=Math.min(p.width,p.length,p.shape==='obround'?Infinity:2*p.radius);if(t&&t.diameter>=cap){const candidate=project.tools.filter(q=>q.kind==='mill'&&q.diameter<cap).sort((a,b)=>b.diameter-a.diameter)[0];if(candidate)items.push({kind:'tool',operationId:op.id,toolId:candidate.id,label:'Per '+op.id+' proponi T'+candidate.station+' Ø'+candidate.diameter+'; ingresso e parametri ancora da verificare'});}}
 return {fingerprint:JSON.stringify(project),items};
}
export function applySuggestion(project,analysis,index){if(JSON.stringify(project)!==analysis.fingerprint)throw Error('Progetto cambiato: ricalcolare le proposte');const item=analysis.items[index];if(!item)throw Error('Proposta non trovata');const p=structuredClone(project);if(item.kind==='safeZ'||item.kind==='changeZ')p.setup[item.kind]=item.value;else if(item.kind==='tool'){const op=p.operations.find(o=>o.id===item.operationId);if(!op||!p.tools.some(t=>t.id===item.toolId))throw Error('Riferimento proposta non valido');op.toolId=item.toolId;}else throw Error('Proposta non supportata');return p;}
