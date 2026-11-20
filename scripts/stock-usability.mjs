import assert from 'node:assert/strict';
export function improveStockUI(source){let s=source;function once(a,b){assert.equal(s.split(a).length,2,'UI cambiata: patch usabilita non applicabile '+a.slice(0,60));s=s.replace(a,b);}
 once('catch(e){message(e.message,true);}', 'catch(e){message(e.message,true);reportStockError(e,form);}');
 once("function info(host,text){const d=document.createElement('details');d.className='muted';const s=document.createElement('summary');s.textContent='Informazioni';d.append(s,document.createTextNode(text));host.append(d);}", 'function info(host,text){stockInfo(host,text);}');
 once("const p=collect(),result=generateProgram(p);", "const p=collect();checkStockInputs(p);const result=generateProgram(p);");
 once("collect();const type=$('stOpType').value;const tool=", "collect();const type=$('stOpType').value;if(type==='drilling'){const raw=$('stockNewHoleDiameter')?.value??prompt('Diametro punta in mm','6.8');if(raw===null)return;project=assignDrill(project,numericInput(raw,'Diametro punta')).project;}const tool=");
 once('parameters:structuredClone(defaults[type])', 'parameters:stockOperationDefaults(type,defaults[type],project)');
 once('box.append(legend);const loaded=', 'box.dataset.toolId=t.id;box.append(legend);const loaded=');
 once("check.type='checkbox';check.checked=t.loaded;", "check.type='checkbox';check.dataset.toolField='loaded';check.checked=t.loaded;");
 once("['fluteLength','Lunghezza tagliente (mm)']", "['fluteLength','Lunghezza tagliente (mm)'],...(t.kind==='chamfer'?[['angle','Angolo incluso (gradi)'],['tipDiameter','Diametro punta piana (mm)']]:[])");
 once("i.step='any';i.value=", "i.step='any';i.dataset.toolField=key;i.value=");
 once("key==='fluteLength'?t[key]:t.parameters[key]", "['fluteLength','angle','tipDiameter'].includes(key)?t[key]:t.parameters[key]");
 once("if(key==='fluteLength')t[key]=value;else t.parameters[key]=value;", "if(['fluteLength','angle','tipDiameter'].includes(key))t[key]=value;else t.parameters[key]=value;");
 once('label.append(input);box.append(label);', 'input.dataset.operationId=op.id;input.dataset.operationField=key;label.append(input);box.append(label);');
 return "import {checkStockInputs,reportStockError,stockInfo,stockOperationDefaults,mountStockProgress} from './stock-feedback.mjs';\nimport {assignDrill} from './lib/stock-geometry-tools.mjs';\n"+s+'\nmountStockProgress(form);\n';}
