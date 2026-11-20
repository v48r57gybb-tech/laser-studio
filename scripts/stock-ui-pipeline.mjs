import {fixToolBindings} from './stock-tool-bindings.mjs';
import {improveStockUI} from './stock-usability.mjs';
import assert from 'node:assert/strict';
export function prepareStockUI(source){let ui=improveStockUI(source);const expanded="if(['fluteLength','angle','tipDiameter'].includes(key))t[key]=value;else t.parameters[key]=value;",original="if(key==='fluteLength')t[key]=value;else t.parameters[key]=value;";assert.equal(ui.split(expanded).length,2);ui=fixToolBindings(ui.replace(expanded,original));const old="if(key==='fluteLength')current[key]=value;else current.parameters[key]=value;",next="if(['fluteLength','angle','tipDiameter'].includes(key))current[key]=value;else current.parameters[key]=value;";assert.equal(ui.split(old).length,2);return ui.replace(old,next);}
