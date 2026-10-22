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
const locationExtraPreviews=new Map();
const MAX_EXTRA_LOCATION_PHOTOS=6;
const locationFields=['name','city','address','hours','phone','rif','photo_url','interior_url'];
const locationLabels={
  name:'Nombre de la sede',city:'Ciudad y estado',address:'Dirección',
  hours:'Horario',phone:'WhatsApp (código 58)',rif:'RIF',
  photo_url:'Fotografía principal: fachada o identificación de la sede (URL HTTPS)',
  interior_url:'Segunda fotografía: interior de la tienda (URL HTTPS)'
};
function releaseExtraLocationPreview(row){
  const url=locationExtraPreviews.get(row);
  if(url)URL.revokeObjectURL(url);
  locationExtraPreviews.delete(row);
}
function appendExtraLocationPhoto(section,url=''){
  const box=section.querySelector('[data-gallery-extras]');
  if(box.children.length>=MAX_EXTRA_LOCATION_PHOTOS)return;
  const row=document.createElement('div');row.className='location-extra-row';
  const label=document.createElement('label');
  label.textContent='Fotografía adicional '+(box.children.length+1)+' (URL HTTPS)';
  const urlInput=document.createElement('input');
  urlInput.type='url';urlInput.maxLength=2000;urlInput.placeholder='https://...';
  urlInput.value=url;urlInput.dataset.locationExtraUrl='true';
  label.append(urlInput);row.append(label);
  const fileLabel=document.createElement('label');
  fileLabel.textContent='O seleccionar otra fotografía';
  const fileInput=document.createElement('input');
  fileInput.type='file';fileInput.accept='image/jpeg,image/png,image/webp';
  fileInput.dataset.locationExtraFile='true';
  fileInput.addEventListener('change',()=>{
    releaseExtraLocationPreview(row);
    if(fileInput.files[0])locationExtraPreviews.set(row,URL.createObjectURL(fileInput.files[0]));
    sendPreview();
  });
  fileLabel.append(fileInput);row.append(fileLabel);
  const remove=document.createElement('button');
  remove.type='button';remove.textContent='Quitar foto adicional';
  remove.addEventListener('click',()=>{
    releaseExtraLocationPreview(row);
    row.remove();
    refreshExtraLocationNumbers(section);
    sendPreview();
  });
  row.append(remove);box.append(row);refreshExtraLocationNumbers(section);
}
function refreshExtraLocationNumbers(section){
  const rows=[...section.querySelectorAll('[data-gallery-extras] .location-extra-row')];
  rows.forEach((row,i)=>row.querySelector('label').firstChild.textContent=
    'Fotografía adicional '+(i+1)+' (URL HTTPS)');
  const add=section.querySelector('[data-add-extra-photo]');
  if(add)add.disabled=busy||rows.length>=MAX_EXTRA_LOCATION_PHOTOS;
}
function releaseLocationPreview(section){
  for(const row of section.querySelectorAll('.location-extra-row'))releaseExtraLocationPreview(row);
  for(const url of Object.values(locationPhotoPreviews.get(section)||{}))URL.revokeObjectURL(url);
  locationPhotoPreviews.delete(section);
}
function refreshLocationNumbers(){
  for(const [index,card] of [...$('#design-location-fields').children].entries())
    card.querySelector('h3').textContent='Sucursal '+(index+1);
  $('#design-add-location').disabled=busy||$('#design-location-fields').children.length>=8;
  for(const section of $('#design-location-fields').children)refreshExtraLocationNumbers(section);
}
function appendLocationEditor(location={}){
  const holder=$('#design-location-fields');
  if(holder.children.length>=8){report('El máximo es ocho sucursales.',true);return;}
  const section=document.createElement('section');section.className='location-editor';
  section.append(document.createElement('h3'));
  for(const key of locationFields){
    const label=document.createElement('label');
    label.textContent=locationLabels[key];
    const input=document.createElement('input');
    input.dataset.locationField=key;
    input.type=['photo_url','interior_url'].includes(key)?'url':'text';
    input.value=location[key]||'';
    input.maxLength=key==='address'?240:input.type==='url'?2000:90;
    if(input.type==='url')input.placeholder='https://...';
    label.append(input);section.append(label);
    if(input.type!=='url')continue;
    const fileLabel=document.createElement('label');
    fileLabel.textContent=key==='photo_url'
      ?'O subir foto principal (real, sin modificaciones)'
      :'O subir foto del interior';
    const file=document.createElement('input');
    file.type='file';file.accept='image/jpeg,image/png,image/webp';
    file.dataset.locationPhoto=key;
    file.addEventListener('change',()=>{
      const existing=locationPhotoPreviews.get(section)||{};
      if(existing[key])URL.revokeObjectURL(existing[key]);
      if(file.files[0])existing[key]=URL.createObjectURL(file.files[0]);
      else delete existing[key];
      if(Object.keys(existing).length)locationPhotoPreviews.set(section,existing);
      else locationPhotoPreviews.delete(section);
      sendPreview();
    });
    fileLabel.append(file);section.append(fileLabel);
  }
  const galleryBox=document.createElement('div');
  galleryBox.className='location-extra-photos';galleryBox.dataset.galleryExtras='true';
  const galleryHeading=document.createElement('h4');
  galleryHeading.textContent='Más fotografías para mostrar al público (hasta 6 adicionales)';
  section.append(galleryHeading,galleryBox);
  const addPhoto=document.createElement('button');
  addPhoto.type='button';addPhoto.textContent='+ Agregar otra fotografía';
  addPhoto.dataset.addExtraPhoto='true';
  addPhoto.addEventListener('click',()=>{
    appendExtraLocationPhoto(section);sendPreview();
  });
  section.append(addPhoto);
  for(const url of (Array.isArray(location.gallery_urls)?location.gallery_urls:[]).slice(0,MAX_EXTRA_LOCATION_PHOTOS))
    appendExtraLocationPhoto(section,url);
  refreshExtraLocationNumbers(section);
  const remove=document.createElement('button');
  remove.type='button';remove.textContent='Quitar esta sede de la propuesta';
  remove.addEventListener('click',()=>{
    releaseLocationPreview(section);section.remove();refreshLocationNumbers();sendPreview();
    report('Sede retirada del borrador. La web pública no ha cambiado.');
  });
  section.append(remove);holder.append(section);refreshLocationNumbers();
}
function drawLocationEditor(settings){
  for(const section of $('#design-location-fields').children)releaseLocationPreview(section);
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
    if(useFilePreview)Object.assign(entry,locationPhotoPreviews.get(section)||{});
    entry.gallery_urls=[...section.querySelectorAll('.location-extra-row')].map(row=>
      useFilePreview&&locationExtraPreviews.has(row)?locationExtraPreviews.get(row):
      row.querySelector('[data-location-extra-url]').value.trim()).filter(Boolean);
    return entry;
  });
}
function getLocationUploadFiles(){
  return [...$('#design-location-fields').querySelectorAll('.location-editor')].map(section=>
    Object.fromEntries(['photo_url','interior_url'].map(key=>
      [key,section.querySelector('[data-location-photo="'+key+'"]')?.files[0]||null])));
}
$('#design-add-location').addEventListener('click',()=>{
  appendLocationEditor();sendPreview();
});
$('#design-location-pack').addEventListener('change',event=>{
  const files=[...event.target.files];
  if(!files.length)return;
  let assigned=0;
  for(const file of files){
    const name=file.name.toLowerCase().replace(/\.[^.]+$/,'');
    const city=name.startsWith('valencia_')?'valencia':
      name.startsWith('maracay_')?'maracay':'';
    const field=['valencia_principal','maracay_fachada','maracay_principal'].includes(name)
      ?'photo_url':
      ['valencia_interior','maracay_interior'].includes(name)?'interior_url':'';
    if(!city||!field)continue;
    const section=[...$('#design-location-fields').children].find(node=>
      [...node.querySelectorAll('[data-location-field="city"],[data-location-field="name"]')]
        .some(input=>input.value.toLowerCase().includes(city)));
    const target=section?.querySelector('[data-location-photo="'+field+'"]');
    if(!target)continue;
    try{
      const selected=new DataTransfer();selected.items.add(file);
      target.files=selected.files;
      target.dispatchEvent(new Event('change',{bubbles:true}));
      assigned++;
    }catch{
      report('Tu navegador no permite la selección automática. Puedes cargar cada imagen en su campo.',true);
      return;
    }
  }
  report(assigned+' fotografías asignadas a las sedes para vista previa; no se han publicado.');
});


const compactLabels={
  hero:'Portada principal',trust:'Mensajes rápidos',catalogo:'Marcas y productos',
  about:'¿Por qué elegirnos?',locations:'Sedes oficiales',steps:'Cómo comprar',closing:'Cierre comercial'
};
let compactOrderMobile=[],compactOrderDesktop=[];
let compactHiddenMobile=new Set(),compactHiddenDesktop=new Set();
function renderCompactOrder(device){
  const isMobile=device==='mobile',order=isMobile?compactOrderMobile:compactOrderDesktop;
  const hidden=isMobile?compactHiddenMobile:compactHiddenDesktop;
  const box=$('#compact-'+device+'-order');box.replaceChildren();
  order.forEach((section,index)=>{
    const line=document.createElement('div');line.className='compact-order-row';
    const title=document.createElement('strong');title.textContent=(index+1)+'. '+compactLabels[section];
    line.append(title);
    for(const [sign,change,label] of [['↑',-1,'Subir'],['↓',1,'Bajar']]){
      const button=document.createElement('button');button.type='button';
      button.textContent=sign;button.disabled=index+change<0||index+change>=order.length;
      button.setAttribute('aria-label',label+' '+compactLabels[section]+' en '+(isMobile?'teléfono':'PC'));
      button.addEventListener('click',()=>{
        const other=index+change;
        [order[index],order[other]]=[order[other],order[index]];
        renderCompactOrder(device);sendPreview();
      });
      line.append(button);
    }
    if(section!=='catalogo'){
      const label=document.createElement('label');label.textContent='Ocultar';
      const checkbox=document.createElement('input');checkbox.type='checkbox';
      checkbox.checked=hidden.has(section);
      checkbox.setAttribute('aria-label','Ocultar '+compactLabels[section]+' en '+(isMobile?'teléfono':'PC'));
      checkbox.addEventListener('change',()=>{
        if(checkbox.checked)hidden.add(section);else hidden.delete(section);
        sendPreview();
      });
      label.prepend(checkbox);line.append(label);
    }
    box.append(line);
  });
}
function fillCompactEditor(settings){
  compactOrderMobile=[...settings.compact_order_mobile];
  compactOrderDesktop=[...settings.compact_order_desktop];
  compactHiddenMobile=new Set(settings.compact_hidden_mobile);
  compactHiddenDesktop=new Set(settings.compact_hidden_desktop);
  for(const key of ['compact_mobile_title','compact_mobile_summary',
    'compact_mobile_hero_height','compact_desktop_hero_height'])
    form.elements.namedItem(key).value=settings[key];
  renderCompactOrder('mobile');renderCompactOrder('desktop');
}
function previewDevice(device){
  $('#design-workspace').dataset.previewDevice=device;
  $('#design-preview-mobile').setAttribute('aria-pressed',String(device==='mobile'));
  $('#design-preview-desktop').setAttribute('aria-pressed',String(device==='desktop'));
  sendPreview();
}
$('#design-preview-mobile').addEventListener('click',()=>previewDevice('mobile'));
$('#design-preview-desktop').addEventListener('click',()=>previewDevice('desktop'));


const bannerLocalPreviews=new Map();
let extraBanners=[],areaItems=[];
function freeExtraBannerPreview(row){
  for(const url of Object.values(bannerLocalPreviews.get(row)||{}))URL.revokeObjectURL(url);
  bannerLocalPreviews.delete(row);
}
function drawExtraBanners(){
  const host=$('#design-banner-slides');
  for(const row of host.children)freeExtraBannerPreview(row);
  host.replaceChildren();
  for(const banner of extraBanners)appendExtraBanner(banner);
  $('#design-add-banner').disabled=extraBanners.length>=7;
}
function captureExtraBanners(allowPreview=true){
  const list=[];
  for(const row of $('#design-banner-slides').children){
    const urls={};
    for(const screen of ['desktop','mobile']){
      const preview=allowPreview?bannerLocalPreviews.get(row)?.[screen]:null;
      urls[screen+'_url']=preview||row.querySelector('[data-banner-url="'+screen+'"]').value.trim();
    }
    if(urls.desktop_url||urls.mobile_url)list.push(urls);
  }
  return list;
}
function appendExtraBanner(banner={desktop_url:'',mobile_url:''}){
  const holder=$('#design-banner-slides');
  if(holder.children.length>=7)return;
  const row=document.createElement('section');
  row.className='banner-slide-editor';
  const title=document.createElement('h4');title.textContent='Banner extra '+(holder.children.length+2);
  row.append(title);
  const grid=document.createElement('div');grid.className='slide-fields';
  for(const screen of ['desktop','mobile']){
    const column=document.createElement('div');
    const caption=screen==='desktop'?'Computadora':'Teléfono';
    const urlLabel=document.createElement('label');
    urlLabel.textContent=caption+' · URL HTTPS';
    const url=document.createElement('input');url.type='url';
    url.maxLength=2000;url.placeholder='https://...';
    url.dataset.bannerUrl=screen;url.value=banner[screen+'_url']||'';
    urlLabel.append(url);
    const fileLabel=document.createElement('label');
    fileLabel.textContent=caption+' · Subir fotografía';
    const file=document.createElement('input');file.type='file';
    file.accept='image/jpeg,image/png,image/webp';file.dataset.bannerFile=screen;
    file.addEventListener('change',()=>{
      const current=bannerLocalPreviews.get(row)||{};
      if(current[screen])URL.revokeObjectURL(current[screen]);
      if(file.files[0])current[screen]=URL.createObjectURL(file.files[0]);
      else delete current[screen];
      if(Object.keys(current).length)bannerLocalPreviews.set(row,current);
      else bannerLocalPreviews.delete(row);
      sendPreview();
    });
    fileLabel.append(file);column.append(urlLabel,fileLabel);grid.append(column);
  }
  row.append(grid);
  const actions=document.createElement('div');actions.className='banner-slide-actions';
  for(const [label,delta] of [['↑ Subir',-1],['↓ Bajar',1]]){
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.addEventListener('click',()=>{
      const children=[...holder.children];const index=children.indexOf(row);
      if(index+delta<0||index+delta>=children.length)return;
      if(delta<0)holder.insertBefore(row,children[index+delta]);
      else holder.insertBefore(children[index+delta],row);
      renumberBannerSlides();sendPreview();
    });
    actions.append(button);
  }
  const remove=document.createElement('button');remove.type='button';
  remove.textContent='Quitar banner';
  remove.addEventListener('click',()=>{
    freeExtraBannerPreview(row);row.remove();renumberBannerSlides();sendPreview();
  });
  actions.append(remove);row.append(actions);
  holder.append(row);renumberBannerSlides();
}
function renumberBannerSlides(){
  const rows=[...$('#design-banner-slides').children];
  rows.forEach((row,i)=>row.querySelector('h4').textContent='Banner extra '+(i+2));
  $('#design-add-banner').disabled=busy||rows.length>=7;
}
$('#design-add-banner').addEventListener('click',()=>{appendExtraBanner();sendPreview();});
function drawAreaEditor(){
  const box=$('#design-areas-list');box.replaceChildren();
  for(const [index,area] of areaItems.entries()){
    const row=document.createElement('div');row.className='area-editor-row';
    const label=document.createElement('label');label.textContent='Área '+(index+1);
    const input=document.createElement('input');input.value=area.label;input.maxLength=45;
    input.dataset.areaLabel=area.id;label.append(input);row.append(label);
    const actions=document.createElement('div');actions.className='area-row-actions';
    const enabled=document.createElement('label');enabled.textContent='Mostrar';
    const checkbox=document.createElement('input');checkbox.type='checkbox';
    checkbox.checked=area.enabled!==false;
    checkbox.addEventListener('change',()=>{area.enabled=checkbox.checked;sendPreview();});
    enabled.prepend(checkbox);actions.append(enabled);
    for(const [arrow,delta] of [['↑',-1],['↓',1]]){
      const button=document.createElement('button');button.type='button';button.textContent=arrow;
      button.disabled=index+delta<0||index+delta>=areaItems.length;
      button.addEventListener('click',()=>{
        syncAreaLabels();
        const target=index+delta;
        [areaItems[index],areaItems[target]]=[areaItems[target],areaItems[index]];
        drawAreaEditor();sendPreview();
      });actions.append(button);
    }
    if(area.id.startsWith('personalizada-')){
      const remove=document.createElement('button');remove.type='button';remove.textContent='Quitar';
      remove.addEventListener('click',()=>{syncAreaLabels();areaItems.splice(index,1);drawAreaEditor();sendPreview();});
      actions.append(remove);
    }
    row.append(actions);box.append(row);
  }
  $('#design-add-area').disabled=busy||areaItems.length>=12;
}
function syncAreaLabels(){
  for(const area of areaItems){
    area.label=$('#design-areas-list').querySelector('[data-area-label="'+area.id+'"]')?.value.trim()||area.label;
  }
}
function readAreas(){syncAreaLabels();return areaItems.map(area=>({...area,terms:[...area.terms]}));}
$('#design-add-area').addEventListener('click',()=>{
  if(areaItems.length>=12)return;
  syncAreaLabels();
  const id='personalizada-'+Math.random().toString(36).slice(2,12);
  areaItems.push({id,label:'Nueva área',terms:[],enabled:true});
  drawAreaEditor();sendPreview();
});

function report(value,error=false){
  msg.textContent=value;
  msg.className=error?'design-status error':'design-status';
}
function setBusy(on){
  busy=on;
  for(const item of form.querySelectorAll('input,textarea,button'))item.disabled=on;
  $('#design-add-location').disabled=on||$('#design-location-fields').children.length>=8;
  $('#design-add-area').disabled=on||areaItems.length>=12;
  $('#design-add-banner').disabled=on||$('#design-banner-slides').children.length>=7;
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
  $('#design-banner-autoplay').checked=published.banner_autoplay;
  extraBanners=[...published.banner_extra_slides];
  drawExtraBanners();
  $('#design-auto-areas').checked=published.quick_auto_match;
  areaItems=published.quick_areas.map(area=>({...area,terms:[...area.terms]}));
  drawAreaEditor();
  fillCompactEditor(published);
  $('#design-logo-url').value=published.brand_logo_url;
  $('#design-logo-file').value='';
  drawLocationEditor(published);
  form.querySelector('#design-enabled').checked=published.enabled;
  const preset=form.querySelector('input[name="theme"][value="'+published.theme+'"]');
  if(preset)preset.checked=true;
  $('#design-replace-welcome').checked=published.replace_welcome;
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
    quick_areas:readAreas(),
    quick_auto_match:$('#design-auto-areas').checked,
    banner_extra_slides:captureExtraBanners(useFilePreview),
    banner_autoplay:$('#design-banner-autoplay').checked,
    replace_welcome:$('#design-replace-welcome').checked,
    locations_enabled:$('#design-locations-enabled').checked,
    locations:readLocations(useFilePreview),
    compact_order_mobile:[...compactOrderMobile],
    compact_order_desktop:[...compactOrderDesktop],
    compact_hidden_mobile:[...compactHiddenMobile],
    compact_hidden_desktop:[...compactHiddenDesktop],
    compact_mobile_title:read('compact_mobile_title'),
    compact_mobile_summary:read('compact_mobile_summary'),
    compact_mobile_hero_height:Number(read('compact_mobile_hero_height')),
    compact_desktop_hero_height:Number(read('compact_desktop_hero_height')),
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
  const labels={premium:'Premium',clinica:'Clínica',minimalista:'Minimalista',comercial:'Comercial','premium-confianza':'Premium Confianza','premium-compacta':'Premium Compacta Responsive'};
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
    const uploadedExtras=[];
    for(const row of $('#design-banner-slides').children){
      const slide={};
      for(const screen of ['desktop','mobile']){
        const file=row.querySelector('[data-banner-file="'+screen+'"]')?.files[0];
        const url=row.querySelector('[data-banner-url="'+screen+'"]').value.trim();
        if(file){
          report('Subiendo banner adicional de '+(screen==='desktop'?'PC':'teléfono')+'…');
          const uploaded=await uploadImage(file);
          toRemove.push(uploaded.path);
          slide[screen+'_url']=uploaded.url;
        }else{
          if(url&&!/^https:\/\//i.test(url))throw Error('Los banners adicionales requieren una URL HTTPS.');
          slide[screen+'_url']=url;
        }
      }
      if(slide.desktop_url||slide.mobile_url)uploadedExtras.push(slide);
    }
    requested.banner_extra_slides=uploadedExtras;
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
      for(const key of ['photo_url','interior_url']){
        const file=locationUploads[i][key];
        if(!file)continue;
        report('Subiendo foto '+(key==='photo_url'?'principal':'interior')+
          ' de sucursal '+(i+1)+'…');
        const uploaded=await uploadImage(file);
        toRemove.push(uploaded.path);
        requested.locations[i][key]=uploaded.url;
      }
    }
    // No alterar URL/fotos anteriores hasta que la subida nueva finalice.
    for(const [i,section] of [...$('#design-location-fields').children].entries()){
      const gallery=[];
      for(const row of section.querySelectorAll('.location-extra-row')){
        const file=row.querySelector('[data-location-extra-file]')?.files[0];
        const url=row.querySelector('[data-location-extra-url]').value.trim();
        if(file){
          report('Subiendo foto adicional de sucursal '+(i+1)+'…');
          const uploaded=await uploadImage(file);
          toRemove.push(uploaded.path);
          gallery.push(uploaded.url);
        }else if(url){
          if(!/^https:\/\//i.test(url))throw Error('Las fotografías adicionales requieren HTTPS.');
          gallery.push(url);
        }
      }
      requested.locations[i].gallery_urls=gallery;
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
