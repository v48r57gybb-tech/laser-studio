import test from 'node:test';
import assert from 'node:assert/strict';
import {addPlannerDraft} from '../lib/project-stock-planners.mjs';
function fixture(){
 const analysis={part:{units:'mm'},features:[{id:'F001',kind:'profile',values:{}},{id:'F020',kind:'hole',values:{}}],proposals:[],open_issues:[]};
 const tools=[{id:'mill',kind:'mill',diameter:10,parameters:{rpm:1000,feed:100,entryFeed:50}},{id:'drill',kind:'drill',diameter:4,parameters:{rpm:1000,feed:100,entryFeed:50}}];
 const requests=[{id:'r1',phaseId:'SETUP01',operationId:'OP003',featureId:'F001',toolId:'mill',depth:2},{id:'r2',phaseId:'SETUP01',operationId:'OP006',featureId:'F020',toolId:'drill',depth:20}];
 const draft={phaseId:'SETUP01',origin:[0,0,0],u:[1,0,0],v:[0,1,0],w:[0,0,1],acknowledgeDraft:false,allowPartial:false,reviewedIssueIds:[],rows:requests.map(r=>({id:r.id,enabled:r.toolId==='drill',depth:r.depth,path:null}))};
 return {analysis,draft,adaptive:{tools,requests}};
}
test('initial phase includes mill and drill requests',()=>{
 const {analysis,draft,adaptive}=fixture();
 const result=addPlannerDraft(analysis,draft,adaptive);
 assert.deepEqual(result.rows.map(r=>[r.id,r.enabled]),[['r1',true],['r2',true]]);
});
test('selection does not approve draft, tools, geometry or partial generation',()=>{
 const {analysis,draft,adaptive}=fixture();
 const result=addPlannerDraft(analysis,draft,adaptive);
 assert.equal(result.acknowledgeDraft,false);
 assert.equal(result.allowPartial,false);
 assert.deepEqual(result.reviewedIssueIds,[]);
 for(const key of ['enabled','geometryConfirmed','toolsConfirmedForPlanning'])assert.equal(result.planner[key],false);
 assert.equal(result.planner.setup.topFacedConfirmed,false);
 assert.equal(result.autoFill.confirmationsApplied,false);
});
test('missing pocket geometry remains unresolved and no path is invented',()=>{
 const {analysis,draft,adaptive}=fixture();analysis.features[0].kind='pocket';
 const result=addPlannerDraft(analysis,draft,adaptive),row=result.rows[0];
 assert.equal(row.enabled,true);
 assert.equal(row.planner.type,'pocket');
 for(const key of ['shape','x','y','length','width','radius'])assert.equal(row.planner.parameters[key],null);
 assert.equal(row.path,null);
});
