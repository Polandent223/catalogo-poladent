// Lectura pública ligera de Firestore: el escaparate no necesita cargar Auth,
// Storage ni el SDK de administración de Firebase. No utiliza claves privadas.
const allowedStatuses = new Set(['available', 'sold_out']);

export function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue?.values || []).map(decodeFirestoreValue);
  if ('mapValue' in value) {
    return Object.fromEntries(Object.entries(value.mapValue?.fields || {}).map(([name, entry]) => [name, decodeFirestoreValue(entry)]));
  }
  return null;
}
export function parseCatalogDocuments(documents) {
  const products=[], profiles=[];
  let contacts=[], hasCatalogState=false, storefront=null,trustHome=null;
  for (const document of documents || []) {
    const id = String(document.name || '').split('/').pop();
    const data = Object.fromEntries(Object.entries(document.fields || {}).map(([name, value]) => [name, decodeFirestoreValue(value)]));
    if (id === '_catalog_state') { hasCatalogState=true; continue; }
    if (id === '_catalog_contacts' && data.kind === 'contact_settings') {
      storefront=data.storefront && typeof data.storefront==='object'?data.storefront:null;
      trustHome=data.trust_home && typeof data.trust_home==='object'?data.trust_home:null;
      contacts = (Array.isArray(data.contacts) ? data.contacts : []).filter(c =>
        typeof c?.label === 'string' && typeof c?.phone === 'string' && /^[1-9][0-9]{7,14}$/.test(c.phone))
        .slice(0,5).map(c=>({label:c.label.slice(0,55),phone:c.phone}));
      continue;
    }
    if (data.kind === 'brand_profile' && typeof data.name === 'string') {
      profiles.push({ id,...data }); continue;
    }
    // Nunca presentar tareas internas ni productos ocultos a los clientes.
    if (data.kind || !allowedStatuses.has(data.status) || !data.name || !data.brand || !data.image_url) continue;
    products.push({ id,...data });
  }
  products.sort((a,b)=>String(a.brand).localeCompare(String(b.brand),'es')
    || (Number(a.sort_order)||0)-(Number(b.sort_order)||0)
    || String(a.name).localeCompare(String(b.name),'es'));
  profiles.sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)
    || String(a.name).localeCompare(String(b.name),'es'));
  return {products,profiles,contacts,hasCatalogState,storefront,trustHome};
}
export async function loadPublicCatalog(config, request=fetch) {
  if (!config?.projectId || !config?.apiKey) throw Error('Falta la configuración de Firebase.');
  const projectId=encodeURIComponent(config.projectId);
  const key=config.apiKey;
  const documents=[];
  let pageToken='';
  // Paginación de Firestore: evita dejar productos fuera al superar 200.
  for(let page=0;page<100;page++){
    const url=new URL('https://firestore.googleapis.com/v1/projects/'+projectId+'/databases/(default)/documents/catalogPublic');
    url.searchParams.set('pageSize','200');
    url.searchParams.set('key',key);
    if (pageToken) url.searchParams.set('pageToken',pageToken);
    const response=await request(url.href, {headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000),cache:'no-store'});
    if(!response.ok)throw Error('No pudimos consultar el catálogo ('+response.status+').');
    const data=await response.json();
    documents.push(...(data.documents || []));
    pageToken=data.nextPageToken || '';
    if (!pageToken) return parseCatalogDocuments(documents);
  }
  throw Error('El catálogo tiene demasiadas páginas para esta consulta.');
}
