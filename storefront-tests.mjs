import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const load=async name=>import('data:text/javascript;base64,'+Buffer.from(read(name)).toString('base64'));
const {STORE_DEFAULTS,normalizeStorefront,secureBannerURL}=await load('storefront-settings.js');
const {parseCatalogDocuments}=await load('catalog-public-data.js');

const original=normalizeStorefront();
assert.equal(original.enabled,false,'Por defecto nadie ve el rediseño hasta la aprobación');
assert.match(original.title,/odontología/);
assert.equal(original.trust_items.length,3);
assert.equal(original.featured_brands.length,3);
assert.equal(secureBannerURL('javascript:alert(1)'),'');
assert.equal(secureBannerURL('http://example.com/banner.png'),'');
assert.equal(secureBannerURL('https://example.com/a.webp'),'https://example.com/a.webp');
assert.equal(secureBannerURL('https://user:pass@example.com/x.webp'),'');
assert.equal(secureBannerURL('blob:https://example.com/a'), '');
assert.equal(secureBannerURL('blob:https://example.com/a',true),'blob:https://example.com/a');
const candidate=normalizeStorefront({
  enabled:true,title:'Nueva vitrina POLADENT',
  eyebrow:'OFERTAS SIN PRECIOS', subtitle:'Laboratorio e instrumental.',
  banner_desktop_url:'https://example.com/pc.webp',
  banner_mobile_url:'https://example.com/mobile.webp',
  trust_items:['Asesoría','Cotización','Envíos'],
  featured_brands:['ICE','ADALTA','ICE','EASYINSMILE','VRC','IMODONTO']
});
assert.equal(candidate.enabled,true);
assert.equal(candidate.title,'Nueva vitrina POLADENT');
assert.equal(candidate.banner_mobile_url,'https://example.com/mobile.webp');
assert.deepEqual(candidate.trust_items,['Asesoría','Cotización','Envíos']);
assert.deepEqual(candidate.featured_brands,['ICE','ADALTA','EASYINSMILE']);
const untrusted=normalizeStorefront({
  enabled:'true',title:'x'.repeat(150),
  banner_mobile_url:'javascript:alert(1)',
  featured_brands:['ICE',''],
  trust_items:['texto\nsegundo']
});
assert.equal(untrusted.enabled,false);
assert.equal(untrusted.title,STORE_DEFAULTS.title);
assert.equal(untrusted.banner_mobile_url,'');
assert.equal(untrusted.trust_items[0],'texto segundo');

const str=s=>({stringValue:s});
const contents=[
  {name:'projects/example/databases/(default)/documents/catalogPublic/_catalog_contacts',
   fields:{
     kind:str('contact_settings'),status:str('available'),
     contacts:{arrayValue:{values:[{mapValue:{fields:{label:str('Valencia'),phone:str('584121234567')}}}]}},
     storefront:{mapValue:{fields:{enabled:{booleanValue:true},title:str('Nueva vitrina POLADENT'),banner_mobile_url:str('https://example.com/mobile.webp')}}}
   }
  },
  {name:'projects/example/databases/(default)/documents/catalogPublic/p-ice',
   fields:{name:str('Forceps'),brand:str('ICE'),status:str('available'),image_url:str('https://example.com/forceps.webp')}}
];
const parsed=parseCatalogDocuments(contents);
assert.equal(parsed.contacts.length,1);
assert.equal(parsed.contacts[0].label,'Valencia');
assert.equal(parsed.products.length,1);
assert.equal(parsed.storefront.enabled,true);
assert.equal(parsed.storefront.title,'Nueva vitrina POLADENT');
assert.equal(parsed.storefront.banner_mobile_url,'https://example.com/mobile.webp');

const page=read('index.html');
const publicCode=read('public-catalog.js');
const style=read('catalog-style.css');
const adminPage=read('diseno.html');
const adminCode=read('design-admin.js');
const backend=read('firebase-client.js');
const service=read('catalog-service.js');
for (const id of ['storefront-home','storefront-hero','storefront-title','storefront-subtitle',
  'storefront-primary','storefront-secondary','storefront-trust-1','storefront-trust-2',
  'storefront-trust-3','storefront-featured-grid','storefront-brands-title',
  'storefront-mobile-source','storefront-banner']){
  assert.ok(page.includes('id="'+id+'"'),'Falta sección en catálogo: '+id);
}
assert.ok(page.includes('id="cart-open"'),'Mantener el carrito');
assert.ok(page.includes('id="inquiry-whatsapp"'),'Mantener consulta individual');
assert.ok(page.includes('id="quote-timing"'),'Mantener intención de compra');
assert.ok(page.includes('id="welcome-screen"'),'No cambiar portada de bienvenida');
assert.ok(page.includes('id="storefront-home" class="storefront-home" aria-label="Presentación comercial POLADENT" hidden'),
  'La vista previa no debe activarse automáticamente');
assert.ok(publicCode.includes("new URLSearchParams(location.search).get('vista')==='1'"));
assert.ok(publicCode.includes('const design=previewStorefront||values.enabled'));
assert.ok(publicCode.includes("$('.intro').hidden=design"));
assert.ok(publicCode.includes('storefrontSettings=data.storefront'));
assert.ok(publicCode.includes("if(event.origin!==location.origin||event.source!==window.parent"),
  'Bloquear mensajes desde sitios no autorizados');
assert.ok(publicCode.includes('renderStorefront()'));
assert.ok(publicCode.includes("window.parent.postMessage({type:'poladent:storefront-ready'},location.origin)"));
assert.ok(style.includes('body.storefront-active'));
assert.ok(style.includes('.storefront-hero'));
assert.ok(style.includes('.storefront-trust'));
assert.ok(style.includes('@media(max-width:700px)'));
for(const id of ['design-enabled','design-desktop-file','design-desktop-url',
  'design-mobile-file','design-mobile-url','design-brands','design-frame','design-save']){
  assert.ok(adminPage.includes('id="'+id+'"'), 'Falta editor: '+id);
}
assert.ok(adminPage.includes('src="./?catalogo=1&amp;vista=1"'));
assert.ok(read('admin.html').includes('href="diseno.html"'));
assert.ok(adminCode.includes('getStorefrontSettings()'));
assert.ok(adminCode.includes('saveStorefrontSettings(requested)'));
assert.ok(adminCode.includes("type:'poladent:storefront-draft'"));
assert.ok(adminCode.includes('await uploadImage(file)'));
assert.ok(adminCode.includes('URL.createObjectURL(file)'));
assert.ok(adminCode.includes('clearObjectURLs()'));
assert.ok(backend.includes('export async function getStorefrontSettings()'));
const saver=backend.slice(backend.indexOf('export async function saveStorefrontSettings('));
assert.ok(saver.includes("doc(db,'catalogProducts',CONTACTS_DOC),data,{merge:true}"));
assert.ok(saver.includes("doc(db,'catalogPublic',CONTACTS_DOC),data,{merge:true}"));
assert.ok(!saver.includes('batch.delete('));
assert.ok(!saver.includes('deleteDoc('));
assert.ok(!saver.includes('saveProduct('));
assert.ok(saver.includes('await adminCheck()'));
assert.ok(service.includes('client.saveStorefrontSettings(settings)'));
console.log('Escaparate editable: vista previa, datos reales, protección y opciones móviles/PC correctos.');
