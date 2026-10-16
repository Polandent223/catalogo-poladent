import{configured,listProducts,listBrands,getWhatsAppContacts,validImage}from'./catalog-service.js';
import {whatsappInquiryURL} from './contact-links.js';
const grid=document.querySelector('#products'),status=document.querySelector('#catalog-status'),search=document.querySelector('#product-search'),brand=document.querySelector('#brand-filter'),available=document.querySelector('#available'),more=document.querySelector('#more'),dialog=document.querySelector('#detail');let products=[],profiles=[],contacts=[],shareIds=new Set(),limit=12;const shortcuts=document.querySelector('#brand-shortcuts'),copyBrand=document.querySelector('#copy-brand');
const labels={available:'Disponible',sold_out:'Agotado'};
function legacy(){return paginas.filter(p=>![1,16,30].includes(p.pagina)).map(p=>({id:'adalta-'+p.pagina,name:p.nombre,brand:'ADALTA',image_url:p.archivo,status:'available',description:'',sort_order:p.pagina}))}
function element(tag,text,className){const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e}
function brandUrl(name){const u=new URL(location.href);u.searchParams.delete('marca');if(name)u.searchParams.set('marca',name);u.hash='';return u.href}
function selectBrand(name){brand.value=name;limit=12;render();history.replaceState(null,'',brandUrl(name));}
function drawBrands(){shortcuts.replaceChildren();for(const name of [...new Set([...products.map(p=>p.brand),...profiles.map(p=>p.name)])].sort()){const item=element('button',null,'brand-shortcut'),count=products.filter(p=>p.brand===name).length;item.type='button';item.textContent=name+' · '+count;const profile=profiles.find(p=>p.name===name);if(profile?.logo_url){const img=element('img');img.alt='';img.src=validImage(profile.logo_url);img.loading='lazy';item.prepend(img)}item.onclick=()=>selectBrand(name);if(brand.value===name)item.classList.add('active');shortcuts.append(item)}copyBrand.hidden=!brand.value;}
function renderBrandHero(){
  const hero=document.querySelector('#brand-hero'),back=document.querySelector('#brand-back-cover');
  hero.replaceChildren();back.replaceChildren();
  const name=brand.value;
  hero.hidden=!name;back.hidden=true;
  if(!name)return;
  const p=profiles.find(x=>x.name===name);
  const main=element('div',null,'brand-hero-content');
  if(p?.cover_url){
    const cover=element('img',null,'brand-hero-cover');cover.src=validImage(p.cover_url);
    cover.alt='Portada de '+name;cover.loading='eager';hero.append(cover);
  }
  if(p?.logo_url){
    const logo=element('img',null,'brand-hero-logo');logo.src=validImage(p.logo_url);
    logo.alt='Logotipo original de '+name;main.append(logo);
  }
  main.append(element('p','CATÁLOGO POR MARCA','eyebrow'),element('h2',name));
  if(p?.tagline)main.append(element('p',p.tagline,'brand-hero-tagline'));
  if(p?.description)main.append(element('p',p.description,'brand-hero-description'));
  else main.append(element('p','Odontología y laboratorio dental.','brand-hero-description'));
  const meta=element('div',null,'brand-hero-meta');
  const total=products.filter(x=>x.brand===name).length;
  meta.append(element('span',total+' producto'+(total===1?'':'s')));
  const reset=element('button','Ver todas las marcas','brand-hero-reset');
  reset.type='button';reset.onclick=()=>selectBrand('');
  meta.append(reset);main.append(meta);hero.append(main);
  if(p?.back_cover_url){
    back.hidden=false;
    const img=element('img');img.src=validImage(p.back_cover_url);
    img.alt='Contraportada de '+name;img.loading='lazy';
    const finish=element('div',null,'brand-back-message');
    finish.append(element('p','CATÁLOGO DE '+name,'eyebrow'),element('h2','Gracias por explorar '+name));
    finish.append(element('p',contacts.length?'¿Te interesa algún producto? Abre su ficha y consulta directamente con nuestro equipo por WhatsApp.':'Explora nuestros productos y descubre las opciones de odontología y laboratorio dental.'));
    back.append(finish,img);
  }
}
function render(){drawBrands();renderBrandHero();const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const q=normalize(search.value);const filtered=products.filter(p=>(!brand.value||p.brand===brand.value)&&(!available.checked||p.status==='available')&&normalize(p.name+' '+p.brand).includes(q));grid.replaceChildren();for(const p of filtered.slice(0,limit)){const card=element('article',null,'product-card'),button=element('button',null,'image-button'),img=element('img');img.src=validImage(p.image_url);img.alt=p.name;img.width=720;img.height=720;img.loading='lazy';img.decoding='async';button.append(img);button.onclick=()=>open(p);card.append(button,element('p',p.brand,'eyebrow'),element('h2',p.name),element('span',labels[p.status]||'Disponible','badge '+p.status));const view=element('button','Ver producto');view.onclick=()=>open(p);card.append(view);grid.append(card)}status.textContent=filtered.length?`${filtered.length} productos`:'No encontramos productos con estos filtros.';more.hidden=filtered.length<=limit; if(!more.hidden||search.value.trim()||available.checked)document.querySelector('#brand-back-cover').hidden=true}
function productUrl(p){
  const url=new URL('./',location.href);
  url.searchParams.set('marca',p.brand);
  url.hash='producto='+encodeURIComponent(p.id);
  return url.href;
}
// Los enlaces OG se activan únicamente cuando la página individual existe.
// Los productos recién añadidos mantienen su enlace antiguo hasta la próxima sincronización.
function shareProductUrl(p){
  if(shareIds.has(String(p.id)))return new URL('share/'+encodeURIComponent(p.id)+'/',import.meta.url).href;
  return productUrl(p);
}
async function loadShareManifest(){
  try{
    const url=new URL('share/manifest.json',import.meta.url);
    const result=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(7500)});
    if(!result.ok)return new Set();
    const data=await result.json();
    if(!Array.isArray(data.ids))return new Set();
    return new Set(data.ids.filter(v=>typeof v==='string'));
  }catch{return new Set();}
}
let selected=null;
function renderInquiry(){
  const block=document.querySelector('#product-inquiry'),chooser=document.querySelector('#inquiry-contact');
  const label=document.querySelector('#inquiry-contact-label'),link=document.querySelector('#inquiry-whatsapp');
  block.hidden=!selected||contacts.length===0;
  chooser.replaceChildren();
  if(block.hidden)return;
  for(const contact of contacts){
    const option=element('option',contact.label);option.value=contact.phone;chooser.append(option);
  }
  label.hidden=contacts.length===1;
  function update(){
    link.href=whatsappInquiryURL(chooser.value,selected,shareProductUrl(selected));
    link.textContent=selected.status==='sold_out'?'Consultar disponibilidad por WhatsApp ↗':'Consultar por WhatsApp ↗';
  }
  chooser.onchange=update;
  update();
}
function open(p){
  selected=p;
  document.querySelector('#detail-image').src=validImage(p.image_url);
  document.querySelector('#detail-image').alt=p.name;
  for(const [id,value]of [['detail-name',p.name],['detail-brand',p.brand],['detail-status',labels[p.status]],['detail-description',p.description||''],['share-status','']])document.getElementById(id).textContent=value;
  history.replaceState(null,'',productUrl(p));
  renderInquiry();
  if(!dialog.open)dialog.showModal();
}
document.querySelector('#close-detail').onclick=()=>dialog.close();dialog.onclose=()=>{selected=null;history.replaceState(null,'',brandUrl(brand.value));};document.querySelector('#share-product').onclick=async()=>{try{await navigator.clipboard.writeText(shareProductUrl(selected));document.querySelector('#share-status').textContent='Enlace del producto copiado.'}catch{document.querySelector('#share-status').textContent='Copia el enlace de la barra del navegador.'}};
search.addEventListener('input',()=>{limit=12;render()});
brand.addEventListener('change',()=>selectBrand(brand.value));
available.addEventListener('change',()=>{limit=12;render()});
copyBrand.onclick=async()=>{const url=brandUrl(brand.value);try{await navigator.clipboard.writeText(url);copyBrand.textContent='Enlace copiado';}catch{copyBrand.textContent='Enlace: '+url;}};
more.onclick=()=>{limit+=12;render()};
async function load(){
  // Obtener el manifiesto de vistas previas en paralelo, sin bloquear el catálogo.
  loadShareManifest().then(ids=>{shareIds=ids;if(selected)renderInquiry();});
  try{if(configured){
        const [remote,brandData,contactData]=await Promise.all([listProducts(),listBrands().catch(() => []),getWhatsAppContacts().catch(() => [])]);profiles=brandData;contacts=contactData;
        const initialized=remote.some(p=>p.id==='_catalog_state');
        const visible=remote.filter(p=>p.id!=='_catalog_state');
        products=initialized||visible.length?visible:legacy();
      }else{products=legacy();}for(const name of [...new Set([...products.map(p=>p.brand),...profiles.map(p=>p.name)])].sort()){const option=element('option',name);option.value=name;brand.append(option)}const fromLink=new URLSearchParams(location.search).get('marca');if(fromLink&&[...products.map(p=>p.brand),...profiles.map(p=>p.name)].includes(fromLink))brand.value=fromLink;render();const id=new URLSearchParams(location.hash.slice(1)).get('producto');if(id){const p=products.find(p=>String(p.id)===id);if(p)open(p)}}catch{status.textContent='No pudimos cargar el catálogo. Intenta recargar la página.'}}load();
