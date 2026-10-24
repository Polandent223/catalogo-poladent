import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./admin-product-filters.js',import.meta.url),'utf8');
const {filterAdminProducts,ADMIN_PRODUCT_STATUSES}=await import(
  'data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const products=[
  {id:'1',name:'Limas para Endodoncia',brand:'DENCO',status:'hidden'},
  {id:'2',name:'Fresa de carburo',brand:'ICE',status:'available'},
  {id:'3',name:'Motor endodóntico',brand:'DENCO',status:'sold_out'},
  {id:'4',name:'ESPÁTULA DE RESINA',brand:'ADALTA',status:'hidden'},
  {id:'5',name:'Adhesivo',brand:'ADALTA',status:'available'}
];
const ids=(q='',status='all')=>filterAdminProducts(products,q,status).map(p=>p.id);
assert.deepEqual(ADMIN_PRODUCT_STATUSES,['all','available','sold_out','hidden']);
assert.deepEqual(ids(),['1','2','3','4','5']);
assert.deepEqual(ids('','hidden'),['1','4']);
assert.deepEqual(ids('','available'),['2','5']);
assert.deepEqual(ids('','sold_out'),['3']);
assert.deepEqual(ids('DENCO','hidden'),['1']);
assert.deepEqual(ids('DENCO','available'),[]);
assert.deepEqual(ids('endodon','sold_out'),['3']);
assert.deepEqual(ids('espátula','hidden'),['4'],'La búsqueda acepta acentos.');
assert.deepEqual(ids('resina','hidden'),['4']);
assert.deepEqual(ids('ice','all'),['2']);
assert.deepEqual(ids('', 'invalid'),['1','2','3','4','5']);
assert.deepEqual(filterAdminProducts(null,'','hidden'),[]);
assert.equal(products[0].status,'hidden','Nunca cambiar la disponibilidad al filtrar.');
const html=readFileSync(new URL('./admin.html',import.meta.url),'utf8');
const admin=readFileSync(new URL('./admin.js',import.meta.url),'utf8');
const css=readFileSync(new URL('./catalog-style.css',import.meta.url),'utf8');
assert.ok(html.includes('id="admin-status-filter"'));
for(const s of ADMIN_PRODUCT_STATUSES)assert.ok(html.includes('value="'+s+'"'));
assert.ok(admin.includes('filterAdminProducts(products,query,statusFilter)'));
assert.ok(admin.includes("$('#admin-status-filter').onchange=()=>{visibleLimit=24;render()}"));
assert.ok(admin.includes('await refresh()'),'Guardar actualiza la lista respetando los filtros activos.');
assert.ok(css.includes('.admin-product-filters'));
assert.ok(css.includes('@media(max-width:850px)'));
console.log('Filtro del administrador: estados, búsqueda combinada y adaptación móvil correctos.');
