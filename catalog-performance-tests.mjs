import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=async name=>import('data:text/javascript;base64,'+
  Buffer.from(readFileSync(new URL('./'+name,import.meta.url),'utf8')).toString('base64'));
const {parseCatalogDocuments,loadPublicCatalog,decodeFirestoreValue}=await load('catalog-public-data.js');
const {cloudinaryImage,setCardImage}=await load('catalog-images.js');
const str=x=>({stringValue:x}), integer=x=>({integerValue:String(x)});
const product=(id,name,brand,status,extra={})=>({
  name:'projects/test/databases/(default)/documents/catalogPublic/'+id,
  fields:{name:str(name),brand:str(brand),status:str(status),image_url:str('https://res.cloudinary.com/pewsdgm5/image/upload/v1/products/'+id+'.webp'),...extra}
});
const all=[
  product('z','Prensa Fácil','VRC','available',{sort_order:integer(2)}),
  product('x','Inyectores','ADALTA','available',{sort_order:integer(5)}),
  product('hide','Invisible','VRC','hidden'),
  product('gone','Removed','VRC','deleted'),
  {name:'projects/test/databases/(default)/documents/catalogPublic/_catalog_state',fields:{enabled:{booleanValue:true}}},
  {name:'projects/test/databases/(default)/documents/catalogPublic/_catalog_contacts',fields:{
    kind:str('contact_settings'),contacts:{arrayValue:{values:[
      {mapValue:{fields:{label:str('Valencia'),phone:str('584121234567')}}},
      {mapValue:{fields:{label:str('Invalid'),phone:str('0')}}}
    ]}}}},
  {name:'projects/test/databases/(default)/documents/catalogPublic/brand-vrc',fields:{
    kind:str('brand_profile'),name:str('VRC'),tagline:str('Equipos para laboratorio'),sort_order:integer(1)}}];
const parsed=parseCatalogDocuments(all);
assert.equal(parsed.products.length,2);
assert.equal(parsed.products[0].brand,'ADALTA');
assert.equal(parsed.products[1].name,'Prensa Fácil');
assert.equal(parsed.hasCatalogState,true);
assert.deepEqual(parsed.contacts,[{label:'Valencia',phone:'584121234567'}]);
assert.equal(parsed.profiles.length,1);
assert.equal(parsed.profiles[0].name,'VRC');
assert.deepEqual(decodeFirestoreValue({arrayValue:{values:[str('a'),integer(3)]}}),['a',3]);
let calls=0;
const fakeFetch=async(url,options)=>{
  assert.ok(url.includes('catalogPublic'));
  assert.equal(options.cache,'no-store');
  calls++;
  return {ok:true,json:async()=>calls===1?{documents:all.slice(0,3),nextPageToken:'next'}:{documents:all.slice(3)}};
};
const multi=await loadPublicCatalog({projectId:'catalogo-poladent',apiKey:'public-key'},fakeFetch);
assert.equal(calls,2);
assert.equal(multi.products.length,2);
assert.equal(multi.contacts.length,1);
await assert.rejects(()=>loadPublicCatalog({projectId:'catalogo-poladent',apiKey:'public-key'},async()=>({ok:false,status:403})),/403/);
const original='https://res.cloudinary.com/pewsdgm5/image/upload/v1792/poladent-catalogo/abc.webp';
const thumb=cloudinaryImage(original,720);
assert.ok(thumb.includes('/f_auto,q_auto,c_limit,w_720/'));
assert.ok(thumb.includes('/v1792/poladent-catalogo/abc.webp'));
assert.equal(cloudinaryImage('https://example.com/a.webp',720),'https://example.com/a.webp');
assert.equal(cloudinaryImage('javascript:alert(1)',720),'javascript:alert(1)');
const img={};
setCardImage(img,original,0);
assert.equal(img.loading,'eager');
assert.equal(img.fetchPriority,'high');
assert.equal(img.width,720);
assert.ok(img.srcset.includes('360w'));
const later={};setCardImage(later,original,5);assert.equal(later.loading,'lazy');
const publicCode=readFileSync(new URL('./public-catalog.js',import.meta.url),'utf8');
assert.ok(!publicCode.includes("from './catalog-service.js'"),'La página pública no debe cargar el SDK privado');
assert.ok(publicCode.includes('loadPublicCatalog(cfg)'));
assert.ok(publicCode.includes('shareIds.has(String(p.id))'));
assert.ok(publicCode.includes('whatsappInquiryURL('));
assert.ok(publicCode.includes('appendCards(filtered.slice(previous,limit),previous)'));
console.log('Rendimiento del catálogo: pruebas automáticas aprobadas.');
