import * as THREE from 'three';
import {ratios} from './motion.js';

const colors={air:'#62baff',exhaust:'#ff7967',electric:'#67e5d2',torque:'#efbc67'};
const captions={air:'Aria aspirata',exhaust:'Gas di scarico',electric:'Energia elettrica',torque:'Coppia meccanica'};
export class FlowAnimation{
 constructor(viewer){this.v=viewer;this.enabled=true;this.phase=0;this.paths=[];this.group=new THREE.Group();this.group.name='Percorsi didattici luminosi';viewer.scene.add(this.group);this.up=new THREE.Vector3(0,1,0);}
 clear(){this.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.group.clear();this.paths=[];}
 path(kind,points){
  const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
  const color=colors[kind];
  const track=new THREE.Mesh(new THREE.TubeGeometry(curve,48,.012,5,false),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.24,depthWrite:false,depthTest:false,toneMapped:false}));track.renderOrder=5;this.group.add(track);
  const arrows=[];
  for(let i=0;i<3;i++){
   const pulse=new THREE.Group();
   const core=new THREE.Mesh(new THREE.ConeGeometry(.065,.21,8),new THREE.MeshBasicMaterial({color,toneMapped:false,depthTest:false,depthWrite:false}));core.renderOrder=7;pulse.add(core);
   const halo=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.14,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,toneMapped:false}));halo.renderOrder=6;pulse.add(halo);this.group.add(pulse);arrows.push(pulse);
  }
  this.paths.push({curve,arrows,length:curve.getLength()});
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
   const driven=wheels.sort((a,b)=>v.type==='ev'?a.z-b.z:b.z-a.z).slice(0,2);
   const axle=driven[0].clone().lerp(driven[1],.5);link('torque',output,axle,.2);
   for(const wheel of driven)link('torque',axle,wheel,.12);
  }else link('torque',output,local(v.type==='ev'?3.6:4.4,.65,.4),.15);
  this.renderLegend();
 }
 renderLegend(){
  const v=this.v,legend=document.getElementById('flow-legend');if(!legend)return;
  const kinds=v.type==='ice'?['air','exhaust','torque']:v.type==='ev'?['electric','torque']:['air','exhaust','electric','torque'];
  legend.innerHTML=`<div class="flow-key">${kinds.map(k=>`<span><i style="--flow-color:${colors[k]}"></i>${captions[k]}</span>`).join('')}</div><p>${v.type==='ev'?'Batteria → inverter → motore → riduttore → ruote.':v.type==='hybrid'?'Termico e motore elettrico contribuiscono alla trasmissione.':'L’aria entra nei cilindri, i gas escono; il motore trasmette coppia alle ruote.'} <button data-action="energy-flow">Come funziona</button></p><small id="flow-status"></small>`;
 }
 update(step,assembled){
  const v=this.v;if(assembled&&!this.wasAssembled)this.rebuild();this.wasAssembled=assembled;this.phase+=step;const visible=this.enabled&&assembled&&!v.isolated&&!v.xrSession;
  this.group.visible=visible;
  if(visible)for(const {curve,arrows,length}of this.paths)arrows.forEach((pulse,i)=>{const t=(this.phase*1.3/Math.max(1,length)+i/3)%1;pulse.position.copy(curve.getPointAt(t));pulse.quaternion.setFromUnitVectors(this.up,curve.getTangentAt(t).normalize());});
  const status=document.getElementById('flow-status');if(status){
   const text=!this.enabled?'Flussi nascosti.':!assembled||v.isolated?'Flussi sospesi: ricomponi e mostra il sistema completo.':`${v.playing?'Trasmissione in marcia':'Animazione in pausa'} · velocità rallentata · rapporto motore/ruote illustrativo ${ratios[v.type]}:1. Percorsi schematici, non tubazioni o cablaggi reali.`;
   if(status.textContent!==text)status.textContent=text;
   status.dataset.phase=this.phase.toFixed(3);status.dataset.wheelAngle=v.wheelAngle.toFixed(3);status.dataset.active=String(visible);
  }
  document.getElementById('flow-legend')?.classList.toggle('flows-disabled',!this.enabled);
 }
}
