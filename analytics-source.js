// POLADENT: clasificación mínima de canales, sin cookies ni identificadores.
// Se codifica dentro del campo "brand" YA existente para no cambiar reglas ni
// añadir lecturas/escrituras de Firebase a las estadísticas actuales.
export const ANALYTICS_SOURCES=[
  {id:'google',label:'Google (búsqueda/Maps)'},
  {id:'instagram',label:'Instagram'},
  {id:'facebook',label:'Facebook'},
  {id:'qr',label:'QR identificado'},
  {id:'whatsapp',label:'Enlace de WhatsApp'},
  {id:'otros',label:'Otros sitios'},
  {id:'sin_identificar',label:'Sin identificar / enlace directo'}
];
const SOURCE_IDS=new Set(ANALYTICS_SOURCES.map(s=>s.id));
const TAG='|origen:';

export function classifyCatalogSource(address,referrer=''){
  try{
    const url=new URL(address,'https://catalogopoladent.com/');
    const declared=String(url.searchParams.get('utm_source')||'').trim().toLowerCase();
    const medium=String(url.searchParams.get('utm_medium')||'').trim().toLowerCase();
    // Sólo fuentes conocidas. Cualquier etiqueta desconocida queda en "Otros".
    if(declared){
      if(['qr','codigo-qr','codigo_qr'].includes(declared))return 'qr';
      if(['instagram','ig'].includes(declared))return 'instagram';
      if(['facebook','fb','meta'].includes(declared))return 'facebook';
      if(['google','google_maps','googlemaps','gmb'].includes(declared))return 'google';
      if(['whatsapp','wa'].includes(declared))return 'whatsapp';
      return 'otros';
    }
    // La mayoría de navegadores no informa si un acceso directo proviene de QR
    // impreso. Nunca atribuir automáticamente un QR antiguo.
    if(medium==='offline'&&url.searchParams.get('origen')==='qr')return 'qr';
    if(!referrer)return 'sin_identificar';
    const other=new URL(referrer);
    if(!['https:','http:'].includes(other.protocol))return 'sin_identificar';
    const hostname=other.hostname.toLowerCase().replace(/\.$/,'');
    if(hostname==='catalogopoladent.com'||hostname==='www.catalogopoladent.com'||
       hostname==='polandent223.github.io')return 'sin_identificar';
    if(/(^|\.)google\.[a-z.]+$/.test(hostname)||hostname==='maps.app.goo.gl')return 'google';
    if(hostname==='instagram.com'||hostname.endsWith('.instagram.com'))return 'instagram';
    if(hostname==='facebook.com'||hostname.endsWith('.facebook.com')||
       hostname==='fb.com'||hostname.endsWith('.fb.com'))return 'facebook';
    if(hostname==='wa.me'||hostname==='web.whatsapp.com'||
       hostname==='api.whatsapp.com')return 'whatsapp';
    return 'otros';
  }catch{return 'sin_identificar';}
}

// No cambiar el nombre real de la marca en el panel ni en el ranking de productos.
export function encodeBrandSource(brand,source){
  const name=String(brand||'').trim().slice(0,80);
  if(!SOURCE_IDS.has(source)||source==='sin_identificar')return name;
  const suffix=TAG+source;
  if(name.length+suffix.length>80)return name; // Mantener límite Firestore.
  return name+suffix;
}
export function decodeBrandSource(value){
  const raw=String(value||'');
  const pos=raw.lastIndexOf(TAG);
  if(pos<0)return {brand:raw.trim(),source:'sin_identificar'};
  const source=raw.slice(pos+TAG.length);
  if(!SOURCE_IDS.has(source))return {brand:raw.trim(),source:'sin_identificar'};
  return {brand:raw.slice(0,pos).trim(),source};
}

export function campaignURL(source){
  if(!['instagram','facebook','qr','whatsapp','google'].includes(source))
    throw Error('Canal de campaña no reconocido.');
  const url=new URL('https://catalogopoladent.com/');
  url.searchParams.set('utm_source',source);
  url.searchParams.set('utm_medium',source==='qr'?'offline':source==='google'?'local':'social');
  return url.href;
}
