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
export function cartWhatsAppURL(phone,lines,products,details,linkForProduct){
  if(!/^[1-9][0-9]{7,14}$/.test(String(phone||'')))return '';
  const quote=normalizeQuoteDetails({...details,quantity:1});
  const selected=normalizeCartLines(lines,products);
  if(!quote||selected.length===0||selected.length!==lines.length)return '';
  const byId=new Map(products.map(p=>[String(p.id),p]));
  const rows=[];
  for(const [index,line] of selected.entries()){
    const p=byId.get(line.id);
    let link;
    try{
      link=new URL(linkForProduct(p));
      if(link.protocol!=='https:')return '';
    }catch{return '';}
    const status=p.status==='sold_out'?' (AGOTADO: consultar disponibilidad)':'';
    rows.push((index+1)+'. '+String(p.name).trim()+' | '+String(p.brand).trim()+status+
      '\n   Cantidad: '+line.quantity+' unidad'+(line.quantity===1?'':'es')+
      '\n   '+link.href);
  }
  const message=[
    'Hola, POLADENT Casa Dental. Deseo solicitar una cotización de varios productos:',
    '',
    ...rows,
    '',
    'Ciudad: '+quote.city,
    'Compra prevista: '+PURCHASE_TIMINGS[quote.timing],
    'Productos diferentes: '+selected.length,
    'Unidades solicitadas: '+cartTotals(selected).units,
    '¿Podrían confirmar precios y disponibilidad? Gracias.'
  ].join('\n');
  const encoded=encodeURIComponent(message);
  // WhatsApp y navegadores móviles no garantizan enlaces excesivamente largos.
  if(encoded.length>6500)return '';
  return 'https://wa.me/'+phone+'?text='+encoded;
}
