import * as THREE from 'three';
import {components} from './data.js';

// Capture the component's reference centre once. Child meshes may reciprocate or
// rotate; labels follow only the containing assembly, camera and exploded layout.
export function createAnnotationAnchor(part){
 part.updateWorldMatrix(true,true);
 const center=new THREE.Box3().setFromObject(part).getCenter(new THREE.Vector3());
 return part.worldToLocal(center);
}

const layouts={
 ice:{block:[-1.8,0,0],cover:[0,3.4,0],head:[0,2.2,0],pistons:[0,.9,1.8],rods:[0,.3,2.5],crank:[0,0,3.4],sump:[0,0,-2.4],intake:[0,0,-2.6],exhaust:[0,0,2.8],timing:[-2,0,0]},
 ev:{housing:[-2.6,0,0],stator:[0,0,-2.6],rotor:[0,1.4,0],shaft:[3,0,0],bearings:[-2,0,1.8],inverter:[0,2.2,0],battery:[0,0,-3],reducer:[3,0,1.2]}
};

export class Presentation {
 constructor(viewer){
  this.v=viewer;this.items=[];this.focused=false;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.overlay=document.createElement('div');this.overlay.className='part-annotations';this.overlay.setAttribute('aria-hidden','true');viewer.host.parentElement.append(this.overlay);
  viewer.controls.addEventListener('start',()=>this.cancel());
 }
 cancel(){this.tween=null;this.v.controls.enableDamping=true;}
 move(position,target){
  const v=this.v;if(v.xrSession)return;
  this.cancel();
  if(this.reduced){v.camera.position.copy(position);v.controls.target.copy(target);v.controls.update();return;}
  this.tween={position,target,from:v.camera.position.clone(),look:v.controls.target.clone(),elapsed:0};v.controls.enableDamping=false;
 }
 setFocused(value){this.focused=value;this.v.host.dataset.framing=value?'component':'overview';this.v.car.traverse(o=>{const m=o.material;if(!m?.userData.role)return;const role=m.userData.role;if(role==='body'||role==='glass')m.opacity=m.userData.overviewOpacity*(value?.32:1);else if(role==='wheel'||role==='tire')o.visible=true;});this.v.paint();}
 focus(){
  const v=this.v,p=v.parts[v.selected];if(!p||v.xrSession)return;
  v.root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(p);if(bounds.isEmpty())return;
  const offset=p.userData.offset.clone().multiplyScalar(v.targetExplosion).add(p.userData.origin||new THREE.Vector3()).add(p.userData.manualOffset);
  if(p.userData.detached)offset.addScaledVector(p.userData.offset.clone().normalize(),2.7);
  bounds.translate(offset.sub(p.position).multiply(v.root.scale));
  this.setFocused(true);this.frame(bounds,1.45);
 }
 frame(bounds,padding=1.25){
  const v=this.v,target=bounds.getCenter(new THREE.Vector3()),fov=THREE.MathUtils.degToRad(v.camera.fov);
  const direction=v.camera.position.clone().sub(v.controls.target).normalize();if(!direction.lengthSq())direction.set(1,.6,1).normalize();
  const right=new THREE.Vector3().crossVectors(v.camera.up,direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize();
  const tanV=Math.tan(fov/2),tanH=tanV*v.camera.aspect;
  const panel=v.host.parentElement.querySelector('.viewer-technical-card'),rect=panel?.getBoundingClientRect(),hostRect=v.host.getBoundingClientRect();
  const sceneWidth=v.sceneWidth||hostRect.width;
  const occluded=panel&&!panel.hidden&&rect.width?Math.max(0,Math.min(sceneWidth*.48,hostRect.right-rect.left+20)):0;
  const usableH=Math.max(.55,(hostRect.height-215)/hostRect.height),usableW=1-occluded/sceneWidth;
  let distance=1.1;
  // Fit the projected box, rather than its enclosing sphere, so long engines
  // do not become unnecessarily small on wide screens.
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
   const delta=new THREE.Vector3(x,y,z).sub(target),depth=delta.dot(direction);
   distance=Math.max(distance,Math.abs(delta.dot(right))/(tanH*usableW)+depth,Math.abs(delta.dot(up))/(tanV*usableH)+depth);
  }
  distance*=padding;target.addScaledVector(right,distance*tanH*(occluded/sceneWidth));
  this.move(target.clone().addScaledVector(direction,distance),target);
 }
 frameExplosion(){
  const v=this.v;v.root.updateMatrixWorld(true);const all=new THREE.Box3();
  for(const part of Object.values(v.parts)){
   const box=new THREE.Box3().setFromObject(part),delta=part.userData.offset.clone().multiplyScalar(v.targetExplosion).add(part.userData.origin||new THREE.Vector3()).add(part.userData.manualOffset);
   if(part.userData.detached)delta.addScaledVector(part.userData.offset.clone().normalize(),2.7);
   delta.sub(part.position).multiply(v.root.scale);
   box.translate(delta);all.union(box);
  }
  if(!all.isEmpty()){this.setFocused(true);this.frame(all,1.2);}
 }
 rebuild(){
  this.cancel();for(const item of this.items){item.line.geometry.dispose();item.line.material.dispose();this.v.scene.remove(item.line);}this.items=[];this.overlay.replaceChildren();
  const v=this.v,layout=v.type==='ev'?layouts.ev:{...layouts.ice,...(v.type==='hybrid'?{motor:[2.8,0,0],transmission:[4,0,0],battery:[0,0,-2.6],inverter:[1.8,2.2,0]}:{})};
  for(const [id,p]of Object.entries(v.parts)){
   if(layout[id])p.userData.offset.set(...layout[id]);
   const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineDashedMaterial({color:0x7294a6,dashSize:.09,gapSize:.07,transparent:true,opacity:.5,depthWrite:false}));line.visible=false;v.scene.add(line);
   const label=document.createElement('div');label.className='part-annotation';label.textContent=components[id].name;label.hidden=true;this.overlay.append(label);
   this.items.push({id,line,label,anchor:createAnnotationAnchor(p)});
  }
 }
 update(dt){
  const v=this.v;
  if(this.tween&&!v.xrSession){const t=this.tween;t.elapsed+=dt;const a=Math.min(1,t.elapsed/.7),e=1-Math.pow(1-a,3);v.camera.position.lerpVectors(t.from,t.position,e);v.controls.target.lerpVectors(t.look,t.target,e);if(a===1)this.cancel();}
  v.controls.update();v.root.updateMatrixWorld(true);v.camera.updateMatrixWorld(true);
  const width=v.host.clientWidth,height=v.host.clientHeight,occupied=[];
  const ordered=[...this.items].sort((a,b)=>Number(b.id===v.selected)-Number(a.id===v.selected));
  let count=0;
  for(const item of ordered){
   const part=v.parts[item.id];item.label.hidden=true;item.line.visible=false;if(!part?.visible||v.xrSession)continue;
   const delta=part.position.clone().sub(part.userData.origin||new THREE.Vector3()).multiply(v.root.scale);
   const displaced=delta.length()>.12;
   if(!displaced&&!(this.focused&&item.id===v.selected))continue;
   const center=part.localToWorld(item.anchor.clone()),rest=center.clone().sub(delta);
   if(displaced){const attr=item.line.geometry.attributes.position;attr.setXYZ(0,rest.x,rest.y,rest.z);attr.setXYZ(1,center.x,center.y,center.z);attr.needsUpdate=true;item.line.computeLineDistances();item.line.geometry.computeBoundingSphere();item.line.visible=true;}
   if(count>=3||(!displaced&&!(this.focused&&item.id===v.selected)))continue;
   const point=center.clone().project(v.camera);if(point.z< -1||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1)continue;
   const x=(point.x*.5+.5)*width,y=(-point.y*.5+.5)*height;
   const w=Math.min(175,width*.4),h=28;
   for(const [dx,dy]of [[24,-38],[-w-24,-38],[24,16],[-w-24,16]]){
    const left=Math.max(width-(v.sceneWidth||width)+16,Math.min(width-w-18,x+dx)),top=Math.max(185,Math.min(height-165,y+dy));
    if(occupied.some(r=>left<r.x+w+8&&left+w+8>r.x&&top<r.y+h+8&&top+h+8>r.y))continue;
    item.label.hidden=false;item.label.style.left=`${left}px`;item.label.style.top=`${top}px`;item.label.classList.toggle('selected',item.id===v.selected);occupied.push({x:left,y:top});count++;break;
   }
  }
 }
}
