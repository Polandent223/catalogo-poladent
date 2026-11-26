import assert from 'node:assert/strict';
import {mergePublicHighlights} from './sync-public-highlights.mjs';
const str=v=>({stringValue:v});
const bool=v=>({booleanValue:v});
const array=xs=>({arrayValue:{values:xs.map(str)}});
const map=fields=>({mapValue:{fields}});
const snapshot={
 schema:'poladent-public-snapshot-v1',captured_at:'2026-11-26T14:13:05.599Z',
 storefront:{enabled:true,theme:'premium-compacta',banner_desktop_url:'https://example.com/banner.webp'},
 products:Array.from({length:255},(_,i)=>({id:'p'+i,name:'Producto '+i,
   status:'available',price_usd:1.2,image_url:'https://example.com/image.webp'})),
 pricingEnabled:true
};
const doc={fields:{kind:str('contact_settings'),storefront:map({
 featured_products_enabled:bool(true),
 featured_products_title:str('Selección POLADENT'),
 featured_product_ids:array(['p2','p1','p3']),
 featured_products_include_sold_out:bool(false)
})}};
const result=mergePublicHighlights(snapshot,doc);
assert.equal(result.changed,true);
assert.equal(result.highlighted,3);
assert.equal(result.known,3);
assert.deepEqual(result.snapshot.storefront.featured_product_ids,['p2','p1','p3']);
assert.equal(result.snapshot.storefront.theme,'premium-compacta');
assert.equal(result.snapshot.captured_at,snapshot.captured_at);
assert.deepEqual(result.snapshot.products,snapshot.products);
assert.equal(result.snapshot.pricingEnabled,true);
assert.equal(mergePublicHighlights(result.snapshot,doc).changed,false);
assert.equal(mergePublicHighlights(result.snapshot,{fields:{kind:str('contact_settings'),
 storefront:map({featured_products_enabled:bool(false),featured_product_ids:array([])})}})
 .snapshot.storefront.featured_products_enabled,false);
assert.throws(()=>mergePublicHighlights(snapshot,{fields:{kind:str('contact_settings'),
 storefront:map({featured_products_enabled:bool(true),featured_product_ids:array(['not-in-catalog'])})}}),
 /no están presentes/);
console.log('POLADENT: sincronización ligera de destacados sin modificar 255 fichas, precios o fecha de inventario OK.');
