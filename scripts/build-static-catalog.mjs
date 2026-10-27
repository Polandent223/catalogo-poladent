// Respaldo de lectura exclusivo de páginas de producto públicas YA versionadas.
// Nunca consulta Firebase, no lee datos personales ni introduce precios no verificados.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
export function decodePublicHTML(value){
 return String(value??'').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
   .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
}
export function parsePublicPage(id,html){
 if(!/^[A-Za-z0-9_-]{1,140}$/.test(id))throw Error('ID inválido: '+id);
 const title=html.match(/<meta property="og:title" content="([^"]+)">/);
 const photo=html.match(/<img src="([^"]+)" alt=/);
 const description=html.match(/<meta name="description" content="([^"]*)">/);
 if(!title||!photo)throw Error('Ficha pública incompleta: '+id);
 const all=decodePublicHTML(title[1]);
 const suffix=' | POLADENT Casa Dental',cut=all.lastIndexOf(suffix);
 const rest=all.slice(0,cut),sep=rest.lastIndexOf(' | ');
 if(cut<=0||sep<=0)throw Error('Nombre/marca inexistente en ficha '+id);
 const name=rest.slice(0,sep).trim(),brand=rest.slice(sep+3).trim();
 const image_url=decodePublicHTML(photo[1]);
 if(!name||!brand||name.length>180||brand.length>80||
   !(/^https:\/\/res\.cloudinary\.com\/[^/?#]+\/image\/upload\//.test(image_url)||
     /^https:\/\/polandent223\.github\.io\/catalogo-poladent\/imagenes\/[A-Za-z0-9_.-]+\.(png|jpg|jpeg|webp)$/i.test(image_url)))
   throw Error('Imagen o metadatos inesperados: '+id);
 return {id,name,brand,image_url,description:decodePublicHTML(description?.[1]||''),
   status:'available',emergency_fallback:true};
}
export async function generateStaticCatalog(dir=process.cwd()){
 const root=resolve(dir),manifest=JSON.parse(await readFile(join(root,'share/manifest.json'),'utf8'));
 const ids=manifest.ids;
 if(!Array.isArray(ids)||ids.length<50||ids.length>10000||new Set(ids).size!==ids.length)
   throw Error('Respaldo incompleto o manifest inválido. No sobrescribimos archivo previo.');
 const products=[];
 for(const id of ids){
   const html=await readFile(join(root,'share',id,'index.html'),'utf8');
   products.push(parsePublicPage(id,html));
 }
 const backup={
   source:'Versiones públicas de fichas de productos de POLADENT conservadas en GitHub',
   note:'Modo de contingencia: precios y disponibilidad deben confirmarse por WhatsApp',
   products
 };
 const name=join(root,'catalog-emergency-backup.json');
 await writeFile(name,JSON.stringify(backup),'utf8');
 return {name,products:products.length,brands:new Set(products.map(p=>p.brand)).size};
}
const own=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(own){
 const result=await generateStaticCatalog();
 console.log('Respaldo público sin precios/stock:',result.products,'fichas ·',result.brands,'marcas.');
}
