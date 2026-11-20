import '../counterbore-core.js';
import {validateProject} from './stock-workspace.mjs';
import {generateProgram,composeProgram} from './stock-program.mjs';
import {prepareDrillingGroups,drillingPoints} from './stock-drilling-groups.mjs';
import {resolveGeometry,operationTool} from './stock-geometry-tools.mjs';
import {verifyMoves} from './stock-planning.mjs';
const finite=(v,name)=>{if(typeof v!=='number'||!Number.isFinite(v))throw Error('Lamatura grezzo: '+name+' non valido');return v;};
function diskFits(g,p,r){const f=g.finished,q={x:p.x+g.reference.x,y:p.y+g.reference.y};if(f.radius){const d=Math.hypot(q.x-f.radius,q.y-f.radius);return d+r<=f.radius+1e-7&&(!f.innerRadius||d-r>=f.innerRadius-1e-7);}let inside=false;for(let i=0,j=f.points.length-1;i<f.points.length;j=i++){const a=f.points[j],b=f.points[i];if((a.y>q.y)!==(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)inside=!inside;const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/(dx*dx+dy*dy||1)));if(Math.hypot(q.x-a.x-t*dx,q.y-a.y-t*dy)<r-1e-7)return false;}return inside;}
export function planCounterbore(input,parent,points=drillingPoints(parent.parameters)){
 const cb=parent.parameters.counterbore;if(cb?.enabled!==true)return null;
 if(parent.type!=='drilling'||!parent.enabled)throw Error('Lamatura grezzo: foro attivo richiesto');
 const project=validateProject(input),g=resolveGeometry(project.geometry),holeTool=project.tools.find(t=>t.id===parent.toolId),depth=finite(cb.depth,'profondità'),diameter=finite(cb.diameter,'diametro sede');
 if(!holeTool||holeTool.kind!=='drill')throw Error('Lamatura grezzo: punta del foro non trovata');
 const p=parent.parameters;let fullDepth;
 if(p.mode==='through'&&p.breakthroughConfirmed===true)fullDepth=g.finished.height;
 else if(p.fullDiameterDepth!==undefined){fullDepth=finite(p.fullDiameterDepth,'profondità a diametro pieno');if(fullDepth<=0||fullDepth>p.depth)throw Error('Lamatura grezzo: profondità cilindrica dichiarata oltre la punta');}
 else if(holeTool.tipAngle>0&&holeTool.tipAngle<180)fullDepth=p.depth-holeTool.diameter/2/Math.tan(holeTool.tipAngle*Math.PI/360);
 else throw Error('Lamatura grezzo: specificare angolo reale della punta o profondità del foro a diametro pieno');
 if(fullDepth<depth-1e-7)throw Error('Lamatura grezzo: foro a diametro pieno '+fullDepth.toFixed(3)+' mm, richiesti almeno '+depth+' mm; aumentare il preforo o ridurre la profondità della lamatura');
 if(points.some(q=>!diskFits(g,q,diameter/2)))throw Error('Lamatura grezzo: sede fuori dal materiale finito');
 const dummy={id:'counterbore-tool-check',type:'pocket',enabled:true,toolId:cb.toolId,parameters:{depth}},toolProject=structuredClone(project);toolProject.operations=[dummy];
 const snapshot=operationTool(toolProject,dummy.id),tool=snapshot.tool,cut=snapshot.parameters;
 // Riutilizzo della pianificazione geometrica; i movimenti emessi sotto sono centro-utensile G40, senza registro D.
 const plan=globalThis.CncCounterboreCore.plan({enabled:true,diameter,toolDiameter:tool.diameter,holeDiameter:holeTool.diameter,depth,safeZ:project.setup.safeZ,toolChangeZ:project.setup.changeZ,minResidual:cb.minResidual??0,entryMargin:cb.entryMargin??0,tool:tool.station,offset:tool.station,rpm:cut.rpm,feed:cut.feed,entryFeed:cut.entryFeed,coolant:cut.coolant,radialStep:cb.radialStep??Math.min(1,tool.diameter/2),compensation:'wear',effectiveWear:0,wearConfirmed:true},{mode:'straight',height:g.finished.height,width:g.finished.depth,length:g.finished.width,centers:points.map(q=>[q.x+g.reference.x,q.y+g.reference.y-g.finished.depth/2])});
 const moves=[],move=(code,coordinates,feed)=>{if(moves.length>=60000)throw Error('Lamatura grezzo: troppi movimenti');moves.push({type:'move',code,...coordinates,...(feed===undefined?{}:{feed})});};
 for(const c of points)for(const z of plan.levels){move('G0',{z:plan.safe});move('G0',{x:c.x,y:c.y});move('G1',{z},cut.entryFeed);for(const r of plan.radii){move('G1',{x:c.x+r,y:c.y},cut.feed);move('G3',{x:c.x-r,y:c.y,i:-r,j:0},cut.feed);move('G3',{x:c.x+r,y:c.y,i:r,j:0},cut.feed);}move('G1',{x:c.x,y:c.y},cut.feed);move('G0',{z:plan.safe});}
 verifyMoves(moves);return {kind:'stock-operation-plan',id:'counterbore-'+parent.id,type:'counterbore',parentOperationId:parent.id,tool:snapshot,coordinateMode:'tool-center',workOffset:'G56',safeZ:plan.safe,changeZ:plan.change,moves,limits:['Nominal predrill and ball-tip geometry only','No fixture or holder collision validation','Counterbore core currently supports mills 3–8 mm','Tool-center path, no D compensation emitted']};
}
export function generateGroupedProgram(input,options={}){
 const project=validateProject(input);if(!project.operations.some(o=>o.type==='drilling'&&o.enabled))return {...generateProgram(project,options),drillingGroups:[]};
 const prepared=prepareDrillingGroups(project),candidate=generateProgram(prepared.project,options),plans=[];
 for(const original of candidate.plans){const plan=structuredClone(original),groupId=prepared.fragmentToGroup[plan.id];if(!groupId){plans.push(plan);continue;}const group=prepared.groups.find(g=>g.id===groupId),previous=plans.at(-1);if(previous?.drillingGroupId===groupId){previous.moves.push(...plan.moves);if(previous.moves.length>60000)throw Error('Gruppo di foratura troppo lungo');}else{plan.id=groupId;plan.drillingGroupId=groupId;plan.sourceOperationIds=[...group.sourceOperationIds];plans.push(plan);}}
 const attached=[];for(const plan of plans){attached.push(plan);if(plan.type!=='drilling')continue;const parent=project.operations.find(o=>o.id===plan.id);if(parent?.parameters.counterbore?.enabled){const group=prepared.groups.find(g=>g.id===plan.id);attached.push(planCounterbore(project,parent,group.points));}}
 const composed=composeProgram(attached,{programNumber:options.programNumber??1,name:project.name});
 return {...composed,project,plans:attached,drillingGroups:prepared.groups};
}
