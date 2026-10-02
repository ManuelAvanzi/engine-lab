import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache=new Map();
export const vehicleInfo={
 ev:{key:'tesla',name:'Tesla Model 3 · 2024',note:'Carrozzeria reale · propulsore didattico, non CAD Tesla'},
 ice:{key:'concept',name:'Car Concept · termico',note:'Carrozzeria concept dettagliata · propulsore didattico'},
 hybrid:{key:'concept',name:'Car Concept · ibrido',note:'Carrozzeria concept dettagliata · propulsore didattico'}
};

function finishMaterial(original,role){
 const tire=role==='tire',wheel=role==='wheel',glass=role==='glass';
 const m=new THREE.MeshStandardMaterial({color:tire?'#252a30':wheel?'#72818f':glass?'#8caebe':'#7da6bd',metalness:wheel?.25:0,roughness:tire?.95:wheel?.72:.86,transparent:!tire&&!wheel,opacity:glass?.075:role==='interior'?.018:.12,depthWrite:tire||wheel,side:THREE.FrontSide});
 if(tire){m.normalMap=original.normalMap;m.normalScale.copy(original.normalScale||new THREE.Vector2(1,1));}
 m.envMapIntensity=.12;
 m.userData.role=role;
 return m;
}

function prepareTesla(source){
 source.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(source),center=bounds.getCenter(new THREE.Vector3());
 const unit=12/4.72,scale=12/(bounds.max.x-bounds.min.x);
 const transform=new THREE.Matrix4().makeRotationY(-Math.PI/2).multiply(new THREE.Matrix4().makeScale(scale,scale,scale)).multiply(new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
 const car=new THREE.Group(),body=new THREE.Group();car.add(body);
 const wheels=[];for(const front of [true,false])for(const side of [-1,1]){const g=new THREE.Group();g.position.set(side*.81*unit,.345*unit,(front?1.49:-1.385)*unit);car.add(g);wheels.push(g);}
 source.traverse(o=>{
  if(!o.isMesh)return;
  const original=o.material,name=original.name;
  const geometry=o.geometry.clone();
  // Quantized attributes must become floating-point before baking world
  // transforms; writing world coordinates back to normalized integers clips them.
  for(const name of ['position','normal','tangent']){
   const attr=geometry.getAttribute(name);if(!attr)continue;
   const values=new Float32Array(attr.count*attr.itemSize);
   for(let i=0;i<attr.count;i++)for(let k=0;k<attr.itemSize;k++)values[i*attr.itemSize+k]=attr.getComponent(i,k);
   geometry.setAttribute(name,new THREE.BufferAttribute(values,attr.itemSize));
  }
  geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(transform,o.matrixWorld));
  const pos=geometry.attributes.position,index=geometry.index,buckets=new Map();
  for(let i=0;i<(index?.count??pos.count);i+=3){
   const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k);
   const x=ids.reduce((s,j)=>s+pos.getX(j),0)/3/unit,y=ids.reduce((s,j)=>s+pos.getY(j),0)/3/unit,z=ids.reduce((s,j)=>s+pos.getZ(j),0)/3/unit;
   const wheelMaterial=/Tire1|Georimblurlfsub021/.test(name)||(/Georimblurlfsub01/.test(name)&&y<.65);
   const w=wheelMaterial&&Math.abs(x)>.7&&Math.min(Math.abs(z-1.49),Math.abs(z+1.385))<.4 ? (z>0?0:2)+(x>0?1:0):-1;
   let role=w>=0?(/Tire1/.test(name)?'tire':'wheel'):/window|Geodoorl2sub31|Geodoorr2sub31/i.test(name)?'glass':/cockpit|intsub|Ln7/i.test(name)?'interior':'body';
   const key=`${w}:${role}`;if(!buckets.has(key))buckets.set(key,{w,role,indices:[]});buckets.get(key).indices.push(...ids);
  }
  for(const {w,role,indices}of buckets.values()){
   const g=geometry.clone();g.setIndex(indices);const target=w>=0?wheels[w]:body;
   if(w>=0)g.translate(-target.position.x,-target.position.y,-target.position.z);
   g.computeBoundingBox();g.computeBoundingSphere();const mesh=new THREE.Mesh(g,finishMaterial(original,role));mesh.castShadow=w>=0;target.add(mesh);
  }
  geometry.dispose();
 });
 car.userData.wheels=wheels;car.position.y=-.34;return car;
}

function prepareConcept(source){
 source.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3());
 const car=new THREE.Group();car.add(source);
 // Normalize the authored car to the same teaching envelope as the sedan.
 if(size.x>size.z)source.rotation.y=Math.PI/2;
 car.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(car),s=12/Math.max(size.x,size.z),c=box.getCenter(new THREE.Vector3());
 source.position.set(-c.x,-box.min.y,-c.z);car.scale.setScalar(s);car.position.y=-.34;
 const wheels=[];
 source.traverse(o=>{if(!o.isMesh)return;
  const name=o.name,original=o.material;
  const materialName=original.name||'';
  const wheel=/Wheel|Axle/i.test(name)||/Tire|Rim|Disc|Brake/.test(materialName);
  const role=wheel?(/Tire/i.test(materialName)?'tire':'wheel'):/Glass|Window/i.test(name+' '+materialName)?'glass':/Interior|Floor|Dashboard|Underside/i.test(name)?'interior':'body';
  if(name==='Engine'||/License|Emblem/i.test(name)){o.visible=false;return;}
  o.material=finishMaterial(original,role);o.castShadow=wheel;
 });
 car.userData.wheels=wheels;
 return car;
}

export async function loadVehicle(type){
 const key=vehicleInfo[type].key;
 if(!cache.has(key))cache.set(key,loader.loadAsync(`/models/${key}.glb`).then(({scene})=>key==='tesla'?prepareTesla(scene):prepareConcept(scene)).catch(e=>{cache.delete(key);throw e;}));
 return cache.get(key);
}
