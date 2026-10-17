import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createEventGate,isRealWhatsAppClick} from './analytics-quality.js';

let time=10000;
const allow=createEventGate(()=>time);
assert.equal(allow('visit'),true);
assert.equal(allow('visit'),false,'No duplicar entradas en la misma vista');
assert.equal(allow('product_open','VRC','p1'),true);
assert.equal(allow('product_open','VRC','p1'),false,'No duplicar aperturas rápidas');
assert.equal(allow('product_open','VRC','p2'),true,'Otro producto sí cuenta');
time+=1600;
assert.equal(allow('product_open','VRC','p1'),true);
assert.equal(allow('whatsapp','VRC','p1'),true);
assert.equal(allow('whatsapp','VRC','p1'),false,'No duplicar múltiples clics inmediatos');
assert.equal(allow('whatsapp','VRC','p2'),true);
time+=4100;
assert.equal(allow('whatsapp','VRC','p1'),true);
assert.equal(allow('engagement'),true);
assert.equal(allow('engagement'),true);
assert.equal(allow('unknown'),false);

const link={href:'https://wa.me/584121234567?text=Hola%20POLADENT'};
assert.equal(isRealWhatsAppClick({isTrusted:true},link),true);
assert.equal(isRealWhatsAppClick({isTrusted:false},link),false,'Los clics automáticos no se registran');
assert.equal(isRealWhatsAppClick({isTrusted:true},{href:'https://evil.example/?text=hi'}),false);
assert.equal(isRealWhatsAppClick({isTrusted:true},{href:'https://wa.me/invalid?text=hi'}),false);
assert.equal(isRealWhatsAppClick({isTrusted:true},{href:'https://wa.me/584121234567'}),false);
const collector=readFileSync('catalog-analytics.js','utf8');
assert.ok(collector.includes('createEventGate()'));
assert.ok(collector.includes('isRealWhatsAppClick(event,link)'));
assert.ok(collector.includes('navigator.doNotTrack'));
assert.ok(!collector.includes('deleteDoc('));
assert.ok(!collector.includes('localStorage.setItem'));
const rules=readFileSync('firestore.rules','utf8');
assert.ok(rules.includes('allow get, list: if isAdmin()'));
assert.ok(rules.includes('allow update, delete: if false;'));

const html=readFileSync('index.html','utf8');
const need=[
  '<link rel="canonical" href="https://polandent223.github.io/catalogo-poladent/">',
  '<meta property="og:site_name" content="POLADENT Casa Dental">',
  '<meta property="og:type" content="website">',
  '<meta name="description"',
  'https://schema.org',
  'href="aviso-estadisticas.html"'
];
for(const x of need)assert.ok(html.includes(x),'Falta metadato: '+x);
assert.ok(!html.includes('noindex'), 'No bloquear página comercial principal');
const sitemap=readFileSync('sitemap.xml','utf8');
assert.ok(sitemap.includes('https://polandent223.github.io/catalogo-poladent/'));
assert.ok(sitemap.includes('https://polandent223.github.io/catalogo-poladent/adalta.html'));
assert.ok(!sitemap.includes('admin.html'));
assert.ok(!sitemap.includes('respaldo.html'));
assert.ok(!sitemap.includes('/share/'), 'Las fichas de vista previa tienen noindex y redirección');
const robots=readFileSync('robots.txt','utf8');
assert.ok(robots.includes('Disallow: /catalogo-poladent/estadisticas.html'));
assert.ok(robots.includes('Disallow: /catalogo-poladent/respaldo.html'));
assert.ok(robots.includes('Sitemap: https://polandent223.github.io/catalogo-poladent/sitemap.xml'));
const notice=readFileSync('aviso-estadisticas.html','utf8');
assert.ok(notice.includes('Global Privacy Control'));
assert.ok(notice.includes('No se ha establecido un plazo de eliminación automático.'));
assert.ok(notice.includes('noindex,follow'));
const dashboard=readFileSync('estadisticas.html','utf8');
assert.ok(dashboard.includes('metric-whatsapp'),'No alterar el panel actual');
const mobile=readFileSync('welcome.js','utf8');
assert.ok(mobile.includes('welcome_mobile_image_url'), 'No alterar bienvenida móvil');
console.log('SEO básico y filtros de calidad: pruebas correctas.');
