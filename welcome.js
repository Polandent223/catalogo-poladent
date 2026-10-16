import {shouldSkipWelcome,catalogEnteredURL} from './welcome-routing.js';
const $=q=>document.querySelector(q);
let catalogStarted=false;
function enterCatalog(replaceURL=false){
  $('#welcome-screen').hidden=true;
  $('#catalog-app').hidden=false;
  $('#welcome-loading').hidden=true;
  document.body.classList.remove('has-welcome');
  if(replaceURL)history.replaceState(null,'',catalogEnteredURL(location.href));
  if(!catalogStarted){
    catalogStarted=true;
    import('./public-catalog.js').catch(error=>{
      console.error('No se pudo iniciar catálogo',error);
      $('#catalog-status').textContent='No se pudo cargar el catálogo. Actualiza la página para reintentar.';
    });
  }
}
function showWelcome(url){
  const frame=$('#welcome-image');
  frame.src=url;
  frame.decoding='async';
  frame.alt='Bienvenido a tu catálogo POLADENT. Encuentra los productos para tu consultorio y laboratorio. Entrar al catálogo.';
  frame.onerror=()=>enterCatalog();
  $('#welcome-loading').hidden=true;
  $('#catalog-app').hidden=true;
  $('#welcome-screen').hidden=false;
  document.body.classList.add('has-welcome');
}
async function readWelcome(){
  const cfg=window.CATALOGO_FIREBASE||{};
  if(!cfg.projectId||!cfg.apiKey)return null;
  const endpoint=new URL('https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(cfg.projectId)+'/databases/(default)/documents/catalogPublic/_site_welcome');
  endpoint.searchParams.set('key',cfg.apiKey);
  const response=await fetch(endpoint.href,{cache:'no-store',signal:AbortSignal.timeout(4500)});
  if(!response.ok)return null;
  const data=(await response.json()).fields||{};
  if(data.enabled?.booleanValue!==true || data.kind?.stringValue!=='site_welcome')return null;
  const raw=data.image_url?.stringValue;
  if(typeof raw!=='string')return null;
  const image=new URL(raw);
  if(image.protocol!=='https:')return null;
  return image.href;
}
$('#welcome-enter').addEventListener('click',()=>enterCatalog(true));
$('#welcome-enter-mobile').addEventListener('click',()=>enterCatalog(true));
if(shouldSkipWelcome(location.href))enterCatalog();
else readWelcome().then(url=>url?showWelcome(url):enterCatalog()).catch(error=>{
  console.warn('Portada temporalmente no disponible; se abre el catálogo:',error);
  enterCatalog();
});
