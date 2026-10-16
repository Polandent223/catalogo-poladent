import {configured, login, logout, restoreSession, adminCheck, getWhatsAppContacts, saveWhatsAppContacts} from './catalog-service.js';
const $=s=>document.querySelector(s),message=$('#contact-message'),rows=$('#contact-rows'),form=$('#contact-form');
let busy=false;
function tell(value,error=false){message.textContent=value;message.className=error?'error':'';}
function setBusy(active){busy=active;for(const field of document.querySelectorAll('#contact-workspace input,#contact-workspace button'))field.disabled=active;}
function row(label='',phone=''){
  const item=document.createElement('div');item.className='contact-admin-row';
  const nameWrap=document.createElement('label');nameWrap.textContent='Nombre para el cliente';
  const name=document.createElement('input');name.type='text';name.maxLength=55;name.required=true;name.placeholder='Ej. Ventas Valencia';name.value=label;
  nameWrap.append(name);
  const phoneWrap=document.createElement('label');phoneWrap.textContent='Número internacional';
  const number=document.createElement('input');number.type='tel';number.inputMode='tel';number.maxLength=22;number.required=true;number.placeholder='58…';number.value=phone;
  phoneWrap.append(number);
  const remove=document.createElement('button');remove.type='button';remove.textContent='Quitar';remove.className='contact-remove';
  remove.addEventListener('click',()=>{item.remove();updateAdd();});
  item.append(nameWrap,phoneWrap,remove);rows.append(item);updateAdd();
}
function updateAdd(){$('#contact-add').disabled=busy||rows.children.length>=5;}
async function show(){
  await adminCheck();$('#contact-login').hidden=true;$('#contact-workspace').hidden=false;
  const contacts=await getWhatsAppContacts();rows.replaceChildren();
  for(const c of contacts)row(c.label,c.phone);
  if(!contacts.length)row();
  tell('Ahora puedes guardar los números que usarán tus clientes.');
}
$('#contact-add').onclick=()=>row();
$('#contact-logout').onclick=async()=>{try{await logout();}finally{location.reload();}};
$('#contact-login').onsubmit=async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;
  try{tell('Comprobando autorización…');
    const data=new FormData(event.target);
    await login(String(data.get('email')).trim(),String(data.get('password')));
    event.target.elements.password.value='';await show();
  }catch(error){tell(error.message||'No se pudo iniciar sesión.',true);}finally{button.disabled=false;}
};
form.onsubmit=async event=>{
  event.preventDefault();if(busy)return;
  const contacts=[...rows.children].map(item=>({
    label:item.querySelector('input[type=text]').value.trim(),
    phone:item.querySelector('input[type=tel]').value.trim()
  }));
  setBusy(true);
  try{
    await saveWhatsAppContacts(contacts);
    tell('Números guardados. Los clientes ya pueden elegir el contacto al consultar productos.');
    const current=await getWhatsAppContacts();
    rows.replaceChildren();for(const c of current)row(c.label,c.phone);
  }catch(error){tell('No se guardaron los contactos: '+(error.message||'Error desconocido'),true);
  }finally{setBusy(false);updateAdd();}
};
if(!configured){$('#contact-login').hidden=true;tell('Configura Firebase antes de añadir WhatsApp.',true);}
else restoreSession().then(isAuthenticated=>{if(isAuthenticated)return show();}).catch(error=>tell(error.message,true));
