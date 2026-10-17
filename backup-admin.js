import {configured,login,logout,restoreSession,adminCheck} from './catalog-service.js';
import {backupCounts,verifyBackupStructure} from './backup-utils.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
const $=selector=>document.querySelector(selector);
const message=$('#backup-message'),button=$('#backup-download'),overview=$('#backup-overview');
const COLLECTIONS=['catalogProducts','catalogPublic','catalogAnalyticsEvents'];
function status(text,error=false){message.textContent=text;message.className=error?'error':'';}
const config=window.CATALOGO_FIREBASE||{};
async function authorizedToken(){
  await adminCheck();
  const application=getApps().find(a=>a.name==='[DEFAULT]')||initializeApp(config);
  const user=getAuth(application).currentUser;
  if(!user)throw Error('Inicia sesión como administrador para obtener el respaldo.');
  return user.getIdToken();
}
async function collect(name,token){
  const docs=[],seen=new Set();
  const root='projects/'+config.projectId+'/databases/(default)/documents/'+name;
  const endpoint=new URL('https://firestore.googleapis.com/v1/'+root);
  endpoint.searchParams.set('key',config.apiKey);
  endpoint.searchParams.set('pageSize','200');
  let pageToken='',completed=false;
  // Corta con error antes de entregar una copia parcial.
  for(let page=0;page<1000;page++){
    const url=new URL(endpoint.href);
    if(pageToken)url.searchParams.set('pageToken',pageToken);
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),30000);
    let response;
    try{
      response=await fetch(url.href,{
        method:'GET',
        headers:{Authorization:'Bearer '+token,Accept:'application/json'},
        cache:'no-store',
        signal:controller.signal
      });
    }finally{clearTimeout(timer);}
    if(!response.ok)throw Error('Firebase rechazó el respaldo de '+name+' (HTTP '+response.status+').');
    const data=await response.json();
    if(data.documents!==undefined&&!Array.isArray(data.documents))
      throw Error('Firebase devolvió documentos inválidos para '+name+'.');
    for(const doc of data.documents||[]){
      if(typeof doc.name!=='string'||!doc.name.startsWith(root+'/'))
        throw Error('Documento con ruta inesperada en '+name+'.');
      const id=doc.name.slice((root+'/').length);
      if(!id||id.includes('/')||seen.has(id))throw Error('ID repetido o incorrecto en '+name+'.');
      if(typeof doc.fields!=='object'||!doc.fields)throw Error('Documento sin campos válidos: '+id);
      seen.add(id);docs.push(doc);
    }
    status('Copiando '+name+': '+docs.length+' documentos leídos…');
    pageToken=data.nextPageToken||'';
    if(!pageToken){completed=true;break;}
  }
  if(!completed)throw Error('La colección '+name+' no terminó de paginarse; no se descargará una copia incompleta.');
  return docs;
}
async function hash(value){
  const data=new TextEncoder().encode(value);
  const bytes=await crypto.subtle.digest('SHA-256',data);
  return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
async function createBackup(){
  button.disabled=true;status('Comprobando la autorización de Firebase…');
  try{
    const token=await authorizedToken(),collections={};
    const startedAt=new Date().toISOString();
    for(const name of COLLECTIONS)collections[name]=await collect(name,token);
    const counts=backupCounts(collections);
    const checksum=await hash(JSON.stringify(collections));
    const backup={
      metadata:{
        format:'POLADENT_FIRESTORE_TYPED_JSON_V1',
        project_id:config.projectId,
        started_at:startedAt,
        finished_at:new Date().toISOString(),
        includes:['catalogProducts','catalogPublic','catalogAnalyticsEvents'],
        counts,
        sha256_collections:checksum,
        note:'Respaldo privado de las tres colecciones. Incluye documentos y tipos Firestore; no incluye imágenes alojadas en Cloudinary, usuarios de Authentication ni otras colecciones.'
      },
      collections
    };
    const contents=JSON.stringify(backup,null,2);
    const saved=JSON.parse(contents);
    verifyBackupStructure(saved);
    if(await hash(JSON.stringify(saved.collections))!==saved.metadata.sha256_collections)
      throw Error('No coincide el código de integridad del archivo JSON.');
    const timestamp=startedAt.slice(0,19).replace(/[T:]/g,'-');
    const blob=new Blob([contents],{type:'application/json;charset=utf-8'});
    const href=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=href;
    link.download='POLADENT_respaldo_privado_'+timestamp+'.json';
    link.hidden=true;document.body.append(link);
    link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(href),60000);
    overview.replaceChildren();
    const info=document.createElement('p');
    info.textContent='Documentos: productos/configuración '+counts.catalogProducts+
      ' · vista pública '+counts.catalogPublic+' · estadísticas '+counts.catalogAnalyticsEvents+
      '. Código SHA-256: '+checksum;
    overview.append(info);
    status('Archivo descargado en tu navegador. Verificación de estructura y checksum aprobada. Guárdalo en una carpeta privada.');
  }catch(error){
    console.error('Respaldo privado no generado:',error);
    status('No se pudo crear el respaldo: '+(error?.message||'Error inesperado')+
      ' No se ha entregado ningún archivo parcial.',true);
  }finally{button.disabled=false;}
}
async function show(){
  await adminCheck();
  $('#backup-login').hidden=true;$('#backup-workspace').hidden=false;
  status('Listo. Puedes descargar una copia privada de los documentos sin modificarlos.');
}
$('#backup-login').onsubmit=async event=>{
  event.preventDefault();const submit=event.submitter;submit.disabled=true;
  try{
    const data=new FormData(event.target);
    await login(String(data.get('email')).trim(),String(data.get('password')));
    event.target.elements.password.value='';
    await show();
  }catch(error){status(error?.message||'No pudimos iniciar sesión.',true);}
  finally{submit.disabled=false;}
};
$('#backup-logout').onclick=async()=>{await logout();location.reload();};
button.onclick=createBackup;
if(!configured){$('#backup-login').hidden=true;status('Conecta Firebase antes de crear respaldos.',true);}
else restoreSession().then(ok=>{if(ok)return show();}).catch(error=>status(error.message,true));
