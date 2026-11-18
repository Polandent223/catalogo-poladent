// Comprobar únicamente CORS de preflight; sin datos personales ni tokens privados.
const worker='https://poladent-imagenes.samuel-eliuzeq-223.workers.dev/sign';
const origins=['https://polandent223.github.io','https://catalogopoladent.com','https://www.catalogopoladent.com'];
for(const origin of origins){
 try{
   const response=await fetch(worker,{method:'OPTIONS',headers:{
     Origin:origin,
     'Access-Control-Request-Method':'POST',
     'Access-Control-Request-Headers':'authorization,content-type'
   },signal:AbortSignal.timeout(9000)});
   const allow=response.headers.get('access-control-allow-origin')||'';
   const ok=response.status===204&&allow===origin;
   console.log('Worker Cloudinary '+origin+': '+(ok?'OK':'PENDIENTE')+
     ' (HTTP '+response.status+', CORS '+(allow||'sin permiso')+')');
   if(!ok)console.log('::warning title=Cloudinary requiere despliegue::Origen '+origin+
     ' no autorizado en Worker activo; publicar el cambio de CORS antes de activar dominio.');
 }catch(error){
   console.log('Worker Cloudinary '+origin+': NO VERIFICADO ('+error.message+')');
   console.log('::warning title=No se pudo comprobar Cloudinary::'+origin);
 }
}
