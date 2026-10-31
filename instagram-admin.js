import {configured,login,logout,restoreSession,adminCheck,getInstagramProfiles,saveInstagramProfiles} from './catalog-service.js';
import {normalizeInstagramProfiles,INSTAGRAM_MAX_PROFILES} from './instagram-links.js';
const $=q=>document.querySelector(q),message=$('#instagram-message'),rows=$('#instagram-rows'),form=$('#instagram-form');
let busy=false;
function note(msg,error=false){message.textContent=msg;message.className=error?'error':'';}
function controls(){
 $('#instagram-add').disabled=busy||rows.children.length>=INSTAGRAM_MAX_PROFILES;
 for(const [index,item] of [...rows.children].entries()){
  item.querySelector('.instagram-up').disabled=busy||index===0;
  item.querySelector('.instagram-down').disabled=busy||index===rows.children.length-1;
 }
}
function setBusy(value){busy=value;for(const field of document.querySelectorAll('#instagram-workspace input,#instagram-workspace button'))field.disabled=value;controls();}
function add(entry={label:'',url:'',enabled:true}){
 const row=document.createElement('div');row.className='instagram-admin-row';
 const named=document.createElement('label');named.textContent='Nombre público';
 const name=document.createElement('input');name.type='text';name.required=true;name.maxLength=55;
 name.placeholder='POLADENT Valencia';name.value=entry.label;named.append(name);
 const linked=document.createElement('label');linked.textContent='Enlace del perfil';
 const url=document.createElement('input');url.type='url';url.required=true;url.placeholder='https://www.instagram.com/usuario/';url.value=entry.url;linked.append(url);
 const enabledLabel=document.createElement('label');enabledLabel.className='instagram-enabled';
 const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=entry.enabled!==false;
 enabledLabel.append(enabled,document.createTextNode('Mostrar al público'));
 const actions=document.createElement('div');actions.className='instagram-row-actions';
 const up=document.createElement('button');up.type='button';up.className='instagram-up';up.textContent='↑ Subir';
 up.onclick=()=>{if(row.previousElementSibling)rows.insertBefore(row,row.previousElementSibling);controls();};
 const down=document.createElement('button');down.type='button';down.className='instagram-down';down.textContent='↓ Bajar';
 down.onclick=()=>{if(row.nextElementSibling)rows.insertBefore(row.nextElementSibling,row);controls();};
 const remove=document.createElement('button');remove.type='button';remove.className='contact-remove';remove.textContent='Quitar';
 remove.onclick=()=>{row.remove();controls();};
 actions.append(up,down,remove);row.append(named,linked,enabledLabel,actions);rows.append(row);controls();
}
async function show(){
 await adminCheck();const list=await getInstagramProfiles();
 $('#instagram-login').hidden=true;$('#instagram-workspace').hidden=false;
 rows.replaceChildren();for(const item of list)add(item);
 controls();note('Puedes administrar las cuentas. Nada se publica hasta que guardes.');
}
$('#instagram-add').onclick=()=>{if(!busy&&rows.children.length<INSTAGRAM_MAX_PROFILES)add();};
$('#instagram-logout').onclick=async()=>{try{await logout();}finally{location.reload();}};
$('#instagram-login').onsubmit=async event=>{
 event.preventDefault();const btn=event.submitter;btn.disabled=true;
 try{note('Verificando acceso…');const data=new FormData(event.target);
 await login(String(data.get('email')).trim(),String(data.get('password')));
 event.target.elements.password.value='';await show();
 }catch(error){note(error.message||'No se pudo entrar.',true);}finally{btn.disabled=false;}
};
form.onsubmit=async event=>{
 event.preventDefault();if(busy)return;
 let profiles;
 try{profiles=normalizeInstagramProfiles([...rows.children].map(row=>({
  label:row.querySelector('input[type=text]').value,url:row.querySelector('input[type=url]').value,
  enabled:row.querySelector('input[type=checkbox]').checked})),true);
 }catch(error){note(error.message,true);return;}
 setBusy(true);
 try{await saveInstagramProfiles(profiles);
  const saved=await getInstagramProfiles();rows.replaceChildren();for(const item of saved)add(item);
  note('Cuentas guardadas. Se mostrarán en el catálogo después de la sincronización de GitHub.');
 }catch(error){note('Error guardando Instagram: '+error.message,true);}finally{setBusy(false);}
};
if(!configured){$('#instagram-login').hidden=true;note('Firebase no está configurado.',true);}
else restoreSession().then(yes=>yes?show():null).catch(error=>note(error.message,true));
