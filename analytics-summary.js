// Agregaciones del historial POLADENT. No hay identificadores de visitantes.
const dateKey=date=>date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');

export function summarizeAnalytics(events) {
  const metrics={
    visits:0,productViews:0,whatsappClicks:0,activeSeconds:0,
    brands:[],whatsappByBrand:[],products:[],days:[]
  };
  const perBrand=new Map(),perWhatsAppBrand=new Map(),perProduct=new Map(),perDay=new Map();
  for(const event of events){
    const date=event.created_at instanceof Date?event.created_at:new Date(event.created_at);
    if(Number.isNaN(date.getTime()))continue;
    const kind=event.type,day=dateKey(date);
    if(!perDay.has(day))perDay.set(day,{day,visits:0,whatsapp:0});
    const d=perDay.get(day), brand=String(event.brand||'').trim();
    const id=String(event.product_id||'').trim();
    if(kind==='visit'){metrics.visits++;d.visits++;}
    if(kind==='engagement')metrics.activeSeconds+=Math.max(0,Math.min(60,Number(event.seconds)||0));
    if(kind==='whatsapp'){
      metrics.whatsappClicks++;
      d.whatsapp++;
      const group=brand||'Sin marca';
      perWhatsAppBrand.set(group,(perWhatsAppBrand.get(group)||0)+1);
    }
    if(kind==='product_open'){
      metrics.productViews++;
      if(brand)perBrand.set(brand,(perBrand.get(brand)||0)+1);
    }
    if(id&&(kind==='product_open'||kind==='whatsapp')){
      if(!perProduct.has(id))perProduct.set(id,{id,brand:brand,views:0,whatsappClicks:0});
      const p=perProduct.get(id);
      if(brand&&!p.brand)p.brand=brand;
      if(kind==='product_open')p.views++;
      if(kind==='whatsapp')p.whatsappClicks++;
    }
  }
  metrics.averageSeconds=metrics.visits?Math.round(metrics.activeSeconds/metrics.visits):0;
  metrics.brands=[...perBrand].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'es'))
    .map(([name,views])=>({name,views}));
  metrics.whatsappByBrand=[...perWhatsAppBrand].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'es'))
    .map(([name,clicks])=>({name,clicks}));
  metrics.products=[...perProduct.values()].sort((a,b)=>b.views-a.views||b.whatsappClicks-a.whatsappClicks||a.id.localeCompare(b.id));
  metrics.days=[...perDay.values()].sort((a,b)=>a.day.localeCompare(b.day));
  return metrics;
}

export function monthRange(year,month) {
  return {
    start:new Date(year,month,1,0,0,0,0),
    end:new Date(year,month+1,1,0,0,0,0)
  };
}
export function weekRange(now=new Date()) {
  return {
    start:new Date(now.getFullYear(),now.getMonth(),now.getDate()-6),
    end:new Date(now.getFullYear(),now.getMonth(),now.getDate()+1)
  };
}

// Los 7 días se comparan con los 7 días inmediatamente anteriores.
// El mes actual se compara con los mismos días del mes anterior; los meses
// terminados se comparan con el mes anterior completo.
export function comparisonRanges(period,monthValue='',now=new Date()) {
  if(period==='week'){
    const current=weekRange(now);
    const previous={
      start:new Date(current.start.getFullYear(),current.start.getMonth(),current.start.getDate()-7),
      end:new Date(current.start)
    };
    return {current,previous,label:'7 días anteriores'};
  }
  const [year,month]=monthValue.split('-').map(Number);
  if(!Number.isInteger(year)||!Number.isInteger(month)||month<0||month>11){
    throw Error('Selecciona un mes válido.');
  }
  const current=monthRange(year,month);
  const previous=monthRange(year,month-1);
  const isCurrent=year===now.getFullYear()&&month===now.getMonth();
  if(isCurrent){
    current.end=new Date(year,month,now.getDate()+1);
    const lastDay=new Date(year,month,0).getDate();
    previous.end=new Date(year,month-1,Math.min(now.getDate(),lastDay)+1);
  }
  return {current,previous,label:isCurrent?'Mismos días del mes anterior':'Mes anterior completo'};
}

export function metricChange(current,previous) {
  const a=Math.max(0,Number(current)||0),b=Math.max(0,Number(previous)||0);
  if(b===0)return a===0?'Sin cambio':'Nuevo';
  const percentage=Math.round((a-b)/b*100);
  return (percentage>0?'+':'')+percentage+' %';
}
export function formatDuration(seconds) {
  const total=Math.max(0,Math.round(Number(seconds)||0));
  return total<60?total+' s':Math.floor(total/60)+' min '+String(total%60).padStart(2,'0')+' s';
}
