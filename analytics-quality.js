// Filtro local de errores de medición. No identifica a visitantes y no usa
// cookies ni almacenamiento persistente. No protege contra bots del servidor.
const WINDOWS={whatsapp:4000,product_open:1500};
const LIMITS={whatsapp:60,product_open:500};
export function createEventGate(now=()=>performance.now()){
  const recent=new Map(),counts={whatsapp:0,product_open:0};
  let visited=false;
  return function allowEvent(type,brand='',productId=''){
    if(type==='visit'){
      if(visited)return false;
      visited=true;
      return true;
    }
    if(type==='engagement')return true;
    if(!(type in WINDOWS))return false;
    if(counts[type]>=LIMITS[type])return false;
    const key=type+'|'+String(brand)+'|'+String(productId);
    const time=Number(now());
    if(!Number.isFinite(time))return false;
    const previous=recent.get(key);
    if(previous!==undefined&&time-previous<WINDOWS[type])return false;
    recent.set(key,time);
    counts[type]+=1;
    return true;
  };
}
export function isRealWhatsAppClick(event,link){
  if(event?.isTrusted!==true||event.defaultPrevented===true||!link||!link.href)return false;
  try{
    const target=new URL(link.href);
    // Contar exclusivamente el clic humano al enlace real de consulta.
    return target.protocol==='https:'&&target.hostname==='wa.me'
      && /^\/[1-9][0-9]{7,14}$/.test(target.pathname)
      && target.searchParams.has('text');
  }catch{return false;}
}
