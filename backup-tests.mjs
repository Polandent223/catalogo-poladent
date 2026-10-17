import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {backupCounts,verifyBackupStructure,BACKUP_COLLECTIONS} from './backup-utils.js';
const mk=(name,id,fields={kind:{stringValue:'test'}})=>({
  name:'projects/catalogo-poladent/databases/(default)/documents/'+name+'/'+id,
  fields
});
const collections={
  catalogProducts:[mk('catalogProducts','p1'),mk('catalogProducts','_catalog_contacts',{welcome_enabled:{booleanValue:true},contacts:{arrayValue:{values:[]}}})],
  catalogPublic:[mk('catalogPublic','p1')],
  catalogAnalyticsEvents:[mk('catalogAnalyticsEvents','event-1',{type:{stringValue:'visit'},created_at:{timestampValue:'2026-10-17T12:00:00Z'}})]
};
const counts=backupCounts(collections);
assert.deepEqual(counts,{catalogProducts:2,catalogPublic:1,catalogAnalyticsEvents:1});
const backup={metadata:{
  format:'POLADENT_FIRESTORE_TYPED_JSON_V1',
  project_id:'catalogo-poladent',
  sha256_collections:'a'.repeat(64),
  counts
},collections};
assert.equal(verifyBackupStructure(backup),true);
assert.equal(verifyBackupStructure(JSON.parse(JSON.stringify(backup))),true);
assert.throws(()=>verifyBackupStructure({...backup,metadata:{...backup.metadata,counts:{...counts,catalogProducts:4}}}),/Conteo incorrecto/);
assert.throws(()=>verifyBackupStructure({...backup,collections:{...collections,catalogPublic:[mk('catalogPublic','p1'),mk('catalogPublic','p1')]}}),/Conteo incorrecto/);
const repeated={...backup,metadata:{...backup.metadata,counts:{...counts,catalogPublic:2}},
  collections:{...collections,catalogPublic:[mk('catalogPublic','p1'),mk('catalogPublic','p1')]}};
assert.throws(()=>verifyBackupStructure(repeated),/duplicado/i);
assert.throws(()=>verifyBackupStructure({...backup,collections:{...collections,catalogProducts:[]}}),/Conteo incorrecto/);
assert.throws(()=>verifyBackupStructure({...backup,metadata:{...backup.metadata,sha256_collections:'invalid'}}),/SHA-256/);
assert.throws(()=>verifyBackupStructure({...backup,collections:{...collections,catalogAnalyticsEvents:undefined}}),/Falta la colección/);
const code=readFileSync('backup-admin.js','utf8');
assert.ok(code.includes('await adminCheck()'));
assert.ok(code.includes('getIdToken()'));
assert.ok(code.includes("Authorization:'Bearer '+token"));
assert.ok(code.includes("cache:'no-store'"));
assert.ok(code.includes("!pageToken){completed=true;break;}"));
assert.ok(code.includes("if(!completed)throw Error("));
assert.ok(code.includes("await hash(JSON.stringify(saved.collections))"));
assert.ok(code.includes('verifyBackupStructure(saved)'));
assert.ok(code.includes('new Blob([contents]'));
assert.ok(code.includes("const COLLECTIONS=['catalogProducts','catalogPublic','catalogAnalyticsEvents']"));
assert.ok(!code.includes('deleteDoc('));
assert.ok(!code.includes('setDoc('));
assert.ok(!code.includes('updateDoc('));
const panel=readFileSync('respaldo.html','utf8');
assert.ok(panel.includes('noindex,nofollow'));
assert.ok(panel.includes('No incluye:'));
assert.ok(panel.includes('id="backup-download"'));
const admin=readFileSync('admin.html','utf8');
assert.ok(admin.includes('href="respaldo.html"'));
assert.deepEqual([...BACKUP_COLLECTIONS],['catalogProducts','catalogPublic','catalogAnalyticsEvents']);
console.log('Respaldo POLADENT: lectura privada, tipos, integridad y no eliminación verificados.');
