import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {brandKey,collectBrandRows,planBrandRename} from './brand-management.js';

const products=[
  {id:'one',name:'Recortadora de yeso',brand:'Equipos Variados',status:'available',image_url:'https://example.org/1.jpg'},
  {id:'two',name:'Micromotor',brand:'equipos variados',status:'sold_out',image_url:'https://example.org/2.jpg'},
  {id:'three',name:'Perforador de modelos',brand:'Equipos Variados',status:'hidden',image_url:'https://example.org/3.jpg'},
  {id:'four',name:'Adhesivo',brand:'EASYINSMILE',status:'available',image_url:'https://example.org/4.jpg'},
  {id:'five',name:'Turbina',brand:'IMODONTO',status:'available',image_url:'https://example.org/5.jpg'},
  {id:'cleanup',kind:'image_cleanup',name:'Elemento interno',brand:'MARCA FALSA',status:'available'},
  {id:'_catalog_state',type:'catalog_state',kind:'catalog_state'}
];
const profiles=[
  {id:'brand-easy',name:'EASYINSMILE',tagline:'Calidad',logo_url:'https://example.org/logo.jpg'},
  {id:'brand-imodonto',name:'IMODONTO',sort_order:2}
];
assert.equal(brandKey('  EQUIPOS   VARIADOS '),'equipos variados');
assert.equal(brandKey('Précision'),'precision');
assert.equal(brandKey(null),'');
const rows=collectBrandRows(products,profiles);
assert.equal(rows.length,3,'Las marcas nuevas en productos deben aparecer automáticamente');
const varied=rows.find(p=>brandKey(p.name)==='equipos variados');
assert.ok(varied);
assert.equal(varied.configured,false);
assert.equal(varied.id,null);
assert.equal(varied.productCount,3,'Incluir agotados y ocultos en el recuento');
const easy=rows.find(p=>p.name==='EASYINSMILE');
assert.equal(easy.configured,true);
assert.equal(easy.productCount,1);
assert.equal(easy.logo_url,profiles[0].logo_url);
assert.ok(!rows.some(p=>p.name==='MARCA FALSA'));

let plan=planBrandRename('Equipos Variados','Equipos de laboratorio',products,profiles);
assert.deepEqual(plan.products.map(p=>p.id),['one','two','three']);
assert.equal(plan.operations,7,'2 presentaciones + 2 fichas públicas + 1 oculta privada');
assert.equal(plan.renameRequired,true);
assert.equal(plan.products[0].image_url,'https://example.org/1.jpg','No editar fotos');
plan=planBrandRename('Equipos Variados','EQUIPOS VARIADOS',products,profiles);
assert.equal(plan.products.length,3,'Normalizar variantes de mayúsculas con mismo nombre');
assert.equal(plan.renameRequired,true);
assert.throws(()=>planBrandRename('Equipos Variados','EASYINSMILE',products,profiles),/presentación/);
assert.throws(()=>planBrandRename('Equipos Variados','IMODONTO',products,[]),/productos registrados/);
assert.throws(()=>planBrandRename('Equipos Variados','',products,profiles),/marca válida/);
assert.throws(()=>planBrandRename('Equipos Variados','N'.repeat(81),products,profiles),/hasta 80/);
assert.throws(()=>planBrandRename('Equipos Variados','Nuevo',products,
  [{id:'duplicate',name:'Equipos Variados'}]),/varias presentaciones/);
assert.throws(()=>planBrandRename('Equipos Variados','Nuevo',
  [...products,{id:'bad',name:'Roto',brand:'Equipos Variados',status:'archived'}],profiles),/estado inesperado/);
const huge=Array.from({length:225},(_,i)=>({
  id:'bulk-'+i,name:'Equipo '+i,brand:'Lote',status:'available'
}));
assert.throws(()=>planBrandRename('Lote','Lote corregido',huge,[]),/demasiados productos/);
const justWithin=Array.from({length:224},(_,i)=>({
  id:'bulk-'+i,name:'Equipo '+i,brand:'Lote',status:'available'
}));
assert.equal(planBrandRename('Lote','Nuevo nombre',justWithin,[]).operations,450);

const view=readFileSync('brand-admin.js','utf8');
const page=readFileSync('marcas.html','utf8');
const service=readFileSync('catalog-service.js','utf8');
const firebase=readFileSync('firebase-client.js','utf8');
assert.ok(view.includes('collectBrandRows(products,profiles)'));
assert.ok(view.includes("' sin presentación configurada."));
assert.ok(view.includes('Configurar / corregir'));
assert.ok(view.includes('planBrandRename(editing.name,name,products,profiles,editing.id||null)'));
assert.ok(view.includes("confirm(prompt)"),'El cambio de nombre requiere aprobación explícita');
assert.ok(view.includes("saveBrand(editing?.id,info,editing?.name||'')"));
assert.ok(page.includes('id="brand-total"'));
assert.ok(page.includes('Las marcas que escribas en productos o importaciones aparecerán automáticamente'));
assert.ok(service.includes('client.saveBrand(id, body, originalName)'));
assert.ok(firebase.includes("import {brandKey,planBrandRename} from './brand-management.js';"));
assert.ok(firebase.includes("if (original !== name)"),'No modificar productos al cambiar solo el logotipo');
assert.ok(firebase.includes("batch.update(doc(db, 'catalogProducts', product.id), { brand:name });"));
assert.ok(firebase.includes("batch.update(doc(db, 'catalogPublic', product.id), { brand:name });"));
assert.ok(firebase.includes("if (product.status === 'available' || product.status === 'sold_out')"));
assert.ok(firebase.includes('await batch.commit()'),'Renombrado y perfil deben ser atómicos');
const renameFunction=firebase.slice(firebase.indexOf('export async function saveBrand'),firebase.indexOf('// Una sola consulta al inventario'));
assert.ok(!renameFunction.includes('batch.delete('));
assert.ok(!renameFunction.includes('deleteDoc('));
assert.ok(!renameFunction.includes('removeImage('));
assert.ok(!renameFunction.includes('image_url:product'), 'No reescribir imágenes del inventario');
assert.ok(renameFunction.includes("saved.data().kind !== 'brand_profile'"));
assert.ok(renameFunction.includes("sourceName = ''"));
console.log('Marcas POLADENT: descubrimiento desde productos y corrección global segura correctos.');
