import { configured, login, logout, restoreSession, adminCheck, listProducts, listBrands, saveBrand, uploadImage, removeImage, validImage } from './catalog-service.js';
import {brandKey,collectBrandRows,planBrandRename} from './brand-management.js';

const $ = s => document.querySelector(s);
const form = $('#brand-form'), message = $('#brand-message');
let profiles = [], products = [], editing = null, busy = false;
function tell(text, error = false) { message.textContent = text; message.className = error ? 'error' : ''; }
function status(active) { busy = active; form.querySelectorAll('input,textarea,button').forEach(e => e.disabled = active); $('#brand-new').disabled = active; }
function make(tag, text) { const el = document.createElement(tag); if (text) el.textContent = text; return el; }
function preview(field, url) {
  const img = $('#' + field.replaceAll('_', '-') + '-preview');
  if (!img) return;
  img.hidden = !url;
  if (url) img.src = validImage(url);
  else img.removeAttribute('src');
}
function clear() {
  editing = null;
  form.reset();
  $('#brand-form-title').textContent = 'Nueva marca';
  for (const field of ['logo', 'cover', 'back_cover']) preview(field, '');
}
function edit(p) {
  editing = p;
  $('#brand-form-title').textContent = p.configured ? 'Editar '+p.name : 'Configurar '+p.name;
  for (const name of ['name','tagline','description','sort_order'])
    form.elements.namedItem(name).value = p[name] ?? '';
  for (const field of ['logo','cover','back_cover']) {
    form.elements.namedItem(field + '_file').value = '';
    form.elements.namedItem(field + '_url').value = '';
    preview(field, p[field + '_url']);
  }
  form.scrollIntoView({ behavior: 'smooth' });
}
async function refresh() {
  [profiles,products] = await Promise.all([listBrands(true),listProducts(true)]);
  const brands = collectBrandRows(products,profiles);
  $('#existing-brands').replaceChildren();
  for (const p of brands) {
    const option = make('option'); option.value = p.name; $('#existing-brands').append(option);
  }
  const list = $('#brand-admin-list'); list.replaceChildren();
  $('#brand-total').textContent=brands.length+' marcas encontradas, '+brands.filter(p=>!p.configured).length+
    ' sin presentación configurada. Las marcas de los productos aparecen aquí automáticamente.';
  if (!brands.length) list.append(make('p', 'Aún no hay marcas. Agrega un producto desde Administración.'));
  for (const p of brands) {
    const item = make('article'); item.className = 'admin-item';
    if (p.logo_url) {
      const img = make('img'); img.src = validImage(p.logo_url); img.alt = 'Logotipo de ' + p.name; item.append(img);
    }
    const copy = make('div');
    const label = p.productCount+' producto'+(p.productCount===1?'':'s')+
      (p.configured ? ' · Presentación configurada' : ' · Sin presentación (puedes crearla)');
    copy.append(make('strong', p.name),make('p',label));
    if(p.tagline)copy.append(make('p',p.tagline));
    const btn = make('button',p.configured?'Editar marca':'Configurar / corregir');
    btn.type = 'button'; btn.onclick = () => edit(p);
    item.append(copy, btn); list.append(item);
  }
}
async function show() {
  await adminCheck(); $('#brand-login').hidden = true; $('#brand-workspace').hidden = false;
  await refresh(); tell('Listo para administrar las presentaciones de las marcas.');
}
$('#brand-login').onsubmit = async event => {
  event.preventDefault();
  try {
    tell('Iniciando sesión…');
    await login(event.target.elements.email.value.trim(), event.target.elements.password.value);
    event.target.elements.password.value = '';
    await show();
  } catch(error) { tell(error.message, true); }
};
$('#brand-new').onclick = clear;
$('#brand-cancel').onclick = clear;
$('#brand-logout').onclick = async () => { await logout(); location.reload(); };
form.onsubmit = async event => {
  event.preventDefault(); if (busy) return;
  const name = form.elements.namedItem('name').value.trim();
  if (!name) return tell('Debes indicar una marca.',true);
  const duplicate = profiles.find(p => brandKey(p.name) === brandKey(name) && p.id !== editing?.id);
  if (duplicate) return tell('Ya existe una presentación con este nombre. Edita la existente.', true);
  if (editing && editing.name !== name) {
    try {
      const plan=planBrandRename(editing.name,name,products,profiles,editing.id||null);
      const prompt='¿Corregir la marca «'+editing.name+'» a «'+name+'»?\n\n'+
        'Se actualizarán '+plan.products.length+' productos, incluyendo los agotados u ocultos, y sus fichas públicas.\n'+
        'Se conservarán sus fotos, nombres, historial y demás datos. Esta operación NO se puede deshacer con un botón.';
      if (!confirm(prompt)) return;
    }catch(error){return tell(error.message,true);}
  }
  const info = { name, tagline: form.elements.namedItem('tagline').value.trim(),
    description: form.elements.namedItem('description').value.trim(),
    sort_order: Number(form.elements.namedItem('sort_order').value) || 0 };
  const uploaded = [];
  status(true);
  try {
    for (const field of ['logo','cover','back_cover']) {
      const file = form.elements.namedItem(field + '_file').files[0];
      const url = form.elements.namedItem(field + '_url').value.trim();
      if (url && !validImage(url)) throw Error('El enlace de ' + field + ' no es válido.');
      const item = file ? await uploadImage(file) : null;
      if (item) uploaded.push(item);
      info[field + '_url'] = item?.url || url || editing?.[field + '_url'] || '';
      info[field + '_path'] = item?.path || (url ? null : editing?.[field + '_path']) || null;
    }
    const result=await saveBrand(editing?.id,info,editing?.name||'');
    clear(); await refresh();
    tell('Marca guardada correctamente. '+(result?.renamedProducts
      ? 'Nombre corregido en '+result.renamedProducts+' productos sin modificar sus fotos ni historial.'
      : 'Ya puedes configurar su presentación o utilizar la marca en productos.'));
  } catch(error) {
    for (const item of uploaded) {
      try { await removeImage(item.path); } catch { /* El archivo podrá revisarse en Cloudinary */ }
    }
    tell('No se guardó la presentación: ' + error.message, true);
  } finally { status(false); }
};
if (!configured) { $('#brand-login').hidden = true; tell('Configura Firebase para administrar las marcas.', true); }
else restoreSession().then(ok => { if (ok) return show(); }).catch(err => tell(err.message,true));
