import {simulate,systems} from './data.js';
import {roadMotion} from './motion.js';

// Deliberate lesson presets; the ordinary laboratory still starts at zero.
export const motionLesson={type:'ice',speed:40,playing:true,section:true,car:false,explode:0};
export const experimentTopics={motion:'Dalla velocità ai giri',energy:'Consumi ed emissioni',cooling:'Indaga il raffreddamento'};
export function makeExperiment(type,conditions,topic='motion'){
 const base={...conditions,speed:40,cooling:true};
 const changed={...base,...(topic==='cooling'?{cooling:false}:{speed:80})};
 const before=simulate(type,base),after=simulate(type,changed);
 const wheelsBefore=roadMotion(type,base.speed),wheelsAfter=roadMotion(type,changed.speed);
 const ev=type==='ev',f=(n,d=1)=>new Intl.NumberFormat('it-IT',{maximumFractionDigits:d}).format(n);
 const common={type,topic,base,changed,before,after,title:experimentTopics[topic],system:systems[type].short};
 if(topic==='motion')return {...common,
  question:'Passando da 40 a 80 km/h, con lo stesso rapporto, come cambiano i giri di ruote e motore?',
  choices:['Raddoppiano entrambi','Raddoppiano solo le ruote','Il motore mantiene gli stessi giri'],correct:0,
  rows:[['Velocità','40 km/h','80 km/h'],['Ruote',f(wheelsBefore.wheelRpm,0)+' rpm',f(wheelsAfter.wheelRpm,0)+' rpm'],['Motore',f(before.rpm,0)+' rpm',f(after.rpm,0)+' rpm']],
  explanation:'La distanza percorsa in un minuto raddoppia: ogni ruota deve compiere il doppio dei giri. Il rapporto fisso moltiplica i giri delle ruote per lo stesso fattore. La vista rallentata conserva questa proporzione.',
  reflect:'Su un’auto reale con cambio, cosa succederebbe ai giri del motore passando a una marcia più alta alla stessa velocità?',source:'cinematica'};
 if(topic==='energy')return {...common,
  question:ev?'Se aumenti la velocità, come cambiano il consumo elettrico per 100 km e la CO₂ allo scarico in questo modello?':'Se aumenti la velocità, come cambiano consumo per 100 km e CO₂ allo scarico in questo modello?',
  choices:ev?['Il consumo aumenta; la CO₂ allo scarico resta zero','Consumo e CO₂ allo scarico aumentano','Entrambi restano uguali']:['Aumentano entrambi','Il consumo aumenta ma la CO₂ non cambia','Diminuiscono entrambi'],correct:0,
  rows:[['Velocità','40 km/h','80 km/h'],['Consumo',f(before.consumption)+(ev?' kWh':' L')+'/100 km',f(after.consumption)+(ev?' kWh':' L')+'/100 km'],['CO₂ allo scarico',f(before.co2,0)+' g/km',f(after.co2,0)+' g/km']],
  explanation:ev?'Il modello aumenta la domanda energetica con la velocità. Il motore elettrico non brucia benzina: la CO₂ allo scarico rimane nulla. Produzione dell’elettricità e batteria richiedono un bilancio diverso.':'La domanda energetica aumenta con la velocità. Il modello ricava i litri dall’energia e la CO₂ dai litri: a parità di combustibile, più benzina bruciata significa più CO₂. Sono stime a caldo, non consumi omologati.',
  reflect:'Quale valore useresti per confrontare termico ed elettrico: litri contro kWh, oppure l’energia in ingresso nella stessa unità?',source:'conversioni'};
 return {...common,
  question:'A 40 km/h e con lo stesso carico, cosa prevede il modello se il raffreddamento diventa insufficiente?',
  choices:['Temperatura più alta e potenza disponibile ridotta','Temperatura invariata','Aumenta la potenza disponibile'],correct:0,
  rows:[['Raffreddamento','Regolare','Insufficiente'],['Temperatura a regime',f(before.temperature)+' °C',f(after.temperature)+' °C'],['Potenza disponibile',f(before.power)+' kW',f(after.power)+' kW']],
  explanation:'La temperatura di equilibrio sale e il modello applica una limitazione di potenza. Nel pannello la temperatura cambia gradualmente. Tempi e soglie sono ipotesi didattiche, non limiti di sicurezza o diagnosi di un veicolo.',
  reflect:'Come distingueresti un problema di raffreddamento da un aumento del carico? Quale variabile devi tenere costante nella prova?',source:'ipotesi'};
}
