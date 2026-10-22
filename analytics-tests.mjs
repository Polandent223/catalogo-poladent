import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeAnalytics,monthRange,weekRange,comparisonRanges,metricChange,formatDuration} from './analytics-summary.js';
const event=(type,date,seconds=0,brand='')=>({type,created_at:new Date(date),seconds,brand});
const summary=summarizeAnalytics([
  event('visit','2026-10-15T10:00:00Z'),
  event('visit','2026-10-15T11:00:00Z'),
  event('engagement','2026-10-15T10:00:30Z',45),
  event('engagement','2026-10-15T10:01:30Z',60),
  event('whatsapp','2026-10-15T10:02:00Z',0,'VRC'),
  event('product_open','2026-10-15T10:00:10Z',0,'VRC'),
  event('product_open','2026-10-15T10:01:10Z',0,'ADALTA'),
  event('product_open','2026-10-15T10:01:15Z',0,'VRC')
]);
assert.equal(summary.visits,2);
assert.equal(summary.whatsappClicks,1);
assert.equal(summary.productViews,3);
assert.equal(summary.activeSeconds,105);
assert.equal(summary.averageSeconds,53);
assert.deepEqual(summary.brands,[{name:'VRC',views:2},{name:'ADALTA',views:1}]);
assert.equal(summary.days.reduce((v,d)=>v+d.visits,0),2);
assert.equal(formatDuration(0),'0 s');
assert.equal(formatDuration(125),'2 min 05 s');
const m=monthRange(2026,9);
assert.equal(m.start.getMonth(),9);
assert.equal(m.end.getMonth(),10);
const w=weekRange(new Date(2026,9,17,19));
assert.equal((w.end-w.start)/86400000,7);
const rules=readFileSync('firestore.rules','utf8');
assert.match(rules,/match \/catalogAnalyticsEvents\/\{id\}/);
assert.match(rules,/allow get, list: if isAdmin\(\);/);
assert.match(rules,/allow update, delete: if false;/);
assert.match(rules,/request\.resource\.data\.created_at == request\.time/);
assert.match(rules,/request\.resource\.data\.seconds <= 60/);
assert.match(rules,/data\.keys\(\)\.hasOnly/);
const listener=readFileSync('catalog-analytics.js','utf8');
assert.match(listener,/startCatalogAnalytics/);
assert.match(listener,/serverTimestamp\(\)/);
assert.match(listener,/catalog:product-open/);
assert.match(listener,/inquiry-whatsapp/);
assert.match(listener,/doNotTrack/);
assert.ok(!/\\b(?:localStorage|sessionStorage)\\s*[.\\[]/.test(listener));
const app=readFileSync('welcome.js','utf8');
assert.ok(app.includes("import('./catalog-analytics.js')"));
const publicCatalog=readFileSync('public-catalog.js','utf8');
assert.match(publicCatalog,/catalog:product-open/);
const html=readFileSync('admin.html','utf8');
assert.match(html,/href="estadisticas.html"/);
const dashboard=readFileSync('estadisticas.html','utf8');
for(const id of ['analytics-login','analytics-period','analytics-month','metric-visits','metric-time','metric-whatsapp','metric-products']){
  assert.ok(dashboard.includes('id="'+id+'"'));
}
const firestore=readFileSync('firebase-client.js','utf8');
assert.ok(firestore.includes("collection(db,'catalogAnalyticsEvents')"));
assert.ok(firestore.includes("await adminCheck();"));

// Rankings: un mismo producto puede recibir múltiples aperturas y consultas.
const extended=[
  {type:'visit',created_at:new Date(2026,9,17,9)},
  {type:'product_open',created_at:new Date(2026,9,17,9,1),product_id:'vrc-01',brand:'VRC'},
  {type:'product_open',created_at:new Date(2026,9,17,9,2),product_id:'vrc-01',brand:'VRC'},
  {type:'product_open',created_at:new Date(2026,9,17,9,3),product_id:'adalta-01',brand:'ADALTA'},
  {type:'whatsapp',created_at:new Date(2026,9,17,9,4),product_id:'vrc-01',brand:'VRC'},
  {type:'whatsapp',created_at:new Date(2026,9,17,9,5),product_id:'vrc-01',brand:'VRC'},
  {type:'whatsapp',created_at:new Date(2026,9,17,9,6),product_id:'adalta-01',brand:'ADALTA'},
  {type:'whatsapp',created_at:new Date(2026,9,17,9,7),product_id:'old-item',brand:'IMODONTO'},
  // Historic event without product ID: count brand, but never invent product.
  {type:'whatsapp',created_at:new Date(2026,9,17,9,8),product_id:'',brand:'VRC'}
];
const full=summarizeAnalytics(extended);
assert.deepEqual(full.whatsappByBrand,[
  {name:'VRC',clicks:3},{name:'ADALTA',clicks:1},{name:'IMODONTO',clicks:1}
]);
assert.deepEqual(full.products.slice(0,2),[
  {id:'vrc-01',brand:'VRC',views:2,whatsappClicks:2},
  {id:'adalta-01',brand:'ADALTA',views:1,whatsappClicks:1}
]);
assert.deepEqual(full.products.find(p=>p.id==='old-item'),
  {id:'old-item',brand:'IMODONTO',views:0,whatsappClicks:1});
assert.equal(full.whatsappClicks,5);
assert.equal(metricChange(20,10),'+100 %');
assert.equal(metricChange(5,10),'-50 %');
assert.equal(metricChange(0,0),'Sin cambio');
assert.equal(metricChange(10,0),'Nuevo');
const now=new Date(2026,9,17,10,35);
const currentMonth=comparisonRanges('month','2026-9',now);
assert.equal(currentMonth.current.start.getMonth(),9);
assert.equal(currentMonth.current.end.getDate(),18);
assert.equal(currentMonth.previous.start.getMonth(),8);
assert.equal(currentMonth.previous.end.getDate(),18);
assert.match(currentMonth.label,/Mismos días/);
const historic=comparisonRanges('month','2026-7',now);
assert.equal(historic.current.end.getMonth(),8);
assert.equal(historic.previous.end.getMonth(),7);
assert.match(historic.label,/Mes anterior completo/);
const febClamp=comparisonRanges('month','2026-2',new Date(2026,2,31,12));
assert.equal(febClamp.previous.end.getMonth(),2);
assert.equal(febClamp.previous.end.getDate(),1);
const weekly=comparisonRanges('week','',now);
assert.equal((weekly.current.start-weekly.previous.start)/86400000,7);
assert.equal((weekly.current.end-weekly.current.start)/86400000,7);

const quick=await import('data:text/javascript;base64,'+
  Buffer.from(readFileSync('catalog-quick-search.js','utf8')).toString('base64'));
const candidates=new Map([
  ['endo-1',{name:'Limas para endodoncia',brand:'ADALTA'}],
  ['lab-1',{name:'Yeso dental',brand:'VRC'}]
]);
const subjects=quick.interestByArea([
  {type:'product_open',product_id:'endo-1'},
  {type:'product_open',product_id:'endo-1'},
  {type:'product_open',product_id:'lab-1'},
  {type:'visit',product_id:'endo-1'}
],candidates);
assert.deepEqual(subjects.slice(0,2).map(a=>[a.id,a.views]),
  [['endodoncia',2],['laboratorio',1]]);
const adminHtml=readFileSync('estadisticas.html','utf8');
assert.ok(adminHtml.includes('id="analytics-areas"'));
const tracker=readFileSync('catalog-analytics.js','utf8');
assert.ok(tracker.includes('a#inquiry-quick'));
const adminScript=readFileSync('analytics-admin.js','utf8');
assert.ok(adminScript.includes('listProducts(true)'));
assert.ok(adminScript.includes('productNames()'));
assert.ok(adminScript.includes('Promise.all(['));
assert.ok(adminScript.includes('listAnalyticsEvents(previous.start,previous.end)'));
assert.ok(adminScript.includes('renderProductInsights'));
assert.ok(adminScript.includes('renderWhatsappByBrand'));
assert.ok(adminScript.includes('renderAreaInsights(events,names)'));
assert.ok(adminScript.includes('interestByArea'));

assert.ok(!adminScript.includes('.innerHTML'));
for (const id of ['analytics-products','analytics-whatsapp-brands','compare-visits','compare-whatsapp']){
  assert.ok(dashboard.includes('id="'+id+'"'));
}
// El recopilador público y las reglas históricas permanecen intactos.
assert.ok(!listener.includes('analytics-products'));
assert.ok(!firestore.includes('deleteDoc(doc(db,\'catalogAnalyticsEvents\''));
console.log('Estadísticas POLADENT: cálculos, privacidad, reglas y botones verificados');
