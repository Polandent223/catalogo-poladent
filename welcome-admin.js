import {configured,login,logout,restoreSession,adminCheck,getWelcomeSettings,saveWelcomeSettings,uploadImage,validImage} from './catalog-service.js';
const $=q=>document.querySelector(q),form=$('#welcome-form'),message=$('#welcome-admin-message');
let current={enabled:false,image_url:'',image_path:null,mobile_image_url:'',mobile_image_path:null};
let busy=false,pendingDesktop=null,pendingMobile=null;
function tell(value,error=false){message.textContent=value;message.className=error?'error':'';}
function lock(value){busy=value;for(const field of document.querySelectorAll('#welcome-admin-workspace input,#welcome-admin-workspace button'))field.disabled=value;}
function preview(id,url){
  const img=$(id);
  img.hidden=!url;
  if(url)img.src=validImage(url);
  else img.removeAttribute('src');
}
function previewFile(id,file,fallback){
  if(!file)return preview(id,fallback);
  const objectURL=URL.createObjectURL(file),img=$(id);
  img.onload=()=>URL.revokeObjectURL(objectURL);
  img.onerror=()=>URL.revokeObjectURL(objectURL);
  img.src=objectURL;
  img.hidden=false;
}
async function show(){
  await adminCheck();
  current=await getWelcomeSettings();
  $('#welcome-login').hidden=true;$('#welcome-admin-workspace').hidden=false;
  $('#welcome-active').checked=current.enabled;
  preview('#welcome-admin-preview',current.image_url);
  preview('#welcome-mobile-preview',current.mobile_image_url);
  tell(current.enabled?'La portada está activa para los clientes.':'La portada no está activa. El catálogo público sigue funcionando normalmente.');
}
$('#welcome-login').onsubmit=async e=>{
  e.preventDefault();const submit=e.submitter;submit.disabled=true;
  try{
    tell('Verificando acceso…');
    const data=new FormData(e.target);
    await login(String(data.get('email')).trim(),String(data.get('password')));
    e.target.elements.password.value='';
    await show();
  }catch(error){tell(error.message,true);}finally{submit.disabled=false;}
};
$('#welcome-logout').onclick=async()=>{await logout();location.reload();};
$('#welcome-file').addEventListener('change',e=>
  previewFile('#welcome-admin-preview',e.target.files[0],current.image_url));
$('#welcome-mobile-file').addEventListener('change',e=>
  previewFile('#welcome-mobile-preview',e.target.files[0],current.mobile_image_url));
$('#welcome-url').addEventListener('input',()=>{
  const value=$('#welcome-url').value.trim();
  if(value&&validImage(value))preview('#welcome-admin-preview',value);
  else if(!value)preview('#welcome-admin-preview',current.image_url);
});
$('#welcome-mobile-url').addEventListener('input',()=>{
  const value=$('#welcome-mobile-url').value.trim();
  if(value&&validImage(value))preview('#welcome-mobile-preview',value);
  else if(!value)preview('#welcome-mobile-preview',current.mobile_image_url);
});
form.onsubmit=async e=>{
  e.preventDefault();if(busy)return;
  const desktopFile=$('#welcome-file').files[0];
  const mobileFile=$('#welcome-mobile-file').files[0];
  const desktopURL=$('#welcome-url').value.trim();
  const mobileURL=$('#welcome-mobile-url').value.trim();
  const enabled=$('#welcome-active').checked;
  if(desktopURL&&!validImage(desktopURL))return tell('Utiliza un enlace HTTPS válido para la portada de PC.',true);
  if(mobileURL&&(!validImage(mobileURL)||!mobileURL.startsWith('https://')))
    return tell('La portada vertical necesita un enlace HTTPS válido.',true);
  if(!desktopFile&&!desktopURL&&!current.image_url)return tell('Primero selecciona la portada horizontal oficial.',true);

  lock(true);
  let uploadedDesktop=null,uploadedMobile=null,step='desktop';
  try{
    if(desktopFile){
      tell('Subiendo portada horizontal a Cloudinary…');
      uploadedDesktop=await uploadImage(desktopFile);
      pendingDesktop=uploadedDesktop;
    }else if(pendingDesktop&&desktopURL===pendingDesktop.url){
      uploadedDesktop=pendingDesktop;
    }

    step='mobile';
    if(mobileFile){
      tell('Subiendo portada vertical a Cloudinary…');
      uploadedMobile=await uploadImage(mobileFile);
      pendingMobile=uploadedMobile;
    }else if(pendingMobile&&mobileURL===pendingMobile.url){
      uploadedMobile=pendingMobile;
    }

    step='firestore';
    tell('Imágenes listas. Guardando ambas configuraciones en Firebase…');
    const desktopChanged=Boolean(desktopURL&&desktopURL!==current.image_url);
    const mobileChanged=Boolean(mobileURL&&mobileURL!==current.mobile_image_url);
    const nextDesktop=uploadedDesktop?.url||desktopURL||current.image_url;
    const nextMobile=uploadedMobile?.url||mobileURL||current.mobile_image_url||'';
    const updated=await saveWelcomeSettings({
      enabled,
      image_url:nextDesktop,
      image_path:uploadedDesktop?.path||(desktopChanged?null:current.image_path)||null,
      mobile_image_url:nextMobile,
      mobile_image_path:uploadedMobile?.path||(mobileChanged?null:current.mobile_image_path)||null
    });
    current=updated;
    pendingDesktop=null;pendingMobile=null;
    $('#welcome-file').value='';$('#welcome-url').value='';
    $('#welcome-mobile-file').value='';$('#welcome-mobile-url').value='';
    preview('#welcome-admin-preview',current.image_url);
    preview('#welcome-mobile-preview',current.mobile_image_url);
    tell(current.enabled
      ? 'Portadas guardadas y ACTIVADAS. Revisa desde un teléfono y una computadora.'
      : 'Portadas guardadas, pero la bienvenida está DESACTIVADA.');
  }catch(error){
    const detail=error?.code?' ('+error.code+')':'';
    const stage=step==='firestore'?'Firebase rechazó la configuración'
      :step==='mobile'?'No se pudo subir la portada vertical':'No se pudo subir la portada horizontal';
    if(pendingDesktop){
      $('#welcome-file').value='';
      $('#welcome-url').value=pendingDesktop.url;
      preview('#welcome-admin-preview',pendingDesktop.url);
    }
    if(pendingMobile){
      $('#welcome-mobile-file').value='';
      $('#welcome-mobile-url').value=pendingMobile.url;
      preview('#welcome-mobile-preview',pendingMobile.url);
    }
    tell(stage+': '+(error?.message||'error inesperado')+detail+
      (error?.code==='permission-denied'?' Comprueba los permisos de tu administrador; no abras las reglas al público.':'')+
      (pendingDesktop||pendingMobile?' La imagen ya subida se conserva: pulsa Guardar otra vez sin volver a cargarla.':''),true);
  }finally{lock(false);}
};
if(!configured){$('#welcome-login').hidden=true;tell('La portada necesita Firebase configurado.',true);}
else restoreSession().then(ok=>{if(ok)return show();}).catch(err=>tell(err.message,true));
