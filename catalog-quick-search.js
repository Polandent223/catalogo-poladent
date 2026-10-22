// Accesos rápidos calculados a partir de nombres y descripciones reales.
// No son categorías oficiales inventadas ni escriben datos del inventario.
export const QUICK_AREAS=Object.freeze([
  {id:'endodoncia',label:'Endodoncia',terms:['endodon','lima','conducto','obturad','gutapercha','irrigad','apex','endoject','motor endo']},
  {id:'ortodoncia',label:'Ortodoncia',terms:['ortodon','bracket','arco ortodon','ligadura','tubo bucal','elastic','alicate orto','bandas']},
  {id:'instrumental',label:'Instrumental',terms:['instrument','forceps','fórceps','cureta','elevador','excavador','explorador','espátula','espatula','pinza','porta grapa','espejo dental','sonda']},
  {id:'laboratorio',label:'Laboratorio',terms:['laboratorio','yeso','mufla','cera','acrilic','acrílic','disilicato','porcelana','articulador','encerado','recortadora','prensa','mechero','pastilla']},
  {id:'equipos',label:'Equipos',terms:['equipo','lampara','lámpara','fotocurado','micromotor','motor dental','compresor','autoclave','pieza de mano','contraangulo','contraángulo','turbina','ultrasonido']},
  {id:'restauracion',label:'Restauración',terms:['resina','composite','adhesivo','bond','grabado','cemento','ionomero','ionómero','fluida','restauracion','restauración']}
]);
export function searchFold(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}
export function quickAreasForProduct(product,areas=QUICK_AREAS){
  const text=searchFold((product?.name||'')+' '+(product?.description||''));
  return areas.filter(area=>area.enabled!==false&&Array.isArray(area.terms)&&area.terms.some(term=>text.includes(searchFold(term)))).map(area=>area.id);
}
export function quickAreaCounts(products,areas=QUICK_AREAS){
  const counts=Object.fromEntries(areas.map(x=>[x.id,0]));
  for(const p of products||[]){
    if(!['available','sold_out'].includes(p.status))continue;
    for(const id of quickAreasForProduct(p,areas))counts[id]++;
  }
  return counts;
}
export function interestByArea(events,names){
  const counts=new Map();
  for(const event of events||[]){
    if(event.type!=='product_open')continue;
    const p=names.get(String(event.product_id||''));
    if(!p)continue;
    for(const id of quickAreasForProduct(p))counts.set(id,(counts.get(id)||0)+1);
  }
  return QUICK_AREAS.filter(area=>counts.has(area.id))
    .map(area=>({id:area.id,name:area.label,views:counts.get(area.id)}))
    .sort((a,b)=>b.views-a.views||a.name.localeCompare(b.name,'es'));
}
