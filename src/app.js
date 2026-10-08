import {mountLabAccount} from './lab-account.js';
import {mountLivePanel} from './live-panel.js';


import {roadMotion,speedFromRpm,ratios} from './motion.js';

import {insideNotes} from './inside.js';

import {createIcons, icons} from 'lucide';

import {systems,components,scenarios,simulate,questions} from './data.js';

import {PowertrainViewer} from './model.js';

const $=(s)=>document.querySelector(s);

const icon=(name)=>`<i data-lucide="${name}"></i>`;

const format=(n,d=0)=>new Intl.NumberFormat('it-IT',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);

const state={type:'ice',selected:'pistons',infoId:null,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,section:true,risk:false,isolated:false,car:true,drag:false,explode:0,scenario:'mixed',speed:0,rpm:0,load:50,ambient:20,cooling:true,quiz:0,answers:{}};

let viewer,toastTimer,aiAvailable=false;

function refreshIcons(){createIcons({icons,attrs:{'aria-hidden':'true'}});}

function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4500);}

function renderSystems(){

 $('#systems').innerHTML=Object.entries(systems).map(([id,s])=>`<button class="system-button ${id===state.type?'active':''}" data-system="${id}" aria-pressed="${id===state.type}"><span class="sys-icon">${icon(s.icon)}</span><span><strong>${s.name}</strong><small>${id==='ice'?'Combustione interna':id==='hybrid'?'Termico + elettrico':'100% elettrico'}</small></span>${id===state.type?icon('chevron-right'):''}</button>`).join('');

 $('#component-list').innerHTML=systems[state.type].components.map(id=>`<div class="component-row"><button class="component-button ${id===state.selected?'active':''}" data-component="${id}" aria-pressed="${id===state.selected}" style="--part-color:${components[id].color}"><span class="part-dot"></span>${components[id].name}${id===state.selected?icon('chevron-right'):''}</button>${componentInfoButton(id)}</div>`).join('');

 $('#component-count').textContent=systems[state.type].components.length;if($('#viewer-part-count'))$('#viewer-part-count').textContent=systems[state.type].components.length;
 const scan=$('.technical-scan-button');if(scan)scan.hidden=state.type==='ev';

 const list=$('.viewer-component-list');if(list)list.innerHTML=systems[state.type].components.map((id,i)=>`<div class="component-row"><button class="component-name" data-component="${id}" aria-pressed="${id===state.selected}"><span>${String(i+1).padStart(2,'0')}</span>${components[id].name}</button>${componentInfoButton(id)}</div>`).join('');

}

function renderInsidePanel(){

 if(!viewer)return;const active=viewer.insideId===state.selected,n=insideNotes[state.selected];

 document.querySelector('.inside-controls')?.remove();

 const panel=document.createElement('section');panel.className='inside-controls';

 panel.innerHTML=`<p class="hover-instruction">${icon('mouse-pointer-2')}Passa il mouse sul componente per vederne l’interno.</p><label class="inside-switch"><input type="checkbox" data-action="toggle-inside" ${active?'checked':''}> Mantieni trasparenza</label>${active?`<label>Trasparenza <output id="inside-opacity-value">${Math.round((1-viewer.insideOpacity)*100)}%</output><input id="inside-opacity" aria-label="Trasparenza del componente" type="range" min="20" max="95" value="${Math.round((1-viewer.insideOpacity)*100)}"></label>`:''}`;

 $('#inspector .relationship')?.before(panel);



}

function componentInfoButton(id){const open=state.infoId===id;return `<button class="component-info" data-component-info="${id}" aria-label="${open?'Chiudi':'Apri'} informazioni: ${components[id].name}" aria-expanded="${open}" aria-controls="viewer-component-info" title="Informazioni su ${components[id].name}">${icon('info')}</button>`;}
let infoOrigin='.viewer-component-list';
function toggleComponentInfo(id){
 if(!systems[state.type].components.includes(id))return;
 infoOrigin=document.activeElement?.closest('#component-list')?'#component-list':'.viewer-component-list';
 const close=state.infoId===id;
 if(!close)selectComponent(id,false);
 state.infoId=close?null:id;if(viewer)viewer.infoId=state.infoId;
 renderSystems();renderViewerSheet();refreshIcons();$(infoOrigin)?.querySelector(`[data-component-info="${id}"]`)?.focus({preventScroll:true});
}
function closeComponentInfo(){const id=state.infoId;state.infoId=null;if(viewer)viewer.infoId=null;renderSystems();renderViewerSheet();refreshIcons();if(id)$(infoOrigin)?.querySelector(`[data-component-info="${id}"]`)?.focus({preventScroll:true});}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.infoId&&!$('#dialog').open)closeComponentInfo();});

function renderInspector(){const c=components[state.selected];$('#inspector').innerHTML=`<div class="inspector-header"><span class="eyebrow">ESPLORA IL COMPONENTE</span>${icon('focus')}</div><div class="part-main"><div class="part-symbol">${icon(state.type==='ev'?'zap':'component')}</div><h2>${c.name}</h2><span class="category">${c.category}</span></div><p class="description">${c.description}</p><div class="material"><span>Materiale</span><strong>${c.material}</strong></div><div class="part-actions"><button data-action="isolate" aria-pressed="${state.isolated}" class="${state.isolated?'selected':''}">${icon('focus')}${state.isolated?'Mostra tutto':'Isola'}</button><button data-action="part-explain">${icon('book-open')}Approfondisci</button></div><div class="relationship"><h3>Come si collega al sistema</h3><p>${c.relationship}</p></div><div class="risk-note"><h3>${icon('triangle-alert')}DA TENERE D’OCCHIO</h3><p>${c.risk}</p></div>`;renderInsidePanel();}

function renderPartControls(){const parent=$('#inspector');if(!parent||!viewer)return;parent.querySelector('.manipulation')?.remove();const p=viewer.parts[state.selected];if(!p)return;const panel=document.createElement('div');panel.className='manipulation';panel.innerHTML=`<div class="manipulation-heading">SMONTA IL COMPONENTE</div><div class="part-actions"><button data-action="detach" class="${p.userData.detached?'selected':''}">${icon(p.userData.detached?'package-check':'move-up-right')}${p.userData.detached?'Reinserisci':'Estrai'}</button><button data-action="move-part" class="${state.drag?'selected':''}">${icon('hand')}Sposta</button></div><details class="position-controls"><summary>Posizione precisa · X / Y / Z</summary>${['x','y','z'].map(axis=>`<label>${axis.toUpperCase()}<input aria-label="Posizione ${axis.toUpperCase()} del componente" data-part-axis="${axis}" type="range" min="-5" max="5" step="0.1" value="${p.userData.manualOffset[axis]}"><output>${p.userData.manualOffset[axis].toFixed(1)}</output></label>`).join('')}</details><button class="text-button" data-action="reassemble">${icon('rotate-ccw')}Ricomponi tutti i componenti</button></div>`;parent.querySelector('.relationship').before(panel);}

function selectComponent(id,focus=true){if(!systems[state.type].components.includes(id))return;if(state.selected!==id){state.infoId=null;if(viewer)viewer.infoId=null;}state.selected=id;if(focus&&viewer?.carMode){state.car=false;viewer.setCar(false);syncToggles();}viewer?.select(id,false);renderSystems();renderInspector();renderPartControls();renderViewerSheet();if(focus){viewer?.presentation?.focus();if(!document.fullscreenElement&&!matchMedia('(max-width:900px)').matches){$('.workspace').classList.remove('inspector-collapsed');$('[data-action="toggle-inspector"]')?.setAttribute('aria-expanded','true');$('#inspector').scrollTop=0;}}$('#tutor-prompt').textContent=components[id].point;refreshIcons();}

function renderViewerSheet(){const card=$('.viewer-technical-card');if(!card)return;const id=state.infoId,n=insideNotes[id];card.hidden=!id;if(!id){card.replaceChildren();return;}card.innerHTML=`<header><span>INFORMAZIONI COMPONENTE</span><button data-action="close-viewer-sheet" aria-label="Chiudi informazioni componente">×</button></header><h3>${components[id].name}</h3><div class="component-info-note"><strong>${n[0]}</strong><p>${n[1]}</p><small>${n[2]}</small></div><button class="sheet-focus" data-action="focus-selected">Inquadra componente</button>`;}


function selectSystem(type){if(!systems[type])throw new Error('Sistema non valido');state.type=type;state.infoId=null;if(viewer){viewer.infoId=null;viewer.flows.setEnabled(false);}state.selected=type==='ev'?'rotor':'pistons';state.isolated=false;state.explode=0;$('#explode').value=0;$('#explode-value').textContent='0%';const s=systems[type];$('#model-title').textContent=s.name;$('#model-subtitle').textContent=s.subtitle;$('#model-tag').textContent=s.tag;$('#breadcrumb-system').textContent=s.name;$('#rpm').max=s.maxRpm;state.rpm=Math.min(state.rpm,s.maxRpm);$('#rpm').value=state.rpm;viewer?.build(type);viewer?.setSection(state.section);viewer?.setRisk(state.risk);selectComponent(state.selected,false);updateMetrics();}

function updateMetrics(){$('#play-label').textContent=!state.playing?'Animazione in pausa':state.speed===0?'Veicolo fermo':'Animazione in corso';state.rpm=roadMotion(state.type,state.speed).rpm;$('#rpm').value=state.rpm;if($('#road-speed')){$('#road-speed').value=state.speed;$('#road-speed-value').textContent=`${format(state.speed,1)} km/h`;}if(viewer){viewer.rpm=state.rpm;viewer.roadSpeed=state.speed;}const readout=$('#motion-readout');if(readout){const motion=roadMotion(state.type,state.speed);readout.innerHTML=`<span>Motore <b>${format(motion.rpm)} rpm</b></span><span>Ruote <b id="wheel-rpm-readout">${format(motion.wheelRpm)} rpm</b></span><small>Rapporto ${ratios[state.type]}:1 · Ø ruota 0,65 m</small>`;}const m=simulate(state.type,state);$('#rpm-value').textContent=`${format(state.rpm)} rpm`;$('#load-value').textContent=`${state.load}%`;viewer?.setRisk(state.risk,m.warning);refreshIcons();}

function modal(title,html,eyebrow='engineLab'){const d=$('#dialog');d.querySelector('#scan-host')?.scanDispose?.();d.classList.remove('scan-dialog');d.classList.toggle('comparison-dialog',eyebrow==='CONFRONTO DEI SISTEMI');$('#dialog-title').textContent=title;$('#dialog-eyebrow').textContent=eyebrow;$('#dialog-body').innerHTML=html;if(!d.open)d.showModal();refreshIcons();}

function explain(){const c=components[state.selected];modal(c.name,`<div class="modal-note">${c.description}</div><div class="explanation-block"><h3>Nel sistema</h3><p>${c.relationship}</p></div><div class="explanation-block"><h3>Osserva e ragiona</h3><p>${c.point}</p></div><div class="explanation-block"><h3>Criticità</h3><p>${c.risk}</p></div><p>Prova a isolare il componente e a modificare la vista esplosa. Quali parti devono restare collegate per trasmettere energia?</p><button class="primary-button" data-action="explore-part">${icon('focus')}Osserva il componente isolato</button>`, 'TUTOR GUIDATO · SCHEDA CONTESTUALE');}

function compare(){modal('Tre tecnologie, lo stesso scenario',`<p>Scenario <strong>${scenarios[state.scenario].name.toLowerCase()}</strong> · carico ${state.load}% · ambiente ${state.ambient} °C. La domanda energetica alle ruote è condivisa; i risultati sono esempi di modello, non misure di veicoli reali.</p><div class="compare-grid">${Object.entries(systems).map(([id,s])=>{const m=simulate(id,state);return `<div class="comparison-card">${icon(s.icon)}<h3>${s.short}</h3><div class="compare-row">Rendimento di conversione<strong>${format(m.efficiency,1)}<small>%</small></strong></div><div class="energy-flow" aria-label="${format(m.efficiency)}% utile, ${format(m.loss)}% perdite"><span style="width:${m.efficiency}%"></span></div><div class="comparison-foot">Turchese: energia utile · grigio: perdite</div><div class="compare-row">Energia in ingresso<strong>${format(m.energy,1)}<small>kWh/100 km</small></strong></div><div class="compare-row">Consumo<strong>${format(m.consumption,1)}<small>${id==='ev'?'kWh':'L'}/100 km</small></strong></div><div class="compare-row">CO₂ allo scarico<strong>${format(m.co2)}<small>g/km</small></strong></div><button class="primary-button" data-choose-system="${id}">Esplora ${icon('arrow-right')}</button></div>`}).join('')}</div><div class="modal-note">Per un confronto corretto usa l’energia in ingresso, non il valore numerico di litri e kWh. Nell’elettrico sono escluse le perdite di ricarica; la CO₂ non include produzione dell’energia e ciclo di vita.</div><button class="text-button" style="margin-top:15px" data-action="method">${icon('info')}Ipotesi e fonti del modello</button>`, 'CONFRONTO DEI SISTEMI');}

function lessons(){modal('Dal componente al sistema',`<p>Tre attività brevi per collegare ciò che osservi al funzionamento del propulsore.</p><div class="lesson"><span class="lesson-number">01</span><div><h3>Segui il movimento</h3><p>Osserva pistoni, bielle e albero motore. Individua i movimenti diversi.</p></div><button class="primary-button" data-lesson="motion">Inizia ${icon('arrow-right')}</button></div><div class="lesson"><span class="lesson-number">02</span><div><h3>Dove va l’energia?</h3><p>Confronta i tre sistemi nel traffico urbano e in autostrada.</p></div><button class="primary-button" data-lesson="energy">Inizia ${icon('arrow-right')}</button></div><div class="lesson"><span class="lesson-number">03</span><div><h3>Indaga una criticità</h3><p>Riduci il raffreddamento e osserva temperatura e parti coinvolte.</p></div><button class="primary-button" data-lesson="risk">Inizia ${icon('arrow-right')}</button></div><button class="primary-button" data-action="quiz">${icon('graduation-cap')}Verifica quello che hai imparato</button>`, 'PERCORSO DIDATTICO · ISTITUTI TECNICI');}

function energyFlow(){const m=simulate(state.type,state);const steps=state.type==='ice'?[['fuel','Benzina','Energia chimica'],['flame','Combustione','Energia termica'],['cog','Albero motore','Energia meccanica'],['circle-dot','Ruote','Movimento']]:state.type==='hybrid'?[['fuel','Benzina','Motore termico'],['battery-charging','Batteria','Motogeneratore'],['combine','Trasmissione','Contributi combinati'],['circle-dot','Ruote','Movimento']]:[['battery-charging','Batteria','Corrente continua'],['cpu','Inverter','Correnti alternate'],['zap','Motore','Coppia meccanica'],['circle-dot','Ruote','Movimento']];modal('Segui il percorso dell’energia',`<p>${systems[state.type].name} · ${scenarios[state.scenario].name} · ${state.load}% di carico</p><div class="flow-diagram">${steps.map(([i,n,d],idx)=>`${idx?'<span class="flow-arrow">→</span>':''}<div class="flow-node">${icon(i)}<strong>${n}</strong><small>${d}</small></div>`).join('')}</div><h3>Su 100 unità di energia in ingresso</h3><div class="energy-flow"><span style="width:${m.efficiency}%"></span></div><p><strong>${format(m.efficiency,1)} unità</strong> diventano energia meccanica utile; <strong>${format(m.loss,1)}</strong> sono perse soprattutto come calore.</p>${state.type!=='ice'?`<div class="modal-note">In decelerazione il percorso elettrico si inverte: ruote → motogeneratore → inverter → batteria. Nello scenario corrente il modello assume una riduzione della domanda del ${m.recovery}% grazie al recupero.</div>`:'<div class="modal-note">Il calore viene disperso attraverso scarico, raffreddamento e attriti. Nella frenata convenzionale l’energia cinetica diventa calore nei freni.</div>'}${state.type==='hybrid'?'<p>Il diagramma riassume i contributi del sistema parallelo. Non è una catena in serie: motore termico e motogeneratore possono contribuire entrambi alla trasmissione.</p>':''}<button class="primary-button" data-action="compare">Confronta le tre tecnologie</button>`,'FLUSSI ENERGETICI');}

function chat(){if(!aiAvailable){modal('Tutor AI da collegare',`<div class="modal-note">Le spiegazioni e i quiz guidati sono già disponibili. La conversazione AI richiede l’attivazione del servizio da parte del docente o dell’amministratore.</div><p>Quando attivo, il tutor riceve la domanda, il componente selezionato e le condizioni della simulazione. Non inserire dati personali.</p><button class="primary-button" data-action="explain">${icon('book-open')}Usa il tutor guidato</button>`,'TUTOR CONTESTUALE');return;}modal('Chiedi al tutor',`<p>Stai esplorando <strong>${components[state.selected].name}</strong> nel sistema <strong>${systems[state.type].short.toLowerCase()}</strong>. La risposta terrà conto delle condizioni operative attuali.</p><form id="ai-form"><label for="ai-question">La tua domanda</label><textarea id="ai-question" required maxlength="1200" rows="3" placeholder="Perché questo componente si surriscalda?"></textarea><button class="primary-button" type="submit" id="ai-submit">${icon('send')}Invia domanda</button></form><p class="comparison-foot">La domanda e il contesto sono inviati al servizio AI. Non inserire dati personali. Confronta le risposte con le schede del laboratorio.</p><div id="ai-answer" class="explanation-block" role="status" hidden></div>`,'TUTOR AI · DOMANDA CONTESTUALE');}

function quiz(){const q=questions[state.quiz],answer=state.answers[state.quiz];const answered=answer!==undefined;modal('Metti alla prova le tue idee',`<div class="progress-line"><span style="width:${(state.quiz+1)/questions.length*100}%"></span></div><p class="eyebrow">DOMANDA ${state.quiz+1} DI ${questions.length}</p><h3>${q.question}</h3>${q.options.map((o,i)=>`<button class="quiz-option ${answered?(i===q.correct?'correct':i===answer?'wrong':''):''}" data-answer="${i}" ${answered?'disabled':''}>${icon(answered&&i===q.correct?'circle-check':'circle')}${o}</button>`).join('')}${answered?`<div class="modal-note"><strong>${answer===q.correct?'Esatto.':'Ragioniamoci insieme.'}</strong> ${q.explanation}</div><button class="primary-button" data-action="next-question">${state.quiz===questions.length-1?'Vedi il risultato':'Prossima domanda'} ${icon('arrow-right')}</button>`:''}`,'TUTOR GUIDATO · VERIFICA');}

function method(){modal('Un modello per capire',`<p>Il laboratorio usa <strong>geometrie schematiche e un modello numerico semplificato</strong>. Non rappresenta un motore commerciale e non è uno strumento di diagnosi, omologazione o previsione delle prestazioni reali.</p><h3>Come sono calcolati i valori</h3><p>Ogni scenario definisce una domanda alle ruote: città 9, extraurbano 14, autostrada 21 e salita 30 kWh/100 km, prima delle correzioni. Carico e temperatura ambiente modificano tale domanda. La velocità modifica la domanda con un termine quadratico semplificato. Il regime influenza il rendimento e la potenza disponibile. I valori di riferimento sono scelte didattiche.</p><div class="explanation-block"><p>Energia in ingresso = domanda netta alle ruote ÷ rendimento.<br>Consumo benzina = energia in ingresso ÷ 8,9 kWh/L.<br>CO₂ allo scarico = consumo in L/100 km × 23,5 g/km.<br>Potenza netta richiesta alle ruote (kW) = energia netta alle ruote (kWh/100 km) × velocità (km/h) ÷ 100.<br>Potenza disponibile indicativa = potenza nominale × carico × fattore di regime × eventuale limitazione termica.<br>Coppia disponibile indicativa = potenza disponibile in kW × 9.550 ÷ rpm.</p></div><p>Per ibrido ed elettrico la domanda netta include un recupero convenzionale del 20% in città, 8% in extraurbano e 2% negli altri scenari. Nell’ibrido si assume un bilancio di carica della batteria neutro sul percorso. Le condizioni operative indicano le temperature a regime. Il pannello sotto il viewer simula un riscaldamento graduale e integra nel tempo consumo, distanza e CO₂. Il recupero è una media del percorso, non una simulazione istante per istante della frenata.</p><p>Il confronto mostra l’efficienza di conversione del propulsore. Le temperature di refrigerante e avvolgimenti riguardano parti diverse e non vanno confrontate come la stessa misura. L’animazione è al rallentatore: non riproduce visivamente i giri indicati.</p><h3>Fonti per approfondire</h3><ul class="source-list"><li><a href="https://afdc.energy.gov/vehicles/electric-basics-hev" target="_blank" rel="noopener">U.S. Department of Energy — Veicoli ibridi</a></li><li><a href="https://afdc.energy.gov/vehicles/electric" target="_blank" rel="noopener">Alternative Fuels Data Center — Sistemi elettrici</a></li><li><a href="https://www.energy.gov/cmei/vehicles/articles/fotw-1360-sept-16-2024-typical-ev-87-91-efficient-compared-30-conventional" target="_blank" rel="noopener">Department of Energy — Efficienza energetica dei veicoli</a></li></ul><p class="comparison-foot">Le fonti descrivono le tecnologie; non certificano i valori della simulazione. Propulsori originali procedurali; carrozzerie 3D di autori esterni. <a href="/models/credits.html" target="_blank" rel="noopener">Modelli, licenze e adattamenti</a>. Interazione 3D: Three.js.</p>`, 'IPOTESI, LIMITI E FONTI');}

function advanced(){modal('Metti il sistema alla prova',`<p>Modifica l’ambiente e la disponibilità del raffreddamento. La temperatura è una stima di equilibrio semplificata, non un transitorio fisico.</p><div class="advanced-grid"><div class="field"><label for="ambient">Temperatura ambiente <output id="ambient-value">${state.ambient} °C</output></label><input id="ambient" type="range" min="-10" max="45" value="${state.ambient}"></div><label class="switch-label"><input id="cooling" type="checkbox" ${state.cooling?'checked':''}>Raffreddamento regolare</label></div><div id="advanced-result" class="modal-note" style="margin-top:20px"></div><button class="primary-button" data-action="show-risk">${icon('thermometer')}Osserva le parti sollecitate</button>`, 'CONDIZIONI OPERATIVE');updateAdvanced();}

function updateAdvanced(){const m=simulate(state.type,state);const target=$('#advanced-result');if(target)target.textContent=`${state.type==='ev'?'Avvolgimenti':'Refrigerante'}: ${format(m.temperature)} °C a regime · Potenza disponibile indicativa: ${format(m.power,1)} kW · Coppia disponibile: ${format(m.torque)} Nm. ${m.warning?'Scenario critico: il modello riduce la potenza disponibile e segnala le parti sollecitate.':'Raffreddamento disponibile. Osserva come cambia la temperatura aumentando il carico.'}`;}

async function ar(){modal('Porta il modello nello spazio reale',`<p>Ruota ed esplora il propulsore con un dispositivo compatibile. Il modello viene posizionato a una scala ridotta adatta a un tavolo.</p><div class="ar-options"><button class="primary-button" id="start-ar" data-action="start-ar" disabled>${icon('scan')}Avvia AR · WebXR</button><p id="ar-status" class="ar-status">Verifica della compatibilità del browser…</p><button class="outline-button" data-action="usdz">${icon('smartphone')}Prepara modello per iPad / iPhone (Quick Look)</button><button class="outline-button" data-action="glb">${icon('download')}Scarica modello 3D (.glb)</button></div><div class="modal-note" style="margin-top:20px">WebXR richiede HTTPS, un browser che supporti immersive-ar e l’autorizzazione del dispositivo. Su Meta Quest 3 usa il browser del visore. Inquadra una superficie e selezionala per posizionare il modello. Quick Look apre una versione statica; l’animazione resta nel laboratorio.</div>`, 'REALTÀ AUMENTATA');let supported=false;try{supported=await navigator.xr?.isSessionSupported('immersive-ar')||false;}catch{}if($('#ar-status')){$('#ar-status').textContent=supported?'AR disponibile su questo browser.':'WebXR AR non disponibile qui. Usa un dispositivo compatibile o esporta il modello.';$('#start-ar').disabled=!supported||!viewer;}}

function download(buffer,type,name){const url=URL.createObjectURL(new Blob([buffer],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}

function syncToggles(){document.querySelector('[data-action="section"]').classList.toggle('active',state.section);document.querySelector('[data-action="section"]').setAttribute('aria-pressed',state.section);document.querySelector('[data-action="risk"]').classList.toggle('active',state.risk);document.querySelector('[data-action="risk"]').setAttribute('aria-pressed',state.risk);$('#play-button').innerHTML=icon(state.playing?'pause':'play');$('#play-button').setAttribute('aria-label',state.playing?'Pausa animazione':'Avvia animazione');$('#play-label').textContent=!state.playing?'Animazione in pausa':state.speed===0?'Veicolo fermo':'Animazione in corso';$('#play-button').classList.toggle('running',state.playing);$('.cycle-panel')?.classList.toggle('paused',!state.playing);document.querySelectorAll('[data-action="drag"]').forEach(b=>{b.classList.toggle('active',state.drag);b.setAttribute('aria-pressed',state.drag);});document.querySelectorAll('[data-action="car"],[data-action="engine-view"]').forEach(b=>{const active=b.dataset.action==='car'?state.car:!state.car;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});refreshIcons();}

function toggleInspector(){const collapsed=$('.workspace').classList.toggle('inspector-collapsed');const button=$('[data-action="toggle-inspector"]');button?.setAttribute('aria-expanded',String(!collapsed));button?.classList.toggle('active',!collapsed);}

const actions={

 'toggle-inside':()=>{if(!viewer)return;viewer.setInside(viewer.insideId!==state.selected);renderInsidePanel();refreshIcons();},

 'toggle-inspector':toggleInspector,

 'focus-component':()=>viewer?.presentation.focus(),

 'toggle-flows':()=>{if(viewer)viewer.flows.setEnabled(!viewer.flows.enabled);},

 lab:()=>$('#dialog').close(),compare,lessons,explain,'part-explain':explain,quiz,method,advanced,ar,chat,'energy-flow':energyFlow,

 help:()=>modal('Esplora il laboratorio',`<h3>1. Scegli una tecnologia</h3><p>Usa i tre sistemi a sinistra. Su tablet i selettori sono sopra al modello.</p><h3>2. Guarda dentro il motore</h3><p>Trascina il modello per ruotarlo. La rotella o il gesto a due dita modificano lo zoom. Seleziona un componente sul modello o nell’elenco. Usa Isola per osservarlo da solo. Il pulsante ⓘ accanto a ogni nome apre e chiude le informazioni: passare il mouse non apre testi.</p><h3>3. Scomponi e metti in movimento</h3><p>Il cursore Vista esplosa separa i gruppi. Mostra flussi attiva i percorsi colorati, inizialmente nascosti. Il pulsante play avvia un movimento rallentato; il pulsante sezione rende trasparente il carter.</p><h3>4. Sperimenta</h3><p>Cambia scenario, carico, regime e raffreddamento. Confronta i risultati e prova le domande del tutor guidato.</p>`,'GUIDA RAPIDA'),

 'tutor-info':()=>modal('Un tutor che segue ciò che osservi',`<p>Le schede e i quiz sono contenuti didattici locali con feedback guidato.</p><p>${aiAvailable?'Il servizio AI è collegato e può rispondere a domande contestuali nella sezione Chiedi al tutor AI.':'La conversazione con intelligenza artificiale non è ancora collegata. Il collegamento lato server è predisposto: manca l’attivazione del servizio. Le risposte guidate non sono generate da AI.'}</p><button class="primary-button" data-action="explain">Apri una spiegazione contestuale</button>`,'STATO DEL TUTOR'),

 'close-dialog':()=>$('#dialog').close(),

 isolate:()=>{state.isolated=!state.isolated;viewer?.isolate(state.isolated);renderInspector();renderPartControls();refreshIcons();},

 detach:()=>{const detached=viewer?.detachSelected();viewer?.paint();renderPartControls();refreshIcons();toast(detached?'Componente estratto. Attiva Sposta per trascinarlo nello spazio.':'Componente reinserito nella sua posizione.');},

 'move-part':()=>{state.drag=true;viewer?.setDragMode(true);renderPartControls();syncToggles();toast('Trascina la parte nel modello. Per ruotare la vista, disattiva Sposta componenti.');},

 drag:()=>{state.drag=!state.drag;viewer?.setDragMode(state.drag);renderPartControls();syncToggles();},

 reassemble:()=>{viewer?.resetParts();state.explode=0;viewer?.setExplosion(0);$('#explode').value=0;$('#explode-value').textContent='0%';state.isolated=false;viewer?.isolate(false);selectComponent(state.selected);toast('Tutti i componenti tornano nelle loro sedi.');},

 car:()=>{state.car=true;state.isolated=false;viewer?.isolate(false);viewer?.setCar(true);closeComponentInfo();renderInspector();renderPartControls();syncToggles();},

 'engine-view':()=>{state.car=false;viewer?.setCar(false);syncToggles();},

 'explore-part':()=>{state.isolated=true;viewer?.isolate(true);renderInspector();renderPartControls();refreshIcons();$('#dialog').close();},

 section:()=>{state.section=!state.section;viewer?.setSection(state.section);syncToggles();},

 risk:()=>{state.risk=!state.risk;viewer?.setRisk(state.risk,simulate(state.type,state).warning);syncToggles();toast(state.risk?'Arancione: parti soggette a sollecitazione. È una mappa didattica, non una diagnosi.':'Vista materiali ripristinata.');},

 'show-risk':()=>{state.risk=true;viewer?.setRisk(true,simulate(state.type,state).warning);syncToggles();$('#dialog').close();},

 play:()=>{state.playing=!state.playing;if(viewer)viewer.playing=state.playing;syncToggles();},

 'reset-camera':()=>{viewer?.setInside(false);viewer?.resetCamera();renderInsidePanel();refreshIcons();},

 reset:()=>{closeComponentInfo();viewer?.flows.setEnabled(false);state.explode=0;state.isolated=false;state.risk=false;state.section=true;state.drag=false;viewer?.resetParts();viewer?.setDragMode(false);viewer?.setExplosion(0);viewer?.isolate(false);viewer?.setSection(true);viewer?.setRisk(false);viewer?.resetCamera();$('#explode').value=0;$('#explode-value').textContent='0%';renderInspector();renderPartControls();syncToggles();},

 fullscreen:async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.viewer').requestFullscreen();}catch{toast('Le dimensioni della vista si adattano già allo schermo; il browser non supporta lo schermo intero.');}},

 'next-question':()=>{if(state.quiz<questions.length-1){state.quiz++;quiz();}else{const score=questions.reduce((n,q,i)=>n+(state.answers[i]===q.correct?1:0),0);modal('Percorso completato',`<div class="modal-note">Hai risposto correttamente a <strong>${score} domande su ${questions.length}</strong>.</div><p>Ritorna ai modelli per rivedere i passaggi meno chiari. Un confronto tra componenti e flussi aiuta a collegare teoria e funzionamento.</p><button class="primary-button" data-action="restart-quiz">Riprova le domande</button>`,'VERIFICA COMPLETATA');}},

 'restart-quiz':()=>{state.quiz=0;state.answers={};quiz();},

 'start-ar':async()=>{try{$('#dialog').close();await viewer.startAR();toast('Inquadra una superficie e selezionala per posizionare il motore.');}catch(error){toast(`AR non avviata: ${error.message}`);}},

 glb:async()=>{if(!viewer)return;toast('Preparazione del modello 3D…');try{download(await viewer.exportGLB(),'model/gltf-binary',`engineLab-${state.type}.glb`);toast('Modello GLB pronto.');}catch{toast('Esportazione non riuscita. Riprova con il modello completo.');}},

 usdz:async()=>{if(!viewer)return;toast('Preparazione del modello per Quick Look…');try{const data=await viewer.exportUSDZ();const url=URL.createObjectURL(new Blob([data],{type:'model/vnd.usdz+zip'}));const a=document.createElement('a');a.href=url;a.rel='ar';a.download=`engineLab-${state.type}.usdz`;a.className='primary-button';a.innerHTML='<img src="./favicon.svg" width="20" height="20" alt="">Apri il modello in Quick Look';$('#dialog-body').append(a);toast('Modello pronto: usa il nuovo pulsante per aprirlo.');$('#dialog').addEventListener('close',()=>setTimeout(()=>URL.revokeObjectURL(url),60000),{once:true});}catch{toast('Esportazione Quick Look non riuscita. Puoi scaricare il formato GLB.');}}

};

document.addEventListener('click',async e=>{const el=e.target.closest('button, input[data-action]');if(!el)return;if(el.dataset.system)selectSystem(el.dataset.system);if(el.dataset.component)selectComponent(el.dataset.component);if(el.dataset.componentInfo)toggleComponentInfo(el.dataset.componentInfo);if(el.dataset.action)await actions[el.dataset.action]?.();if(el.dataset.chooseSystem){selectSystem(el.dataset.chooseSystem);$('#dialog').close();}if(el.dataset.answer!==undefined){if(state.answers[state.quiz]!==undefined)return;state.answers[state.quiz]=Number(el.dataset.answer);quiz();}if(el.dataset.lesson){$('#dialog').close();if(el.dataset.lesson==='motion'){selectSystem('ice');state.playing=true;viewer.playing=true;state.section=true;viewer.setSection(true);syncToggles();toast('Segui un pistone e la sua biella per un giro completo.');}else if(el.dataset.lesson==='energy'){state.scenario='city';$('#scenario').value='city';applyScenario();compare();}else advanced();}});

function applyScenario(){const s=scenarios[state.scenario];state.load=s.load;state.speed=Math.min(100,s.speed);state.rpm=roadMotion(state.type,state.speed).rpm;state.ambient=s.ambient;$('#rpm').value=state.rpm;$('#load').value=state.load;updateMetrics();}

document.addEventListener('input',e=>{const id=e.target.id;if(id==='explode'){state.explode=Number(e.target.value);$('#explode-value').textContent=`${state.explode}%`;viewer?.setExplosion(state.explode);}if(id==='rpm'||id==='load'){state[id]=Number(e.target.value);updateMetrics();}if(id==='ambient'){state.ambient=Number(e.target.value);$('#ambient-value').textContent=`${state.ambient} °C`;updateMetrics();updateAdvanced();}if(id==='cooling'){state.cooling=e.target.checked;updateMetrics();updateAdvanced();}});

$('#scenario').addEventListener('change',e=>{state.scenario=e.target.value;applyScenario();});

$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=$('#dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#dialog').close();}});

try{viewer=new PowertrainViewer($('#canvas-host'),selectComponent);}catch(error){console.error(error);$('#canvas-host').innerHTML='<div class="error-panel"><strong>Il 3D non è disponibile in questo browser.</strong><p>Prova un browser con WebGL attivo. Puoi comunque usare schede, simulazioni e confronti.</p></div>';document.querySelectorAll('[data-action="play"],[data-action="ar"],[data-action="section"],[data-action="risk"],[data-action="reset-camera"],[data-action="reset"]').forEach(b=>b.disabled=true);$('#explode').disabled=true;}

const requestedSystem=new URLSearchParams(location.search).get('system');
selectSystem(Object.hasOwn(systems,requestedSystem)?requestedSystem:'ice');refreshIcons();

const sceneTabs=document.createElement('div');sceneTabs.className='scene-tabs';sceneTabs.innerHTML=`<button data-action="engine-view" class="active" aria-pressed="true">${icon('component')}Propulsore</button><button data-action="car" aria-pressed="false">${icon('car-front')}Auto X-ray</button>`;$('.viewer').append(sceneTabs);

const manipulationBar=document.createElement('div');manipulationBar.className='scene-actionbar';manipulationBar.innerHTML=`<button data-action="drag" aria-pressed="false">${icon('hand')}Sposta componenti</button><button data-action="reassemble" title="Ricomponi tutto" aria-label="Ricomponi tutto">${icon('package-check')}</button>`;$('.viewer').append(manipulationBar);

const cyclePanel=document.createElement('div');cyclePanel.className='cycle-panel';cyclePanel.innerHTML='';$('.viewer').append(cyclePanel);

const speed=document.createElement('label');speed.className='speed-control road-speed-control';speed.innerHTML='<span>Velocità <output id="road-speed-value" for="road-speed">0 km/h</output></span><input id="road-speed" aria-label="Velocità del veicolo in km/h" type="range" min="0" max="100" step="1" value="0"><small>0 — 100 km/h · vista rallentata</small>';$('.animation-text').after(speed);

$('#road-speed').addEventListener('input',e=>{state.speed=Number(e.target.value);updateMetrics();syncToggles();});

updateMetrics();



document.addEventListener('input',e=>{if(e.target.dataset.partAxis){viewer?.setPartOffset(e.target.dataset.partAxis,Number(e.target.value));e.target.nextElementSibling.textContent=Number(e.target.value).toFixed(1);}});

syncToggles();renderPartControls();refreshIcons();

const flowButton=document.createElement('button');flowButton.className='icon-button';flowButton.dataset.action='energy-flow';flowButton.title='Flussi energetici';flowButton.setAttribute('aria-label','Flussi energetici');flowButton.innerHTML=icon('route');$('.view-tools').insertBefore(flowButton,$('.view-tools>span'));

const chatButton=document.createElement('button');chatButton.className='tutor-suggestion';chatButton.dataset.action='chat';chatButton.innerHTML=`Chiedi al tutor AI ${icon('message-circle')}`;$('.tutor-footer').before(chatButton);refreshIcons();

fetch('/api/tutor/status').then(r=>r.ok?r.json():null).then(data=>{aiAvailable=data?.available===true;if(aiAvailable)$('.tutor-mode').textContent='AI ATTIVO';}).catch(()=>{});

document.addEventListener('submit',async e=>{if(e.target.id!=='ai-form')return;e.preventDefault();const question=$('#ai-question').value.trim();if(!question)return;const answer=$('#ai-answer'),button=$('#ai-submit');button.disabled=true;answer.hidden=false;answer.textContent='Il tutor sta preparando una spiegazione…';try{const response=await fetch('/api/tutor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,system:state.type,component:state.selected,conditions:{scenario:state.scenario,rpm:state.rpm,load:state.load,ambient:state.ambient,cooling:state.cooling}}),signal:AbortSignal.timeout(30000)});const data=await response.json();answer.textContent=response.ok?data.answer:data.error||'Il tutor non è disponibile.';}catch{answer.textContent='Connessione al tutor non disponibile. Riprova oppure usa le schede guidate.';}finally{button.disabled=false;}});

if(document.modelContext?.registerTool){

 const lifecycle=new AbortController();const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(console.warn);}catch(error){console.warn(error);}};

 register({name:'configure_powertrain_lab',title:'Configura il laboratorio',description:'Seleziona il propulsore e configura carico, regime e vista esplosa nel laboratorio visibile.',inputSchema:{type:'object',properties:{system:{type:'string',enum:['ice','hybrid','ev']},load:{type:'number',minimum:10,maximum:100},rpm:{type:'number',minimum:800,maximum:14000},explosion:{type:'number',minimum:0,maximum:100}},required:['system'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||!systems[input.system])throw new Error('Sistema non valido');for(const [key,min,max]of[['load',10,100],['rpm',800,systems[input.system].maxRpm],['explosion',0,100]])if(input[key]!==undefined&&(typeof input[key]!=='number'||!Number.isFinite(input[key])||input[key]<min||input[key]>max))throw new Error(`Valore ${key} non valido`);selectSystem(input.system);if(input.load!==undefined){state.load=input.load;$('#load').value=input.load;}if(input.rpm!==undefined){state.speed=speedFromRpm(state.type,input.rpm);state.rpm=roadMotion(state.type,state.speed).rpm;$('#rpm').value=state.rpm;}if(input.explosion!==undefined){state.explode=input.explosion;$('#explode').value=state.explode;$('#explode-value').textContent=`${state.explode}%`;viewer?.setExplosion(state.explode);}updateMetrics();return {system:state.type,load:state.load,rpm:state.rpm,explosion:state.explode,metrics:simulate(state.type,state)};}});

 register({name:'read_powertrain_lab',title:'Leggi la simulazione',description:'Legge il propulsore selezionato, il componente e i risultati didattici della simulazione.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return {system:state.type,component:state.selected,conditions:{scenario:state.scenario,load:state.load,rpm:state.rpm,ambient:state.ambient,cooling:state.cooling},metrics:simulate(state.type,state)};}});

 addEventListener('pagehide',()=>lifecycle.abort(),{once:true});

}



const vehicleCard=document.createElement('div');vehicleCard.className='vehicle-card';vehicleCard.innerHTML=`<div class="vehicle-card-top"><span class="xray-dot"></span><strong id="vehicle-name">Caricamento carrozzeria…</strong><span>X-RAY</span></div><small id="vehicle-note"></small>`;$('.viewer').append(vehicleCard);



const studioToolbar=document.createElement('div');studioToolbar.className='studio-toolbar';studioToolbar.innerHTML=`<div><button data-action="toggle-inspector" aria-controls="inspector" aria-expanded="true" class="active">${icon('panel-right')}Scheda componente</button></div>`;$('.page-heading').append(studioToolbar);

const options=document.createElement('div');options.className='viewer-options';options.setAttribute('role','toolbar');options.setAttribute('aria-label','Strumenti di visualizzazione');const existingTools=$('.view-tools');existingTools.before(options);options.append(existingTools);

if(matchMedia('(max-width:900px)').matches)toggleInspector();

refreshIcons();



const flowLegend=document.createElement('section');flowLegend.id='flow-legend';flowLegend.className='flow-legend';flowLegend.setAttribute('aria-label','Legenda dei flussi luminosi');$('.page-heading').after(flowLegend);

const flowToggle=document.createElement('button');flowToggle.dataset.action='toggle-flows';flowToggle.setAttribute('aria-pressed','false');flowToggle.setAttribute('aria-label','Mostra flussi');flowToggle.innerHTML=`${icon('route')}<span>Mostra flussi</span>`;

$('.scene-actionbar').prepend(flowToggle);viewer?.flows.renderLegend();refreshIcons();
const flowSelect=document.createElement('select');flowSelect.id='flow-kind';flowSelect.setAttribute('aria-label','Percorso luminoso');flowSelect.hidden=true;flowToggle.after(flowSelect);viewer?.flows.renderLegend();



document.addEventListener('input',e=>{if(e.target.id==='inside-opacity'&&viewer){viewer.insideOpacity=1-Number(e.target.value)/100;viewer.paint();document.getElementById('inside-opacity-value').textContent=e.target.value+'%';}});







const brightnessControl=document.createElement('label');brightnessControl.className='brightness-control';brightnessControl.innerHTML='<span title="Luminosità">☀ <output id="brightness-value" for="scene-brightness">0</output></span><input id="scene-brightness" type="range" min="0" max="100" step="5" value="0" aria-label="Luminosità della scena" aria-orientation="vertical" aria-valuetext="0, luminosità minima">';$('.viewer').append(brightnessControl);

$('#scene-brightness').addEventListener('input',e=>{const value=Number(e.target.value);if(viewer)viewer.renderer.toneMappingExposure=1.15*(.6+value/100);const label=String(value);$('#brightness-value').textContent=label;e.target.setAttribute('aria-valuetext',value===0?'0, luminosità minima':label);});



const scanButton=document.createElement('button');scanButton.className='technical-scan-button';scanButton.dataset.action='technical-scan';scanButton.innerHTML=icon('scan')+'Basamento reale 3D';$('.page-heading').append(scanButton);refreshIcons();

actions['technical-scan']=()=>{modal('Un basamento reale, da vicino',`<p>Scansione di riferimento: osserva fusioni, sedi e superfici lavorate. Questa vista è statica; per animazioni e smontaggio usa il modello didattico del laboratorio.</p><div id="scan-host"><span class="scan-status">Caricamento scansione tecnica…</span></div><p class="scan-credit">Four-cylinder engine di <a href="https://www.artec3d.com/3d-models/four-cylinder-engine" target="_blank" rel="noopener">Artec 3D</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> · geometria ottimizzata e materiale adattato. Trascina per ruotare, scorri per ingrandire.</p>`,'RIFERIMENTO TECNICO · SCANSIONE 3D');$('#dialog').classList.add('scan-dialog');const h=$('#scan-host');import('./scan-viewer.js').then(({showScan})=>{if(h?.isConnected&&$('#dialog').open&&!h.scanDispose)showScan(h);});};

$('#dialog').addEventListener('close',()=>$('#scan-host')?.scanDispose?.());



// The component browser stays inside the fullscreen element.

const viewerComponents=document.createElement('section');viewerComponents.className='viewer-components';viewerComponents.setAttribute('aria-label','Esplora componenti');viewerComponents.innerHTML=`<div class="viewer-components-heading">${icon('list-tree')}<span>Componenti</span><b id="viewer-part-count"></b></div><div class="viewer-component-list" aria-label="Componenti del propulsore"></div>`;$('.viewer').append(viewerComponents);

const viewerSheet=document.createElement('aside');viewerSheet.className='viewer-technical-card';viewerSheet.id='viewer-component-info';viewerSheet.hidden=true;viewerSheet.setAttribute('aria-label','Scheda tecnica nel viewer');$('.viewer').append(viewerSheet);

const motionReadout=document.createElement('div');motionReadout.id='motion-readout';motionReadout.className='drivetrain-readout';$('.cycle-panel').append(motionReadout);

const disconnect=document.createElement('small');disconnect.id='transmission-state';$('.cycle-panel').append(disconnect);


actions['close-viewer-sheet']=closeComponentInfo;

actions['focus-selected']=()=>viewer?.select(state.selected,true);

document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement){$('.viewer').append($('#dialog'));renderViewerSheet();}else{document.body.append($('#dialog'));renderViewerSheet();}refreshIcons();});

renderSystems();updateMetrics();refreshIcons();


const realtimeButton=document.createElement('button');realtimeButton.dataset.action='realtime';realtimeButton.className='realtime-toggle';realtimeButton.setAttribute('aria-pressed','false');realtimeButton.setAttribute('title','Passa dal rallentatore didattico (3%) al tempo reale. Ad alti regimi possono apparire effetti stroboscopici.');realtimeButton.innerHTML=icon('timer')+'<span>Tempo reale</span>';$('.view-tools').append(realtimeButton);
actions.realtime=()=>{if(!viewer)return;const real=viewer.playbackRate!==100;viewer.playbackRate=real?100:3;realtimeButton.setAttribute('aria-pressed',String(real));realtimeButton.classList.toggle('active',real);$('.animation-text>span').textContent=real?'Movimento in tempo reale':'Movimento al rallentatore';$('.road-speed-control>small').textContent=real?'0 — 100 km/h · tempo reale':'0 — 100 km/h · vista rallentata';};
refreshIcons();

// Measurements live below the viewer; fullscreen keeps the model unobstructed.
const livePanel=viewer?mountLivePanel(viewer,state):null;
const liveButton=document.createElement('button');liveButton.className='icon-button';liveButton.dataset.action='show-parameters';liveButton.setAttribute('aria-label','Vai ai parametri sotto il viewer');liveButton.title='Parametri sotto il viewer';liveButton.innerHTML=icon('chart-no-axes-combined');$('.view-tools').append(liveButton);
actions['show-parameters']=async()=>{if(document.fullscreenElement)await document.exitFullscreen();const panel=$('.parameters');panel.focus({preventScroll:true});panel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});};
actions['reset-trip']=()=>livePanel?.reset();

mountLabAccount({modal,capture:()=>({
 type:state.type,selected:state.selected,scenario:state.scenario,speed:state.speed,load:state.load,ambient:state.ambient,cooling:state.cooling,
 section:state.section,car:state.car,explode:state.explode,brightness:Number($('#scene-brightness').value),
 parts:Object.fromEntries(Object.entries(viewer?.parts||{}).map(([id,p])=>[id,{detached:p.userData.detached,offset:p.userData.manualOffset.toArray()}]))
}),restore:s=>{
 selectSystem(s.type);Object.assign(state,{selected:s.selected,scenario:s.scenario,speed:s.speed,load:s.load,ambient:s.ambient,cooling:s.cooling,section:s.section,car:s.car,explode:s.explode,playing:false});
 $('#scenario').value=s.scenario;$('#load').value=s.load;$('#explode').value=s.explode;$('#explode-value').textContent=s.explode+'%';
 $('#scene-brightness').value=s.brightness;$('#scene-brightness').dispatchEvent(new Event('input',{bubbles:true}));
 if(viewer){viewer.playing=false;viewer.setCar(s.car);viewer.setSection(s.section);viewer.setExplosion(s.explode);for(const [id,p]of Object.entries(s.parts)){if(viewer.parts[id]){viewer.parts[id].userData.detached=p.detached;viewer.parts[id].userData.manualOffset.fromArray(p.offset);}}viewer.paint();viewer.flows.setEnabled(false);}
 selectComponent(s.selected,false);updateMetrics();syncToggles();livePanel?.reset();
}});
actions['live-help']=()=>modal('Leggere i parametri in marcia',`<p>Muovi lo slider della velocità e osserva cosa cambia. I valori sono <strong>stime di un modello didattico</strong>, non misure delle auto mostrate.</p><div class="explanation-block"><h3>Quanto consuma?</h3><p><strong>L/100 km</strong>: litri necessari per percorrere 100 km. Un numero più basso indica meno consumo.<br><strong>km con 1 litro</strong>: la stessa informazione al contrario; qui un numero più alto è migliore.<br><strong>L/h</strong>: benzina consumata in un’ora alle condizioni correnti. Nell’elettrico si usano kWh e kW.</p></div><div class="explanation-block"><h3>Cosa esce dallo scarico?</h3><p>La <strong>CO₂</strong> è anidride carbonica, un gas che contribuisce al riscaldamento globale. <strong>g/s</strong> indica i grammi emessi ogni secondo; il totale cresce durante la prova. Il modello usa circa 2,35 kg di CO₂ per litro di benzina, ricavati dal <a href="https://www.epa.gov/greenvehicles/comparison-your-car-vs-electric-vehicle" target="_blank" rel="noreferrer">fattore EPA</a>.</p><p>L’elettrico ha zero CO₂ allo scarico; qui non calcoliamo produzione dell’elettricità e ciclo di vita. Altri inquinanti, come CO, NOx e idrocarburi, richiedono dati di combustione e catalizzatore: questo modello non ne stima le quantità. <a href="https://www.epa.gov/greenvehicles/smog-vehicle-emissions" target="_blank" rel="noreferrer">Informazioni sugli inquinanti</a>.</p></div><div class="explanation-block"><h3>Perché cambia con il tempo?</h3><p>Il motore parte alla temperatura ambiente e si scalda gradualmente. Nel termico e nell’ibrido applichiamo una maggiorazione didattica del consumo fino al 15% a freddo. Il riscaldamento è volutamente illustrativo: la costante di tempo di 90 secondi è una scelta didattica, non il tempo di riscaldamento di un’auto reale. Temperatura, sforzo e percorso modificano il risultato. Il raffreddamento si prova nelle condizioni operative.</p><p>La potenza netta richiesta alle ruote è l’energia meccanica netta per 100 km moltiplicata per la velocità e divisa per 100. Il rendimento indica la quota dell’energia in ingresso convertita in energia meccanica; il resto è perso, soprattutto come calore. È distinto dalla potenza massima disponibile indicata nelle condizioni operative.</p></div><p>I totali seguono i secondi reali anche con animazione rallentata. Pausa, scheda non visibile e trasmissione separata fermano la prova. A 0 km/h il motore è spento; non simuliamo il minimo. Cambiando propulsore o premendo Azzera prova i contatori ripartono. Nell’ibrido la batteria ha bilancio energetico medio neutro sul percorso. Consumo e recupero rappresentano medie convenzionali dello scenario alla velocità impostata: non simuliamo cambi marcia, accelerazioni, frenate o stato di carica della batteria.</p>`,'GUIDA AI PARAMETRI');


refreshIcons();
