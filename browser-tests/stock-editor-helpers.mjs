import assert from 'node:assert/strict';
export const editor=page=>page.locator('#stockOperationEditor');
export async function rowCount(page,count){await page.waitForFunction(n=>document.querySelectorAll('#stockOperationEditor table tr').length===n+1,count);}
export async function addOperation(page,type){await editor(page).getByRole('combobox',{name:'Nuova lavorazione',exact:true}).selectOption(type);await editor(page).getByRole('button',{name:'Aggiungi lavorazione',exact:true}).click();await editor(page).locator('fieldset [data-key="toolId"]').waitFor({state:'visible'});}
export async function applyDraft(page){await editor(page).getByRole('button',{name:'Conferma lavorazione',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#stockOperationEditor')?.dataset.pending==='false');}
export async function cancelDraft(page){await editor(page).getByRole('button',{name:'Annulla bozza',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#stockOperationEditor')?.dataset.pending==='false');}
export async function stored(page,index,key){const field=page.locator('#stOps fieldset').nth(index).locator('[data-operation-field="'+key+'"]');assert.equal(await field.count(),1,'Campo confermato mancante: '+key);return field.inputValue();}
export async function near(actual,expected,tolerance=.001){assert(Number.isFinite(Number(actual))&&Math.abs(Number(actual)-expected)<=tolerance,'Atteso '+expected+', ottenuto '+actual);}
