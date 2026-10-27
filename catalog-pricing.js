// Cálculo exclusivo: precio en USD y equivalente en bolívares (VES) según BCV.
// bcv.today es un proveedor NO oficial; se valida su tasa y fecha antes de usarla.
export const BCV_RATE_URL='https://bcv.today/api/v1/rate.json';
export const RATE_SOURCE_URL='https://www.bcv.org.ve/';

export function cleanUSD(value){
  if(value===null||value===undefined||value==='')return null;
  const n=Number(value);
  if(!Number.isFinite(n)||n<=0||n>100000000)throw Error('El precio USD debe ser mayor que cero y válido.');
  if(Math.abs(n*100-Math.round(n*100))>0.000001)throw Error('El precio USD admite hasta dos decimales.');
  return Math.round(n*100)/100;
}
export function formatUSD(value){
  const amount=cleanUSD(value);
  return amount===null?'Sin precio':'US$ '+amount.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});
}
export function convertVES(usd,rate){
  const price=cleanUSD(usd),exchange=Number(rate);
  if(price===null||!Number.isFinite(exchange)||exchange<=0)return null;
  const total=price*exchange;
  return Number.isFinite(total)?Math.round((total+Number.EPSILON)*100)/100:null;
}
export function formatBcvRate(value){
 const n=Number(value);
 if(!Number.isFinite(n)||n<=0)throw Error('Tasa BCV inválida.');
 return n.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:6});
}
export function formatVES(value){
  return 'Bs. '+Number(value).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function venezuelaDate(now){
  // ISO calendario estable en Venezuela, no el huso horario del dispositivo del cliente.
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const values=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return values.year+'-'+values.month+'-'+values.day;
}
export function validateBcvRate(payload,now=new Date()){
  const rate=Number(payload?.USD);
  const date=String(payload?.effective_date||payload?.date||'');
  if(!Number.isFinite(rate)||rate<=0||rate>100000000)
    throw Error('La tasa BCV recibida no es válida.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z')))
    throw Error('La fecha de la tasa BCV no es válida.');
  const today=venezuelaDate(now);
  const age=Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(date+'T12:00:00Z'))/86400000);
  if(age<0||age>7)throw Error('La tasa BCV no tiene fecha de vigencia reciente. No calculamos bolívares.');
  return {usd_ves:rate,effective_date:date,provider:'BCV Today (fuente independiente)',source_url:RATE_SOURCE_URL};
}
export async function fetchBcvRate(request=fetch,now=new Date()){
  const response=await request(BCV_RATE_URL,{
    headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(9000)
  });
  if(!response.ok)throw Error('No pudimos consultar la tasa BCV.');
  return validateBcvRate(await response.json(),now);
}
