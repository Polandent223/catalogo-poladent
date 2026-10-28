import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {shouldRefreshPublicSnapshot,syncPublicSnapshot,REFRESH_INTERVAL_MS} from './sync-public-catalog.mjs';
import {readPublicRevision} from './create-public-snapshot.mjs';
const date=Date.parse('2026-10-27T21:00:00Z');
const revision='2026-10-27T18:00:00.000Z';
assert.equal(REFRESH_INTERVAL_MS,60*60*1000,'Renovar la copia completa cada hora si no cambió nada.');
const current={schema:'poladent-public-snapshot-v1',
  captured_at:new Date(date-60*60*1000).toISOString(),source_revision:revision};
assert.equal(shouldRefreshPublicSnapshot(null,revision,date),true,'Primera publicación exige copia completa.');
assert.equal(shouldRefreshPublicSnapshot(current,revision,date),false,'No releer 255 documentos si nada cambió.');
assert.equal(shouldRefreshPublicSnapshot(current,'2026-10-27T21:00:00.000Z',date),true,
  'Cualquier cambio administrativo fuerza próxima publicación.');
assert.equal(shouldRefreshPublicSnapshot(current,revision,date+REFRESH_INTERVAL_MS),true,
  'Renovar copia tras ventana máxima sin cambios.');
assert.equal(shouldRefreshPublicSnapshot({...current,captured_at:'fecha inválida'},revision,date),true);
const marker=await readPublicRevision({projectId:'catalogo-poladent',apiKey:'publica'},async(url,options)=>{
  assert.ok(String(url).includes('catalogPublic/_catalog_state'));
  assert.equal(options.cache,'no-store');
  return {ok:true,status:200,json:async()=>({fields:{updated_at:{stringValue:revision}}})};
});
assert.equal(marker,revision);
const base=await mkdtemp(join(tmpdir(),'poladent-sync-test-'));
try{
  await writeFile(join(base,'config.js'),
    "window.CATALOGO_FIREBASE={apiKey:'public-test-key',projectId:'catalogo-poladent'};\n");
  await writeFile(join(base,'catalog-public-snapshot.json'),JSON.stringify(current));
  let requests=0;
  const response=await syncPublicSnapshot({
    root:base,now:new Date(date),
    request:async()=>{requests++;return {ok:true,status:200,json:async()=>({
      fields:{updated_at:{stringValue:revision}}})}}
  });
  assert.equal(response.updated,false);
  assert.equal(requests,1,'Comprobar un documento, NO hacer lecturas masivas ni de clientes.');
}finally{await rm(base,{recursive:true,force:true})}
// Simular la captura completa (255 productos y diseño) sin llamadas externas.
const second=await mkdtemp(join(tmpdir(),'poladent-sync-complete-'));
try{
  await writeFile(join(second,'config.js'),
    "window.CATALOGO_FIREBASE={apiKey:'public-test-key',projectId:'catalogo-poladent'};\n");
  const field=value=>{
    if(value===null)return {nullValue:null};
    if(typeof value==='boolean')return {booleanValue:value};
    if(typeof value==='number')return {doubleValue:value};
    if(typeof value==='string')return {stringValue:value};
    if(Array.isArray(value))return {arrayValue:{values:value.map(field)}};
    return {mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,field(v)]))}};
  };
  const documents=[
    {name:'catalogPublic/_catalog_state',fields:{updated_at:field(revision),type:field('catalog_state'),status:field('available')}},
    {name:'catalogPublic/_catalog_contacts',fields:Object.fromEntries(Object.entries({
      kind:'contact_settings',status:'available',
      contacts:[{label:'Valencia',phone:'584226710634'}],
      pricing:{enabled:true},welcome_enabled:true,
      welcome_image_url:'https://res.cloudinary.com/poladent/image/upload/portada.webp',
      storefront:{enabled:true,theme:'premium-compacta',banner_desktop_url:'https://res.cloudinary.com/poladent/image/upload/banner.webp',
        featured_brands:['ADALTA','DENCO']}
    }).map(([k,v])=>[k,field(v)]))},
    ...['ADALTA','DENCO','IMODONTO'].map((name,i)=>({
      name:'catalogPublic/brand_'+i,fields:Object.fromEntries(Object.entries({
        kind:'brand_profile',name,logo_url:'https://res.cloudinary.com/poladent/image/upload/'+i+'.webp'
      }).map(([k,v])=>[k,field(v)]))
    })),
    ...Array.from({length:255},(_,i)=>({
      name:'catalogPublic/item_'+i,
      fields:Object.fromEntries(Object.entries({
        name:'Producto '+i,brand:'ADALTA',status:'available',price_usd:15.5,
        image_url:'https://res.cloudinary.com/poladent/image/upload/'+i+'.webp'
      }).map(([k,v])=>[k,field(v)]))
    }))
  ];
  let collectionCalls=0,stateCalls=0;
  const fetchStub=async href=>{
    const url=new URL(href);
    if(url.pathname.endsWith('/_catalog_state')){
      stateCalls++;
      return {ok:true,status:200,json:async()=>documents[0]};
    }
    collectionCalls++;
    const page=url.searchParams.get('pageToken')||'0';
    const offset=Number(page);
    return {ok:true,status:200,json:async()=>({
      documents:documents.slice(offset,offset+200),
      nextPageToken:offset+200<documents.length?String(offset+200):''
    })};
  };
  const built=await syncPublicSnapshot({
    root:second,request:fetchStub,now:new Date(date)
  });
  assert.equal(built.updated,true);
  assert.equal(built.count,255);
  assert.equal(collectionCalls,2,'Dos páginas y no múltiples descargas redundantes.');
  assert.equal(stateCalls,3,'Comparar revision inicial, antes y después del listado.');
  const out=JSON.parse(readFileSync(join(second,'catalog-public-snapshot.json'),'utf8'));
  const welcome=JSON.parse(readFileSync(join(second,'catalog-welcome-snapshot.json'),'utf8'));
  assert.equal(out.source_revision,revision);
  assert.equal(out.storefront.banner_desktop_url,'https://res.cloudinary.com/poladent/image/upload/banner.webp');
  assert.equal(out.products[0].price_usd,15.5);
  assert.equal(welcome.welcome.enabled,true);
  assert.ok(out.products.every(p=>!('image_path' in p)), 'Nunca exportar rutas privadas.');
  const secondRun=await syncPublicSnapshot({
    root:second,request:fetchStub,now:new Date(date+60000)
  });
  assert.equal(secondRun.updated,false);
  assert.equal(collectionCalls,2,'El segundo ciclo sólo comprueba revisión de 1 documento.');
}finally{await rm(second,{recursive:true,force:true})}

const source=readFileSync('firebase-client.js','utf8');
for(const marker of [
  'markCatalogActive(batch);',
  'if(pricing.enabled)markCatalogActive(transaction);',
  "batch.set(doc(db,'catalogPublic',CONTACTS_DOC),data,{merge:true});"
])assert.ok(source.includes(marker));
const wf=readFileSync('.github/workflows/product-previews.yml','utf8');
assert.ok(wf.includes("cron: '7,17,27,37,47,57 * * * *'"));
assert.ok(wf.includes('node scripts/sync-public-catalog.mjs'));
assert.ok(wf.includes('generate-product-share.mjs --from-snapshot-only'));
assert.ok(!wf.includes('node scripts/generate-product-share.mjs;'),
  'Nunca volver a leer Firestore para imágenes compartibles por separado.');
assert.ok(wf.includes('concurrency:'));
const generator=readFileSync('scripts/create-public-snapshot.mjs','utf8');
assert.ok(generator.includes('revisionBefore!==revisionAfter'),
  'Abortar si cambió catálogo durante la captura.');
const builder=readFileSync('scripts/generate-product-share.mjs','utf8');
assert.ok(builder.includes("process.argv.includes('--from-snapshot-only')"));
assert.ok(builder.includes("Las vistas previas anteriores")||builder.includes('vistas previas anteriores'));
assert.ok(!builder.includes('await rm(join(output,name.name)'),
  'Sin borrados de páginas públicas durante sincronización.');
console.log('POLADENT: una lectura para detectar cambios, sincronización íntegra y conservación del catálogo comprobadas.');
