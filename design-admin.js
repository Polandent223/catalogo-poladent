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
let published=normalizeStorefront(STORE_DEFAULTS),busy=false,previewURLs={desktop:'',mobile:''};


const locationPhotoPreviews=new Map();
const locationFields=['name','city','address','hours','phone','rif','photo_url'];
function drawLocationEditor(settings){
  const holder=$('#design-location-fields');
  for(const url of locationPhotoPreviews.values())URL.revokeObjectURL(url);
  locationPhotoPreviews.clear();
  holder.replaceChildren();
  $('#design-locations-enabled').checked=Boolean(settings.locations_enabled);
  for(const [i,location] of (settings.locations||[]).entries()){
    const section=document.createElement('section');section.className='location-editor';
    const title=document.createElement('h3');title.textContent='Sucursal '+(i+1);
    section.append(title);
    for(const key of locationFields){
      const label=document.createElement('label');
      const captions={name:'Nombre de la sede',city:'Ciudad y estado',address:'Dirección',hours:'Horario',phone:'WhatsApp (código 58)',rif:'RIF',photo_url:'Foto real de la sede (URL HTTPS)'};
      label.textContent=captions[key];
      const input=document.createElement('input');
      input.type=key==='photo_url'?'url':'text';
      input.name='location_'+i+'_'+key;
      input.value=location[key]||'';
      input.maxLength=key==='address'?240:key==='photo_url'?2000:90;
      if(key==='photo_url')input.placeholder='https://...';
      label.append(input);section.append(label);
    }
    const photoLabel=document.createElement('label');photoLabel.textContent='O subir una fotografía nueva de esta sucursal';
    const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';
    file.name='location_'+i+'_file';
    file.addEventListener('change',()=>{
      if(locationPhotoPreviews.has(i))URL.revokeObjectURL(locationPhotoPreviews.get(i));
      if(file.files[0])locationPhotoPreviews.set(i,URL.createObjectURL(file.files[0]));
      else locationPhotoPreviews.delete(i);
      sendPreview();
    });
    photoLabel.append(file);section.append(photoLabel);
    holder.append(section);
  }
}
function readLocations(useFilePreview=true){
  return [...$('#design-location-fields').querySelectorAll('.location-editor')].map((section,i)=>
    Object.fromEntries(locationFields.map(key=>[key,key==='photo_url'&&useFilePreview&&locationPhotoPreviews.has(i)?locationPhotoPreviews.get(i):form.elements.namedItem('location_'+i+'_'+key).value.trim()])));
}

function report(value,error=false){
  msg.textContent=value;
  msg.className=error?'design-status error':'design-status';
}
function setBusy(on){
  busy=on;
  for(const item of form.querySelectorAll('input,textarea,button'))item.disabled=on;
}
function clearObjectURLs(){
  for(const field of Object.keys(previewURLs)){
    if(previewURLs[field])URL.revokeObjectURL(previewURLs[field]);
    previewURLs[field]='';
  }
}
function fillForm(settings){
  clearObjectURLs();
  published=normalizeStorefront(settings);
  drawLocationEditor(published);
  form.querySelector('#design-enabled').checked=published.enabled;
  const preset=form.querySelector('input[name="theme"][value="'+published.theme+'"]');
  if(preset)preset.checked=true;
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
  const labels={premium:'Premium',clinica:'Clínica',minimalista:'Minimalista',comercial:'Comercial'};
  $('#design-theme-description').textContent='Vista previa: '+labels[settings.theme]+
    '. Se conservan los textos, imágenes y marcas elegidos.';
  frame.contentWindow.postMessage({type:'poladent:storefront-draft',settings},location.origin);
}
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
  const locationUploads=readLocations().map((_,i)=>form.elements.namedItem('location_'+i+'_file')?.files[0]);
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
