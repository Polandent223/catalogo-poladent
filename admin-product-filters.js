// Filtros de la lista privada: solo lectura; no modifican disponibilidad ni Firestore.
export const ADMIN_PRODUCT_STATUSES=Object.freeze(['all','available','sold_out','hidden']);

export function filterAdminProducts(products,query='',status='all'){
  const needle=String(query??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('es');
  const selected=ADMIN_PRODUCT_STATUSES.includes(status)?status:'all';
  return (Array.isArray(products)?products:[]).filter(product=>{
    if(selected!=='all'&&product.status!==selected)return false;
    const searchable=String(product.name||'')+' '+String(product.brand||'');
    return searchable.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').includes(needle);
  });
}
