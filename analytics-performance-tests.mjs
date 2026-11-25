import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {clicksPer100Visits,summarizeChannelPerformance} from './analytics-performance.js';
import {summarizeAnalytics} from './analytics-summary.js';
import {encodeBrandSource} from './analytics-source.js';

assert.equal(clicksPer100Visits(100,13),13);
assert.equal(clicksPer100Visits(20,3),15);
assert.equal(clicksPer100Visits(3,4),133.3,'Una visita puede iniciar varias consultas.');
assert.equal(clicksPer100Visits(0,2),null,'No dividir entre cero.');
assert.equal(clicksPer100Visits(-1,2),null);
assert.equal(clicksPer100Visits(4,-3),null);
assert.equal(clicksPer100Visits(Number.NaN,4),null);

const report=summarizeChannelPerformance([
 {id:'instagram',label:'Instagram',visits:80,whatsappClicks:12},
 {id:'google',label:'Google',visits:100,whatsappClicks:16},
 {id:'facebook',label:'Facebook',visits:18,whatsappClicks:9},
 {id:'sin_identificar',label:'Sin identificar',visits:50,whatsappClicks:11},
 {id:'qr',label:'QR',visits:3,whatsappClicks:4},
 {id:'whatsapp',label:'WhatsApp',visits:0,whatsappClicks:1}
]);
assert.equal(report.totalVisits,251);
assert.equal(report.unknownVisits,50);
assert.equal(report.taggedVisits,201);
assert.equal(report.leadingChannel.id,'google','Más clics identificados; no contactos únicos.');
assert.equal(report.topFrequency.id,'google','Ignorar muestras menores a 20 visitas.');
assert.equal(report.items[0].id,'google');
assert.equal(report.items.find(c=>c.id==='qr').clicksPer100,133.3);
assert.equal(report.items.find(c=>c.id==='whatsapp').clicksPer100,null);
assert.equal(summarizeChannelPerformance([]).topFrequency,null);
assert.equal(summarizeChannelPerformance([]).leadingChannel,null);
assert.equal(summarizeChannelPerformance([{id:'qr',label:'QR',visits:1,whatsappClicks:3}]).topFrequency,null);

// Datos reales de la estructura histórica de Firebase: deben seguir agrupándose.
const source='instagram';
const at=new Date('2026-11-25T14:00:00Z');
const events=[
 {type:'visit',created_at:at,brand:encodeBrandSource('',source)},
 {type:'whatsapp',created_at:at,brand:encodeBrandSource('VRC',source),product_id:'vrc-1'},
 {type:'product_open',created_at:at,brand:'VRC',product_id:'vrc-1'}
];
const data=summarizeAnalytics(events);
assert.equal(data.visits,1);
assert.equal(data.whatsappClicks,1);
assert.deepEqual(data.whatsappByBrand,[{name:'VRC',clicks:1}]);
assert.equal(summarizeChannelPerformance(data.sources).leadingChannel.id,'instagram');

// Ninguna nueva escritura o consulta, sin modificar el esquema de Firestore.
const client=readFileSync('catalog-analytics.js','utf8');
const rules=readFileSync('firestore.rules','utf8');
const summary=readFileSync('analytics-summary.js','utf8');
const admin=readFileSync('analytics-admin.js','utf8');
const html=readFileSync('estadisticas.html','utf8');
const css=readFileSync('catalog-style.css','utf8');
assert.equal((client.match(/fs\.addDoc\(/g)||[]).length,1);
assert.ok(rules.includes("request.resource.data.keys().hasOnly(['type','seconds','brand','product_id','created_at'])"));
assert.ok(summary.includes('ANALYTICS_SOURCES'));
assert.ok(admin.includes('summarizeChannelPerformance(data.sources)'));
assert.ok(admin.includes('report.topFrequency'));
assert.ok(admin.includes("row.setAttribute('role','row')"));
assert.ok(html.includes('id="analytics-channel-insight"'));
assert.ok(html.includes('puede superar 100 por cada 100 visitas'));
assert.ok(css.includes('.analytics-source-frequency'));
assert.ok(!admin.includes('.innerHTML'));
console.log('POLADENT: rendimiento comercial por canal, 20 visitas mínimas, muestras antiguas, privacidad y cotizaciones correctos.');
