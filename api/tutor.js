import {handleRequest} from '../src/worker.js';
export default async function handler(req,res){
 const host=req.headers.host,proto=req.headers['x-forwarded-proto']||'https';
 const request=new Request(`${proto}://${host}${req.url}`,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:JSON.stringify(req.body)}:{})});
 const response=await handleRequest(request,process.env);res.statusCode=response.status;for(const [k,v]of response.headers)res.setHeader(k,v);res.end(await response.text());
}
