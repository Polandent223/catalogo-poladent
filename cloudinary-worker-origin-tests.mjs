import assert from 'node:assert/strict';
import worker from './cloudinary-upload-worker.js';
const url='https://poladent-imagenes.example.workers.dev/sign';
const origins=['https://polandent223.github.io','https://catalogopoladent.com','https://www.catalogopoladent.com'];
for(const origin of origins){
 const request=new Request(url,{method:'OPTIONS',headers:{Origin:origin}});
 const response=await worker.fetch(request,{});
 assert.equal(response.status,204);
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
 assert.equal(response.headers.get('Vary'),'Origin');
 const requestNoAuth=new Request(url,{method:'POST',headers:{Origin:origin}});
 const blocked=await worker.fetch(requestNoAuth,{});
 assert.equal(blocked.status,503);
 assert.equal(blocked.headers.get('Access-Control-Allow-Origin'),origin);
}
for(const origin of ['https://evil.tld','http://catalogopoladent.com','https://catalogopoladent.com.evil.tld']){
 const request=new Request(url,{method:'OPTIONS',headers:{Origin:origin}});
 const response=await worker.fetch(request,{});
 assert.equal(response.status,403);
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
}
console.log('POLADENT: CORS Cloudinary permite origen anterior y dominio nuevo sin aceptar externos.');
