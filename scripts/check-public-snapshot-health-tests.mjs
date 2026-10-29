import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPublicSnapshot} from './create-public-snapshot.mjs';
import {inspectPublicSnapshotHealth,ALERT_AGE_MS} from './check-public-snapshot-health.mjs';
assert.equal(ALERT_AGE_MS,9*60*60*1000);
const now=new Date('2026-10-28T12:00:00.000Z');
const base={
 products:Array.from({length:255},(_,i)=>({
   id:'p'+i,name:'Producto '+i,brand:'ADALTA',status:'available',
   image_url:'https://res.cloudinary.com/poladent/image/upload/p'+i+'.webp',
   ...(i===0?{price_usd:1.77}:{})
 })),
 profiles:['ADALTA','DENCO','ICE'].map(name=>({
   id:name,name,logo_url:'https://res.cloudinary.com/poladent/image/upload/'+name+'.webp'
 })),
 contacts:[{label:'Valencia',phone:'584226710634'}],hasCatalogState:true,
 storefront:{enabled:true,theme:'premium-compacta',
   banner_desktop_url:'https://res.cloudinary.com/poladent/image/upload/banner.webp'},
 pricingEnabled:true,customerPortalEnabled:false
};
const fresh=createPublicSnapshot(base,now);
assert.equal(inspectPublicSnapshotHealth(fresh,now.getTime()).pricedProducts,1);
assert.equal(inspectPublicSnapshotHealth(fresh,now.getTime()+ALERT_AGE_MS-1).pricedProducts,1);
assert.throws(()=>inspectPublicSnapshotHealth(fresh,now.getTime()+ALERT_AGE_MS),/sincronización/i);
assert.throws(()=>inspectPublicSnapshotHealth(createPublicSnapshot({
 ...base,products:base.products.map(p=>({...p,price_usd:null}))
},now),now.getTime()),/ningún USD/);
const off=createPublicSnapshot({...base,pricingEnabled:false},now);
assert.equal(inspectPublicSnapshotHealth(off,now.getTime()+ALERT_AGE_MS).pricingEnabled,false);
const wf=readFileSync('.github/workflows/product-previews.yml','utf8');
assert.ok(wf.includes('node scripts/check-public-snapshot-health.mjs'));
assert.ok(wf.includes('node scripts/sync-public-catalog.mjs'));
assert.ok(!wf.includes('firebase deploy'),'El catálogo no debe desplegar reglas de Firebase.');
const catalog=readFileSync('public-catalog.js','utf8');
assert.ok(catalog.includes('cartWhatsAppURL(')&&catalog.includes('whatsappInquiryURL('));
const sync=readFileSync('scripts/sync-public-catalog.mjs','utf8');
assert.ok(sync.includes('REFRESH_INTERVAL_MS=60*60*1000'));
console.log('POLADENT: alerta de frescura, guardia de precios, consultas y sin cambios privados OK');
