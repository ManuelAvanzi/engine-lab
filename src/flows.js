import * as THREE from 'three';
import {ratios,drivetrain,slowMotion,valveOpening} from './motion.js';

const colors={air:'#62baff',exhaust:'#ff7967',electric:'#67e5d2',torque:'#efbc67'};
const captions={air:'Aria aspirata',exhaust:'Gas di scarico',electric:'Energia elettrica',torque:'Coppia meccanica'};
const lessons={
 air:['Aspirazione → cilindri','L’aria porta ossigeno. Durante l’aspirazione entra nel cilindro attraverso le valvole aperte; servirà alla combustione del carburante.','Materia in movimento'],
 exhaust:['Cilindri → collettore di scarico','Dopo l’espansione, il pistone espelle i gas attraverso le valvole di scarico. Il percorso mostra l’uscita dal motore, non l’intera linea di scarico.','Materia e calore'],
 electric:['Batteria → inverter → statore','In trazione la batteria alimenta l’inverter in corrente continua (DC). L’inverter alimenta gli avvolgimenti dello statore in corrente alternata (AC): il campo magnetico genera coppia sul rotore. La scia indica il verso dell’energia, non il moto degli elettroni.','Energia elettrica · trazione'],
 torque:['Motore → trasmissione → ruote','La trasmissione riduce la velocità di rotazione e aumenta la coppia disponibile, al netto delle perdite. La scia rappresenta il trasferimento di energia meccanica, non un fluido.','Rotazione e forza']
};
export class FlowAnimation{
 constructor(viewer){this.v=viewer;this.enabled=false;this.selected='air';this.phase=0;this.paths=[];this.group=new THREE.Group();this.group.visible=false;this.group.name='Percorsi didattici luminosi';viewer.scene.add(this.group);document.addEventListener('click',e=>{const b=e.target.closest('[data-flow-kind]');if(b){this.selected=b.dataset.flowKind;this.renderLegend();}});document.addEventListener('change',e=>{if(e.target.id==='flow-kind'){this.selected=e.target.value;this.renderLegend();}});}
 setEnabled(value){this.enabled=Boolean(value);if(!this.enabled)this.group.visible=false;this.renderLegend();}
 clear(){this.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.group.clear();this.paths=[];}
 path(kind,points,gate=null){
  const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
  const group=new THREE.Group(),materials=[];this.group.add(group);
  // A continuous luminous filament with tapered moving packets, no solid arrows.
  for(const [radius,strength] of [[.025,1],[.075,.18]]){
   const material=new THREE.ShaderMaterial({uniforms:{color:{value:new THREE.Color(colors[kind])},phase:{value:0},strength:{value:strength}},transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 color; uniform float phase; uniform float strength; varying vec2 vUv; void main(){float p=fract(vUv.x*3.-phase);float tail=smoothstep(.38,.98,p)*(1.-smoothstep(.98,1.,p));float edge=sin(vUv.y*3.14159);gl_FragColor=vec4(color,(.09+tail*.91)*strength*(.4+.6*edge));}'});
   const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,80,radius,8,false),material);mesh.renderOrder=6;group.add(mesh);materials.push(material);
  }
  this.paths.push({kind,group,materials,length:curve.getLength(),gate,points});
 }
 rebuild(){
  this.clear();const v=this.v;if(!v.type)return;v.root.updateMatrixWorld(true);v.car.updateMatrixWorld(true);
  // Geometry coordinates belong to their part, not directly to the model root.
  // This includes the hybrid's assembly offset and the EV battery's car layout.
  const point=(id,x,y,z)=>(v.parts[id]||v.root).localToWorld(new THREE.Vector3(x,y,z));
  const link=(kind,a,b,lift=.3)=>this.path(kind,[a,a.clone().lerp(b,.45).add(new THREE.Vector3(0,lift,0)),b]);
  if(v.type!=='ice'){
   const ev=v.type==='ev';
   const battery=ev?point('battery',0,v.carMode?.31:.01,v.carMode?5.4:-1.95):point('battery',.1,.35,-2.4);
   const inverter=point('inverter',ev?0:2.7,ev?2.55:1.95,0);
   const motor=ev?point('stator',0,1.17,-.7):point('motor',2.9,.43,-.6);
   // Battery DC -> inverter -> motor electrical input (AC after conversion).
   link('electric',battery,inverter,.32);link('electric',inverter,motor,.22);
  }
  if(v.type!=='ev'){
   const xs=[-1.38,-.46,.46,1.38];
   this.path('air',[point('intake',-2.15,1.57,-1.2),point('intake',0,1.57,-1.2),point('intake',1.38,1.57,-1.2)]);
   xs.forEach((x,index)=>{
    this.path('air',[point('intake',x,1.58,-1.18),point('intake',x,1.84,-1.19),point('intake',x,2.23,-.95),point('head',x,2.17,-.65),point('head',x,2.015,-.32),point('head',x,1.8,0)],{index,side:0});
    this.path('exhaust',[point('head',x,1.8,0),point('head',x,2.015,.32),point('exhaust',x,2.02,.65),point('exhaust',x,1.91,.98),point('exhaust',x*.63,1.3,1.21),point('exhaust',x*.35,1.03,1.27),point('exhaust',0,.99,1.25)],{index,side:1});
   });
   this.path('exhaust',[point('exhaust',0,.99,1.25),point('exhaust',.45,.99,1.25),point('exhaust',.85,.99,1.25)]);
  }
  let output;
  if(v.type==='ev'){
   const input=point('reducer',2.16,1.17,0);output=point('reducer',2.16,.07,0);
   link('torque',point('shaft',1.8,1.17,0),input,0);link('torque',input,output,.1);
  }else if(v.type==='hybrid'){
   const input=point('transmission',3.8,.43,0);output=point('transmission',3.8,-.285,0);
   // Parallel contributions, both ending at the transmission input.
   link('torque',point('crank',2.0,.43,0),input,.25);
   link('torque',point('motor',3.425,.43,0),input,-.15);link('torque',input,output,.1);
  }else output=point('crank',2.1,.43,0);
  const wheels=(v.car.userData.wheels||[]).map(w=>w.getWorldPosition(new THREE.Vector3()));
  if(v.carMode&&wheels.length===4){
   const driven=wheels.sort((a,b)=>v.type!=='hybrid'?a.z-b.z:b.z-a.z).slice(0,2);
   const axle=driven[0].clone().lerp(driven[1],.5);link('torque',output,axle,.2);
   for(const wheel of driven)link('torque',axle,wheel,.12);
  }else if(v.type==='ice')link('torque',point('crank',-1.8,.43,0),output,0);
  this.renderLegend();
 }
 renderLegend(){
  const v=this.v,legend=document.getElementById('flow-legend');if(!legend)return;legend.hidden=!this.enabled;
  const kinds=v.type==='ice'?['air','exhaust','torque']:v.type==='ev'?['electric','torque']:['air','exhaust','electric','torque'];
  if(!kinds.includes(this.selected))this.selected=kinds[0];const lesson=lessons[this.selected],expanded=legend.querySelector('.flow-details')?.open;
  const toggle=document.querySelector('[data-action="toggle-flows"]');if(toggle){toggle.setAttribute('aria-pressed',String(this.enabled));toggle.classList.toggle('active',this.enabled);toggle.setAttribute('aria-label',this.enabled?'Nascondi flussi':'Mostra flussi');toggle.querySelector('span').textContent=this.enabled?'Nascondi flussi':'Mostra flussi';}
  const select=document.getElementById('flow-kind');if(select){select.hidden=!this.enabled;select.innerHTML=kinds.map(k=>`<option value="${k}">${captions[k]}</option>`).join('');select.value=this.selected;}
  legend.innerHTML=`<div class="flow-tabs" aria-label="Scegli il percorso da seguire">${kinds.map((k,i)=>`<button data-flow-kind="${k}" aria-pressed="${k===this.selected}" style="--flow-color:${colors[k]}"><b>0${i+1}</b>${captions[k]}</button>`).join('')}</div><details class="flow-details" ${expanded?'open':''}><summary>Spiegazione del flusso</summary><div class="flow-lesson" style="--flow-color:${colors[this.selected]}"><div><span>${lesson[2]}</span><strong>${lesson[0]}</strong></div><p>${lesson[1]} ${this.selected==='torque'?(v.type==='hybrid'?'Nel modello parallelo i due motori contribuiscono alla stessa trasmissione.':v.type==='ice'?'Cambio e differenziale non sono modellati: il tratto verso le ruote ne riassume il collegamento.':'Il riduttore collega l’albero del motore alle ruote.'):this.selected==='electric'?'In questa vista mostriamo la trazione; la rigenerazione non è animata.':'I quattro rami si attivano con le rispettive valvole; la portata non è calcolata.'}</p></div><div id="drivetrain-readout"></div><small id="flow-status"></small></details>`;
 }
 update(step,assembled){
  const v=this.v;if(assembled&&!this.wasAssembled)this.rebuild();this.wasAssembled=assembled;this.phase+=step;const visible=this.enabled&&assembled&&v.rpm>0&&!v.isolated&&!v.insideId&&!v.hoverId&&!v.xrSession;
  this.group.visible=visible;
  for(const path of this.paths){const open=!path.gate||valveOpening(v.angle,path.gate.index,path.gate.side)>0;path.group.visible=path.kind===this.selected&&open;if(visible)for(const material of path.materials)material.uniforms.phase.value=this.phase*2/Math.max(1,path.length);}
  const readout=document.getElementById('drivetrain-readout');if(readout){const d=drivetrain(v.type,v.rpm),text=assembled?`${Math.round(v.rpm).toLocaleString('it-IT')} rpm motore ÷ ${d.ratio} = ${Math.round(d.wheelRpm).toLocaleString('it-IT')} rpm ruote`:'Collegamento interrotto · ruote ferme';if(readout.textContent!==text)readout.textContent=text;}
  const status=document.getElementById('flow-status');if(status){
   const text=v.insideId||v.hoverId?'Flussi sospesi durante l’ispezione del componente.':!this.enabled?'Flussi nascosti.':!assembled||v.isolated?'Trasmissione sospesa: ricomponi e mostra il sistema completo.':v.rpm===0?'Veicolo fermo: imposta una velocità per vedere i flussi.':`${!v.playing?'In pausa':`${Math.round(v.roadSpeed||0)} km/h`} · ${v.playbackRate===100?'tempo reale':`vista rallentata ${(slowMotion/v.playbackRate).toFixed(1)}:1`} · diametro ruota didattico 0,65 m · rapporto totale ${ratios[v.type]}:1 illustrativo, fisso. Valori rpm riferiti al modello in marcia. Scie schematiche: non indicano la velocità reale di gas o corrente.`;
   if(status.textContent!==text)status.textContent=text;
   status.dataset.phase=this.phase.toFixed(3);status.dataset.wheelAngle=v.wheelAngle.toFixed(3);status.dataset.active=String(visible);
  }
  document.getElementById('flow-legend')?.classList.toggle('flows-disabled',!this.enabled);
 }
}
