import {loadPublicCatalog} from './catalog-public-data.js';
import {cloudinaryImage,setCardImage} from './catalog-images.js';
import {whatsappInquiryURL} from './contact-links.js';
import {normalizeStorefront,STORE_THEMES} from './storefront-settings.js';
import {CART_LIMIT,CART_STORAGE_KEY,cartQuantity,normalizeCartLines,addCartLine,updateCartLine,removeCartLine,cartTotals,cartWhatsAppURL} from './quote-cart.js';

// El catálogo público lee únicamente catalogPublic, sin los SDK de Auth y Storage.
const $=selector=>document.querySelector(selector);
const grid=$('#products'), status=$('#catalog-status'),search=$('#product-search'),
  brand=$('#brand-filter'),available=$('#available'),more=$('#more'),dialog=$('#detail'),
  shortcuts=$('#brand-shortcuts'),copyBrand=$('#copy-brand'),hero=$('#brand-hero'),
  back=$('#brand-back-cover');
const labels={available:'Disponible',sold_out:'Agotado'};
let products=[],profiles=[],contacts=[],shareIds=new Set(),searchIndex=new Map();
const previewStorefront=new URLSearchParams(location.search).get('vista')==='1';
let storefrontSettings=null,storefrontDraft=null;
let selected=null,filtered=[],limit=12,searchTimer=0;
let cartLines=[],catalogLoaded=false;
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function legacy(){
  if(typeof paginas==='undefined')return [];
  return paginas.filter(p=>![1,16,30].includes(p.pagina))
    .map(p=>({id:'adalta-'+p.pagina,name:p.nombre,brand:'ADALTA',
      image_url:p.archivo,status:'available',description:'',sort_order:p.pagina}));
}
function element(tag,value,className){
  const item=document.createElement(tag);
  if(value!==undefined&&value!==null)item.textContent=value;
  if(className)item.className=className;
  return item;
}
function imageUrl(value){
  try{const u=new URL(value,location.href);return ['https:','http:'].includes(u.protocol)?u.href:'';}
  catch{return '';}
}
function brandUrl(name) {
  const url=new URL(location.href);
  url.searchParams.delete('marca');
  if(name)url.searchParams.set('marca',name);
  url.hash='';
  return url.href;
}
function productUrl(p) {
  const url=new URL('./',location.href);
  url.searchParams.set('marca',p.brand);
  url.hash='producto='+encodeURIComponent(p.id);
  return url.href;
}
function shareProductUrl(p) {
  return shareIds.has(String(p.id))
    ? new URL('share/'+encodeURIComponent(p.id)+'/',import.meta.url).href
    : productUrl(p);
}
async function loadShareManifest() {
  try {
    const response=await fetch(new URL('share/manifest.json',import.meta.url),{
      cache:'no-cache',signal:AbortSignal.timeout(7500)});
    if(!response.ok)return new Set();
    const data=await response.json();
    return new Set(Array.isArray(data.ids)?data.ids.filter(id=>typeof id==='string'):[]);
  }catch{return new Set();}
}
function drawBrands(){
  const counts=new Map();
  for(const product of products)counts.set(product.brand,(counts.get(product.brand)||0)+1);
  const names=[...new Set([...counts.keys(),...profiles.map(p=>p.name)])].sort();
  const fragment=document.createDocumentFragment();
  for(const name of names){
    const button=element('button',name+' · '+(counts.get(name)||0),'brand-shortcut');
    button.type='button';
    const p=profiles.find(x=>x.name===name);
    if(p?.logo_url) {
      const img=element('img');img.src=cloudinaryImage(imageUrl(p.logo_url),120);
      img.alt='';img.width=26;img.height=26;img.loading='lazy';img.decoding='async';
      button.prepend(img);
    }
    button.addEventListener('click',()=>selectBrand(name));
    if(brand.value===name)button.classList.add('active');
    fragment.append(button);
  }
  shortcuts.replaceChildren(fragment);
  copyBrand.hidden=!brand.value;
}
function renderBrandHero(){
  hero.replaceChildren();
  back.replaceChildren();
  hero.hidden=!brand.value;
  back.hidden=true;
  if(!brand.value)return;
  const name=brand.value,profile=profiles.find(p=>p.name===name);
  const main=element('div',null,'brand-hero-content');
  if(profile?.cover_url) {
    const cover=element('img',null,'brand-hero-cover');
    cover.src=cloudinaryImage(imageUrl(profile.cover_url),1440);
    cover.alt='Portada de '+name;cover.loading='eager';cover.decoding='async';
    hero.append(cover);
  }
  if(profile?.logo_url){
    const logo=element('img',null,'brand-hero-logo');
    logo.src=cloudinaryImage(imageUrl(profile.logo_url),420);
    logo.alt='Logotipo original de '+name;
    main.append(logo);
  }
  main.append(element('p','CATÁLOGO POR MARCA','eyebrow'),element('h2',name));
  if(profile?.tagline)main.append(element('p',profile.tagline,'brand-hero-tagline'));
  main.append(element('p',profile?.description||'Odontología y laboratorio dental.','brand-hero-description'));
  const meta=element('div',null,'brand-hero-meta');
  const total=products.filter(p=>p.brand===name).length;
  meta.append(element('span',total+' producto'+(total===1?'':'s')));
  const reset=element('button','Ver todas las marcas','brand-hero-reset');
  reset.type='button';reset.addEventListener('click',()=>selectBrand(''));
  meta.append(reset);main.append(meta);hero.append(main);
  if(profile?.back_cover_url){
    const finish=element('div',null,'brand-back-message');
    finish.append(element('p','CATÁLOGO DE '+name,'eyebrow'),
      element('h2','Gracias por explorar '+name));
    finish.append(element('p',contacts.length
      ? '¿Te interesa algún producto? Abre su ficha y consulta directamente con nuestro equipo por WhatsApp.'
      : 'Explora nuestros productos y descubre las opciones de odontología y laboratorio dental.'));
    const img=element('img');
    img.src=cloudinaryImage(imageUrl(profile.back_cover_url),900);
    img.alt='Contraportada de '+name;img.loading='lazy';img.decoding='async';
    back.append(finish,img);
  }
}


function renderPremiumSections(values,active){
  const premium=active&&values.theme==='premium-confianza';
  const about=$('#premium-about'),steps=$('#premium-steps'),closing=$('#premium-closing');
  about.hidden=!(premium&&values.about_enabled);
  steps.hidden=!(premium&&values.steps_enabled);
  closing.hidden=!premium;
  if(!premium)return;
  if(values.about_enabled){
    $('#premium-about-title').textContent=values.about_title;
    $('#premium-about-text').textContent=values.about_text;
    const benefits=$('#premium-benefits');benefits.replaceChildren();
    const symbols=['⌂','🛒','▣','◉'];
    values.benefit_items.forEach((item,index)=>{
      const card=element('article',null,'premium-benefit');
      const icon=element('span',symbols[index],'premium-benefit-icon');
      icon.setAttribute('aria-hidden','true');
      card.append(icon,element('h3',item.title),element('p',item.text));benefits.append(card);
    });
  }
  if(values.steps_enabled){
    $('#premium-steps-title').textContent=values.steps_title;
    const grid=$('#premium-steps-grid');grid.replaceChildren();
    values.steps.forEach((item,index)=>{
      const card=element('article',null,'premium-step');
      card.append(element('span',String(index+1),'premium-step-number'),
        element('h3',item.title),element('p',item.text));
      grid.append(card);
    });
  }
  $('#premium-closing-title').textContent=values.closing_title;
  $('#premium-closing-text').textContent=values.closing_text;
  const link=$('#premium-closing-whatsapp');
  const phone=values.locations.find(x=>x.phone)?.phone||contacts[0]?.phone||'';
  link.hidden=!phone;
  if(phone)link.href='https://wa.me/'+phone;
  else link.removeAttribute('href');
}
function renderOfficialLocations(values,active){
  const section=$('#official-locations'),grid=$('#official-locations-grid');
  const visible=active&&values.locations_enabled&&values.locations?.length>0;
  section.hidden=!visible;
  if(!visible)return;
  $('#official-locations-title').textContent=values.locations_title;
  $('#official-locations-intro').textContent=values.locations_intro;
  grid.replaceChildren();
  for(const location of values.locations){
    const card=element('article',null,'official-location-card');
    if(location.photo_url){
      const image=element('img',null,'official-location-image');
      image.src=location.photo_url;image.alt='Fotografía de '+location.name;
      image.loading='lazy';image.decoding='async';
      card.append(image);
    }
    const content=element('div',null,'official-location-copy');
    content.append(element('h3',location.name));
    for(const line of [location.city,location.address,location.hours?'Horario: '+location.hours:'',location.rif?'RIF: '+location.rif:'']){
      if(line)content.append(element('p',line));
    }
    content.append(element('p','Compra directa y retiro en tienda'));
    const actions=element('div',null,'official-location-actions');
    if(location.address){
      const directions=element('a','Cómo llegar');
      directions.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(location.address+', '+location.city+', Venezuela');
      directions.target='_blank';directions.rel='noopener noreferrer';
      actions.append(directions);
    }
    if(location.phone){
      const contact=element('a','WhatsApp');
      contact.href='https://wa.me/'+location.phone;
      contact.target='_blank';contact.rel='noopener noreferrer';
      actions.append(contact);
    }
    content.append(actions);card.append(content);grid.append(card);
  }
}

function renderStorefront(){
  const values=normalizeStorefront(storefrontDraft||storefrontSettings,previewStorefront);
  const design=previewStorefront||values.enabled;
  const active=design&&!brand.value;
  const stage=$('#storefront-home');
  stage.hidden=!active;
  renderOfficialLocations(values,active);
  renderPremiumSections(values,active);
  $('#storefront-locations-link').hidden=!(active&&values.locations_enabled&&values.locations.length>0);
  $('.intro').hidden=design;
  document.body.classList.toggle('storefront-active',design);
  for(const name of STORE_THEMES)document.body.classList.remove('storefront-theme-'+name);
  if(design)document.body.classList.add('storefront-theme-'+values.theme);
  $('#storefront-brands-title').textContent=design?values.brands_title:'Explora por marca';
  if(!active)return;
  const field={eyebrow:values.eyebrow,title:values.title,subtitle:values.subtitle,
    primary:values.primary_label,secondary:values.secondary_label,
    'featured-title':values.featured_title};
  for(const [key,value]of Object.entries(field))$('#storefront-'+key).textContent=value;
  values.trust_items.forEach((t,i)=>$('#storefront-trust-'+(i+1)).textContent=t);
  const picture=$('#storefront-picture'),banner=$('#storefront-banner'),source=$('#storefront-mobile-source'),
    art=$('#storefront-products-art'),heroStage=$('#storefront-hero');
  const desktop=values.banner_desktop_url,mobile=values.banner_mobile_url;
  const hasBanner=Boolean(desktop||mobile);
  const premiumHero=$('#premium-hero-photo');
  const photo=values.theme==='premium-confianza' && active && !hasBanner
    ?values.locations.find(location=>location.photo_url)?.photo_url||'':'';
  premiumHero.hidden=!photo;
  if(photo)premiumHero.src=photo;
  else premiumHero.removeAttribute('src');
  picture.hidden=!hasBanner;
  art.hidden=hasBanner||Boolean(photo);
  heroStage.classList.toggle('storefront-has-banner',hasBanner);
  if(hasBanner){
    banner.src=desktop||mobile;
    if(mobile)source.srcset=mobile;
    else source.removeAttribute('srcset');
  }else{
    banner.removeAttribute('src');
    source.removeAttribute('srcset');
    if(!art.childElementCount){
      const samples=products.filter(p=>p.status==='available'&&p.image_url)
        .filter((p,i,a)=>a.findIndex(x=>x.brand===p.brand)===i).slice(0,2);
      for(const p of samples){
        const img=element('img');img.src=cloudinaryImage(imageUrl(p.image_url),400);
        img.alt='';img.loading='lazy';art.append(img);
      }
    }
  }
  const counts=new Map();
  for(const p of products)counts.set(p.brand,(counts.get(p.brand)||0)+1);
  const selectedBrands=values.featured_brands.filter(n=>counts.has(n)).slice(0,4);
  if(!selectedBrands.length){
    selectedBrands.push(...[...counts.keys()].slice(0,3));
  }
  const block=$('#storefront-featured');
  block.hidden=selectedBrands.length===0;
  const grid=$('#storefront-featured-grid');
  grid.replaceChildren();
  for(const name of selectedBrands){
    const item=element('button',null,'storefront-brand-card');item.type='button';
    const profile=profiles.find(p=>p.name===name);
    const img=element('img');const thumb=profile?.logo_url||products.find(p=>p.brand===name)?.image_url||'';
    img.src=cloudinaryImage(imageUrl(thumb),240);img.alt='';img.loading='lazy';img.decoding='async';
    const info=element('div',null,'storefront-brand-info');
    info.append(element('strong',name),element('span',(counts.get(name)||0)+' productos disponibles o agotados'));
    item.append(img,info,element('span','Ver →','storefront-brand-arrow'));
    item.addEventListener('click',()=>{
      selectBrand(name);
      $('.brands-area').scrollIntoView({behavior:'smooth',block:'start'});
    });
    grid.append(item);
  }
}
if(previewStorefront){
  // Sólo mensajes desde la página administradora del mismo dominio.
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==window.parent ||
       event.data?.type!=='poladent:storefront-draft')return;
    storefrontDraft=normalizeStorefront(event.data.settings,true);
    renderStorefront();
  });
}
$('#storefront-primary').addEventListener('click',()=>setTimeout(()=>{
  $('#brand-shortcuts')?.scrollIntoView({behavior:'smooth',block:'start'});
},0));
$('#storefront-secondary').addEventListener('click',()=>setTimeout(()=>{
  $('#product-search')?.focus({preventScroll:true});
},0));

function buildCard(p,index){
  const card=element('article',null,'product-card'),button=element('button',null,'image-button');
  button.type='button';button.setAttribute('aria-label','Ver '+p.name);
  const img=element('img');img.alt=p.name;
  setCardImage(img,imageUrl(p.image_url),index);
  button.append(img);button.addEventListener('click',()=>open(p));
  card.append(button,element('p',p.brand,'eyebrow'),element('h2',p.name),
    element('span',labels[p.status]||'Disponible','badge '+p.status));
  const view=element('button','Ver producto');view.type='button';
  view.addEventListener('click',()=>open(p));
  const add=element('button','+ Agregar a cotización','card-cart-add');
  add.type='button';add.dataset.cartAdd=String(p.id);
  add.addEventListener('click',()=>addToCart(p));
  card.append(view,add);return card;
}
function appendCards(rows,start){
  const fragment=document.createDocumentFragment();
  rows.forEach((p,i)=>fragment.append(buildCard(p,start+i)));
  grid.append(fragment);
}
function updatePagination(){
  more.hidden=filtered.length<=limit;
  const hasBackCover=back.childElementCount>0;
  back.hidden=!hasBackCover||!brand.value||!more.hidden||Boolean(search.value.trim())||available.checked;
}
function renderProducts(){
  const q=normalize(search.value);
  filtered=products.filter(p=>(!brand.value||p.brand===brand.value)
    &&(!available.checked||p.status==='available')
    &&(!q||searchIndex.get(p.id)?.includes(q)));
  grid.replaceChildren();
  appendCards(filtered.slice(0,limit),0);
  status.textContent=filtered.length?filtered.length+' productos':'No encontramos productos con estos filtros.';
  updatePagination();
  refreshCartButtons();
}
function selectBrand(name){
  brand.value=name;
  limit=12;
  drawBrands();
  renderBrandHero();
  renderProducts();
  history.replaceState(null,'',brandUrl(name));
  renderStorefront();
}
const cartDialog=$('#cart-dialog'),cartForm=$('#cart-form'),cartOpen=$('#cart-open'),
  cartWhatsApp=$('#cart-whatsapp'),cartItems=$('#cart-items'),cartMessage=$('#cart-message');
function restoreCart(){
  try{
    const stored=JSON.parse(sessionStorage.getItem(CART_STORAGE_KEY)||'[]');
    const result=normalizeCartLines(stored,products);
    // Productos eliminados/ocultos se purgan; solo guardamos IDs y cantidades.
    cartLines=result;
    persistCart();
    return result;
  }catch{return [];}
}
function persistCart(){
  try{sessionStorage.setItem(CART_STORAGE_KEY,JSON.stringify(cartLines));}
  catch{/* El carrito también funciona en memoria si el navegador bloquea almacenamiento. */}
}
function refreshCartButtons(){
  const amounts=new Map(cartLines.map(x=>[x.id,x.quantity]));
  for(const btn of document.querySelectorAll('[data-cart-add]')){
    const q=amounts.get(btn.dataset.cartAdd)||0;
    btn.textContent=q?'✓ Agregado · '+q+' (+1)':'+ Agregar a cotización';
  }
  const detailAdd=$('#detail-cart-add');
  if(selected){
    const q=amounts.get(String(selected.id))||0;
    detailAdd.textContent=q?'✓ Agregado · '+q+' (añadir 1 más)':'+ Agregar a mi cotización';
  }
}
function showCartMessage(value,error=false){
  cartMessage.textContent=value;
  cartMessage.classList.toggle('error',error);
}
function cartContactOptions(){
  const chooser=$('#cart-contact'),previous=chooser.value;
  chooser.replaceChildren();
  for(const c of contacts){
    const option=element('option',c.label);option.value=c.phone;chooser.append(option);
  }
  if(contacts.some(c=>c.phone===previous))chooser.value=previous;
}
function updateCartLink(){
  if(!catalogLoaded)return;
  const details={city:$('#cart-city').value,timing:$('#cart-timing').value};
  const url=cartWhatsAppURL($('#cart-contact').value,cartLines,products,details,shareProductUrl);
  if(url){
    cartWhatsApp.href=url;
    cartWhatsApp.setAttribute('aria-disabled','false');
    cartWhatsApp.textContent='Enviar una sola cotización por WhatsApp ↗';
    if(cartMessage.classList.contains('error'))showCartMessage('WhatsApp abrirá el mensaje preparado; debes pulsar Enviar allí.');
  }else{
    cartWhatsApp.removeAttribute('href');
    cartWhatsApp.setAttribute('aria-disabled','true');
    cartWhatsApp.textContent='Completa los datos para cotizar ↗';
    if(cartLines.length && contacts.length && cartForm.checkValidity()){
      showCartMessage('El mensaje sería demasiado largo para algunos teléfonos. Quita algunos productos y envía dos cotizaciones.',true);
    }
  }
}
function renderCart(){
  const amounts=cartTotals(cartLines);
  $('#cart-count').textContent=String(amounts.products);
  cartOpen.disabled=!catalogLoaded;
  $('#cart-empty').hidden=amounts.products>0;
  cartForm.hidden=amounts.products===0;
  cartItems.replaceChildren();
  for(const line of cartLines){
    const p=products.find(p=>String(p.id)===line.id);
    if(!p)continue;
    const item=element('article',null,'cart-item');
    const img=element('img');img.src=cloudinaryImage(imageUrl(p.image_url),240);
    img.alt='';img.loading='lazy';img.width=100;img.height=100;
    const detail=element('div',null,'cart-item-details');
    detail.append(element('strong',p.name),element('span',p.brand));
    if(p.status==='sold_out')detail.append(element('span','Agotado · consultar disponibilidad','cart-sold-out'));
    const controls=element('div',null,'cart-item-controls');
    const countLabel=element('label','Cantidad');
    const quantity=element('input');
    quantity.type='number';quantity.min='1';quantity.max='9999';quantity.step='1';
    quantity.inputMode='numeric';quantity.value=String(line.quantity);
    quantity.setAttribute('aria-label','Cantidad para '+p.name);
    countLabel.append(quantity);
    quantity.addEventListener('change',()=>{
      const n=cartQuantity(quantity.value);
      if(n===null){
        quantity.value=String(line.quantity);
        showCartMessage('Indica entre 1 y 9.999 unidades.',true);
        return;
      }
      cartLines=updateCartLine(cartLines,line.id,n,products);
      persistCart();renderCart();
    });
    const remove=element('button','Quitar');remove.type='button';
    remove.setAttribute('aria-label','Quitar '+p.name+' de la cotización');
    remove.addEventListener('click',()=>{
      cartLines=removeCartLine(cartLines,line.id,products);
      persistCart();renderCart();showCartMessage('Producto retirado de la cotización.');
    });
    controls.append(countLabel,remove);
    item.append(img,detail,controls);cartItems.append(item);
  }
  $('#cart-totals').textContent=amounts.products+' producto'+(amounts.products===1?' diferente':'s diferentes')+
    ' · '+amounts.units+' unidad'+(amounts.units===1?'':'es')+' · Sin precios';
  cartContactOptions();
  if(!contacts.length&&cartLines.length)showCartMessage('Los contactos de WhatsApp no están configurados. Intenta de nuevo más tarde.',true);
  updateCartLink();
  refreshCartButtons();
}
function addToCart(p){
  try{
    cartLines=addCartLine(cartLines,String(p.id),products);
    persistCart();
    renderCart();
    $('#cart-feedback').textContent=p.name+' agregado. Tienes '+cartLines.length+
      ' de '+CART_LIMIT+' productos posibles en tu cotización.';
  }catch(error){
    $('#cart-feedback').textContent=error.message;
  }
}
$('#detail-cart-add').addEventListener('click',()=>{if(selected)addToCart(selected);});
cartOpen.addEventListener('click',()=>{
  if(!catalogLoaded)return;
  renderCart();
  if(dialog.open)dialog.close();
  cartDialog.showModal();
});
$('#cart-close').addEventListener('click',()=>cartDialog.close());
cartForm.addEventListener('input',updateCartLink);
cartForm.addEventListener('change',updateCartLink);
cartForm.addEventListener('submit',event=>{
  event.preventDefault();
  updateCartLink();
  if(cartForm.reportValidity())cartWhatsApp.focus();
});
cartWhatsApp.addEventListener('click',event=>{
  updateCartLink();
  if(!cartWhatsApp.hasAttribute('href')||!cartForm.reportValidity()){
    event.preventDefault();
    showCartMessage('Completa los datos de la cotización antes de abrir WhatsApp.',true);
  }
});
cartWhatsApp.addEventListener('keydown',event=>{
  if(cartWhatsApp.getAttribute('aria-disabled')==='true'&&['Enter',' '].includes(event.key)){
    event.preventDefault();
    cartForm.reportValidity();
  }
});

const quoteForm=$('#quote-form'),quoteLink=$('#inquiry-whatsapp');
function updateQuoteLink(){
  if(!selected||!contacts.length)return;
  const details={
    quantity:$('#quote-quantity').value,
    city:$('#quote-city').value,
    timing:$('#quote-timing').value
  };
  const url=whatsappInquiryURL($('#inquiry-contact').value,selected,shareProductUrl(selected),details);
  if(url){
    quoteLink.href=url;
    quoteLink.setAttribute('aria-disabled','false');
    quoteLink.textContent=selected.status==='sold_out'
      ?'Solicitar cotización y disponibilidad por WhatsApp ↗'
      :'Solicitar cotización por WhatsApp ↗';
  }else{
    quoteLink.removeAttribute('href');
    quoteLink.setAttribute('aria-disabled','true');
    quoteLink.textContent='Completa los datos para solicitar cotización ↗';
  }
}
function renderInquiry(){
  const block=$('#product-inquiry'),chooser=$('#inquiry-contact'),
    label=$('#inquiry-contact-label');
  const previous=chooser.value;
  block.hidden=!selected||contacts.length===0;
  chooser.replaceChildren();
  if(block.hidden)return;
  for(const contact of contacts){
    const option=element('option',contact.label);option.value=contact.phone;chooser.append(option);
  }
  if(contacts.some(c=>c.phone===previous))chooser.value=previous;
  label.hidden=contacts.length===1;
  $('#quote-title').textContent=selected.status==='sold_out'
    ?'Consulta disponibilidad y solicita cotización':'Solicita una cotización';
  updateQuoteLink();
}
quoteForm.addEventListener('input',updateQuoteLink);
quoteForm.addEventListener('change',updateQuoteLink);
quoteForm.addEventListener('submit',event=>{
  // El formulario no debe recargar la página; al completarlo el usuario
  // activa el enlace real de WhatsApp con Enter o tocándolo.
  event.preventDefault();
  updateQuoteLink();
  if(quoteForm.reportValidity())quoteLink.focus();
});
quoteLink.addEventListener('click',event=>{
  updateQuoteLink();
  if(!quoteLink.hasAttribute('href')||!quoteForm.reportValidity())event.preventDefault();
});
quoteLink.addEventListener('keydown',event=>{
  if(quoteLink.getAttribute('aria-disabled')==='true'&&['Enter',' '].includes(event.key)){
    event.preventDefault();
    quoteForm.reportValidity();
  }
});
function open(p){
  selected=p;
  quoteForm.reset();
  const image=$('#detail-image');
  image.src=imageUrl(p.image_url);image.alt=p.name;
  for(const [id,value] of [
    ['detail-name',p.name],['detail-brand',p.brand],['detail-status',labels[p.status]],
    ['detail-description',p.description||''],['share-status','']]){
    document.getElementById(id).textContent=value||'';
  }
  history.replaceState(null,'',productUrl(p));
  renderInquiry();
  if(!dialog.open)dialog.showModal();
  document.dispatchEvent(new CustomEvent('catalog:product-open',{detail:{id:String(p.id),brand:String(p.brand)}}));
}
$('#close-detail').onclick=()=>dialog.close();
dialog.onclose=()=>{selected=null;history.replaceState(null,'',brandUrl(brand.value));};
$('#share-product').onclick=async()=>{
  if(!selected)return;
  try{
    await navigator.clipboard.writeText(shareProductUrl(selected));
    $('#share-status').textContent='Enlace del producto copiado.';
  }catch{$('#share-status').textContent='Copia el enlace de la barra del navegador.';}
};
search.addEventListener('input',()=>{
  limit=12;clearTimeout(searchTimer);
  searchTimer=setTimeout(renderProducts,130);
});
brand.addEventListener('change',()=>selectBrand(brand.value));
available.addEventListener('change',()=>{limit=12;renderProducts();});
copyBrand.onclick=async()=>{
  const url=brandUrl(brand.value);
  try{await navigator.clipboard.writeText(url);copyBrand.textContent='Enlace copiado';}
  catch{copyBrand.textContent='Enlace: '+url;}
};
more.onclick=()=>{
  const previous=limit;
  limit+=12;
  appendCards(filtered.slice(previous,limit),previous);
  updatePagination();
  refreshCartButtons();
};
async function load(){
  // No bloquear el catálogo esperando a las vistas previas de WhatsApp.
  loadShareManifest().then(ids=>{shareIds=ids;if(selected)renderInquiry();updateCartLink();});
  try{
    const cfg=window.CATALOGO_FIREBASE||{};
    if(cfg.apiKey&&cfg.projectId&&cfg.appId){
      const data=await loadPublicCatalog(cfg);
      products=data.hasCatalogState||data.products.length?data.products:legacy();
      profiles=data.profiles;
      contacts=data.contacts;
      storefrontSettings=data.storefront;
    }else products=legacy();
    cartLines=restoreCart();
    catalogLoaded=true;
    renderCart();
    searchIndex=new Map(products.map(p=>[p.id,normalize(p.name+' '+p.brand)]));
    const names=[...new Set([...products.map(p=>p.brand),...profiles.map(p=>p.name)])].sort();
    const fragment=document.createDocumentFragment();
    for(const name of names){
      const option=element('option',name);option.value=name;fragment.append(option);
    }
    brand.append(fragment);
    const fromLink=new URLSearchParams(location.search).get('marca');
    if(fromLink&&names.includes(fromLink))brand.value=fromLink;
    drawBrands();
    renderBrandHero();
    renderProducts();
    renderStorefront();
    if(previewStorefront && window.parent!==window)
      window.parent.postMessage({type:'poladent:storefront-ready'},location.origin);
    const productId=new URLSearchParams(location.hash.slice(1)).get('producto');
    if(productId){
      const product=products.find(p=>String(p.id)===productId);
      if(product)open(product);
    }
  }catch(error){
    status.textContent='No pudimos cargar el catálogo. Intenta recargar la página.';
    console.error('Error de carga pública:',error);
  }
}
load();
