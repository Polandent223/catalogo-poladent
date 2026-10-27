// La copia pública validada evita una lectura de 255+ documentos Firestore por visitante.
// Si es antigua, conserva banners y logotipos pero NO ofrece precios ni stock actuales.
export const STATIC_SNAPSHOT_NAME='catalog-public-snapshot.json';
const SCHEMA='poladent-public-snapshot-v1';
const PRICE_MAX_AGE_MS=4*60*60*1000;
export function validatePublicSnapshot(value,now=Date.now()){
 if(!value||value.schema!==SCHEMA||!Array.isArray(value.products)||
   value.products.length<200||value.products.length>10000||
   !Array.isArray(value.profiles)||value.profiles.length<3||
   !value.storefront||value.storefront.enabled!==true||
   !Array.isArray(value.contacts))
   throw Error('No se encontró una copia completa de la presentación.');
 const captured=Date.parse(value.captured_at);
 if(!Number.isFinite(captured)||captured>now+10*60*1000)
   throw Error('La fecha del respaldo no es válida.');
 const ids=new Set();
 for(const p of value.products){
   if(!p||!/^[A-Za-z0-9_-]{1,140}$/.test(String(p.id))||ids.has(p.id)||
     !p.name||!p.brand||!['available','sold_out'].includes(p.status)||
     typeof p.image_url!=='string'||!p.image_url.startsWith('https://'))
     throw Error('La copia tiene un producto incompleto.');
   ids.add(p.id);
 }
 if(value.profiles.filter(p=>typeof p.logo_url==='string'&&p.logo_url.startsWith('https://')).length<2)
   throw Error('La copia no conserva suficientes logotipos.');
 const banners=[value.storefront.banner_desktop_url,value.storefront.banner_mobile_url,
   ...(Array.isArray(value.storefront.banner_extra_slides)?value.storefront.banner_extra_slides.flatMap(s=>[
    s?.desktop_url,s?.mobile_url]):[])];
 if(!banners.some(url=>typeof url==='string'&&url.startsWith('https://')))
   throw Error('La copia no contiene banners de la presentación original.');
 const fresh=now-captured>=0&&now-captured<=PRICE_MAX_AGE_MS;
 return {
   products:value.products.map(p=>fresh?{...p}:{...p,emergency_fallback:true,status:'available',price_usd:null}),
   profiles:value.profiles,contacts:value.contacts,storefront:value.storefront,
   hasCatalogState:true,
   pricingEnabled:fresh&&value.pricingEnabled===true,
   customerPortalEnabled:false,
   emergencyFallback:!fresh,publicSnapshot:true,
   snapshotCapturedAt:value.captured_at
 };
}
export async function loadPublicSnapshot(request=fetch,baseUrl=new URL('./',import.meta.url)){
 const url=new URL(STATIC_SNAPSHOT_NAME,baseUrl);
 const response=await request(url.href,{headers:{Accept:'application/json'},
   signal:AbortSignal.timeout(9000),cache:'no-store'});
 if(!response.ok)throw Error('Copia pública no disponible: HTTP '+response.status);
 return validatePublicSnapshot(await response.json());
}
const LOCAL_KEY='poladent.public.catalog.verified.v1';
export function restoreLocallyVerifiedCatalog(now=Date.now()){
 try{
   const content=localStorage.getItem(LOCAL_KEY);
   if(!content)return null;
   return validatePublicSnapshot(JSON.parse(content),now);
 }catch{return null}
}
export function saveLocallyVerifiedCatalog(data,now=new Date()){
 try{
   if(!data?.hasCatalogState||!data?.storefront?.enabled||data.products?.length<200||
     data.profiles?.length<3)return false;
   const copy={
     schema:SCHEMA,captured_at:now.toISOString(),products:data.products,
     profiles:data.profiles,contacts:data.contacts||[],storefront:data.storefront,
     pricingEnabled:data.pricingEnabled===true,customerPortalEnabled:false
   };
   validatePublicSnapshot(copy,now.getTime());
   localStorage.setItem(LOCAL_KEY,JSON.stringify(copy));
   return true;
 }catch{return false}
}
