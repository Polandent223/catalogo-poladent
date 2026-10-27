import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  CART_LIMIT,CART_STORAGE_KEY,cartQuantity,normalizeCartLines,addCartLine,
  updateCartLine,removeCartLine,cartTotals,cartFinancials,cartSummaryURL,parseSummaryFragment,cartWhatsAppURL
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

const priced=[
  {...products[0],price_usd:1.8},{...products[1],price_usd:5.25},products[2],products[3]
];
const finance=cartFinancials(lines,priced,true,887.3);
assert.equal(finance.complete,true);
assert.equal(finance.pricedCount,2);
assert.equal(finance.rows[0].unitUSD,1.8);
assert.equal(finance.rows[0].subtotalUSD,3.6);
assert.equal(finance.rows[1].subtotalUSD,26.25);
assert.equal(finance.totalUSD,29.85);
assert.equal(finance.totalVES,26485.91);
assert.equal(cartFinancials(lines,priced,true,null).totalVES,null);
assert.equal(cartFinancials(lines,priced,false,887.3).complete,false);
assert.equal(cartFinancials(lines,products,true,887.3).complete,false);
const onlyPriced=cartFinancials([{id:'p1',quantity:2}],[{...products[0],price_usd:1.80}],true,887.3);
assert.equal(onlyPriced.totalUSD,3.60);
assert.equal(onlyPriced.totalVES,3194.28);
const summary=cartSummaryURL(lines,priced,'https://polandent223.github.io/catalogo-poladent/?catalogo=1');
assert.ok(summary.startsWith('https://polandent223.github.io/catalogo-poladent/solicitud.html#pedido='));
assert.deepEqual(parseSummaryFragment(new URL(summary).hash),lines);
const ref={code:'POL-20261027-A1B2C3D4',createdAt:'2026-10-27T14:00:00.000Z'};
const linkWithRef=cartSummaryURL(lines,priced,'https://polandent223.github.io/catalogo-poladent/',ref);
assert.ok(linkWithRef.includes('ref=POL-20261027-A1B2C3D4'));
assert.deepEqual(parseSummaryFragment(new URL(linkWithRef).hash),lines);
const contactUrl=cartWhatsAppURL('584121234567',lines,priced,
 {city:'Valencia',timing:'today',name:'Cliente Dental',phone:'0412 1234567'},
 linkWithRef,finance);
const contactText=new URL(contactUrl).searchParams.get('text');
assert.ok(contactText.includes('Cliente: Cliente Dental'));
assert.ok(contactText.includes('Teléfono de contacto: 0412 1234567'));
assert.ok(contactText.includes('Referencia de consulta: POL-20261027-A1B2C3D4'));
assert.ok(!linkWithRef.includes('Cliente Dental'),'No filtrar nombre en enlace público');
assert.ok(!linkWithRef.includes('0412'),'No filtrar teléfono en enlace público');

for(const tampered of ['#pedido=p1=2,p1=3','#pedido=hidden=0','#pedido=p1=10000',
 '#pedido=p1=1,p2=2,p3=3,p4=4,p5=5,p6=6,p7=7,p8=8,p9=9,p10=10,p11=11',
 '#pedido=<script>=1','#pedido=p1=3.2']){
 assert.deepEqual(parseSummaryFragment(tampered),[]);
}
assert.equal(cartSummaryURL([{id:'hidden',quantity:1}],products,
 'https://polandent223.github.io/catalogo-poladent/'),'');
assert.equal(cartSummaryURL(lines,priced,'http://insecure.example.com/'),'');
const msgUrl=cartWhatsAppURL('584121234567',lines,priced,
  {city:'Valencia',timing:'today'},summary,finance);
assert.ok(msgUrl.startsWith('https://wa.me/584121234567?text='));
const message=new URL(msgUrl).searchParams.get('text');
assert.match(message,/Resumen de solicitud/);
assert.match(message,/Ciudad: Valencia/);
assert.match(message,/Compra prevista: Hoy/);
assert.match(message,/Productos diferentes: 2/);
assert.match(message,/Unidades solicitadas: 7/);
assert.match(message,/Total referencial USD: 29.85/);
assert.match(message,/Equivalente referencial Bs: 26485.91/);
assert.match(message,/USDT/);
assert.match(message,/no es factura fiscal/i);
assert.ok(message.includes(summary),'El vendedor recibe UN solo enlace de resumen.');
assert.ok(!message.includes(share(products[0])),'No repetir URL de fichas de producto.');
assert.ok(!message.includes(share(products[1])),'No repetir URL de fichas de producto.');
assert.equal((message.match(/https:\/\//g)||[]).length,1,'Solo un enlace dentro del mensaje.');
assert.equal(cartWhatsAppURL('584121234567',[],priced,{city:'Valencia',timing:'today'},summary),'');
assert.equal(cartWhatsAppURL('584121234567',lines,priced,{city:'',timing:'today'},summary),'');
assert.equal(cartWhatsAppURL('584121234567',lines,priced,{city:'Valencia',timing:''},summary),'');
assert.equal(cartWhatsAppURL('invalid',lines,priced,{city:'Valencia',timing:'today'},summary),'');
assert.equal(cartWhatsAppURL('584121234567',lines,priced,{city:'Valencia',timing:'today'},
  'http://unsafe.test/'),'');
assert.equal(cartWhatsAppURL('584121234567',[...lines,{id:'hidden',quantity:1}],priced,
  {city:'Valencia',timing:'today'},summary),'');
assert.deepEqual(removeCartLine(lines,'p1',products),[{id:'p2',quantity:5}]);
let full=Array.from({length:CART_LIMIT},(_,i)=>({
  id:'test-'+i,name:'Producto '+i,brand:'ICE',status:'available'
}));
let lot=full.map(p=>({id:p.id,quantity:1}));
const eleven={id:'eleven',name:'Extra',brand:'ICE',status:'available'};
assert.throws(()=>addCartLine(lot,'eleven',[...full,eleven]),/hasta 10/);
const long=[{id:'long',name:'X'.repeat(8000),brand:'VRC',status:'available'}];
assert.ok(cartSummaryURL([{id:'long',quantity:1}],long,
  'https://polandent223.github.io/catalogo-poladent/').includes('solicitud.html'));
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
assert.ok(publicCode.includes('cartFinancials(cartLines,products'), 'Mostrar subtotales y totales en carrito.');
assert.ok(publicCode.includes('cartSummaryURL(cartLines,products'), 'Enviar resumen compartible en lugar de enlaces individuales.');
assert.ok(html.includes('Mi solicitud de productos'));
const summaryHtml=readFileSync('solicitud.html','utf8');
const summaryJs=readFileSync('solicitud.js','utf8');
assert.ok(summaryHtml.includes('No es una factura fiscal'));
assert.ok(summaryJs.includes('loadPublicCatalog(cfg)'), 'Resumen obtiene el precio vigente de la fuente pública.');
assert.ok(summaryJs.includes('parseSummaryFragment(location.hash)'));
assert.ok(!summaryJs.includes('saveProduct('));

assert.ok(!publicCode.includes("from './catalog-service.js'"));
assert.ok(analytics.includes("a#inquiry-whatsapp, a#inquiry-quick, a#cart-whatsapp"));
assert.ok(analytics.includes("record('whatsapp',0,'Cotización múltiple','')"));
assert.ok(!html.includes('Precio: $'), 'No añadir precios al catálogo');
console.log('Carrito POLADENT: cantidades, persistencia, ocultos, varios productos, WhatsApp y pruebas de privacidad correctos.');
