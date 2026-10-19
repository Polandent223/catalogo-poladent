import {normalizeTrustHome} from './trust-home-settings.js';
const q=id=>document.getElementById(id);
const el=(tag,css='',txt='')=>{
  const node=document.createElement(tag);
  if(css)node.className=css;
  if(txt)node.textContent=txt;
  return node;
};
function action(text,href,css=''){
  const a=el('a','trust-action '+css,text);
  a.href=href;
  if(/^https?:/.test(href)){a.target='_blank';a.rel='noopener noreferrer';}
  return a;
}
function whatsapp(number,name){
  return 'https://wa.me/'+number+'?text='+encodeURIComponent('Hola, POLADENT. Quisiera consultar productos y atención en '+name+'.');
}
function locationUrl(branch){
  const address=[branch.name,branch.address,branch.city].filter(Boolean).join(', ');
  return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address);
}
function makePhoto(photo,name){
  const img=el('img');
  img.src=photo.url;img.alt='Instalaciones de '+name;
  img.loading='lazy';img.decoding='async';
  return img;
}
function branchCard(branch){
  const article=el('article','trust-branch-card');
  const photos=el('div','trust-branch-photos');
  for(const photo of branch.photos.slice(0,3))photos.append(makePhoto(photo,branch.name));
  if(!photos.childElementCount)photos.append(el('div','trust-no-photo','Fotografía pendiente de la sede'));
  const info=el('div','trust-branch-info');
  info.append(el('h3','',branch.name),el('p','trust-branch-city',branch.city));
  for(const line of [branch.address,branch.hours?'Horario: '+branch.hours:'',branch.rif?'RIF: '+branch.rif:'']){
    if(line)info.append(el('p','trust-branch-detail',line));
  }
  const flags=[];
  if(branch.direct_purchase)flags.push('Compra directa');
  if(branch.pickup)flags.push('Retiro en sucursal');
  if(flags.length)info.append(el('p','trust-branch-flags',flags.join(' · ')));
  const buttons=el('div','trust-branch-actions');
  buttons.append(action('Cómo llegar',locationUrl(branch),'trust-outline'));
  if(/^[1-9][0-9]{7,14}$/.test(branch.phone))
    buttons.append(action('WhatsApp',whatsapp(branch.phone,branch.name),'trust-whatsapp'));
  info.append(buttons);
  article.append(photos,info);
  return article;
}
export function renderTrustHome(raw,active,allowBlob=false){
  const settings=normalizeTrustHome(raw,allowBlob);
  const stage=q('trust-home-sections'),note=q('trust-hero-note'),link=q('storefront-locations-link');
  const visible=Boolean(active&&settings.enabled);
  stage.hidden=!visible;note.hidden=!visible;
  link.hidden=!visible||!settings.show_branches;
  document.body.classList.toggle('trust-home-active',visible);
  const logo=q('trust-header-logo');
  logo.hidden=!visible||!settings.logo_url;
  if(visible&&settings.logo_url){logo.src=settings.logo_url;logo.alt='Logotipo POLADENT';}
  else logo.removeAttribute('src');
  if(!visible)return settings;
  note.textContent=settings.branches.filter(b=>b.visible).length+' sedes físicas · Compra directa y retiro en tienda';
  q('trust-section-title').textContent=settings.section_title;
  q('trust-section-subtitle').textContent=settings.section_subtitle;
  const stores=q('trust-store-grid');
  stores.replaceChildren(...settings.branches.filter(b=>b.visible).map(branchCard));
  q('trust-stores').hidden=!settings.show_branches||!stores.childElementCount;
  q('trust-benefits').hidden=!settings.show_benefits;
  q('trust-benefits-list').replaceChildren(...settings.benefits.map((txt,i)=>{
    const p=el('p','trust-benefit');p.append(el('span','trust-benefit-icon',['⌂','✓','◇','♡'][i]||'✓'),el('span','',txt));return p;
  }));
  q('trust-steps').hidden=!settings.show_steps;
  q('trust-step-list').replaceChildren(...settings.steps.map((txt,i)=>{
    const p=el('li','trust-step');p.append(el('span','trust-step-number',String(i+1)),el('span','',txt));return p;
  }));
  const close=q('trust-closing');
  close.hidden=!settings.show_contact;
  q('trust-closing-title').textContent=settings.closing_title;
  q('trust-closing-text').textContent=settings.closing_text;
  const button=q('trust-main-whatsapp');
  const contact=settings.branches.find(b=>b.visible&&/^[1-9][0-9]{7,14}$/.test(b.phone));
  button.hidden=!contact;
  if(contact)button.href=whatsapp(contact.phone,contact.name);
  else button.removeAttribute('href');
  return settings;
}
