import {
  configured,login,logout,restoreSession,adminCheck,
  listBrands,listProducts,getStorefrontSettings,saveStorefrontSettings,
  uploadImage,removeImage
} from './catalog-service.js';
import {STORE_DEFAULTS,STORE_THEMES,normalizeStorefront} from './storefront-settings.js';

const $=q=>document.querySelector(q);
const form=$('#design-form'),msg=$('#design-message'),frame=$('#design-frame');
const fileFields={desktop:'design-desktop-file',mobile:'design-mobile-file'};
const urls={desktop:'design-desktop-url',mobile:'design-mobile-url'};
let published=normalizeStorefront(STORE_DEFAULTS),busy=false,previewURLs={desktop:'',mobile:''},logoPreviewURL='';


const locationPhotoPreviews=new Map();
const locationFields=['name','city','address','hours','phone','rif','photo_url'];
const locationLabels={name:'Nombre de la sede',city:'Ciudad y estado',address:'Dirección',hours:'Horario',phone:'WhatsApp (código 58)',rif:'RIF',photo_url:'Fotografía real de la sede (URL HTTPS)'};
function refreshLocationNumbers(){
  for(const [index,card] of [...$('#design-location-fields').children].entries())
    card.querySelector('h3').textContent='Sucursal '+(index+1);
  $('#design-add-location').disabled=busy||$('#design-location-fields').children.length>=8;
}
function appendLocationEditor(location={}){
  const holder=$('#design-location-fields');
  if(holder.children.length>=8){report('El máximo es ocho sucursales.',true);return;}
  const section=document.createElement('section');section.className='location-editor';
  const title=document.createElement('h3');section.append(title);
  for(const key of locationFields){
    const label=document.createElement('label');label.textContent=locationLabels[key];
    const input=document.createElement('input');
    input.dataset.locationField=key;
    input.type=key==='photo_url'?'url':'text';
    input.value=location[key]||'';
    input.maxLength=key==='address'?240:key==='photo_url'?2000:90;
    if(key==='photo_url')input.placeholder='https://...';
    label.append(input);section.append(label);
  }
  const photoLabel=document.createElement('label');
  photoLabel.textContent='O subir una fotografía nueva de esta sucursal';
  const file=document.createElement('input');
  file.type='file';file.accept='image/jpeg,image/png,image/webp';
  file.dataset.locationPhoto='true';
  file.addEventListener('change',()=>{
    if(locationPhotoPreviews.has(section))URL.revokeObjectURL(locationPhotoPreviews.get(section));
    if(file.files[0])locationPhotoPreviews.set(section,URL.createObjectURL(file.files[0]));
    else locationPhotoPreviews.delete(section);
    sendPreview();
  });
  photoLabel.append(file);section.append(photoLabel);
  const remove=document.createElement('button');
  remove.type='button';remove.textContent='Quitar esta sede de la propuesta';
  remove.addEventListener('click',()=>{
    if(locationPhotoPreviews.has(section))URL.revokeObjectURL(locationPhotoPreviews.get(section));
    locationPhotoPreviews.delete(section);
    section.remove();refreshLocationNumbers();sendPreview();
    report('Sede retirada del borrador. La web pública no ha cambiado.');
  });
  section.append(remove);holder.append(section);refreshLocationNumbers();
}
function drawLocationEditor(settings){
  for(const url of locationPhotoPreviews.values())URL.revokeObjectURL(url);
  locationPhotoPreviews.clear();
  $('#design-location-fields').replaceChildren();
  $('#design-locations-enabled').checked=Boolean(settings.locations_enabled);
  for(const location of settings.locations||[])appendLocationEditor(location);
  refreshLocationNumbers();
}
function readLocations(useFilePreview=true){
  return [...$('#design-location-fields').querySelectorAll('.location-editor')].map(section=>{
    const entry={};
    for(const input of section.querySelectorAll('[data-location-field]'))
      entry[input.dataset.locationField]=input.value.trim();
    if(useFilePreview && locationPhotoPreviews.has(section))
      entry.photo_url=locationPhotoPreviews.get(section);
    return entry;
  });
}
function getLocationUploadFiles(){
  return [...$('#design-location-fields').querySelectorAll('.location-editor')].map(section=>
    section.querySelector('[data-location-photo]')?.files[0]||null);
}
$('#design-add-location').addEventListener('click',()=>{
  appendLocationEditor();sendPreview();
});
function report(value,error=false){
  msg.textContent=value;
  msg.className=error?'design-status error':'design-status';
}
function setBusy(on){
  busy=on;
  for(const item of form.querySelectorAll('input,textarea,button'))item.disabled=on;
  $('#design-add-location').disabled=on||$('#design-location-fields').children.length>=8;
}
function clearObjectURLs(){
  if(logoPreviewURL)URL.revokeObjectURL(logoPreviewURL);
  logoPreviewURL='';
  for(const field of Object.keys(previewURLs)){
    if(previewURLs[field])URL.revokeObjectURL(previewURLs[field]);
    previewURLs[field]='';
  }
}
function fillForm(settings){
  clearObjectURLs();
  published=normalizeStorefront(settings);
  $('#design-logo-url').value=published.brand_logo_url;
  $('#design-logo-file').value='';
  drawLocationEditor(published);
  form.querySelector('#design-enabled').checked=published.enabled;
  const preset=form.querySelector('input[name="theme"][value="'+published.theme+'"]');
  if(preset)preset.checked=true;
  $('#design-about-enabled').checked=published.about_enabled;
  $('#design-steps-enabled').checked=published.steps_enabled;
  for(const key of ['about_title','about_text','locations_title','locations_intro','steps_title','closing_title','closing_text'])
    form.elements.namedItem(key).value=published[key];
  for(let i=0;i<4;i++){
    form.elements.namedItem('benefit_'+(i+1)+'_title').value=published.benefit_items[i].title;
    form.elements.namedItem('benefit_'+(i+1)+'_text').value=published.benefit_items[i].text;
    form.elements.namedItem('step_'+(i+1)+'_title').value=published.steps[i].title;
    form.elements.namedItem('step_'+(i+1)+'_text').value=published.steps[i].text;
  }
  for(const key of ['eyebrow','title','subtitle','primary_label','secondary_label','featured_title','brands_title'])
    form.elements.namedItem(key).value=published[key];
  published.trust_items.forEach((text,i)=>{
    form.elements.namedItem('trust_'+(i+1)).value=text;
  });
  for(const field of Object.keys(fileFields)){
    $('#'+fileFields[field]).value='';
    $('#'+urls[field]).value=published['banner_'+field+'_url'];
  }
  for(const input of $('#design-brands').querySelectorAll('input[type=checkbox]'))
    input.checked=published.featured_brands.includes(input.value);
  sendPreview();
}
function selectedBrands(){
  return [...$('#design-brands').querySelectorAll('input[type=checkbox]:checked')].map(x=>x.value).slice(0,4);
}
function formSettings(useFilePreview=true){
  const read=name=>form.elements.namedItem(name).value.trim();
  return {
    enabled:$('#design-enabled').checked,
    locations_enabled:$('#design-locations-enabled').checked,
    locations:readLocations(useFilePreview),
    brand_logo_url:useFilePreview&&logoPreviewURL||$('#design-logo-url').value.trim(),
    about_enabled:$('#design-about-enabled').checked,
    about_title:read('about_title'),
    about_text:read('about_text'),
    benefit_items:Array.from({length:4},(_,i)=>({
      title:read('benefit_'+(i+1)+'_title'),
      text:read('benefit_'+(i+1)+'_text')
    })),
    steps_enabled:$('#design-steps-enabled').checked,
    steps_title:read('steps_title'),
    steps:Array.from({length:4},(_,i)=>({
      title:read('step_'+(i+1)+'_title'),
      text:read('step_'+(i+1)+'_text')
    })),
    locations_title:read('locations_title'),
    locations_intro:read('locations_intro'),
    closing_title:read('closing_title'),
    closing_text:read('closing_text'),
    theme:form.elements.namedItem('theme').value,
    eyebrow:read('eyebrow'),
    title:read('title'),
    subtitle:read('subtitle'),
    primary_label:read('primary_label'),
    secondary_label:read('secondary_label'),
    featured_title:read('featured_title'),
    brands_title:read('brands_title'),
    trust_items:[read('trust_1'),read('trust_2'),read('trust_3')],
    featured_brands:selectedBrands(),
    banner_desktop_url:useFilePreview&&previewURLs.desktop||$('#'+urls.desktop).value.trim(),
    banner_mobile_url:useFilePreview&&previewURLs.mobile||$('#'+urls.mobile).value.trim()
  };
}
function sendPreview(){
  if(!frame?.contentWindow || busy)return;
  // No se envían credenciales ni se guardan borradores en el servidor.
  const settings=normalizeStorefront(formSettings(),true);
  const labels={premium:'Premium',clinica:'Clínica',minimalista:'Minimalista',comercial:'Comercial','premium-confianza':'Premium Confianza'};
  $('#design-theme-description').textContent='Vista previa: '+labels[settings.theme]+
    '. Se conservan los textos, imágenes y marcas elegidos.';
  frame.contentWindow.postMessage({type:'poladent:storefront-draft',settings},location.origin);
}
function updateLocalLogo(){
  if(logoPreviewURL)URL.revokeObjectURL(logoPreviewURL);
  const file=$('#design-logo-file').files[0];
  logoPreviewURL=file?URL.createObjectURL(file):'';
  sendPreview();
}
$('#design-logo-file').addEventListener('change',updateLocalLogo);
function updateLocalImage(field){
  if(previewURLs[field])URL.revokeObjectURL(previewURLs[field]);
  const file=$('#'+fileFields[field]).files[0];
  previewURLs[field]=file?URL.createObjectURL(file):'';
  sendPreview();
}
function makeBrandChoices(profiles,products){
  const names=[...new Set([...products.filter(p=>p.name&&p.brand).map(p=>p.brand),...profiles.map(p=>p.name)])]
    .filter(Boolean).sort((a,b)=>a.localeCompare(b,'es'));
  const box=$('#design-brands');
  box.replaceChildren();
  for(const name of names){
    const label=document.createElement('label');
    const input=document.createElement('input');input.type='checkbox';input.value=name;
    label.append(input,document.createTextNode(name));
    input.addEventListener('change',()=>{
      if(selectedBrands().length>=4 && box.querySelectorAll('input:checked').length>4){
        input.checked=false;report('Puedes seleccionar hasta cuatro marcas destacadas.',true);return;
      }
      sendPreview();
    });
    box.append(label);
  }
}
async function loadAdmin(){
  await adminCheck();
  const [settings,profiles,products]=await Promise.all([
    getStorefrontSettings(),listBrands(true),listProducts(true)
  ]);
  makeBrandChoices(profiles,products);
  $('#design-login').hidden=true;
  $('#design-workspace').hidden=false;
  fillForm(settings);
  report('Vista previa preparada. Ningún cambio se publicará hasta pulsar Guardar.');
}
$('#design-login').onsubmit=async event=>{
  event.preventDefault();
  try{
    report('Comprobando acceso…');
    await login(event.target.elements.email.value.trim(),event.target.elements.password.value);
    event.target.elements.password.value='';
    await loadAdmin();
  }catch(error){report(error.message,true)}
};
form.addEventListener('input',sendPreview);
form.addEventListener('change',sendPreview);
for(const key of Object.keys(fileFields))$('#'+fileFields[key]).addEventListener('change',()=>updateLocalImage(key));
frame.addEventListener('load',sendPreview);
window.addEventListener('message',event=>{
  if(event.origin===location.origin && event.source===frame.contentWindow &&
     event.data?.type==='poladent:storefront-ready')sendPreview();
});
$('#design-reset-preview').onclick=()=>{fillForm(published);report('Se restauró la última configuración guardada.');};
$('#design-logout').onclick=async()=>{clearObjectURLs();await logout();location.reload();};
form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy)return;
  if(!form.reportValidity())return;
  const requested=formSettings(false);
  const files={desktop:$('#'+fileFields.desktop).files[0],mobile:$('#'+fileFields.mobile).files[0]};
  const locationUploads=getLocationUploadFiles();
  const toRemove=[];
  setBusy(true);
  try{
    for(const field of Object.keys(fileFields)){
      const file=files[field],url=requested['banner_'+field+'_url'];
      if(file){
        report('Subiendo el banner de '+(field==='mobile'?'teléfono':'computadora')+'…');
        const uploaded=await uploadImage(file);
        toRemove.push(uploaded.path);
        requested['banner_'+field+'_url']=uploaded.url;
        requested['banner_'+field+'_path']=uploaded.path;
      }else{
        if(url && !/^https:\/\//i.test(url))throw Error('Las imágenes deben tener una URL HTTPS.');
        requested['banner_'+field+'_path']=url && url===published['banner_'+field+'_url']
          ?published['banner_'+field+'_path']:null;
      }
    }
    const logoFile=$('#design-logo-file').files[0];
    if(logoFile){
      report('Subiendo logotipo oficial…');
      const uploaded=await uploadImage(logoFile);
      toRemove.push(uploaded.path);
      requested.brand_logo_url=uploaded.url;
      requested.brand_logo_path=uploaded.path;
    }else{
      if(requested.brand_logo_url&&!/^https:\/\//i.test(requested.brand_logo_url))
        throw Error('El logotipo debe usar una URL HTTPS.');
      requested.brand_logo_path=requested.brand_logo_url===published.brand_logo_url
        ?published.brand_logo_path:null;
    }
    for(let i=0;i<locationUploads.length;i++){
      if(!locationUploads[i])continue;
      report('Subiendo fotografía real de sucursal '+(i+1)+'…');
      const uploaded=await uploadImage(locationUploads[i]);
      toRemove.push(uploaded.path);
      requested.locations[i].photo_url=uploaded.url;
    }
    report('Guardando el diseño en Firebase…');
    const result=await saveStorefrontSettings(requested);
    fillForm(result);
    report(result.enabled?'Diseño GUARDADO Y ACTIVADO para los clientes.':
      'Diseño guardado sin publicar. El catálogo actual continúa intacto.');
    $('#design-save-status').textContent='No se han modificado productos, fotos anteriores, carrito, contactos ni la portada de bienvenida.';
  }catch(error){
    for(const path of toRemove){
      try{await removeImage(path);}
      catch{ /* Conservar error principal: revisar imágenes subidas en Cloudinary si falla la limpieza. */ }
    }
    report('No se guardaron los cambios: '+error.message,true);
  }finally{
    setBusy(false);
    sendPreview();
  }
});
if(!configured){$('#design-login').hidden=true;report('Necesitas configurar Firebase.',true)}
else restoreSession().then(ok=>ok?loadAdmin():null).catch(error=>report(error.message,true));
