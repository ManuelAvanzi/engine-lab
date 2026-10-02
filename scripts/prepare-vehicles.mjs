import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune, dedup, meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder, MeshoptDecoder} from 'meshoptimizer';
import {mkdir, stat} from 'node:fs/promises';
await MeshoptEncoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
await mkdir('src/models',{recursive:true});
for(const name of ['tesla','concept']){
 const doc=await io.read(`assets/${name}-source.glb`);
 // X-ray materials are authored at runtime. Keep tire normal maps, remove
 // paint/reflection textures and obsolete variants to reduce tablet downloads.
 for(const mat of doc.getRoot().listMaterials()){
  mat.setBaseColorTexture(null).setMetallicRoughnessTexture(null).setEmissiveTexture(null).setOcclusionTexture(null);
  if(!/tire/i.test(mat.getName()))mat.setNormalTexture(null);
  for(const ext of mat.listExtensions())mat.setExtension(ext.extensionName,null);
 }
 for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())for(const ext of p.listExtensions())p.setExtension(ext.extensionName,null);
 await doc.transform(prune(),dedup(),meshopt({encoder:MeshoptEncoder,level:'medium'}));
 await io.write(`src/models/${name}.glb`,doc);
 console.log(name,(await stat(`src/models/${name}.glb`)).size);
}
