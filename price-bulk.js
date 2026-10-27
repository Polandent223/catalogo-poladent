import {parseCSV} from './bulk-import.js';
import {cleanUSD} from './catalog-pricing.js';

export function adjustedPriceUSD(original,percent,direction){
 const base=cleanUSD(original),percentage=Number(percent);
 if(base===null)throw Error('Solo se actualizan artículos que ya tienen precio USD.');
 if(!Number.isFinite(percentage)||percentage<=0||percentage>100)
   throw Error('El porcentaje debe ser mayor que 0 y máximo 100.');
 if(!['increase','decrease'].includes(direction))throw Error('Tipo de ajuste desconocido.');
 const cents=Math.round(base*100);
 const result=Math.round(cents*(direction==='increase'?100+percentage:100-percentage)/100);
 if(result<=0)throw Error('El porcentaje deja el precio en cero. No se permite.');
 return cleanUSD(result/100);
}
export function previewPercentPrices(products,percent,direction,options={}){
 const brand=String(options.brand||''),status=String(options.status||'all');
 const search=String(options.query||'').trim().toLocaleLowerCase('es');
 const matched=(products||[]).filter(p=>
   (!brand||p.brand===brand)&&
   (status==='all'||p.status===status)&&
   (!search||(String(p.name||'')+' '+String(p.brand||'')).toLocaleLowerCase('es').includes(search)));
 const rows=[],errors=[];
 for(const p of matched){
   if(p.price_usd===undefined||p.price_usd===null||p.price_usd==='')continue;
   try{
     const before=cleanUSD(p.price_usd);
     const after=adjustedPriceUSD(before,percent,direction);
     if(before!==after)rows.push({id:String(p.id),name:p.name,brand:p.brand,before,after});
   }catch(error){errors.push(p.name+': '+error.message)}
 }
 return {rows,matching:matched.length,unpriced:matched.length-rows.length-errors.length,errors,
  direction,percent:Number(percent),method:'percent'};
}
export function previewCSVPrices(text,products){
 const grid=parseCSV(text);
 if(grid.length<2)throw Error('El CSV necesita encabezado y precios.');
 const header=grid.shift().map(h=>String(h||'').trim().toLowerCase().replace(/^\uFEFF/,''));
 const lookupName=['id','product_id','producto_id','source_key','codigo','sku','referencia'];
 const keyIndex=header.findIndex(k=>lookupName.includes(k));
 const valueIndex=header.findIndex(k=>['price_usd','precio_usd','precio','usd'].includes(k));
 if(keyIndex<0||valueIndex<0)throw Error('El CSV necesita columna id o source_key/codigo/sku y precio_usd.');
 const usingId=['id','product_id','producto_id'].includes(header[keyIndex]);
 const index=new Map(),ambiguous=new Set();
 for(const p of products){
   const key=String(usingId?p.id:(p.source_key||'')).trim();
   if(!key)continue;
   if(index.has(key)){ambiguous.add(key);index.delete(key);}
   else if(!ambiguous.has(key))index.set(key,p);
 }
 const rows=[],warnings=[],seen=new Set();
 for(let i=0;i<grid.length;i++){
   const line=grid[i];
   const key=String(line[keyIndex]||'').trim();
   if(!key){warnings.push('Fila '+(i+2)+': código vacío.');continue;}
   if(seen.has(key)){warnings.push('Fila '+(i+2)+': código repetido '+key);continue;}
   seen.add(key);
   if(ambiguous.has(key)){warnings.push('Fila '+(i+2)+': código ambiguo '+key);continue;}
   const p=index.get(key);
   if(!p){warnings.push('Fila '+(i+2)+': sin coincidencia exacta '+key);continue;}
   try{
     const after=cleanUSD(line[valueIndex]),before=cleanUSD(p.price_usd);
     if(after===null)throw Error('precio vacío');
     if(before!==after)rows.push({id:String(p.id),name:p.name,brand:p.brand,before,after});
   }catch(e){warnings.push('Fila '+(i+2)+': '+e.message)}
 }
 return {rows,warnings,matching:grid.length,method:'csv'};
}
