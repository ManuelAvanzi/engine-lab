import {createDetailedWheel} from './wheels.js';
import {bakeGeometry} from './vehicle-geometry.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache=new Map();
export const vehicleInfo={
 ev:{key:'tesla',name:'Tesla Model 3 · 2024',note:'Carrozzeria reale · propulsore didattico, non CAD Tesla'},
 ice:{key:'ferrari',name:'Ferrari 458 Italia',note:'Carrozzeria reale · 4 cilindri didattico, non V8 Ferrari'},
 hybrid:{key:'concept',name:'Car Concept · ibrido',note:'Carrozzeria concept dettagliata · propulsore didattico'}
};

function finishMaterial(original,role){
 const tire=role==='tire',wheel=role==='wheel',glass=role==='glass';
 const m=new THREE.MeshStandardMaterial({color:tire?'#252a30':wheel?'#72818f':glass?'#8caebe':'#7da6bd',metalness:wheel?.25:0,roughness:tire?.95:wheel?.72:.86,transparent:!tire&&!wheel,opacity:tire||wheel?1:glass?.07:.1,depthWrite:tire||wheel,side:tire||wheel?THREE.DoubleSide:THREE.FrontSide});
 if(tire){m.normalMap=original.normalMap;m.normalScale.copy(original.normalScale||new THREE.Vector2(1,1));}
 m.envMapIntensity=.12;
 m.userData.role=role;m.userData.overviewOpacity=m.opacity;
 if(role==='body'||role==='glass'){
  m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`diffuseColor.a *= 0.2 + 0.8 * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0);
#include <opaque_fragment>`);};
  m.customProgramCacheKey=()=> 'xray-contour-v1';
 }
 return m;
}

export function prepareTesla(source){
 source.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(source),center=bounds.getCenter(new THREE.Vector3());
 const unit=12/4.72,scale=12/(bounds.max.x-bounds.min.x);
 const transform=new THREE.Matrix4().makeRotationY(-Math.PI/2).multiply(new THREE.Matrix4().makeScale(scale,scale,scale)).multiply(new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
 const car=new THREE.Group(),body=new THREE.Group();car.add(body);
 const wheels=[];for(const front of [true,false])for(const side of [-1,1]){const g=new THREE.Group();g.position.set(side*.81*unit,.345*unit,(front?1.49:-1.385)*unit);car.add(g);wheels.push(g);}
 source.traverse(o=>{
  if(!o.isMesh)return;
  const original=o.material,name=original.name;
  const geometry=bakeGeometry(o.geometry,new THREE.Matrix4().multiplyMatrices(transform,o.matrixWorld));
  const pos=geometry.attributes.position,index=geometry.index,buckets=new Map();
  for(let i=0;i<(index?.count??pos.count);i+=3){
   const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k);
   const x=ids.reduce((s,j)=>s+pos.getX(j),0)/3/unit,y=ids.reduce((s,j)=>s+pos.getY(j),0)/3/unit,z=ids.reduce((s,j)=>s+pos.getZ(j),0)/3/unit;
   const wheelMaterial=/Tire1|Georimblurlfsub021/.test(name)||(/Georimblurlfsub01/.test(name)&&y<.65);
   const w=wheelMaterial&&Math.abs(x)>.7&&Math.min(Math.abs(z-1.49),Math.abs(z+1.385))<.4 ? (z>0?0:2)+(x>0?1:0):-1;
   let role=w>=0?(/Tire1/.test(name)?'tire':'wheel'):/window|Geodoorl2sub31|Geodoorr2sub31/i.test(name)?'glass':/cockpit|intsub|Ln7/i.test(name)?'interior':'body';
   if(w<0&&Math.abs(x)<.72&&y>.27&&y<1.05&&z>-.95&&z<.65)role='interior';
   const key=`${w}:${role}`;if(!buckets.has(key))buckets.set(key,{w,role,indices:[]});buckets.get(key).indices.push(...ids);
  }
  for(const {w,role,indices}of buckets.values()){
   if(role==='interior')continue;
   const g=geometry.clone();g.setIndex(indices);const target=w>=0?wheels[w]:body;
   if(w>=0)g.translate(-target.position.x,-target.position.y,-target.position.z);
   g.computeBoundingBox();g.computeBoundingSphere();const mesh=new THREE.Mesh(g,finishMaterial(original,role));mesh.castShadow=w>=0;target.add(mesh);
  }
  geometry.dispose();
 });
 for(const w of wheels){
  w.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});w.clear();w.add(createDetailedWheel());
 }
 car.userData.wheels=wheels;car.updateMatrixWorld(true);const floor=Math.min(...wheels.map(w=>new THREE.Box3().setFromObject(w).min.y));car.position.y=-.35-floor;return car;
}

export function prepareFerrari(source){
 source.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(source),center=bounds.getCenter(new THREE.Vector3());
 const scale=12/(bounds.max.z-bounds.min.z);
 // The source faces -Z. Bake all geometry into a +Z teaching frame, so
 // straight wheel axles are world X and share the existing rotation driver.
 const transform=new THREE.Matrix4().makeRotationY(Math.PI).multiply(new THREE.Matrix4().makeScale(scale,scale,scale)).multiply(new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
 const car=new THREE.Group(),body=new THREE.Group(),wheels=[],pivots=new Map();car.add(body);
 source.traverse(o=>{if(/^wheel_[fr][lr]$/.test(o.name)){
  const wheel=new THREE.Group();wheel.name=o.name;wheel.position.copy(o.getWorldPosition(new THREE.Vector3()).applyMatrix4(transform));car.add(wheel);wheels.push(wheel);pivots.set(o,wheel);
 }});
 source.traverse(o=>{
  if(!o.isMesh)return;
  let ancestor=o.parent,wheel;while(ancestor){if(pivots.has(ancestor)){wheel=pivots.get(ancestor);break;}ancestor=ancestor.parent;}
  if(!wheel&&/leather|interior|carpet|steering|carbon|blue|yellow_trim/i.test(o.name))return;
  // Brake calipers remain fixed; tires and rims turn around their own centre.
  const spinning=wheel&&!/^brake/.test(o.name),target=spinning?wheel:body;
  const role=wheel?(/tire/i.test(o.name)?'tire':'wheel'):/glass/i.test(o.name)?'glass':'body';
  const geometry=bakeGeometry(o.geometry,new THREE.Matrix4().multiplyMatrices(transform,o.matrixWorld));
  if(spinning)geometry.translate(-wheel.position.x,-wheel.position.y,-wheel.position.z);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const material=finishMaterial(o.material,role);
  if(role==='body'){material.color.set('#bc9790');material.opacity=.18;material.userData.overviewOpacity=.18;}
  const mesh=new THREE.Mesh(geometry,material);mesh.name=o.name;mesh.castShadow=!!wheel;target.add(mesh);
 });
 car.userData.wheels=wheels;car.updateMatrixWorld(true);const floor=Math.min(...wheels.map(w=>new THREE.Box3().setFromObject(w).min.y));car.position.y=-.35-floor;return car;
}

export function prepareConcept(source){
 source.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const scale=12/Math.max(size.x,size.z),turn=size.x>size.z?Math.PI/2:0;
 const transform=new THREE.Matrix4().makeRotationY(turn).multiply(new THREE.Matrix4().makeScale(scale,scale,scale)).multiply(new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
 const car=new THREE.Group(),body=new THREE.Group(),wheels=[],pivots=new Map();car.add(body);
 source.traverse(o=>{if(/^Wheel(Front|Rear)[LR]$/.test(o.name)){
  const group=new THREE.Group();group.name=o.name+'Spin';
  group.position.copy(o.getWorldPosition(new THREE.Vector3()).applyMatrix4(transform));car.add(group);wheels.push(group);
  const world=new THREE.Matrix4().multiplyMatrices(transform,o.matrixWorld),axis=new THREE.Vector3(1,0,0).transformDirection(world);
  const straight=new THREE.Quaternion().setFromUnitVectors(axis,new THREE.Vector3(axis.x<0?-1:1,0,0));
  const correction=new THREE.Matrix4().makeTranslation(...group.position.toArray()).multiply(new THREE.Matrix4().makeRotationFromQuaternion(straight)).multiply(new THREE.Matrix4().makeTranslation(...group.position.clone().negate().toArray()));
  pivots.set(o,{group,correction});
 }});
 source.traverse(o=>{if(!o.isMesh)return;
  let a=o,wheel;while(a){if(pivots.has(a)){wheel=pivots.get(a);break;}a=a.parent;}
  const name=o.name,original=o.material,materialName=original.name||'';
  const role=wheel?(/Tire/i.test(materialName)?'tire':'wheel'):/Glass|Window/i.test(name+' '+materialName)?'glass':/Interior|Floor|Dashboard|Underside/i.test(name)?'interior':'body';
  if(role==='interior'||name==='Engine'||/License|Emblem/i.test(name))return;
  let matrix=new THREE.Matrix4().multiplyMatrices(transform,o.matrixWorld);
  if(wheel)matrix.premultiply(wheel.correction);
  const geometry=bakeGeometry(o.geometry,matrix),spinning=wheel&&!/BrakePad/.test(name);
  if(spinning)geometry.translate(-wheel.group.position.x,-wheel.group.position.y,-wheel.group.position.z);
  const mesh=new THREE.Mesh(geometry,finishMaterial(original,role));mesh.name=name;mesh.castShadow=!!wheel;
  (spinning?wheel.group:body).add(mesh);
 });
 car.userData.wheels=wheels;car.updateMatrixWorld(true);const floor=Math.min(...wheels.map(w=>new THREE.Box3().setFromObject(w).min.y));car.position.y=-.35-floor;return car;
}

export async function loadVehicle(type){
 const key=vehicleInfo[type].key;
 if(!cache.has(key))cache.set(key,loader.loadAsync(`/models/${key}.glb`).then(({scene})=>key==='tesla'?prepareTesla(scene):key==='ferrari'?prepareFerrari(scene):prepareConcept(scene)).catch(e=>{cache.delete(key);throw e;}));
 return cache.get(key);
}
