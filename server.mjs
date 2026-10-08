import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {handleRequest} from './src/worker.js';
const root = path.resolve('dist');
const types = { '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.map': 'application/json' };
http.createServer(async (req, res) => {
  try {
    if(req.url.startsWith('/api/')){
      const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>12000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
      const request=new Request(`http://127.0.0.1:4173${req.url}`,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
      const response=await handleRequest(request,process.env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : ['/lab','/lab/'].includes(pathname) ? '/lab.html' : ['/account','/account/'].includes(pathname)?'/account.html':pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(data);
  } catch { res.writeHead(404); res.end('Risorsa non trovata'); }
}).listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));
