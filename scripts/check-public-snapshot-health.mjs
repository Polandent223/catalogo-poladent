// Alerta de mantenimiento para GitHub Actions, sin cambiar el catálogo público.
// Los precios se marcan como referenciales desde cuatro horas; la disponibilidad
// no se confirma tras doce horas. No prometer que el código oculta los USD.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validatePublicSnapshot} from '../catalog-public-snapshot.js';

export const ALERT_AGE_MS=9*60*60*1000;
export function inspectPublicSnapshotHealth(snapshot,now=Date.now()){
  const checked=validatePublicSnapshot(snapshot,now);
  const captured=Date.parse(snapshot.captured_at);
  const age=now-captured;
  if(age<0)throw Error('La fecha de captura es posterior a la fecha actual.');
  if(snapshot.pricingEnabled===true){
    const priced=snapshot.products.filter(p=>Number.isFinite(Number(p.price_usd))&&Number(p.price_usd)>0).length;
    if(!priced)throw Error('Los precios están activados pero no hay ningún USD publicado.');
    if(age>=ALERT_AGE_MS)throw Error('La última captura tiene '+Math.floor(age/60000)+
      ' minutos: la disponibilidad dejará de verificarse a las doce horas; los USD serán referenciales. Revisar sincronización.');
  }
  return {ageMinutes:Math.floor(age/60000),publicProducts:checked.products.length,
    pricingEnabled:checked.pricingEnabled,pricedProducts:snapshot.products.filter(p=>
      Number.isFinite(Number(p.price_usd))&&Number(p.price_usd)>0).length};
}
const own=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(own){
  try{
    const data=JSON.parse(readFileSync('catalog-public-snapshot.json','utf8'));
    console.log('POLADENT: verificación de publicación',JSON.stringify(inspectPublicSnapshotHealth(data)));
  }catch(error){
    console.error('::error title=POLADENT: sincronización atrasada::'+error.message);
    process.exitCode=1;
  }
}
