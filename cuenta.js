import {observeCustomerSession,currentCustomer,customerFeatureStatus,
 createCustomerLogin,sendCustomerVerification,loginCustomer,customerLogout,
 registerCustomer,getCustomerQuotes} from './customer-client.js';
import {CART_STORAGE_KEY} from './quote-cart.js';
const $=s=>document.querySelector(s);
const status=$('#customer-status');
let enabled=false,active=false,history=[];
function notify(message,error=false){status.textContent=message;status.classList.toggle('error',error);}
function show(selector){$(selector).hidden=false}
function hide(selector){$(selector).hidden=true}
function loginForms(mode='login'){
 show('#customer-auth');
 $('#customer-login-form').hidden=mode!=='login';
 $('#customer-signup-form').hidden=mode!=='signup';
 $('#customer-show-login').setAttribute('aria-pressed',String(mode==='login'));
 $('#customer-show-signup').setAttribute('aria-pressed',String(mode==='signup'));
 hide('#customer-verify');hide('#customer-dashboard');hide('#customer-profile-form');
}
$('#customer-show-login').addEventListener('click',()=>loginForms());
$('#customer-show-signup').addEventListener('click',()=>loginForms('signup'));
async function refreshProfile(){
 if(!enabled)return;
 const user=currentCustomer();
 if(!user){loginForms();notify('Puedes entrar o crear una cuenta. Es opcional.');return}
 await user.reload();
 if(!user.emailVerified){
   hide('#customer-auth');hide('#customer-profile-form');hide('#customer-dashboard');
   show('#customer-verify');
   notify('Verifica tu correo antes de guardar o consultar cotizaciones.');
   return;
 }
 try{
   const data=await getCustomerQuotes();
   history=data.quotes||[];
   hide('#customer-auth');hide('#customer-verify');hide('#customer-profile-form');
   show('#customer-dashboard');
   $('#customer-greeting').textContent='Bienvenido/a, '+data.name;
   $('#customer-identification').textContent='Cédula: '+data.cedula_masked+' · Correo verificado';
   renderHistory(data.limited);
   notify('Tu historial privado está disponible. Nadie más puede consultarlo desde tu cuenta.');
 }catch(error){
   if(error.code==='functions/failed-precondition'){
     hide('#customer-auth');hide('#customer-verify');hide('#customer-dashboard');
     show('#customer-profile-form');
     const draft=$('#customer-signup-form');
     const form=$('#customer-profile-form');
     if(draft.elements.name.value&&!form.elements.name.value)
       form.elements.name.value=draft.elements.name.value;
     if(draft.elements.cedula.value&&!form.elements.cedula.value)
       form.elements.cedula.value=draft.elements.cedula.value;
     notify('Completa el perfil con tu nombre y cédula para empezar.');
   }else notify('No se pudo abrir tu historial: '+error.message,true);
 }
}
function renderHistory(limited){
 const host=$('#customer-quotes'),previous=$('#customer-previous-products');
 host.replaceChildren();previous.replaceChildren();
 const unique=new Map();
 for(const quote of history)for(const p of quote.items||[])
   unique.set(p.product_id,{name:p.name,brand:p.brand});
 const count=unique.size;
 $('#customer-previous-count').textContent=count+' producto'+(count===1?' cotizado':'s cotizados')+' anteriormente.';
 for(const p of [...unique.values()].slice(0,60)){
   const tag=document.createElement('span');tag.className='customer-product-label';
   tag.textContent=p.brand+' · '+p.name;
   previous.append(tag);
 }
 if(!history.length){const p=document.createElement('p');p.textContent='Aún no has guardado cotizaciones. Puedes buscar productos en el catálogo y guardarlos desde la bolsa.';host.append(p);}
 for(const quote of history){
   const box=document.createElement('article');box.className='customer-quote';
   const header=document.createElement('div');header.className='customer-quote-head';
   const name=document.createElement('strong');name.textContent=quote.code||quote.id;
   const meta=document.createElement('small');
   const parsed=new Date(quote.created_at);
   meta.textContent=Number.isFinite(parsed.getTime())?
     new Intl.DateTimeFormat('es-VE',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Caracas'}).format(parsed):'Fecha pendiente';
   header.append(name,meta);box.append(header);
   for(const p of quote.items||[]){
     const line=document.createElement('div');line.className='customer-quote-row';
     line.textContent=p.quantity+' × '+p.brand+' · '+p.name;
     box.append(line);
   }
   const total=document.createElement('strong');
   total.textContent=quote.total_usd===null?'Precio por confirmar':
     'USD '+Number(quote.total_usd).toFixed(2)+
     (quote.total_ves!==null?' · Bs. '+Number(quote.total_ves).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}):' · Bs por confirmar');
   box.append(total);
   const repeat=document.createElement('button');repeat.type='button';
   repeat.textContent='Volver a solicitar estos productos';
   repeat.addEventListener('click',()=>{
     const lines=(quote.items||[]).map(p=>({id:p.product_id,quantity:p.quantity}));
     if(!lines.length)return;
     try{
       sessionStorage.setItem(CART_STORAGE_KEY,JSON.stringify(lines));
       location.href='./?catalogo=1#product-search';
     }catch{
       notify('No pudimos transferir los productos al carrito. Comprueba el navegador.',true);
     }
   });
   box.append(repeat);host.append(box);
 }
 $('#customer-history-info').textContent=limited?
   'Mostramos tus 100 cotizaciones más recientes. Pide a POLADENT un historial más antiguo.':
   'Los importes anteriores se conservan como referencia; una nueva cotización utiliza precios y tasa vigentes.';
}
$('#customer-signup-form').addEventListener('submit',async event=>{
 event.preventDefault();const form=event.currentTarget;
 const button=form.querySelector('button[type=submit]');button.disabled=true;
 try{
   await createCustomerLogin(form.elements.email.value.trim(),form.elements.password.value);
   await sendCustomerVerification();
   notify('Cuenta iniciada. Enviamos un correo de verificación. Ábrelo y pulsa «Ya verifiqué mi correo».');
   hide('#customer-auth');show('#customer-verify');
 }catch(error){notify('No pudimos crear tu cuenta: '+error.message,true)}
 finally{button.disabled=false;}
});
$('#customer-login-form').addEventListener('submit',async event=>{
 event.preventDefault();const form=event.currentTarget;
 const button=form.querySelector('button[type=submit]');button.disabled=true;
 try{
   await loginCustomer(form.elements.email.value.trim(),form.elements.password.value);
   form.elements.password.value='';
   await refreshProfile();
 }catch(error){notify('No pudimos iniciar sesión: '+error.message,true)}
 finally{button.disabled=false;}
});
$('#customer-verify-check').addEventListener('click',()=>refreshProfile());
$('#customer-verify-resend').addEventListener('click',async()=>{
 try{await sendCustomerVerification();notify('Te enviamos otro correo de verificación.')}
 catch(error){notify(error.message,true)}
});
$('#customer-profile-form').addEventListener('submit',async event=>{
 event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type=submit]');
 button.disabled=true;
 try{
   await registerCustomer(form.elements.name.value,form.elements.cedula.value,form.elements.consent.checked);
   form.elements.cedula.value='';
   notify('Registro completado. Ya puedes consultar tu historial.');
   await refreshProfile();
 }catch(error){notify('No pudimos completar el registro: '+error.message,true)}
 finally{button.disabled=false;}
});
$('#customer-signout').addEventListener('click',async()=>{
 try{await customerLogout();history=[];loginForms();notify('Sesión cerrada. Puedes seguir usando el catálogo sin registrarte.');}
 catch(error){notify(error.message,true)}
});
async function init(){
 try{
   const response=await customerFeatureStatus();
   enabled=response.enabled===true;
   if(!enabled){
     show('#customer-unavailable');
     notify('Las cuentas personales están desactivadas. El catálogo sin registro sigue funcionando.');
     return;
   }
   observeCustomerSession(()=>{
     void refreshProfile().catch(error=>notify('No pudimos comprobar tu sesión: '+error.message,true));
   });
 }catch(error){
   show('#customer-unavailable');
   notify('La opción personal no está disponible. Continúa en el catálogo sin registrarte.');
 }
}
init();
