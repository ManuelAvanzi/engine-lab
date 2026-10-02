import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// A procedural cutaway vehicle: original geometry, no external model or texture.
export function createVehicle(){
 const car=new THREE.Group();car.name='Scocca trasparente · contesto schematico';
 const shell=new THREE.MeshPhysicalMaterial({color:0x558da6,metalness:.25,roughness:.16,transparent:true,opacity:.075,depthWrite:false,side:THREE.DoubleSide,clearcoat:1});
 const glass=new THREE.MeshPhysicalMaterial({color:0x77dbee,metalness:.45,roughness:.08,transparent:true,opacity:.065,depthWrite:false,side:THREE.DoubleSide});
 const lineMat=new THREE.LineBasicMaterial({color:0x66b7ce,transparent:true,opacity:.32,depthWrite:false});
 function line(points,closed=false){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed);const g=new THREE.BufferGeometry().setFromPoints(curve.getPoints(80));const l=new THREE.Line(g,lineMat);car.add(l);return l;}
 function surface(sections,material){const positions=[],indices=[];const count=sections[0].length;sections.forEach(s=>s.forEach(p=>positions.push(...p)));for(let j=0;j<sections.length-1;j++)for(let i=0;i<count-1;i++){const a=j*count+i,b=a+count;indices.push(a,b,a+1,b,b+1,a+1);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,material);car.add(mesh);return mesh;}
 const stations=[[-6.1,1.75,1.14],[-5.65,2.23,1.48],[-4.5,2.53,1.7],[-2.8,2.55,1.83],[0,2.55,1.82],[2.7,2.5,1.71],[4.5,2.48,1.46],[5.75,2.15,1.2],[6.1,1.7,1.08]];
 const rings=stations.map(([z,w,h])=>[[-w,.65,z],[-w,h-.34,z],[-w*.91,h,z],[-w*.55,h+.08,z],[0,h+.11,z],[w*.55,h+.08,z],[w*.91,h,z],[w,h-.34,z],[w,.65,z]]);
 surface(rings,shell);[0,2,6,8].forEach(i=>line(rings.map(r=>r[i])));line(rings[0]);line(rings.at(-1));
 const roof=[[-3.55,2.17,1.84],[-2.1,1.78,3.07],[-1.3,1.72,3.28],[.6,1.74,3.19],[2.45,2.16,1.85]];
 const cabin=roof.map(([z,w,y])=>[[-w,1.79,z],[-w,y-.08,z],[0,y+.08,z],[w,y-.08,z],[w,1.79,z]]);
 surface(cabin,glass);[1,3].forEach(i=>line(cabin.map(r=>r[i])));[0,1,3,4].forEach(i=>line(cabin[i]));
 [-1,1].forEach(side=>{
  line([[side*2.53,1.7,-3],[side*2.55,.86,-2.7],[side*2.55,.77,.7],[side*2.5,1.75,.95]]);
  line([[side*1.75,3.15,-.6],[side*2.55,1.8,-.5],[side*2.55,.85,-.5]]);
  const mirror=new THREE.Mesh(new RoundedBoxGeometry(.45,.22,.68,2,.1),shell);mirror.position.set(side*2.63,1.97,1.8);car.add(mirror);
 });
 const wheels=[];
 for(const x of [-2.42,2.42])for(const z of [-3.8,3.8]){
  const wheel=new THREE.Group();wheel.position.set(x,.62,z);car.add(wheel);wheels.push(wheel);
  const tire=new THREE.Mesh(new THREE.TorusGeometry(.72,.23,14,64),new THREE.MeshStandardMaterial({color:0x15212c,roughness:.62,metalness:.1,transparent:true,opacity:.55,depthWrite:false}));tire.rotation.y=Math.PI/2;wheel.add(tire);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,.33,48),new THREE.MeshStandardMaterial({color:0x738b9a,metalness:.95,roughness:.2,transparent:true,opacity:.38,depthWrite:false}));rim.rotation.z=Math.PI/2;wheel.add(rim);
  const spokes=new THREE.Group();for(let i=0;i<6;i++){const a=i*Math.PI/3;const bar=new THREE.Mesh(new RoundedBoxGeometry(.37,.085,.52,1,.025),new THREE.MeshStandardMaterial({color:0xa2beca,metalness:.95,roughness:.16}));bar.position.set(0,Math.sin(a)*.27,Math.cos(a)*.27);bar.rotation.x=-a;spokes.add(bar);}wheel.add(spokes);
  const arch=[];for(let a=0;a<=Math.PI+.01;a+=Math.PI/24)arch.push([x*1.065,.65+Math.sin(a)*1.06,z+Math.cos(a)*1.06]);line(arch);
 }
 const lampMaterial=new THREE.MeshBasicMaterial({color:0x8ae7ff,transparent:true,opacity:.8});
 [-1,1].forEach(s=>{const light=new THREE.Mesh(new RoundedBoxGeometry(1.04,.055,.08,2,.02),lampMaterial);light.position.set(s*1.47,1.28,5.85);light.rotation.y=s*.17;car.add(light);const rear=light.clone();rear.material=new THREE.MeshBasicMaterial({color:0xff5f61,transparent:true,opacity:.6});rear.position.set(s*1.47,1.44,-5.75);car.add(rear);});
 car.userData.wheels=wheels;return car;
}

export function createStudio(scene){
 scene.background=new THREE.Color('#080f19');scene.fog=new THREE.Fog('#080f19',23,55);
 scene.add(new THREE.HemisphereLight(0xa9d7ff,0x0b1020,.75));
 const key=new THREE.DirectionalLight(0xd8eaff,4.6);key.position.set(1,7,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-11,right:11,top:11,bottom:-11});key.shadow.normalBias=.025;scene.add(key);
 const blue=new THREE.DirectionalLight(0x4ecbff,3.6);blue.position.set(-6,3,-4);scene.add(blue);
 const amber=new THREE.DirectionalLight(0xffa15c,2.9);amber.position.set(6,4,-2);scene.add(amber);
 const fill=new THREE.DirectionalLight(0x9caeff,1.4);fill.position.set(-3,1,8);scene.add(fill);
 const stage=new THREE.Group();scene.add(stage);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.MeshStandardMaterial({color:0x080e18,metalness:.08,roughness:.94}));floor.rotation.x=-Math.PI/2;floor.position.y=-.39;floor.receiveShadow=true;stage.add(floor);
 const grid=new THREE.GridHelper(40,80,0x31546a,0x1c3448);grid.position.y=-.38;grid.material.transparent=true;grid.material.opacity=.18;stage.add(grid);
 const ring=new THREE.Mesh(new THREE.RingGeometry(4.5,4.51,120),new THREE.MeshBasicMaterial({color:0x4aa0bc,transparent:true,opacity:.25,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-.375;stage.add(ring);
 return {stage,lights:{key,blue,amber,fill}};
}

export function addMachining(viewer){
 // Material hierarchy keeps polished pins, satin castings, copper and graphite distinct.
 for(const mesh of viewer.meshes){const id=mesh.userData.part;const mat=mesh.material;
  if(['block','housing','sump','cover','inverter','transmission','reducer'].includes(id)){mat.color.multiplyScalar(id==='cover'?.32:.62);mat.metalness=.86;mat.roughness=.28;}
  else if(['crank','pistons','rods','shaft','bearings','rotor'].includes(id)){mat.metalness=.93;mat.roughness=.2;}
  else if(['exhaust','stator','motor'].includes(id)){mat.color.lerp(new THREE.Color('#c78549'),.25);mat.roughness=.23;mat.metalness=.85;}
  mesh.userData.baseColor=mat.color.clone();
 }
 const block=viewer.parts.block;if(block){
  for(const x of [-1.38,-.46,.46,1.38]){const bore=viewer.mesh(block,new THREE.CylinderGeometry(.378,.378,1.22,48,1,true),'#687f92',[x,1.2,0]);bore.userData.shell=true;
   for(const z of [-.72,.72]){const bolt=viewer.mesh(block,new THREE.CylinderGeometry(.055,.055,.09,6),'#a9bdc9',[x+.3,1.76,z]);bolt.material.metalness=1;}
  }
  const hose=viewer.parts.intake||block;viewer.tube(hose,[[-1.8,.45,-.6],[-2.35,.7,-.7],[-2.35,1.5,-.8],[-1.8,1.8,-.8]],.06,'#23384b');
 }
 const head=viewer.parts.head;if(head){for(const x of [-1.38,-.46,.46,1.38])for(const z of [-.56,.56]){const plug=viewer.mesh(head,new THREE.CylinderGeometry(.075,.075,.12,6),'#c4d2da',[x,2.25,z]);plug.material.roughness=.17;}}
 const crank=viewer.crankRotor;if(crank){
  for(let a=0;a<Math.PI*2;a+=Math.PI/24){const tooth=viewer.box(crank,[.12,.08,.065],[2.39,.43+Math.sin(a)*.52,Math.cos(a)*.52],'#97aebb');tooth.rotation.x=-a;}
 }
 const cover=viewer.parts.cover;if(cover){viewer.box(cover,[1.36,.025,.47],[.2,3.08,0],'#101f31');for(let x=-.25;x<.8;x+=.22)viewer.box(cover,[.09,.015,.34],[x,3.099,0],'#66d2ea');}
}
