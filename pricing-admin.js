import {configured,login,logout,restoreSession,adminCheck,listProducts,
 getPricingSettings,saveProductPrice,savePricingEnabled} from './catalog-service.js';
import {fetchBcvRate,cleanUSD,formatUSD,formatVES,convertVES} from './catalog-pricing.js';
import {filterAdminProducts} from './admin-product-filters.js';

const $=selector=>document.querySelector(selector);
let products=[],pricing={enabled:false},rate=null,limit=30,busy=false;
function note(message,error=false){
 const box=$('#pricing-message');box.textContent=message;box.className=error?'error':'';
}
function setBusy(value){
 busy=value;
 for(const field of document.querySelectorAll('#pricing-workspace button,#pricing-workspace input,#pricing-workspace select'))
   field.disabled=value;
}
async function refreshRate(){
 const output=$('#pricing-rate-value'),meta=$('#pricing-rate-meta');
 output.textContent='Consultando tasa vigente…';
 try{
   rate=await fetchBcvRate();
   output.textContent='1 USD = '+formatVES(rate.usd_ves);
   meta.textContent='Vigente desde '+rate.effective_date+' · '+rate.provider+'. Fuente original: BCV.';
 }catch(error){
   rate=null;
   output.textContent='Tasa no disponible';
   meta.textContent=error.message+' No se calcularán precios en bolívares hasta validar una tasa vigente.';
 }
 $('#pricing-switch').disabled=busy||(!pricing.enabled&&!rate);
 render();
}
function renderState(){
 const live=pricing.enabled===true;
 const state=$('#pricing-public-state');
 state.textContent=live?'Precios públicos ACTIVADOS':'Precios públicos DESACTIVADOS';
 state.classList.toggle('pricing-active',live);
 $('#pricing-state-help').textContent=live
   ?'El catálogo muestra USD y, si hay tasa BCV validada, el equivalente en bolívares. Puedes desactivarlo aquí.'
   :'Los USD están almacenados en el inventario privado. Nadie ve precios en el catálogo hasta que los actives.';
 $('#pricing-switch').textContent=live?'Desactivar precios públicos':'Activar precios para clientes';
 $('#pricing-switch').disabled=busy||(!live&&!rate);
}
function render(){
 const q=$('#pricing-search').value;
 const filter=$('#pricing-status').value;
 const selectedBrand=$('#pricing-brand').value;
 const matches=filterAdminProducts(products,q,filter).filter(p=>!selectedBrand||p.brand===selectedBrand);
 $('#pricing-count').textContent=matches.length+' productos encontrados · '+Math.min(limit,matches.length)+' visibles';
 $('#pricing-more').hidden=matches.length<=limit;
 const list=$('#pricing-products-list');list.replaceChildren();
 if(!matches.length){
   const item=document.createElement('p');item.textContent='No hay productos que coincidan con los filtros.';
   list.append(item);return;
 }
 for(const product of matches.slice(0,limit)){
   const row=document.createElement('article');row.className='pricing-row';
   const image=document.createElement('img');image.alt='';image.loading='lazy';
   image.src=product.image_url||'';
   const name=document.createElement('div');
   const title=document.createElement('strong');title.textContent=product.name;
   const label=document.createElement('small');
   label.textContent=product.brand+' · '+({available:'Disponible',sold_out:'Agotado',hidden:'Oculto'}[product.status]||product.status);
   const conversion=document.createElement('small');
   const renderConversion=()=>{
     try{
       const value=cleanUSD(input.value);
       conversion.textContent=value===null?'Sin precio base':formatUSD(value)+
         (rate?' · '+formatVES(convertVES(value,rate.usd_ves)):' · Bs. pendiente de tasa BCV');
     }catch{conversion.textContent='Escribe un precio USD válido.';}
   };
   name.append(title,label,conversion);
   const field=document.createElement('label');field.textContent='Precio USD';
   const input=document.createElement('input');
   input.type='number';input.min='0.01';input.max='100000000';input.step='0.01';
   input.inputMode='decimal';input.placeholder='Sin precio';input.value=product.price_usd??'';
   input.addEventListener('input',renderConversion);
   field.append(input);renderConversion();
   const save=document.createElement('button');save.type='button';
   save.textContent='Guardar USD';
   save.addEventListener('click',async()=>{
     if(busy||!input.reportValidity())return;
     let price;
     try{price=cleanUSD(input.value)}catch(error){note(error.message,true);return;}
     setBusy(true);
     try{
       await saveProductPrice(product.id,price);
       product.price_usd=price;
       renderConversion();
       note('Precio de '+product.name+' guardado: '+(price===null?'sin precio':formatUSD(price))+
         (pricing.enabled?' (visible al público).':' (privado, aún sin publicar).'));
     }catch(error){note('No se pudo guardar: '+error.message,true)}
     finally{setBusy(false);renderState();}
   });
   row.append(image,name,field,save);list.append(row);
 }
}
async function load(){
 await adminCheck();
 [products,pricing]=await Promise.all([listProducts(true),getPricingSettings()]);
 $('#pricing-login').hidden=true;
 $('#pricing-workspace').hidden=false;
 const brands=[...new Set(products.map(p=>p.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
 for(const name of brands){
   const option=document.createElement('option');option.value=name;option.textContent=name;
   $('#pricing-brand').append(option);
 }
 renderState();render();
 await refreshRate();
 note('Panel de precios preparado. Los cambios solo se publican si los activas explícitamente.');
}
$('#pricing-login').addEventListener('submit',async event=>{
 event.preventDefault();
 try{
   note('Verificando acceso…');
   await login(event.target.elements.email.value.trim(),event.target.elements.password.value);
   event.target.elements.password.value='';
   await load();
 }catch(error){note(error.message,true)}
});
$('#pricing-logout').addEventListener('click',async()=>{await logout();location.reload()});
for(const id of ['pricing-search','pricing-status','pricing-brand']){
 $('#'+id).addEventListener(id==='pricing-search'?'input':'change',()=>{
   limit=30;render();
 });
}
$('#pricing-more').addEventListener('click',()=>{limit+=30;render()});
$('#pricing-rate-refresh').addEventListener('click',refreshRate);
$('#pricing-switch').addEventListener('click',async()=>{
 if(busy)return;
 const enable=!pricing.enabled;
 if(enable&&!rate)return note('No podemos activar precios sin una tasa BCV válida.',true);
 if(enable&&!products.some(p=>Number(p.price_usd)>0))
   return note('Primero guarda el precio USD de algún producto.',true);
 const question=enable
   ?'¿ACTIVAR PRECIOS PARA TODOS LOS CLIENTES? Los productos con precio USD mostrarán también su equivalente calculado a la tasa BCV. Los productos sin precio seguirán sin monto.'
   :'¿OCULTAR LOS PRECIOS EN TODO EL CATÁLOGO? Los precios USD guardados seguirán intactos en el inventario privado.';
 if(!confirm(question))return;
 setBusy(true);
 try{
   pricing=await savePricingEnabled(enable);
   note(enable?'Precios ACTIVADOS para clientes.':'Precios desactivados; los valores USD privados se conservan.');
 }catch(error){
   note('No se completó el cambio: '+error.message+
      '. Comprueba el estado real antes de reintentar.',true);
   try{pricing=await getPricingSettings()}catch{}
 }
 finally{setBusy(false);renderState();render()}
});
if(!configured){$('#pricing-login').hidden=true;note('Debes configurar Firebase.',true)}
else restoreSession().then(ok=>ok?load():null).catch(error=>note(error.message,true));
