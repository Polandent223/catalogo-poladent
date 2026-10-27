// Adaptador Firebase: Authentication + Firestore + Storage.
// Solo se importa cuando CATALOGO_FIREBASE contiene configuración pública.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, query, where, Timestamp, writeBatch, deleteDoc, deleteField, runTransaction } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js';
import {normalizeStorefront} from './storefront-settings.js';
import {cleanUSD} from './catalog-pricing.js';
import {adjustedPriceUSD} from './price-bulk.js';
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
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.kind !== 'image_cleanup' && p.kind !== 'brand_profile' && p.kind !== 'contact_settings' && p.kind !== 'price_adjustment' && (!admin || p.id !== '_catalog_state')).sort(sortProducts);
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
    price_usd: cleanUSD(body.price_usd),
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
  const pricing=await getPricingSettings();
  const publicProduct={...product};
  if(!pricing.enabled)delete publicProduct.price_usd;
  if (product.status === 'hidden') batch.delete(doc(db, 'catalogPublic', key));
  else batch.set(doc(db, 'catalogPublic', key), publicProduct);
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
  const pricingEnabled=(await getPricingSettings()).enabled;
  for (const body of rows) {
    const product = sanitize(body);
    if (!product.name || !product.brand || !['available', 'sold_out', 'hidden'].includes(product.status)
        || !validImage(product.image_url)) throw Error('Producto incompleto en la importación: ' + (product.name || 'sin nombre'));
    const key = doc(collection(db, 'catalogProducts')).id;
    batch.set(doc(db, 'catalogProducts', key), product);
    if (product.status !== 'hidden') {
      const publicProduct={...product};
      if(!pricingEnabled)delete publicProduct.price_usd;
      batch.set(doc(db, 'catalogPublic', key), publicProduct);
    }
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
  markCatalogActive(batch);
  await batch.commit();
  return normalized;
}


// Los precios USD se preparan dentro del inventario PRIVADO. No publicamos
// precios ni modificamos productos antiguos hasta que el administrador lo active.
export async function getPricingSettings(){
  await adminCheck();
  const snapshot=await getDoc(doc(db,'catalogProducts',CONTACTS_DOC));
  const details=snapshot.exists()?snapshot.data().pricing:null;
  return {enabled:details?.enabled===true,updated_at:details?.updated_at||''};
}
export async function saveProductPrice(productId,value){
  await adminCheck();
  const price=cleanUSD(value);
  const reference=doc(db,'catalogProducts',String(productId));
  const snapshot=await getDoc(reference);
  if(!snapshot.exists()||!snapshot.data().name||!snapshot.data().brand)
    throw Error('No encontramos este producto en el inventario privado.');
  const product=snapshot.data();
  const pricing=await getPricingSettings();
  const batch=writeBatch(db);
  batch.update(reference,{price_usd:price,price_updated_at:new Date().toISOString()});
  if(pricing.enabled&&product.status!=='hidden'){
    const publicRef=doc(db,'catalogPublic',String(productId));
    const exists=await getDoc(publicRef);
    if(exists.exists())batch.update(publicRef,{
      price_usd:price===null?deleteField():price
    });
  }
  await batch.commit();
  return price;
}
export async function savePricingEnabled(enabled){
  await adminCheck();
  const active=enabled===true;
  const previous=await getPricingSettings();
  if(previous.enabled===active)return previous;
  const privateSnapshot=await getDocs(collection(db,'catalogProducts'));
  const byId=new Map(privateSnapshot.docs.filter(d=>!d.data().kind&&d.data().name&&d.data().brand)
    .map(d=>[d.id,d.data()]));
  const publicSnapshot=await getDocs(collection(db,'catalogPublic'));
  const published=publicSnapshot.docs.filter(d=>byId.has(d.id)&&
    ['available','sold_out'].includes(d.data().status));
  const patchPricing=docSnap=>{
    const price=byId.get(docSnap.id)?.price_usd;
    const valid=price!==null&&price!==undefined&&Number(price)>0&&Number.isFinite(Number(price));
    return active&&valid?{price_usd:cleanUSD(price)}:{price_usd:deleteField()};
  };
  // Un lote atómico mantiene TODOS los precios y la bandera sincronizados.
  // Por encima del límite seguro de Firestore no realizamos escrituras parciales.
  if(published.length>450)
    throw Error('Hay más de 450 productos públicos. Por seguridad no se activaron ni desactivaron precios: hace falta una sincronización por lotes supervisada.');
  const data={kind:'contact_settings',status:'available',
    pricing:{enabled:active,updated_at:new Date().toISOString()}};
  const batch=writeBatch(db);
  for(const current of published)
    batch.update(current.ref,patchPricing(current));
  batch.set(doc(db,'catalogProducts',CONTACTS_DOC),data,{merge:true});
  batch.set(doc(db,'catalogPublic',CONTACTS_DOC),data,{merge:true});
  await batch.commit();
  return {enabled:active,updated_at:data.pricing.updated_at,products:published.length};
}


// Ajustes masivos: previa verificación de todas las fichas. No modifica fotos,
// productos sin USD ni reglas Firebase. Auditoría privada por bloque; sin borrados.
export async function applyBulkPriceChanges(rows,meta={}){
 await adminCheck();
 if(!Array.isArray(rows)||!rows.length||rows.length>5000)
   throw Error('Selecciona entre 1 y 5.000 precios válidos.');
 const method=meta.method;
 if(!['percent','csv'].includes(method))throw Error('Operación de precios desconocida.');
 const seen=new Set(),changes=[];
 const snapshot=await getDocs(collection(db,'catalogProducts'));
 const byId=new Map(snapshot.docs.map(x=>[x.id,x.data()]).filter(x=>!x[1].kind));
 for(const row of rows){
   const id=String(row.id||'');
   if(!id||seen.has(id))throw Error('Hay productos duplicados o sin identificador.');
   seen.add(id);
   const product=byId.get(id);
   if(!product||!product.name||!product.brand)throw Error('Producto que ya no existe: '+id);
   const previous=cleanUSD(product.price_usd),expected=cleanUSD(row.before),next=cleanUSD(row.after);
   if(previous!==expected)throw Error('Otro usuario cambió un precio. Actualiza la vista previa antes de aplicar.');
   if(next===null)throw Error('No se permiten precios vacíos en la actualización masiva.');
   if(method==='percent' && next!==adjustedPriceUSD(previous,meta.percent,meta.direction))
     throw Error('El porcentaje y el precio esperado no coinciden.');
   if(previous!==next)changes.push({id,name:product.name,brand:product.brand,before:previous,after:next,status:product.status});
 }
 if(!changes.length)throw Error('No hay variaciones de precios para guardar.');
 const pricing=await getPricingSettings();
 const published=new Map();
 if(pricing.enabled){
   const p=await getDocs(collection(db,'catalogPublic'));
   for(const docSnap of p.docs)published.set(docSnap.id,docSnap.data());
 }
 const operationId='AJ-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+crypto.randomUUID().slice(0,8).toUpperCase();
 let completed=0;
 try{
   for(let index=0;index<changes.length;index+=100){
     const chunk=changes.slice(index,index+100),now=new Date().toISOString();
     const audit=doc(collection(db,'catalogProducts'));
     await runTransaction(db,async transaction=>{
       const snapshots=[];
       for(const row of chunk)snapshots.push(await transaction.get(doc(db,'catalogProducts',row.id)));
       for(let i=0;i<chunk.length;i++){
         const current=snapshots[i].data(),row=chunk[i];
         if(!snapshots[i].exists()||cleanUSD(current.price_usd)!==row.before||current.status!==row.status)
           throw Error('El precio o estado de '+row.name+' cambió durante la operación. No se guardó este bloque.');
       }
       for(const row of chunk){
         transaction.update(doc(db,'catalogProducts',row.id),{price_usd:row.after,price_updated_at:now,price_batch:operationId});
         if(pricing.enabled&&row.status!=='hidden'&&published.has(row.id))
           transaction.update(doc(db,'catalogPublic',row.id),{price_usd:row.after});
       }
       transaction.set(audit,{kind:'price_adjustment',operation_id:operationId,method,
         direction:method==='percent'?meta.direction:'',
         percent:method==='percent'?Number(meta.percent):null,
         created_at:now,created_by:auth.currentUser.uid,records:chunk,undone_at:null});
     });
     completed+=chunk.length;
   }
 }catch(error){
   throw Object.assign(new Error('Actualización detenida: '+completed+' de '+changes.length+
     ' precios guardados. Código '+operationId+'. Podrás revisar y deshacer los bloques confirmados. '+error.message),
       {operationId,completed});
 }
 return {operationId,completed};
}
export async function listBulkPriceOperations(){
 await adminCheck();
 const snapshot=await getDocs(query(collection(db,'catalogProducts'),where('kind','==','price_adjustment')));
 const groups=new Map();
 for(const document of snapshot.docs){
   const item=document.data(),id=String(item.operation_id||'');
   if(!id)continue;
   const group=groups.get(id)||{id,count:0,created_at:item.created_at,method:item.method,
     percent:item.percent,direction:item.direction,undone:true};
   group.count+=(Array.isArray(item.records)?item.records.length:0);
   group.undone=group.undone&&Boolean(item.undone_at);
   groups.set(id,group);
 }
 return [...groups.values()].sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,25);
}
export async function undoBulkPriceOperation(operationId){
 await adminCheck();
 if(!/^AJ-[0-9]{8}-[0-9A-F]{8}$/.test(String(operationId||'')))
   throw Error('Código de ajuste inválido.');
 const audits=await getDocs(query(collection(db,'catalogProducts'),where('kind','==','price_adjustment')));
 const matching=audits.docs.filter(d=>d.data().operation_id===operationId&&!d.data().undone_at);
 if(!matching.length)
   throw Error('No encontramos ajustes pendientes de deshacer con ese código.');
 const snapshot=await getDocs(collection(db,'catalogProducts'));
 const byId=new Map(snapshot.docs.map(d=>[d.id,d.data()]));
 const rows=matching.flatMap(d=>d.data().records||[]);
 for(const row of rows){
   const product=byId.get(row.id);
   if(!product||product.price_batch!==operationId||cleanUSD(product.price_usd)!==row.after)
     throw Error('Al menos un precio cambió después del ajuste. No se deshizo nada: revisa las diferencias.');
 }
 const pricing=await getPricingSettings();
 const published=new Set();
 if(pricing.enabled){
   const snap=await getDocs(collection(db,'catalogPublic'));
   for(const p of snap.docs)published.add(p.id);
 }
 let completed=0;
 try{
   for(const audit of matching){
     const rows=audit.data().records||[],now=new Date().toISOString();
     await runTransaction(db,async transaction=>{
       const docs=[];
       for(const row of rows)docs.push(await transaction.get(doc(db,'catalogProducts',row.id)));
       for(let i=0;i<rows.length;i++){
         const current=docs[i].data(),row=rows[i];
         if(!docs[i].exists()||current.price_batch!==operationId||cleanUSD(current.price_usd)!==row.after||
            current.status!==row.status)
           throw Error('El producto '+row.name+' cambió. No se deshizo el bloque.');
       }
       for(const row of rows){
         transaction.update(doc(db,'catalogProducts',row.id),{
           price_usd:row.before===null?deleteField():row.before,price_updated_at:now,price_batch:null});
         if(pricing.enabled&&row.status!=='hidden'&&published.has(row.id))
           transaction.update(doc(db,'catalogPublic',row.id),{
             price_usd:row.before===null?deleteField():row.before});
       }
       transaction.update(audit.ref,{undone_at:now,undone_by:auth.currentUser.uid});
     });
     completed+=rows.length;
   }
 }catch(error){
   throw Error('Deshacer parcialmente terminado ('+completed+'/'+rows.length+'). Revisa el historial antes de repetir: '+error.message);
 }
 return {completed};
}

// Los endpoints llaman a Functions con token Firebase del administrador.
// Todas las escrituras privadas se validan otra vez en el servidor.
async function adminPortalCall(name,data={}){
  await adminCheck();
  const call=httpsCallable(getFunctions(app,'us-central1'),name);
  const result=await call(data);
  return result.data;
}
export const getCustomerPortalAdminHealth=()=>adminPortalCall('customerPortalAdminHealth');
export const saveCustomerPortalEnabled=(enabled)=>adminPortalCall('customerPortalAdminSetEnabled',{enabled});
