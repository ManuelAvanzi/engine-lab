import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {prepareTesla,prepareConcept,prepareFerrari} from '../src/vehicles.js';
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({name:'qa-texture-stub',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
for(const [name,prepare]of [['tesla',prepareTesla],['concept',prepareConcept],['ferrari',prepareFerrari]]){
 const data=await readFile(`src/models/${name}.glb`),{scene}=await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
 const car=prepare(scene);
 console.log(name,car.userData.wheels.map(w=>{
  const box=new THREE.Box3();let triangles=0;
  w.traverse(m=>{if(!m.isMesh||m.material.userData.role!=='tire')return;const g=m.geometry,p=g.attributes.position;for(let i=0;i<(g.index?.count??p.count);i++){const j=g.index?g.index.getX(i):i;box.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,j));}triangles+=(g.index?.count??p.count)/3;});
  return {center:w.position.toArray(),min:box.min.toArray(),max:box.max.toArray(),triangles};
 }));
}
