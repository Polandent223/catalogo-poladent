'use strict';
const MAX_PRODUCTS=10;
function normalizeCedula(input){
 const value=String(input||'').trim().toUpperCase().replace(/[\s.-]/g,'');
 if(!/^[VE][0-9]{6,9}$/.test(value))throw Error('Indica una cédula venezolana como V12345678 o E12345678.');
 return value;
}
function maskedCedula(value){
 const cedula=normalizeCedula(value);
 return cedula[0]+'***'+cedula.slice(-3);
}
function normalizeCustomerName(value){
 const name=String(value||'').trim().replace(/\s+/g,' ');
 if(name.length<3||name.length>80||/[\u0000-\u001f<>]/.test(name))
   throw Error('Indica tu nombre y apellido (3 a 80 caracteres).');
 return name;
}
function validateRequestedItems(value){
 if(!Array.isArray(value)||value.length<1||value.length>MAX_PRODUCTS)
   throw Error('Incluye entre 1 y 10 productos.');
 const unique=new Set();
 return value.map(item=>{
   const id=String(item?.id||'');
   const quantity=Number(item?.quantity);
   if(!/^[A-Za-z0-9_-]{1,140}$/.test(id)||unique.has(id)||
     !Number.isSafeInteger(quantity)||quantity<1||quantity>9999)
     throw Error('Producto o cantidad inválidos.');
   unique.add(id);
   return {id,quantity};
 });
}
function priceCents(value){
 if(value===null||value===undefined||value==='')return null;
 const price=Number(value);
 if(!Number.isFinite(price)||price<=0||price>100000000||Math.abs(price*100-Math.round(price*100))>1e-6)
   throw Error('Precio USD del producto no válido.');
 return Math.round(price*100);
}
function calculateQuote(items,publicProducts,enabled,rate=null){
 const selected=validateRequestedItems(items);
 const productMap=new Map(publicProducts.map(p=>[String(p.id),p]));
 const lines=[];let totalCents=0,pricedCount=0;
 for(const item of selected){
   const product=productMap.get(item.id);
   if(!product||!['available','sold_out'].includes(product.status)||!product.name||!product.brand)
     throw Error('Hay un producto retirado, oculto o no disponible en el catálogo.');
   const cents=enabled?priceCents(product.price_usd):null;
   if(cents!==null){pricedCount++;totalCents+=cents*item.quantity;}
   lines.push({product_id:item.id,name:String(product.name).slice(0,180),
     brand:String(product.brand).slice(0,80),status:product.status,quantity:item.quantity,
     unit_usd:cents===null?null:cents/100,subtotal_usd:cents===null?null:cents*item.quantity/100});
 }
 const complete=enabled&&pricedCount===lines.length;
 const rateValid=Number.isFinite(rate)&&rate>0;
 return {lines,products:lines.length,units:lines.reduce((n,p)=>n+p.quantity,0),
   total_usd:complete?totalCents/100:null,
   total_ves:complete&&rateValid?Math.round(totalCents*rate)/100:null,
   complete};
}
function validBcvPayload(payload,now=new Date()){
 const rate=Number(payload?.USD);
 const date=String(payload?.effective_date||'');
 const dt=new Date(date+'T12:00:00Z');
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Caracas',
   year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const fields=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 const today=fields.year+'-'+fields.month+'-'+fields.day;
 const age=(Date.parse(today+'T12:00:00Z')-dt.getTime())/86400000;
 if(!Number.isFinite(rate)||rate<=0||rate>100000000||
   !/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(dt.getTime())||
   age<0||age>7)throw Error('La tasa BCV no pudo validarse.');
 return {usd_ves:rate,effective_date:date,provider:'BCV Today, fuente independiente'};
}
module.exports={normalizeCedula,maskedCedula,normalizeCustomerName,
 validateRequestedItems,priceCents,calculateQuote,validBcvPayload};
