import {scenarios} from './data.js';
import {makeExperiment,experimentTopics} from './learning.js';

export function mountGuidedTutor({state,modal,apply}){
 let experiment=null,answer=null,applied=false;
 function open(topic='motion',resume=false){
  if(!resume||!experiment||experiment.type!==state.type){experiment=makeExperiment(state.type,state,topic);answer=null;applied=false;}
  render();
 }
 function render(){
  const x=experiment,answered=answer!==null;
  modal('Prevedi. Prova. Spiega.',`<div class="guide-intro"><span class="guide-badge">DEMO GUIDATA · SENZA AI GENERATIVA</span><p>Una piccola indagine sul sistema ${x.system.toLowerCase()}. Le risposte sono preparate; i risultati vengono calcolati dal laboratorio.</p></div>
   <div class="guide-tabs" aria-label="Scegli la prova">${Object.entries(experimentTopics).map(([id,title])=>`<button data-guide-topic="${id}" aria-pressed="${x.topic===id}">${title}</button>`).join('')}</div>
   <p class="guide-context">${scenarios[x.base.scenario].name} · carico ${x.base.load}% · ambiente ${x.base.ambient} °C · condizioni fissate per questa prova</p>
   <div class="guide-step"><span>01 / LA TUA IPOTESI</span><h3>${x.question}</h3>${answered?`<p class="guide-prediction">La tua previsione: <strong>${x.choices[answer]}</strong></p>`:x.choices.map((choice,i)=>`<button class="quiz-option" data-guide-answer="${i}">${choice}</button>`).join('')}</div>
   ${answered?`<section class="guide-result" aria-live="polite"><span>02 / CONFRONTA I RISULTATI</span><p><strong>${answer===x.correct?'La tua previsione è coerente.':'Rivediamo la previsione.'}</strong> ${x.explanation}</p><div class="guide-table-wrap"><table class="guide-table"><thead><tr><th>Parametro</th><th>Prima</th><th>Dopo</th></tr></thead><tbody>${x.rows.map(row=>`<tr>${row.map((v,i)=>i?`<td>${v}</td>`:`<th scope="row">${v}</th>`).join('')}</tr>`).join('')}</tbody></table></div><p class="guide-context">Stime a regime: nel pannello in marcia il riscaldamento iniziale può modificare il consumo.</p><div class="guide-actions"><button class="primary-button" data-guide-apply="base">Prova il “prima” nel 3D</button><button class="primary-button" data-guide-apply="changed">Prova il “dopo” nel 3D</button></div>${applied?'<p class="guide-context">Prova applicata. Osserva il modello e i parametri sotto il viewer, poi torna qui.</p>':''}<div class="guide-reflection"><span>03 / SPIEGA QUELLO CHE HAI OSSERVATO</span><p>${x.reflect}</p></div><button class="text-button" data-guide-restart>Riformula l’ipotesi</button></section>`:`<p class="guide-context">Scegli una risposta prima di vedere i risultati. Nessun voto: usa il confronto per capire il perché.</p>`}
   <div class="guide-source"><a href="/fonti#${x.source}" target="_blank" rel="noopener">Da dove arrivano questi valori? ↗</a><span>La prova non modifica il modello finché non scegli “Prova nel 3D”.</span></div>`, 'TUTOR DI LABORATORIO');
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.guideTopic)open(b.dataset.guideTopic);
  if(b.dataset.guideAnswer!==undefined&&answer===null){answer=Number(b.dataset.guideAnswer);render();}
  if(b.hasAttribute('data-guide-restart')){answer=null;render();}
  if(b.dataset.guideApply&&experiment){applied=true;document.querySelector('#dialog').close();apply(experiment.type,experiment[b.dataset.guideApply]);}
 });
 return {open:()=>open('motion',Boolean(experiment))};
}
