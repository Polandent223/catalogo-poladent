// El carrito solo conserva IDs y cantidades de artículos públicos de la sesión.
// La ciudad y el plazo de compra NUNCA se guardan.
import {normalizeQuoteDetails,PURCHASE_TIMINGS} from './contact-links.js';
export const CART_LIMIT=10;
export const CART_STORAGE_KEY='poladent.quote.cart.v1';
export function cartQuantity(value){
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const n=Number(value);
  return Number.isSafeInteger(n)&&n>=1&&n<=9999?n:null;
}
export function normalizeCartLines(input,products){
  if(!Array.isArray(input)||!Array.isArray(products))return [];
  const allowed=new Set(products.filter(p=>['available','sold_out'].includes(p.status)&&p.name&&p.brand).map(p=>String(p.id)));
  const found=new Set(),out=[];
  for(const item of input){
    if(out.length>=CART_LIMIT)break;
    const id=String(item?.id||'');
    const quantity=cartQuantity(item?.quantity);
    if(!id||!allowed.has(id)||found.has(id)||quantity===null)continue;
    found.add(id);out.push({id,quantity});
  }
  return out;
}
export function addCartLine(lines,id,products){
  const valid=normalizeCartLines(lines,products),key=String(id);
  if(!products.some(p=>String(p.id)===key&&['available','sold_out'].includes(p.status)))throw Error('Este producto ya no se encuentra en el catálogo público.');
  const previous=valid.find(p=>p.id===key);
  if(previous){
    if(previous.quantity>=9999)throw Error('El máximo por producto es 9.999 unidades.');
    return valid.map(p=>p.id===key?{...p,quantity:p.quantity+1}:p);
  }
  if(valid.length>=CART_LIMIT)throw Error('Puedes incluir hasta '+CART_LIMIT+' productos diferentes por consulta.');
  return [...valid,{id:key,quantity:1}];
}
export function updateCartLine(lines,id,quantity,products){
  const value=cartQuantity(quantity);
  if(value===null)throw Error('Indica una cantidad entre 1 y 9.999.');
  return normalizeCartLines(lines,products).map(p=>p.id===String(id)?{...p,quantity:value}:p);
}
export function removeCartLine(lines,id,products){
  return normalizeCartLines(lines,products).filter(p=>p.id!==String(id));
}
export function cartTotals(lines){
  return {products:lines.length,units:lines.reduce((sum,p)=>sum+p.quantity,0)};
}

// El total solo es completo cuando TODOS los productos tienen precios USD válidos.
// Evitamos que el carrito presente un subtotal parcial como precio final.
export function cartFinancials(lines,products,pricingEnabled=false,usdVesRate=null){
  const selected=normalizeCartLines(lines,products);
  const byId=new Map((products||[]).map(p=>[String(p.id),p]));
  const rate=Number(usdVesRate);
  const rateValid=usdVesRate!==null&&usdVesRate!==undefined&&Number.isFinite(rate)&&rate>0;
  let totalCents=0,pricedCount=0;
  const rows=selected.map(line=>{
    const product=byId.get(line.id);
    const raw=product?.price_usd;
    const usd=Number(raw);
    const valid=pricingEnabled&&raw!==null&&raw!==undefined&&raw!=='' &&
      Number.isFinite(usd)&&usd>0&&usd<=100000000&&Math.abs(usd*100-Math.round(usd*100))<0.000001;
    const unitCents=valid?Math.round(usd*100):null;
    const lineCents=valid?unitCents*line.quantity:null;
    if(valid){pricedCount++;totalCents+=lineCents;}
    return {id:line.id,quantity:line.quantity,unitUSD:valid?unitCents/100:null,
      subtotalUSD:valid?lineCents/100:null,
      subtotalVES:valid&&rateValid?Math.round(lineCents*rate)/100:null};
  });
  const complete=selected.length>0&&pricedCount===selected.length;
  return {rows,pricedCount,complete,
    totalUSD:complete?totalCents/100:null,
    totalVES:complete&&rateValid?Math.round(totalCents*rate)/100:null};
}
// Un único enlace pequeño al resumen. NO incluye datos personales ni precios
// manipulables. El vendedor comprobará productos, USD y tasa vigentes al abrir.
export function cartSummaryURL(lines,products,baseUrl){
  const selected=normalizeCartLines(lines,products);
  if(!selected.length||selected.length!==lines?.length)return '';
  let url;
  try{url=new URL('solicitud.html',baseUrl);}
  catch{return '';}
  if(url.protocol!=='https:')return '';
  const parts=[];
  for(const line of selected){
    if(!/^[A-Za-z0-9_-]{1,140}$/.test(line.id))return '';
    parts.push(line.id+'='+line.quantity);
  }
  const compact=parts.join(',');
  if(compact.length>1650)return '';
  url.hash='pedido='+compact;
  return url.href;
}
export function parseSummaryFragment(fragment){
  const raw=new URLSearchParams(String(fragment||'').replace(/^#/, '')).get('pedido');
  if(!raw||raw.length>1650)return [];
  const lines=raw.split(',');
  if(lines.length>CART_LIMIT)return [];
  const found=new Set(),parsed=[];
  for(const entry of lines){
    const match=/^([A-Za-z0-9_-]{1,140})=([1-9][0-9]{0,3})$/.exec(entry);
    if(!match)return [];
    const [,id,count]=match,quantity=cartQuantity(count);
    if(!quantity||found.has(id))return [];
    found.add(id);parsed.push({id,quantity});
  }
  return parsed;
}
export function cartWhatsAppURL(phone,lines,products,details,summaryLink,financials=null){
  if(!/^[1-9][0-9]{7,14}$/.test(String(phone||'')))return '';
  const quote=normalizeQuoteDetails({...details,quantity:1});
  const selected=normalizeCartLines(lines,products);
  if(!quote||selected.length===0||selected.length!==lines.length)return '';
  let singleLink;
  try{singleLink=new URL(summaryLink);if(singleLink.protocol!=='https:'||!singleLink.hash.startsWith('#pedido='))return '';}
  catch{return '';}
  const totals=cartTotals(selected);
  const text=[
    'Hola, POLADENT Casa Dental. Solicito revisar estos productos:',
    '',
    'Resumen de solicitud (un único enlace):',
    singleLink.href,
    '',
    'Ciudad: '+quote.city,
    'Compra prevista: '+PURCHASE_TIMINGS[quote.timing],
    'Productos diferentes: '+totals.products,
    'Unidades solicitadas: '+totals.units,
    ...(financials?.complete?[
      'Total referencial USD: '+financials.totalUSD.toFixed(2),
      ...(financials.totalVES!==null?['Equivalente referencial Bs: '+financials.totalVES.toFixed(2)]:[])
    ]:[]),
    'Solicito confirmar disponibilidad, tasa BCV y monto al pagar.',
    'Para pagar en USDT u otras divisas consultar condiciones con un asesor.',
    'Este resumen no es factura fiscal.'
  ].join('\n');
  const encoded=encodeURIComponent(text);
  if(encoded.length>3400)return '';
  return 'https://wa.me/'+phone+'?text='+encoded;
}
