// Únicamente perfiles oficiales HTTPS de Instagram; no publicaciones ni redirecciones.
export const INSTAGRAM_MAX_PROFILES=8;
const reserved=new Set(['p','reel','reels','stories','explore','direct','accounts','about','legal','privacy','terms','api','tv']);
export function instagramProfileURL(value){
 let url;
 try{url=new URL(String(value??'').trim());}catch{return '';}
 if(url.protocol!=='https:'||!['instagram.com','www.instagram.com'].includes(url.hostname.toLowerCase())||
    url.username||url.password||url.port)return '';
 const match=url.pathname.match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
 if(!match||reserved.has(match[1].toLowerCase()))return '';
 return 'https://www.instagram.com/'+match[1]+'/';
}
export function normalizeInstagramProfiles(value,strict=false){
 if(!Array.isArray(value)){if(strict)throw Error('Lista de Instagram inválida.');return [];}
 if(strict&&value.length>INSTAGRAM_MAX_PROFILES)throw Error('Puedes agregar hasta 8 cuentas de Instagram.');
 const result=[],seen=new Set();
 for(const item of value.slice(0,INSTAGRAM_MAX_PROFILES)){
  const label=typeof item?.label==='string'?item.label.trim():'';
  const url=instagramProfileURL(item?.url);
  if(!label||label.length>55||!url){
   if(strict)throw Error('Escribe un nombre de hasta 55 caracteres y una URL HTTPS de perfil de Instagram.');
   continue;
  }
  if(seen.has(url.toLowerCase())){if(strict)throw Error('Perfil de Instagram repetido.');continue;}
  seen.add(url.toLowerCase());result.push({label,url,enabled:item.enabled!==false});
 }
 return result;
}
