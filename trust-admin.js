import {
  configured,login,logout,restoreSession,adminCheck,
  getTrustHomeEditor,saveTrustHomeDraft,publishTrustHomeDraft,unpublishTrustHome,
  uploadImage,removeImage
} from './catalog-service.js';
import {TRUST_HOME_DEFAULTS,normalizeTrustHome} from './trust-home-settings.js';

const $=selector=>document.querySelector(selector);
const form=$('#trust-form'),message=$('#trust-status'),frame=$('#trust-frame');
const template=$('#trust-branch-template');
let savedDraft=normalizeTrustHome(TRUST_HOME_DEFAULTS);
let published=normalizeTrustHome(TRUST_HOME_DEFAULTS);
let hasDraft=false,busy=false,dirty=false,uidCounter=0;
const previewURLs=new Map();
const topImages=[
  {file:'#trust-hero-file',url:'#trust-hero-url',property:'hero_image_url',path:'hero_image_path'},
  {file:'#trust-logo-file',url:'#trust-logo-url',property:'logo_url',path:'logo_path'}
];
function report(txt,type=''){
  message.textContent=txt;
  message.className=type;
}
function discardPreviews(){
  for(const url of previewURLs.values())URL.revokeObjectURL(url);
  previewURLs.clear();
}
function attachPhotoPreviews(){
  for(const input of form.querySelectorAll('input[type=file]')){
    if(input.dataset.previewBound==='yes')continue;
    input.dataset.previewBound='yes';
    input.addEventListener('change',()=>{
      if(previewURLs.has(input)){URL.revokeObjectURL(previewURLs.get(input));previewURLs.delete(input);}
      if(input.files[0])previewURLs.set(input,URL.createObjectURL(input.files[0]));
      dirty=true;sendPreview();
    });
  }
}
const readText=name=>form.elements.namedItem(name).value.trim();
function setInputValue(card,key,val){
  const field=card.querySelector('[data-field="'+key+'"]');
  if(field.type==='checkbox')field.checked=val!==false;
  else field.value=val??'';
}
function buildBranch(branch){
  const block=template.content.firstElementChild.cloneNode(true);
  const defaultBranch=branch||{
    id:'sede-'+(globalThis.crypto?.randomUUID?.().slice(0,12)||String(Date.now())+'-'+(++uidCounter)),name:'',city:'',address:'',rif:'J-401910769',
    hours:'8:00 a. m. – 5:00 p. m.',phone:'584226710634',
    visible:true,direct_purchase:true,pickup:true,photos:[]
  };
  block.dataset.id=defaultBranch.id;
  for(const field of ['name','city','address','rif','hours','phone','visible','direct_purchase','pickup'])
    setInputValue(block,field,defaultBranch[field]);
  for(let i=0;i<3;i++){
    const url=block.querySelector('[data-photo-url="'+i+'"]');
    const p=defaultBranch.photos?.[i]||{};
    url.value=p.url||'';
    url.dataset.original=p.url||'';
    url.dataset.path=p.path||'';
  }
  block.querySelector('.branch-title').textContent=defaultBranch.name||'Nueva sede';
  block.querySelector('.branch-remove').onclick=()=>{
    if(busy)return;
    block.remove();
    dirty=true;sendPreview();
  };
  block.querySelector('[data-field="visible"]').addEventListener('change',()=>{
    updateRequired(block);
  });
  updateRequired(block);
  $('#trust-branches').append(block);
}
function updateRequired(block){
  const visible=block.querySelector('[data-field="visible"]').checked;
  for(const key of ['name','city','address','phone'])
    block.querySelector('[data-field="'+key+'"]').required=visible;
}
function fill(settings){
  discardPreviews();
  savedDraft=normalizeTrustHome(settings);
  for(const key of ['eyebrow','title','subtitle','section_title','section_subtitle',
    'closing_title','closing_text'])form.elements.namedItem(key).value=savedDraft[key];
  for(const key of ['show_branches','show_benefits','show_steps','show_contact'])
    form.elements.namedItem(key).checked=savedDraft[key];
  for(let i=0;i<4;i++){
    form.elements.namedItem('benefit_'+(i+1)).value=savedDraft.benefits[i]||'';
    form.elements.namedItem('step_'+(i+1)).value=savedDraft.steps[i]||'';
  }
  for(const img of topImages){
    const url=$(img.url);
    url.value=savedDraft[img.property];
    url.dataset.original=savedDraft[img.property];
    url.dataset.path=savedDraft[img.path]||'';
    $(img.file).value='';
  }
  $('#trust-branches').replaceChildren();
  for(const branch of savedDraft.branches)buildBranch(branch);
  attachPhotoPreviews();
  dirty=false;
  updatePublishStatus();
  sendPreview();
}
function updatePublishStatus(){
  $('#trust-publish-status').textContent=published.enabled
    ?'Portada premium PUBLICADA. Los clientes la pueden ver.'
    :'Portada premium SIN PUBLICAR. Los clientes ven el catálogo anterior.';
}
function urlFieldValue(field,allowPreview){
  const raw=field.value.trim(),file=field.parentElement?.querySelector('input[type=file]');
  // Los selectores de archivo se resuelven por separado en las imágenes principales.
  return allowPreview&&file&&previewURLs.has(file)?previewURLs.get(file):raw;
}
function photoValue(urlInput,fileInput,forPreview=false){
  const url=forPreview&&previewURLs.has(fileInput)?previewURLs.get(fileInput):urlInput.value.trim();
  return {url,path:url===urlInput.dataset.original?urlInput.dataset.path||null:null};
}
function readForm(forPreview=true){
  const result={
    enabled:false,style:'premium',
    eyebrow:readText('eyebrow'),title:readText('title'),subtitle:readText('subtitle'),
    section_title:readText('section_title'),section_subtitle:readText('section_subtitle'),
    closing_title:readText('closing_title'),closing_text:readText('closing_text'),
    benefits:Array.from({length:4},(_,i)=>readText('benefit_'+(i+1))),
    steps:Array.from({length:4},(_,i)=>readText('step_'+(i+1))),
    branches:[...$('#trust-branches').children].map(block=>{
      const value=key=>{
        const x=block.querySelector('[data-field="'+key+'"]');
        return x.type==='checkbox'?x.checked:x.value.trim();
      };
      return {
        id:block.dataset.id,name:value('name'),city:value('city'),address:value('address'),
        rif:value('rif'),hours:value('hours'),phone:value('phone'),
        visible:value('visible'),direct_purchase:value('direct_purchase'),pickup:value('pickup'),
        photos:Array.from({length:3},(_,i)=>photoValue(
          block.querySelector('[data-photo-url="'+i+'"]'),
          block.querySelector('[data-photo-file="'+i+'"]'),forPreview))
      };
    })
  };
  for(const key of ['show_branches','show_benefits','show_steps','show_contact'])
    result[key]=form.elements.namedItem(key).checked;
  for(const img of topImages){
    result[img.property]=photoValue($(img.url),$(img.file),forPreview).url;
    result[img.path]=photoValue($(img.url),$(img.file),forPreview).path;
  }
  return result;
}
function sendPreview(){
  if(busy||$('#trust-workspace').hidden||!frame?.contentWindow)return;
  const data=normalizeTrustHome({...readForm(true),enabled:true},true);
  frame.contentWindow.postMessage({type:'poladent:trust-home-draft',settings:data},location.origin);
}
function validateImageInput(file){
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))
    throw Error('Selecciona fotografías JPG, PNG o WebP.');
  if(file.size>10*1024*1024)throw Error('Las fotografías deben pesar menos de 10 MB.');
}
function checkURLs(data){
  const urls=[data.hero_image_url,data.logo_url,...data.branches.flatMap(b=>b.photos.map(p=>p.url))];
  for(const url of urls){
    if(!url)continue;
    let u;
    try{u=new URL(url);}catch{throw Error('Revisa las URL de imágenes: deben ser HTTPS.');}
    if(u.protocol!=='https:'||u.username||u.password)
      throw Error('Las imágenes deben usar URL HTTPS sin credenciales.');
  }
}
function setBusy(value){
  busy=value;
  for(const control of form.querySelectorAll('button,input,textarea'))control.disabled=value;
}
async function storeDraft(){
  if(!form.reportValidity())return false;
  const data=readForm(false);
  const uploadedPaths=[];
  for(const input of form.querySelectorAll('input[type=file]'))validateImageInput(input.files[0]);
  setBusy(true);
  try{
    for(const img of topImages){
      const file=$(img.file).files[0];
      if(!file)continue;
      report('Subiendo imagen de portada…');
      const uploaded=await uploadImage(file);
      data[img.property]=uploaded.url;data[img.path]=uploaded.path;
      uploadedPaths.push(uploaded.path);
    }
    const blocks=[...$('#trust-branches').children];
    for(let i=0;i<blocks.length;i++){
      for(let n=0;n<3;n++){
        const file=blocks[i].querySelector('[data-photo-file="'+n+'"]').files[0];
        if(!file)continue;
        report('Subiendo fotografía '+(n+1)+' de '+data.branches[i].name+'…');
        const uploaded=await uploadImage(file);
        data.branches[i].photos[n]={url:uploaded.url,path:uploaded.path};
        uploadedPaths.push(uploaded.path);
      }
    }
    checkURLs(data);
    report('Guardando borrador privado…');
    const result=await saveTrustHomeDraft(data);
    hasDraft=true;
    fill(result);dirty=false;
    report('Borrador guardado. Nada se ha publicado para los clientes.','ok');
    return true;
  }catch(error){
    for(const path of uploadedPaths){
      try{await removeImage(path);}catch{/* No borrar ninguna imagen anterior. */}
    }
    report('No se pudo guardar el borrador: '+error.message,'error');
    return false;
  }finally{
    setBusy(false);sendPreview();
  }
}
async function init(){
  await adminCheck();
  const state=await getTrustHomeEditor();
  published=normalizeTrustHome(state.published);
  hasDraft=state.has_draft;
  $('#trust-login').hidden=true;
  $('#trust-workspace').hidden=false;
  fill(state.draft);
  report(hasDraft?'Borrador privado recuperado. Puedes seguir editando.':
    'Editor listo. Completa las fotografías y guarda un borrador.','ok');
}
$('#trust-login').addEventListener('submit',async event=>{
  event.preventDefault();
  try{
    report('Comprobando acceso…');
    await login(event.target.elements.email.value.trim(),event.target.elements.password.value);
    event.target.elements.password.value='';
    await init();
  }catch(error){report(error.message,'error');}
});
form.addEventListener('submit',event=>event.preventDefault());
form.addEventListener('input',event=>{
  if(event.target.matches('[data-field="name"]')){
    const block=event.target.closest('.branch-editor');
    block.querySelector('.branch-title').textContent=event.target.value||'Nueva sede';
  }
  dirty=true;sendPreview();
});
form.addEventListener('change',()=>{dirty=true;sendPreview();});
$('#trust-add-branch').onclick=()=>{
  if($('#trust-branches').children.length>=6){
    report('Puedes crear hasta 6 sucursales.','error');return;
  }
  buildBranch(null);attachPhotoPreviews();dirty=true;sendPreview();
};
$('#trust-restore').onclick=()=>{
  if(!confirm('¿Descartar los cambios sin guardar y recuperar el último borrador?'))return;
  fill(savedDraft);report('Se recuperó el borrador guardado.');
};
$('#trust-save-draft').onclick=storeDraft;
$('#trust-publish').onclick=async()=>{
  if(busy)return;
  if(dirty||!hasDraft){
    report('Primero guarda el borrador para publicar exactamente esa versión.','error');return;
  }
  if(!confirm('¿Publicar esta portada premium para TODOS los clientes? El catálogo anterior seguirá disponible si luego la desactivas.'))return;
  setBusy(true);
  try{
    published=normalizeTrustHome(await publishTrustHomeDraft());
    updatePublishStatus();
    report('Portada premium publicada. No se modificaron productos, carrito, inventario ni la portada de bienvenida.','ok');
  }catch(error){report('No se pudo publicar: '+error.message,'error');}
  finally{setBusy(false);}
};
$('#trust-unpublish').onclick=async()=>{
  if(!published.enabled){report('La portada premium ya está desactivada.');return;}
  if(!confirm('¿Desactivar la nueva portada? Los clientes volverán a la presentación comercial anterior.'))return;
  setBusy(true);
  try{
    published=normalizeTrustHome(await unpublishTrustHome());
    updatePublishStatus();
    report('Portada premium desactivada. Se conserva el borrador y el catálogo anterior.','ok');
  }catch(error){report('No se pudo desactivar: '+error.message,'error');}
  finally{setBusy(false);}
};
frame.addEventListener('load',sendPreview);
window.addEventListener('message',event=>{
  if(event.origin===location.origin&&event.source===frame.contentWindow&&
     event.data?.type==='poladent:storefront-ready')sendPreview();
});
$('#trust-logout').onclick=async()=>{discardPreviews();await logout();location.reload();};
if(!configured){$('#trust-login').hidden=true;report('La configuración de Firebase no está disponible.','error');}
else restoreSession().then(ok=>ok?init():null).catch(error=>report(error.message,'error'));
