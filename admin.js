import{configured,login,logout,listProducts,getStorefrontSettings,listAdminOverview,uploadImage,validImage,saveProduct,deleteProduct,importProducts,removeImage,adminCheck,restoreSession,retryImageCleanups}from'./catalog-service.js';
import{initBulkImport}from'./bulk-import.js';
import{filterAdminProducts}from'./admin-product-filters.js';
const $=s=>document.querySelector(s),message=$('#admin-message'),form=$('#product-form');let products=[],editing=null,busy=false,visibleLimit=24,productAreas=[];
function fillAreaOptions(){
 const select=$('#product-area'),current=select.value;
 select.replaceChildren();
 const placeholder=document.createElement('option');placeholder.value='';
 placeholder.textContent='Sin asignar (automática si está activada)';
 select.append(placeholder);
 for(const area of productAreas){
   const opt=document.createElement('option');opt.value=area.id;
   opt.textContent=area.label+(area.enabled===false?' (oculta en catálogo)':'');
   select.append(opt);
 }
 if(current&&!productAreas.some(area=>area.id===current)){
   const extra=document.createElement('option');extra.value=current;extra.textContent='Área anterior: '+current;
   select.append(extra);
 }
 select.value=current;
}
async function fetchAreas(){
 try{
   const settings=await getStorefrontSettings();
   productAreas=settings.quick_areas||[];
 }catch(e){
   // Sigue permitiendo editar productos aunque las opciones no estén disponibles.
   productAreas=[];
 }
 fillAreaOptions();
}

function tell(s,error=false){message.textContent=s;message.className=error?'error':''}
function readableLoginError(error){
  if (['auth/invalid-credential','auth/wrong-password','auth/user-not-found','auth/invalid-login-credentials'].includes(error?.code)) {
    return 'Firebase rechazó el correo o la contraseña. Comprueba que usas el mismo correo de Authentication → Usuarios y la contraseña creada para ese usuario. No es la contraseña de tu correo electrónico. Para recuperarla, entra a Firebase → Authentication → Usuarios → menú ⋯ → Restablecer contraseña.';
  }
  if (error?.code==='auth/operation-not-allowed') {
    return 'Activa Correo electrónico/Contraseña en Firebase → Authentication → Método de acceso.';
  }
  if (error?.code==='auth/too-many-requests') {
    return 'Firebase bloqueó temporalmente nuevos intentos. Utiliza el restablecimiento de contraseña o vuelve a intentarlo más tarde.';
  }
  return error?.message || 'No se pudo iniciar sesión. Comprueba la configuración de Firebase.';
}
function showDiagnostic(error){
  const panel=$('#admin-diagnostic');
  panel.hidden=!error?.uid;
  if (!error?.uid) return;
  $('#admin-uid').textContent=error.uid;
  $('#admin-diagnostic-detail').textContent=error.reason==='missing-document'
    ? 'No encontramos un documento con este UID exacto en la colección catalogAdmins.'
    : error.reason==='invalid-active'
      ? 'El documento existe, pero el campo active no está guardado como Boolean true.'
      : 'No fue posible leer el permiso. Comprueba las reglas de Firestore y la base de datos (default).';
}
$('#copy-uid').onclick=async()=>{
  const uid=$('#admin-uid').textContent;
  try { await navigator.clipboard.writeText(uid); $('#copy-uid').textContent='UID copiado'; }
  catch { $('#admin-diagnostic-detail').textContent='Selecciona y copia el UID mostrado arriba.'; }
};
function lock(value){busy=value;document.querySelectorAll('#workspace button,#workspace input,#workspace select,#workspace textarea').forEach(e=>e.disabled=value)}
async function refresh(){const overview=await listAdminOverview();products=overview.products;render();$('#brands').replaceChildren();for(const b of new Set(products.map(p=>p.brand))){const o=document.createElement('option');o.value=b;$('#brands').append(o)}const pending=overview.cleanups;$('#image-cleanup-tools').hidden=pending.length===0;$('#pending-image-count').textContent=String(pending.length)}
function el(tag,text){const e=document.createElement(tag);if(text)e.textContent=text;return e}
function render(){
 const query=$('#admin-search').value;
 const statusFilter=$('#admin-status-filter').value;
 const matches=filterAdminProducts(products,query,statusFilter);
 const list=$('#admin-list');list.replaceChildren();
 const shown=Math.min(visibleLimit,matches.length);
 const labels={all:'productos',available:'productos disponibles',hidden:'productos ocultos',sold_out:'productos agotados'};
 $('#admin-visible-count').textContent=matches.length
   ?'Mostrando '+shown+' de '+matches.length+' '+(labels[statusFilter]||'productos')
   :'No se encontraron '+(labels[statusFilter]||'productos')+' con estos filtros.';
 $('#admin-more').hidden=matches.length<=visibleLimit;
 if(!matches.length){
   const empty=el('p','No hay productos que coincidan. Puedes cambiar el estado o la búsqueda.');
   empty.className='admin-empty-results';
   list.append(empty);
   return;
 }
 for(const p of matches.slice(0,visibleLimit)){
   const row=el('article');row.className='admin-item';
   const img=el('img');img.src=validImage(p.image_url);img.alt=p.name;img.loading='lazy';
   const content=el('div');
   content.append(el('strong',p.name),
     el('p',p.brand+' · '+({available:'Disponible',sold_out:'Agotado',hidden:'Oculto'}[p.status]||'Sin estado')));
   const edit=el('button','Editar');edit.onclick=()=>editProduct(p);
   const remove=el('button','Eliminar');remove.onclick=()=>removeProduct(p);
   row.append(img,content,edit,remove);list.append(row);
 }
}
function clear(){editing=null;form.reset();$('#product-id').value='';$('#editor-title').textContent='Nuevo producto'}
function editProduct(p){editing=p;fillAreaOptions();if(p.area_id&&!productAreas.some(a=>a.id===p.area_id)){const option=document.createElement('option');option.value=p.area_id;option.textContent='Área anterior: '+p.area_id;$('#product-area').append(option);}$('#product-area').value=p.area_id||'';$('#product-id').value=p.id;for(const key of ['name','brand','description','status'])$('#'+key).value=p[key]||'';$('#sort-order').value=p.sort_order;$('#price-usd').value=p.price_usd??'';$('#image-file').value='';$('#image-url').value=p.image_path?'':p.image_url;$('#editor-title').textContent='Editar producto';form.scrollIntoView({behavior:'smooth'})}
async function showWorkspace(){await adminCheck();await Promise.all([refresh(),fetchAreas()]);$('#login-form').hidden=true;$('#workspace').hidden=false;tell('Sesión iniciada. Los cambios guardados se publican en el catálogo.')}
$('#login-form').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;tell('Entrando…');showDiagnostic(null);try{await login($('#email').value.trim(),$('#password').value);$('#password').value='';await showWorkspace()}catch(err){tell(readableLoginError(err),true);showDiagnostic(err)}finally{button.disabled=false}};
$('#logout').onclick=async()=>{try{await logout()}finally{location.reload()}};$('#new-product').onclick=clear;$('#cancel-edit').onclick=clear;$('#admin-search').oninput=()=>{visibleLimit=24;render()};$('#admin-status-filter').onchange=()=>{visibleLimit=24;render()};$('#admin-more').onclick=()=>{visibleLimit+=24;render()};
form.onsubmit=async e=>{e.preventDefault();if(busy)return;const name=$('#name').value.trim(),brand=$('#brand').value.trim();if(!name||!brand){tell('Escribe el nombre y la marca.',true);return}const file=$('#image-file').files[0],imageUrl=$('#image-url').value.trim();if(imageUrl&&!validImage(imageUrl)){tell('Indica una dirección HTTPS válida para la foto.',true);return}if(!editing&&!file&&!imageUrl){tell('Selecciona una imagen o pega su enlace.',true);return}lock(true);let uploaded=null,saved=false;try{tell('Guardando producto…');if(file)uploaded=await uploadImage(file);const body={name,brand,description:$('#description').value.trim(),area_id:$('#product-area').value,status:$('#status').value,price_usd:$('#price-usd').value.trim()||null,sort_order:Number($('#sort-order').value)||0,image_url:uploaded?.url||imageUrl||editing?.image_url||'',image_path:uploaded?.path||(imageUrl&&imageUrl!==editing?.image_url?null:editing?.image_path)||null,source_key:editing?.source_key||null};const id=editing?.id;await saveProduct(id,body);saved=true;clear();await refresh();tell('Producto guardado. Ya está actualizado para tus clientes.')}catch(err){tell(saved?'El producto se guardó, pero no pudimos actualizar la lista. Recarga la página.':err.message,true);if(uploaded&&!saved){try{await removeImage(uploaded.path)}catch(cleanupError){tell('No se guardó el producto y también falló la limpieza de su imagen. Revisa Cloudinary. Detalle: '+cleanupError.message,true)}}}finally{lock(false)}};
async function removeProduct(p){if(busy||!confirm('¿Eliminar «'+p.name+'»? Puedes marcarlo como agotado u ocultarlo si prefieres conservarlo.'))return;lock(true);try{const result=await deleteProduct(p);if(editing?.id===p.id)clear();await refresh();if(result?.pendingCleanup)tell('El producto desapareció del catálogo, PERO la fotografía no se eliminó de Cloudinary. Se guardó una tarea pendiente. Pulsa «Reintentar eliminación de fotografías». Detalle: '+result.error,true);else if(result?.imageDeleted)tell('Producto eliminado y fotografía borrada de Cloudinary.');else tell('Producto eliminado del catálogo.')}catch(e){tell(e.message,true)}finally{lock(false)}}
$('#retry-image-cleanup').onclick=async()=>{if(busy)return;lock(true);tell('Intentando eliminar las fotografías pendientes…');try{const result=await retryImageCleanups();await refresh();if(result.failures.length){tell('Se eliminaron '+result.deleted+' fotografía(s), pero '+result.failures.length+' siguen pendientes. '+result.failures[0].error,true)}else tell('Limpieza completada: '+result.deleted+' fotografía(s) eliminada(s) de Cloudinary.')}catch(error){tell(error.message,true)}finally{lock(false)}};
$('#copy-catalog').onclick=async()=>{try{await navigator.clipboard.writeText(new URL('./',location.href).href);tell('Enlace del catálogo copiado.')}catch{tell(new URL('./',location.href).href)}};
$('#import-adalta').onclick=async()=>{if(busy)return;const source=paginas.filter(p=>![1,16,30].includes(p.pagina));if(!confirm('¿Importar los 27 productos de ADALTA? Los ya importados se conservarán.'))return;lock(true);try{const existing=new Set(products.map(p=>p.source_key));const rows=source.filter(p=>!existing.has('adalta-'+p.pagina)).map(p=>({source_key:'adalta-'+p.pagina,name:p.nombre,brand:'ADALTA',status:'available',image_url:new URL(p.archivo,location.href).href,sort_order:p.pagina}));if(rows.length)await importProducts(rows);await refresh();tell(rows.length+' productos importados.')}catch(e){tell(e.message,true)}finally{lock(false)}};
if(!configured){$('#setup-notice').hidden=false;$('#login-form').hidden=true}else{restoreSession().then(ok=>{if(ok)showWorkspace().catch(e=>{logout();tell(e.message,true)})}).catch(e=>tell(e.message,true))}

initBulkImport({getProducts:()=>products, refresh, lock, uploadImage, removeImage, importProducts, tell});
