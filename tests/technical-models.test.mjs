import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {PowertrainViewer} from '../src/model.js';
import {refineTechnicalEngine} from '../src/technical-engine.js';
import {refineElectricSystems} from '../src/electric-detail.js';
import {bakeGeometry,wheelPose} from '../src/vehicle-geometry.js';
import {prepareTesla,prepareFerrari,prepareConcept} from '../src/vehicles.js';
import {sheetIds,technicalSvg} from '../src/technical-sheets.js';
import {systems} from '../src/data.js';
import {ratios,motionStep,roadMotion,valveOpening} from '../src/motion.js';
import {FlowAnimation} from '../src/flows.js';
import {createAnnotationAnchor} from '../src/presentation.js';

test('Flussi spenti all’avvio, percorsi ancorati ai componenti e rami dei gas sincronizzati alle valvole',()=>{
 const original=globalThis.document;globalThis.document={addEventListener(){},getElementById(){return null;}};
 try{for(const type of Object.keys(systems)){
  const v=Object.create(PowertrainViewer.prototype);
  Object.assign(v,{type,root:new THREE.Group(),scene:new THREE.Scene(),car:new THREE.Group(),parts:{},meshes:[],pistons:[],rods:[],rotating:[],valves:[],chambers:[],rpm:2800,angle:0,wheelAngle:0});
  if(type==='ev')v.electric();else{v.engine(false);if(type==='hybrid')v.hybrid();}
  refineTechnicalEngine(v);refineElectricSystems(v);v.root.position.set(2,.3,-1);v.root.scale.setScalar(.7);
  const flow=new FlowAnimation(v);flow.rebuild();assert.equal(flow.enabled,false);assert.equal(flow.group.visible,false);
  const gas=flow.paths.filter(p=>p.gate);assert.equal(gas.length,type==='ev'?0:8);
  for(const p of gas){
   const cylinder=v.parts.head.worldToLocal((p.kind==='air'?p.points.at(-1):p.points[0]).clone());
   assert.ok(Math.abs(cylinder.y-1.8)<1e-10);assert.ok(Math.abs(cylinder.z)<1e-10);
  }
  const electric=flow.paths.filter(p=>p.kind==='electric');assert.equal(electric.length,type==='ice'?0:2);
  if(electric.length){
   assert.ok(electric[0].points.at(-1).distanceTo(electric[1].points[0])<1e-10);
   const motorBox=new THREE.Box3().setFromObject(v.parts[type==='ev'?'stator':'motor']);assert.ok(motorBox.containsPoint(electric[1].points.at(-1)),type);
  }
  if(type==='hybrid'){
   const torque=flow.paths.filter(p=>p.kind==='torque');assert.ok(torque[0].points.at(-1).equals(torque[1].points.at(-1)));
   assert.ok(torque[0].points[0].distanceTo(v.parts.crank.localToWorld(new THREE.Vector3(2,.43,0)))<1e-10);
   assert.ok(torque[1].points[0].distanceTo(v.parts.motor.localToWorld(new THREE.Vector3(3.425,.43,0)))<1e-10);
  }
  flow.setEnabled(true);flow.wasAssembled=true;
  for(let angle=0;angle<Math.PI*4;angle+=.17){v.angle=angle;flow.update(.02,true);for(const p of gas)assert.equal(p.group.visible,p.kind===flow.selected&&valveOpening(angle,p.gate.index,p.gate.side)>0);}
  flow.setEnabled(false);flow.update(.02,true);assert.equal(flow.group.visible,false);
  flow.setEnabled(true);v.rpm=0;flow.update(0,true);assert.equal(flow.group.visible,false);
  v.rpm=2800;flow.update(.02,false);assert.equal(flow.group.visible,false);
  if(type!=='ev'){
   Object.assign(v,{flows:flow,clock:{getDelta:()=>.016},composer:{render(){}},explosion:0,targetExplosion:0,section:true,playing:true,playbackRate:3});
   flow.setEnabled(false);v.animate();assert.ok(v.chambers.every(({g})=>g.material.opacity===0));
   flow.setEnabled(true);v.animate();assert.ok(v.chambers.some(({g})=>g.material.opacity>0));
   v.rpm=0;v.animate();assert.ok(v.chambers.every(({g})=>g.material.opacity===0));
  }
  flow.clear();v.root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 }}finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});

test('Le etichette ignorano il ciclo dei pezzi mobili e seguono esplosione e trasformazioni del modello',()=>{
 const root=new THREE.Group(),part=new THREE.Group(),piston=new THREE.Mesh(new THREE.BoxGeometry(.6,.4,.6));
 root.add(part);part.add(piston);piston.position.set(0,1.4,0);
 const anchor=createAnnotationAnchor(part),rest=part.localToWorld(anchor.clone());
 for(let i=0;i<120;i++){
  piston.position.y=1.4+.3*Math.cos(i);piston.rotation.x=i;
  assert.ok(part.localToWorld(anchor.clone()).distanceTo(rest)<1e-12);
 }
 part.position.set(0,2,1);root.scale.setScalar(.7);root.rotation.y=.8;root.position.x=3;root.updateMatrixWorld(true);
 const expected=new THREE.Vector3(0,3.4,1).applyMatrix4(root.matrixWorld);
 assert.ok(part.localToWorld(anchor.clone()).distanceTo(expected)<1e-12);
 assert.ok(expected.distanceTo(rest)>1);
});

test('Ogni componente dei tre propulsori ha geometria selezionabile e tavola dedicata',()=>{
 for(const type of Object.keys(systems)){
  const v=Object.create(PowertrainViewer.prototype);
  Object.assign(v,{type,root:new THREE.Group(),parts:{},meshes:[],pistons:[],rods:[],rotating:[],valves:[],chambers:[]});
  if(type==='ev')v.electric();else{v.engine(false);if(type==='hybrid')v.hybrid();}
  refineTechnicalEngine(v);refineElectricSystems(v);
  assert.deepEqual(Object.keys(v.parts).sort(),[...systems[type].components].sort());
  for(const id of systems[type].components){
   assert.ok(sheetIds.includes(id));assert.match(technicalSvg(id),/<title>.+<\/title>/);
   const box=new THREE.Box3().setFromObject(v.parts[id]);assert.ok(!box.isEmpty()&&Number.isFinite(box.min.x),`${type}/${id}`);
   assert.ok(v.meshes.some(m=>m.userData.part===id));
  }
  if(type!=='ice'){
   assert.ok(v.gearRotors.some(({ratio})=>Math.abs(ratio-1/ratios[type])<1e-12));
   for(const id of ['inverter','battery'])assert.ok(v.meshes.filter(m=>m.userData.part===id&&m.userData.internal).length>=10);
  }
 }
});

test('I trasformati speculari conservano facce esterne e normali coerenti',()=>{
 const original=new THREE.BoxGeometry(1,1,1),baked=bakeGeometry(original,new THREE.Matrix4().makeScale(-2,1,1));
 const p=baked.attributes.position,n=baked.attributes.normal,idx=baked.index;
 for(let i=0;i<idx.count;i+=3){const ids=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)],a=new THREE.Vector3().fromBufferAttribute(p,ids[0]),b=new THREE.Vector3().fromBufferAttribute(p,ids[1]),c=new THREE.Vector3().fromBufferAttribute(p,ids[2]);
  const normal=new THREE.Vector3().fromBufferAttribute(n,ids[0]);assert.ok(b.sub(a).cross(c.sub(a)).dot(normal)>0);
 }
});

test('Pneumatici trasparenti con contorni leggibili, quattro assi rettilinei e centri fissi in rotazione',async()=>{
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({name:'test-without-textures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
 for(const [name,prepare]of [['tesla',prepareTesla],['ferrari',prepareFerrari],['concept',prepareConcept]]){
  const data=await readFile(new URL(`../src/models/${name}.glb`,import.meta.url));
  const {scene}=await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const car=prepare(scene);assert.equal(car.userData.wheels.length,4,name);
  for(const wheel of car.userData.wheels){
   const pos=wheel.position.clone();let tires=0;
   wheel.traverse(m=>{if(!m.isMesh)return;assert.ok(m.geometry.attributes.position.count>0);if(m.material.userData.role==='tire'){tires++;assert.equal(m.material.side,THREE.DoubleSide);assert.equal(m.material.opacity,.42);assert.equal(m.material.transparent,true);assert.equal(m.material.depthWrite,false);}});assert.ok(tires>0,name);
   for(const angle of [0,.3,Math.PI,5]){wheel.quaternion.copy(wheelPose(angle));assert.ok(wheel.position.equals(pos));assert.ok(new THREE.Vector3(1,0,0).applyQuaternion(wheel.quaternion).distanceTo(new THREE.Vector3(1,0,0))<1e-10);}
  }
 }
});

test('Integrazione su 60 secondi: giri ruota compatibili con 0–100 km/h e stessa scala temporale',()=>{
 for(const type of Object.keys(systems))for(const speed of [0,10,30,50,70,100]){
  const {rpm,wheelRpm}=roadMotion(type,speed);let motor=0,wheels=0;
  for(let i=0;i<3600;i++){const step=motionStep(type,{playing:true,assembled:true,rpm,rate:3},1/60);motor+=step.engine;wheels+=step.wheels;}
  assert.ok(Math.abs(wheels/(2*Math.PI)-wheelRpm*.03)<1e-8);
  assert.ok(Math.abs(motor-wheels*ratios[type])<1e-8);
  const stop=motionStep(type,{playing:true,assembled:true,rpm:0,rate:3},1/60);assert.equal(stop.wheels,0);
 }
});
