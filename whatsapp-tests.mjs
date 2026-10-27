import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./contact-links.js', import.meta.url),'utf8');
const {whatsappInquiryURL,normalizeQuoteDetails,PURCHASE_TIMINGS}=
  await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

const product={id:'ABC123',name:'Horno Lótus',brand:'VRC',status:'available'};
const link='https://polandent223.github.io/catalogo-poladent/?marca=VRC#producto=ABC123';
const details={quantity:'3',city:'Valencia',timing:'this_week'};
const url=whatsappInquiryURL('584121234567',product,link,details);
assert.ok(url.startsWith('https://wa.me/584121234567?text='));
const message=new URL(url).searchParams.get('text');
assert.ok(message.includes('POLADENT Casa Dental'));
assert.ok(message.includes('Producto: Horno Lótus'));
assert.ok(message.includes('Marca: VRC'));
assert.ok(message.includes('Cantidad solicitada: 3 unidades'));
assert.ok(message.includes('Ciudad: Valencia'));
assert.ok(!message.includes('Compra prevista'), 'No preguntar ni anticipar fecha de compra.');
assert.ok(message.includes('¿Podrían confirmarme precio y disponibilidad?'));
assert.ok(message.includes(link));
assert.ok(!message.includes('null'));
assert.ok(!message.includes('undefined'));

const noTiming=whatsappInquiryURL('584121234567',product,link,{quantity:2,city:'Valencia'});
assert.ok(noTiming.startsWith('https://wa.me/'));
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
assert.ok(!html.includes('id="quote-timing"'));
assert.ok(!html.includes('id="cart-timing"'));
assert.ok(!html.includes('¿Cuándo piensas comprar?'));
const one=whatsappInquiryURL('584121234567',product,link,{...details,quantity:'1'});
assert.ok(new URL(one).searchParams.get('text').includes('1 unidad\n'));
const unavailable=whatsappInquiryURL('584121234567',{...product,status:'sold_out'},link,details);
assert.ok(new URL(unavailable).searchParams.get('text').includes('cuándo estará disponible'));
for(const key of Object.keys(PURCHASE_TIMINGS)){
  assert.ok(!new URL(whatsappInquiryURL('584121234567',product,link,{...details,timing:key}))
    .searchParams.get('text').includes('Compra prevista'));
}
assert.deepEqual(normalizeQuoteDetails({quantity:2,city:' San  Cristóbal ',timing:'this_month'}),
  {quantity:2,city:'San Cristóbal'});
assert.deepEqual(normalizeQuoteDetails({quantity:2,city:'Caracas\nUn campo: malicioso',timing:'later'}),
  {quantity:2,city:'Caracas Un campo: malicioso'});
for(const bad of [{quantity:0},{quantity:-1},{quantity:10000},{quantity:1.5},
   {quantity:'no'},{quantity:'1e8'},{quantity:2,city:'A'},
   {quantity:2,city:'A'.repeat(61)},{quantity:2,city:'',timing:'later'},
   {quantity:2,city:''}]){
  assert.equal(whatsappInquiryURL('584121234567',product,link,{...details,...bad}), '',
    'Se debe rechazar formulario incompleto o incorrecto');
}
assert.equal(whatsappInquiryURL('584121234567',product,link), '','Es obligatorio completar cotización');
assert.equal(whatsappInquiryURL('',product,link,details),'');
assert.equal(whatsappInquiryURL('04121234567',product,link,details),'');
assert.equal(whatsappInquiryURL('hello',product,link,details),'');
assert.equal(whatsappInquiryURL('58412?bad',product,link,details),'');
assert.equal(whatsappInquiryURL('584121234567',product,'javascript:alert(1)',details),'');
assert.equal(whatsappInquiryURL('584121234567',product,'http://example.com/',details),'');
const publicScript=readFileSync(new URL('./public-catalog.js',import.meta.url),'utf8');
assert.ok(publicScript.includes('block.hidden=!selected||contacts.length===0'));
assert.ok(publicScript.includes('try{data=await loadPublicCatalog(cfg);}'), 'Mantener Firestore como fuente principal antes del respaldo.');
assert.ok(publicScript.includes('contacts=data.contacts'));
assert.ok(publicScript.includes('shareIds.has(String(p.id))'));
assert.ok(publicScript.includes('quoteForm.reset()'), 'No reutilizar los datos de otro producto');
assert.ok(publicScript.includes('quoteForm.reportValidity()'));
assert.ok(publicScript.includes('quoteLink.removeAttribute(\'href\')'));
assert.ok(publicScript.includes('whatsappInquiryURL(\'')===false,'La URL de WhatsApp utiliza el contacto seleccionado');
for(const id of ['quote-form','quote-quantity','quote-city','inquiry-contact','inquiry-whatsapp']){
  assert.ok(html.includes('id="'+id+'"'));
}
assert.ok(!html.includes('value="comparing"'), 'Cotizar sin obligar a declarar cuándo comprará.');
assert.ok(!html.includes('Precio: $'));
assert.ok(html.includes('id="quote-quantity" name="quantity"'));
const collector=readFileSync(new URL('./catalog-analytics.js',import.meta.url),'utf8');
assert.ok(collector.includes("a#inquiry-whatsapp"));
assert.ok(collector.includes('isRealWhatsAppClick(event,link)'));
assert.ok(!collector.includes("},{capture:true}"), 'Contar clics después de validar el formulario');
const adminFile=readFileSync(new URL('./admin.html',import.meta.url),'utf8');
assert.ok(adminFile.includes('href="contacto.html"'));
console.log('Cotización por WhatsApp: campos, enlaces, disponibilidad y estadísticas correctos.');
