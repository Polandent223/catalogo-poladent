// Estadísticas anónimas de POLADENT.
// No utiliza cookies, localStorage, identificadores de dispositivos, IP, teléfonos,
// contenido del mensaje ni información personal de visitantes.
// Se importa solo después de abrir el catálogo para no retrasar la portada.
const TYPES = new Set(['visit','engagement','whatsapp','product_open']);
let started=false;

export function startCatalogAnalytics() {
  if (started) return;
  started=true;
  const cfg=window.CATALOGO_FIREBASE || {};
  if (!cfg.projectId || !cfg.apiKey || !cfg.appId) return;
  // Respeta las señales del navegador para no ser rastreado.
  if(navigator.globalPrivacyControl===true || navigator.doNotTrack==='1')return;

  let warned=false;
  const firestore=Promise.all([
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
  ]).then(([app,fs])=>{
    const application=app.getApps().find(a=>a.name==='[DEFAULT]')||app.initializeApp(cfg);
    return {db:fs.getFirestore(application),fs};
  });
  function record(type,seconds=0,brand='',product_id=''){
    if(!TYPES.has(type))return;
    // No impedir navegación ni apertura de WhatsApp por motivos de estadísticas.
    firestore.then(({db,fs})=>fs.addDoc(fs.collection(db,'catalogAnalyticsEvents'),{
      type,seconds,brand:String(brand).slice(0,80),product_id:String(product_id).slice(0,140),
      created_at:fs.serverTimestamp()
    })).catch(error=>{
      if(!warned){
        warned=true;
        console.warn('Estadísticas desactivadas: revisa las reglas de Firestore.',error?.code||error?.message);
      }
    });
  }
  record('visit');

  // Tiempo estimado en el catálogo visible; nunca cuenta pestañas ocultas.
  let last=performance.now(), pending=0;
  function flush(force=false){
    const now=performance.now();
    const elapsed=Math.max(0,Math.min(60,(now-last)/1000));
    last=now;
    if(document.visibilityState==='visible')pending+=elapsed;
    if(pending>=15 || (force&&pending>=5)){
      const whole=Math.min(60,Math.floor(pending));
      pending-=whole;
      record('engagement',whole);
    }
  }
  const timer=setInterval(()=>flush(),15000);
  document.addEventListener('visibilitychange',()=>{
    // Al ocultarse, el último intervalo visible se estima a partir del último tick.
    if(document.visibilityState==='hidden'){
      const now=performance.now();
      pending+=Math.max(0,Math.min(60,(now-last)/1000));
      last=now;
      const seconds=Math.min(60,Math.floor(pending));
      if(seconds>=5){record('engagement',seconds);pending=0;}
    } else last=performance.now();
  });
  window.addEventListener('pagehide',()=>{
    // Algunos navegadores cierran antes de que termine la escritura: dato aproximado.
    flush(true);
    clearInterval(timer);
  },{once:true});

  document.addEventListener('catalog:product-open',event=>{
    const detail=event.detail || {};
    record('product_open',0,detail.brand,detail.id);
  });
  document.addEventListener('click',event=>{
    if(!event.target.closest?.('#inquiry-whatsapp'))return;
    const id=new URLSearchParams(location.hash.replace(/^#/, '')).get('producto')||'';
    const brand=document.getElementById('detail-brand')?.textContent||'';
    record('whatsapp',0,brand,id);
  },{capture:true});
}
