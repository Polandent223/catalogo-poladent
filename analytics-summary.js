// Cálculos puros para historial de POLADENT; no identifica personas.
export function summarizeAnalytics(events) {
  const metrics={visits:0,productViews:0,whatsappClicks:0,activeSeconds:0,brands:[],days:[]};
  const perBrand=new Map(),perDay=new Map();
  for(const event of events){
    const kind=event.type,day=(event.created_at instanceof Date?event.created_at:new Date(event.created_at)).toISOString().slice(0,10);
    if(!perDay.has(day))perDay.set(day,{day,visits:0,whatsapp:0});
    const d=perDay.get(day);
    if(kind==='visit'){metrics.visits++;d.visits++;}
    if(kind==='engagement')metrics.activeSeconds+=Math.max(0,Math.min(60,Number(event.seconds)||0));
    if(kind==='whatsapp'){metrics.whatsappClicks++;d.whatsapp++;}
    if(kind==='product_open'){
      metrics.productViews++;
      if(event.brand)perBrand.set(event.brand,(perBrand.get(event.brand)||0)+1);
    }
  }
  metrics.averageSeconds=metrics.visits?Math.round(metrics.activeSeconds/metrics.visits):0;
  metrics.brands=[...perBrand].sort((a,b)=>b[1]-a[1]).map(([name,views])=>({name,views}));
  metrics.days=[...perDay.values()].sort((a,b)=>a.day.localeCompare(b.day));
  return metrics;
}
export function monthRange(year,month) {
  const start=new Date(year,month,1,0,0,0,0),end=new Date(year,month+1,1,0,0,0,0);
  return {start,end};
}
export function weekRange(now=new Date()) {
  return {start:new Date(now.getFullYear(),now.getMonth(),now.getDate()-6),end:new Date(now.getFullYear(),now.getMonth(),now.getDate()+1)};
}
export function formatDuration(seconds) {
  const total=Math.max(0,Math.round(Number(seconds)||0));
  return total<60?total+' s':Math.floor(total/60)+' min '+String(total%60).padStart(2,'0')+' s';
}
