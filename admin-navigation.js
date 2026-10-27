// Navegación compacta de POLADENT. Solo cambia la presentación del DOM:
// mantiene los mismos formularios, ids, eventos, archivos y servicios de datos.
const PATHS=[
  ['admin.html','Productos','package'],
  ['precios.html','Precios USD / BCV','badge-dollar-sign'],
  ['marcas.html','Marcas','tags'],
  ['portada.html','Portada','image'],
  ['diseno.html','Diseño','palette'],
  ['contacto.html','WhatsApp','message'],
  ['estadisticas.html','Estadísticas','chart'],
  ['respaldo.html','Respaldos','shield']
];
const page=(location.pathname.split('/').pop()||'admin.html').toLowerCase();
const $=selector=>document.querySelector(selector);
function node(tag,cls,text){
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(text!==undefined)n.textContent=text;
  return n;
}
function globalNavigation(workspace){
  const nav=node('nav','ux-admin-global');
  nav.setAttribute('aria-label','Secciones de administración');
  for(const [href,label] of PATHS){
    const a=node('a','ux-admin-global-link',label);
    a.href=href;
    if(page===href)a.setAttribute('aria-current','page');
    nav.append(a);
  }
  const title=node('span','ux-admin-global-caption','Acceso rápido');
  nav.prepend(title);
  workspace.prepend(nav);
}
// Tabulador accesible: solo mueve nodos dentro del MISMO formulario.
function tabs(host,items,initial){
  const bar=node('div','ux-section-tabs');
  bar.setAttribute('role','tablist');
  bar.setAttribute('aria-label','Secciones de esta página');
  const buttons=new Map(),panels=new Map();
  for(const [key,label] of items){
    const button=node('button','ux-section-tab',label);
    button.type='button';
    button.id='ux-tab-'+key;
    button.setAttribute('role','tab');
    button.setAttribute('aria-controls','ux-panel-'+key);
    const panel=node('section','ux-tab-panel');
    panel.id='ux-panel-'+key;
    panel.dataset.uxSection=key;
    panel.setAttribute('role','tabpanel');
    panel.setAttribute('aria-labelledby',button.id);
    panels.set(key,panel);
    buttons.set(key,button);
    bar.append(button);
  }
  function activate(key,focus=false){
    if(!panels.has(key))return;
    for(const [id,panel] of panels){
      const active=id===key;
      panel.hidden=!active;
      buttons.get(id).setAttribute('aria-selected',String(active));
      buttons.get(id).tabIndex=active?0:-1;
    }
    host.dataset.uxActive=key;
    if(focus)buttons.get(key).focus({preventScroll:true});
  }
  for(const [key,button] of buttons){
    button.addEventListener('click',()=>activate(key,true));
    button.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      const keys=[...buttons.keys()];
      const idx=keys.indexOf(key);
      const chosen=event.key==='Home'?keys[0]:event.key==='End'?keys[keys.length-1]
        :keys[(idx+(event.key==='ArrowRight'?1:-1)+keys.length)%keys.length];
      activate(chosen,true);
    });
  }
  host.append(bar,...panels.values());
  activate(initial);
  return {bar,panels,activate};
}
function activateOnInvalid(form,manager){
  let handling=false;
  form.addEventListener('invalid',event=>{
    if(handling)return;
    const panel=event.target.closest('.ux-tab-panel');
    if(panel?.dataset.uxSection && panel.hidden){
      handling=true; // La primera casilla inválida tiene prioridad, no la última.
      manager.activate(panel.dataset.uxSection);
      requestAnimationFrame(()=>{
        event.target.focus({preventScroll:false});
        handling=false;
      });
    }
  },true);
}
function designPanel(workspace){
  const form=$('#design-form');
  if(!form)return;
  const fields=[...form.querySelectorAll(':scope > fieldset')];
  const manager=tabs(form,[
    ['banners','Banners'],['marcas','Marcas'],
    ['plantillas','Plantillas'],['pantallas','Móvil y PC'],
    ['areas','Áreas'],['textos','Textos'],['sedes','Sedes']
  ],'banners');
  form.prepend(manager.bar);
  const actions=form.querySelector('.design-actions');
  const status=$('#design-save-status');
  manager.bar.after(actions,status);
  actions.classList.add('ux-sticky-save');
  for(const field of fields){
    const label=(field.querySelector('legend')?.textContent||'').toLowerCase();
    const id=field.id;
    let key='textos';
    if(id==='design-theme-chooser'||label.includes('publicación'))key='plantillas';
    else if(id==='design-compact-editor')key='pantallas';
    else if(id==='design-areas-editor')key='areas';
    else if(id==='design-locations')key='sedes';
    else if(id==='design-premium-editor'||label.includes('confianza'))key='textos';
    else if(label.includes('marcas y navegación'))key='marcas';
    else if(label.includes('banner')||label.includes('logotipo'))key='banners';
    manager.panels.get(key).append(field);
  }
  activateOnInvalid(form,manager);
  const preview=$('.design-preview');
  if(preview){
    const shell=node('details','ux-preview-fold');
    const summary=node('summary','ux-preview-summary','Vista previa del catálogo · abrir / cerrar');
    preview.parentNode.insertBefore(shell,preview);
    shell.append(summary,preview);
    const mq=window.matchMedia('(min-width: 891px)');
    shell.open=mq.matches;
    const onChange=event=>{if(event.matches)shell.open=true;};
    if(mq.addEventListener)mq.addEventListener('change',onChange);
  }
}
function productsPanel(workspace){
  const actions=workspace.querySelector(':scope > .admin-actions');
  const layout=workspace.querySelector(':scope > .admin-layout');
  const importBox=$('#bulk-import'),cleanup=$('#image-cleanup-tools');
  if(!actions||!layout||!importBox)return;
  const manager=tabs(workspace,[
    ['productos','Buscar y editar'],['importar','Importar CSV'],['herramientas','Más herramientas']
  ],'productos');
  workspace.querySelector('.ux-admin-global').after(manager.bar);
  const productPanel=manager.panels.get('productos');
  const bar=node('div','ux-product-toolbar');
  const newProduct=$('#new-product');
  if(newProduct){
    bar.append(newProduct);
    newProduct.addEventListener('click',()=>{
      manager.activate('productos');
      requestAnimationFrame(()=>$('#product-form')?.scrollIntoView({block:'start',behavior:'smooth'}));
    });
  }
  const catalogLink=node('a','ux-quick-link','Abrir catálogo público');
  catalogLink.href='./';
  bar.append(catalogLink);
  productPanel.append(bar,layout);
  const importPanel=manager.panels.get('importar');
  const importAdalta=$('#import-adalta');
  importPanel.append(importBox);
  if(importAdalta){
    const row=node('div','ux-import-legacy');
    row.append(node('p','','También puedes importar los 27 productos originales de ADALTA cuando todavía no estén cargados.'));
    row.append(importAdalta);
    importPanel.append(row);
  }
  const logout=$('#logout');
  if(logout)workspace.querySelector('.ux-admin-global').append(logout);
  manager.panels.get('herramientas').append(actions);
  const futurePortal=$('#customer-portal-future');
  if(futurePortal)manager.panels.get('herramientas').append(futurePortal);
  if(cleanup)manager.panels.get('herramientas').append(cleanup);
  // El enlace de edición sigue en la misma pestaña que la lista de productos.
}
function brandsPanel(workspace){
  const layout=workspace.querySelector(':scope > .admin-layout');
  const form=$('#brand-form'),list=$('#brand-admin-list');
  if(!layout||!form||!list)return;
  const listing=list.parentElement;
  const manager=tabs(workspace,[
    ['listado','Ver marcas'],['editar','Nueva / editar marca']
  ],'listado');
  workspace.querySelector('.admin-actions').after(manager.bar);
  manager.panels.get('listado').append(listing);
  manager.panels.get('editar').append(form);
  layout.remove();
  // Capturar antes del controlador ya existente para que scrollIntoView funcione.
  list.addEventListener('click',event=>{
    if(event.target.closest('button'))manager.activate('editar');
  },true);
  $('#brand-new')?.addEventListener('click',()=>manager.activate('editar'));
  $('#brand-cancel')?.addEventListener('click',()=>manager.activate('listado'));
  // Los tres selectores de imágenes se pueden plegar sin retirar ningún campo.
  for(const fieldset of form.querySelectorAll('fieldset')){
    const title=fieldset.querySelector('legend')?.textContent?.trim()||'Fotografía de marca';
    const disclosure=node('details','ux-media-fold');
    const heading=node('summary','',title+' · abrir para cambiar');
    fieldset.parentNode.insertBefore(disclosure,fieldset);
    disclosure.append(heading,fieldset);
  }
  activateOnInvalid(form,manager);
}
function analyticsPanel(workspace){
  const metrics=workspace.querySelector('.analytics-metrics');
  const comparison=workspace.querySelector('.analytics-comparison');
  const columns=[...workspace.querySelectorAll(':scope > .analytics-columns')];
  const areas=workspace.querySelector('.analytics-area-panel');
  const foot=workspace.querySelector('.analytics-note');
  if(!metrics||!comparison||columns.length!==2||!areas)return;
  const manager=tabs(workspace,[
    ['resumen','Resumen'],['visitas','Visitas y marcas'],['interes','Productos y consultas']
  ],'resumen');
  const filter=workspace.querySelector('.analytics-filters');
  filter.after(manager.bar);
  manager.panels.get('resumen').append(metrics,comparison);
  manager.panels.get('visitas').append(columns[0]);
  manager.panels.get('interes').append(columns[1],areas);
  if(foot)manager.panels.get('resumen').append(foot);
}
function welcomePanel(workspace){
  const form=$('#welcome-form');
  if(!form)return;
  const mobile=form.querySelector('.welcome-mobile-fields');
  const save=$('#welcome-save');
  const heading=form.querySelector('h2');
  if(!mobile||!save||!heading)return;
  const children=[...form.children];
  const manager=tabs(form,[['pc','Portada PC'],['movil','Portada móvil'],['publicar','Publicación']],'pc');
  form.prepend(manager.bar);
  const savebar=node('div','ux-sticky-save');
  manager.bar.after(savebar);
  savebar.append(save);
  let afterMobile=false;
  for(const child of children){
    if(child===save||child===manager.bar||child===savebar)continue;
    if(child===mobile){afterMobile=true;manager.panels.get('movil').append(child);continue;}
    manager.panels.get(afterMobile?'publicar':'pc').append(child);
  }
  activateOnInvalid(form,manager);
}
function stickyShortForm(workspace,id){
  const form=$(id);
  if(!form)return;
  const submit=form.querySelector('button[type=submit],button.primary');
  if(!submit)return;
  const bar=node('div','ux-simple-save ux-sticky-save');
  submit.parentNode.insertBefore(bar,submit);
  bar.append(submit);
}
function init(){
  const workspace=$('#workspace,#brand-workspace,#contact-workspace,#welcome-admin-workspace,#design-workspace,#analytics-workspace,#backup-workspace,#pricing-workspace');
  if(!workspace||workspace.dataset.uxMounted)return;
  workspace.dataset.uxMounted='1';
  globalNavigation(workspace);
  if(page==='admin.html')productsPanel(workspace);
  else if(page==='diseno.html')designPanel(workspace);
  else if(page==='marcas.html')brandsPanel(workspace);
  else if(page==='estadisticas.html')analyticsPanel(workspace);
  else if(page==='portada.html')welcomePanel(workspace);
  else if(page==='contacto.html')stickyShortForm(workspace,'#contact-form');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
