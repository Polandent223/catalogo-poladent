// Diagnóstico de la URL pública desde GitHub Actions (sin credenciales ni escrituras).
const urls=[
 {kind:'Dominio principal',url:'https://catalogopoladent.com/'},
 {kind:'Redirección www',url:'https://www.catalogopoladent.com/'},
 {kind:'QR anterior',url:'https://polandent223.github.io/catalogo-poladent/'},
 {kind:'Copia de precios',url:'https://catalogopoladent.com/catalog-public-snapshot.json'},
 {kind:'Administrador',url:'https://catalogopoladent.com/admin.html'}
];
let failures=0;
for(const {kind,url} of urls){
 try{
  const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(12000),headers:{'User-Agent':'POLADENT-domain-check/1.0'}});
  const final=new URL(response.url);
  const secure=final.protocol==='https:'&&final.hostname==='catalogopoladent.com';
  const root=kind==='Dominio principal'||kind==='Redirección www'||kind==='QR anterior';
  const contentType=response.headers.get('content-type')||'';
  const body=await response.text();
  const contentOk=kind==='Copia de precios'?
   contentType.includes('json')&&body.includes('poladent-public-snapshot-v1'):
   body.includes('POLADENT');
  const ok=response.ok&&secure&&contentOk;
  console.log(kind+': '+(ok?'OK':'PENDIENTE')+' HTTP '+response.status+
    ', destino '+response.url+', contenido '+(contentOk?'OK':'NO'));
  if(!ok){failures++;console.log('::warning title=Dominio necesita revisión::'+kind+' no está listo.');}
 }catch(e){failures++;console.log('::warning title=Error externo '+kind+'::'+String(e.message).slice(0,180));}
}
console.log('Resumen verificación de dominio: '+(urls.length-failures)+'/'+urls.length+' correctos');
