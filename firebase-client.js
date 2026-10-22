// Adaptador Firebase: Authentication + Firestore + Storage.
// Solo se importa cuando CATALOGO_FIREBASE contiene configuración pública.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, query, where, Timestamp, writeBatch, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js';
import {normalizeStorefront} from './storefront-settings.js';
import {brandKey,planBrandRename} from './brand-management.js';

const cfg = window.CATALOGO_FIREBASE || {};
export const configured = Boolean(cfg.apiKey && cfg.projectId && cfg.appId);
const app = initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = cfg.storageBucket ? getStorage(app) : null;
const images = window.CATALOGO_IMAGES || {};
const signedUploadsReady = images.provider === 'cloudinary' && /^https:\/\//.test(images.workerUrl || '');
async function imageWorker(path, data) {
  await adminCheck();
  const idToken = await auth.currentUser.getIdToken();
  const workerUrl = String(images.workerUrl).replace(/\/$/, '') + path;
  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + idToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {})
  });
  let payload;
  try { payload = await response.json(); } catch { payload = {}; }
  if (!response.ok) throw Error(payload.error || 'No pudimos autorizar la subida de la imagen.');
  return payload;
}

const ready = new Promise(resolve => {
  const unsubscribe = onAuthStateChanged(auth, () => { unsubscribe(); resolve(); }, () => resolve());
});
export const signedIn = () => Boolean(auth.currentUser);

export async function adminCheck() {
  await ready;
  if (!auth.currentUser) throw Error('Inicia sesión para administrar el catálogo.');
  const uid = auth.currentUser.uid;
  let access;
  try {
    access = await getDoc(doc(db, 'catalogAdmins', uid));
  } catch (cause) {
    const message = cause?.code === 'permission-denied'
      ? 'Firebase rechazó la lectura del permiso. Comprueba que publicaste las reglas de Firestore.'
      : 'No pudimos comprobar el permiso de tu cuenta en Firestore: ' + (cause?.message || 'error desconocido');
    throw Object.assign(new Error(message), { uid, reason: 'read-failed' });
  }
  if (!access.exists()) {
    throw Object.assign(new Error('Tu usuario existe, pero falta su documento de autorización en catalogAdmins.'), { uid, reason: 'missing-document' });
  }
  if (access.data()?.active !== true) {
    throw Object.assign(new Error('Encontramos tu documento, pero active debe ser Boolean true (no texto).'), { uid, reason: 'invalid-active' });
  }
  return true;
}
export async function restoreSession() {
  await ready;
  if (!signedIn()) return false;
  try { await adminCheck(); return true; }
  catch { await signOut(auth); return false; }
}
export async function login(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
  try { await adminCheck(); }
  catch (error) { await signOut(auth); throw error; }
}
export async function logout() { await signOut(auth); }

function sortProducts(a, b) {
  // catalogPublic/_catalog_state es un marcador interno sin marca ni nombre.
  // Debe poder ordenarse sin impedir que se muestren los productos importados.
  return String(a.brand || '').localeCompare(String(b.brand || ''), 'es')
    || (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)
    || String(a.name || '').localeCompare(String(b.name || ''), 'es');
}
export async function listProducts(admin = false) {
  if (admin) await adminCheck();
  const snap = await getDocs(collection(db, admin ? 'catalogProducts' : 'catalogPublic'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.kind !== 'image_cleanup' && p.kind !== 'brand_profile' && p.kind !== 'contact_settings' && (!admin || p.id !== '_catalog_state')).sort(sortProducts);
}
export async function listBrands(admin = false) {
  if (admin) await adminCheck();
  const snap = await getDocs(query(collection(db, admin ? 'catalogProducts' : 'catalogPublic'), where('kind', '==', 'brand_profile')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || a.name.localeCompare(b.name, 'es'));
}
// Se guardan los ajustes de portada en el documento de configuración
// que ya utilizan los teléfonos WhatsApp. Evita crear un registro nuevo
// cuando las reglas desplegadas de Firebase lo rechazan.
const WELCOME_DOC = '_site_welcome'; // lectura de versiones anteriores
const CONTACTS_DOC = '_catalog_contacts';
export async function getWelcomeSettings() {
  await adminCheck();
  const current=await getDoc(doc(db,'catalogProducts',CONTACTS_DOC));
  const stored=current.exists()?current.data():{};
  if (typeof stored.welcome_enabled === 'boolean') {
    return {
      enabled:stored.welcome_enabled === true,
      image_url:String(stored.welcome_image_url||''),
      image_path:stored.welcome_image_path||null,
      mobile_image_url:String(stored.welcome_mobile_image_url||''),
      mobile_image_path:stored.welcome_mobile_image_path||null
    };
  }
  // Compatibilidad con los ajustes del primer sistema de portada.
  const old=await getDoc(doc(db,'catalogProducts',WELCOME_DOC));
  if(!old.exists())return {enabled:false,image_url:'',image_path:null,mobile_image_url:'',mobile_image_path:null};
  const prior=old.data();
  return {
    enabled:prior.kind==='site_welcome'&&prior.enabled===true,
    image_url:String(prior.image_url||''),
    image_path:prior.image_path||null,
    mobile_image_url:'',
    mobile_image_path:null
  };
}
export async function saveWelcomeSettings(settings) {
  await adminCheck();
  const url=String(settings.image_url||'').trim();
  if (!url||!validImage(url)) throw Error('Selecciona la portada oficial o proporciona un enlace de imagen HTTPS válido.');
  const mobileURL=String(settings.mobile_image_url||'').trim();
  if(mobileURL && (!validImage(mobileURL)||new URL(mobileURL).protocol!=='https:'))
    throw Error('La portada móvil necesita una imagen con enlace HTTPS.');
  // set(..., {merge:true}) conserva 'contacts' y cualquier campo futuro.
  // Mantiene el mismo kind y status que los números de WhatsApp ya guardados.
  const data={
    kind:'contact_settings',
    status:'available',
    welcome_enabled:settings.enabled===true,
    welcome_image_url:url,
    welcome_image_path:settings.image_path||null,
    welcome_mobile_image_url:mobileURL,
    welcome_mobile_image_path:mobileURL?(settings.mobile_image_path||null):null,
    welcome_updated_at:new Date().toISOString()
  };
  const batch=writeBatch(db);
  batch.set(doc(db,'catalogProducts',CONTACTS_DOC),data,{merge:true});
  batch.set(doc(db,'catalogPublic',CONTACTS_DOC),data,{merge:true});
  await batch.commit();
  return {
    enabled:data.welcome_enabled,
    image_url:data.welcome_image_url,
    image_path:data.welcome_image_path,
    mobile_image_url:data.welcome_mobile_image_url,
    mobile_image_path:data.welcome_mobile_image_path
  };
}
// Agenda de WhatsApp: los números de negocio son públicos, pero editarlos
// siempre exige iniciar sesión y tener catalogAdmins/{uid}.active=true.
export async function getWhatsAppContacts() {
  const snapshot = await getDoc(doc(db, 'catalogPublic', CONTACTS_DOC));
  if (!snapshot.exists() || snapshot.data().kind !== 'contact_settings') return [];
  return (Array.isArray(snapshot.data().contacts) ? snapshot.data().contacts : [])
    .filter(p => typeof p.label === 'string' && typeof p.phone === 'string'
      && /^[1-9][0-9]{7,14}$/.test(p.phone))
    .slice(0, 5)
    .map(p => ({ label: p.label.slice(0, 55), phone: p.phone }));
}
export async function saveWhatsAppContacts(contacts) {
  await adminCheck();
  if (!Array.isArray(contacts) || contacts.length > 5) {
    throw Error('Puedes configurar hasta 5 números de WhatsApp.');
  }
  const cleaned = [];
  const seen = new Set();
  for (const entry of contacts) {
    const label = String(entry.label || '').trim();
    const phone = String(entry.phone || '').replace(/[\s()+.\-]/g, '');
    if (!label || label.length > 55) throw Error('Escribe un nombre de atención válido (máximo 55 caracteres).');
    if (!/^[1-9][0-9]{7,14}$/.test(phone)) {
      throw Error('El número de ' + label + ' debe incluir el código de país, sin el cero inicial. Ejemplo: 58412XXXXXXX.');
    }
    if (seen.has(phone)) throw Error('El número de ' + label + ' está repetido.');
    seen.add(phone);
    cleaned.push({ label, phone });
  }
  const data = {
    kind: 'contact_settings', status: 'available', contacts: cleaned,
    updated_at: new Date().toISOString()
  };
  const batch = writeBatch(db);
  batch.set(doc(db, 'catalogProducts', CONTACTS_DOC), data, {merge:true});
  batch.set(doc(db, 'catalogPublic', CONTACTS_DOC), data, {merge:true});
  await batch.commit();
  return cleaned;
}
export async function saveBrand(id, entry, sourceName = '') {
  await adminCheck();
  const name = String(entry.name || '').trim();
  if (!name || name.length > 80) throw Error('Indica una marca válida de hasta 80 caracteres.');
  const key = id || doc(collection(db, 'catalogProducts')).id;
  let original = String(sourceName || '').trim();
  if (id) {
    // Verificamos el documento original: nunca renombrar otro tipo de registro
    // ni escribir usando un nombre antiguo cambiado por otra sesión.
    const saved = await getDoc(doc(db, 'catalogProducts', id));
    if (!saved.exists() || saved.data().kind !== 'brand_profile')
      throw Error('La presentación ya no existe. Actualiza la lista de marcas.');
    if (sourceName && saved.data().name !== sourceName)
      throw Error('El nombre de esta marca cambió en otra sesión. Actualiza antes de editar.');
    original = saved.data().name;
  }

  // Lectura fresca para impedir colisiones y planificar TODAS las escrituras.
  // No borramos registros ni reemplazamos fotografías de los productos.
  const [products, profiles] = await Promise.all([listProducts(true), listBrands(true)]);
  const requestedKey = brandKey(name);
  if (profiles.some(p => p.id !== id && brandKey(p.name) === requestedKey))
    throw Error('Ya existe una presentación con ese nombre. Edita la existente.');
  let changes = [];
  if (original) {
    if (!id && !products.some(p => !p.kind && brandKey(p.brand) === brandKey(original)))
      throw Error('Esta marca ya no tiene productos. Actualiza la lista de marcas.');
    if (original !== name) {
      const plan = planBrandRename(original, name, products, profiles, id || null);
      if (plan.renameRequired) changes = plan.products;
    }
  } else {
    // Una presentación nueva para una marca en inventario debe escribir el
    // nombre EXACTO, para que su portada se muestre en el catálogo público.
    const matching = products.find(p => !p.kind && brandKey(p.brand) === requestedKey);
    if (matching && matching.brand !== name)
      throw Error('Usa exactamente el nombre que aparece en los productos: «' + matching.brand + '».');
  }

  const profile = {
    kind: 'brand_profile', name,
    tagline: String(entry.tagline || '').trim().slice(0, 140),
    description: String(entry.description || '').trim().slice(0, 500),
    status: 'available', sort_order: Math.max(0, Number(entry.sort_order) || 0),
    updated_at: new Date().toISOString()
  };
  for (const field of ['logo', 'cover', 'back_cover']) {
    const url = entry[field + '_url'];
    if (url && !validImage(url)) throw Error('Revisa el enlace de ' + field);
    profile[field + '_url'] = url || '';
    profile[field + '_path'] = entry[field + '_path'] || null;
  }
  // TODO O NADA: el cambio del nombre afecta la presentación y los productos
  // públicos/privados en un mismo lote atómico. Si falla, no habrá dos marcas.
  const batch = writeBatch(db);
  batch.set(doc(db, 'catalogProducts', key), profile);
  batch.set(doc(db, 'catalogPublic', key), profile);
  for (const product of changes) {
    batch.update(doc(db, 'catalogProducts', product.id), { brand:name });
    if (product.status === 'available' || product.status === 'sold_out')
      batch.update(doc(db, 'catalogPublic', product.id), { brand:name });
  }
  await batch.commit();
  return {id:key,renamedProducts:changes.length};
}
// Una sola consulta al inventario para evitar cargarlo dos veces en el panel.
export async function listAdminOverview() {
  await adminCheck();
  const snap = await getDocs(collection(db, 'catalogProducts'));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return {
    products: all.filter(p => !p.kind && p.id !== '_catalog_state').sort(sortProducts),
    cleanups: all.filter(p => p.kind === 'image_cleanup' && typeof p.image_path === 'string')
  };
}
function markCatalogActive(batch) {
  // Al activarse el catálogo, ya no se volverán a mostrar los datos locales
  // aunque el administrador oculte o elimine todos los productos.
  batch.set(doc(db, 'catalogPublic', '_catalog_state'), {
    status: 'available',
    type: 'catalog_state',
    initialized: true,
    updated_at: new Date().toISOString()
  });
}
function sanitize(body) {
  return {
    name: String(body.name || '').trim().slice(0, 180),
    brand: String(body.brand || '').trim().slice(0, 80),
    description: String(body.description || '').trim().slice(0, 1000),
    area_id: /^[a-z0-9-]{1,55}$/.test(String(body.area_id||''))?String(body.area_id||''):'',
    status: body.status,
    sort_order: Math.max(0, Math.min(100000, Number(body.sort_order) || 0)),
    image_url: String(body.image_url || ''),
    image_path: body.image_path || null,
    source_key: body.source_key || null,
    updated_at: new Date().toISOString()
  };
}
export async function saveProduct(id, body) {
  await adminCheck();
  const product = sanitize(body);
  if (!product.name || !product.brand || !['available', 'sold_out', 'hidden'].includes(product.status)) throw Error('Completa el nombre, marca y estado válido.');
  if (!validImage(product.image_url)) throw Error('Falta una imagen pública válida.');
  const key = id || doc(collection(db, 'catalogProducts')).id;
  const batch = writeBatch(db);
  markCatalogActive(batch);
  batch.set(doc(db, 'catalogProducts', key), product);
  if (product.status === 'hidden') batch.delete(doc(db, 'catalogPublic', key));
  else batch.set(doc(db, 'catalogPublic', key), product);
  await batch.commit();
  return key;
}
// El borrado del registro y el archivo son operaciones diferentes.
// Guardamos una tarea de limpieza en Firestore ANTES de borrar la ficha para
// que una caída de Cloudinary no haga perder la referencia al archivo.
export async function deleteProduct(product) {
  await adminCheck();
  if (!product?.id) throw Error('No encontramos el producto que quieres eliminar.');
  const needsCloudinaryCleanup = typeof product.image_path === 'string'
    && product.image_path.startsWith('cloudinary:');
  const cleanupRef = needsCloudinaryCleanup ? doc(collection(db, 'catalogProducts')) : null;
  const batch = writeBatch(db);
  markCatalogActive(batch);
  if (cleanupRef) {
    batch.set(cleanupRef, {
      kind: 'image_cleanup',
      image_path: product.image_path,
      product_name: String(product.name || '').slice(0, 180),
      created_at: new Date().toISOString()
    });
  }
  batch.delete(doc(db, 'catalogProducts', product.id));
  batch.delete(doc(db, 'catalogPublic', product.id));
  await batch.commit();
  if (!cleanupRef) {
    // Para imágenes externas no somos propietarios del archivo.
    return { productDeleted: true, imageDeleted: null, pendingCleanup: false };
  }
  try {
    await removeImage(product.image_path);
    await deleteDoc(cleanupRef);
    return { productDeleted: true, imageDeleted: true, pendingCleanup: false };
  } catch (error) {
    return {
      productDeleted: true,
      imageDeleted: false,
      pendingCleanup: true,
      error: error?.message || 'No se pudo completar la eliminación de la fotografía.'
    };
  }
}

export async function listImageCleanups() {
  await adminCheck();
  const snapshot = await getDocs(collection(db, 'catalogProducts'));
  return snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.kind === 'image_cleanup' && typeof p.image_path === 'string');
}

export async function retryImageCleanups() {
  await adminCheck();
  const pending = await listImageCleanups();
  let deleted = 0;
  const failures = [];
  for (const item of pending) {
    try {
      await removeImage(item.image_path);
      await deleteDoc(doc(db, 'catalogProducts', item.id));
      deleted++;
    } catch (error) {
      failures.push({ name: item.product_name || 'Fotografía', error: error?.message || 'Error desconocido' });
    }
  }
  return { deleted, failures, pending: failures.length };
}
export async function importProducts(rows) {
  await adminCheck();
  if (!Array.isArray(rows) || rows.length > 80) {
    throw Error('Importa hasta 80 productos por bloque. El panel divide los archivos grandes automáticamente.');
  }
  if (!rows.length) return;
  const batch = writeBatch(db);
  markCatalogActive(batch);
  for (const body of rows) {
    const product = sanitize(body);
    if (!product.name || !product.brand || !['available', 'sold_out', 'hidden'].includes(product.status)
        || !validImage(product.image_url)) throw Error('Producto incompleto en la importación: ' + (product.name || 'sin nombre'));
    const key = doc(collection(db, 'catalogProducts')).id;
    batch.set(doc(db, 'catalogProducts', key), product);
    if (product.status !== 'hidden') batch.set(doc(db, 'catalogPublic', key), product);
  }
  await batch.commit();
}
export function validImage(value) {
  try { const url = new URL(value, location.href); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}
export async function uploadImage(file) {
  await adminCheck();

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw Error('Usa imágenes JPG, PNG o WebP.');
  if (file.size > 20 * 1024 * 1024) throw Error('La foto debe pesar menos de 20 MB.');
  const bitmap = await createImageBitmap(file);
  if (bitmap.width * bitmap.height > 80000000) { bitmap.close(); throw Error('La foto es demasiado grande.'); }
  const scale = Math.min(1, 1440 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .84));
  if (!blob) throw Error('No pudimos procesar la imagen.');
  if (signedUploadsReady) {
    const signed = await imageWorker('/sign');
    const form = new FormData();
    form.append('file', blob, 'producto.webp');
    for (const key of ['timestamp', 'public_id', 'overwrite', 'api_key', 'signature']) form.append(key, String(signed[key]));
    const cloudName = String(signed.cloud_name || '');
    if (!/^[a-zA-Z0-9_-]+$/.test(cloudName)) throw Error('Nombre de Cloudinary inválido.');
    const endpoint = 'https://api.cloudinary.com/v1_1/' + encodeURIComponent(cloudName) + '/image/upload';
    const response = await fetch(endpoint, { method: 'POST', body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.secure_url || !result.public_id) {
      throw Error(result?.error?.message || 'No pudimos guardar la fotografía en Cloudinary.');
    }
    return { url: result.secure_url, path: 'cloudinary:' + result.public_id };
  }
  if (!storage) throw Error('La carga de fotos todavía no está configurada. Puedes pegar un enlace de imagen o activar el alojamiento gratuito de Cloudinary.');
  const path = 'catalog-images/' + crypto.randomUUID() + '.webp';
  const object = ref(storage, path);
  try { await uploadBytes(object, blob, { contentType: 'image/webp' }); }
  catch (error) {
    throw Error('No se pudo subir la imagen a Firebase Storage. Revisa el plan Blaze, el bucket y las reglas de seguridad. ' + (error.code || ''));
  }
  return { url: await getDownloadURL(object), path };
}
export async function removeImage(path) {
  if (!path) return;
  if (path.startsWith('cloudinary:')) {
    if (!signedUploadsReady) throw Error('El Worker de Cloudinary todavía no está configurado.');
    const result = await imageWorker('/delete', { public_id: path.slice('cloudinary:'.length) });
    if (result.removed !== true) throw Error('Cloudinary no confirmó que borró la fotografía.');
    return;
  }
  if (!storage) throw Error('El almacenamiento Firebase no está configurado.');
  await deleteObject(ref(storage, path));
}

/** Historial privado: la consulta exige sesión y catalogAdmins/{uid}.active=true. */
export async function listAnalyticsEvents(start, end) {
  await adminCheck();
  if(!(start instanceof Date)||!(end instanceof Date)||!(start<end))throw Error('Selecciona un periodo válido.');
  const snapshot=await getDocs(query(
    collection(db,'catalogAnalyticsEvents'),
    where('created_at','>=',Timestamp.fromDate(start)),
    where('created_at','<',Timestamp.fromDate(end))
  ));
  return snapshot.docs.map(d=>{
    const item=d.data();
    return {
      type:item.type,
      seconds:Number(item.seconds)||0,
      brand:String(item.brand||''),
      product_id:String(item.product_id||''),
      created_at:item.created_at?.toDate?.()||new Date(0)
    };
  });
}


// Diseño comercial independiente de la pantalla de bienvenida.
// Usamos el documento público de contactos y merge:true, como la portada
// oficial, para respetar las reglas ya desplegadas sin sobrescribir los contactos.
export async function getStorefrontSettings(){
  await adminCheck();
  const found=await getDoc(doc(db,'catalogProducts',CONTACTS_DOC));
  return normalizeStorefront(found.exists()?found.data().storefront:null);
}
export async function saveStorefrontSettings(settings){
  await adminCheck();
  const normalized=normalizeStorefront(settings);
  for(const field of ['banner_desktop','banner_mobile','brand_logo']){
    const key=field+'_url';
    if(settings?.[key] && !normalized[key])
      throw Error('El banner debe tener un enlace seguro HTTPS.');
  }
  const data={kind:'contact_settings',status:'available',storefront:normalized,
    storefront_updated_at:new Date().toISOString()};
  const batch=writeBatch(db);
  batch.set(doc(db,'catalogProducts',CONTACTS_DOC),data,{merge:true});
  batch.set(doc(db,'catalogPublic',CONTACTS_DOC),data,{merge:true});
  await batch.commit();
  return normalized;
}
