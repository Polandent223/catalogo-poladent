import {loadPublicCatalog} from './catalog-public-data.js';
import {parseSummaryFragment,cartFinancials,cartTotals} from './quote-cart.js';
import {fetchBcvRate,formatUSD,formatVES} from './catalog-pricing.js';

const $=selector=>document.querySelector(selector);
const status=$('#summary-status');
function cell(row,value,label=''){
 const td=document.createElement('td');
 if(label){const s=document.createElement('strong');s.textContent=value;td.append(s);
   const sub=document.createElement('small');sub.textContent=label;td.append(sub);}
 else td.textContent=value;
 row.append(td);return td;
}
async function displaySummary(){
 const requested=parseSummaryFragment(location.hash);
 if(!requested.length){status.textContent='El enlace de solicitud está incompleto. Pide al cliente que lo genere nuevamente desde su carrito.';return;}
 try{
   const cfg=window.CATALOGO_FIREBASE||{};
   if(!cfg.projectId||!cfg.apiKey)throw Error('No está disponible el catálogo público.');
   const data=await loadPublicCatalog(cfg);
   const available=new Map(data.products.map(p=>[String(p.id),p]));
   const current=requested.filter(x=>available.has(x.id));
   const missing=requested.length-current.length;
   let rate=null;
   if(data.pricingEnabled){
     try{rate=await fetchBcvRate();}
     catch(error){console.warn('Tasa BCV no verificada para resumen:',error.message)}
   }
   const financials=cartFinancials(current,data.products,data.pricingEnabled,rate?.usd_ves??null);
   const rowsById=new Map(financials.rows.map(row=>[row.id,row]));
   const tbody=$('#summary-rows');tbody.replaceChildren();
   for(const line of requested){
     const row=document.createElement('tr');
     const p=available.get(line.id),amount=rowsById.get(line.id);
     if(!p){
       cell(row,'Producto retirado u oculto','No disponible en el catálogo público');
       cell(row,String(line.quantity));cell(row,'Por confirmar');cell(row,'Por confirmar');
     }else{
       cell(row,p.name,p.brand+(p.status==='sold_out'?' · Agotado':''));
       cell(row,String(line.quantity));
       cell(row,amount?.unitUSD!==null&&amount?.unitUSD!==undefined?formatUSD(amount.unitUSD):'Por consultar');
       const sub=cell(row,amount?.subtotalUSD!==null&&amount?.subtotalUSD!==undefined
         ?formatUSD(amount.subtotalUSD):'Por consultar');
       if(amount?.subtotalVES!==null&&amount?.subtotalVES!==undefined){
         const bs=document.createElement('small');bs.textContent=formatVES(amount.subtotalVES)+' (BCV)';
         sub.append(bs);
       }
     }
     tbody.append(row);
   }
   const units=cartTotals(requested);
   $('#summary-count').textContent=units.products+' productos · '+units.units+' unidades'+
     (missing?' · '+missing+' retirado(s) u oculto(s) desde la creación del enlace':'');
   const complete=financials.complete&&missing===0&&data.pricingEnabled;
   $('#summary-total-usd').textContent=complete?'Total estimado: '+formatUSD(financials.totalUSD)
     :'Total por confirmar con un vendedor';
   $('#summary-total-ves').textContent=complete&&financials.totalVES!==null
     ?formatVES(financials.totalVES)+' · calculado a tasa BCV'
     :data.pricingEnabled?'Equivalente en bolívares pendiente de confirmación':'Precios no publicados';
   $('#summary-rate').textContent=rate
     ?'Tipo de cambio referencial: 1 USD = '+formatVES(rate.usd_ves)+
        ' · Fecha de vigencia '+rate.effective_date+' · Proveedor independiente (verificar en BCV).'
     :'Tasa BCV no validada. No se presenta conversión estimada en bolívares.';
   $('#summary-content').hidden=false;
   status.textContent='Resumen actualizado con los productos y precios actualmente publicados en POLADENT.';
 }catch(error){
   status.textContent='No pudimos abrir el resumen. Comprueba la conexión o solicita un enlace nuevo.';
   console.warn('No fue posible consultar solicitud:',error.message);
 }
}
$('#summary-print').addEventListener('click',()=>window.print());
$('#summary-copy').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(location.href);status.textContent='Enlace de solicitud copiado.'}
 catch{status.textContent='Copia el enlace desde la barra de direcciones.'}
});
displaySummary();
