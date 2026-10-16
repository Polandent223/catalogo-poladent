// Genera HTML estático con Open Graph para previsualizaciones individuales de WhatsApp.
// Lee exclusivamente catalogPublic (Firestore) que ya es público; sin credenciales privadas.
import {readFile, mkdir, writeFile, readdir, rm} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const site='https://polandent223.github.io/catalogo-poladent/';
const publicUrl=new URL('share/',site).href;
const output=join(process.cwd(),'share');
const project='catalogo-poladent';
function escapeHTML(value) {
  return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function asString(field) {return field?.stringValue??'';}
function validUrl(value) {
  try {const u=new URL(value);return u.protocol==='https:'?u.href:'';} catch {return '';}
}
export function ogImage(raw) {
  const href=validUrl(raw);
  if(!href)return '';
  const url=new URL(href);
  if(url.hostname==='res.cloudinary.com'&&url.pathname.includes('/image/upload/')){
    url.pathname=url.pathname.replace('/image/upload/','/image/upload/f_jpg,c_pad,w_1200,h_630,b_white/');
  }
  return url.href;
}
export function productPage(product) {
  const target=new URL(site);
  target.searchParams.set('marca',product.brand);
  target.hash='producto='+encodeURIComponent(product.id);
  const shareURL=publicUrl+encodeURIComponent(product.id)+'/';
  const title=product.name+' | '+product.brand+' | POLADENT Casa Dental';
  const description=(product.description?.trim()||'Consulte precio y disponibilidad de este producto de odontología y laboratorio dental.') .slice(0,230);
  const image=ogImage(product.image_url);
  if(!image)throw Error('Producto sin imagen pública HTTPS: '+product.id);
  const protectedTarget=JSON.stringify(target.href).replace(/</g,'\\u003c');
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHTML(title)}</title>
<meta name="description" content="${escapeHTML(description)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="POLADENT Casa Dental">
<meta property="og:title" content="${escapeHTML(title)}">
<meta property="og:description" content="${escapeHTML(description)}">
<meta property="og:image" content="${escapeHTML(image)}">
<meta property="og:image:secure_url" content="${escapeHTML(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escapeHTML(product.name)}">
<meta property="og:url" content="${escapeHTML(shareURL)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHTML(title)}">
<meta name="twitter:image" content="${escapeHTML(image)}">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${escapeHTML(target.href)}">
<style>
body{font:16px/1.5 system-ui,sans-serif;background:#f3f7fa;color:#102f4d;margin:0;padding:20px}
main{max-width:600px;margin:7vh auto;background:white;border-radius:16px;padding:30px;text-align:center;box-shadow:0 6px 35px #112a4830}
img{display:block;width:100%;max-height:380px;object-fit:contain}a{display:inline-block;background:#103c5b;color:white;text-decoration:none;font-weight:700;padding:15px 22px;border-radius:10px}
</style>
</head><body><main>
<p>POLADENT CASA DENTAL · ${escapeHTML(product.brand)}</p>
<img src="${escapeHTML(validUrl(product.image_url))}" alt="${escapeHTML(product.name)}">
<h1>${escapeHTML(product.name)}</h1>
<p>Ver la ficha, características y consultar por WhatsApp.</p>
<a href="${escapeHTML(target.href)}">Ver producto en el catálogo</a>
</main><script>location.replace(${protectedTarget});</script></body></html>
`;
}
async function readPublicProducts(){
  const config=await readFile('config.js','utf8');
  const apiKey=config.match(/apiKey:\s*['"]([^'"]+)['"]/)?.[1];
  if(!apiKey||apiKey.length<15)throw Error('No encontramos la API Key pública en config.js');
  const items=[];let token='';
  for(let page=0;page<100;page++){
    const url=new URL(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/catalogPublic`);
    url.searchParams.set('pageSize','200');
    url.searchParams.set('key',apiKey);
    if(token)url.searchParams.set('pageToken',token);
    const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(25000)});
    if(!response.ok){
      const msg=await response.text();
      throw Error('Firestore público: '+response.status+' '+msg.slice(0,400));
    }
    const result=await response.json();
    for(const item of result.documents||[]){
      const fields=item.fields||{};
      const id=item.name.split('/').pop();
      if(!/^[A-Za-z0-9_-]{1,140}$/.test(id))continue;
      if(id.startsWith('_')||fields.kind||!['available','sold_out'].includes(asString(fields.status)))continue;
      const name=asString(fields.name),brand=asString(fields.brand),image_url=validUrl(asString(fields.image_url));
      if(!name||!brand||!image_url)continue;
      items.push({id,name,brand,image_url,description:asString(fields.description)});
    }
    token=result.nextPageToken;
    if(!token)return items;
  }
  throw Error('El catálogo tiene más páginas de las permitidas por el generador.');
}
const main=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){
  const products=await readPublicProducts();
  // No borrar vistas anteriores si el catálogo devolvió inesperadamente cero productos.
  if(!products.length)throw Error('El catálogo devolvió 0 productos. No se publica un manifiesto vacío.');
  await mkdir(output,{recursive:true});
  const ids=new Set(products.map(p=>p.id));
  for(const name of await readdir(output,{withFileTypes:true})){
    if(name.isDirectory()&&/^[A-Za-z0-9_-]{1,140}$/.test(name.name)&&!ids.has(name.name)){
      await rm(join(output,name.name),{recursive:true,force:true});
    }
  }
  for(const p of products){
    const folder=join(output,p.id);
    await mkdir(folder,{recursive:true});
    await writeFile(join(folder,'index.html'),productPage(p),'utf8');
  }
  await writeFile(join(output,'manifest.json'),JSON.stringify({ids:[...ids].sort()},null,2)+'\n','utf8');
  console.log('Previsualizaciones listas:',products.length,'productos públicos.');
}
