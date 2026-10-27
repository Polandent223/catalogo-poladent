import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {parsePublicPage,generateStaticCatalog} from './build-static-catalog.mjs';
const example='<!doctype html><meta property="og:title" content="Espejos de Rodio | ADALTA | POLADENT Casa Dental">'+
'<meta name="description" content="Instrumental &amp; laboratorio">'+
'<img src="https://res.cloudinary.com/demo/image/upload/v1/img.webp" alt="Espejo">';
const result=parsePublicPage('x123',example);
assert.equal(result.name,'Espejos de Rodio');
assert.equal(result.brand,'ADALTA');
assert.equal(result.description,'Instrumental & laboratorio');
assert.equal(result.emergency_fallback,true);
assert.equal(result.price_usd,undefined,'El respaldo no debe inventar precio USD.');
assert.throws(()=>parsePublicPage('../admin',example));
assert.throws(()=>parsePublicPage('id',example.replace('https://res.cloudinary.com/demo','http://evil.com')));
await generateStaticCatalog();
const backup=JSON.parse(await readFile('catalog-emergency-backup.json','utf8'));
const manifest=JSON.parse(await readFile('share/manifest.json','utf8'));
assert.equal(backup.products.length,manifest.ids.length,'El respaldo debe incluir las mismas fichas históricamente publicadas.');
assert.ok(backup.products.length>=200,'Nunca usar un respaldo inesperadamente incompleto.');
assert.ok(backup.products.every(p=>p.emergency_fallback&&p.status==='available'&&!('price_usd' in p)));
assert.ok(backup.products.every(p=>p.image_url.startsWith('https://res.cloudinary.com/')));
assert.equal(new Set(backup.products.map(p=>p.id)).size,backup.products.length);
assert.ok((await stat('catalog-emergency-backup.json')).size>30000);
console.log('Respaldo offline validado:',backup.products.length,'fichas, sin precios ni datos privados.');
