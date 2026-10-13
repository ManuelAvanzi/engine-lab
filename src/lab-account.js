import {validateProject} from './project-document.js';
export async function mountLabAccount({capture,restore,modal}){
 const key='enginelab-local-trial-v1';
 let name='La mia prova',notes='';
 const bar=document.querySelector('.page-heading');
 const status=document.createElement('small');status.id='project-status';status.setAttribute('role','status');bar.querySelector('div').append(status);
 const apply=p=>{p=validateProject(p);restore(p.settings);name=p.name;notes=p.notes;};
 const snapshot=()=>validateProject({version:1,name,notes,settings:capture()});
 function button(label,action){const b=document.createElement('button');b.className='outline-button';b.textContent=label;b.onclick=action;bar.append(b);return b;}
 button('Salva sul dispositivo',()=>{try{localStorage.setItem(key,JSON.stringify(snapshot()));status.textContent='Prova salvata su questo dispositivo';}catch{status.textContent='Salvataggio non disponibile. Usa Esporta prova.';}});
 button('Riprendi prova',()=>{try{const raw=localStorage.getItem(key);if(!raw)throw Error('Nessuna prova salvata su questo dispositivo.');apply(JSON.parse(raw));status.textContent='Prova ripristinata in pausa';}catch(e){status.textContent=e.message;}});
 button('Esporta prova',()=>{try{const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='prova.engine.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){status.textContent=e.message;}});
 const input=document.createElement('input');input.type='file';input.accept='.json';input.hidden=true;bar.append(input);
 button('Apri file prova',()=>input.click());
 input.onchange=async()=>{try{const file=input.files[0];if(!file)return;if(file.size>2000000)throw Error('File troppo grande.');apply(JSON.parse(await file.text()));status.textContent='Prova importata in pausa';}catch(e){status.textContent=e.message;}finally{input.value='';}};
 if(new URLSearchParams(location.search).has('project'))modal('Archivio online disattivato','<p>Questo collegamento richiedeva il servizio online. Puoi aprire un file esportato o riprendere una prova salvata sul dispositivo.</p><a href="/lab">Apri il laboratorio →</a>');
}
