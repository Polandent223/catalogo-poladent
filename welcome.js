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
    // La medición se carga en segundo plano, después de entrar al catálogo.
    import('./catalog-analytics.js').then(m=>m.startCatalogAnalytics())
      .catch(error=>console.warn('No se pudo iniciar el contador:',error?.message));
    import('./public-catalog.js').catch(error=>{
      console.error('No se pudo iniciar catálogo',error);
      $('#catalog-status').textContent='No se pudo cargar el catálogo. Actualiza la página para reintentar.';
    });
  }
}
function secureImage(value){
  try {
    const u=new URL(value);
    return u.protocol==='https:'?u.href:'';
  } catch{return '';}
}
function showWelcome(settings){
  const screen=$('#welcome-screen');
  const frame=$('#welcome-image');
  const mobile=$('#welcome-mobile-source');
  const desktopURL=settings.image_url;
  const mobileURL=settings.mobile_image_url||'';
  screen.classList.toggle('has-mobile-art',Boolean(mobileURL));
  screen.style.setProperty('--welcome-backdrop','url('+JSON.stringify(desktopURL)+')');
  if(mobileURL){
    mobile.srcset=mobileURL;
    screen.style.setProperty('--welcome-mobile-backdrop','url('+JSON.stringify(mobileURL)+')');
  }else{
    mobile.removeAttribute('srcset');
    screen.style.removeProperty('--welcome-mobile-backdrop');
  }
  let recovered=false;
  frame.onerror=()=>{
    // Si falla la portada vertical, restaurar la imagen de PC sin bloquear la entrada.
    if(mobileURL&&!recovered){
      recovered=true;
      mobile.removeAttribute('srcset');
      screen.classList.remove('has-mobile-art');
      frame.src=desktopURL;
      return;
    }
    enterCatalog();
  };
  frame.src=desktopURL;
  frame.decoding='async';
  frame.alt='Bienvenido a tu catálogo POLADENT. Encuentra productos para consultorio y laboratorio. Entrar al catálogo.';
  $('#welcome-loading').hidden=true;
  $('#catalog-app').hidden=true;
  screen.hidden=false;
  document.body.classList.add('has-welcome');
}
async function readWelcome(){
  const cfg=window.CATALOGO_FIREBASE||{};
  if(!cfg.projectId||!cfg.apiKey)return null;
  const endpoint=new URL('https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(cfg.projectId)+'/databases/(default)/documents/catalogPublic/_catalog_contacts');
  endpoint.searchParams.set('key',cfg.apiKey);
  const response=await fetch(endpoint.href,{cache:'no-store',signal:AbortSignal.timeout(4500)});
  if(!response.ok)return null;
  const data=(await response.json()).fields||{};
  const storefront=data.storefront?.mapValue?.fields||{};
  if(storefront.enabled?.booleanValue===true &&
     storefront.theme?.stringValue==='premium-confianza' &&
     storefront.replace_welcome?.booleanValue===true)
    return {skip:true};
  if(data.welcome_enabled?.booleanValue!==true || data.kind?.stringValue!=='contact_settings')return null;
  const desktopURL=secureImage(data.welcome_image_url?.stringValue);
  if(!desktopURL)return null;
  return {
    image_url:desktopURL,
    mobile_image_url:secureImage(data.welcome_mobile_image_url?.stringValue)
  };
}
$('#welcome-enter').addEventListener('click',()=>enterCatalog(true));
if(shouldSkipWelcome(location.href))enterCatalog();
else readWelcome().then(settings=>settings?.skip?enterCatalog():settings?showWelcome(settings):enterCatalog()).catch(error=>{
  console.warn('Portada temporalmente no disponible; se abre el catálogo:',error);
  enterCatalog();
});
