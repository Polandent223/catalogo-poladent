// Rendimiento de campañas POLADENT, calculado sólo con eventos existentes.
// Un clic NO representa una venta, ni una persona distinta.
// Se compara la frecuencia de clics sobre APERTURAS del catálogo, no
// conversiones únicas ni visitantes que cerraron la portada sin entrar.
export function clicksPer100Visits(visits,clicks){
  const v=Number(visits),c=Number(clicks);
  if(!Number.isFinite(v)||!Number.isFinite(c)||v<=0||c<0)return null;
  return Math.round((c/v)*1000)/10;
}
export function summarizeChannelPerformance(channels){
  const items=(Array.isArray(channels)?channels:[]).map(c=>({
    id:String(c.id||''),label:String(c.label||''),
    visits:Math.max(0,Math.trunc(Number(c.visits)||0)),
    whatsappClicks:Math.max(0,Math.trunc(Number(c.whatsappClicks)||0)),
    clicksPer100:clicksPer100Visits(c.visits,c.whatsappClicks)
  }));
  const identifiable=items.filter(x=>x.id!=='sin_identificar');
  const ordered=[...items].sort((a,b)=>b.whatsappClicks-a.whatsappClicks
    ||b.visits-a.visits||a.label.localeCompare(b.label,'es'));
  const leadingChannel=identifiable.filter(x=>x.whatsappClicks>0)
    .sort((a,b)=>b.whatsappClicks-a.whatsappClicks||b.visits-a.visits)[0]||null;
  // Sólo proponer una comparación de eficiencia con una base mínima.
  // No afirmar que representa ventas o contactos únicos.
  const comparable=identifiable.filter(x=>x.visits>=20);
  const topFrequency=[...comparable].sort((a,b)=>b.clicksPer100-a.clicksPer100
    ||b.whatsappClicks-a.whatsappClicks)[0]||null;
  const totalVisits=items.reduce((sum,c)=>sum+c.visits,0);
  const unknownVisits=items.find(x=>x.id==='sin_identificar')?.visits||0;
  return {items:ordered,leadingChannel,topFrequency,
    taggedVisits:totalVisits-unknownVisits,totalVisits,unknownVisits};
}
