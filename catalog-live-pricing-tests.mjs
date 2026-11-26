import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 LIVE_PRICING_POLL_MS,buildPublicPriceIndex,parseLivePricingDocument,
 readLivePricing,applyLivePricing
} from './catalog-live-pricing.js';
const read=file=>readFileSync(new URL('./'+file,import.meta.url),'utf8');
assert.equal(LIVE_PRICING_POLL_MS,120000);
const inventory=new Map([
 ['rodio',{status:'available',price_usd:1.77}],
 ['equipo',{status:'sold_out',price_usd:120.5}],
 ['hidden',{status:'hidden',price_usd:999}],
 ['noPrice',{status:'available',price_usd:null}],
 ['unpublished',{status:'available',price_usd:89}]
]);
const index=buildPublicPriceIndex(inventory,new Set(['rodio','equipo','hidden','noPrice']));
assert.deepEqual(index,{rodio:1.77,equipo:120.5});
const doc={fields:{
 kind:{stringValue:'contact_settings'},
 pricing:{mapValue:{fields:{
  enabled:{booleanValue:true},updated_at:{stringValue:'2026-11-18T14:35:07.178Z'},
  public_index_version:{integerValue:'1'}
 }}},
 pricing_public_prices:{mapValue:{fields:{
  rodio:{doubleValue:1.77},equipo:{doubleValue:120.5}
 }}},
 public_product_names:{mapValue:{fields:{
  rodio:{stringValue:'Material de rodio actualizado'},equipo:{stringValue:'Equipo actualizado'}
 }}}
}};
const live=parseLivePricingDocument(doc);
assert.equal(live.enabled,true);
assert.equal(live.indexed,true);
assert.deepEqual(live.prices,index);
assert.deepEqual(live.names,{rodio:'Material de rodio actualizado',equipo:'Equipo actualizado'});
const stale={products:[
 {id:'rodio',price_usd:2,name:'Espejo'},
 {id:'equipo',name:'Equipo'},
 {id:'hidden',price_usd:999,name:'Oculto'}
],pricingEnabled:false,snapshotPriceWarning:true};
const on=applyLivePricing(stale,live);
assert.equal(on.pricingEnabled,true,'El precio debe aparecer aunque la copia vieja esté desactivada.');
assert.equal(on.products[0].price_usd,1.77);
assert.equal(on.products[1].price_usd,120.5);
assert.equal(on.products[2].price_usd,undefined,'La ficha no publicada no recibe importe.');
assert.equal(on.products[0].name,'Material de rodio actualizado',
 'El nombre editado prevalece sobre la copia estática.');
assert.equal(on.products[1].name,'Equipo actualizado');
const off=applyLivePricing(on,parseLivePricingDocument({fields:{
 kind:{stringValue:'contact_settings'},
 pricing:{mapValue:{fields:{enabled:{booleanValue:false},public_index_version:{integerValue:'1'}}}}
}}));
assert.equal(off.pricingEnabled,false);
assert.ok(off.products.every(p=>p.price_usd===undefined),'Ocultar todos los importes cuando el administrador desactiva.');
// La actualización rápida de nombres es independiente de los precios.
const offWithName=parseLivePricingDocument({fields:{
 kind:{stringValue:'contact_settings'},
 pricing:{mapValue:{fields:{enabled:{booleanValue:false},public_index_version:{integerValue:'1'}}}},
 public_product_names:{mapValue:{fields:{rodio:{stringValue:'Nombre nuevo sin precios'}}}}
}});
assert.equal(applyLivePricing(stale,offWithName).products[0].name,'Nombre nuevo sin precios');
assert.equal(applyLivePricing(stale,offWithName).products[0].price_usd,undefined);
assert.equal(applyLivePricing(stale,offWithName).pricingEnabled,false);
const old=parseLivePricingDocument({fields:{
 kind:{stringValue:'contact_settings'},pricing:{mapValue:{fields:{enabled:{booleanValue:true}}}}
}});
assert.equal(old.indexed,false,'Compatibilidad con base existente sin índice.');
assert.equal(applyLivePricing(stale,old).pricingEnabled,false,'No inventar precios si la copia vieja no los contenía.');
assert.deepEqual(old.names,{},'Documentos anteriores siguen funcionando.');
const malformed=JSON.parse(JSON.stringify(doc));
malformed.fields.pricing_public_prices.mapValue.fields.rodio={stringValue:'1.777'};
assert.throws(()=>parseLivePricingDocument(malformed),/dos decimales|precio/i);
const called=[];
const fetched=await readLivePricing({projectId:'catalogo-poladent',apiKey:'public-key'},async(url,opts)=>{
 called.push({url,opts});
 return {ok:true,json:async()=>doc};
});
assert.equal(fetched.prices.rodio,1.77);
assert.equal(called.length,1,'Una sola lectura por revisión.');
assert.equal(new URL(called[0].url).pathname.split('/').pop(),'_catalog_contacts');
assert.ok(!called[0].url.includes('pageSize'),'No leer 255 productos.');
assert.equal(called[0].opts.cache,'no-store');
await assert.rejects(()=>readLivePricing({projectId:'catalogo-poladent',apiKey:'x'},async()=>({ok:false,status:403})));
const admin=read('firebase-client.js');
assert.ok(admin.includes('buildPublicPriceIndex(byId,new Set(published.map(p=>p.id)))'));
assert.ok(admin.includes('pricing_public_prices:active?prices:deleteField()'));
assert.ok(admin.includes('public_product_names:{[key]:product.status'), 'Guardar nombre rápido en el mismo lote.');
assert.ok(admin.includes('batch.set(doc(db,\'catalogPublic\',CONTACTS_DOC),liveProductPatch,{merge:true})'),
  'Una sola escritura junto a la ficha, sin otro documento público.');
assert.ok(admin.includes('public_product_names:{[String(product.id)]:deleteField()}'),
  'Eliminar índice ligero al borrar un producto.');
assert.ok(admin.includes("mergeFields:['kind','status','pricing','pricing_public_prices']"));
assert.ok(admin.includes('public_index_version:1'));
assert.ok(admin.includes('livePrices[row.id]=row.after'));
assert.ok(admin.includes('revertedPrices[row.id]=row.before===null?deleteField():row.before'));
const publicCode=read('public-catalog.js');
assert.ok(publicCode.includes('await readLivePricing(cfg)'));
assert.ok(publicCode.includes('data=applyLivePricing(data,live)'));
assert.ok(publicCode.includes('setInterval(()=>{if(document.visibilityState'));
assert.ok(publicCode.includes('void refreshLivePricing();'));
assert.ok(publicCode.includes('p.name!==next.products[i]?.name'));
assert.ok(publicCode.includes("$('#detail-name').textContent=selected.name"));
assert.ok(publicCode.includes("searchIndex=new Map(products.map(p=>[p.id,normalize(p.name"));
const summary=read('solicitud.js');
assert.ok(summary.includes('data=applyLivePricing(data,await readLivePricing(cfg))'));
assert.ok(read('firestore.rules').includes('allow get, list: if true;'));
console.log('POLADENT: activación/apagado rápido, índice USD seguro, cotización y una lectura pública OK.');
