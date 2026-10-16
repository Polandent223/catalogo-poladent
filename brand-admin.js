import { configured, login, logout, restoreSession, adminCheck, listProducts, listBrands, saveBrand, uploadImage, removeImage, validImage } from './catalog-service.js';

const $ = s => document.querySelector(s);
const form = $('#brand-form'), message = $('#brand-message');
let profiles = [], editing = null, busy = false;
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
  $('#brand-form-title').textContent = 'Editar ' + p.name;
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
  profiles = await listBrands(true);
  const products = await listProducts(true);
  $('#existing-brands').replaceChildren();
  for (const name of [...new Set(products.map(p => p.brand))].sort()) {
    const option = make('option'); option.value = name; $('#existing-brands').append(option);
  }
  const list = $('#brand-admin-list'); list.replaceChildren();
  if (!profiles.length) list.append(make('p', 'Aún no hay presentaciones. Puedes comenzar con ADALTA.'));
  for (const p of profiles) {
    const item = make('article'); item.className = 'admin-item';
    if (p.logo_url) {
      const img = make('img'); img.src = validImage(p.logo_url); img.alt = 'Logotipo de ' + p.name; item.append(img);
    }
    const copy = make('div'); copy.append(make('strong', p.name), make('p', p.tagline || 'Presentación de marca'));
    const btn = make('button','Editar'); btn.type = 'button'; btn.onclick = () => edit(p);
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
  const name = form.elements.name.value.trim();
  if (!name) return tell('Debes indicar una marca.',true);
  const duplicate = profiles.find(p => p.name.toLowerCase() === name.toLowerCase() && p.id !== editing?.id);
  if (duplicate) return tell('Ya existe una presentación con este nombre. Edita la existente.', true);
  const info = { name, tagline: form.elements.tagline.value.trim(),
    description: form.elements.description.value.trim(),
    sort_order: Number(form.elements.sort_order.value) || 0 };
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
    await saveBrand(editing?.id, info);
    clear(); await refresh();
    tell('Presentación guardada. Ya aparece en el catálogo de la marca.');
  } catch(error) {
    for (const item of uploaded) {
      try { await removeImage(item.path); } catch { /* El archivo podrá revisarse en Cloudinary */ }
    }
    tell('No se guardó la presentación: ' + error.message, true);
  } finally { status(false); }
};
if (!configured) { $('#brand-login').hidden = true; tell('Configura Firebase para administrar las marcas.', true); }
else restoreSession().then(ok => { if (ok) return show(); }).catch(err => tell(err.message,true));
