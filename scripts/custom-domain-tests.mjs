import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../cloudinary-upload-worker.js';
import {productPage} from './generate-product-share.mjs';
import {shouldSkipWelcome,catalogEnteredURL} from '../welcome-routing.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const site='https://catalogopoladent.com/';
assert.equal(read('CNAME').trim(),'catalogopoladent.com');
const html=read('index.html');
assert.ok(html.includes('<link rel="canonical" href="'+site+'">'));
assert.ok(html.includes('<meta property="og:url" content="'+site+'">'));
assert.ok(!html.includes('https://polandent223.github.io/catalogo-poladent/'));
assert.ok(read('sitemap.xml').includes('<loc>'+site+'</loc>'));
assert.ok(read('robots.txt').includes('Sitemap: '+site+'sitemap.xml'));
assert.ok(read('scripts/generate-product-share.mjs').includes("const site='"+site+"'"));
const product={id:'rodio_1',name:'Espejo de Rodio',brand:'ADALTA',status:'available',
 image_url:'https://res.cloudinary.com/demo/image/upload/v123/rodio.webp',description:'Espejo'};
const share=productPage(product);
assert.ok(share.includes(site+'share/rodio_1/'));
assert.ok(share.includes(site+'?marca=ADALTA#producto=rodio_1'));
const old='https://polandent223.github.io/catalogo-poladent/';
assert.equal(shouldSkipWelcome(old+'?marca=ADALTA'),true,'Conservar QR y enlaces históricos');
assert.equal(shouldSkipWelcome(site+'?marca=ADALTA'),true);
assert.equal(catalogEnteredURL(site),site+'?catalogo=1');
const allowed=[old.slice(0,-'/catalogo-poladent/'.length),'https://catalogopoladent.com','https://www.catalogopoladent.com'];
for(const origin of allowed){
 const res=await worker.fetch(new Request('https://worker.example/sign',{method:'OPTIONS',
  headers:{Origin:origin,'Access-Control-Request-Method':'POST'}}),{});
 assert.equal(res.status,204,'CORS preflight permitido '+origin);
 assert.equal(res.headers.get('Access-Control-Allow-Origin'),origin);
 assert.equal(res.headers.get('Vary'),'Origin');
 const auth=await worker.fetch(new Request('https://worker.example/sign',{method:'POST',
  headers:{Origin:origin}}),{});
 assert.equal(auth.status,503,'Sin secretos o sesión, no hay firma '+origin);
}
for(const origin of ['https://evil.example','http://catalogopoladent.com','https://catalogopoladent.com.evil.example']){
 const res=await worker.fetch(new Request('https://worker.example/sign',{method:'OPTIONS',headers:{Origin:origin}}),{});
 assert.equal(res.status,403,'Rechazar origen desconocido '+origin);
 assert.equal(res.headers.get('Access-Control-Allow-Origin'),null);
}
console.log('POLADENT: dominio preparado, enlaces públicos, QR histórico y CORS protegido.');
