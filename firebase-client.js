// Adaptador Firebase: Authentication + Firestore + Storage.
// Solo se importa cuando CATALOGO_FIREBASE contiene configuración pública.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, writeBatch } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js';

const cfg = window.CATALOGO_FIREBASE || {};
export const configured = Boolean(cfg.apiKey && cfg.projectId && cfg.appId);
const app = initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = cfg.storageBucket ? getStorage(app) : null;
const ready = new Promise(resolve => {
  const unsubscribe = onAuthStateChanged(auth, () => { unsubscribe(); resolve(); }, () => resolve());
});
export const signedIn = () => Boolean(auth.currentUser);

export async function adminCheck() {
  await ready;
  if (!auth.currentUser) throw Error('Inicia sesión para administrar el catálogo.');
  const access = await getDoc(doc(db, 'catalogAdmins', auth.currentUser.uid));
  if (!access.exists() || access.data()?.active !== true) throw Error('Esta cuenta no está autorizada para administrar el catálogo.');
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
  return a.brand.localeCompare(b.brand, 'es') || (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name, 'es');
}
export async function listProducts(admin = false) {
  if (admin) await adminCheck();
  const snap = await getDocs(collection(db, admin ? 'catalogProducts' : 'catalogPublic'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortProducts);
}
function sanitize(body) {
  return {
    name: String(body.name || '').trim().slice(0, 180),
    brand: String(body.brand || '').trim().slice(0, 80),
    description: String(body.description || '').trim().slice(0, 1000),
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
  batch.set(doc(db, 'catalogProducts', key), product);
  if (product.status === 'hidden') batch.delete(doc(db, 'catalogPublic', key));
  else batch.set(doc(db, 'catalogPublic', key), product);
  await batch.commit();
  return key;
}
export async function deleteProduct(product) {
  await adminCheck();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'catalogProducts', product.id));
  batch.delete(doc(db, 'catalogPublic', product.id));
  await batch.commit();
  if (product.image_path && storage) {
    try { await deleteObject(ref(storage, product.image_path)); } catch { /* Limpieza no crítica */ }
  }
}
export async function importProducts(rows) {
  await adminCheck();
  if (!rows.length) return;
  const batch = writeBatch(db);
  for (const body of rows) {
    const product = sanitize(body);
    const key = doc(collection(db, 'catalogProducts')).id;
    batch.set(doc(db, 'catalogProducts', key), product);
    batch.set(doc(db, 'catalogPublic', key), product);
  }
  await batch.commit();
}
export function validImage(value) {
  try { const url = new URL(value, location.href); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}
export async function uploadImage(file) {
  await adminCheck();
  if (!storage) throw Error('Para subir fotos directamente configura Cloud Storage en Firebase (requiere plan Blaze). Puedes usar una URL pública en el campo de imagen.');
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
  const path = 'catalog-images/' + crypto.randomUUID() + '.webp';
  const object = ref(storage, path);
  try { await uploadBytes(object, blob, { contentType: 'image/webp' }); }
  catch (error) {
    throw Error('No se pudo subir la imagen a Firebase Storage. Revisa el plan Blaze, el bucket y las reglas de seguridad. ' + (error.code || ''));
  }
  return { url: await getDownloadURL(object), path };
}
export async function removeImage(path) {
  if (!path || !storage) return;
  try { await deleteObject(ref(storage, path)); } catch {}
}
