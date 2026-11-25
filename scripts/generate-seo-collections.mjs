// Colecciones SEO POLADENT. Se generan desde el respaldo PÚBLICO; jamás contienen USD.
import {readFile,mkdir,writeFile,rename,rm} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
export const SITE='https://catalogopoladent.com/';
const categories=[
 {id:'instrumental',title:'Instrumental odontológico',intro:'Explora instrumentos para consulta y procedimientos odontológicos publicados en nuestro catálogo.'},
 {id:'laboratorio',title:'Materiales de laboratorio dental',intro:'Conoce productos para trabajos de laboratorio dental y solicita información a nuestras sedes.'},
 {id:'restauracion',title:'Materiales de restauración dental',intro:'Revisa materiales odontológicos de restauración y accede a las fichas de cada producto.'},
 {id:'equipos',title:'Equipos para odontología y laboratorio',intro:'Explora equipos para consultorio y laboratorio dental con fotografías y fichas de los productos.'},
 {id:'endodoncia',title:'Productos para endodoncia',intro:'Encuentra productos de endodoncia clasificados en el catálogo de POLADENT.'},
 {id:'ortodoncia',title:'Materiales para ortodoncia',intro:'Consulta productos relacionados con ortodoncia y solicita una cotización a POLADENT.'}
];
const html=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const safeJson=x=>JSON.stringify(x).replace(/</g,'\\u003c').replace(/>/g,'\\u003e');
const slug=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);
function validImage(raw){try{const u=new URL(raw);return u.protocol==='https:'?u.href:'';}catch{return '';}}
function linkToProduct(p){
 const url=new URL(SITE);url.searchParams.set('marca',p.brand);
 url.hash='producto='+encodeURIComponent(p.id);return url.href;
}
function contactLinks(snapshot,title){
 const locations=Array.isArray(snapshot.storefront?.locations)?snapshot.storefront.locations:[];
 return locations.filter(p=>/^58[0-9]{9,12}$/.test(String(p.phone||''))&&
 /valencia|maracay/i.test(String(p.city||''))).slice(0,2).map(p=>{
  const city=/valencia/i.test(p.city)?'Valencia':'Maracay';
  const message='Hola, quisiera consultar los productos de '+title+' en POLADENT.';
  const url='https://wa.me/'+p.phone+'?text='+encodeURIComponent(message);
  return '<a class="whatsapp" href="'+html(url)+'" target="_blank" rel="noopener noreferrer">WhatsApp '+city+'</a>';
 }).join('\n');
}
const style=[
 '*,*::before,*::after{box-sizing:border-box}',
 'body{margin:0;background:linear-gradient(130deg,#f5faff,#fff 48%,#f5f9fd);color:#153651;font:15px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}',
 'a{color:inherit}.top{background:#0a2e4e;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:16px max(20px,calc((100vw - 1080px)/2))}',
 '.logo{font-size:21px;font-weight:900;line-height:1.08;text-decoration:none;letter-spacing:.04em}.logo small{display:block;font-size:10px;letter-spacing:.13em}',
 '.top nav a{color:#d8ecfa;text-decoration:none;font-weight:700}',
 'main{max-width:1080px;margin:0 auto;padding:34px 20px 64px}.crumb{font-size:12px;color:#587891;margin-bottom:26px}',
 '.eyebrow{font-size:11px;letter-spacing:.14em;color:#187895;font-weight:800;text-transform:uppercase}',
 'h1{font-size:clamp(30px,4.6vw,46px);line-height:1.12;letter-spacing:-.04em;margin:7px 0 18px}',
 '.lead{font-size:16px;color:#45677f;max-width:750px;line-height:1.75}',
 '.button{display:inline-block;background:#0d5680;color:#fff;border-radius:10px;padding:12px 19px;font-weight:800;text-decoration:none;margin:12px 10px 8px 0}',
 '.button.secondary{background:#e6f2f8;color:#155174}',
 'h2{font-size:22px;letter-spacing:-.03em}.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px}',
 '.card{min-width:0;border:1px solid #dae8f0;border-radius:14px;background:#fff;overflow:hidden}',
 '.card a{display:flex;flex-direction:column;padding:12px;height:100%;text-decoration:none}',
 '.card img{width:100%;height:172px;object-fit:contain;background:#f6fafc;border-radius:7px}',
 '.brand{font-size:11px;font-weight:800;color:#277b99;margin-top:9px}',
 '.card h3{font-size:15px;line-height:1.38;margin:5px 0 8px}',
 '.card p{font-size:12px;color:#537088;margin:0 0 10px;flex:1}',
 '.card .view{margin-top:auto;font-size:12px;font-weight:800;color:#16718e}',
 'aside{background:#edf6fb;border:1px solid #cfe4ef;border-radius:16px;margin-top:36px;padding:23px}',
 'aside p{color:#466982}.whatsapp{display:inline-block;background:#127449;color:#fff;text-decoration:none;padding:12px 17px;border-radius:9px;font-weight:800;margin:0 10px 10px 0}',
 'footer{border-top:1px solid #dce7ef;padding:25px 20px;text-align:center;color:#557087;font-size:12px}',
 '@media(max-width:800px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.top{padding:16px 20px}}',
 '@media(max-width:450px){main{padding:23px 14px 40px}.card a{padding:9px}.card img{height:128px}.cards{gap:10px}.button{display:block;text-align:center;margin-right:0}}'
].join('\n');
function collectionHTML(snapshot,path,title,intro,products,kind){
 const url=SITE+path;
 const meta=(title+' en POLADENT Casa Dental. Consulta productos para consultorio y laboratorio dental en Valencia y Maracay.').slice(0,155);
 const cards=products.slice(0,18).map(p=>{
  const desc=String(p.description||'').trim().replace(/\s+/g,' ').slice(0,165);
  return [
   '<article class="card"><a href="'+html(linkToProduct(p))+'">',
   '<img src="'+html(validImage(p.image_url))+'" alt="'+html(p.name)+'" width="260" height="205" loading="lazy">',
   '<span class="brand">'+html(p.brand)+'</span><h3>'+html(p.name)+'</h3>',
   desc?'<p>'+html(desc)+'</p>':'',
   '<span class="view">Ver ficha y consultar</span></a></article>'
  ].join('');
 }).join('\n');
 const crumbs={ '@context':'https://schema.org','@type':'BreadcrumbList',
  itemListElement:[{'@type':'ListItem',position:1,name:'POLADENT Casa Dental',item:SITE},
   {'@type':'ListItem',position:2,name:title,item:url}]};
 return [
 '<!doctype html><html lang="es-VE"><head>',
 '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<title>'+html(title+' | POLADENT Casa Dental')+'</title>',
 '<meta name="description" content="'+html(meta)+'">',
 '<meta name="robots" content="index,follow,max-image-preview:large">',
 '<link rel="canonical" href="'+html(url)+'">',
 '<meta property="og:type" content="website">',
 '<meta property="og:site_name" content="POLADENT Casa Dental">',
 '<meta property="og:locale" content="es_VE">',
 '<meta property="og:title" content="'+html(title+' | POLADENT')+'">',
 '<meta property="og:description" content="'+html(meta)+'">',
 '<meta property="og:url" content="'+html(url)+'">',
 '<script type="application/ld+json">'+safeJson(crumbs)+'</script>',
 '<style>'+style+'</style></head><body>',
 '<header class="top"><a class="logo" href="'+SITE+'">POLADENT<small>CASA DENTAL</small></a>',
 '<nav><a href="'+SITE+'">Catálogo completo</a></nav></header>',
 '<main><div class="crumb"><a href="'+SITE+'">Inicio</a> / '+(kind==='marca'?'Marcas':'Especialidades')+' / '+html(title)+'</div>',
 '<section class="hero"><p class="eyebrow">POLADENT · Valencia y Maracay</p>',
 '<h1>'+html(title)+'</h1><p class="lead">'+html(intro)+'</p>',
 '<p class="lead"><strong>'+products.length+' productos en esta colección.</strong> Consulta los precios y la disponibilidad actuales en el catálogo.</p>',
 '<a class="button" href="'+SITE+'">Entrar al catálogo y cotizar</a>',
 '<a class="button secondary" href="'+SITE+'#product-search">Buscar otros productos</a></section>',
 '<section aria-label="Productos de la colección"><h2>Explora una selección de productos</h2>',
 '<div class="cards">'+cards+'</div></section>',
 '<aside><h2>¿Necesitas una cotización?</h2>',
 '<p>POLADENT Casa Dental atiende consultas para consultorio y laboratorio. Confirma montos y existencia antes de comprar.</p>',
 contactLinks(snapshot,title),
 '<p>También puedes <a href="'+SITE+'">agregar varios productos a una sola cotización</a> desde el catálogo, sin crear una cuenta.</p>',
 '</aside></main>',
 // El visitante puede descubrir esta colección en Google, Instagram u otro sitio
 // y luego abrir una ficha en el catálogo. Pasar SOLO el nombre de canal al
 // siguiente enlace: no cookies, no identificadores ni URL de procedencia.
 '<script type="module">',
 "import {classifyCatalogSource} from '../../../analytics-source.js';",
 "const origin=classifyCatalogSource(location.href,document.referrer);",
 "if(origin!=='sin_identificar')for(const anchor of document.querySelectorAll('a[href]')){",
 "const url=new URL(anchor.href);",
 "if(url.hostname==='catalogopoladent.com'&&url.pathname==='/'&&!url.searchParams.has('utm_source')){",
 "url.searchParams.set('utm_source',origin);",
 "url.searchParams.set('utm_medium','referral');anchor.href=url.href;",
 "}}",
 '</script>',
 '<footer>POLADENT Casa Dental · Valencia y Maracay, Venezuela · ',
 '<a href="'+SITE+'">Catálogo oficial</a></footer></body></html>'
 ].join('\n');
}
export function buildSEOCollections(snapshot){
 if(snapshot?.schema!=='poladent-public-snapshot-v1'||
 !Array.isArray(snapshot.products)||snapshot.products.length<200||
 !Array.isArray(snapshot.profiles)||snapshot.profiles.length<3||
 !Array.isArray(snapshot.contacts)||snapshot.storefront?.enabled!==true)
  throw Error('No hay una copia pública completa: no actualizar páginas SEO.');
 const products=snapshot.products.filter(p=>p&&/^[A-Za-z0-9_-]{1,140}$/.test(String(p.id||''))&&
  ['available','sold_out'].includes(p.status)&&p.name&&p.brand&&validImage(p.image_url));
 if(products.length<200)throw Error('La colección pública está incompleta.');
 const pages=new Map();
 for(const cat of categories){
  const selected=products.filter(p=>p.area_id===cat.id);
  if(selected.length>=5){
   const path='colecciones/categorias/'+cat.id+'/';
   pages.set(path+'index.html',collectionHTML(snapshot,path,cat.title,cat.intro,selected,'categoria'));
  }
 }
 const generic=new Set(['EQUIPOS VARIADOS','PRODUCTOS VARIADOS']);
 for(const profile of snapshot.profiles){
  const brand=String(profile?.name||'').trim();
  if(!brand||generic.has(brand.toUpperCase()))continue;
  const selected=products.filter(p=>p.brand===brand);
  if(selected.length<4)continue;
  const nameSlug=slug(brand);if(!nameSlug)continue;
  const title='Productos '+brand+' para odontología';
  const intro='Conoce productos de '+brand+' publicados en el catálogo profesional de POLADENT. Revisa las fichas y consulta con nuestras sedes en Valencia y Maracay.';
  const path='colecciones/marcas/'+nameSlug+'/';
  pages.set(path+'index.html',collectionHTML(snapshot,path,title,intro,selected,'marca'));
 }
 if(pages.size<10)throw Error('Se detectaron menos colecciones que las esperadas.');
 const urls=[SITE,SITE+'adalta.html',...Array.from(pages.keys()).map(x=>SITE+x.replace(/index\.html$/,''))];
 const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n'+
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
  urls.map(url=>'  <url><loc>'+html(url)+'</loc></url>').join('\n')+'\n</urlset>\n';
 return {pages,sitemap,urls};
}
export async function writeSEOCollections(root,snapshot){
 const output=join(root,'colecciones'),stage=join(root,'.seo-collections-stage');
 const result=buildSEOCollections(snapshot);
 await rm(stage,{recursive:true,force:true});await mkdir(stage,{recursive:true});
 try{
  for(const [path,content] of result.pages){
   const file=join(stage,path.slice('colecciones/'.length));
   await mkdir(dirname(file),{recursive:true});
   await writeFile(file,content,'utf8');
  }
  await rm(output,{recursive:true,force:true});
  await rename(stage,output);
  await writeFile(join(root,'sitemap.xml'),result.sitemap,'utf8');
 }catch(error){await rm(stage,{recursive:true,force:true});throw error;}
 return result;
}
const main=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){
 const root=process.cwd();
 const snapshot=JSON.parse(await readFile(join(root,'catalog-public-snapshot.json'),'utf8'));
 const age=Date.now()-Date.parse(snapshot.captured_at);
 if(!Number.isFinite(age)||age< -10*60*1000||age>24*60*60*1000)
  throw Error('El respaldo público tiene más de 24 horas. Se conservan las páginas SEO anteriores.');
 const result=await writeSEOCollections(root,snapshot);
 console.log('POLADENT SEO: '+result.pages.size+' colecciones verificadas; '+result.urls.length+' URLs en sitemap.');
}
