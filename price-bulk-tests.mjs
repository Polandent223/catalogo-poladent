import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adjustedPriceUSD,previewPercentPrices,previewCSVPrices} from './price-bulk.js';
import {formatBcvRate} from './catalog-pricing.js';
const read=n=>readFileSync(new URL('./'+n,import.meta.url),'utf8');
const products=[
 {id:'p1',name:'Espejo de Rodio',brand:'ADALTA',source_key:'AD-10',status:'available',price_usd:1.8},
 {id:'p2',name:'Limas endodónticas',brand:'DENCO',source_key:'DE-20',status:'hidden',price_usd:23},
 {id:'p3',name:'Cemento',brand:'ADALTA',source_key:'AD-30',status:'sold_out',price_usd:34},
 {id:'p4',name:'Sin precio',brand:'ADALTA',source_key:'AD-40',status:'available',price_usd:null}
];
assert.equal(adjustedPriceUSD(20,10,'increase'),22);
assert.equal(adjustedPriceUSD(20,10,'decrease'),18);
assert.equal(adjustedPriceUSD(1.8,10,'increase'),1.98);
assert.equal(adjustedPriceUSD(1.8,10,'decrease'),1.62);
assert.throws(()=>adjustedPriceUSD(20,0,'increase'));
assert.throws(()=>adjustedPriceUSD(null,10,'increase'));
assert.throws(()=>adjustedPriceUSD(0.01,99,'decrease'));
const all=previewPercentPrices(products,10,'increase');
assert.equal(all.rows.length,3);
assert.equal(all.unpriced,1);
assert.deepEqual(all.rows.map(p=>p.after),[1.98,25.3,37.4]);
assert.equal(products[0].price_usd,1.8,'Previsualizar no modifica productos');
const only=previewPercentPrices(products,10,'decrease',{brand:'ADALTA',status:'available'});
assert.equal(only.rows.length,1);
assert.equal(only.rows[0].after,1.62);
const imported=previewCSVPrices('source_key,precio_usd\nAD-10,3.15\nDE-20,25\nNO-EXISTE,100\n',products);
assert.equal(imported.rows.length,2);
assert.equal(imported.warnings.length,1);
assert.equal(imported.rows[0].id,'p1');
assert.equal(imported.rows[0].after,3.15);
assert.equal(imported.rows[1].id,'p2');
assert.equal(imported.rows[1].after,25);
const direct=previewCSVPrices('id;price_usd\np3;36.80\n',products);
assert.equal(direct.rows.length,1);
assert.equal(direct.rows[0].id,'p3');
assert.equal(previewCSVPrices('source_key,precio_usd\nAD-10,1.80\n',products).rows.length,0);
const duplicates=previewCSVPrices('source_key,price_usd\nAD-10,4\nAD-10,5\n',
 [...products,{id:'p5',source_key:'AD-10',name:'Otro',brand:'ADALTA'}]);
assert.equal(duplicates.rows.length,0);
assert.ok(duplicates.warnings.length>=1,'No asignar precio a SKU ambiguo');
const large=Array.from({length:2246},(_,i)=>({id:'p'+i,name:'Producto '+i,brand:'P',
 status:'available',price_usd:10}));
assert.equal(previewPercentPrices(large,5,'increase').rows.length,2246,'Solo calcula, no importa productos');
assert.equal(formatBcvRate(887.302),'887,302');
assert.equal(formatBcvRate(887.3),'887,30');
const backend=read('firebase-client.js');
assert.ok(backend.includes('export async function applyBulkPriceChanges'));
assert.ok(backend.includes('price_batch:operationId'));
assert.ok(backend.includes("kind:'price_adjustment'"));
assert.ok(backend.includes('export async function undoBulkPriceOperation'));
assert.ok(backend.includes('p.kind !== \'price_adjustment\''));
assert.ok(backend.includes('if(previous!==expected)'));
assert.ok(backend.includes('for(let index=0;index<changes.length;index+=100)'));
assert.ok(!read('firestore.rules').includes('catalogOrders'),'Sin cambiar reglas públicas');
const admin=read('pricing-admin.js');
const html=read('precios.html');
for(const id of ['bulk-method','bulk-direction','bulk-percent','bulk-csv-file','bulk-preview','bulk-apply','bulk-history-list'])
 assert.ok(html.includes('id="'+id+'"'));
assert.ok(admin.includes('confirm(\'¿Confirmas que deseas actualizar'));
assert.ok(admin.includes('cancelBulkPreview'));
assert.ok(read('public-catalog.js').includes("name:$('#cart-name').value"));
assert.ok(read('public-catalog.js').includes("window.addEventListener('pageshow'"));
assert.ok(read('solicitud.js').includes('Referencia temporal'));
assert.ok(read('solicitud.html').includes('id="summary-created"'));
console.log('POLADENT: ajustes masivos, CSV por código, reversión y mejoras de solicitud validados.');
