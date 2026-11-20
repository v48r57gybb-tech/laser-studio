(function(root){
'use strict';
const colors={face:[255,134,28],mill:[255,134,28],drill:[45,167,255],spot:[45,167,255],chamfer:[217,70,239],tap:[16,185,129],probe:[237,55,89]};
function model(t){
 const R=t.diameter/2;if(!(Number.isFinite(R)&&R>0))throw Error('Diametro utensile grafico non valido');
 const L=t.fluteLength>0?t.fluteLength:Math.max(8,t.diameter*2),rings=[],add=(z,r)=>rings.push({z,r});
 if(t.kind==='probe'){for(let j=0;j<=16;j++){const a=Math.PI*j/16;add(R*(1-Math.cos(a)),R*Math.sin(a));}add(2*R,Math.min(1,R/3));add(2*R+20,Math.min(1,R/3));add(2*R+20,Math.max(4,R));add(2*R+35,Math.max(4,R));}
 else if(['drill','spot'].includes(t.kind)){const a=(t.tipAngle>0&&t.tipAngle<180?t.tipAngle:118)*Math.PI/360,tip=Math.min(L,R/Math.tan(a));add(0,0);add(tip,R);add(L,R);}
 else if(t.kind==='chamfer'){const a=(t.angle>0&&t.angle<180?t.angle:90)*Math.PI/360,tip=Math.max(0,(t.tipDiameter||0)/2);if(tip>=R)throw Error('Punta smussatore grafica non valida');add(0,0);add(0,tip);add((R-tip)/Math.tan(a),R);add(Math.max(L,(R-tip)/Math.tan(a)),R);}
 else{add(0,0);add(0,R);add(L,R);}
 const end=rings.at(-1).z,shank=t.shankDiameter>0?t.shankDiameter/2:t.kind==='face'?Math.min(10,R):R,neck=t.shankLength>0?t.shankLength:25,base=end+neck,flange=Math.max(18,shank+4);
 add(end,shank);add(base,shank);add(base,Math.max(shank,flange*.65));add(base+6,flange*.75);add(base+6,flange);add(base+11,flange);add(base+11,flange*.78);add(base+39,Math.max(6,flange*.32));add(base+42,Math.max(6,flange*.32));add(base+42,0);
 return {rings,cutLength:L,cutterRadius:R,color:colors[t.kind]||colors.mill,illustrativeHolder:true};
}
function draw(ctx,p,tool,project,time,yaw){
 const m=model(tool),faces=[],point=(z,r,a)=>({x:p.x+r*Math.cos(a),y:p.y+r*Math.sin(a),z:p.z+z}),segments=32;
 for(let j=1;j<m.rings.length;j++)for(let k=0;k<segments;k++){const a=k*2*Math.PI/segments,b=(k+1)*2*Math.PI/segments,lo=m.rings[j-1],hi=m.rings[j],v=[point(lo.z,lo.r,a),point(lo.z,lo.r,b),point(hi.z,hi.r,b),point(hi.z,hi.r,a)],depth=v.reduce((s,q)=>s+q.x*Math.sin(yaw)+q.y*Math.cos(yaw),0)/4,light=.58+.4*(.5+.5*Math.cos(a-.8)),cut=tool.kind==='probe'?hi.z<=tool.diameter+1e-6:hi.z<=m.cutLength+1e-6;faces.push({v,depth,light,cut});}
 faces.sort((a,b)=>a.depth-b.depth);ctx.save();
 for(const f of faces){ctx.beginPath();f.v.forEach((q,i)=>{const s=project(q);if(i)ctx.lineTo(s.x,s.y);else ctx.moveTo(s.x,s.y);});ctx.closePath();const c=f.cut?m.color:[184,199,210];ctx.fillStyle='rgb('+c.map(v=>Math.round(v*f.light)).join(',')+')';ctx.fill();}
 if(['mill','drill','spot','tap'].includes(tool.kind)){const count=tool.kind==='mill'?4:2,rate=tool.kind==='tap'?1.5:.24;ctx.strokeStyle='rgba(12,30,44,.8)';ctx.lineWidth=1.2;for(let h=0;h<count;h++){let open=false;ctx.beginPath();for(let j=0;j<=80;j++){const z=m.cutLength*j/80,a=h*2*Math.PI/count+z*rate+time*3,r=['drill','spot'].includes(tool.kind)?Math.min(m.cutterRadius,z*Math.tan((tool.tipAngle||118)*Math.PI/360)):m.cutterRadius;if(Math.sin(a)*Math.cos(yaw)+Math.cos(a)*Math.sin(yaw)<0){open=false;continue;}const s=project(point(z,r,a));if(open)ctx.lineTo(s.x,s.y);else ctx.moveTo(s.x,s.y);open=true;}ctx.stroke();}}
 const tip=project(p);ctx.fillStyle='#ffba4a';ctx.beginPath();ctx.arc(tip.x,tip.y,2,0,2*Math.PI);ctx.fill();ctx.restore();
}
root.StockToolVisual={model,draw,colors};
})(globalThis);
