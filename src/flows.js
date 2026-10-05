import * as THREE from 'three';
import {ratios,drivetrain,slowMotion} from './motion.js';

const colors={air:'#62baff',exhaust:'#ff7967',electric:'#67e5d2',torque:'#efbc67'};
const captions={air:'Aria aspirata',exhaust:'Gas di scarico',electric:'Energia elettrica',torque:'Coppia meccanica'};
const lessons={
 air:['Aspirazione → cilindri','L’aria porta ossigeno. Durante l’aspirazione entra nel cilindro attraverso le valvole aperte; servirà alla combustione del carburante.','Materia in movimento'],
 exhaust:['Cilindri → collettore di scarico','Dopo l’espansione, il pistone espelle i gas attraverso le valvole di scarico. Il percorso mostra l’uscita dal motore, non l’intera linea di scarico.','Materia e calore'],
 electric:['Batteria → inverter → motore','La batteria fornisce corrente continua (DC). L’inverter la converte in corrente alternata (AC), creando nello statore il campo magnetico che fa ruotare il rotore.','Energia che si trasforma'],
 torque:['Motore → trasmissione → ruote','La trasmissione riduce la velocità di rotazione e aumenta la coppia disponibile, al netto delle perdite. La scia rappresenta il trasferimento di energia meccanica, non un fluido.','Rotazione e forza']
};
export class FlowAnimation{
 constructor(viewer){this.v=viewer;this.enabled=true;this.selected='air';this.phase=0;this.paths=[];this.group=new THREE.Group();this.group.name='Percorsi didattici luminosi';viewer.scene.add(this.group);document.addEventListener('click',e=>{const b=e.target.closest('[data-flow-kind]');if(b){this.selected=b.dataset.flowKind;this.renderLegend();}});}
 clear(){this.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.group.clear();this.paths=[];}
 path(kind,points){
  const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
  const group=new THREE.Group(),materials=[];this.group.add(group);
  // A continuous luminous filament with tapered moving packets, no solid arrows.
  for(const [radius,strength] of [[.025,1],[.075,.18]]){
   const material=new THREE.ShaderMaterial({uniforms:{color:{value:new THREE.Color(colors[kind])},phase:{value:0},strength:{value:strength}},transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 color; uniform float phase; uniform float strength; varying vec2 vUv; void main(){float p=fract(vUv.x*3.-phase);float tail=smoothstep(.38,.98,p)*(1.-smoothstep(.98,1.,p));float edge=sin(vUv.y*3.14159);gl_FragColor=vec4(color,(.09+tail*.91)*strength*(.4+.6*edge));}'});
   const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,80,radius,8,false),material);mesh.renderOrder=6;group.add(mesh);materials.push(material);
  }
  this.paths.push({kind,group,materials,length:curve.getLength()});
 }
 rebuild(){
  this.clear();const v=this.v;if(!v.type)return;v.root.updateMatrixWorld(true);v.car.updateMatrixWorld(true);
  const local=(x,y,z)=>v.root.localToWorld(new THREE.Vector3(x,y,z));
  const anchor=(id,fallback)=>v.parts[id]?new THREE.Box3().setFromObject(v.parts[id]).getCenter(new THREE.Vector3()):local(...fallback);
  const link=(kind,a,b,lift=.3)=>this.path(kind,[a,a.clone().lerp(b,.45).add(new THREE.Vector3(0,lift,0)),b]);
  if(v.type!=='ice'){
   const battery=anchor('battery',[0,0,-2]),inverter=anchor('inverter',[0,2.55,0]),motor=local(v.type==='ev'?0:2.87,1.17,0);
   // Battery DC -> inverter -> motor electrical input (AC after conversion).
   link('electric',battery,inverter,.32);link('electric',inverter,motor,.22);
  }
  if(v.type!=='ev'){
   this.path('air',[local(-.5,2.1,-2.5),local(-.5,2.15,-1.3),local(0,2.2,-.4),local(0,1.8,0)]);
   this.path('exhaust',[local(.6,1.8,.1),local(.6,2.1,.65),local(.5,1.1,1.45),local(.2,.85,2.7)]);
  }
  const shaft=local(v.type==='ev'?1.5:1.8,v.type==='ev'?1.17:.43,0);
  const output=anchor(v.type==='ev'?'reducer':v.type==='hybrid'?'transmission':'crank',[2,.6,0]);
  if(v.type==='hybrid')link('torque',local(2.9,.85,0),output,.15);
  if(v.type!=='ice')link('torque',shaft,output,.1);
  const wheels=(v.car.userData.wheels||[]).map(w=>w.getWorldPosition(new THREE.Vector3()));
  if(v.carMode&&wheels.length===4){
   const driven=wheels.sort((a,b)=>v.type!=='hybrid'?a.z-b.z:b.z-a.z).slice(0,2);
   const axle=driven[0].clone().lerp(driven[1],.5);link('torque',output,axle,.2);
   for(const wheel of driven)link('torque',axle,wheel,.12);
  }else link('torque',output,local(v.type==='ev'?3.6:4.4,.65,.4),.15);
  this.renderLegend();
 }
 renderLegend(){
  const v=this.v,legend=document.getElementById('flow-legend');if(!legend)return;
  const kinds=v.type==='ice'?['air','exhaust','torque']:v.type==='ev'?['electric','torque']:['air','exhaust','electric','torque'];
  if(!kinds.includes(this.selected))this.selected=kinds[0];const lesson=lessons[this.selected],expanded=legend.querySelector('.flow-details')?.open;
  legend.innerHTML=`<div class="flow-tabs" aria-label="Scegli il percorso da seguire">${kinds.map((k,i)=>`<button data-flow-kind="${k}" aria-pressed="${k===this.selected}" style="--flow-color:${colors[k]}"><b>0${i+1}</b>${captions[k]}</button>`).join('')}</div><details class="flow-details" ${expanded?'open':''}><summary>Spiegazione del flusso</summary><div class="flow-lesson" style="--flow-color:${colors[this.selected]}"><div><span>${lesson[2]}</span><strong>${lesson[0]}</strong></div><p>${lesson[1]}</p></div><div id="drivetrain-readout"></div><small id="flow-status"></small></details>`;
 }
 update(step,assembled){
  const v=this.v;if(assembled&&!this.wasAssembled)this.rebuild();this.wasAssembled=assembled;this.phase+=step;const visible=this.enabled&&assembled&&!v.isolated&&!v.insideId&&!v.xrSession;
  this.group.visible=visible;
  for(const path of this.paths){path.group.visible=path.kind===this.selected;if(visible)for(const material of path.materials)material.uniforms.phase.value=this.phase*2/Math.max(1,path.length);}
  const readout=document.getElementById('drivetrain-readout');if(readout){const d=drivetrain(v.type,v.rpm),text=assembled?`${Math.round(v.rpm).toLocaleString('it-IT')} rpm motore ÷ ${d.ratio} = ${Math.round(d.wheelRpm).toLocaleString('it-IT')} rpm ruote`:'Collegamento interrotto · ruote ferme';if(readout.textContent!==text)readout.textContent=text;}
  const status=document.getElementById('flow-status');if(status){
   const text=v.insideId?'Flussi sospesi durante l’ispezione del componente.':!this.enabled?'Flussi nascosti.':!assembled||v.isolated?'Trasmissione sospesa: ricomponi e mostra il sistema completo.':`${v.playing?'In marcia':'In pausa'} · riproduzione ${v.playbackRate}×, rallentata ${slowMotion}:1 · rapporto totale ${ratios[v.type]}:1 illustrativo, fisso. Valori rpm riferiti al modello in marcia. Scie schematiche: non indicano la velocità reale di gas o corrente.`;
   if(status.textContent!==text)status.textContent=text;
   status.dataset.phase=this.phase.toFixed(3);status.dataset.wheelAngle=v.wheelAngle.toFixed(3);status.dataset.active=String(visible);
  }
  document.getElementById('flow-legend')?.classList.toggle('flows-disabled',!this.enabled);
 }
}
