// Sincronización por GitHub Actions sin claves privadas ni Firebase Admin.
// Sondeo 1 documento público; descargar el catálogo entero solo cuando cambie
// su revisión o cuando toque renovar la captura, como máximo cada 3 horas.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPublicRevision,savePublicSnapshot} from './create-public-snapshot.mjs';

export const REFRESH_INTERVAL_MS=3*60*60*1000;
export function shouldRefreshPublicSnapshot(snapshot,revision,now=Date.now()){
 if(!snapshot||snapshot.schema!=='poladent-public-snapshot-v1')return true;
 const saved=Date.parse(snapshot.captured_at);
 if(!Number.isFinite(saved)||now<saved||now-saved>=REFRESH_INTERVAL_MS)return true;
 return !!revision && revision!==snapshot.source_revision;
}
async function readConfig(root){
 const source=await readFile(resolve(root,'config.js'),'utf8');
 const apiKey=source.match(/apiKey:\s*['"]([^'"]+)['"]/)?.[1];
 const projectId=source.match(/projectId:\s*['"]([^'"]+)['"]/)?.[1];
 if(!apiKey||projectId!=='catalogo-poladent')throw Error('La fuente no es el Firebase oficial.');
 return {apiKey,projectId};
}
export async function syncPublicSnapshot({
 root=process.cwd(),request=fetch,now=new Date()
}={}){
 const config=await readConfig(root);
 // Primer contacto: una sola lectura, sin inventario ni datos personales.
 const revision=await readPublicRevision(config,request);
 let snapshot=null;
 try{snapshot=JSON.parse(await readFile(resolve(root,'catalog-public-snapshot.json'),'utf8'))}
 catch(error){if(error.code!=='ENOENT')throw error}
 if(!shouldRefreshPublicSnapshot(snapshot,revision,now.getTime()))
   return {updated:false,reason:'Sin cambios. Se conserva la versión oficial de GitHub Pages.',
     captured_at:snapshot.captured_at,revision};
 const updated=await savePublicSnapshot({root,request,now});
 return {...updated,updated:true,revision};
}
const own=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(own){
 const result=await syncPublicSnapshot();
 console.log(result.updated?'Catálogo POLADENT sincronizado:':'Catálogo POLADENT sin cambios:',JSON.stringify(result));
}
