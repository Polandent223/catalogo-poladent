import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeAnalytics,monthRange,weekRange,formatDuration} from './analytics-summary.js';
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
assert.ok(!listener.includes('localStorage') && !listener.includes('sessionStorage'));
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
console.log('Estadísticas POLADENT: cálculos, privacidad, reglas y botones verificados');
