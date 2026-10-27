// Copia pública validada de la presentación REAL aprobada en Firebase.
// Nunca exporta colecciones privadas ni escribe en Firebase.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadPublicCatalog} from '../catalog-public-data.js';

export function createPublicSnapshot(data,now=new Date()){
  if(!data || !Array.isArray(data.products) || data.products.length<200 ||
    data.products.length>10000 || !data.hasCatalogState)
    throw Error('Catálogo incompleto: no se sustituye el último respaldo íntegro.');
  if(!Array.isArray(data.profiles)||data.profiles.length<3)
    throw Error('Faltan perfiles y logotipos de las marcas: conservar copia anterior.');
  const storefront=data.storefront;
  if(!storefront||typeof storefront!=='object'||storefront.enabled!==true)
    throw Error('No está disponible el diseño de portada aprobado: no publicar copia incompleta.');
  const slides=[storefront.banner_desktop_url,storefront.banner_mobile_url,
    ...(Array.isArray(storefront.banner_extra_slides)?storefront.banner_extra_slides.flatMap(s=>[
      s?.desktop_url,s?.mobile_url]):[])].filter(x=>typeof x==='string'&&x.startsWith('https://'));
  if(!slides.length)throw Error('Faltan banners originales: no se reemplaza el respaldo completo.');
  const withLogos=data.profiles.filter(p=>typeof p.logo_url==='string'&&p.logo_url.startsWith('https://')).length;
  if(withLogos<2)throw Error('Faltan logotipos de marcas: no se publica respaldo sin identidad.');
  const ids=new Set();
  const products=data.products.map(p=>{
    const id=String(p.id||''),name=String(p.name||''),brand=String(p.brand||'');
    if(!/^[A-Za-z0-9_-]{1,140}$/.test(id)||ids.has(id)||!name||!brand||
      !['available','sold_out'].includes(p.status)||typeof p.image_url!=='string'||
      !p.image_url.startsWith('https://'))
      throw Error('Hay productos incompletos o repetidos. Se conserva respaldo anterior.');
    ids.add(id);
    const value={id,name,brand,image_url:p.image_url,status:p.status};
    if(typeof p.description==='string')value.description=p.description.slice(0,4000);
    if(Number.isFinite(Number(p.sort_order)))value.sort_order=Number(p.sort_order);
    if(data.pricingEnabled===true&&p.price_usd!==null&&p.price_usd!==undefined&&p.price_usd!==''){
      const price=Number(p.price_usd);
      if(Number.isFinite(price)&&price>0&&price<=100000000&&
         Math.abs(price*100-Math.round(price*100))<0.00001)value.price_usd=price;
    }
    return value;
  });
  const profiles=data.profiles.map(p=>{
    const profile={id:String(p.id||''),name:String(p.name||'')};
    for(const key of ['logo_url','cover_url','back_cover_url','tagline','description']){
      if(typeof p[key]==='string')profile[key]=p[key];
    }
    if(Number.isFinite(Number(p.sort_order)))profile.sort_order=Number(p.sort_order);
    return profile;
  });
  const contacts=(data.contacts||[]).filter(c=>typeof c.label==='string'&&
    /^[1-9][0-9]{7,14}$/.test(c.phone)).slice(0,5).map(c=>({label:c.label,phone:c.phone}));
  // La configuración publicada del escaparate ya es legible por cualquier visitante.
  // Copiamos sus propiedades visuales y sedes; nunca volcamos otros documentos.
  const safeStorefront={...storefront};
  delete safeStorefront.admin;delete safeStorefront.secret;delete safeStorefront.apiKey;
  const welcome={
    enabled:data.welcome?.enabled===true,
    image_url:typeof data.welcome?.image_url==='string'&&data.welcome.image_url.startsWith('https://')
      ?data.welcome.image_url:'',
    mobile_image_url:typeof data.welcome?.mobile_image_url==='string'&&data.welcome.mobile_image_url.startsWith('https://')
      ?data.welcome.mobile_image_url:''
  };
  if(welcome.enabled&&!welcome.image_url)
    throw Error('Portada oficial sin imagen horizontal: no publicar copia incompleta.');
  return {schema:'poladent-public-snapshot-v1',captured_at:now.toISOString(),
    source:'catalogPublic (sólo documentos públicos de Firestore)',
    hasCatalogState:true,products,profiles,contacts,storefront:safeStorefront,welcome,
    pricingEnabled:data.pricingEnabled===true,customerPortalEnabled:false};
}
export async function savePublicSnapshot({
 root=process.cwd(),request=fetch,now=new Date()
}={}){
  const source=await readFile(resolve(root,'config.js'),'utf8');
  const apiKey=source.match(/apiKey:\s*['"]([^'"]+)['"]/)?.[1];
  const projectId=source.match(/projectId:\s*['"]([^'"]+)['"]/)?.[1];
  if(!apiKey||!projectId||projectId!=='catalogo-poladent')
    throw Error('La configuración pública no corresponde al catálogo de POLADENT.');
  const data=await loadPublicCatalog({projectId,apiKey},request);
  const safe=createPublicSnapshot(data,now);
  const target=resolve(root,'catalog-public-snapshot.json');
  const tmp=target+'.tmp';
  await writeFile(tmp,JSON.stringify(safe)+'\n','utf8');
  // Una portada liviana permite abrir la landing sin 1 lectura Firebase por visitante.
  const welcomeTarget=resolve(root,'catalog-welcome-snapshot.json');
  const welcomeTmp=welcomeTarget+'.tmp';
  const publicWelcome={schema:'poladent-welcome-snapshot-v1',
    welcome:safe.welcome,
    storefront:{enabled:safe.storefront.enabled,theme:safe.storefront.theme,
      replace_welcome:safe.storefront.replace_welcome===true}};
  await writeFile(welcomeTmp,JSON.stringify(publicWelcome)+'\n','utf8');
  await rename(welcomeTmp,welcomeTarget);
  await rename(tmp,target);
  return {count:safe.products.length,brands:safe.profiles.length,
    banners:1+(safe.storefront.banner_extra_slides||[]).length,captured_at:safe.captured_at};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const outcome=await savePublicSnapshot();
  console.log('POLADENT copia pública de la presentación completa validada:',JSON.stringify(outcome));
}
