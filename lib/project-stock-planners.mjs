import {planOperations} from './stock-planning.mjs';
import {composeProgram} from './stock-program.mjs';
import {resolveGeometry} from './stock-geometry-tools.mjs';
import {localPoint} from './project-phase-program.mjs';
import {createProjectPlannerBridge} from './project-planner-bridge.mjs';
import {fillInitialProjectDraft} from './project-initial-autofill.mjs';
export const generateWithExistingPlanners=createProjectPlannerBridge({planOperations,composeProgram,resolveGeometry,localPoint});
export function addPlannerDraft(analysis,draft,adaptive){
 const a=analysis.analysis??analysis,features=new Map(a.features.map(f=>[f.id,f]));let geometry=null,placement=null;
 try{const bounds=a.features.map(f=>{const get=(axis,type)=>{const rows=Object.entries(f.values??{}).filter(([k,v])=>k.endsWith('_'+axis+'_'+type+'_cad')&&Number.isFinite(v?.value)&&!['conflitto','ambiguo','mancante'].includes(v.status));return rows.length===1?rows[0][1].value:null};return {min:['x','y','z'].map(k=>get(k,'minimo')),max:['x','y','z'].map(k=>get(k,'massimo'))}}).find(b=>b.min.every((n,i)=>n!==null&&b.max[i]!==null&&b.max[i]>n));if(bounds){const points=Array.from({length:8},(_,mask)=>localPoint(bounds.min.map((n,i)=>mask&(1<<i)?bounds.max[i]:n),draft)),min=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));geometry={finished:{type:'box',width:max[0]-min[0],depth:max[1]-min[1],height:max[2]-min[2]},origin:{xy:'bottom-left'},allowances:{xMinus:0,xPlus:0,yMinus:0,yPlus:0,zMinus:0,zPlus:0}};placement=[min[0],min[1],max[2]]}}catch{}
 draft.planner={enabled:false,geometryConfirmed:false,toolsConfirmedForPlanning:false,geometryRole:'ENVELOPE_ONLY_NOT_STEP_SHAPE',geometry,placement,externalMargin:5,setup:{topFacedConfirmed:false,externalFinishedConfirmed:false,finishStockConfirmed:false}};
 for(const row of draft.rows){const r=adaptive.requests.find(r=>r.id===row.id),t=adaptive.tools.find(t=>t.id===r.toolId),f=features.get(r.featureId);let type=null,parameters={};if(t.kind==='drill'){type='drilling';parameters={pattern:'single',cycle:'G81',mode:r.through?'through':'blind',rPlane:2,q:null,breakthroughConfirmed:false}}else if(t.kind==='face'){type='facing';parameters={stepOver:Math.min(10,t.diameter/2)}}else if(t.kind==='mill'&&['pocket','slot'].includes(f?.kind)){type='pocket';parameters={shape:null,x:null,y:null,length:null,width:null,radius:null,angle:0,stepZ:1.5,stepOver:Math.min(3,t.diameter/2),entry:'ramp',rampAngle:null,finish:true,finishLeadMargin:1}}else if(t.kind==='mill'&&f?.kind==='profile'){type='roughing';parameters={radialStep:Math.min(3,t.diameter/2)}}else if(t.kind==='chamfer'){type='chamfer';parameters={width:null}}row.planner={type,parameters,toolGeometry:{}}}
 Object.assign(draft,fillInitialProjectDraft(analysis,draft,adaptive));
 // Selection is not approval: unresolved data must block complete generation.
 for(const row of draft.rows)row.enabled=true;
 return draft;
}
