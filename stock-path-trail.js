(function(root){
'use strict';
function segments(ops,index,progress,budget=80){
 const out=[],current=ops[index];if(!current||!(budget>0))return out;let age=0;
 for(let k=index;k>=0&&age<budget&&index-k<2048;k--){const o=ops[k];if(o.toolName!==current.toolName)break;const length=Math.hypot(o.to.x-o.from.x,o.to.y-o.from.y,o.to.z-o.from.z),end=k===index?Math.max(0,Math.min(1,progress)):1;if(length<1e-9||end===0)continue;const amount=Math.min(length*end,budget-age),begin=end-amount/length;const point=t=>({x:o.from.x+(o.to.x-o.from.x)*t,y:o.from.y+(o.to.y-o.from.y)*t,z:o.from.z+(o.to.z-o.from.z)*t});if(o.type==='feed')out.push({from:point(begin),to:point(end),alphaFrom:.85*(1-(age+amount)/budget)**2,alphaTo:.85*(1-age/budget)**2});age+=amount;}
 return out.reverse();
}
function draw(ctx,ops,index,progress,screen,project){
 const op=ops[index];if(!op)return;const station=Number(/T(\d+)/.exec(op.toolName||'')?.[1]),tool=project.tools.find(t=>t.station===station),budget=Math.max(30,Math.min(120,(tool?.diameter||20)*3)),color=root.StockToolVisual?.colors[tool?.kind]||[87,224,239];
 ctx.save();ctx.lineWidth=1.6;ctx.lineCap='round';
 for(const line of segments(ops,index,progress,budget)){const a=screen(line.from),b=screen(line.to);if(Math.hypot(b.x-a.x,b.y-a.y)<.01)continue;const g=ctx.createLinearGradient(a.x,a.y,b.x,b.y);g.addColorStop(0,'rgba('+color.join(',')+','+line.alphaFrom+')');g.addColorStop(1,'rgba('+color.join(',')+','+line.alphaTo+')');ctx.strokeStyle=g;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
 if(op.type==='rapid'&&progress>0){const t=Math.min(1,progress),a=screen(op.from),b=screen({x:op.from.x+(op.to.x-op.from.x)*t,y:op.from.y+(op.to.y-op.from.y)*t,z:op.from.z+(op.to.z-op.from.z)*t});ctx.setLineDash([4,6]);ctx.strokeStyle='rgba(133,177,203,.25)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
 ctx.restore();
}
root.StockPathTrail={segments,draw};
})(globalThis);
