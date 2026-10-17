// Datos mínimos de una cotización; no se almacenan en Firebase.
export const PURCHASE_TIMINGS=Object.freeze({
  today:'Hoy',
  this_week:'Esta semana',
  this_month:'Este mes',
  later:'Más adelante',
  comparing:'Solo estoy comparando opciones'
});
export function normalizeQuoteDetails(input){
  const n=Number(input?.quantity);
  if(!Number.isSafeInteger(n)||n<1||n>9999)return null;
  const city=String(input?.city||'').replace(/[\u0000-\u001F\u007F]+/g,' ').replace(/\s+/g,' ').trim();
  if(city.length<2||city.length>60)return null;
  const timing=String(input?.timing||'');
  if(!Object.prototype.hasOwnProperty.call(PURCHASE_TIMINGS,timing))return null;
  return {quantity:n,city,timing};
}
export function whatsappInquiryURL(phone,product,productLink,details){
  if(!/^[1-9][0-9]{7,14}$/.test(String(phone||'')))return '';
  const quote=normalizeQuoteDetails(details);
  if(!quote||!product?.name||!product?.brand)return '';
  let url;
  try{
    url=new URL(String(productLink||''));
    if(url.protocol!=='https:')return '';
  }catch{return '';}
  const greeting=product.status==='sold_out'
    ? 'Hola, POLADENT Casa Dental. Quisiera consultar cuándo estará disponible este producto y solicitar una cotización:'
    : 'Hola, POLADENT Casa Dental. Quisiera solicitar una cotización del siguiente producto:';
  const message=[
    greeting,
    'Producto: '+String(product.name).trim(),
    'Marca: '+String(product.brand).trim(),
    'Cantidad solicitada: '+quote.quantity+' unidad'+(quote.quantity===1?'':'es'),
    'Ciudad: '+quote.city,
    'Compra prevista: '+PURCHASE_TIMINGS[quote.timing],
    'Enlace del producto: '+url.href,
    '¿Podrían confirmarme precio y disponibilidad? Gracias.'
  ].join('\n');
  return 'https://wa.me/'+phone+'?text='+encodeURIComponent(message);
}
