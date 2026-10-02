import { build } from 'esbuild';
import { mkdir, copyFile, readFile, readdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/app.js'], bundle: true, minify: true, sourcemap: true, outfile: 'dist/app.js', target: ['es2022'] });
await Promise.all(['index.html', 'style.css', 'studio.css', 'favicon.svg'].map(f => copyFile(`src/${f}`, `dist/${f}`)));
const assets={};
await mkdir('dist/models',{recursive:true});
for(const file of await readdir('src/models')){
 await copyFile(`src/models/${file}`,`dist/models/${file}`);
 const binary=file.endsWith('.glb');
 assets['/models/'+file]={body:await readFile('src/models/'+file,binary?'base64':'utf8'),binary,type:binary?'model/gltf-binary':'text/html; charset=utf-8'};
}
for(const [file,type]of Object.entries({'index.html':'text/html; charset=utf-8','style.css':'text/css; charset=utf-8','studio.css':'text/css; charset=utf-8','favicon.svg':'image/svg+xml','app.js':'text/javascript; charset=utf-8'}))assets['/'+file]={body:await readFile('dist/'+file,'utf8'),type};
await build({stdin:{contents:`import {handleRequest} from './src/worker.js'; const assets=${JSON.stringify(assets)}; export default {fetch(request,env){return handleRequest(request,env,assets)}};`,resolveDir:process.cwd(),sourcefile:'worker-entry.js'},bundle:true,minify:true,format:'esm',platform:'browser',target:['es2022'],outfile:'dist/server/index.js'});
console.log('Laboratorio compilato in dist/');
