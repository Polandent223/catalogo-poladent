// POLADENT: actualizar solo los destacados en la copia pública.
// No lee todos los productos de Firestore ni cambia precios, inventario o su antigüedad.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodeFirestoreValue} from '../catalog-public-data.js';
import {normalizeStorefront} from '../storefront-settings.js';

const FIELDS=['featured_products_enabled','featured_products_title',
  'featured_product_ids','featured_products_include_sold_out'];

export function mergePublicHighlights(snapshot,publicDocument){
 if(snapshot?.schema!=='poladent-public-snapshot-v1'||snapshot.storefront?.enabled!==true||
   !Array.isArray(snapshot.products)||snapshot.products.length<200)
   throw Error('No se modificará una copia pública incompleta.');
 const fields=publicDocument?.fields;
 if(!fields||fields.kind?.stringValue!=='contact_settings'||!fields.storefront)
   throw Error('No se encontró el documento público del diseño comercial.');
 const latest=decodeFirestoreValue(fields.storefront);
 if(!latest||typeof latest!=='object'||Array.isArray(latest)||
   typeof latest.featured_products_enabled!=='boolean'||
   !Array.isArray(latest.featured_product_ids))
   throw Error('Los ajustes de destacados están incompletos; no se sobrescribe la selección guardada.');
 const normalized=normalizeStorefront(latest);
 // Si se activaron, confirmar que la copia estática contiene productos reales.
 // De lo contrario, no sustituir un respaldo con una selección incompleta.
 const ids=normalized.featured_product_ids;
 const known=new Set(snapshot.products.filter(p=>['available','sold_out'].includes(p?.status))
   .map(p=>String(p.id)));
 if(normalized.featured_products_enabled&&ids.some(id=>!known.has(id)))
   throw Error('Algunos productos destacados aún no están en la copia pública; se conserva la selección anterior.');
 const merged={...snapshot,storefront:{...snapshot.storefront}};
 for(const key of FIELDS)merged.storefront[key]=normalized[key];
 const changed=FIELDS.some(key=>
   JSON.stringify(snapshot.storefront[key])!==JSON.stringify(merged.storefront[key]));
 // Es importante NO renovar captured_at: evita certificar existencias o precios viejos.
 return {changed,snapshot:merged,highlighted:ids.length,known:ids.filter(id=>known.has(id)).length};
}

export async function syncPublicHighlights({root=process.cwd(),request=fetch}={}){
 const config=await readFile(resolve(root,'config.js'),'utf8');
 const apiKey=config.match(/apiKey:\s*['"]([^'"]+)['"]/)?.[1];
 const projectId=config.match(/projectId:\s*['"]([^'"]+)['"]/)?.[1];
 if(!apiKey||projectId!=='catalogo-poladent')throw Error('Configuración Firebase ajena a POLADENT.');
 const url=new URL('https://firestore.googleapis.com/v1/projects/'+
   encodeURIComponent(projectId)+'/databases/(default)/documents/catalogPublic/_catalog_contacts');
 url.searchParams.set('key',apiKey);
 const response=await request(url.href,{headers:{Accept:'application/json'},
   signal:AbortSignal.timeout(14000),cache:'no-store'});
 if(response.status===429)return {updated:false,deferred:true,
   reason:'Firebase limita temporalmente las consultas (429); el respaldo permanece intacto.'};
 if(!response.ok)throw Error('No se pudo leer el único documento público de destacados (HTTP '+response.status+').');
 const document=await response.json();
 const file=resolve(root,'catalog-public-snapshot.json');
 const previous=JSON.parse(await readFile(file,'utf8'));
 const merged=mergePublicHighlights(previous,document);
 if(merged.changed){
   const temp=file+'.tmp';
   await writeFile(temp,JSON.stringify(merged.snapshot)+'\n','utf8');
   await rename(temp,file);
 }
 return {updated:merged.changed,highlighted:merged.highlighted,
   foundInSnapshot:merged.known,productsUnchanged:merged.snapshot.products.length};
}
const own=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(own){
 const outcome=await syncPublicHighlights();
 console.log('POLADENT destacados públicos:',JSON.stringify(outcome));
}
