import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 STORE_DEFAULTS,normalizeStorefront,normalizeFeaturedProductIds,selectFeaturedProducts
} from './storefront-settings.js';
import {parseLivePricingDocument,applyLivePricing} from './catalog-live-pricing.js';
const read=path=>readFileSync(new URL('./'+path,import.meta.url),'utf8');
const base=normalizeStorefront({});
assert.equal(base.featured_products_enabled,false,
 'No activar promociones del catálogo sin aprobación del administrador.');
assert.deepEqual(base.featured_product_ids,[]);
assert.equal(base.featured_products_title,'Productos destacados');
const ids=Array.from({length:9},(_,i)=>'p-'+i);
assert.deepEqual(normalizeFeaturedProductIds([...ids,'p-0','<script>','']),ids.slice(0,6));
assert.deepEqual(normalizeFeaturedProductIds(null),[]);
assert.equal(normalizeStorefront({featured_products_enabled:'true'}).featured_products_enabled,false);
const selected=normalizeStorefront({
 featured_products_enabled:true,featured_products_title:'Selección del mes',
 featured_product_ids:['p2','p1','p2','hidden','gone','p3'],
 featured_products_include_sold_out:false
});
assert.deepEqual(selected.featured_product_ids,['p2','p1','hidden','gone','p3']);
const inventory=[
 {id:'p1',name:'Resina',brand:'ADALTA',status:'available',image_url:'https://example.com/1.webp',price_usd:23.41},
 {id:'p2',name:'Equipo',brand:'VRC',status:'available',image_url:'https://example.com/2.webp'},
 {id:'p3',name:'Agotado',brand:'DENCO',status:'sold_out',image_url:'https://example.com/3.webp'},
 {id:'hidden',name:'Privado',brand:'DENCO',status:'hidden',image_url:'https://example.com/h.webp'},
 {id:'bad',name:'No foto segura',brand:'ICE',status:'available',image_url:'javascript:alert(1)'}
];
assert.deepEqual(selectFeaturedProducts(inventory,selected).map(x=>x.id),['p2','p1'],
 'Los ocultos, eliminados y agotados excluidos nunca salen.');
assert.equal(selectFeaturedProducts(inventory,selected)[1].price_usd,23.41,
 'Tomar únicamente datos actuales del mismo inventario público.');
assert.deepEqual(selectFeaturedProducts(inventory,{...selected,featured_products_include_sold_out:true})
 .map(p=>p.id),['p2','p1','p3']);
assert.deepEqual(selectFeaturedProducts(inventory,{...selected,featured_products_enabled:false}),[]);
assert.deepEqual(selectFeaturedProducts(inventory,{...selected,featured_product_ids:['bad']}),[]);

const str=s=>({stringValue:s}),map=f=>({mapValue:{fields:f}});
const doc={fields:{
 kind:str('contact_settings'),
 pricing:map({enabled:{booleanValue:false},public_index_version:{integerValue:'1'}}),
 storefront:map({
  featured_products_enabled:{booleanValue:true},
  featured_products_title:str('Favoritos POLADENT'),
  featured_product_ids:{arrayValue:{values:[str('p2'),str('p1')]}},
  featured_products_include_sold_out:{booleanValue:false}
 })
}};
const live=parseLivePricingDocument(doc);
assert.equal(live.enabled,false);
assert.deepEqual(live.highlights.featured_product_ids,['p2','p1']);
assert.equal(live.highlights.featured_products_title,'Favoritos POLADENT');
const legacy={products:inventory,pricingEnabled:true,storefront:{enabled:true,title:'Portada aprobada',
 banner_desktop_url:'https://example.com/banner.webp',featured_products_enabled:false}};
const merged=applyLivePricing(legacy,live);
assert.equal(merged.storefront.featured_products_enabled,true);
assert.equal(merged.storefront.title,'Portada aprobada','No reemplazar la portada.');
assert.equal(merged.storefront.banner_desktop_url,'https://example.com/banner.webp');
assert.equal(merged.pricingEnabled,false);
assert.ok(merged.products.every(p=>p.price_usd===undefined),
 'Nunca filtrar precios cuando están desactivados.');
assert.deepEqual(selectFeaturedProducts(merged.products,merged.storefront).map(p=>p.id),['p2','p1']);
const old=parseLivePricingDocument({fields:{
 kind:str('contact_settings'),pricing:map({enabled:{booleanValue:false}})
}});
assert.equal(old.highlights,null,'Compatibilidad con documentos anteriores.');
assert.equal(applyLivePricing(legacy,old).storefront.featured_products_enabled,false);

const admin=read('design-admin.js'),adminHtml=read('diseno.html'),nav=read('admin-navigation.js');
const catalog=read('public-catalog.js'),page=read('index.html'),style=read('catalog-style.css');
const backend=read('firebase-client.js'),rules=read('firestore.rules');
for(const id of ['design-highlight-editor','design-highlights-enabled','design-highlight-search',
 'design-highlight-candidates','design-highlight-selected','design-highlight-count',
 'design-highlight-feedback','design-highlights-sold-out'])
 assert.ok(adminHtml.includes('id="'+id+'"'),'Falta editor '+id);
assert.ok(admin.includes('makeHighlightChoices(products)'));
assert.ok(admin.includes('highlightSelectedIds=[...published.featured_product_ids]'));
assert.ok(admin.includes('featured_product_ids:normalizeFeaturedProductIds(highlightSelectedIds)'));
assert.ok(admin.includes('saveStorefrontSettings(requested)'));
assert.ok(nav.includes("['destacados','Productos destacados']"));
assert.ok(nav.includes("id==='design-highlight-editor'"),'El campo debe estar dentro de su propia pestaña.');
for(const id of ['product-highlights','product-highlights-grid','product-highlights-title'])
 assert.ok(page.includes('id="'+id+'"'));
assert.ok(page.includes('id="product-highlights"')&&page.includes('hidden'),
 'No mostrar promociones sin activar.');
assert.ok(catalog.includes('selectFeaturedProducts(products,values)'),
 'Sólo consumir fichas públicas reales sin copiar inventario.');
assert.ok(catalog.includes('renderProductHighlights(values)'));
assert.ok(catalog.includes('const card=buildCard(product,index)'),
 'Los destacados deben compartir la misma cotización de 20 productos.');
assert.ok(catalog.includes('refreshCartButtons()'),
 'El carrito refleja los botones de productos repetidos.');
assert.ok(catalog.includes('highlightsChanged'), 'Visibilidad actualizable desde ajustes públicos.');
assert.ok(catalog.includes("storefrontSettings=next.storefront||storefrontSettings"));
assert.ok(style.includes('#product-highlights[hidden]{display:none!important}'));
assert.ok(style.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
assert.ok(read('quote-cart.js').includes('export const CART_LIMIT=20'));
assert.ok(backend.includes('storefront:normalized'));
assert.ok(backend.includes("doc(db,'catalogPublic',CONTACTS_DOC),data,{merge:true}"));
assert.ok(rules.includes('allow get, list: if true;'));
assert.ok(!admin.includes('deleteProduct('),'Destacar productos no borra fichas.');
console.log('POLADENT: destacados opcionales, seis productos, orden, disponibilidad, Firestore, portada y carrito OK.');
