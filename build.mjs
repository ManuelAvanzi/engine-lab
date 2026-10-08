import { build } from 'esbuild';
import { mkdir, copyFile, readFile, readdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/app.js'], bundle: true, minify: true, sourcemap: true, outfile: 'dist/app.js', target: ['es2022'] });
await build({ entryPoints: ['src/account.js'],format:'esm', bundle:true,minify:true,outfile:'dist/account.js',target:['es2022'] });
await build({ entryPoints: ['src/landing.js'], bundle: true, minify: true, outfile: 'dist/landing.js', target: ['es2022'] });
await build({entryPoints:['src/sources.js'],bundle:true,minify:true,outfile:'dist/sources.js',target:['es2022']});
await Promise.all(['fonti.html','sources.css','account.html','account.css','index.html', 'lab.html', 'landing.css', 'style.css', 'studio.css', 'favicon.svg'].map(f => copyFile(`src/${f}`, `dist/${f}`)));
await copyFile('src/carrarolab.png','dist/carrarolab.png');
const assets={'/carrarolab.png':{body:await readFile('src/carrarolab.png','base64'),binary:true,type:'image/png'}};
for(const folder of ['fonts','marketing']){
 await mkdir(`dist/${folder}`,{recursive:true});
 for(const file of await readdir(`src/${folder}`)){
  const type=file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':file.endsWith('.woff2')?'font/woff2':file.endsWith('.css')?'text/css; charset=utf-8':null;
  if(!type)continue;
  const binary=!file.endsWith('.css');
  await copyFile(`src/${folder}/${file}`,`dist/${folder}/${file}`);
  assets[`/${folder}/${file}`]={body:await readFile(`src/${folder}/${file}`,binary?'base64':'utf8'),binary,type};
 }
}
await mkdir('dist/models',{recursive:true});
for(const file of await readdir('src/models')){
 await copyFile(`src/models/${file}`,`dist/models/${file}`);
 const binary=file.endsWith('.glb');
 assets['/models/'+file]={body:await readFile('src/models/'+file,binary?'base64':'utf8'),binary,type:binary?'model/gltf-binary':'text/html; charset=utf-8'};
}
for(const [file,type]of Object.entries({'fonti.html':'text/html; charset=utf-8','sources.css':'text/css; charset=utf-8','sources.js':'text/javascript; charset=utf-8','account.html':'text/html; charset=utf-8','account.js':'text/javascript; charset=utf-8','account.css':'text/css; charset=utf-8','index.html':'text/html; charset=utf-8','lab.html':'text/html; charset=utf-8','landing.css':'text/css; charset=utf-8','landing.js':'text/javascript; charset=utf-8','style.css':'text/css; charset=utf-8','studio.css':'text/css; charset=utf-8','favicon.svg':'image/svg+xml','app.js':'text/javascript; charset=utf-8'}))assets['/'+file]={body:await readFile('dist/'+file,'utf8'),type};
if(!process.env.VERCEL)await build({stdin:{contents:`import {handleRequest} from './src/worker.js'; const assets=${JSON.stringify(assets)}; export default {fetch(request,env){return handleRequest(request,env,assets)}};`,resolveDir:process.cwd(),sourcefile:'worker-entry.js'},bundle:true,minify:true,format:'esm',platform:'browser',target:['es2022'],outfile:'dist/server/index.js'});
console.log('Laboratorio compilato in dist/');
