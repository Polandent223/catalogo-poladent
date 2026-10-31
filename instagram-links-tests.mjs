import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {instagramProfileURL,normalizeInstagramProfiles,INSTAGRAM_MAX_PROFILES} from './instagram-links.js';
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
assert.equal(INSTAGRAM_MAX_PROFILES,8);
assert.equal(instagramProfileURL('https://instagram.com/Poladent_Valencia/?igsh=abc'),
 'https://www.instagram.com/Poladent_Valencia/');
for(const input of [
 'http://instagram.com/poladent','https://instagram.com.evil.tld/poladent',
 'https://evil.tld/poladent','javascript:alert(1)','https://instagram.com/p/abc',
 'https://instagram.com/reel/abc','https://instagram.com/explore/',
 'https://instagram.com/direct/inbox','https://a@instagram.com/juan',
 'https://instagram.com/','https://instagram.com/usuario/otra','https://instagram.com:4433/juan'
])assert.equal(instagramProfileURL(input),'','Rechazar URL sospechosa: '+input);
const accounts=[
 {label:'Valencia',url:'https://instagram.com/valencia/',enabled:true},
 {label:'Maracay',url:'https://www.instagram.com/maracay/',enabled:false}
];
assert.deepEqual(normalizeInstagramProfiles(accounts,true),[
 {label:'Valencia',url:'https://www.instagram.com/valencia/',enabled:true},
 {label:'Maracay',url:'https://www.instagram.com/maracay/',enabled:false}
]);
assert.throws(()=>normalizeInstagramProfiles([...accounts,accounts[0]],true),/repetido/i);
assert.throws(()=>normalizeInstagramProfiles(Array.from({length:9},(_,i)=>({
 label:'Sede '+i,url:'https://instagram.com/sede'+i+'/'})),true),/hasta 8/i);
assert.throws(()=>normalizeInstagramProfiles([{label:'Sitio',url:'https://evil.com/x'}],true));
assert.equal(normalizeInstagramProfiles([{label:'Sitio',url:'https://evil.com/x'}]).length,0);
const firebase=read('firebase-client.js');
assert.ok(firebase.includes('export async function saveInstagramProfiles('));
assert.ok(firebase.includes('instagram_profiles:cleaned'));
assert.ok(firebase.includes('markCatalogActive(batch)'));
assert.ok(firebase.includes("batch.set(doc(db,'catalogProducts',CONTACTS_DOC),data,{merge:true})"));
assert.ok(firebase.includes("batch.set(doc(db,'catalogPublic',CONTACTS_DOC),data,{merge:true})"));
assert.ok(read('catalog-public-data.js').includes('normalizeInstagramProfiles(data.instagram_profiles)'));
assert.ok(read('scripts/create-public-snapshot.mjs').includes('instagramProfiles:normalizeInstagramProfiles(data.instagramProfiles)'));
assert.ok(read('catalog-public-snapshot.js').includes('normalizeInstagramProfiles(value.instagramProfiles)'));
const script=read('public-catalog.js');
assert.ok(script.includes('renderInstagramProfiles(premium)'));
assert.ok(script.includes('normalizeInstagramProfiles(instagramProfiles).filter(p=>p.enabled)'));
assert.ok(script.includes("link.rel='noopener noreferrer'"));
const html=read('index.html');
for(const id of ['storefront-instagram','instagram-social','instagram-social-list','footer-instagram']){
 assert.ok(html.includes('id="'+id+'"'),id);
}
const admin=read('instagram-admin.js'),form=read('instagram.html');
assert.ok(admin.includes('saveInstagramProfiles(profiles)'));
assert.ok(form.includes('id="instagram-workspace"'));
assert.ok(read('admin.html').includes('href="instagram.html"'));
assert.ok(!read('firestore.rules').includes('allow write: if true'));
console.log('POLADENT Instagram: HTTPS, perfiles múltiples, edición, copia pública y WhatsApp conservados.');
