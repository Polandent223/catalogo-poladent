// Reúne marcas escritas en productos y sus presentaciones opcionales.
// No modifica documentos; los planes de renombrado se validan antes de escribir.
export function brandKey(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ').trim().toLocaleLowerCase('es');
}

function isProduct(p) {
  return p && !p.kind && p.id && p.name && typeof p.brand==='string' && brandKey(p.brand);
}

export function collectBrandRows(products, profiles) {
  const groups = new Map();
  for (const p of products) {
    if (!isProduct(p)) continue;
    const key = brandKey(p.brand);
    if (!groups.has(key)) groups.set(key,{name:p.brand.trim(),count:0});
    groups.get(key).count++;
  }
  const configured = new Set();
  const rows = [];
  for (const p of profiles) {
    if (!p?.id || !brandKey(p.name)) continue;
    const key = brandKey(p.name);
    configured.add(key);
    rows.push({...p,configured:true,productCount:groups.get(key)?.count||0});
  }
  for (const [key,group] of groups) {
    if (!configured.has(key)) rows.push({
      id:null,name:group.name,tagline:'',description:'',sort_order:0,
      configured:false,productCount:group.count
    });
  }
  return rows.sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0) ||
    String(a.name).localeCompare(String(b.name),'es'));
}

export function planBrandRename(oldName, newName, products, profiles, currentId=null) {
  const original=String(oldName||'').trim(),next=String(newName||'').trim();
  if (!original || !next || next.length>80) throw Error('Indica una marca válida de hasta 80 caracteres.');
  const oldKey=brandKey(original),newKey=brandKey(next);
  if (!oldKey || !newKey) throw Error('El nombre de la marca es inválido.');
  const otherProfiles=profiles.filter(p=>p.id!==currentId);
  if (otherProfiles.some(p=>brandKey(p.name)===newKey))
    throw Error('El nombre indicado ya pertenece a otra presentación de marca. No se fusionarán marcas automáticamente.');
  if (oldKey!==newKey &&
      products.some(p=>isProduct(p)&&brandKey(p.brand)===newKey))
    throw Error('Ya hay productos registrados bajo ese nombre. No se mezclarán dos marcas automáticamente.');
  const matches=products.filter(p=>isProduct(p)&&brandKey(p.brand)===oldKey);
  // Un lote atómico permite actualizar ambos espejos y la presentación sin
  // guardar marcas parcialmente corregidas. Firestore permite 500 operaciones.
  const operations=2+matches.reduce((n,p)=>n+(p.status==='hidden'?1:2),0);
  if (operations>450)
    throw Error('Esta marca tiene demasiados productos para cambiar todos en una sola operación segura. No se modificó nada.');
  return {products:matches, operations,renameRequired:original!==next || matches.some(p=>p.brand!==next)};
}
