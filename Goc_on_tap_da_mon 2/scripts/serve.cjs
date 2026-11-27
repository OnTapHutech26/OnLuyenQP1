#!/usr/bin/env node
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {generateCatalog}=require('./build.cjs');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT)||8816;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((request,response)=>{
  try{
    let pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
    if(pathname==='/')pathname='/index.html';
    if(pathname==='/banks/catalog.json')generateCatalog(root);
    const file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root+path.sep)||pathname.split('/').some(x=>x.startsWith('.'))||!fs.statSync(file).isFile())throw Error('Not found');
    response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(response);
  }catch(error){response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});response.end(error.message);}
});
server.listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port+'/'));
