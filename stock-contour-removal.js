(function(root){
'use strict';
function compensate(ops,project,text){
 const lines=text.split(/\r?\n/);let cursor=0,contour=false;
 for(const op of ops){while(cursor<op.line){const l=(lines[cursor++]||'').trim();if(/^\((SPIANATURA|CONTORNATURA|FORATURA|TASTATURA|SMUSSATURA|TASCA|ASOLA)/.test(l))contour=l.startsWith('(CONTORNATURA');}op.stockContour=contour;}
 for(let i=0;i<ops.length;i++){if(!ops[i].nominalComp)continue;let j=i;while(j+1<ops.length&&ops[j+1].nominalComp)j++;const group=ops.slice(i,j+1),station=Number(/T(\d+)/.exec(group[0].toolName||'')?.[1]),tool=project.tools.find(t=>t.station===station);
 try{
  if(!group[0].stockContour||!['box','plate','cylinder'].includes(project.geometry.finished.type)||tool?.kind!=='mill')throw Error('Contorno non supportato');
  const side=/\bG41\b/.test(group[0].raw)?1:/\bG42\b/.test(group[0].raw)?-1:0;
  if(!side||!(/\bG40\b/.test(group.at(-1).raw)))throw Error('Attivazione o annullamento mancanti');
  const register=Number(/\bD(\d+)/.exec(group[0].raw)?.[1]);if(register!==station)throw Error('Registro D non associato');
  const r=tool.diameter/2;if(!(r>0&&Number.isFinite(r)))throw Error('Raggio non valido');
  const nodes=[group[0].from,...group.map(o=>o.to)],directions=[];
  for(let k=0;k<group.length;k++){const a=nodes[k],b=nodes[k+1],d=Math.hypot(b.x-a.x,b.y-a.y);if(group[k].type!=='feed'||Math.abs(b.z-a.z)>1e-7||d<1e-9||group[k].toolName!==group[0].toolName)throw Error('Movimento compensato non supportato');directions.push({x:(b.x-a.x)/d,y:(b.y-a.y)/d});}
  const shifted=[{...nodes[0]}];
  for(let k=1;k<nodes.length-1;k++){const p=nodes[k],a=directions[k-1],b=directions[k],ax=p.x-a.y*r*side,ay=p.y+a.x*r*side,bx=p.x-b.y*r*side,by=p.y+b.x*r*side,den=a.x*b.y-a.y*b.x;let x,y;if(Math.abs(den)<1e-9){if(a.x*b.x+a.y*b.y<0)throw Error('Inversione compensata');x=(ax+bx)/2;y=(ay+by)/2;}else{const t=((bx-ax)*b.y-(by-ay)*b.x)/den;x=ax+t*a.x;y=ay+t*a.y;}if(!Number.isFinite(x+y)||Math.hypot(x-p.x,y-p.y)>4*r)throw Error('Giunzione compensata non supportata');shifted.push({x,y,z:p.z});}
  shifted.push({...nodes.at(-1)});for(let k=0;k<group.length;k++){const o=group[k];o.programmedFrom={...o.from};o.programmedTo={...o.to};o.from=shifted[k];o.to=shifted[k+1];o.distance=Math.hypot(o.to.x-o.from.x,o.to.y-o.from.y,o.to.z-o.from.z);o.nominalCompensated=true;}
 }catch(e){for(const o of group)o.removalUnsupported=e.message;}i=j;
 }return ops;
}
function removeDisk(grid,x,y,z,r,tool){
 const {x0,y0,z0,cell,nx,ny,h,voidMask}=grid;
 for(let j=Math.max(0,Math.floor((y-r-y0)/cell));j<=Math.min(ny-1,Math.ceil((y+r-y0)/cell));j++)for(let i=Math.max(0,Math.floor((x-r-x0)/cell));i<=Math.min(nx-1,Math.ceil((x+r-x0)/cell));i++){const k=j*nx+i;if(voidMask[k])continue;const d=Math.hypot(x0+(i+.5)*cell-x,y0+(j+.5)*cell-y);if(d>r)continue;let target=z;if(tool?.kind==='chamfer'){const a=(tool.angle||90)*Math.PI/360;target=z+Math.max(0,d-(tool.tipDiameter||0)/2)/Math.tan(a);if(target-z>(tool.fluteLength||0))continue;}h[k]=Math.min(h[k],Math.max(z0,target));}
}
function drawStock({grid,quad,top,yaw}){
 const {x0,y0,z0,cell,nx,ny,h,voidMask}=grid;
 const height=(i,j)=>i<0||j<0||i>=nx||j>=ny||voidMask[j*nx+i]?z0:h[j*nx+i];
 let tiles=grid._drawTiles;
 if(!tiles||grid._drawYaw!==yaw){
  tiles=[];grid._drawTiles=tiles;grid._drawYaw=yaw;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)if(!voidMask[j*nx+i])tiles.push({i,j,depth:(x0+i*cell)*Math.sin(yaw)+(y0+j*cell)*Math.cos(yaw)});
  if(!top)tiles.sort((a,b)=>a.depth-b.depth);
 }
 const zRange=Math.max(0.001,grid.z1-z0);
 for(const tile of tiles){
  const i=tile.i,j=tile.j,k=j*nx+i,z=h[k];
  if(z<=z0+1e-5)continue;
  const x=x0+i*cell,y=y0+j*cell,x1=x+cell,y1=y+cell;
  if(!top){const sx=Math.sin(yaw)>=0?1:-1,sy=Math.cos(yaw)>=0?1:-1,xx=sx>0?x1:x,yy=sy>0?y1:y,bx=height(i+sx,j),by=height(i,j+sy);if(bx<z-1e-5)quad({x:xx,y,z:bx},{x:xx,y:y1,z:bx},{x:xx,y:y1,z},{x:xx,y,z},'#54788c');if(by<z-1e-5)quad({x,y:yy,z:by},{x:x1,y:yy,z:by},{x:x1,y:yy,z},{x,y:yy,z},'#7294a5');}
  const shade=Math.max(0,Math.min(255,Math.round(40+180*((z-z0)/zRange))));
  quad({x,y,z},{x:x1,y,z},{x:x1,y:y1,z},{x,y:y1,z},`rgb(${shade},${Math.round(shade*.8)},${Math.round(shade*.5)})`);
 }
}
root.StockContourRemoval={compensate,removeDisk,drawStock};
})(globalThis);
