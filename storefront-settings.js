// Diseño del escaparate: valores públicos, sin secretos ni datos personales.
// Ausente/desactivado: POLADENT conserva la portada INTERNA anterior.
export const STORE_DEFAULTS=Object.freeze({
  enabled:false,
  eyebrow:'CATÁLOGO PARA PROFESIONALES',
  title:'Todo en odontología y laboratorio dental',
  subtitle:'Descubre nuestras marcas, selecciona tus productos y solicita una cotización por WhatsApp.',
  primary_label:'Explorar marcas',
  secondary_label:'Buscar productos',
  featured_title:'Marcas para descubrir',
  brands_title:'Explora todas nuestras marcas',
  trust_items:['Equipos e insumos dentales','Cotización por WhatsApp','Atención personalizada'],
  featured_brands:['ADALTA','EASYINSMILE','IMODONTO'],
  banner_desktop_url:'',
  banner_desktop_path:null,
  banner_mobile_url:'',
  banner_mobile_path:null
});
function bounded(text,max,fallback='') {
  const s=String(text??'').replace(/[\u0000-\u001F\u007F]+/g,' ').replace(/\s+/g,' ').trim();
  return s.length<=max&&s?s:fallback;
}
export function secureBannerURL(value,allowBlob=false) {
  if(!value)return '';
  try{
    const url=new URL(String(value));
    if(url.protocol==='https:' && url.hostname && !url.username && !url.password)return url.href;
    if(allowBlob&&url.protocol==='blob:')return url.href;
    return '';
  }catch{return ''}
}
export function normalizeStorefront(input={},allowBlob=false) {
  const s=input&&typeof input==='object'?input:{};
  const list=Array.isArray(s.trust_items)?s.trust_items:STORE_DEFAULTS.trust_items;
  const trust_items=list.slice(0,3).map((x,i)=>bounded(x,75,STORE_DEFAULTS.trust_items[i]));
  while(trust_items.length<3)trust_items.push(STORE_DEFAULTS.trust_items[trust_items.length]);
  const brands=Array.isArray(s.featured_brands)?s.featured_brands:STORE_DEFAULTS.featured_brands;
  const featured_brands=[...new Set(brands.slice(0,4).map(x=>bounded(x,80)).filter(Boolean))];
  return {
    enabled:s.enabled===true,
    eyebrow:bounded(s.eyebrow,60,STORE_DEFAULTS.eyebrow),
    title:bounded(s.title,120,STORE_DEFAULTS.title),
    subtitle:bounded(s.subtitle,250,STORE_DEFAULTS.subtitle),
    primary_label:bounded(s.primary_label,36,STORE_DEFAULTS.primary_label),
    secondary_label:bounded(s.secondary_label,36,STORE_DEFAULTS.secondary_label),
    featured_title:bounded(s.featured_title,65,STORE_DEFAULTS.featured_title),
    brands_title:bounded(s.brands_title,65,STORE_DEFAULTS.brands_title),
    trust_items,featured_brands,
    banner_desktop_url:secureBannerURL(s.banner_desktop_url,allowBlob),
    banner_mobile_url:secureBannerURL(s.banner_mobile_url,allowBlob),
    banner_desktop_path:typeof s.banner_desktop_path==='string'?s.banner_desktop_path:null,
    banner_mobile_path:typeof s.banner_mobile_path==='string'?s.banner_mobile_path:null
  };
}