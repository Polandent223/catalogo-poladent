import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ANALYTICS_SOURCES,classifyCatalogSource,encodeBrandSource,
 decodeBrandSource,campaignURL} from './analytics-source.js';
import {summarizeAnalytics} from './analytics-summary.js';

const root='https://catalogopoladent.com/?catalogo=1';
const check=(url,referrer,expected)=>assert.equal(classifyCatalogSource(url,referrer),expected,url+' <- '+referrer);
check(root,'','sin_identificar');
check(root,'https://polandent223.github.io/catalogo-poladent/','sin_identificar');
check(root,'https://catalogopoladent.com/colecciones/marcas/adalta/','sin_identificar');
check(root,'https://www.google.com/search?q=instrumental','google');
check(root,'https://google.co.ve/search?q=odontologia','google');
check(root,'https://maps.app.goo.gl/abc','google');
check(root,'https://l.instagram.com/?u=xxx','instagram');
check(root,'https://m.facebook.com/','facebook');
check(root,'https://web.whatsapp.com/','whatsapp');
check(root,'https://example.com/a?email=unsafe@example.org','otros');
check(root+'?not_valid','', 'sin_identificar');
check('https://catalogopoladent.com/?utm_source=qr&utm_medium=offline','','qr');
check('https://catalogopoladent.com/?utm_source=instagram','','instagram');
check('https://catalogopoladent.com/?utm_source=ig','','instagram');
check('https://catalogopoladent.com/?utm_source=google&utm_medium=local','','google');
check('https://catalogopoladent.com/?utm_source=fb','','facebook');
check('https://catalogopoladent.com/?utm_source=unknown','','otros');
check('https://catalogopoladent.com/?utm_source=qr#producto=p1','https://google.com/','qr');
assert.equal(ANALYTICS_SOURCES.length,7);

assert.deepEqual(decodeBrandSource(encodeBrandSource('VRC','google')),
 {brand:'VRC',source:'google'});
assert.deepEqual(decodeBrandSource(encodeBrandSource('Cotización múltiple','instagram')),
 {brand:'Cotización múltiple',source:'instagram'});
assert.deepEqual(decodeBrandSource(encodeBrandSource('','qr')),
 {brand:'',source:'qr'});
assert.deepEqual(decodeBrandSource(encodeBrandSource('ADALTA','sin_identificar')),
 {brand:'ADALTA',source:'sin_identificar'});
assert.deepEqual(decodeBrandSource('ADALTA'),{brand:'ADALTA',source:'sin_identificar'});
assert.deepEqual(decodeBrandSource('VRC|origen:fraudulent'),
 {brand:'VRC|origen:fraudulent',source:'sin_identificar'});
assert.equal(encodeBrandSource('Z'.repeat(80),'qr'),'Z'.repeat(80),'No truncar marca de 80 caracteres.');

const base='2026-11-25T10:00:00.000Z';
const ev=(type,brand='',id='')=>({type,brand,product_id:id,created_at:new Date(base),seconds:0});
const sample=[
 ev('visit',encodeBrandSource('','google')),
 ev('visit',encodeBrandSource('','instagram')),
 ev('visit',encodeBrandSource('','qr')),
 ev('visit',''), // visitas históricas / QR anteriores sin etiquetar
 ev('whatsapp',encodeBrandSource('VRC','google'),'vrc-01'),
 ev('whatsapp',encodeBrandSource('VRC','instagram'),'vrc-01'),
 ev('whatsapp',encodeBrandSource('Cotización múltiple','qr')),
 ev('whatsapp','VRC','vrc-01'), // histórico
 ev('product_open','VRC','vrc-01')
];
const data=summarizeAnalytics(sample);
assert.equal(data.visits,4);
assert.equal(data.whatsappClicks,4);
assert.equal(data.productViews,1);
assert.deepEqual(data.whatsappByBrand,[{name:'VRC',clicks:3},{name:'Cotización múltiple',clicks:1}]);
assert.deepEqual(data.products.find(x=>x.id==='vrc-01'),
 {id:'vrc-01',brand:'VRC',views:1,whatsappClicks:3});
const source=id=>data.sources.find(x=>x.id===id);
assert.deepEqual({visits:source('google').visits,clicks:source('google').whatsappClicks},{visits:1,clicks:1});
assert.deepEqual({visits:source('instagram').visits,clicks:source('instagram').whatsappClicks},{visits:1,clicks:1});
assert.deepEqual({visits:source('qr').visits,clicks:source('qr').whatsappClicks},{visits:1,clicks:1});
assert.deepEqual({visits:source('sin_identificar').visits,clicks:source('sin_identificar').whatsappClicks},{visits:1,clicks:1});
assert.equal(data.sources.reduce((v,x)=>v+x.visits,0),data.visits);
assert.equal(data.sources.reduce((v,x)=>v+x.whatsappClicks,0),data.whatsappClicks);

for(const x of ['google','instagram','facebook','qr','whatsapp']){
 const u=new URL(campaignURL(x));
 assert.equal(u.hostname,'catalogopoladent.com');
 assert.equal(u.searchParams.get('utm_source'),x);
 assert.equal(classifyCatalogSource(u.href,''),x);
}
assert.throws(()=>campaignURL('untrusted'));
const tracker=readFileSync('catalog-analytics.js','utf8');
const admin=readFileSync('analytics-admin.js','utf8');
const dashboard=readFileSync('estadisticas.html','utf8');
const rules=readFileSync('firestore.rules','utf8');
const privacy=readFileSync('aviso-estadisticas.html','utf8');
const collectionGenerator=readFileSync('scripts/generate-seo-collections.mjs','utf8');
assert.ok(tracker.includes('classifyCatalogSource(location.href,document.referrer)'));
assert.ok(tracker.includes('encodeBrandSource(brand,source)'));
assert.ok(tracker.includes('serverTimestamp()'));
assert.ok(!/(?:localStorage|sessionStorage)\s*[.[]/.test(tracker));
assert.ok(!/(?:document\.cookie|navigator\.sendBeacon)/.test(tracker));
assert.ok(rules.includes("data.keys().hasOnly(['type','seconds','brand','product_id','created_at'])"),
  'Mantener las reglas existentes, no pedir despliegue extra de Firebase.');
assert.ok(rules.includes('allow get, list: if isAdmin()'));
assert.ok(rules.includes('allow update, delete: if false;'));
assert.ok(admin.includes('renderSources(data)'));
assert.ok(admin.includes('renderCampaignLinks()'));
assert.ok(!admin.includes('.innerHTML'));
for(const id of ['analytics-sources','analytics-campaign-links','analytics-campaign-copy-status'])
 assert.ok(dashboard.includes('id="'+id+'"'));
assert.ok(privacy.includes('QR impresos sin etiquetas'));
assert.ok(collectionGenerator.includes("import {classifyCatalogSource} from '../../../analytics-source.js'"));
assert.ok(collectionGenerator.includes("url.searchParams.set('utm_source',origin)"));
assert.ok(!tracker.includes('addDoc(fs.collection(db,\'catalogAnalyticsSources\')'));
console.log('POLADENT: 7 canales, historial, QR anteriores, cotizaciones, privacidad y enlaces verificables OK.');
