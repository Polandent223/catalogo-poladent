// Solo contingencia: lectura de un respaldo público y SIN precios ni stock confirmado.
// Firestore y las credenciales privadas nunca se modifican desde este módulo.
export async function loadEmergencyCatalog(request=fetch,baseUrl=new URL('./',import.meta.url)){
 const url=new URL('catalog-emergency-backup.json',baseUrl);
 const response=await request(url.href,{headers:{Accept:'application/json'},
   signal:AbortSignal.timeout(9000),cache:'no-store'});
 if(!response.ok)throw Error('El respaldo temporal no está disponible ('+response.status+').');
 const data=await response.json();
 if(!Array.isArray(data.products)||data.products.length<200||data.products.length>10000)
   throw Error('El respaldo no cumple el mínimo de integridad.');
 const ids=new Set();
 const products=data.products.map(raw=>{
   const id=String(raw?.id||''),name=String(raw?.name||''),
     brand=String(raw?.brand||''),image_url=String(raw?.image_url||'');
   if(!/^[A-Za-z0-9_-]{1,140}$/.test(id)||ids.has(id)||!name||!brand||name.length>180||
     !/^https:\/\/(?:res\.cloudinary\.com\/|polandent223\.github\.io\/catalogo-poladent\/imagenes\/)/.test(image_url))
     throw Error('Producto del respaldo no válido.');
   ids.add(id);
   return {id,name,brand,image_url,description:String(raw.description||'').slice(0,230),
     status:'available',emergency_fallback:true};
 });
 return {products,profiles:[],
   // El número de atención es la misma referencia pública que usa el pie del catálogo.
   contacts:[{label:'POLADENT · Atención por WhatsApp',phone:'584226710634'}],
   storefront:null,pricingEnabled:false,customerPortalEnabled:false,hasCatalogState:true,
   emergencyFallback:true};
}
