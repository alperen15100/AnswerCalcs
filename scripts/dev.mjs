import http from 'node:http';
import worker from '../src/index.js';
const port=8787;
http.createServer(async(req,res)=>{const url=`http://localhost:${port}${req.url}`;const r=await worker.fetch(new Request(url,{method:req.method}));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));}).listen(port,()=>console.log(`AnswerCalcs dev server: http://localhost:${port}`));
