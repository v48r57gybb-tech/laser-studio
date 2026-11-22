const MAX_CELLS=200000,MAX_WORK=5000000;
const number=(v,name)=>{if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e6)throw Error(name+' non valido');return v};
const positive=(v,name)=>{if(number(v,name)<=0)throw Error(name+' deve essere positivo');return v};
const point=(v,name)=>{if(!Array.isArray(v)||v.length!==3)throw Error(name+' richiede XYZ');return v.map(n=>number(n,name))};
export function createPhaseRemoval(config){
 if(config?.confirmed!==true)throw Error('Confermare dominio e utensili della bozza di asportazione');
 const min=point(config.min,'Min grezzo'),max=point(config.max,'Max grezzo'),cell=positive(config.cellSize,'Cella');
 const spans=max.map((v,i)=>v-min[i]);if(spans.some(v=>v<=0))throw Error('Dominio grezzo vuoto');
 const counts=spans.map(v=>Math.ceil(v/cell)),total=counts.reduce((a,b)=>a*b,1);
 if(!Number.isSafeInteger(total)||total>MAX_CELLS)throw Error('Limite 200000 voxel: aumentare la cella');
 const step=spans.map((v,i)=>v/counts[i]),voxelVolume=step.reduce((a,b)=>a*b,1),tools=new Map();
 if(!Array.isArray(config.tools)||!config.tools.length)throw Error('Utensili mancanti');
 for(const t of config.tools){
  if(!t||!Number.isInteger(t.station)||t.station<1||t.station>28||tools.has(t.station))throw Error('Stazione utensile non valida o duplicata');
  if(t.shape!=='flat-cylinder')throw Error('Solo utensili cilindrici a fondo piano lungo +Z');
  tools.set(t.station,{radius:positive(t.diameter,'Diametro')/2,length:positive(t.cuttingLength,'Tagliente')});
 }
 let occupied=new Uint8Array(total).fill(1),lastIndex=0,removed=0;
 const index=(x,y,z)=>(z*counts[1]+y)*counts[0]+x;
 const validate=m=>{
  if(!m||typeof m.rapid!=='boolean')throw Error('Movimento o rapido non valido');
  for(const k of ['x','y','z'])number(m[k],'Quota '+k);
  if(!tools.has(m.tool))throw Error('Utensile non configurato: '+m.tool);
 };
 function reset(){occupied.fill(1);lastIndex=0;removed=0;return stats()}
 function stats(){return {totalCells:total,removedCells:removed,remainingCells:total-removed,initialVolume:total*voxelVolume,removedVolume:removed*voxelVolume,remainingVolume:(total-removed)*voxelVolume,lastIndex,cellSize:[...step],approximate:true,collisionChecked:false,readyForMachine:false}}
 function replay(moves,toIndex=moves?.length-1){
  if(!Array.isArray(moves)||!moves.length||moves.length>20000)throw Error('Percorso richiesto, massimo 20000 punti');
  if(!Number.isInteger(toIndex)||toIndex<0||toIndex>=moves.length)throw Error('Indice percorso non valido');
  moves.forEach(validate);
  const next=new Uint8Array(total).fill(1);let removedNext=0,work=0;
  const charge=()=>{if(++work>MAX_WORK)throw Error('Limite calcolo: ridurre percorso o risoluzione')};
  for(let i=1;i<=toIndex;i++){
   const a=moves[i-1],b=moves[i];if(b.rapid)continue;
   if(a.tool!==b.tool)throw Error('Cambio utensile senza posizionamento rapido esplicito');
   const t=tools.get(b.tool),distance=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),samples=Math.max(1,Math.ceil(distance/(Math.min(...step)/2)));
   if(!Number.isFinite(samples)||samples>MAX_WORK)throw Error('Limite calcolo: segmento troppo lungo');
   for(let s=0;s<=samples;s++){
    charge();const f=s/samples,p=[a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f,a.z+(b.z-a.z)*f];
    const lower=[p[0]-t.radius,p[1]-t.radius,p[2]],upper=[p[0]+t.radius,p[1]+t.radius,p[2]+t.length];
    const lo=lower.map((v,k)=>Math.max(0,Math.ceil((v-min[k])/step[k]-.5))),hi=upper.map((v,k)=>Math.min(counts[k]-1,Math.floor((v-min[k])/step[k]-.5)));
    for(let z=lo[2];z<=hi[2];z++)for(let y=lo[1];y<=hi[1];y++)for(let x=lo[0];x<=hi[0];x++){
     charge();const key=index(x,y,z);if(!next[key])continue;
     const dx=min[0]+(x+.5)*step[0]-p[0],dy=min[1]+(y+.5)*step[1]-p[1];
     if(dx*dx+dy*dy<=t.radius*t.radius){next[key]=0;removedNext++}
    }
   }
  }
  occupied=next;removed=removedNext;lastIndex=toIndex;return stats();
 }
 function snapshot(){return {min:[...min],max:[...max],counts:[...counts],cellSize:[...step],occupied:occupied.slice(),...stats()}}
 return {reset,replay,stats,snapshot};
}
