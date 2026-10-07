import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
export async function showScan(host){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#243b4a');
 const camera=new THREE.PerspectiveCamera(38,1,.01,100);camera.position.set(5,3.5,5.5);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;host.append(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=18;
 scene.add(new THREE.HemisphereLight(0xe8f5ff,0x414c55,1.6));for(const [x,y,z,i]of [[4,8,5,2],[-5,4,-3,1]]){const l=new THREE.DirectionalLight(0xffffff,i);l.position.set(x,y,z);scene.add(l);}
 let disposed=false,model;const resize=()=>{const r=host.getBoundingClientRect();if(!r.width||!r.height)return;camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height);};const observer=new ResizeObserver(resize);observer.observe(host);resize();renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
 const dispose=()=>{if(disposed)return;disposed=true;observer.disconnect();renderer.setAnimationLoop(null);controls.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();};
 host.scanDispose=dispose;
 try{const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/models/engine-scan.glb');model=gltf.scene;if(disposed){model.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return;}
  model.rotation.x=Math.PI/2;model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());model.scale.setScalar(5/Math.max(size.x,size.y,size.z));model.updateMatrixWorld(true);const center=new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());model.position.sub(center);scene.add(model);host.querySelector('.scan-status')?.remove();
 }catch{if(!disposed)host.querySelector('.scan-status').textContent='Modello non disponibile. Chiudi e riprova.';}
}
