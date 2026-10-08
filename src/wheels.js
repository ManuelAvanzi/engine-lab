import * as THREE from 'three';

// Closed tire volume and split-spoke rim replace alpha-textured blur surfaces
// in the sedan asset. Rotation remains on the imported axle centres.
export function createDetailedWheel(radius=.88,width=.56){
 const group=new THREE.Group();
 const rubber=new THREE.MeshStandardMaterial({color:'#283139',roughness:.94,metalness:0,transparent:true,opacity:.82,depthWrite:false,side:THREE.DoubleSide});rubber.userData.role='tire';
 const alloy=new THREE.MeshStandardMaterial({color:'#b1bec7',metalness:.55,roughness:.36,transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide});alloy.userData.role='wheel';
 const graphite=alloy.clone();graphite.color.set('#435864');graphite.roughness=.65;
 const add=(geo,mat=alloy,pos=[0,0,0])=>{const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.castShadow=true;group.add(m);return m;};
 const lathe=points=>new THREE.LatheGeometry(points.map(([r,x])=>new THREE.Vector2(r*radius,x*width)),80).rotateZ(Math.PI/2);
 add(lathe([[.70,-.48],[.88,-.51],[.97,-.39],[1,-.26],[1,.26],[.97,.39],[.88,.51],[.70,.48],[.70,.36],[.85,.36],[.9,.24],[.9,-.24],[.85,-.36],[.70,-.36],[.70,-.48]]),rubber);
 // Circumferential channels and transverse cuts, both on the tread surface.
 const grooveMat=rubber.clone();grooveMat.color.set('#101a22');
 for(const x of [-.2,0,.2])add(new THREE.TorusGeometry(radius*.998,.008,5,80).rotateY(Math.PI/2),grooveMat,[x*width,0,0]);
 const cuts=new THREE.InstancedMesh(new THREE.BoxGeometry(width*.28,.007,.025),grooveMat,120);const dummy=new THREE.Object3D();let index=0;
 for(let n=0;n<60;n++)for(const side of [-1,1]){const a=n/60*Math.PI*2;dummy.position.set(side*width*.31,Math.sin(a)*radius,Math.cos(a)*radius);dummy.rotation.set(-a,0,side*.18);dummy.updateMatrix();cuts.setMatrixAt(index++,dummy.matrix);}cuts.userData.role='tire';cuts.material.userData.role='tire';group.add(cuts);
 add(lathe([[.70,-.49],[.73,-.49],[.73,.49],[.70,.49],[.67,.44],[.67,-.44],[.70,-.49]]));
 add(new THREE.CylinderGeometry(radius*.53,radius*.53,.06,64).rotateZ(Math.PI/2),graphite);
 for(const sign of [-1,1]){
  const x=sign*width*.48;
  add(new THREE.CylinderGeometry(radius*.17,radius*.17,.07,32).rotateZ(Math.PI/2),alloy,[x,0,0]);
  for(let n=0;n<5;n++)for(const split of [-1,1]){
   const a=n/5*Math.PI*2;const s=new THREE.Shape();s.moveTo(-.04,.12);s.lineTo(split*.06-.024,.52);s.lineTo(split*.14,.64);s.lineTo(split*.14+.045,.62);s.lineTo(split*.06+.038,.48);s.lineTo(.04,.12);s.closePath();
   const geo=new THREE.ExtrudeGeometry(s,{depth:.045,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:2});geo.scale(radius,radius,1);geo.rotateY(Math.PI/2);const spoke=add(geo,alloy,[x,0,0]);spoke.rotation.x=a;
  }
  for(let n=0;n<5;n++){const a=n/5*Math.PI*2;add(new THREE.CylinderGeometry(.024,.024,.04,6).rotateZ(Math.PI/2),graphite,[x+sign*.047,Math.sin(a)*radius*.115,Math.cos(a)*radius*.115]);}
 }
 return group;
}
