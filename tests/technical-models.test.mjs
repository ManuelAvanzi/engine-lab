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
import {ratios,motionStep,roadMotion} from '../src/motion.js';

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

test('Pneumatici reali opachi, quattro assi rettilinei e centri fissi in rotazione',async()=>{
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({name:'test-without-textures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
 for(const [name,prepare]of [['tesla',prepareTesla],['ferrari',prepareFerrari],['concept',prepareConcept]]){
  const data=await readFile(new URL(`../src/models/${name}.glb`,import.meta.url));
  const {scene}=await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const car=prepare(scene);assert.equal(car.userData.wheels.length,4,name);
  for(const wheel of car.userData.wheels){
   const pos=wheel.position.clone();let tires=0;
   wheel.traverse(m=>{if(!m.isMesh)return;assert.ok(m.geometry.attributes.position.count>0);if(m.material.userData.role==='tire'){tires++;assert.equal(m.material.side,THREE.DoubleSide);assert.equal(m.material.opacity,1);assert.equal(m.material.depthWrite,true);}});assert.ok(tires>0,name);
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
