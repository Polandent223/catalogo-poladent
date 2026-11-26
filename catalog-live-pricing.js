// POLADENT: estado ligero de precios, sin descargar los 255 documentos del catálogo.
// El administrador publica el índice sólo mientras precios públicos estén activados.
import {decodeFirestoreValue} from './catalog-public-data.js';
import {cleanUSD} from './catalog-pricing.js';

export const LIVE_PRICING_POLL_MS=120000;
const MAX_PUBLIC_PRICES=5000;

export function buildPublicPriceIndex(products,publishedIds){
 const index={};
 for(const [id,p] of products){
  if(!publishedIds.has(id)||!['available','sold_out'].includes(p.status))continue;
  let amount=null;
  try{amount=cleanUSD(p.price_usd);}catch{amount=null;}
  if(amount!==null)index[id]=amount;
 }
 return index;
}

export function parseLivePricingDocument(document){
 const raw=document?.fields;
 if(!raw||typeof raw!=='object')throw Error('Sin ajustes públicos de precios.');
 const data=Object.fromEntries(Object.entries(raw).map(([key,value])=>[key,decodeFirestoreValue(value)]));
 if(data.kind!=='contact_settings'||typeof data.pricing?.enabled!=='boolean')
  throw Error('No se encontró una publicación de precios válida.');
 const enabled=data.pricing.enabled===true;
 const indexed=data.pricing.public_index_version===1;
 const result={enabled,indexed,prices:{},names:{},updatedAt:typeof data.pricing.updated_at==='string'
   ?data.pricing.updated_at:''};
 // Reutilizar la misma lectura de precios, incluso cuando están apagados.
 // Sólo nombres públicos válidos, con sus IDs de producto.
 const rawNames=data.public_product_names;
 if(rawNames&&typeof rawNames==='object'&&!Array.isArray(rawNames)&&
   Object.keys(rawNames).length<=5000){
  for(const [id,name] of Object.entries(rawNames)){
   if(/^[A-Za-z0-9_-]{1,140}$/.test(id)&&typeof name==='string'&&
     name.trim().length>0&&name.trim().length<=180){
    result.names[id]=name.trim();
   }
  }
 }
 if(!enabled)return result;
 if(!indexed)return result; // Versión anterior: conservar la copia de GitHub.
 const rawPrices=data.pricing_public_prices;
 if(!rawPrices||typeof rawPrices!=='object'||Array.isArray(rawPrices)||
    Object.keys(rawPrices).length>MAX_PUBLIC_PRICES)
  throw Error('El índice público de precios está incompleto.');
 for(const [id,amount] of Object.entries(rawPrices)){
  if(!/^[A-Za-z0-9_-]{1,140}$/.test(id))throw Error('Identificador de precio inválido.');
  const price=cleanUSD(amount);
  if(price===null)throw Error('Precio público no válido.');
  result.prices[id]=price;
 }
 return result;
}

export async function readLivePricing(config,request=fetch){
 if(config?.projectId!=='catalogo-poladent'||!config.apiKey)
  throw Error('No está configurado el catálogo oficial.');
 const url=new URL('https://firestore.googleapis.com/v1/projects/'+
  encodeURIComponent(config.projectId)+'/databases/(default)/documents/catalogPublic/_catalog_contacts');
 url.searchParams.set('key',config.apiKey);
 const response=await request(url.href,{headers:{Accept:'application/json'},
  cache:'no-store',signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw Error('No fue posible leer el estado de precios (HTTP '+response.status+').');
 return parseLivePricingDocument(await response.json());
}

export function applyLivePricing(catalog,live){
 if(!catalog||!Array.isArray(catalog.products)||typeof live?.enabled!=='boolean')
  throw Error('No se pudo aplicar el estado público de precios.');
 const names=live.names||{};
 const namedProducts=catalog.products.map(p=>{
  const publicName=Object.prototype.hasOwnProperty.call(names,p.id)?names[p.id]:null;
  return publicName?{...p,name:publicName}:p;
 });
 if(!live.enabled){
  return {...catalog,pricingEnabled:false,products:namedProducts.map(p=>{
   const product={...p};delete product.price_usd;return product;
  })};
 }
 if(!live.indexed){
  // Sin un índice completo no inventamos montos ni filtramos precios privados.
  return {...catalog,pricingEnabled:catalog.pricingEnabled===true,products:namedProducts};
 }
 const prices=live.prices;
 return {...catalog,pricingEnabled:true,snapshotPriceWarning:false,products:namedProducts.map(p=>{
  const product={...p};
  if(Object.prototype.hasOwnProperty.call(prices,p.id))product.price_usd=prices[p.id];
  else delete product.price_usd;
  return product;
 })};
}
