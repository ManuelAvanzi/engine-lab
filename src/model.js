import {castRim,pistonShell,addFinishDetails} from './geometry-detail.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { components } from './data.js';
import { createStudio, addMachining } from './studio.js';

import {Presentation} from './presentation.js';
import {FlowAnimation} from './flows.js';
import {addInsideDetails,applyInside} from './inside.js';
import {motionStep} from './motion.js';
import {loadVehicle, vehicleInfo} from './vehicles.js';

const metal = (color, roughness=.58, metalness=.4) => new THREE.MeshStandardMaterial({color, roughness, metalness});
export class PowertrainViewer {
 constructor(host, onSelect) {
  this.host=host; this.onSelect=onSelect; this.parts={}; this.meshes=[]; this.pistons=[]; this.rods=[]; this.rotating=[];
  this.playing=!matchMedia('(prefers-reduced-motion: reduce)').matches; this.playbackRate=3;this.insideId=null;this.hoverId=null;this.insideOpacity=.16;this.rpm=2800;this.wheelAngle=0;this.angle=0; this.explosion=0; this.targetExplosion=0; this.section=true; this.risk=false; this.isolated=false;this.carMode=true;this.dragMode=false;this.valves=[];this.chambers=[];
  this.scene=new THREE.Scene();
  this.camera=new THREE.PerspectiveCamera(36,1,.05,100); this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,2)); this.renderer.shadowMap.enabled=true; this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.04;
  this.renderer.xr.enabled=true; host.append(this.renderer.domElement);
  const pmrem=new THREE.PMREMGenerator(this.renderer); const room=new RoomEnvironment(); this.environment=pmrem.fromScene(room,.04); this.scene.environment=this.environment.texture; room.dispose(); pmrem.dispose();
  this.scene.environmentIntensity=.16;const studio=createStudio(this.scene);this.stage=studio.stage;this.lights=studio.lights;
  this.car=new THREE.Group();this.car.userData.wheels=[];this.scene.add(this.car);
  this.root=new THREE.Group();this.scene.add(this.root);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.065;this.controls.minDistance=3;this.controls.maxDistance=48;this.controls.maxPolarAngle=Math.PI*.72;
  this.controls.target.set(0,1.35,0);this.resetCamera();
  this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.installInteraction();
  this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.bloom=new UnrealBloomPass(new THREE.Vector2(512,512),.035,.25,2.5);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
  this.presentation=new Presentation(this);this.flows=new FlowAnimation(this);this.clock=new THREE.Clock();this.renderer.setAnimationLoop((time,frame)=>this.animate(frame));
 }
 resize(){const {width,height}=this.host.getBoundingClientRect();if(!width||!height)return;this.camera.aspect=width/height;const fit=Math.max(1,1.15/this.camera.aspect);if(this.controls&&!this.xrSession){const delta=this.camera.position.clone().sub(this.controls.target);this.camera.position.copy(this.controls.target).add(delta.multiplyScalar(fit/(this.aspectFit||1)));}this.aspectFit=fit;this.camera.updateProjectionMatrix();this.renderer.setSize(width,height);this.composer?.setSize(width,height);}
 resetCamera(){const fit=Math.max(1,1.15/this.camera.aspect),spread=Object.values(this.parts).some(p=>p.userData.detached);const target=new THREE.Vector3(0,this.carMode?1.15:1.38+1.1*(this.targetExplosion||0)+(spread?.55:0),this.carMode?1:0);const position=new THREE.Vector3(...(this.carMode?(this.type==='ev'?[11,7.3,-14]:[11,7.3,14]):[5.7,3.1,7.4])).multiplyScalar(fit*(1+.4*(this.targetExplosion||0))*(spread?1.22:1)).add(target);this.aspectFit=fit;if(this.presentation){this.presentation.setFocused(false);this.presentation.move(position,target);}else{this.controls.target.copy(target);this.camera.position.copy(position);this.controls.update();}}
 part(id,offset=[0,0,0]){const g=new THREE.Group();g.name=components[id].name;g.userData={part:id,offset:new THREE.Vector3(...offset),manualOffset:new THREE.Vector3(),detached:false,hidden:false};this.parts[id]=g;this.root.add(g);return g;}
 mesh(g,geo,color,pos=[0,0,0],rot=[0,0,0],rough=.58){const m=new THREE.Mesh(geo,metal(color,rough));m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;m.userData.part=g.userData.part;m.userData.baseColor=new THREE.Color(color);g.add(m);this.meshes.push(m);return m;}
 box(g,dim,pos,color,rough=.58){const radius=Math.min(...dim)*.15;return this.mesh(g,new RoundedBoxGeometry(...dim,2,Math.min(radius,.07)),color,pos,[0,0,0],rough);}
 cylinder(g,r,length,pos,color,axis='y'){const rot=axis==='x'?[0,0,Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:[0,0,0];return this.mesh(g,new THREE.CylinderGeometry(r,r,length,40),color,pos,rot);}
 ring(g,r,t,pos,color,axis='y'){const rot=axis==='y'?[Math.PI/2,0,0]:axis==='x'?[0,Math.PI/2,0]:[0,0,0];return this.mesh(g,new THREE.TorusGeometry(r,t,10,48),color,pos,rot);}
 tube(g,points,r,color){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return this.mesh(g,new THREE.TubeGeometry(curve,24,r,12,false),color);}
 bolts(g,positions){positions.forEach(p=>this.cylinder(g,.06,.055,p,'#71818a'));}
 clear(){this.root.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});this.root.clear();this.parts={};this.meshes=[];this.pistons=[];this.rods=[];this.rotating=[];this.valves=[];this.chambers=[];this.crankRotor=null;this.rotorGroup=null;}
 build(type){this.setHover(null);this.clear();this.type=type;this.root.position.set(0,0,0);this.root.scale.setScalar(1);this.explosion=this.targetExplosion=0;this.isolated=false;
  if(type==='ev')this.electric();else{this.engine(type==='hybrid');if(type==='hybrid')this.hybrid();}
  this.insideId=null;addInsideDetails(this);this.updateVehicle(type);addMachining(this);addFinishDetails(this);this.selected=type==='ev'?'rotor':'pistons';this.setCar(this.carMode);this.paint();this.presentation?.rebuild();this.resize();this.resetCamera();
 }
 engine(hybrid){
  const xs=[-1.38,-.46,.46,1.38];
  const block=this.part('block',[0,0,-1.1]);
  this.box(block,[4.05,1.26,.15],[0,1.19,-.52],'#98a7a9');this.box(block,[4.05,.12,1.22],[0,.58,0],'#879698');
  [-1.98,1.98].forEach(x=>this.box(block,[.13,1.26,1.16],[x,1.19,0],'#9ba9aa'));
  this.blockFront=this.box(block,[4.05,1.26,.12],[0,1.19,.56],'#97a7a7');this.blockFront.userData.shell=true;
  xs.forEach(x=>{this.ring(block,.365,.038,[x,1.82,0],'#889a9c');this.ring(block,.365,.034,[x,.61,0],'#7f9398');[-.47,.47].forEach(z=>this.cylinder(block,.07,1.3,[x+.39,1.23,z],'#a2b0af'));});
  for(let y=.75;y<1.7;y+=.17)this.box(block,[3.96,.03,.04],[0,y,-.61],'#809493');
  const pistons=this.part('pistons',[0,1.3,.25]);const rods=this.part('rods',[0,.3,.8]);const crank=this.part('crank',[0,-.28,1]);
  this.crankRotor=new THREE.Group();this.crankRotor.userData.part='crank';crank.add(this.crankRotor);
  this.cylinder(this.crankRotor,.13,4.5,[0,.43,0],'#7c8b95','x');
  xs.forEach((x,i)=>{
   const piston=new THREE.Group();piston.userData.part='pistons';pistons.add(piston);piston.position.x=x;
   this.mesh(piston,pistonShell(),'#c8d0d0');this.cylinder(piston,.32,.018,[0,.218,0],'#dbe0d8');
   [-.1,.03,.13].forEach(y=>this.ring(piston,.346,.013,[0,y,0],'#5f7078'));
   this.cylinder(piston,.09,.68,[0,-.08,0],'#8c999c','z');this.pistons.push({g:piston,index:i,x});
   const rod=new THREE.Group();rod.userData.part='rods';rods.add(rod);const shaft=this.box(rod,[.14,.92,.115],[0,0,0],'#acb5b7');this.box(rod,[.04,.85,.145],[0,0,0],'#829297');
   this.ring(rod,.105,.035,[0,.46,0],'#b6c1c2','z');this.ring(rod,.155,.065,[0,-.46,0],'#8c9a9e','z');this.rods.push({g:rod,index:i,x,shaft});
   const phase=i===0||i===3?0:Math.PI;const z=Math.sin(phase)*.3, y=.43+Math.cos(phase)*.3;
   this.cylinder(this.crankRotor,.14,.55,[x,y,z],'#bdc6c6','x');
   [-.32,.32].forEach(dx=>{this.cylinder(this.crankRotor,.3,.13,[x+dx,.43,0],'#778994','x');this.box(this.crankRotor,[.13,.36,.32],[x+dx,.43+.12*Math.cos(phase),0],'#81919a');});
  });
  this.cylinder(crank,.56,.15,[2.3,.43,0],'#6f8088','x');this.ring(crank,.51,.04,[2.4,.43,0],'#a5b4b5','x');
  const head=this.part('head',[0,1.9,0]);
  this.box(head,[4.12,.23,1.36],[0,2.08,0],'#b4c1bb').userData.shell=true;
  this.box(head,[4.06,.035,1.32],[0,1.946,0],'#596b64').userData.shell=true;
  [-.4,.4].forEach(z=>this.cylinder(head,.075,4.08,[0,2.55,z],'#71878a','x'));
  xs.forEach((x,index)=>{[-.32,.32].forEach((z,side)=>{const valve=new THREE.Group();valve.userData.part='head';head.add(valve);this.cylinder(valve,.045,.47,[x,2.28,z],'#8d9ea3');this.cylinder(valve,.15,.045,[x,2.02,z],'#9aa9a7');for(let h=2.27;h<2.51;h+=.035)this.ring(valve,.075,.012,[x,h,z],'#829492');this.cylinder(head,.14,.14,[x,2.55,z],'#b0bbb9','x');this.valves.push({g:valve,index,side});});
   this.cylinder(head,.075,.24,[x,2.32,0],'#dedbc9');this.cylinder(head,.052,.13,[x,2.5,0],'#c8b189');});
  xs.forEach((x,index)=>{const glow=new THREE.Mesh(new THREE.CylinderGeometry(.305,.29,.18,32),new THREE.MeshStandardMaterial({color:0xff8033,emissive:0xff8033,emissiveIntensity:2,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));glow.position.set(x,1.82,0);pistons.add(glow);this.chambers.push({g:glow,index});});
  this.bolts(head,xs.flatMap(x=>[[x+.3,2.215,.59],[x+.3,2.215,-.59]]));
  const sump=this.part('sump',[0,-.7,0]);this.mesh(sump,castRim(3.84,1.28,.32,.075),'#627c76',[0,-.07,0]);this.box(sump,[3.7,.06,1.14],[0,-.06,0],'#627c76');this.mesh(sump,castRim(4.13,1.48,.055,.17),'#97aaa2',[0,.28,0]);
  for(let x=-1.6;x<1.8;x+=.3)this.box(sump,[.045,.055,1.24],[x,-.095,0],'#82968b');
  if(!hybrid){
   const cover=this.part('cover',[0,2.7,0]);this.mesh(cover,castRim(4.02,1.42,.24,.085),'#536e64',[0,2.67,0]);this.box(cover,[3.98,.13,1.38],[0,2.94,0],'#71877a');
   for(let z=-.4;z<=.4;z+=.2)this.box(cover,[3.65,.045,.042],[0,3.04,z],'#8e9e8b');this.cylinder(cover,.17,.11,[-1.45,3.075,0],'#3f5449');
   this.bolts(cover,xs.flatMap(x=>[[x,2.93,.59],[x,2.93,-.59]]));
   const intake=this.part('intake',[0,.3,-1.4]);xs.forEach(x=>this.tube(intake,[[x,2.17,-.65],[x,2.23,-.95],[x,1.84,-1.19],[x,1.58,-1.18]],.15,'#526975'));
   this.cylinder(intake,.23,3.4,[0,1.57,-1.2],'#4a6369','x');this.cylinder(intake,.26,.27,[-1.94,1.57,-1.2],'#9bada7','x');
   const exhaust=this.part('exhaust',[0,.3,1.65]);xs.forEach(x=>this.tube(exhaust,[[x,2.02,.65],[x,1.91,.98],[x*.63,1.3,1.21],[x*.35,1.03,1.27]],.115,'#b39779'));this.cylinder(exhaust,.21,1.6,[0,.99,1.25],'#9e846c','x');
   const timing=this.part('timing',[-1.15,0,0]);[[2.53,.36],[.45,.30]].forEach(([y,r])=>{this.cylinder(timing,r,.13,[-2.17,y,0],'#7f9294','x');this.ring(timing,r-.06,.025,[-2.25,y,0],'#c0c8bb','x');});
   this.tube(timing,[[-2.19,.45,.31],[-2.19,2.53,.38],[-2.19,2.86,0],[-2.19,2.53,-.38],[-2.19,.45,-.31],[-2.19,.14,0],[-2.19,.45,.31]],.035,'#53645d');
  }
 }
 battery(g,pos,size=[2,.32,1.4]){this.box(g,size,pos,'#6c8574');this.box(g,[size[0]+.1,.045,size[2]+.1],[pos[0],pos[1]+size[1]/2,pos[2]],'#99ae8e');for(let x=-size[0]/2+.15;x<size[0]/2;x+=.25){this.box(g,[.13,.06,size[2]-.15],[pos[0]+x,pos[1]+size[1]/2+.025,pos[2]],'#adbd9d');}this.box(g,[.16,.08,.1],[pos[0]+size[0]/2,pos[1],pos[2]],'#ddab58');}
 hybrid(){
  const motor=this.part('motor',[1.3,.5,0]);this.cylinder(motor,.62,.7,[2.86,.85,0],'#93aaa4','x').userData.shell=true;for(let x=2.52;x<3.2;x+=.09)this.ring(motor,.61,.022,[x,.85,0],'#b0beb4','x');this.cylinder(motor,.43,.08,[3.27,.85,0],'#bd9262','x');this.cylinder(motor,.15,.3,[3.45,.85,0],'#b5c1be','x');
  const spin=new THREE.Group();spin.userData.part='motor';spin.position.set(2.87,.85,0);motor.add(spin);this.cylinder(spin,.42,.64,[0,0,0],'#b89770','x');for(let a=0;a<Math.PI*2;a+=Math.PI/3){const stripe=this.box(spin,[.65,.025,.06],[0,Math.sin(a)*.43,Math.cos(a)*.43],'#60d7dc');stripe.rotation.x=-a;stripe.userData.led=true;}this.rotating.push(spin);
  const trans=this.part('transmission',[1.9,0,.7]);this.box(trans,[.57,.9,.94],[3.73,.85,0],'#8d9fa1');this.cylinder(trans,.16,.7,[4.1,.85,0],'#b6c4c0','x');
  const inverter=this.part('inverter',[1.2,1.3,0]);this.box(inverter,[1.15,.35,1.12],[2.7,1.95,0],'#a8bca4');for(let x=2.22;x<3.2;x+=.1)this.box(inverter,[.04,.1,1],[x,2.17,0],'#d0d8c5');
  const battery=this.part('battery',[-.4,0,-1.8]);this.battery(battery,[.1,.35,-2.4],[3,.42,1.1]);this.tube(battery,[[1.55,.35,-2.4],[2.8,.45,-1.8],[2.9,1.78,-.4]],.045,'#dc9c48');
  this.root.children.forEach(g=>g.position.x=-.9);this.root.children.forEach(g=>g.userData.origin=g.position.clone());
 }
 electric(){
  const housing=this.part('housing',[0,0,-1.4]);
  const shell=this.mesh(housing,new THREE.CylinderGeometry(1.01,1.01,2.4,48,1,true),'#9aaca8',[0,1.17,0],[0,0,Math.PI/2]);shell.userData.shell=true;
  [-1.25,1.25].forEach(x=>{this.ring(housing,.99,.08,[x,1.17,0],'#8ca39d','x');for(let a=0;a<Math.PI*2;a+=Math.PI/4)this.cylinder(housing,.065,.12,[x,1.17+Math.sin(a)*1.05,Math.cos(a)*1.05],'#9caeaa','x');});
  const stator=this.part('stator',[0,0,1.8]);
  for(let a=0;a<Math.PI*2;a+=Math.PI/12){const y=1.17+Math.sin(a)*.81,z=Math.cos(a)*.81;const coil=this.box(stator,[2.15,.17,.23],[0,y,z],'#bd895a');coil.rotation.x=-a;for(let x=-.97;x<1;x+=.115){const strip=this.box(stator,[.027,.19,.245],[x,y,z],'#d9a370');strip.rotation.x=-a;}}
  [-1.05,1.05].forEach(x=>this.ring(stator,.81,.125,[x,1.17,0],'#b47f51','x'));
  const rotor=this.part('rotor',[0,.5,0]);this.rotorGroup=new THREE.Group();this.rotorGroup.position.y=1.17;this.rotorGroup.userData.part='rotor';rotor.add(this.rotorGroup);
  this.cylinder(this.rotorGroup,.59,1.95,[0,0,0],'#95a7ad','x');for(let a=0;a<Math.PI*2;a+=Math.PI/4){const m=this.box(this.rotorGroup,[1.83,.12,.24],[0,Math.sin(a)*.56,Math.cos(a)*.56],Math.round(a/(Math.PI/4))%2?'#8cabb0':'#bd9185');m.rotation.x=-a;}
  this.rotating.push(this.rotorGroup);
  for(let a=0;a<Math.PI*2;a+=Math.PI/4){const mark=this.box(this.rotorGroup,[1.75,.025,.055],[0,Math.sin(a)*.62,Math.cos(a)*.62],'#61dce8');mark.rotation.x=-a;mark.userData.led=true;}
  const shaft=this.part('shaft',[.9,0,0]);this.cylinder(shaft,.135,3.7,[0,1.17,0],'#bdc9c7','x');
  const bearings=this.part('bearings',[-1.1,0,0]);[-1.3,1.3].forEach(x=>{this.ring(bearings,.26,.09,[x,1.17,0],'#9eafae','x');for(let a=0;a<Math.PI*2;a+=Math.PI/5)this.mesh(bearings,new THREE.SphereGeometry(.052,12,12),'#d8ded6',[x,1.17+Math.sin(a)*.25,Math.cos(a)*.25]);});
  const inverter=this.part('inverter',[0,1.5,0]);this.box(inverter,[2.25,.3,1.15],[0,2.55,0],'#afc0ab');this.box(inverter,[2.32,.06,1.21],[0,2.74,0],'#c1cfb6');for(let x=-1;x<1.1;x+=.12)this.box(inverter,[.035,.11,1.02],[x,2.81,0],'#9cab96');
  const battery=this.part('battery',[0,-.5,-1]);this.battery(battery,[0,.01,-1.95],[3.8,.4,1.3]);this.tube(battery,[[1.94,0,-1.95],[2.5,.4,-1.5],[1.1,2.55,-.45]],.044,'#df9f53');
  const reducer=this.part('reducer',[1.8,0,0]);this.cylinder(reducer,.7,.52,[2.17,1.04,0],'#95a7a6','x');this.cylinder(reducer,.38,.55,[2.17,.67,.67],'#a7b6af','x');this.cylinder(reducer,.12,.75,[2.65,.67,.67],'#bcc9bf','x');for(let a=0;a<Math.PI*2;a+=Math.PI/12)this.cylinder(reducer,.035,.58,[2.17,1.04+Math.sin(a)*.62,Math.cos(a)*.62],'#687f7f','x');
 }
 async updateVehicle(type){
  const ticket=this.vehicleTicket=(this.vehicleTicket||0)+1;const info=vehicleInfo[type];
  this.host.dataset.vehicleStatus='loading';this.host.dataset.vehicle=info.name;
  this.car.visible=false;this.updateVehicleLabel('Caricamento carrozzeria…');
  try{const car=await loadVehicle(type);if(ticket!==this.vehicleTicket)return;this.scene.remove(this.car);this.car=car;this.scene.add(car);this.host.dataset.vehicleStatus='ready';const focused=this.presentation?.focused;this.setCar(this.carMode);if(focused)this.presentation.focus();this.updateVehicleLabel(info.name);}
  catch(error){if(ticket!==this.vehicleTicket)return;this.host.dataset.vehicleStatus='error';this.updateVehicleLabel('Carrozzeria non caricata · cambia sistema per riprovare');console.error(error);}
 }
 updateVehicleLabel(text){const label=document.getElementById('vehicle-name');if(label)label.textContent=text;const note=document.getElementById('vehicle-note');if(note)note.textContent=vehicleInfo[this.type]?.note||'';}
 select(id,focus=false){this.setHover(null);if(this.selected!==id)this.insideId=null;this.selected=id;this.paint();if(focus&&!this.dragMode)this.presentation?.focus();}
 setCar(value){this.carMode=value;this.car.visible=value&&!this.isolated&&!this.xrSession&&this.host.dataset.vehicleStatus==='ready';this.root.scale.setScalar(value?(this.type==='ev'?.6:this.type==='ice'?.62:.72):1);this.root.position.set(0,value?(this.type==='ev'?.08:this.type==='ice'?.22:.38):0,value?(this.type==='ev'?-3.45:this.type==='ice'?-2.5:3.3):0);document.querySelector('.vehicle-card')?.classList.toggle('hidden',!value);this.layoutBattery(value);this.paint();this.flows?.rebuild();this.resetCamera();}
 layoutBattery(inCar){if(this.type!=='ev'||!this.parts.battery)return;for(const mesh of this.parts.battery.getObjectsByProperty('isMesh',true)){if(!mesh.isMesh)continue;mesh.userData.restPosition??=mesh.position.clone();mesh.userData.restScale??=mesh.scale.clone();if(mesh.geometry.type==='TubeGeometry'){mesh.userData.hideInCar=true;mesh.visible=!inCar;continue;}mesh.position.copy(mesh.userData.restPosition);mesh.scale.copy(mesh.userData.restScale);if(inCar){mesh.position.set(mesh.position.x*1.5,mesh.position.y+.3,(mesh.position.z+1.95)*6.4+5.4);mesh.scale.multiply(new THREE.Vector3(1.5,1,6.4));}}}
 setDragMode(value){this.dragMode=value;this.host.style.cursor=value?'grab':'';}
 detachSelected(){const p=this.parts[this.selected];if(!p)return;p.userData.detached=!p.userData.detached;if(!p.userData.detached)p.userData.manualOffset.set(0,0,0);this.presentation?.focus();return p.userData.detached;}
 resetParts(){this.setHover(null);this.insideId=null;Object.values(this.parts).forEach(p=>{p.userData.detached=false;p.userData.manualOffset.set(0,0,0);p.userData.hidden=false;});this.resetCamera();this.paint();}
 setPartOffset(axis,value){const p=this.parts[this.selected];if(p&&['x','y','z'].includes(axis)&&Number.isFinite(value))p.userData.manualOffset[axis]=THREE.MathUtils.clamp(value,-5,5);}
 installInteraction(){let down=null,drag=null;const plane=new THREE.Plane(),point=new THREE.Vector3();
  const ray=e=>{const r=this.host.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);};
  this.host.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];this.setHover(null);if(!this.dragMode||e.button!==0)return;ray(e);const hit=this.getHits()[0];if(!hit)return;const id=hit.object.userData.part;this.onSelect(id);const group=this.parts[id];plane.setFromNormalAndCoplanarPoint(this.camera.getWorldDirection(new THREE.Vector3()),hit.point);drag={id,start:this.root.worldToLocal(hit.point.clone()),offset:group.userData.manualOffset.clone()};this.controls.enabled=false;this.host.setPointerCapture(e.pointerId);this.host.style.cursor='grabbing';e.stopPropagation();},true);
  this.host.addEventListener('pointerleave',()=>this.setHover(null));
  this.host.addEventListener('pointermove',e=>{if(!drag){if(e.pointerType==='mouse'&&!e.buttons&&!down&&!this.dragMode&&!this.xrSession&&!this.insideId){ray(e);const hit=this.raycaster.intersectObjects(this.meshes).find(h=>h.object.visible&&this.parts[h.object.userData.part]?.visible);this.setHover(hit?.object.userData.part||null);}return;}ray(e);if(this.raycaster.ray.intersectPlane(plane,point)){const offset=this.root.worldToLocal(point.clone()).sub(drag.start).add(drag.offset);offset.clampScalar(-5,5);this.parts[drag.id].userData.manualOffset.copy(offset);}e.stopPropagation();},true);
  const end=e=>{if(drag){const id=drag.id;drag=null;this.controls.enabled=true;if(this.host.hasPointerCapture(e.pointerId))this.host.releasePointerCapture(e.pointerId);this.host.style.cursor=this.dragMode?'grab':'';this.onSelect(id);e.stopPropagation();return;}if(e.type==='pointerup'&&down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){ray(e);this.pick();}down=null;};
  this.host.addEventListener('pointerup',end,true);this.host.addEventListener('pointercancel',end,true);
 }
 setExplosion(value){this.targetExplosion=value/100;if(!this.xrSession){if(value>0)this.presentation?.frameExplosion();else this.resetCamera();}}
 setSection(value){this.section=value;this.paint();}
 setRisk(value,warning=false){this.risk=value;this.warning=warning;this.paint();}
 isolate(value){this.isolated=value;this.car.visible=this.carMode&&!value&&!this.xrSession&&this.host.dataset.vehicleStatus==='ready';this.paint();if(value)this.presentation?.focus();else this.resetCamera();}
 paint(){
  Object.entries(this.parts).forEach(([id,g])=>g.visible=(!this.isolated||id===this.selected)&&!g.userData.hidden);
  const critical=this.type==='ev'?['stator','inverter','battery','bearings']:['pistons','head','rods','exhaust','motor','inverter','battery'];
  this.meshes.forEach(m=>{const id=m.userData.part;const selected=id===this.selected;const hot=this.risk&&critical.includes(id);m.material.color.copy(m.userData.baseColor);m.material.emissive.set(m.userData.led?'#365a62':hot?(this.warning?'#f34c28':'#de8b39'):selected?'#235361':'#000000');m.material.emissiveIntensity=m.userData.led?.08:hot?.65:selected?.12:0;
   const detached=this.parts[id]?.userData.detached;const ghost=this.section&&!this.isolated&&!detached;
   const transparent=ghost&&(m.userData.shell||['cover','exhaust'].includes(id));if(m.material.transparent!==transparent)m.material.needsUpdate=true;m.material.transparent=transparent;m.material.opacity=transparent?(id==='exhaust'?.16:.075):1;m.material.depthWrite=!transparent;
   m.visible=!(ghost&&id==='stator'&&m.position.z>.15)&&!(m.userData.hideInCar&&this.carMode&&!this.xrSession);
  });
  applyInside(this);
 }
 setHover(id){if(this.hoverId===id)return;this.hoverId=id;this.paint();this.host?.dispatchEvent(new CustomEvent('part-hover',{detail:id}));}
 setInside(value){this.setHover(null);this.insideId=value?this.selected:null;this.paint();if(value)this.presentation?.focus();}
 getHits(){return this.raycaster.intersectObjects(this.meshes).filter(h=>h.object.parent.visible&&h.object.visible&&this.parts[h.object.userData.part]?.visible&&h.object.material.opacity>.2);}
 pick(){const hits=this.getHits();if(hits[0])this.onSelect(hits[0].object.userData.part);}
 animate(frame){const dt=Math.min(this.clock.getDelta(),.05);
  const assembled=this.explosion<.02&&this.targetExplosion===0&&Object.values(this.parts).every(p=>!p.userData.detached&&p.userData.manualOffset.lengthSq()<.0001&&p.position.distanceToSquared(p.userData.origin||new THREE.Vector3())<.0025);
  const step=motionStep(this.type||'ice',{playing:this.playing,assembled,rpm:this.rpm,rate:this.playbackRate},dt);this.angle+=step.engine;this.wheelAngle+=step.wheels;
  for(const wheel of this.car.userData.wheels||[])wheel.rotation.x=this.wheelAngle;
  this.explosion=this.presentation?.reduced?this.targetExplosion:this.explosion+(this.targetExplosion-this.explosion)*.08;
  Object.values(this.parts).forEach(g=>{const target=(g.userData.origin||new THREE.Vector3()).clone().addScaledVector(g.userData.offset,this.explosion);if(g.userData.detached)target.addScaledVector(g.userData.offset.clone().normalize(),2.7);target.add(g.userData.manualOffset);g.position.lerp(target,this.presentation?.reduced?1:1-Math.exp(-dt*12));});
  this.pistons.forEach(({g,index})=>{const a=this.angle+(index===0||index===3?0:Math.PI),r=.30,l=.92;g.position.y=.43+r*Math.cos(a)+Math.sqrt(l*l-(r*Math.sin(a))**2)+.08;});
  this.rods.forEach(({g,index,x})=>{const a=this.angle+(index===0||index===3?0:Math.PI);const lower=new THREE.Vector3(x,.43+.3*Math.cos(a),.3*Math.sin(a));const upper=new THREE.Vector3(x,this.pistons[index].g.position.y-.08,0);g.position.copy(lower).add(upper).multiplyScalar(.5);g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),upper.clone().sub(lower).normalize());});
  // Rotate crank geometry around its own shaft centre.
  if(this.crankRotor){this.crankRotor.rotation.x=this.angle;this.crankRotor.position.set(0,.43*(1-Math.cos(this.angle)),-.43*Math.sin(this.angle));}
  this.rotating.forEach(g=>g.rotation.x=this.angle);
  const phases=[0,Math.PI*3,Math.PI,Math.PI*2];
  this.valves.forEach(({g,index,side})=>{const phase=(this.angle+phases[index])%(Math.PI*4);const centre=side===0?Math.PI*2.5:Math.PI*1.5;g.position.y=-.15*Math.max(0,1-Math.abs(phase-centre)/(Math.PI*.48));});
  this.chambers.forEach(({g,index})=>{const phase=(this.angle+phases[index])%(Math.PI*4);const expansion=phase<Math.PI;g.material.color.set(expansion?'#ff7b26':phase>Math.PI*2&&phase<Math.PI*3?'#36bdf1':'#d94237');g.material.emissive.copy(g.material.color);g.material.opacity=this.section&&!this.isolated&&!this.parts.pistons.userData.detached&&this.explosion<.1?(expansion?.55*Math.exp(-phase*.7):.09):0;g.scale.y=1+Math.max(0,Math.sin(phase))*.9;});

  const phaseLabel=document.getElementById('cycle-phase');if(phaseLabel){const phase=(this.angle%(Math.PI*4))/(Math.PI);const names=['Espansione','Scarico','Aspirazione','Compressione'];const text=this.type==='ev'?'Campo rotante · rotore in movimento':`${names[Math.floor(phase)]} · cilindro 1`;if(phaseLabel.textContent!==text)phaseLabel.textContent=text;phaseLabel.dataset.phase=this.angle.toFixed(2);}
  if(this.xrSession&&frame&&this.hitSource){const hits=frame.getHitTestResults(this.hitSource);this.reticle.visible=hits.length>0;if(hits.length){const pose=hits[0].getPose(this.renderer.xr.getReferenceSpace());this.reticle.matrix.fromArray(pose.transform.matrix);}}
  this.flows?.update(step.flow,assembled);
  if(!this.xrSession){this.presentation?.update(dt);this.composer.render();}else this.renderer.render(this.scene,this.camera);
 }
 exportModel(){const clone=this.root.clone(true);clone.traverse(o=>{if(o.userData.restPosition)o.position.copy(o.userData.restPosition);if(o.userData.restScale)o.scale.copy(o.userData.restScale);if(o.userData.hideInCar)o.visible=true;});return clone;}
 async exportGLB(){const clone=this.exportModel();clone.position.set(0,0,0);clone.scale.setScalar(1);clone.updateMatrixWorld(true);return new GLTFExporter().parseAsync(clone,{binary:true,onlyVisible:true});}
 async exportUSDZ(){const clone=this.exportModel();clone.position.set(0,0,0);clone.scale.setScalar(.17);clone.updateMatrixWorld(true);return new USDZExporter().parseAsync(clone);}
 async startAR(){
  if(!navigator.xr)throw new Error('WebXR non è disponibile in questo browser.');
  const session=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test'],optionalFeatures:['local-floor','dom-overlay'],domOverlay:{root:document.body}});
  this.xrSession=session;this.presentation?.cancel();this.presentation.overlay.hidden=true;this.presentation.items.forEach(i=>i.line.visible=false);this.layoutBattery(false);document.body.classList.add('xr-active');this.savedBackground=this.scene.background;this.savedFog=this.scene.fog;this.scene.fog=null;this.scene.background=null;this.stage.visible=false;this.car.visible=false;this.root.visible=false;this.root.scale.setScalar(.17);
  this.reticle=new THREE.Mesh(new THREE.RingGeometry(.12,.15,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#b1d781'}));this.reticle.matrixAutoUpdate=false;this.reticle.visible=false;this.scene.add(this.reticle);
  session.addEventListener('end',()=>{this.hitSource?.cancel();this.hitSource=null;this.xrSession=null;this.presentation.overlay.hidden=false;document.body.classList.remove('xr-active');this.scene.background=this.savedBackground;this.scene.fog=this.savedFog;this.stage.visible=true;this.root.visible=true;this.setCar(this.carMode);this.scene.remove(this.reticle);this.reticle.geometry.dispose();this.reticle.material.dispose();this.resetCamera();document.getElementById('xr-exit')?.remove();},{once:true});
  try{await this.renderer.xr.setSession(session);const ref=await session.requestReferenceSpace('viewer');this.hitSource=await session.requestHitTestSource({space:ref});}catch(error){await session.end();throw error;}
  session.addEventListener('select',()=>{if(this.reticle.visible){this.root.position.setFromMatrixPosition(this.reticle.matrix);this.root.visible=true;}});
  const exit=document.createElement('button');exit.id='xr-exit';exit.className='primary-button';exit.style.cssText='position:fixed;bottom:80px;left:20px;z-index:100';exit.textContent='Esci dalla realtà aumentata';exit.onclick=()=>session.end();document.body.append(exit);
 }
}
