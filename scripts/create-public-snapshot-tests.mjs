import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPublicSnapshot} from './create-public-snapshot.mjs';
import {validatePublicSnapshot,loadPublicSnapshot,PRICE_WARNING_AGE_MS,STOCK_MAX_AGE_MS} from '../catalog-public-snapshot.js';
assert.equal(PRICE_WARNING_AGE_MS,4*60*60*1000);
assert.equal(STOCK_MAX_AGE_MS,12*60*60*1000);

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
 contacts:[{label:'Valencia',phone:'584226710634'}],
 instagramProfiles:[{label:'Instagram Valencia',url:'https://www.instagram.com/poladent_valencia/',enabled:true},
  {label:'Instagram Maracay',url:'https://www.instagram.com/poladent_maracay/',enabled:false}],
 hasCatalogState:true,
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
assert.equal(copy.instagramProfiles.length,2);
assert.equal(copy.instagramProfiles[1].enabled,false);
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
assert.equal(fresh.snapshotPriceWarning,false);
assert.equal(fresh.products[0].status,'sold_out');
assert.equal(fresh.profiles[0].logo_url,fakeData.profiles[0].logo_url);
assert.equal(fresh.instagramProfiles[0].label,'Instagram Valencia');
assert.equal(fresh.storefront.banner_desktop_url,fakeData.storefront.banner_desktop_url);
const delayed=validatePublicSnapshot(copy,Date.parse('2026-10-28T03:00:00Z'));
assert.equal(delayed.emergencyFallback,false,'Retraso de siete horas no debe borrar precios publicados.');
assert.equal(delayed.pricingEnabled,true);
assert.equal(delayed.snapshotPriceWarning,true);
assert.equal(delayed.products[1].price_usd,2.5);
const stale=validatePublicSnapshot(copy,Date.parse('2026-10-28T09:00:00Z'));
assert.equal(stale.emergencyFallback,true);
assert.equal(stale.pricingEnabled,true,'Precios USD visibles pero referenciales tras 13 horas.');
assert.equal(stale.snapshotPriceWarning,true);
assert.equal(stale.customerPortalEnabled,false);
assert.ok(stale.products.every(p=>p.emergency_fallback===true));
assert.equal(stale.products[1].price_usd,2.5,'No eliminar USD por retrasos de GitHub.');
assert.ok(stale.products.every(p=>p.status==='available'),'No prometer inventario con copia antigua.');
const veryOld=validatePublicSnapshot(copy,Date.parse('2026-11-05T09:00:00Z'));
assert.equal(veryOld.pricingEnabled,true,'No desaparecer precios referenciales por retrasos largos.');
assert.equal(veryOld.products[1].price_usd,2.5);
assert.equal(veryOld.snapshotPriceWarning,true);
const wrongClock=validatePublicSnapshot(copy,Date.parse('2026-10-20T09:00:00Z'));
assert.equal(wrongClock.pricingEnabled,true,'El reloj del visitante no bloquea precios.');
assert.equal(wrongClock.snapshotPriceWarning,true);
assert.equal(wrongClock.emergencyFallback,true);
const disabled=validatePublicSnapshot({...copy,pricingEnabled:false},Date.parse('2026-10-28T09:00:00Z'));
assert.equal(disabled.pricingEnabled,false);
assert.ok(disabled.products.every(p=>p.price_usd===undefined),'Respetar precios desactivados.');
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
 assert.ok(new URL(url).pathname.endsWith('/catalog-public-snapshot.json'));
 assert.ok(new URL(url).searchParams.has('v'),'Evitar caché vieja de JSON público.');
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
assert.ok(index.includes('snapshotPriceWarning')&&index.includes('Confirma el monto y la existencia por WhatsApp'),
 'Avisar al cliente sobre precios referenciales de copias retrasadas.');
assert.ok(quote.includes('data.snapshotPriceWarning')&&quote.includes('No es factura fiscal.'),
 'El resumen de cotización informa la antigüedad de los precios.');
assert.ok(quote.includes('data=await loadPublicSnapshot()'),
 'Los vendedores no deben agotar cuota por consultar un resumen.');
assert.ok(!readFileSync('firestore.rules','utf8').includes('catalogSnapshots'));
console.log('POLADENT: copia original, límites y reversión probados offline; sin cambios en Firebase.');
