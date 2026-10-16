import {configured,login,logout,restoreSession,adminCheck,getWelcomeSettings,saveWelcomeSettings,uploadImage,validImage} from './catalog-service.js';
const $=q=>document.querySelector(q),form=$('#welcome-form'),message=$('#welcome-admin-message');
let current={enabled:false,image_url:'',image_path:null},busy=false,pendingUpload=null;
function tell(value,error=false){message.textContent=value;message.className=error?'error':'';}
function lock(value){busy=value;for(const field of document.querySelectorAll('#welcome-admin-workspace input,#welcome-admin-workspace button'))field.disabled=value;}
function preview(url) {
  const img=$('#welcome-admin-preview');img.hidden=!url;
  if(url)img.src=validImage(url);
  else img.removeAttribute('src');
}
async function show() {
  await adminCheck();
  current=await getWelcomeSettings();
  $('#welcome-login').hidden=true;$('#welcome-admin-workspace').hidden=false;
  $('#welcome-active').checked=current.enabled;
  preview(current.image_url);
  tell(current.enabled?'La portada está activa para los clientes.':'La portada no está activa. El catálogo público sigue funcionando normalmente.');
}
$('#welcome-login').onsubmit=async e=>{
  e.preventDefault();const submit=e.submitter;submit.disabled=true;
  try {
    tell('Verificando acceso…');
    const data=new FormData(e.target);
    await login(String(data.get('email')).trim(),String(data.get('password')));
    e.target.elements.password.value='';await show();
  } catch(error){tell(error.message,true);}finally{submit.disabled=false;}
};
$('#welcome-logout').onclick=async()=>{await logout();location.reload();};
$('#welcome-file').addEventListener('change',event=>{
  const file=event.target.files[0];
  if(!file){preview(current.image_url);return;}
  const temp=URL.createObjectURL(file);
  const img=$('#welcome-admin-preview');
  img.onload=()=>URL.revokeObjectURL(temp);
  img.src=temp;img.hidden=false;
});
$('#welcome-url').addEventListener('input',()=>{
  const value=$('#welcome-url').value.trim();
  if(value && validImage(value))preview(value);
  else if(!value)preview(current.image_url);
});
form.onsubmit=async e=>{
  e.preventDefault();if(busy)return;
  const file=$('#welcome-file').files[0];
  const url=$('#welcome-url').value.trim();
  const enabled=$('#welcome-active').checked;
  if(url&&!validImage(url))return tell('Utiliza un enlace HTTPS válido.',true);
  if(!file&&!url&&!current.image_url)return tell('Primero selecciona la imagen oficial aprobada.',true);
  lock(true);let uploaded=null,step='image';
  try{
    tell(file?'Subiendo imagen a Cloudinary…':'Guardando configuración en Firebase…');
    if(file){
      uploaded=await uploadImage(file);
      pendingUpload=uploaded;
    } else if(pendingUpload&&url===pendingUpload.url)uploaded=pendingUpload;
    step='firestore';
    tell('Fotografía lista. Guardando configuración en Firebase…');
    const changedURL=Boolean(url&&url!==current.image_url);
    const update={
      enabled,
      image_url:uploaded?.url||url||current.image_url,
      image_path:uploaded?.path||(changedURL?null:current.image_path)||null
    };
    current=await saveWelcomeSettings(update);
    pendingUpload=null;
    $('#welcome-file').value='';$('#welcome-url').value='';
    preview(current.image_url);
    tell(current.enabled?'Portada guardada y ACTIVADA. Puedes abrir el catálogo público para comprobar el botón.':'Portada guardada y DESACTIVADA. El catálogo sigue abriendo directamente.');
  }catch(error){
    const detail=error?.code?' ('+error.code+')':'';
    const stage=step==='firestore'?'Firebase rechazó la configuración':'No se pudo subir la imagen';
    const suggestion=error?.code==='permission-denied'
      ? 'Revisa que las reglas actuales permitan actualizar catalogPublic/_catalog_contacts a tu administrador. No las abras a todos.'
      : '';
    if(uploaded){
      pendingUpload=uploaded;
      $('#welcome-file').value='';
      $('#welcome-url').value=uploaded.url;
      preview(uploaded.url);
    }
    tell(stage+': '+(error?.message||'error inesperado')+detail+
      (suggestion?' '+suggestion:'')+
      (uploaded?' La fotografía ya está subida: vuelve a guardar sin cargarla otra vez.':''),true);
  }finally{lock(false);}
};
if(!configured){$('#welcome-login').hidden=true;tell('La portada necesita Firebase configurado.',true);}
else restoreSession().then(ok=>{if(ok)return show();}).catch(err=>tell(err.message,true));
