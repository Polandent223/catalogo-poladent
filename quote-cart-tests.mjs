import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  CART_LIMIT,CART_STORAGE_KEY,cartQuantity,normalizeCartLines,addCartLine,
  updateCartLine,removeCartLine,cartTotals,cartWhatsAppURL
} from './quote-cart.js';

const products=[
  {id:'p1',name:'Lámpara de fotocurado',brand:'EASYINSMILE',status:'available',image_url:'https://example.org/lamp.webp'},
  {id:'p2',name:'Horno Lótus',brand:'VRC',status:'sold_out',image_url:'https://example.org/lotus.webp'},
  {id:'p3',name:'Instrumental dental',brand:'ICE',status:'available',image_url:'https://example.org/ice.webp'},
  {id:'hidden',name:'Oculto',brand:'VRC',status:'hidden'}
];
const share=p=>'https://polandent223.github.io/catalogo-poladent/?marca='+
  encodeURIComponent(p.brand)+'#producto='+encodeURIComponent(p.id);
assert.equal(CART_LIMIT,10);
assert.equal(CART_STORAGE_KEY,'poladent.quote.cart.v1');
for(const bad of [undefined,null,'',0,-1,10000,'1.2','no','1e5']){
  assert.equal(cartQuantity(bad),null);
}
assert.equal(cartQuantity('1'),1);
assert.equal(cartQuantity(9999),9999);
assert.deepEqual(normalizeCartLines([
  {id:'p1',quantity:2},{id:'p1',quantity:3},{id:'hidden',quantity:2},
  {id:'missing',quantity:2},{id:'p2',quantity:0},{id:'p3',quantity:1}
],products),[{id:'p1',quantity:2},{id:'p3',quantity:1}]);
let lines=[];
lines=addCartLine(lines,'p1',products);
lines=addCartLine(lines,'p1',products);
lines=addCartLine(lines,'p2',products);
assert.deepEqual(lines,[{id:'p1',quantity:2},{id:'p2',quantity:1}]);
assert.deepEqual(cartTotals(lines),{products:2,units:3});
assert.throws(()=>addCartLine(lines,'hidden',products),/no se encuentra/);
assert.throws(()=>addCartLine(lines,'missing',products),/no se encuentra/);
lines=updateCartLine(lines,'p2',5,products);
assert.equal(lines[1].quantity,5);
assert.throws(()=>updateCartLine(lines,'p1',10000,products),/1 y 9.999/);
const msgUrl=cartWhatsAppURL('584121234567',lines,products,
  {city:'Valencia',timing:'today'},share);
assert.ok(msgUrl.startsWith('https://wa.me/584121234567?text='));
const message=new URL(msgUrl).searchParams.get('text');
assert.match(message,/Lámpara de fotocurado \| EASYINSMILE/);
assert.match(message,/Horno Lótus \| VRC \(AGOTADO: consultar disponibilidad\)/);
assert.match(message,/Cantidad: 2 unidades/);
assert.match(message,/Cantidad: 5 unidades/);
assert.match(message,/Ciudad: Valencia/);
assert.match(message,/Compra prevista: Hoy/);
assert.match(message,/Productos diferentes: 2/);
assert.match(message,/Unidades solicitadas: 7/);
assert.ok(message.includes(share(products[0])));
assert.ok(message.includes(share(products[1])));
assert.ok(!message.includes('$'));
assert.equal(cartWhatsAppURL('584121234567',[],products,{city:'Valencia',timing:'today'},share),'');
assert.equal(cartWhatsAppURL('584121234567',lines,products,{city:'',timing:'today'},share),'');
assert.equal(cartWhatsAppURL('584121234567',lines,products,{city:'Valencia',timing:''},share),'');
assert.equal(cartWhatsAppURL('invalid',lines,products,{city:'Valencia',timing:'today'},share),'');
assert.equal(cartWhatsAppURL('584121234567',lines,products,{city:'Valencia',timing:'today'},()=> 'http://unsafe.test/'),'');
assert.equal(cartWhatsAppURL('584121234567',[...lines,{id:'hidden',quantity:1}],products,
  {city:'Valencia',timing:'today'},share),'');
assert.deepEqual(removeCartLine(lines,'p1',products),[{id:'p2',quantity:5}]);
let full=Array.from({length:CART_LIMIT},(_,i)=>({
  id:'test-'+i,name:'Producto '+i,brand:'ICE',status:'available'
}));
let lot=full.map(p=>({id:p.id,quantity:1}));
const eleven={id:'eleven',name:'Extra',brand:'ICE',status:'available'};
assert.throws(()=>addCartLine(lot,'eleven',[...full,eleven]),/hasta 10/);
const long=[{id:'long',name:'X'.repeat(8000),brand:'VRC',status:'available'}];
assert.equal(cartWhatsAppURL('584121234567',[{id:'long',quantity:1}],long,
  {city:'Valencia',timing:'today'},share),'');
const publicCode=readFileSync('public-catalog.js','utf8');
const html=readFileSync('index.html','utf8');
const analytics=readFileSync('catalog-analytics.js','utf8');
for(const id of ['cart-open','cart-dialog','cart-items','cart-form','cart-city','cart-timing',
  'cart-contact','cart-whatsapp','cart-count','detail-cart-add']){
  assert.ok(html.includes('id="'+id+'"'),id);
}
for(const term of ['value="today"','value="this_week"','value="this_month"','value="later"','value="comparing"']){
  assert.ok(html.includes(term));
}
assert.ok(publicCode.includes('sessionStorage.setItem(CART_STORAGE_KEY'));
assert.ok(publicCode.includes('cartLines=restoreCart()'));
assert.ok(publicCode.includes('cartLines=addCartLine'));
assert.ok(publicCode.includes('cartLines=removeCartLine'));
assert.ok(publicCode.includes('cartLines=updateCartLine'));
assert.ok(publicCode.includes('quoteForm.reset()'), 'Conservar la cotización individual');
assert.ok(publicCode.includes('whatsappInquiryURL('));
assert.ok(publicCode.includes('loadPublicCatalog(cfg)'), 'Conservar catálogo público');
assert.ok(!publicCode.includes("from './catalog-service.js'"));
assert.ok(analytics.includes("a#inquiry-whatsapp, a#inquiry-quick, a#cart-whatsapp"));
assert.ok(analytics.includes("record('whatsapp',0,'Cotización múltiple','')"));
assert.ok(!html.includes('Precio: $'), 'No añadir precios al catálogo');
console.log('Carrito POLADENT: cantidades, persistencia, ocultos, varios productos, WhatsApp y pruebas de privacidad correctos.');
