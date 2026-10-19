// Portada de confianza POLADENT. Configuración aislada del catálogo y de la portada antigua.
// Ningún ajuste se muestra a los clientes hasta publicar explícitamente.
const DEFAULT_BRANCHES=[
  {id:'valencia',name:'Poladent sede Principal Valencia',city:'Valencia, estado Carabobo',
   address:'Calle 137 Los Sauces, San José, edificio 137, piso 3, local 19',
   rif:'J-401910769',hours:'8:00 a. m. – 5:00 p. m.',phone:'584226710634',
   direct_purchase:true,pickup:true,visible:true,photos:[]},
  {id:'maracay',name:'Poladent sede Maracay',city:'Maracay, estado Aragua',
   address:'Torre Sindoni, planta baja, local N13',rif:'J-401910769',
   hours:'8:00 a. m. – 5:00 p. m.',phone:'584226710634',
   direct_purchase:true,pickup:true,visible:true,photos:[]}
];
export const TRUST_HOME_STYLES=Object.freeze(['premium','clinica','minimalista','comercial']);
export const TRUST_HOME_DEFAULTS={
  enabled:false,style:'premium',eyebrow:'POLADENT CASA DENTAL',
  title:'Todo para odontología y laboratorio dental',
  subtitle:'2 sedes oficiales para compra directa y atención personalizada. Explora nuestros productos, visítanos o solicita una cotización por WhatsApp.',
  hero_image_url:'',hero_image_path:null,logo_url:'',logo_path:null,
  section_title:'Nuestras sedes oficiales',
  section_subtitle:'Conoce nuestras tiendas físicas en Valencia y Maracay.',
  show_branches:true,show_benefits:true,show_steps:true,show_contact:true,
  benefits:['2 sedes oficiales','Compra directa en tienda','Retiro en sucursal','Atención personalizada'],
  steps:['Explora nuestras marcas y productos','Visítanos o escríbenos por WhatsApp','Confirma disponibilidad con nuestro equipo','Compra o retira en una sede oficial'],
  closing_title:'Tu aliado en odontología y laboratorio dental',
  closing_text:'Visítanos en Valencia o Maracay y recibe atención personalizada.',
  branches:DEFAULT_BRANCHES
};
const text=(v,max,fallback='')=>{
  const s=String(v??'').replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim();
  return s.length>max?fallback:(s||fallback);
};
const safeImage=(v,allowBlob=false)=>{
  if(!v)return '';
  try{
    const url=new URL(String(v));
    if(url.protocol==='https:'&&!url.username&&!url.password)return url.href;
    if(allowBlob&&url.protocol==='blob:'&&url.origin!=='null')return url.href;
  }catch{}
  return '';
};
const path=v=>typeof v==='string'&&v.length<=300?v:null;
export function normalizeTrustHome(raw={},allowBlob=false){
  const input=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const list=Array.isArray(input.branches)?input.branches:DEFAULT_BRANCHES;
  const branches=list.slice(0,6).map((b,i)=>{
    const obj=b&&typeof b==='object'?b:{};
    const photos=Array.isArray(obj.photos)?obj.photos.slice(0,3):[];
    return {
      id:text(obj.id,55,'sede-'+(i+1)).replace(/[^a-zA-Z0-9_-]/g,'-'),
      name:text(obj.name,85,'Sede '+(i+1)),city:text(obj.city,75),
      address:text(obj.address,200),rif:text(obj.rif,32),
      hours:text(obj.hours,85),phone:String(obj.phone||'').replace(/\D/g,'').slice(0,15),
      direct_purchase:obj.direct_purchase!==false,pickup:obj.pickup!==false,visible:obj.visible!==false,
      photos:photos.map(p=>({url:safeImage(p?.url,allowBlob),path:path(p?.path)}))
        .filter(p=>Boolean(p.url))
    };
  });
  return {
    enabled:input.enabled===true,
    style:TRUST_HOME_STYLES.includes(input.style)?input.style:'premium',
    eyebrow:text(input.eyebrow,60,TRUST_HOME_DEFAULTS.eyebrow),
    title:text(input.title,120,TRUST_HOME_DEFAULTS.title),
    subtitle:text(input.subtitle,300,TRUST_HOME_DEFAULTS.subtitle),
    hero_image_url:safeImage(input.hero_image_url,allowBlob),
    hero_image_path:path(input.hero_image_path),
    logo_url:safeImage(input.logo_url,allowBlob),logo_path:path(input.logo_path),
    section_title:text(input.section_title,80,TRUST_HOME_DEFAULTS.section_title),
    section_subtitle:text(input.section_subtitle,180,TRUST_HOME_DEFAULTS.section_subtitle),
    show_branches:input.show_branches!==false,
    show_benefits:input.show_benefits!==false,
    show_steps:input.show_steps!==false,
    show_contact:input.show_contact!==false,
    benefits:(Array.isArray(input.benefits)?input.benefits:TRUST_HOME_DEFAULTS.benefits)
      .slice(0,4).map((v,i)=>text(v,70,TRUST_HOME_DEFAULTS.benefits[i])),
    steps:(Array.isArray(input.steps)?input.steps:TRUST_HOME_DEFAULTS.steps)
      .slice(0,4).map((v,i)=>text(v,100,TRUST_HOME_DEFAULTS.steps[i])),
    closing_title:text(input.closing_title,110,TRUST_HOME_DEFAULTS.closing_title),
    closing_text:text(input.closing_text,210,TRUST_HOME_DEFAULTS.closing_text),
    branches
  };
}
export function validateTrustHomeForPublish(raw){
  const data=normalizeTrustHome(raw);
  const seen=new Set();
  if(data.show_branches&&!data.branches.some(b=>b.visible))throw Error('Debes mostrar al menos una sede.');
  for(const branch of data.branches){
    if(!branch.visible)continue;
    if(!branch.name||!branch.city||!branch.address)throw Error('Completa el nombre, ciudad y dirección de cada sede visible.');
    if(!branch.photos.length)throw Error('Sube al menos una foto real de '+branch.name+' antes de publicar.');
    if(!/^[1-9][0-9]{7,14}$/.test(branch.phone))throw Error('Verifica el WhatsApp de '+branch.name+'.');
    if(seen.has(branch.id))throw Error('Cada sede necesita un identificador diferente.');
    seen.add(branch.id);
  }
  return data;
}
