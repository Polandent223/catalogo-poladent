// Verificaciones locales. No se conecta a Firebase ni cambia documentos.
export const BACKUP_COLLECTIONS=Object.freeze(['catalogProducts','catalogPublic','catalogAnalyticsEvents']);
export function backupCounts(collections){
  const counts={};
  for(const name of BACKUP_COLLECTIONS){
    if(!Array.isArray(collections?.[name]))throw Error('Falta la colección '+name);
    counts[name]=collections[name].length;
  }
  return counts;
}
export function verifyBackupStructure(data){
  if(data?.metadata?.format!=='POLADENT_FIRESTORE_TYPED_JSON_V1')
    throw Error('Formato de respaldo inesperado.');
  if(typeof data.metadata.project_id!=='string'||!data.metadata.project_id)
    throw Error('Falta el proyecto Firebase.');
  if(typeof data.metadata.sha256_collections!=='string'||
      !/^[0-9a-f]{64}$/.test(data.metadata.sha256_collections))
    throw Error('Falta el código de integridad SHA-256.');
  const counts=backupCounts(data.collections);
  for(const name of BACKUP_COLLECTIONS){
    if(data.metadata.counts?.[name]!==counts[name])
      throw Error('Conteo incorrecto de documentos en '+name);
    const seen=new Set();
    for(const doc of data.collections[name]){
      if(typeof doc?.name!=='string'||!doc.name.includes('/documents/'+name+'/'))
        throw Error('Ruta de documento inesperada en '+name);
      if(!doc.fields||typeof doc.fields!=='object'||Array.isArray(doc.fields))
        throw Error('Campos inválidos en '+name);
      if(seen.has(doc.name))throw Error('Documento duplicado en '+name);
      seen.add(doc.name);
    }
  }
  return true;
}
