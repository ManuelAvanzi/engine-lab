import {LiveSimulation} from './live-simulation.js';

const f=(value,digits=1)=>value===null?'—':new Intl.NumberFormat('it-IT',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
export function mountLivePanel(viewer,state){
 const panel=document.createElement('section');panel.className='live-panel';panel.id='live-panel';panel.setAttribute('aria-label','Dati della prova');
 panel.innerHTML=`<div class="live-heading"><span id="live-state" role="status">Veicolo fermo</span><span>Stime del modello · non misure del veicolo</span></div>
 <div class="live-values">
  <div><span id="live-consumption-label">Benzina</span><strong><output id="live-consumption">—</output><small id="live-consumption-unit">L/100 km</small></strong><p id="live-economy">Avvia la marcia con lo slider</p></div>
  <div><span>CO₂ allo scarico</span><strong><output id="live-co2">0,00</output><small>g/s</small></strong><p id="live-co2-distance">0 grammi ogni secondo</p></div>
  <div><span>Temperatura stimata</span><strong><output id="live-temperature">20</output><small>°C</small></strong><p id="live-temperature-part">Liquido di raffreddamento</p></div>
 </div>
 <details class="live-extra"><summary>Altri parametri e totali della prova</summary>
  <dl class="live-secondary">
   <div><dt id="live-rate-label">Benzina ogni ora</dt><dd id="live-rate">0,00 L/h</dd></div>
   <div><dt>Potenza netta richiesta alle ruote</dt><dd id="live-power">0,0 kW</dd></div>
   <div><dt>Rendimento stimato del sistema</dt><dd id="live-efficiency">—</dd></div>
   <div><dt id="live-total-label">Benzina consumata</dt><dd id="live-total">0,000 L</dd></div>
   <div><dt>CO₂ emessa nella prova</dt><dd id="live-total-co2">0,0 g</dd></div>
   <div><dt>Distanza e tempo in marcia</dt><dd id="live-trip">0,000 km · 0:00</dd></div>
  </dl>
  <div class="live-actions"><button data-action="reset-trip">Azzera prova</button><button data-action="live-help">Come leggere i valori</button></div>
 </details><small class="live-disclaimer">Consumi riferiti alle condizioni impostate · totali in tempo reale · riscaldamento illustrativo</small>`;
 document.querySelector('.parameter-controls').before(panel);
 const sim=new LiveSimulation(state.type,state.ambient),nodes={};panel.querySelectorAll('[id]').forEach(n=>nodes[n.id]=n);
 let previous=performance.now();
 const put=(id,text)=>{if(nodes[id].textContent!==text)nodes[id].textContent=text;};
 function update(){
  const now=performance.now(),dt=(now-previous)/1000;previous=now;
  const m=sim.step({...state,hidden:document.hidden,assembled:viewer.drivetrainAssembled!==false},dt),ev=state.type==='ev';
  put('live-state',m.paused?'Prova in pausa':m.running?'In marcia':'Veicolo fermo');
  put('live-consumption-label',ev?'Elettricità':'Benzina');put('live-consumption',f(m.per100));put('live-consumption-unit',ev?'kWh/100 km':'L/100 km');
  put('live-economy',m.per100===null?'Imposta una velocità superiore a 0':ev?'Energia per percorrere 100 km':`${f(m.kmPerLiter)} km con 1 litro`);
  put('live-co2',f(m.co2Second,2));put('live-co2-distance',ev?'Zero CO₂ allo scarico':m.co2Km===null?'Motore spento: nessuna combustione':`${f(m.co2Km,0)} g per ogni km`);
  put('live-temperature',f(m.temperature,1));put('live-temperature-part',ev?'Avvolgimenti del motore':'Liquido di raffreddamento');
  put('live-rate-label',ev?'Prelievo elettrico':'Benzina ogni ora');put('live-rate',ev?`${f(m.inputKw,2)} kW`:`${f(m.litersHour,2)} L/h`);
  put('live-power',`${f(m.powerKw)} kW`);put('live-efficiency',m.running?`${f(m.efficiency)}%`:'—');
  put('live-total-label',ev?'Energia consumata':'Benzina consumata');put('live-total',ev?`${f(m.energy,3)} kWh`:`${f(m.fuel,3)} L`);put('live-total-co2',`${f(m.co2)} g`);
  const seconds=Math.floor(m.seconds);put('live-trip',`${f(m.distance,3)} km · ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`);
 }
 const clock=setInterval(update,250);document.addEventListener('visibilitychange',()=>{previous=performance.now();});addEventListener('pagehide',()=>clearInterval(clock),{once:true});update();
 return {element:panel,reset(){sim.reset(state.type,state.ambient);previous=performance.now();update();}};
}
