// Mantiene funcionando la edición con Supabase y permite adoptar Firebase sin afectar GitHub Pages.
const firebaseConfig = window.CATALOGO_FIREBASE || {};
const usingFirebase = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
const client = await import(usingFirebase ? './firebase-client.js' : './data-client.js');

export const configured = client.configured;
export const signedIn = client.signedIn;
export const validImage = client.validImage;
export const login = client.login;
export const logout = client.logout;
export const listProducts = client.listProducts;
export const uploadImage = client.uploadImage;
export const restoreSession = usingFirebase
  ? client.restoreSession
  : async () => client.signedIn();

export async function adminCheck() {
  if (usingFirebase) return client.adminCheck();
  const admins = await client.request('/rest/v1/catalog_admins?select=user_id', { auth: true });
  if (!admins.length) throw Error('Esta cuenta no está autorizada para administrar el catálogo.');
  return true;
}
export async function saveProduct(id, body) {
  if (usingFirebase) return client.saveProduct(id, body);
  return client.request('/rest/v1/catalog_products' + (id ? '?id=eq.' + encodeURIComponent(id) : ''), {
    method: id ? 'PATCH' : 'POST', body, auth: true
  });
}
export async function deleteProduct(product) {
  if (usingFirebase) return client.deleteProduct(product);
  await client.request('/rest/v1/catalog_products?id=eq.' + encodeURIComponent(product.id), { method: 'DELETE', auth: true });
  if (product.image_path) await removeImage(product.image_path);
}
export async function importProducts(rows) {
  if (usingFirebase) return client.importProducts(rows);
  if (rows.length) return client.request('/rest/v1/catalog_products', { method: 'POST', body: rows, auth: true });
}
export async function removeImage(path) {
  if (usingFirebase) return client.removeImage(path);
  if (!path) return;
  try { await client.request('/storage/v1/object/catalog-images', { method: 'DELETE', body: { prefixes: [path] }, auth: true }); }
  catch {}
}

export async function listImageCleanups() {
  if (usingFirebase) return client.listImageCleanups();
  return [];
}
export async function retryImageCleanups() {
  if (usingFirebase) return client.retryImageCleanups();
  return { deleted: 0, failures: [], pending: 0 };
}

export async function listBrands(admin = false) {
  if (usingFirebase) return client.listBrands(admin);
  return [];
}
export async function saveBrand(id, body, originalName = '') {
  if (!usingFirebase) throw Error('La administración de marcas necesita Firebase.');
  return client.saveBrand(id, body, originalName);
}

export async function listAdminOverview() {
  if (usingFirebase) return client.listAdminOverview();
  const [products, cleanups] = await Promise.all([client.listProducts(true), listImageCleanups()]);
  return { products, cleanups };
}

export async function getWhatsAppContacts() {
  if (usingFirebase) return client.getWhatsAppContacts();
  return [];
}
export async function saveWhatsAppContacts(contacts) {
  if (!usingFirebase) throw Error('La configuración de WhatsApp requiere Firebase.');
  return client.saveWhatsAppContacts(contacts);
}

export async function getWelcomeSettings() {
  if (usingFirebase) return client.getWelcomeSettings();
  return {enabled:false,image_url:'',image_path:null};
}
export async function saveWelcomeSettings(settings) {
  if (!usingFirebase) throw Error('La portada necesita Firebase.');
  return client.saveWelcomeSettings(settings);
}

export async function getStorefrontSettings(){
  if(!usingFirebase)throw Error('El diseño editable necesita Firebase.');
  return client.getStorefrontSettings();
}
export async function saveStorefrontSettings(settings){
  if(!usingFirebase)throw Error('El diseño editable necesita Firebase.');
  return client.saveStorefrontSettings(settings);
}

export async function listAnalyticsEvents(start,end) {
  if(!usingFirebase)throw Error('Las estadísticas necesitan Firebase.');
  return client.listAnalyticsEvents(start,end);
}

export async function getPricingSettings(){
  if(!usingFirebase)throw Error('Los precios con tasa BCV requieren Firebase.');
  return client.getPricingSettings();
}
export async function saveProductPrice(productId,value){
  if(!usingFirebase)throw Error('Los precios con tasa BCV requieren Firebase.');
  return client.saveProductPrice(productId,value);
}
export async function savePricingEnabled(enabled){
  if(!usingFirebase)throw Error('Los precios con tasa BCV requieren Firebase.');
  return client.savePricingEnabled(enabled);
}

export async function applyBulkPriceChanges(rows,meta){
  if(!usingFirebase)throw Error('Los ajustes masivos de precios necesitan Firebase.');
  return client.applyBulkPriceChanges(rows,meta);
}
export async function listBulkPriceOperations(){
  if(!usingFirebase)throw Error('El historial de ajustes necesita Firebase.');
  return client.listBulkPriceOperations();
}
export async function undoBulkPriceOperation(operationId){
  if(!usingFirebase)throw Error('Deshacer ajustes requiere Firebase.');
  return client.undoBulkPriceOperation(operationId);
}

export async function getCustomerPortalAdminHealth(){
  if(!usingFirebase)throw Error('El portal de clientes requiere Firebase.');
  return client.getCustomerPortalAdminHealth();
}
export async function saveCustomerPortalEnabled(enabled){
  if(!usingFirebase)throw Error('El portal de clientes requiere Firebase.');
  return client.saveCustomerPortalEnabled(enabled);
}
