const EPS=1e-10;
export function createEditor({advanceMotion,motionDuration}){
 if(typeof advanceMotion!=='function'||typeof motionDuration!=='function')throw Error('Motore di riproduzione non collegato');
 function build(ops,rapidFeed=10000){
  if(!Array.isArray(ops))throw Error('Righe ISO mancanti');if(ops.length>200000)throw Error('Troppe righe per editor');if(!Number.isFinite(rapidFeed)||rapidFeed<=0)throw Error('Rapido nominale non valido');
  const segments=[];let cursor=null;
  for(const op of ops){if(!op||typeof op!=='object')throw Error('Riga ISO non valida');const point={x:op.x,y:op.y,z:op.z};for(const k of ['x','y','z'])if(!Number.isFinite(point[k]))throw Error('Riga '+(op.line??'?')+': '+k.toUpperCase()+' non valida');if(cursor){const d=Math.hypot(point.x-cursor.x,point.y-cursor.y,point.z-cursor.z);if(d>EPS)segments.push({from:cursor,to:point,rapid:op.rapid===true,feed:op.feed,line:op.line,tool:op.tool,distance:d})}cursor=point}
  return {segments,rapidFeed}
 }
 function state(ops,seconds,rapidFeed=10000){const {segments}=build(ops,rapidFeed);let index=0,progress=0,remaining=0;for(let i=0;i<segments.length;i++){const s=segments[i],duration=motionDuration({type:s.rapid?'rapid':'feed',distance:s.distance,feed:s.feed},rapidFeed);if(remaining+duration>seconds){index=i;progress=duration?(seconds-remaining)/duration:1;return {index,progress,segment:s,finished:false}}remaining+=duration}return {index:Math.max(0,segments.length-1),progress:1,segment:segments.at(-1)??null,finished:true}}
 function advance(ops,state,seconds,rapidFeed=10000){const {segments}=build(ops,rapidFeed);return advanceMotion(segments.map(s=>({type:s.rapid?'rapid':'feed',distance:s.distance,feed:s.feed,line:s.line})),state,seconds,{rapidFeed})}
 return {build,state,advance}
}
