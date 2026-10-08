import * as THREE from 'three';
import {gearGeometry,castRim} from './geometry-detail.js';
import {clearPart,plate} from './technical-engine.js';
const C={alloy:'#9baab1',steel:'#7f9099',copper:'#be8050',insulator:'#273e49',orange:'#e58a36',cyan:'#69b5ba'};
const TAU=Math.PI*2;

function annulus(outer,inner,width,segments=64){
 const points=[[inner,-width/2],[outer,-width/2],[outer,width/2],[inner,width/2],[inner,-width/2]].map(p=>new THREE.Vector2(...p));
 return new THREE.LatheGeometry(points,segments).rotateZ(Math.PI/2);
}
function shell(mesh){mesh.userData.shell=true;return mesh;}
function bolt(v,p,pos,axis='x',r=.04){return v.cylinder(p,r,.065,pos,C.steel,axis);}
function housing(v,p,c,length,r){
 const [x,y,z]=c;
 shell(v.mesh(p,annulus(r,r-.075,length),C.alloy,c));
 for(const dx of [-length/2,length/2]){
  shell(v.mesh(p,annulus(r+.055,r-.08,.07),C.alloy,[x+dx,y,z]));
  for(let a=0;a<TAU;a+=TAU/8)bolt(v,p,[x+dx,y+Math.sin(a)*(r+.07),z+Math.cos(a)*(r+.07)]);
 }
 for(let dx=-length/2+.15;dx<length/2;dx+=.2)shell(v.mesh(p,annulus(r+.018,r,.035),C.steel,[x+dx,y,z]));
 for(const side of [-1,1]){shell(v.box(p,[length*.7,.13,.26],[x,y-r*.86,z+side*r*.75],C.alloy));bolt(v,p,[x+length*.23,y-r*.77,z+side*r*.75],'y');}
 for(const dx of [-length*.32,length*.32]){v.cylinder(p,.074,.2,[x+dx,y+r*.78,z-r*.68],C.alloy,'z');v.ring(p,.074,.016,[x+dx,y+r*.78,z-r*.8],C.insulator,'z');}
}
function stator(v,p,c,length,outer,inner,slots=24){
 const [x,y,z]=c;
 // Laminations form a hollow, stationary core with teeth facing the air gap.
 v.mesh(p,annulus(outer,inner+.075,length),C.steel,c).userData.shell=true;
 for(let dx=-length/2;dx<=length/2+.001;dx+=length/22)v.mesh(p,annulus(outer+.005,inner+.075,.008),'#4e6570',[x+dx,y,z]).userData.shell=true;
 for(let i=0;i<slots;i++){
  const a=i/slots*TAU,r=(outer+inner)/2;
  const tooth=v.box(p,[length,.10,outer-inner],[x,y+Math.sin(a)*r,z+Math.cos(a)*r],C.steel);tooth.rotation.x=-a;
  const coil=v.box(p,[length*.93,.055,.14],[x,y+Math.sin(a+.075)*(r+.02),z+Math.cos(a+.075)*(r+.02)],C.copper);coil.rotation.x=-a;coil.userData.internal=true;
  // Three nested hairpin returns make the copper end windings readable.
  for(const sign of [-1,1])for(let layer=0;layer<2;layer++){
   const end=x+sign*(length/2+.04+layer*.035),a2=a+TAU/slots*.8,rr=r+.02;
   const path=[[end-sign*.10,y+Math.sin(a)*rr,z+Math.cos(a)*rr],[end,y+Math.sin(a)*rr,z+Math.cos(a)*rr],[end,y+Math.sin(a2)*rr,z+Math.cos(a2)*rr],[end-sign*.10,y+Math.sin(a2)*rr,z+Math.cos(a2)*rr]];
   v.tube(p,path,.016,C.copper).userData.internal=true;
  }
 }
 for(let phase=0;phase<3;phase++)v.box(p,[.12,.07,.17],[x+length/2+.16,y+outer*.78,z+(phase-1)*.22],['#c38c55','#9b7356','#dfad75'][phase]).userData.internal=true;
}
function rotor(v,p,c,length,r){
 const spin=new THREE.Group();spin.userData.part=p.userData.part;spin.position.set(...c);p.add(spin);v.rotating.push(spin);
 v.cylinder(spin,r,length,[0,0,0],C.steel,'x');
 for(let dx=-length/2;dx<=length/2;dx+=length/18)v.ring(spin,r+.002,.005,[dx,0,0],'#445b67','x');
 for(let i=0;i<8;i++){
  const a=i/8*TAU,m=v.box(spin,[length*.92,.15,.07],[0,Math.sin(a)*(r+.016),Math.cos(a)*(r+.016)],i%2?'#a27664':'#6f9aa8');m.rotation.x=-a;m.userData.internal=true;
 }
 for(const dx of [-length/2-.02,length/2+.02]){
  v.mesh(spin,annulus(r,.11,.045),C.alloy,[dx,0,0]);
  for(let a=0;a<TAU;a+=TAU/6)bolt(v,spin,[dx,Math.sin(a)*r*.65,Math.cos(a)*r*.65],'x',.025);
 }
 return spin;
}
function shaft(v,p,c,length){
 const spin=new THREE.Group();spin.userData.part=p.userData.part;spin.position.set(...c);p.add(spin);v.rotating.push(spin);
 v.cylinder(spin,.13,length,[0,0,0],'#bdc8cb','x');
 for(const end of [-1,1]){v.cylinder(spin,.17,.18,[end*(length/2-.5),0,0],C.steel,'x');for(let i=0;i<16;i++){const a=i/16*TAU,m=v.box(spin,[.34,.025,.04],[end*(length/2-.2),Math.sin(a)*.135,Math.cos(a)*.135],C.steel);m.rotation.x=-a;}}
 return spin;
}
function inverter(v,p,hybrid){
 clearPart(v,p);const x=hybrid?2.7:0,y=hybrid?1.95:2.55,w=hybrid?1.15:2.25,d=1.12;
 shell(v.mesh(p,castRim(w,d,.3,.065),C.alloy,[x,y-.15,0]));
 shell(v.box(p,[w+.04,.035,d+.04],[x,y+.17,0],C.alloy));
 v.box(p,[w-.08,.05,d-.08],[x,y-.16,0],C.steel).userData.internal=true;
 for(let i=0;i<6;i++){const a=(i%3-1)*w*.26,z=i<3?-.22:.22;v.box(p,[w*.2,.075,.25],[x+a,y-.09,z],C.insulator).userData.internal=true;v.box(p,[w*.18,.018,.21],[x+a,y-.038,z],C.copper).userData.internal=true;}
 for(const z of [-.38,.38]){v.box(p,[w*.8,.018,.036],[x,y+.035,z],C.copper).userData.internal=true;}
 v.box(p,[w*.82,.025,.17],[x,y+.08,0],'#38786d').userData.internal=true;
 for(let i=0;i<5;i++)v.box(p,[.07,.025,.08],[x+(i-2)*w*.13,y+.105,0],C.insulator).userData.internal=true;
 for(const dx of [-w/2+.1,w/2-.1])for(const z of [-.45,.45])bolt(v,p,[x+dx,y+.21,z],'y',.035);
 for(let dx=-w/2+.12;dx<w/2;dx+=.12)shell(v.box(p,[.024,.06,.92],[x+dx,y+.22,0],C.alloy));
 for(let phase=0;phase<3;phase++){v.cylinder(p,.065,.14,[x+(phase-1)*.19,y,-.61],C.orange,'z');v.ring(p,.065,.018,[x+(phase-1)*.19,y,-.68],C.insulator,'z');}
 for(const z of [-.33,.33])v.cylinder(p,.05,.17,[x+w/2+.035,y-.08,z],C.alloy,'x');
 p.userData.modeledInternals=true;
}
function battery(v,p,hybrid){
 clearPart(v,p);const x=hybrid?.1:0,y=hybrid?.35:.01,z=hybrid?-2.4:-1.95,w=hybrid?3:3.8,d=hybrid?1.1:1.3;
 shell(v.mesh(p,castRim(w,d,.4,.055),C.alloy,[x,y-.2,z]));
 shell(v.box(p,[w,.028,d],[x,y+.22,z],'#647a87'));
 v.box(p,[w-.1,.025,d-.1],[x,y-.18,z],C.cyan).userData.internal=true;
 for(let col=0;col<6;col++)for(let row=0;row<2;row++){
  const px=x+(col-2.5)*(w-.18)/6,pz=z+(row-.5)*d*.45;
  v.box(p,[(w-.3)/6,.21,d*.39],[px,y-.035,pz],C.insulator).userData.internal=true;
  for(let cell=0;cell<4;cell++){const cx=px+(cell-1.5)*(w-.3)/26;v.box(p,[(w-.3)/30,.19,d*.34],[cx,y-.01,pz],'#a8b8b5').userData.internal=true;v.box(p,[(w-.3)/30,.025,.04],[cx,y+.10,pz],C.copper).userData.internal=true;}
 }
 for(const dz of [-d*.41,d*.41])v.box(p,[w-.25,.022,.04],[x,y+.13,z+dz],C.copper).userData.internal=true;
 v.box(p,[.26,.07,.26],[x+w/2-.20,y+.12,z],'#2b7263').userData.internal=true;
 for(const dx of [-w/2+.15,w/2-.15])for(const dz of [-d/2+.07,d/2-.07])bolt(v,p,[x+dx,y+.25,z+dz],'y',.027);
 v.tube(p,[[x+w/2,y,z],[x+w/2+.30,y+.1,z],[hybrid?2.9:2.5,.6,-1.2],[hybrid?2.9:1.1,hybrid?1.9:2.55,-.55]],.045,C.orange);
 p.userData.modeledInternals=true;
}
function reducer(v,p,hybrid){
 clearPart(v,p);const x=hybrid?3.8:2.16,y=hybrid?.43:1.17,scale=hybrid?.65:1;
 const assembly=new THREE.Group();assembly.userData.part=p.userData.part;assembly.position.set(x,y,0);assembly.scale.setScalar(scale);p.add(assembly);
 // Two stages: EV 3 × 3 = 9; parallel hybrid 2 × 3 = 6.
 const first=hybrid?2:3,r1=hybrid?.24:.18,r2=hybrid?.48:.54;
 shell(v.mesh(assembly,castRim(1.45,1.36,.63,.06).rotateZ(Math.PI/2),C.alloy,[.34,-.37,.16]));
 for(const dx of [-.32,.35])shell(v.box(assembly,[.035,1.55,1.37],[dx,-.35,.16],C.alloy));
 const mid=[-.55,.39],out=[-1.10,0];
 for(const [dx,cy,cz,r,teeth,ratio]of [[-.16,0,0,r1,hybrid?18:12,1],[-.16,...mid,r2,36,-1/first],[.16,...mid,.18,12,-1/first],[.16,...out,.54,36,1/(first*3)]]){
  const g=new THREE.Group();g.userData.part=p.userData.part;g.position.set(dx,cy,cz);assembly.add(g);v.mesh(g,gearGeometry(r,.12,teeth),C.steel).userData.internal=true;
  v.cylinder(g,.075,.17,[0,0,0],C.alloy,'x').userData.internal=true;
  v.gearRotors.push({g,ratio});
 }
 for(const [cy,cz]of [[0,0],mid,out]){v.cylinder(assembly,.07,.85,[0,cy,cz],C.steel,'x').userData.internal=true;v.ring(assembly,.10,.025,[.38,cy,cz],C.alloy,'x');}
 for(const cy of [.30,-1.])for(const cz of [-.43,.73])bolt(v,assembly,[.4,cy,cz]);
 p.userData.modeledInternals=true;
}

export function refineElectricSystems(v){
 if(v.type==='ice')return;
 const hybrid=v.type==='hybrid';v.gearRotors=[];
 if(hybrid){
  const p=v.parts.motor;clearPart(v,p);v.rotating=[];
  housing(v,p,[2.9,.43,0],.76,.64);stator(v,p,[2.9,.43,0],.62,.565,.42,18);
  rotor(v,p,[2.9,.43,0],.62,.35);shaft(v,p,[2.9,.43,0],1.05);p.userData.modeledInternals=true;
 }else{
  for(const id of ['housing','stator','rotor','shaft','bearings'])clearPart(v,v.parts[id]);v.rotating=[];
  housing(v,v.parts.housing,[0,1.17,0],2.40,1.02);
  stator(v,v.parts.stator,[0,1.17,0],1.96,.90,.68);
  v.rotorGroup=rotor(v,v.parts.rotor,[0,1.17,0],1.87,.58);
  shaft(v,v.parts.shaft,[0,1.17,0],3.65);
  const p=v.parts.bearings;
  for(const x of [-1.29,1.29]){
   v.mesh(p,annulus(.32,.265,.14),C.alloy,[x,1.17,0]);v.mesh(p,annulus(.19,.135,.14),C.alloy,[x,1.17,0]);
   for(let a=0;a<TAU;a+=TAU/12)v.mesh(p,new THREE.SphereGeometry(.043,12,8),'#bcc8cc',[x,1.17+Math.sin(a)*.23,Math.cos(a)*.23]).userData.internal=true;
   for(const dx of [-.07,.07])v.mesh(p,annulus(.27,.19,.012),'#af8f53',[x+dx,1.17,0]).userData.internal=true;
  }
 }
 inverter(v,v.parts.inverter,hybrid);battery(v,v.parts.battery,hybrid);reducer(v,v.parts[hybrid?'transmission':'reducer'],hybrid);
 for(const m of v.meshes){if(m.userData.internal){m.material.roughness=.44;m.material.metalness=.45;}if(m.userData.shell){m.material.roughness=.67;m.material.metalness=.3;}}
 v.root.userData.modelRevision=hybrid?'technical-parallel-02':'technical-pmsm-02';
}
