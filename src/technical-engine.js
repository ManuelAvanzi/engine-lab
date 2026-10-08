import * as THREE from 'three';
import {gearGeometry,castRim} from './geometry-detail.js';
const xs=[-1.38,-.46,.46,1.38];
const alloy='#9da8ad',steel='#778992',dark='#34454d';
export function plate(w,d,h,holes=[]){const s=new THREE.Shape();s.moveTo(-w/2,-d/2);s.lineTo(w/2,-d/2);s.lineTo(w/2,d/2);s.lineTo(-w/2,d/2);s.closePath();for(const [x,z,r]of holes){const p=new THREE.Path();p.absarc(x,z,r,0,Math.PI*2,true);s.holes.push(p);}const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,curveSegments:24});g.rotateX(-Math.PI/2);return g;}
export function clearPart(v,p){const old=new Set();p.traverse(o=>{if(o.isMesh){old.add(o);o.geometry.dispose();o.material.dispose();}});v.meshes=v.meshes.filter(m=>!old.has(m));p.clear();}
export function refineTechnicalEngine(v){
 if(v.type==='ev')return;
 const bolt=(g,p,axis='y',r=.045)=>{const m=v.mesh(g,new THREE.CylinderGeometry(r,r,.045,6),steel,p);if(axis==='z')m.rotation.x=Math.PI/2;if(axis==='x')m.rotation.z=Math.PI/2;return m;};
 const shell=m=>{m.userData.shell=true;return m;};
 const block=v.parts.block;clearPart(v,block);
 const bores=xs.map(x=>[x,0,.365]);
 const headBolts=xs.flatMap(x=>[[x+.27,.5,.035],[x+.27,-.5,.035]]);
 shell(v.mesh(block,plate(4.06,1.3,.13,[...bores,...headBolts]),alloy,[0,1.78,0]));
 shell(v.mesh(block,castRim(4.04,1.28,1.28,.12),alloy,[0,.50,0]));
 v.mesh(block,plate(4.08,1.36,.10,xs.map(x=>[x,0,.39])),alloy,[0,.47,0]);
 xs.forEach(x=>{
  const liner=new THREE.LatheGeometry([[.363,0],[.395,0],[.395,1.24],[.363,1.24],[.363,0]].map(p=>new THREE.Vector2(...p)),48);
  shell(v.mesh(block,liner,'#84959d',[x,.55,0]));
  for(const z of [-.69,.69]){
   shell(v.box(block,[.11,1.15,.09],[x+.39,1.1,z],alloy));
   v.cylinder(block,.11,.028,[x,.91,z],steel,'z');
   bolt(block,[x,1.45,z],'z');
  }
 });
 for(const x of [-1.84,-.92,0,.92,1.84]){
  const bearing=plate(1.16,.48,.19,[[0,0,.17]]);bearing.rotateZ(Math.PI/2);v.mesh(block,bearing,steel,[x+.095,.43,0]);
  for(const z of [-.43,.43])bolt(block,[x,.51,z]);
 }
 // Two camshafts, eight valves, machined seats and a gasket with real bores.
 const head=v.parts.head;clearPart(v,head);v.valves=[];v.camshafts=[];
 shell(v.mesh(head,plate(4.15,1.4,.032,[...bores,...headBolts]),'#424d54',[0,1.94,0]));
 shell(v.mesh(head,plate(4.12,1.4,.22,xs.flatMap(x=>[[x,-.32,.148],[x,.32,.148],[x,0,.058]])),alloy,[0,1.98,0]));
 for(const z of [-.64,.64])shell(v.box(head,[4.10,.4,.11],[0,2.34,z],alloy));
 for(const x of [-1.97,1.97])shell(v.box(head,[.10,.4,1.18],[x,2.34,0],alloy));
 for(const z of [-.32,.32]){
  const cam=new THREE.Group();cam.userData.part='head';cam.position.set(0,2.60,z);head.add(cam);v.camshafts.push(cam);
  v.cylinder(cam,.073,4.32,[0,0,0],steel,'x');
  xs.forEach((x,i)=>{
   const lobe=new THREE.Shape();for(let n=0;n<=48;n++){const a=n/48*Math.PI*2,r=.105+.065*Math.pow(Math.max(0,Math.cos(a)),4);const y=Math.cos(a)*r,zz=Math.sin(a)*r;n?lobe.lineTo(y,zz):lobe.moveTo(y,zz);}const geo=new THREE.ExtrudeGeometry(lobe,{depth:.13,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:2});geo.rotateY(Math.PI/2);const m=v.mesh(cam,geo,'#a7b3b9',[x-.065,0,0]);m.rotation.x=(i===0||i===3?0:Math.PI/2)+(z<0?Math.PI/4:-Math.PI/4);
  });
  for(const x of [-1.84,-.92,0,.92,1.84]){v.box(head,[.18,.09,.25],[x,2.68,z],alloy);bolt(head,[x,2.74,z-.095]);bolt(head,[x,2.74,z+.095]);}
 }
 xs.forEach((x,index)=>{
  [-.32,.32].forEach((z,side)=>{
   v.ring(head,.147,.018,[x,2.0,z],'#5c7078');
   const valve=new THREE.Group();valve.userData.part='head';head.add(valve);
   v.cylinder(valve,.034,.43,[x,2.255,z],'#c4cdd0');v.cylinder(valve,.14,.032,[x,2.015,z],'#a6b2b6');
   const points=[];for(let n=0;n<=100;n++){const a=n/100*Math.PI*14;points.push([x+Math.cos(a)*.065,2.29+n/100*.20,z+Math.sin(a)*.065]);}v.tube(valve,points,.010,'#768892');
   v.cylinder(valve,.087,.035,[x,2.51,z],steel);v.valves.push({g:valve,index,side});
  });
  bolt(head,[x,2.27,0],'y',.073);v.cylinder(head,.047,.26,[x,2.42,0],'#d9dad3');for(let y=2.34;y<2.51;y+=.025)v.ring(head,.049,.009,[x,y,0],'#e7e5d9');
 });
 // Connecting rods: forged outline, bored eyes and split big-end caps.
 v.rods.forEach(({g})=>{clearPart(v,g);const s=new THREE.Shape();s.moveTo(-.07,.33);s.lineTo(-.085,-.27);s.quadraticCurveTo(-.24,-.43,-.12,-.61);s.quadraticCurveTo(0,-.69,.12,-.61);s.quadraticCurveTo(.24,-.43,.085,-.27);s.lineTo(.07,.33);s.quadraticCurveTo(.19,.47,.09,.57);s.quadraticCurveTo(0,.63,-.09,.57);s.quadraticCurveTo(-.19,.47,-.07,.33);for(const [y,r]of [[.46,.077],[-.46,.133]]){const h=new THREE.Path();h.absarc(0,y,r,0,Math.PI*2,true);s.holes.push(h);}const geo=new THREE.ExtrudeGeometry(s,{depth:.15,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:2,curveSegments:24});geo.translate(0,0,-.075);v.mesh(g,geo,'#a2afb5');v.box(g,[.07,.62,.022],[0,.02,.086],dark);v.box(g,[.07,.62,.022],[0,.02,-.086],dark);for(const x of [-.145,.145]){v.cylinder(g,.026,.20,[x,-.49,0],steel);bolt(g,[x,-.60,0]);}v.ring(g,.081,.009,[0,.46,.075],'#c6ab72','z');const alignment=new THREE.Matrix4().makeRotationY(Math.PI/2);g.children.forEach(child=>child.applyMatrix4(alignment));});
 // Timing wheels are attached to the timing assembly and turn at 2:1.
 const timing=v.parts.timing;clearPart(v,timing);v.timingWheels=[];
 for(const [y,z,r,ratio]of [[.43,0,.16,1],[2.60,-.32,.32,.5],[2.60,.32,.32,.5]]){
  const group=new THREE.Group();group.userData.part='timing';group.position.set(-2.24,y,z);timing.add(group);v.mesh(group,gearGeometry(r,.1,r<.2?20:40),steel);bolt(group,[-.065,0,0],'x',.055);v.timingWheels.push({g:group,ratio});
 }
 v.tube(timing,[[-2.24,.43,-.18],[-2.24,2.60,-.65],[-2.24,2.91,-.32],[-2.24,2.91,.32],[-2.24,2.60,.65],[-2.24,.43,.18],[-2.24,.25,0],[-2.24,.43,-.18]],.023,'#34444b');
 // Intake flange, injection rail, injectors and throttle butterfly.
 const intake=v.parts.intake;v.mesh(intake,plate(4.05,.35,.06,xs.map(x=>[x,0,.125])),alloy,[0,2.13,-.78],[Math.PI/2,0,0]);
 v.cylinder(intake,.055,3.35,[0,2.40,-.90],'#a3adb0','x');
 xs.forEach(x=>{v.cylinder(intake,.056,.25,[x,2.26,-.90],'#566b72');v.box(intake,[.12,.11,.14],[x,2.42,-.94],'#243840');});
 v.ring(intake,.25,.022,[-2.10,1.57,-1.2],alloy,'x');v.cylinder(intake,.225,.015,[-2.10,1.57,-1.2],'#c7a86e','x');
 const exhaust=v.parts.exhaust;xs.forEach(x=>{for(const dx of [-.19,.19])bolt(exhaust,[x+dx,2.05,.73],'z');v.ring(exhaust,.12,.018,[x,2.03,.75],'#806852','z');});
 // Distinct finish families, avoiding mirror-like chrome.
 v.meshes.forEach(m=>{m.material.metalness=['pistons','rods','crank','timing'].includes(m.userData.part)?.65:.38;m.material.roughness=['pistons','rods','crank','timing'].includes(m.userData.part)?.38:.66;});
 v.root.userData.modelRevision='technical-i4-01';
}
