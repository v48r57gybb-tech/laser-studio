export function uBendPlan({left,web,right,thickness,radius,k=0.4}){
 const values=[left,web,right,thickness,radius,k];
 if(!values.every(v=>typeof v==='number'&&Number.isFinite(v))||thickness<=0||radius<0||k<0||k>0.5||Math.max(left,web,right,thickness,radius)>10000)throw Error('Parametri non validi');
 const setback=radius+thickness,allowance=Math.PI/2*(radius+k*thickness),deduction=2*setback-allowance;
 const straight=[left-setback,web-2*setback,right-setback];
 if(straight.some(v=>v<=0))throw Error('Facce rettilinee non positive');
 const total=straight.reduce((a,b)=>a+b,0)+2*allowance;
 return {units:'mm',angles:[90,90],k,setback,allowancePerBend:allowance,deductionPerBend:deduction,straightLengths:straight,totalLength:total,bendCenterPositions:[straight[0]+allowance/2,straight[0]+allowance+straight[1]+allowance/2],assumptions:['Quote esterne ai vertici teorici','Due pieghe a 90 gradi','K ipotizzato, non validato'],productionReady:false};
}
