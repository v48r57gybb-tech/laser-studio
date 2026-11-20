import {drillingPoints} from './lib/stock-drilling-groups.mjs';
import {resolveGeometry} from './lib/stock-geometry-tools.mjs';

const finite=(value,label)=>{
  const n=Number(String(value).replace(',','.'));
  if(!Number.isFinite(n)||Math.abs(n)>1e6)throw Error(label+' non valido');
  return Number(n.toFixed(3));
};
const positive=(value,label)=>{
  const n=finite(value,label);
  if(n<=0)throw Error(label+' positivo richiesto');
  return n;
};
const nonNegative=(value,label)=>{
  const n=finite(value,label);
  if(n<0)throw Error(label+' non negativo richiesto');
  return n;
};
const integer=(value,label)=>{
  const n=Number(value);
  if(!Number.isInteger(n)||n<1||n>1000)throw Error(label+' deve essere un intero da 1 a 1000');
  return n;
};
const angle=(value,label)=>{
  const n=finite(value,label);
  if(n<-360||n>360)throw Error(label+' deve essere compreso tra -360 e 360 gradi');
  return n;
};

export function quoteFields(operation){
  if(operation.type==='drilling'){
    const p=operation.parameters;
    const common=[
      {key:'x',label:'X iniziale',kind:'coordinate'},
      {key:'y',label:'Y iniziale',kind:'coordinate'},
      {key:'depth',label:'Profondità',kind:'positive'},
      {key:'rPlane',label:'Piano rapido R',kind:'nonNegative'}
    ];
    if(p.pattern==='single')return common;
    if(p.pattern==='line')return [...common,
      {key:'count',label:'Numero fori',kind:'integer'},
      {key:'pitch',label:'Interasse',kind:'positive'},
      {key:'angle',label:'Angolo',kind:'angle'}
    ];
    if(p.pattern==='grid')return [...common,
      {key:'rows',label:'Righe',kind:'integer'},
      {key:'columns',label:'Colonne',kind:'integer'},
      {key:'pitchX',label:'Passo X',kind:'positive'},
      {key:'pitchY',label:'Passo Y',kind:'positive'},
      {key:'angle',label:'Angolo',kind:'angle'}
    ];
    if(p.pattern==='circle')return [...common,
      {key:'count',label:'Numero fori',kind:'integer'},
      {key:'circleDiameter',label:'Diametro distribuzione',kind:'positive'},
      {key:'angle',label:'Angolo iniziale',kind:'angle'}
    ];
    if(p.pattern==='points')return [
      {key:'depth',label:'Profondità',kind:'positive'},
      {key:'rPlane',label:'Piano rapido R',kind:'nonNegative'}
    ];
  }
  if(operation.type==='pocket'){
    return [
      {key:'x',label:'X centro',kind:'coordinate'},
      {key:'y',label:'Y centro',kind:'coordinate'},
      {key:'length',label:'Lunghezza',kind:'positive'},
      {key:'width',label:'Larghezza',kind:'positive'},
      {key:'radius',label:'Raggio angoli',kind:'nonNegative'},
      {key:'angle',label:'Rotazione',kind:'angle'},
      {key:'depth',label:'Profondità',kind:'positive'},
      {key:'stepZ',label:'Passo Z',kind:'positive'},
      {key:'stepOver',label:'Impegno laterale',kind:'positive'},
      {key:'rampAngle',label:'Angolo rampa',kind:'nonNegative'},
      {key:'finishLeadMargin',label:'Margine ingresso finitura',kind:'nonNegative'}
    ];
  }
  throw Error('Tipo lavorazione non supportato dall’editor quote');
}

export function initialQuote(operation,geometry){
  const resolved=resolveGeometry(geometry),finished=resolved.finished;
  const x=finished.width/2-resolved.reference.x;
  const y=finished.depth/2-resolved.reference.y;
  const p=structuredClone(operation.parameters);
  if(operation.type==='drilling'){
    return {
      pattern:p.pattern,
      x:Number((p.x??x).toFixed(3)),
      y:Number((p.y??y).toFixed(3)),
      depth:Number((p.depth??Math.min(10,finished.height/2)).toFixed(3)),
      rPlane:Number((p.rPlane??2).toFixed(3)),
      count:p.count??1,
      pitch:p.pitch??10,
      rows:p.rows??2,
      columns:p.columns??2,
      pitchX:p.pitchX??10,
      pitchY:p.pitchY??10,
      circleDiameter:p.circleDiameter??20,
      angle:p.angle??0,
      points:Array.isArray(p.points)?p.points.map(q=>({x:Number(q.x.toFixed(3)),y:Number(q.y.toFixed(3))})):[]
    };
  }
  const tool=operation.toolDiameter??10;
  return {
    x:Number((p.x??x).toFixed(3)),
    y:Number((p.y??y).toFixed(3)),
    length:Number((p.length??Math.min(60,finished.width/2)).toFixed(3)),
    width:Number((p.width??Math.min(30,finished.depth/2)).toFixed(3)),
    radius:Number((p.radius??Math.min(5,p.width??15,tool/2)).toFixed(3)),
    angle:p.angle??0,
    depth:Number((p.depth??5).toFixed(3)),
    stepZ:Number((p.stepZ??2).toFixed(3)),
    stepOver:Number((p.stepOver??Math.max(.5,tool/4)).toFixed(3)),
    rampAngle:Number((p.rampAngle??3).toFixed(3)),
    finishLeadMargin:Number((p.finishLeadMargin??1).toFixed(3))
  };
}

export function applyQuote(operation,values){
  const fields=quoteFields(operation),result=structuredClone(operation.parameters);
  for(const field of fields){
    const value=values[field.key];
    if(value===''||value===undefined||value===null)throw Error(field.label+' richiesto');
    if(field.kind==='coordinate')result[field.key]=finite(value,field.label);
    else if(field.kind==='positive')result[field.key]=positive(value,field.label);
    else if(field.kind==='nonNegative')result[field.key]=nonNegative(value,field.label);
    else if(field.kind==='integer')result[field.key]=integer(value,field.label);
    else if(field.kind==='angle')result[field.key]=angle(value,field.label);
    else throw Error('Campo non supportato: '+field.key);
  }
  if(operation.type==='drilling'){
    if(result.pattern==='points'){
      const points=values.points;
      if(!Array.isArray(points)||!points.length)throw Error('Inserire almeno una coppia X Y');
      result.points=points.map((q,i)=>{
        if(!q||typeof q!=='object')throw Error('Riga '+(i+1)+' non valida');
        return {x:finite(q.x,'X riga '+(i+1)),y:finite(q.y,'Y riga '+(i+1))};
      });
      result.count=result.points.length;
      result.x=result.points[0].x;
      result.y=result.points[0].y;
    }
    drillingPoints(result);
  }
  if(operation.type==='pocket'){
    if(result.radius>=Math.min(result.length,result.width)/2)
      throw Error('Il raggio deve essere inferiore alla metà della dimensione minore');
    if(result.stepOver>result.width/2)
      throw Error('L’impegno laterale supera la larghezza disponibile');
    if(result.rampAngle>90)
      throw Error('L’angolo di rampa massimo supportato è 90 gradi');
  }
  return result;
}

export function quoteRows(project,geometry){
  const resolved=resolveGeometry(geometry),rows=[];
  for(const operation of project.operations){
    if(!['drilling','pocket'].includes(operation.type)||!operation.enabled)continue;
    const tool=project.tools.find(t=>t.id===operation.toolId);
    const base={
      id:operation.id,
      type:operation.type,
      tool:tool?`T${tool.station} · Ø${tool.diameter}`:'Utensile non assegnato',
      enabled:operation.enabled===true
    };
    if(operation.type==='drilling'){
      const points=drillingPoints(operation.parameters);
      rows.push({...base,
        description:`${points.length} foro/i · Ø${tool?.diameter??'?'} · Z-${operation.parameters.depth}`,
        x:operation.parameters.x,
        y:operation.parameters.y,
        count:points.length,
        detail:operation.parameters.pattern
      });
    }else{
      rows.push({...base,
        description:`${operation.parameters.shape==='obround'?'Asola':'Tasca'} ${operation.parameters.length}×${operation.parameters.width} · Z-${operation.parameters.depth}`,
        x:operation.parameters.x,
        y:operation.parameters.y,
        count:1,
        detail:operation.parameters.shape
      });
    }
  }
  return rows;
}

export function mountQuoteEditor({form,getProject,replaceProject,changed}){
  const panel=document.createElement('section');
  panel.className='card';
  panel.id='stockQuoteEditor';
  const title=document.createElement('h2');
  title.textContent='Quote intelligenti e tabella sincronizzata';
  const status=document.createElement('p');
  status.id='stockQuoteStatus';
  status.setAttribute('role','status');
  const editor=document.createElement('div');
  editor.className='grid';
  const pointsArea=document.createElement('textarea');
  pointsArea.id='stockQuotePoints';
  pointsArea.setAttribute('aria-label','Coordinate dei fori, una coppia X Y per riga');
  pointsArea.style.minHeight='140px';
  const table=document.createElement('table');
  table.id='stockQuoteTable';
  const thead=document.createElement('thead');
  thead.innerHTML='<tr><th>#</th><th>Tipo</th><th>Utensile</th><th>X</th><th>Y</th><th>Quantità</th><th>Dettaglio</th><th>Azioni</th></tr>';
  const tbody=document.createElement('tbody');
  table.append(thead,tbody);
  panel.append(title,status,editor,pointsArea,table);
  form.querySelector('#stockPlacement')?.after(panel);

  let selectedId='';
  let baseline='';
  const current=()=>getProject().operations.find(o=>o.id===selectedId&&['drilling','pocket'].includes(o.type));
  const geometry=()=>getProject().geometry;

  function message(text){status.textContent=text;}

  function buildEditor(){
    editor.replaceChildren();
    const operation=current();
    if(!operation){
      message('Seleziona una lavorazione nella tabella per modificare le quote.');
      pointsArea.hidden=true;
      return;
    }
    const values=initialQuote(operation,geometry());
    for(const field of quoteFields(operation)){
      if(operation.type==='drilling'&&operation.parameters.pattern==='points'&&(field.key==='x'||field.key==='y'))continue;
      const label=document.createElement('label');
      label.textContent=field.label;
      const input=document.createElement('input');
      input.type='number';
      input.step='any';
      input.id='quote-'+field.key;
      input.value=values[field.key]??'';
      input.dataset.field=field.key;
      label.append(input);
      editor.append(label);
    }
    if(operation.type==='drilling'&&operation.parameters.pattern==='points'){
      pointsArea.hidden=false;
      pointsArea.value=operation.parameters.points.map(q=>`${q.x} ${q.y}`).join('\n');
    }else pointsArea.hidden=true;
    const apply=document.createElement('button');
    apply.type='button';
    apply.textContent='Conferma quote';
    apply.onclick=applyQuotes;
    const duplicate=document.createElement('button');
    duplicate.type='button';
    duplicate.textContent='Duplica';
    duplicate.onclick=()=>duplicateOperation(operation);
    const remove=document.createElement('button');
    remove.type='button';
    remove.textContent='Elimina';
    remove.onclick=()=>removeOperation(operation);
    editor.append(apply,duplicate,remove);
    baseline=JSON.stringify(operation);
  }

  function applyQuotes(){
    try{
      if(panel.dataset.pending==='true')throw Error('Conferma o annulla prima la modifica in corso');
      const operation=current();
      if(!operation)throw Error('Seleziona una lavorazione');
      if(JSON.stringify(operation)!==baseline)throw Error('La lavorazione è cambiata: ricarica le quote');
      const values={};
      for(const input of editor.querySelectorAll('input[data-field]'))values[input.dataset.field]=input.value;
      if(operation.type==='drilling'&&operation.parameters.pattern==='points'){
        values.points=pointsArea.value.trim().split(/\r?\n/).filter(Boolean).map(line=>{
          const parts=line.trim().split(/[;\s]+/);
          if(parts.length!==2)throw Error('Ogni riga richiede X e Y');
          return {x:parts[0],y:parts[1]};
        });
      }
      const project=structuredClone(getProject());
      const target=project.operations.find(o=>o.id===operation.id);
      target.parameters=applyQuote(target,values);
      replaceProject(project);
      baseline=JSON.stringify(target);
      changed();
      buildEditor();
      renderTable();
      message('Quote confermate e sincronizzate con disegno e generatore.');
    }catch(error){message(error.message);}
  }

  function duplicateOperation(operation){
    try{
      const project=structuredClone(getProject());
      const source=project.operations.find(o=>o.id===operation.id);
      if(!source)throw Error('Lavorazione non trovata');
      const copy=structuredClone(source);
      copy.id='op-'+crypto.randomUUID();
      copy.parameters={...copy.parameters};
      if(copy.type==='drilling'&&copy.parameters.pattern!=='points'){
        copy.parameters.x=Number((copy.parameters.x+copy.parameters.pitch??10).toFixed(3));
      }else if(copy.type==='pocket'){
        copy.parameters.x=Number((copy.parameters.x+10).toFixed(3));
      }
      project.operations.push(copy);
      replaceProject(project);
      selectedId=copy.id;
      changed();
      buildEditor();
      renderTable();
      message('Lavorazione duplicata. Verifica la nuova posizione prima di generare l’ISO.');
    }catch(error){message(error.message);}
  }

  function removeOperation(operation){
    try{
      const project=structuredClone(getProject());
      const index=project.operations.findIndex(o=>o.id===operation.id);
      if(index<0)throw Error('Lavorazione non trovata');
      project.operations.splice(index,1);
      replaceProject(project);
      selectedId='';
      changed();
      buildEditor();
      renderTable();
      message('Lavorazione eliminata.');
    }catch(error){message(error.message);}
  }

  function renderTable(){
    tbody.replaceChildren();
    let rows=[];
    try{rows=quoteRows(getProject(),geometry());}
    catch(error){message('Tabella non disponibile: '+error.message);return;}
    rows.forEach((row,index)=>{
      const tr=document.createElement('tr');
      const cells=[index+1,row.type==='drilling'?'Foratura':row.description,row.tool,row.x,row.y,row.count,row.detail];
      for(const value of cells){
        const td=document.createElement('td');
        td.textContent=value??'';
        tr.append(td);
      }
      const actions=document.createElement('td');
      const select=document.createElement('button');
      select.type='button';
      select.textContent='Seleziona';
      select.onclick=()=>{
        selectedId=row.id;
        buildEditor();
        renderTable();
        message('Lavorazione selezionata: '+row.description);
      };
      actions.append(select);
      tr.append(actions);
      tbody.append(tr);
    });
    if(!rows.length){
      const tr=document.createElement('tr');
      const td=document.createElement('td');
      td.colSpan=8;
      td.textContent='Nessuna lavorazione attiva. Aggiungi un foro, una tasca o un’asola.';
      tr.append(td);
      tbody.append(tr);
    }
  }

  form.addEventListener('change',()=>{
    if(document.activeElement&&document.activeElement.closest('#stockQuoteEditor'))return;
    buildEditor();
    renderTable();
  });
  form.addEventListener('input',()=>{
    if(document.activeElement&&document.activeElement.closest('#stockQuoteEditor'))return;
    renderTable();
  });
  buildEditor();
  renderTable();
}
