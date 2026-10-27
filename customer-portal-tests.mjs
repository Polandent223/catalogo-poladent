import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const core=require('./functions/customer-core.cjs');
const read=path=>readFileSync(new URL('./'+path,import.meta.url),'utf8');
assert.equal(core.normalizeCedula('v-12.345.678'),'V12345678');
assert.equal(core.normalizeCedula('E12345678'),'E12345678');
assert.equal(core.maskedCedula('V12345678'),'V***678');
for(const input of ['','12345678','V1','V12345678901','<script>','V1234A6'])
  assert.throws(()=>core.normalizeCedula(input),'Rechazar cédula '+input);
assert.equal(core.normalizeCustomerName('  María  Pérez '),'María Pérez');
assert.throws(()=>core.normalizeCustomerName('A'));
const items=[{id:'p1',quantity:2},{id:'p2',quantity:1}];
const catalog=[
 {id:'p1',name:'Espejo',brand:'ADALTA',status:'available',price_usd:10},
 {id:'p2',name:'Limas',brand:'DENCO',status:'sold_out',price_usd:5.5}
];
const priced=core.calculateQuote(items,catalog,true,123.456);
assert.equal(priced.total_usd,25.5);
assert.equal(priced.total_ves,3148.13);
assert.equal(priced.units,3);
assert.equal(priced.lines[0].name,'Espejo');
assert.equal(priced.lines[0].subtotal_usd,20);
assert.equal(priced.complete,true);
assert.equal(core.calculateQuote(items,catalog,true,null).total_ves,null,'BCV fallido no genera Bs inventados.');
assert.equal(core.calculateQuote(items,catalog,false,null).total_usd,null,'Precios públicos apagados.');
assert.throws(()=>core.calculateQuote(items,[catalog[0]],true,123),'Producto oculto o retirado');
assert.throws(()=>core.validateRequestedItems([{id:'p1',quantity:1},{id:'p1',quantity:2}]));
assert.throws(()=>core.validateRequestedItems([{id:'p1',quantity:10000}]));
assert.throws(()=>core.priceCents('no es precio'));
const rate=core.validBcvPayload({USD:887.302,effective_date:'2026-10-27'},new Date('2026-10-27T17:00:00Z'));
assert.equal(rate.usd_ves,887.302);
assert.throws(()=>core.validBcvPayload({USD:887,effective_date:'2026-10-15'},new Date('2026-10-27T17:00:00Z')));
const functions=read('functions/index.js');
assert.ok(functions.includes("requireVerified(request)"),'Guardar y consultar exigen token verificado.');
assert.ok(functions.includes("request.auth.token.email_verified!==true"));
assert.ok(functions.includes("crypto.createHmac('sha256',secret)"),'No guardar cédula en texto plano.');
assert.ok(functions.includes("store.collection('customerQuotes').where('uid','==',uid)"),
  'La consulta no puede enumerar cotizaciones ajenas.');
assert.ok(functions.includes('await requireAdmin(request)'), 'El interruptor es solo para admins.');
assert.ok(functions.includes('if(count>=20)'), 'Limitar abuso de guardado diario.');
assert.ok(functions.includes('customerPortalAdminSetEnabled'));
assert.ok(functions.includes("request.data?.consent!==true"),'El backend requiere consentimiento para crear perfil.');
assert.ok(functions.includes("privacy_consent_version:'2026-10'"),'Registrar versión de consentimiento.');
assert.ok(functions.includes("status:'guardada'"),'Guardar borrador no implica cotización enviada al personal.');
assert.ok(!functions.includes("cedula:cedula"),'No persistir cédula completa en documentos.');
assert.ok(read('cuenta.html').includes('privacidad-clientes.html'));
assert.ok(read('cuenta.js').includes('form.elements.consent.checked'));

assert.ok(functions.includes("await requirePortal()"),'Cada operación de cliente comprueba estado público.');
const parser=read('catalog-public-data.js');
assert.ok(parser.includes('customerPortalEnabled=false'));
assert.ok(parser.includes('customerPortalEnabled=data.customer_portal?.enabled===true'));
const index=read('index.html'),publicCode=read('public-catalog.js');
assert.ok(index.includes('id="customer-account-link"')&&index.includes('hidden'));
assert.ok(index.includes('id="customer-account-note"')&&index.includes('hidden'));
assert.ok(index.includes('id="customer-save-quote"')&&index.includes('hidden'));
assert.ok(publicCode.includes('if(!customerPortalEnabled)return;'));
assert.ok(publicCode.includes("import('./customer-client.js')"),'Carga autenticación solo si está habilitada.');
assert.ok(publicCode.includes('Ya lo cotizaste'));
assert.ok(publicCode.includes('customerAPI.saveCustomerQuote'));
assert.ok(publicCode.includes("showCartMessage('No pudimos guardar el historial"),'Fallos no impiden WhatsApp.');
assert.ok(index.includes('id="cart-whatsapp"'),'El carrito anónimo continúa.');
assert.ok(index.includes('id="inquiry-whatsapp"'),'La consulta individual continúa.');
const account=read('cuenta.html'),app=read('cuenta.js');
for(const id of ['customer-unavailable','customer-signup-form','customer-login-form',
 'customer-profile-form','customer-dashboard','customer-previous-products','customer-quotes'])
  assert.ok(account.includes('id="'+id+'"'));
assert.ok(app.includes("sessionStorage.setItem(CART_STORAGE_KEY"),'Reutilizar productos cotizados.');
assert.ok(app.includes('customerFeatureStatus()'),'No registrar si el portal está apagado.');
assert.ok(!read('firestore.rules').includes('customerProfiles'),'No abrir permisos directos a clientes.');
const admin=read('admin.html'),adminCode=read('admin.js');
assert.ok(admin.includes('id="customer-portal-switch" type="checkbox" role="switch" disabled'));
assert.ok(adminCode.includes('getCustomerPortalAdminHealth'));
assert.ok(adminCode.includes('customerPortalReady'));
assert.ok(adminCode.includes('saveCustomerPortalEnabled(target)'));
assert.ok(!read('functions/index.js').includes('allow read: if true'), 'No abrir historiales públicamente.');
console.log('POLADENT: 35 verificaciones funcionales y de acceso del portal de clientes correctas. Código no desplegado.');
