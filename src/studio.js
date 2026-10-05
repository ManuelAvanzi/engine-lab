import * as THREE from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';

export function createStudio(scene){
 const backdrop=document.createElement('canvas');backdrop.width=2;backdrop.height=256;
 const ctx=backdrop.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,256);
 gradient.addColorStop(0,'#3b5262');gradient.addColorStop(1,'#233441');ctx.fillStyle=gradient;ctx.fillRect(0,0,2,256);
 const background=new THREE.CanvasTexture(backdrop);background.colorSpace=THREE.SRGBColorSpace;
 scene.background=background;scene.fog=new THREE.Fog('#293c4a',23,55);
 RectAreaLightUniformsLib.init();
 const softbox=new THREE.RectAreaLight(0xe8f1f5,2.2,9,7);softbox.position.set(1,8,5);softbox.lookAt(0,1,0);scene.add(softbox);
 scene.add(new THREE.HemisphereLight(0xa9d7ff,0x0b1020,.55));
 const key=new THREE.DirectionalLight(0xe7eff5,1.05);key.position.set(1,7,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-11,right:11,top:11,bottom:-11});key.shadow.normalBias=.025;key.shadow.radius=4;key.shadow.bias=-.00015;scene.add(key);
 const blue=new THREE.DirectionalLight(0xa8c8dd,.65);blue.position.set(-6,3,-4);scene.add(blue);
 const amber=new THREE.DirectionalLight(0xf5e5d4,.35);amber.position.set(6,4,-2);scene.add(amber);
 const fill=new THREE.DirectionalLight(0xb8cfdf,.5);fill.position.set(-3,1,8);scene.add(fill);
 const stage=new THREE.Group();scene.add(stage);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.ShadowMaterial({color:0x07121b,opacity:.24}));floor.rotation.x=-Math.PI/2;floor.position.y=-.39;floor.receiveShadow=true;stage.add(floor);
 const grid=new THREE.GridHelper(40,80,0x31546a,0x1c3448);grid.position.y=-.38;grid.material.transparent=true;grid.material.opacity=.075;stage.add(grid);
 const ring=new THREE.Mesh(new THREE.RingGeometry(4.5,4.51,120),new THREE.MeshBasicMaterial({color:0x4aa0bc,transparent:true,opacity:.10,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-.375;stage.add(ring);
 return {stage,lights:{key,blue,amber,fill}};
}

export function addMachining(viewer){
 // Satin aluminium, dark castings, copper windings and rubber remain distinct.
 for(const mesh of viewer.meshes){const id=mesh.userData.part;const mat=mesh.material;
  if(['block','housing','sump','cover','inverter','transmission','reducer'].includes(id)){mat.color.multiplyScalar(id==='cover'?.32:.62);mat.metalness=.4;mat.roughness=.62;}
  else if(['crank','pistons','rods','shaft','bearings','rotor'].includes(id)){mat.metalness=.55;mat.roughness=.5;}
  else if(['exhaust','stator','motor'].includes(id)){mat.color.lerp(new THREE.Color('#c78549'),.25);mat.roughness=.58;mat.metalness=.45;}
  if(id==='stator'||id==='motor'){mat.color.set('#b97845');mat.metalness=.55;mat.roughness=.5;}
  if(id==='battery'){mat.color.set(mesh.geometry.type==='TubeGeometry'?'#da7827':'#627584');mat.metalness=.22;mat.roughness=.68;}
  if(id==='inverter'){mat.color.set('#8d9ca6');mat.metalness=.45;mat.roughness=.57;}
  if(mesh.geometry.type==='TubeGeometry'&&!['intake','exhaust'].includes(id)){mat.metalness=0;mat.roughness=.9;}
  if(mesh.userData.led){mat.color.set('#7fabb4');mat.metalness=.25;mat.roughness=.7;}
  mesh.userData.baseColor=mat.color.clone();
 }
 const block=viewer.parts.block;if(block){
  for(const x of [-1.38,-.46,.46,1.38]){const bore=viewer.mesh(block,new THREE.CylinderGeometry(.378,.378,1.22,48,1,true),'#687f92',[x,1.2,0]);bore.userData.shell=true;
   for(const z of [-.72,.72]){const bolt=viewer.mesh(block,new THREE.CylinderGeometry(.055,.055,.09,6),'#a9bdc9',[x+.3,1.76,z]);bolt.material.metalness=.5;}
  }
  const hose=viewer.parts.intake||block;viewer.tube(hose,[[-1.8,.45,-.6],[-2.35,.7,-.7],[-2.35,1.5,-.8],[-1.8,1.8,-.8]],.06,'#23384b');
 }
 const head=viewer.parts.head;if(head){for(const x of [-1.38,-.46,.46,1.38])for(const z of [-.56,.56]){const plug=viewer.mesh(head,new THREE.CylinderGeometry(.075,.075,.12,6),'#c4d2da',[x,2.25,z]);plug.material.roughness=.55;}}
 const crank=viewer.crankRotor;if(crank){
  for(let a=0;a<Math.PI*2;a+=Math.PI/24){const tooth=viewer.box(crank,[.12,.08,.065],[2.39,.43+Math.sin(a)*.52,Math.cos(a)*.52],'#97aebb');tooth.rotation.x=-a;}
 }
 const cover=viewer.parts.cover;if(cover){viewer.box(cover,[1.36,.025,.47],[.2,3.08,0],'#101f31');for(let x=-.25;x<.8;x+=.22)viewer.box(cover,[.09,.015,.34],[x,3.099,0],'#66d2ea');}
}
