// Diagnóstico de registros DNS desde GitHub Actions (no cambia producción).
import {resolve4,resolveCname} from 'node:dns/promises';
const expected=['185.199.108.153','185.199.109.153','185.199.110.153','185.199.111.153'];
const results=await Promise.allSettled([
  resolve4('catalogopoladent.com'),
  resolveCname('www.catalogopoladent.com')
]);
const ipv4=results[0].status==='fulfilled'?results[0].value:[];
const cname=results[1].status==='fulfilled'?results[1].value:[];
const aReady=expected.every(ip=>ipv4.includes(ip))&&ipv4.every(ip=>expected.includes(ip));
const cnameReady=cname.some(host=>host.replace(/\.$/,'').toLowerCase()==='polandent223.github.io');
console.log('DNS catalogopoladent.com A:',ipv4.join(', ')||String(results[0].reason));
console.log('DNS www.catalogopoladent.com CNAME:',cname.join(', ')||String(results[1].reason));
console.log('Resultado: A='+ (aReady?'OK':'PENDIENTE') +', CNAME='+(cnameReady?'OK':'PENDIENTE'));
console.log('Confirmación DNS más reciente desde GitHub Actions; no cambia el catálogo público.');
console.log('Segunda verificación después de la corrección del registro www en Hostinger.');
if(!aReady||!cnameReady){
 console.log('::warning title=DNS en propagación::No activar el dominio hasta que GitHub detecte todos los A y CNAME.');
}
