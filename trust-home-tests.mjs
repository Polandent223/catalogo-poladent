import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const load=async name=>import('data:text/javascript;base64,'+Buffer.from(read(name)).toString('base64'));
const {TRUST_HOME_DEFAULTS,normalizeTrustHome,validateTrustHomeForPublish}=await load('trust-home-settings.js');

const defaults=normalizeTrustHome();
assert.equal(defaults.enabled,false,'El diseño nuevo inicia desactivado');
assert.equal(defaults.style,'premium');
assert.equal(defaults.branches.length,2);
assert.equal(defaults.branches[0].id,'valencia');
assert.equal(defaults.branches[1].id,'maracay');
assert.equal(defaults.branches[0].phone,'584226710634');
assert.equal(defaults.branches[1].phone,'584226710634');
assert.deepEqual(defaults.branches.map(b=>b.photos),[[],[]]);
assert.equal(defaults.show_branches,true);
const photo='https://images.example.org/valencia.webp';
const branch={...TRUST_HOME_DEFAULTS.branches[0],photos:[{url:photo,path:'pictures/photo1'}]};
const saved=normalizeTrustHome({
  ...TRUST_HOME_DEFAULTS,enabled:true,title:'Mi portada personalizada',branches:[branch],
  logo_url:'https://images.example.org/logo.png'
});
assert.equal(saved.title,'Mi portada personalizada');
assert.equal(saved.branches[0].photos[0].url,photo);
assert.equal(saved.branches[0].photos[0].path,'pictures/photo1');
assert.equal(saved.logo_url,'https://images.example.org/logo.png');
assert.equal(validateTrustHomeForPublish(saved).enabled,true);
assert.throws(()=>validateTrustHomeForPublish({
  ...TRUST_HOME_DEFAULTS,enabled:true
}),/foto real/,'La publicación requiere fotos reales');
assert.throws(()=>validateTrustHomeForPublish({
  ...TRUST_HOME_DEFAULTS,enabled:true,branches:[{...branch,phone:'abc'}]
}),/WhatsApp/);
assert.throws(()=>validateTrustHomeForPublish({
  ...TRUST_HOME_DEFAULTS,enabled:true,branches:[branch,{...branch}]
}),/identificador diferente/);
const blocked=normalizeTrustHome({
  title:'x'.repeat(500),logo_url:'javascript:alert(1)',hero_image_url:'http://inseguro.test/x',
  branches:[{...branch,photos:[{url:'data:image/png;base64,abcd'},{url:photo}]}]
});
assert.equal(blocked.title,TRUST_HOME_DEFAULTS.title);
assert.equal(blocked.hero_image_url,'');
assert.equal(blocked.logo_url,'');
assert.deepEqual(blocked.branches[0].photos.map(p=>p.url),[photo]);
assert.equal(normalizeTrustHome({...TRUST_HOME_DEFAULTS,enabled:'true'}).enabled,false);
assert.equal(normalizeTrustHome({}).branches.length,2,'No perder sedes iniciales');

const backend=read('firebase-client.js');
const draft=backend.slice(backend.indexOf('export async function saveTrustHomeDraft('),
  backend.indexOf('export async function publishTrustHomeDraft('));
assert.ok(draft.includes("doc(db,'catalogProducts',CONTACTS_DOC)"));
assert.ok(!draft.includes("'catalogPublic'"),'El borrador nunca se publica');
const publish=backend.slice(backend.indexOf('export async function publishTrustHomeDraft('),
  backend.indexOf('export async function unpublishTrustHome('));
assert.ok(publish.includes('await adminCheck()'));
assert.ok(publish.includes("doc(db,'catalogPublic',CONTACTS_DOC)"));
assert.ok(publish.includes('batch.commit()'),'La publicación es atómica');
assert.ok(!publish.includes('deleteDoc('));
assert.ok(!publish.includes('batch.delete('));
const publicCode=read('public-catalog.js');
const parser=read('catalog-public-data.js');
const page=read('index.html'),style=read('trust-home.css'),admin=read('trust-admin.js');
assert.ok(parser.includes('trustHome=data.trust_home'));
assert.ok(parser.includes('hasCatalogState,storefront,trustHome'));
assert.ok(publicCode.includes('trustHomeSettings=data.trustHome'));
assert.ok(publicCode.includes('renderTrustHome(trust,active,previewStorefront)'));
assert.ok(publicCode.includes('trustOn'), 'El diseño se muestra solo si está activado');
assert.ok(publicCode.includes("event.origin!==location.origin||event.source!==window.parent"),
  'La vista previa valida origen y ventana del mensaje');
assert.ok(publicCode.includes("poladent:trust-home-draft"));
for(const id of ['trust-home-sections','trust-store-grid','trust-stores','trust-benefits',
  'trust-steps','trust-closing','storefront-whatsapp-link','trust-header-logo'])
  assert.ok(page.includes('id="'+id+'"'),'Falta elemento '+id);
assert.ok(page.includes('id="cart-open"'),'Se conserva el carrito');
assert.ok(page.includes('id="welcome-screen"'),'Se conserva la portada original');
assert.ok(style.includes('@media(max-width:700px)'), 'Responsive');
assert.ok(admin.includes('saveTrustHomeDraft(data)'));
assert.ok(admin.includes('publishTrustHomeDraft()'));
assert.ok(admin.includes('unpublishTrustHome()'));
assert.ok(admin.includes('previewURLs'));
assert.ok(read('admin.html').includes('href="confianza.html"'));
console.log('Portada premium: sedes, vista previa, validación, borrador privado y publicación aislada comprobados.');
