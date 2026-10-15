import{configured,login,logout,listProducts,uploadImage,validImage,saveProduct,deleteProduct,importProducts,removeImage,adminCheck,restoreSession}from'./catalog-service.js';
const $=s=>document.querySelector(s),message=$('#admin-message'),form=$('#product-form');let products=[],editing=null,busy=false;
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
async function refresh(){products=await listProducts(true);render();$('#brands').replaceChildren();for(const b of new Set(products.map(p=>p.brand))){const o=document.createElement('option');o.value=b;$('#brands').append(o)}}
function el(tag,text){const e=document.createElement(tag);if(text)e.textContent=text;return e}
function render(){const q=$('#admin-search').value.toLocaleLowerCase();$('#admin-list').replaceChildren();for(const p of products.filter(p=>(p.name+' '+p.brand).toLocaleLowerCase().includes(q))){const row=el('article');row.className='admin-item';const img=el('img');img.src=validImage(p.image_url);img.alt=p.name;img.loading='lazy';const content=el('div');content.append(el('strong',p.name),el('p',p.brand+' · '+({available:'Disponible',sold_out:'Agotado',hidden:'Oculto'}[p.status])));const edit=el('button','Editar');edit.onclick=()=>editProduct(p);const remove=el('button','Eliminar');remove.onclick=()=>removeProduct(p);row.append(img,content,edit,remove);$('#admin-list').append(row)}}
function clear(){editing=null;form.reset();$('#product-id').value='';$('#editor-title').textContent='Nuevo producto'}
function editProduct(p){editing=p;$('#product-id').value=p.id;for(const key of ['name','brand','description','status'])$('#'+key).value=p[key]||'';$('#sort-order').value=p.sort_order;$('#image-file').value='';$('#image-url').value=p.image_path?'':p.image_url;$('#editor-title').textContent='Editar producto';form.scrollIntoView({behavior:'smooth'})}
async function showWorkspace(){await adminCheck();await refresh();$('#login-form').hidden=true;$('#workspace').hidden=false;tell('Sesión iniciada. Los cambios guardados se publican en el catálogo.')}
$('#login-form').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;tell('Entrando…');showDiagnostic(null);try{await login($('#email').value.trim(),$('#password').value);$('#password').value='';await showWorkspace()}catch(err){tell(readableLoginError(err),true);showDiagnostic(err)}finally{button.disabled=false}};
$('#logout').onclick=async()=>{try{await logout()}finally{location.reload()}};$('#new-product').onclick=clear;$('#cancel-edit').onclick=clear;$('#admin-search').oninput=render;
form.onsubmit=async e=>{e.preventDefault();if(busy)return;const name=$('#name').value.trim(),brand=$('#brand').value.trim();if(!name||!brand){tell('Escribe el nombre y la marca.',true);return}const file=$('#image-file').files[0],imageUrl=$('#image-url').value.trim();if(imageUrl&&!validImage(imageUrl)){tell('Indica una dirección HTTPS válida para la foto.',true);return}if(!editing&&!file&&!imageUrl){tell('Selecciona una imagen o pega su enlace.',true);return}lock(true);let uploaded=null,saved=false;try{tell('Guardando producto…');if(file)uploaded=await uploadImage(file);const body={name,brand,description:$('#description').value.trim(),status:$('#status').value,sort_order:Number($('#sort-order').value)||0,image_url:uploaded?.url||imageUrl||editing?.image_url||'',image_path:uploaded?.path||(imageUrl&&imageUrl!==editing?.image_url?null:editing?.image_path)||null,source_key:editing?.source_key||null};const id=editing?.id;await saveProduct(id,body);saved=true;clear();await refresh();tell('Producto guardado. Ya está actualizado para tus clientes.')}catch(err){tell(saved?'El producto se guardó, pero no pudimos actualizar la lista. Recarga la página.':err.message,true);if(uploaded&&!saved)await removeImage(uploaded.path)}finally{lock(false)}};
async function removeProduct(p){if(busy||!confirm('¿Eliminar «'+p.name+'»? Puedes marcarlo como agotado u ocultarlo si prefieres conservarlo.'))return;lock(true);try{await deleteProduct(p);if(editing?.id===p.id)clear();await refresh();tell('Producto eliminado.')}catch(e){tell(e.message,true)}finally{lock(false)}}
$('#copy-catalog').onclick=async()=>{try{await navigator.clipboard.writeText(new URL('./',location.href).href);tell('Enlace del catálogo copiado.')}catch{tell(new URL('./',location.href).href)}};
$('#import-adalta').onclick=async()=>{if(busy)return;const source=paginas.filter(p=>![1,16,30].includes(p.pagina));if(!confirm('¿Importar los 27 productos de ADALTA? Los ya importados se conservarán.'))return;lock(true);try{const existing=new Set(products.map(p=>p.source_key));const rows=source.filter(p=>!existing.has('adalta-'+p.pagina)).map(p=>({source_key:'adalta-'+p.pagina,name:p.nombre,brand:'ADALTA',status:'available',image_url:new URL(p.archivo,location.href).href,sort_order:p.pagina}));if(rows.length)await importProducts(rows);await refresh();tell(rows.length+' productos importados.')}catch(e){tell(e.message,true)}finally{lock(false)}};
if(!configured){$('#setup-notice').hidden=false;$('#login-form').hidden=true}else{restoreSession().then(ok=>{if(ok)showWorkspace().catch(e=>{logout();tell(e.message,true)})}).catch(e=>tell(e.message,true))}
