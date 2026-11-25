import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildSEOCollections,writeSEOCollections,SITE} from './generate-seo-collections.mjs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const snapshot=JSON.parse(read('catalog-public-snapshot.json'));
const built=buildSEOCollections(snapshot);
const paths=[...built.pages.keys()];
const byType={categories:paths.filter(s=>s.includes('/categorias/')),
 brands:paths.filter(s=>s.includes('/marcas/'))};
assert.equal(SITE,'https://catalogopoladent.com/');
assert.ok(byType.categories.length>=6,'Se necesitan seis categorías reales.');
assert.ok(byType.brands.length>=9,'Se necesitan marcas con inventario real.');
assert.ok(built.urls.includes(SITE));
assert.ok(built.urls.includes(SITE+'adalta.html'));
for(const path of paths){
 const content=built.pages.get(path),url=SITE+path.replace(/index\.html$/,'');
 assert.ok(content.includes('<link rel="canonical" href="'+url+'">'),path);
 assert.ok(content.includes('content="index,follow,max-image-preview:large"'),path);
 assert.ok(content.includes('href="'+SITE+'"'),path);
 assert.ok(content.includes('WhatsApp Valencia'),path);
 assert.ok(content.includes('WhatsApp Maracay'),path);
 assert.ok(content.includes('Ver ficha y consultar'),path);
 assert.ok(content.includes('loading="lazy"'),path);
 assert.ok(content.includes('"@type":"BreadcrumbList"'),path);
 assert.ok(!content.includes('price_usd'),path);
 assert.ok(!content.includes('US$'),path);
 assert.ok(!content.includes('Bs. '),path);
 assert.ok(!content.includes('CLOUDINARY_API_SECRET'),path);
 assert.ok(built.sitemap.includes('<loc>'+url+'</loc>'),path);
}
assert.ok(built.sitemap.includes('<loc>'+SITE+'colecciones/categorias/instrumental/</loc>'));
assert.ok(built.sitemap.includes('<loc>'+SITE+'colecciones/marcas/adalta/</loc>'));
assert.ok(!built.sitemap.includes('/share/'),'Las vistas de WhatsApp siguen noindex.');
assert.ok(!built.sitemap.includes('precios.html'),'La administración nunca debe figurar en sitemap.');
const modified=structuredClone(snapshot);
const target=modified.products.find(p=>p.area_id==='instrumental');
assert.ok(target);
target.name='<img src=x onerror=alert(1)>';
target.description='<script>alert("xxx")</script>';
const escaped=buildSEOCollections(modified).pages.get('colecciones/categorias/instrumental/index.html');
assert.ok(escaped.includes('&lt;img src=x onerror=alert(1)&gt;'));
assert.ok(escaped.includes('&lt;script&gt;'));
assert.ok(!escaped.includes('<script>alert('));
assert.throws(()=>buildSEOCollections({...snapshot,products:[]}),/copia pública completa/);
assert.throws(()=>buildSEOCollections({...snapshot,profiles:[]}),/copia pública completa/);
assert.throws(()=>buildSEOCollections({...snapshot,storefront:{enabled:false}}),/copia pública completa/);
const root=await mkdtemp(join(tmpdir(),'poladent-seo-'));
try{
 const outcome=await writeSEOCollections(root,snapshot);
 assert.equal(outcome.pages.size,paths.length);
 const file=await readFile(join(root,'colecciones/categorias/instrumental/index.html'),'utf8');
 assert.ok(file.includes('Instrumental odontológico'));
 const sitemap=await readFile(join(root,'sitemap.xml'),'utf8');
 assert.equal(sitemap,built.sitemap);
}finally{await rm(root,{recursive:true,force:true});}
const home=read('index.html');
assert.ok(home.includes('colecciones/categorias/instrumental/'));
assert.ok(home.includes('colecciones/marcas/adalta/'));
const preview=read('scripts/generate-product-share.mjs');
assert.ok(preview.includes('content="noindex,follow"'),
 'No transformar vistas de WhatsApp en fichas indexables sin control.');
console.log('POLADENT SEO: '+paths.length+' colecciones reales, sitemap, indexación, enlaces de cotización y seguridad correctos.');
