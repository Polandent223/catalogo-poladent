import {configured,login,logout,restoreSession,listAnalyticsEvents,listProducts} from './catalog-service.js';
import {summarizeAnalytics,comparisonRanges,metricChange,formatDuration} from './analytics-summary.js';
const $=q=>document.querySelector(q),message=$('#analytics-message'),months=$('#analytics-month');
function tell(text,error=false){message.textContent=text;message.className=error?'error':'';}
function monthName(date){return new Intl.DateTimeFormat('es',{month:'long',year:'numeric'}).format(date);}
const now=new Date();
for(let i=0;i<12;i++){
  const date=new Date(now.getFullYear(),now.getMonth()-i,1);
  const option=document.createElement('option');option.value=date.getFullYear()+'-'+date.getMonth();
  option.textContent=monthName(date).replace(/^./,letter=>letter.toUpperCase());months.append(option);
}
function setContent(id,text){document.getElementById(id).textContent=String(text);}
function label(text){const p=document.createElement('p');p.textContent=text;return p;}
let productsPromise=null;
// Se lee el inventario privado una sola vez por sesión del administrador.
// Los productos eliminados siguen contabilizados por su ID histórico.
function productNames(){
  if(!productsPromise)productsPromise=listProducts(true).then(items=>{
    return new Map(items.filter(p=>p.id&&p.name&&p.brand).map(p=>[String(p.id),{name:p.name,brand:p.brand}]));
  }).catch(error=>{
    console.warn('No se pudieron cargar los nombres de productos:',error?.message);
    return new Map();
  });
  return productsPromise;
}
function appendInsightRow(container,name,detail,count,labelText){
  const row=document.createElement('div');row.className='analytics-insight-row';
  const description=document.createElement('div');
  const title=document.createElement('strong');title.textContent=name;
  const subtitle=document.createElement('small');subtitle.textContent=detail;
  description.append(title,subtitle);
  const metric=document.createElement('span');metric.textContent=count+' '+labelText;
  row.append(description,metric);
  container.append(row);
}
function renderComparisons(current,previous,label){
  setContent('analytics-comparison-description',label+(label.startsWith('Mismos días')?' · Mes actual, cifras provisionales.':'.'));
  setContent('compare-visits',metricChange(current.visits,previous.visits));
  setContent('compare-whatsapp',metricChange(current.whatsappClicks,previous.whatsappClicks));
  setContent('compare-visits-values',current.visits+' visitas frente a '+previous.visits);
  setContent('compare-whatsapp-values',current.whatsappClicks+' clics frente a '+previous.whatsappClicks);
}
function renderProductInsights(data,names){
  const list=$('#analytics-products');list.replaceChildren();
  const ranked=data.products.filter(p=>p.views>0);
  if(!ranked.length){list.append(label('Todavía no hay fichas abiertas en este periodo.'));return;}
  for(const item of ranked.slice(0,12)){
    const current=names.get(item.id);
    const name=current?.name||'Producto sin ficha actual · '+item.id;
    const brand=current?.brand||item.brand||'Marca no identificada';
    appendInsightRow(list,name,brand+' · '+item.whatsappClicks+' clics a WhatsApp',item.views,'aperturas');
  }
}
function renderWhatsappByBrand(data){
  const list=$('#analytics-whatsapp-brands');list.replaceChildren();
  if(!data.whatsappByBrand.length){list.append(label('Todavía no hay clics a WhatsApp en este periodo.'));return;}
  for(const item of data.whatsappByBrand.slice(0,12)){
    appendInsightRow(list,item.name,'Consultas iniciadas',item.clicks,'clics');
  }
}
function buildChart(summary,range){
  const chart=$('#analytics-chart');chart.replaceChildren();
  // Gráfico de barras del periodo, incluidos días con cero visitas.
  const days=[],cursor=new Date(range.start);
  while(cursor<range.end&&days.length<32){
    days.push(new Date(cursor));cursor.setDate(cursor.getDate()+1);
  }
  const byDay=new Map(summary.days.map(d=>[d.day,d]));
  const max=Math.max(1,...summary.days.map(d=>d.visits));
  for(const date of days){
    const key=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
    const value=byDay.get(key)?.visits||0;
    const row=document.createElement('div');row.className='analytics-chart-row';
    const day=document.createElement('span');day.textContent=String(date.getDate()).padStart(2,'0')+'/'+String(date.getMonth()+1).padStart(2,'0');
    const track=document.createElement('div');track.className='analytics-bar-track';
    const bar=document.createElement('div');bar.className='analytics-bar';bar.style.width=(value/max*100)+'%';
    track.append(bar);
    const total=document.createElement('strong');total.textContent=value;
    row.append(day,track,total);chart.append(row);
  }
}
function render(events,range,previousEvents,comparisonLabel,names){
  const data=summarizeAnalytics(events);
  setContent('metric-visits',data.visits);
  setContent('metric-time',formatDuration(data.averageSeconds));
  setContent('metric-whatsapp',data.whatsappClicks);
  setContent('metric-products',data.productViews);
  buildChart(data,range);
  renderComparisons(data,summarizeAnalytics(previousEvents),comparisonLabel);
  renderProductInsights(data,names);
  renderWhatsappByBrand(data);
  const brands=$('#analytics-brands');brands.replaceChildren();
  if(!data.brands.length)brands.append(label('Todavía no hay productos abiertos en este periodo.'));
  for(const item of data.brands.slice(0,12)){
    const p=document.createElement('p');p.className='analytics-brand';
    const name=document.createElement('span');name.textContent=item.name;
    const views=document.createElement('strong');views.textContent=item.views+' aperturas';
    p.append(name,views);brands.append(p);
  }
}
let loading=false;
async function reload(){
  if(loading)return;
  loading=true;$('#analytics-refresh').disabled=true;
  const week=$('#analytics-period').value==='week';
  $('#analytics-month-label').hidden=week;
  const {current,previous,label:comparisonLabel}=comparisonRanges(week?'week':'month',months.value);
  setContent('analytics-heading',week?'Últimos 7 días':monthName(current.start));
  tell('Consultando historial privado de Firebase…');
  $('#analytics-period').disabled=true;
  months.disabled=true;
  try{
    // Solo en el panel privado: dos intervalos acotados y un inventario cacheado.
    const [events,priorEvents,names]=await Promise.all([
      listAnalyticsEvents(current.start,current.end),
      listAnalyticsEvents(previous.start,previous.end),
      productNames()
    ]);
    render(events,current,priorEvents,comparisonLabel,names);
    tell('Historial actualizado. '+events.length+' eventos en el periodo y '+priorEvents.length+' en la comparación.');
  }catch(error){
    tell(error?.code==='permission-denied'
      ? 'Firebase denegó la lectura: falta publicar las reglas de estadísticas en Firestore → Reglas, o la cuenta no tiene permiso de administrador.'
      : 'No se pudo consultar el historial: '+(error?.message||'Error desconocido'),true);
  }finally{loading=false;$('#analytics-refresh').disabled=false;$('#analytics-period').disabled=false;months.disabled=false;}
}
async function show(){
  $('#analytics-login').hidden=true;$('#analytics-workspace').hidden=false;
  await reload();
}
$('#analytics-login').onsubmit=async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;
  try{
    const form=new FormData(event.target);
    await login(String(form.get('email')).trim(),String(form.get('password')));
    event.target.elements.password.value='';await show();
  }catch(error){tell(error.message,true);}finally{button.disabled=false;}
};
$('#analytics-period').onchange=reload;
months.onchange=reload;
$('#analytics-refresh').onclick=reload;
$('#analytics-logout').onclick=async()=>{await logout();location.reload();};
if(!configured){$('#analytics-login').hidden=true;tell('Es necesario conectar Firebase para las estadísticas.',true);}
else restoreSession().then(ok=>{if(ok)return show();}).catch(error=>tell(error.message,true));
