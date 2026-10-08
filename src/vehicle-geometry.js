import * as THREE from 'three';

// Bake imported transforms without losing winding on mirrored glTF nodes.
export function bakeGeometry(input,matrix){
 const geometry=input.clone();
 for(const name of ['position','normal','tangent']){
  const attr=geometry.getAttribute(name);if(!attr)continue;
  const values=new Float32Array(attr.count*attr.itemSize);
  for(let i=0;i<attr.count;i++)for(let k=0;k<attr.itemSize;k++)values[i*attr.itemSize+k]=attr.getComponent(i,k);
  geometry.setAttribute(name,new THREE.BufferAttribute(values,attr.itemSize));
 }
 geometry.applyMatrix4(matrix);
 if(matrix.determinant()<0){
  if(!geometry.index)geometry.setIndex(Array.from({length:geometry.attributes.position.count},(_,i)=>i));
  const idx=geometry.index;
  for(let i=0;i<idx.count;i+=3){const b=idx.getX(i+1);idx.setX(i+1,idx.getX(i+2));idx.setX(i+2,b);}
  const tangent=geometry.attributes.tangent;if(tangent)for(let i=0;i<tangent.count;i++)tangent.setW(i,-tangent.getW(i));
 }
 geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

export function wheelPose(angle){return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),angle);}
