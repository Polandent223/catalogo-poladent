import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPublicSnapshot} from './create-public-snapshot.mjs';
import {validatePublicSnapshot,loadPublicSnapshot} from '../catalog-public-snapshot.js';

const fakeData={
 products:Array.from({length:255},(_,i)=>({
  id:'item_'+i,name:'Producto '+i,brand:'ADALTA',area_id:i%2?'endodoncia':'laboratorio',
  status:i%2?'available':'sold_out',
  image_url:'https://res.cloudinary.com/poladent/image/upload/ejemplo_'+i+'.webp',
  price_usd:i+1.5,description:'Descripción pública',sort_order:i
 })),
 profiles:[
  {id:'a',name:'ADALTA',logo_url:'https://res.cloudinary.com/poladent/image/upload/adalta.png',cover_url:'https://example.com/adalta-cover.webp'},
  {id:'b',name:'DENCO',logo_url:'https://res.cloudinary.com/poladent/image/upload/denco.png'},
  {id:'c',name:'IMODONTO',logo_url:'https://res.cloudinary.com/poladent/image/upload/imodonto.png'}
 ],
 contacts:[{label:'Valencia',phone:'584226710634'}],hasCatalogState:true,
 welcome:{enabled:true,image_url:'https://res.cloudinary.com/poladent/image/upload/welcome-pc.webp',
 mobile_image_url:'https://res.cloudinary.com/poladent/image/upload/welcome-mobile.webp'},
 storefront:{
  enabled:true,theme:'premium-compacta',
  banner_desktop_url:'https://res.cloudinary.com/poladent/image/upload/banner-pc.webp',
  banner_mobile_url:'https://res.cloudinary.com/poladent/image/upload/banner-movil.webp',
  banner_extra_slides:[{desktop_url:'https://res.cloudinary.com/poladent/image/upload/segundo.webp'}],
  locations:[{name:'Valencia',city:'Valencia',photo_url:'https://example.com/sede.webp'}],
  featured_brands:['ADALTA','DENCO','IMODONTO'],
  private_setting_canary:'public-settings-only'
 },
 pricingEnabled:true,customerPortalEnabled:false
};
const now=new Date('2026-10-27T20:00:00Z');
const copy=createPublicSnapshot(fakeData,now);
assert.equal(copy.schema,'poladent-public-snapshot-v1');
assert.equal(copy.products.length,255);
assert.equal(copy.profiles.length,3);
assert.equal(copy.contacts.length,1);
assert.equal(copy.storefront.locations[0].name,'Valencia');
assert.equal(copy.storefront.banner_mobile_url,fakeData.storefront.banner_mobile_url);
assert.equal(copy.welcome.image_url,fakeData.welcome.image_url);
assert.equal(copy.welcome.mobile_image_url,fakeData.welcome.mobile_image_url);
assert.equal(copy.welcome.enabled,true);
assert.equal(copy.storefront.banner_extra_slides.length,1);
assert.equal(copy.pricingEnabled,true);
assert.equal(copy.customerPortalEnabled,false);
assert.equal(copy.products[1].price_usd,2.5);
assert.equal(copy.products[1].area_id,'endodoncia','Categorías guardadas se conservan en GitHub.');
const fresh=validatePublicSnapshot(copy,Date.parse('2026-10-27T21:00:00Z'));
assert.equal(fresh.publicSnapshot,true);
assert.equal(fresh.emergencyFallback,false);
assert.equal(fresh.pricingEnabled,true);
assert.equal(fresh.products[0].status,'sold_out');
assert.equal(fresh.profiles[0].logo_url,fakeData.profiles[0].logo_url);
assert.equal(fresh.storefront.banner_desktop_url,fakeData.storefront.banner_desktop_url);
const stale=validatePublicSnapshot(copy,Date.parse('2026-10-28T03:00:00Z'));
assert.equal(stale.emergencyFallback,true);
assert.equal(stale.pricingEnabled,false);
assert.equal(stale.customerPortalEnabled,false);
assert.ok(stale.products.every(p=>p.emergency_fallback===true));
assert.ok(stale.products.every(p=>p.price_usd===null));
assert.equal(stale.storefront.banner_mobile_url,fakeData.storefront.banner_mobile_url,
 'Conservar presentación original incluso cuando precios ya no están vigentes.');
assert.throws(()=>createPublicSnapshot({...fakeData,products:[]},now));
assert.throws(()=>createPublicSnapshot({...fakeData,profiles:[]},now));
assert.throws(()=>createPublicSnapshot({...fakeData,storefront:{enabled:false}},now));
assert.throws(()=>createPublicSnapshot({...fakeData,storefront:{enabled:true}},now));
const noPricing=createPublicSnapshot({...fakeData,pricingEnabled:false},now);
assert.ok(noPricing.products.every(p=>p.price_usd===undefined),
 'Si el administrador no publica precios, el archivo no los expone.');
const result=await loadPublicSnapshot(async(url,opts)=>{
 assert.ok(url.endsWith('/catalog-public-snapshot.json'));
 assert.equal(opts.cache,'no-store');
 return {ok:true,json:async()=>copy};
},'https://polandent223.github.io/catalogo-poladent/');
assert.equal(result.products.length,255);
await assert.rejects(()=>loadPublicSnapshot(async()=>({ok:false,status:404})));
const index=readFileSync('public-catalog.js','utf8');
const quote=readFileSync('solicitud.js','utf8');
const welcomeJS=readFileSync('welcome.js','utf8');
assert.ok(welcomeJS.includes("catalog-welcome-snapshot.json"),'Portada original conserva imagen y regla de reemplazo.');
assert.ok(welcomeJS.includes('const fromSnapshot=await readSavedWelcome()'),'Bienvenida sin consultas Firestore por visita.');
assert.ok(index.includes('data=await loadPublicSnapshot();'));
assert.ok(index.includes('data=await loadPublicCatalog(cfg);'),
 'Conservar Firestore directo cuando falta copia estática.');
assert.ok(index.includes('restoreLocallyVerifiedCatalog()||await loadEmergencyCatalog()'),
 'Conservar contingencia si fallan snapshot y Firestore.');
assert.ok(index.includes('storefrontSettings=data.storefront'),
 'Recuperar banners, marcas y sedes del diseño original.');
assert.ok(quote.includes('data=await loadPublicSnapshot()'),
 'Los vendedores no deben agotar cuota por consultar un resumen.');
assert.ok(!readFileSync('firestore.rules','utf8').includes('catalogSnapshots'));
console.log('POLADENT: copia original, límites y reversión probados offline; sin cambios en Firebase.');
