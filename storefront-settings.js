// Diseño del escaparate: valores públicos, sin secretos ni datos personales.
// Ausente/desactivado: POLADENT conserva la portada INTERNA anterior.
export const STORE_THEMES=Object.freeze(['premium','clinica','minimalista','comercial','premium-confianza','premium-compacta']);
export const COMPACT_SECTIONS=Object.freeze(['hero','trust','catalogo','about','locations','steps','closing']);
const COMPACT_MOBILE_ORDER=Object.freeze(['hero','trust','catalogo','locations','about','steps','closing']);
const COMPACT_DESKTOP_ORDER=Object.freeze(['hero','trust','about','locations','catalogo','steps','closing']);
function compactOrder(input,defaults){
  const result=[];
  for(const item of Array.isArray(input)?input:[]){
    if(COMPACT_SECTIONS.includes(item)&&!result.includes(item))result.push(item);
  }
  for(const item of defaults)if(!result.includes(item))result.push(item);
  return result;
}
function compactHidden(input){
  return (Array.isArray(input)?input:[]).filter((v,i,a)=>v!=='catalogo'&&COMPACT_SECTIONS.includes(v)&&a.indexOf(v)===i);
}
function compactHeight(value,defaultValue,min,max){
  const n=Number(value);
  return Number.isFinite(n)&&n>=min&&n<=max?Math.round(n):defaultValue;
}
export const STORE_DEFAULTS=Object.freeze({
  enabled:false,
  replace_welcome:false,
  theme:'premium',
  compact_order_mobile:[...COMPACT_MOBILE_ORDER],
  compact_order_desktop:[...COMPACT_DESKTOP_ORDER],
  compact_hidden_mobile:[],
  compact_hidden_desktop:[],
  compact_mobile_title:'Odontología y laboratorio dental',
  compact_mobile_summary:'Visítanos en Valencia o Maracay, o solicita tu cotización por WhatsApp.',
  compact_mobile_hero_height:280,
  compact_desktop_hero_height:430,
  brand_logo_url:'',
  brand_logo_path:null,
  locations_enabled:false,
  about_enabled:true,
  about_title:'¿Por qué elegir POLADENT?',
  about_text:'En POLADENT Casa Dental trabajamos para ofrecer una experiencia de compra profesional, cercana y confiable para odontólogos y técnicos dentales. Reunimos productos para odontología y laboratorio dental, atención personalizada y la tranquilidad de contar con dos sedes oficiales donde puedes comprar directamente o retirar tu pedido.',
  benefit_items:[
    {title:'2 sedes oficiales',text:'Valencia y Maracay'},
    {title:'Compra directa',text:'Atención presencial en tienda'},
    {title:'Retiro en sucursal',text:'Mayor comodidad para tu compra'},
    {title:'Atención por WhatsApp',text:'Cotizaciones personalizadas'}
  ],
  steps_enabled:true,
  steps_title:'¿Cómo comprar en POLADENT?',
  steps:[
    {title:'Explora el catálogo',text:'Revisa nuestras marcas y productos.'},
    {title:'Elige tus productos',text:'Agrégalos a tu lista de cotización.'},
    {title:'Escríbenos o visítanos',text:'Solicita tu cotización por WhatsApp o en tienda.'},
    {title:'Compra o retira',text:'Compra directamente o retira en la sede elegida.'}
  ],
  locations_title:'Nuestras sedes oficiales',
  locations_intro:'Te atendemos en nuestras tiendas para compra directa, retiro y orientación personalizada.',
  closing_title:'Tu aliado en odontología y laboratorio dental',
  closing_text:'Visítanos en nuestras sedes oficiales o solicita atención personalizada por WhatsApp.',
  locations:[
    {name:'Poladent sede Principal Valencia',city:'Valencia, estado Carabobo',address:'Calle 137 Los Sauces, San José, edificio 137, piso 3, local 19',hours:'8:00 a. m. – 5:00 p. m.',phone:'584226710634',rif:'J-401910769',photo_url:''},
    {name:'Poladent sede Maracay',city:'Maracay, estado Aragua',address:'Torre Sindoni, PB, local N13',hours:'8:00 a. m. – 5:00 p. m.',phone:'584226710634',rif:'J-401910769',photo_url:''}
  ],
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
function safeCards(items,defaults){
  return defaults.map((item,i)=>({
    title:bounded(Array.isArray(items)?items[i]?.title:null,80,item.title),
    text:bounded(Array.isArray(items)?items[i]?.text:null,160,item.text)
  }));
}
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
    replace_welcome:s.replace_welcome===true&&['premium-confianza','premium-compacta'].includes(s.theme),
    theme:STORE_THEMES.includes(s.theme)?s.theme:STORE_DEFAULTS.theme,
    compact_order_mobile:compactOrder(s.compact_order_mobile,COMPACT_MOBILE_ORDER),
    compact_order_desktop:compactOrder(s.compact_order_desktop,COMPACT_DESKTOP_ORDER),
    compact_hidden_mobile:compactHidden(s.compact_hidden_mobile),
    compact_hidden_desktop:compactHidden(s.compact_hidden_desktop),
    compact_mobile_title:bounded(s.compact_mobile_title,95,STORE_DEFAULTS.compact_mobile_title),
    compact_mobile_summary:bounded(s.compact_mobile_summary,180,STORE_DEFAULTS.compact_mobile_summary),
    compact_mobile_hero_height:compactHeight(s.compact_mobile_hero_height,280,230,440),
    compact_desktop_hero_height:compactHeight(s.compact_desktop_hero_height,430,310,620),
    brand_logo_url:secureBannerURL(s.brand_logo_url,allowBlob),
    brand_logo_path:typeof s.brand_logo_path==='string'?s.brand_logo_path:null,
    locations_enabled:s.locations_enabled===true,
    about_enabled:s.about_enabled!==false,
    about_title:bounded(s.about_title,90,STORE_DEFAULTS.about_title),
    about_text:bounded(s.about_text,900,STORE_DEFAULTS.about_text),
    benefit_items:safeCards(s.benefit_items,STORE_DEFAULTS.benefit_items),
    steps_enabled:s.steps_enabled!==false,
    steps_title:bounded(s.steps_title,90,STORE_DEFAULTS.steps_title),
    steps:safeCards(s.steps,STORE_DEFAULTS.steps),
    locations_title:bounded(s.locations_title,90,STORE_DEFAULTS.locations_title),
    locations_intro:bounded(s.locations_intro,240,STORE_DEFAULTS.locations_intro),
    closing_title:bounded(s.closing_title,130,STORE_DEFAULTS.closing_title),
    closing_text:bounded(s.closing_text,300,STORE_DEFAULTS.closing_text),
    locations:(Array.isArray(s.locations)?s.locations:STORE_DEFAULTS.locations).slice(0,8).map((entry,i)=>{
      const fallback=STORE_DEFAULTS.locations[i]||{};
      const phone=String(entry?.phone||fallback.phone||'').replace(/\D/g,'');
      return {
        name:bounded(entry?.name,90,fallback.name||'Sucursal POLADENT'),
        city:bounded(entry?.city,90,fallback.city||''),
        address:bounded(entry?.address,240,fallback.address||''),
        hours:bounded(entry?.hours,90,fallback.hours||''),
        phone:/^[1-9][0-9]{7,14}$/.test(phone)?phone:'',
        rif:bounded(entry?.rif,40,fallback.rif||''),
        photo_url:secureBannerURL(entry?.photo_url,allowBlob)
      };
    }),
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