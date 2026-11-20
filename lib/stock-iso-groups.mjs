import {validateProject} from './stock-workspace.mjs';
import {generateProgram,composeProgram} from './stock-program.mjs';
import {prepareDrillingGroups} from './stock-drilling-groups.mjs';
export function generateGroupedProgram(input,options={}){
 const project=validateProject(input);if(!project.operations.some(o=>o.type==='drilling'&&o.enabled))return {...generateProgram(project,options),drillingGroups:[]};
 const prepared=prepareDrillingGroups(project),candidate=generateProgram(prepared.project,options),plans=[];
 for(const original of candidate.plans){const plan=structuredClone(original),groupId=prepared.fragmentToGroup[plan.id];if(!groupId){plans.push(plan);continue;}const group=prepared.groups.find(g=>g.id===groupId),previous=plans.at(-1);if(previous?.drillingGroupId===groupId){previous.moves.push(...plan.moves);if(previous.moves.length>60000)throw Error('Gruppo di foratura troppo lungo');}else{plan.id=groupId;plan.drillingGroupId=groupId;plan.sourceOperationIds=[...group.sourceOperationIds];plans.push(plan);}}
 const composed=composeProgram(plans,{programNumber:options.programNumber??1,name:project.name});
 return {...composed,project,plans,drillingGroups:prepared.groups};
}
