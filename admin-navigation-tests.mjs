import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const js=read('admin-navigation.js'),css=read('admin-navigation.css');
const pages=[
  ['admin.html','workspace','product-form','bulk-import','admin-list','image-cleanup-tools'],
  ['marcas.html','brand-workspace','brand-form','brand-admin-list','logo-preview','cover-preview','back-cover-preview'],
  ['contacto.html','contact-workspace','contact-form','contact-save'],
  ['instagram.html','instagram-workspace','instagram-form','instagram-save','instagram-add'],
  ['portada.html','welcome-admin-workspace','welcome-form','welcome-save','welcome-mobile-file'],
  ['diseno.html','design-workspace','design-form','design-save','design-frame','design-brands','design-areas-list','design-banner-slides'],
  ['estadisticas.html','analytics-workspace','analytics-chart','analytics-brands','analytics-products','analytics-areas'],
  ['respaldo.html','backup-workspace','backup-download','backup-overview']
];
for(const [page,...ids] of pages){
  const html=read(page);
  assert.ok(html.includes('href="admin-navigation.css"'),page+' enlaza estilos');
  assert.ok(html.includes('src="admin-navigation.js"'),page+' enlaza navegación');
  for(const id of ids)assert.ok(html.includes('id="'+id+'"'),page+' conserva '+id);
}
assert.ok(js.includes("['admin.html','Productos'"));
assert.ok(js.includes("['marcas.html','Marcas'"));
assert.ok(js.includes("['portada.html','Portada'"));
assert.ok(js.includes("['diseno.html','Diseño'"));
assert.ok(js.includes("['contacto.html','WhatsApp'"));
assert.ok(js.includes("['instagram.html','Instagram'"));
assert.ok(js.includes("['estadisticas.html','Estadísticas'"));
assert.ok(js.includes("['respaldo.html','Respaldos'"));
assert.ok(js.includes("['banners','Banners']"));
assert.ok(js.includes("['marcas','Marcas']"));
assert.ok(js.includes("['plantillas','Plantillas']"));
assert.ok(js.includes("['pantallas','Móvil y PC']"));
assert.ok(js.includes("['areas','Áreas']"));
assert.ok(js.includes("['textos','Textos']"));
assert.ok(js.includes("['sedes','Sedes']"));
assert.ok(js.includes("manager.bar.after(actions,status)"),
 'Los botones originales de guardar y deshacer se conservan dentro del formulario.');
assert.ok(js.includes('event.target.focus({preventScroll:false})'),
 'El campo requerido oculto debe revelarse para corregir la validación.');
assert.ok(js.includes("list.addEventListener('click',event=>"),
 'Abrir una marca desde su listado debe revelar el formulario antes de editar.');
assert.ok(js.includes("manager.panels.get('herramientas').append(actions)"),
 'Las acciones originales del administrador permanecen disponibles.');
assert.ok(js.includes("if(logout)workspace.querySelector('.ux-admin-global').append(logout)"),
 'Cerrar sesión sigue accesible en el administrador.');
assert.ok(js.includes("if(preview){"),'El iframe de vista previa se preserva.');
assert.ok(css.includes('.ux-tab-panel[hidden]{display:none!important}'),
 'Solo se muestra la pestaña activa.');
assert.ok(css.includes('overflow-x:auto'),'Las pestañas caben en teléfonos.');
assert.ok(css.includes('.ux-preview-fold>summary'),
 'La vista previa se puede plegar.');
for(const forbidden of ['saveProduct(','deleteProduct(','uploadImage(','saveStorefrontSettings(','fetch(','localStorage.']){
  assert.ok(!js.includes(forbidden),'La capa visual no debe guardar ni modificar datos: '+forbidden);
}
const page=readFileSync(new URL('./admin.html',import.meta.url),'utf8');
const publicCatalog=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const nav=readFileSync(new URL('./admin-navigation.js',import.meta.url),'utf8');
assert.ok(page.includes('id="customer-portal-future"'),'Solo el administrador ve la futura opción de cuentas.');
assert.ok(page.includes('id="customer-portal-switch" type="checkbox" role="switch" disabled'),'Portal de clientes desactivado y sin posibilidad de activarlo prematuramente.');
assert.ok(page.includes('La cédula identifica al cliente'),'Identidad separada de acceso seguro.');
assert.ok(nav.includes("manager.panels.get('herramientas').append(futurePortal)"),'El módulo no alarga el panel principal.');
assert.ok(!publicCatalog.includes('id="customer-portal-switch"'),'No aparecerá registro de clientes al público.');
assert.ok(!publicCatalog.includes('id="customer-signup"'),'No habilitar registro público sin backend seguro.');
console.log('POLADENT: navegación, paneles existentes y edición intactos.');
