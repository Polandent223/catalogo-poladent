'use strict';
const crypto=require('node:crypto');
const admin=require('firebase-admin');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {normalizeCedula,maskedCedula,normalizeCustomerName,validateRequestedItems,
 calculateQuote,validBcvPayload}=require('./customer-core.cjs');
admin.initializeApp();
const store=admin.firestore();
const pepper=defineSecret('POLADENT_CUSTOMER_PEPPER');
const publicConfig=store.doc('catalogPublic/_catalog_contacts');
const privateConfig=store.doc('catalogProducts/_catalog_contacts');
const requireVerified=(request)=>{
 if(!request.auth?.uid||request.auth.token.email_verified!==true||
    !request.auth.token.email)throw new HttpsError('unauthenticated',
      'Verifica tu correo electrónico para acceder a tus cotizaciones.');
 return {uid:request.auth.uid,email:String(request.auth.token.email).toLowerCase()};
};
async function portalEnabled(){
 const snap=await publicConfig.get();
 return snap.exists&&snap.data()?.customer_portal?.enabled===true;
}
async function requirePortal(){
 if(!await portalEnabled())throw new HttpsError('failed-precondition',
  'Las cuentas personales todavía no están activadas en POLADENT.');
}
async function requireAdmin(request){
 if(!request.auth?.uid)throw new HttpsError('unauthenticated','Acceso de administrador requerido.');
 const record=await store.doc('catalogAdmins/'+request.auth.uid).get();
 if(!record.exists||record.data()?.active!==true)throw new HttpsError('permission-denied',
   'No tienes autorización para configurar el portal de clientes.');
}
const toSafeError=e=>{
 if(e instanceof HttpsError)return e;
 console.error('Customer portal internal error',e);
 return new HttpsError('internal','No se pudo completar la operación. Intenta de nuevo.');
};
exports.customerPortalStatus=onCall({region:'us-central1',maxInstances:20},async()=>{
 try{return {enabled:await portalEnabled()};}catch(e){throw toSafeError(e)}
});
exports.customerPortalAdminHealth=onCall({
 region:'us-central1',maxInstances:5,secrets:[pepper]
},async request=>{
 try{
   await requireAdmin(request);
   const raw=pepper.value();
   return {ready:typeof raw==='string'&&Buffer.byteLength(raw)>=32,
      enabled:await portalEnabled(),
      note:'Se requiere verificar acceso real y flujo completo antes de habilitar.'};
 }catch(e){throw toSafeError(e)}
});
exports.customerPortalAdminSetEnabled=onCall({
 region:'us-central1',maxInstances:5,secrets:[pepper]
},async request=>{
 try{
   await requireAdmin(request);
   const enabled=request.data?.enabled;
   if(typeof enabled!=='boolean')throw new HttpsError('invalid-argument','Valor de activación inválido.');
   if(enabled&&(!pepper.value()||Buffer.byteLength(pepper.value())<32))
     throw new HttpsError('failed-precondition','Falta configurar la protección de identificaciones.');
   // Desactivado para todos por defecto: la administración debe aprobar el cambio.
   const patch={customer_portal:{enabled,updated_at:admin.firestore.FieldValue.serverTimestamp()}};
   const batch=store.batch();
   batch.set(privateConfig,patch,{merge:true});
   batch.set(publicConfig,patch,{merge:true});
   await batch.commit();
   return {enabled};
 }catch(e){throw toSafeError(e)}
});
exports.customerRegister=onCall({
 region:'us-central1',maxInstances:20,secrets:[pepper]
},async request=>{
 try{
   await requirePortal();
   const {uid,email}=requireVerified(request);
   const cedula=normalizeCedula(request.data?.cedula),name=normalizeCustomerName(request.data?.name);
   const secret=pepper.value();
   if(!secret||Buffer.byteLength(secret)<32)
     throw new HttpsError('failed-precondition','El registro todavía no está configurado.');
   const fingerprint=crypto.createHmac('sha256',secret).update(cedula).digest('hex');
   const profileRef=store.doc('customerProfiles/'+uid);
   const identityRef=store.doc('customerIdentityKeys/'+fingerprint);
   await store.runTransaction(async transaction=>{
     const existing=await Promise.all([transaction.get(profileRef),transaction.get(identityRef)]);
     const [profile,identity]=existing;
     if(identity.exists&&identity.data().uid!==uid)
       throw new HttpsError('already-exists','Este documento ya está asociado a una cuenta. Contacta a POLADENT.');
     if(profile.exists&&profile.data().identity_key!==fingerprint)
       throw new HttpsError('failed-precondition','No se puede cambiar la cédula desde el registro.');
     if(!identity.exists)transaction.create(identityRef,{uid,created_at:admin.firestore.FieldValue.serverTimestamp()});
     if(!profile.exists)transaction.create(profileRef,{
       uid,name,email,cedula_masked:maskedCedula(cedula),identity_key:fingerprint,
       created_at:admin.firestore.FieldValue.serverTimestamp()});
   });
   return {registered:true,cedula_masked:maskedCedula(cedula)};
 }catch(e){throw toSafeError(e)}
});
async function requireCustomer(request){
 await requirePortal();
 const {uid,email}=requireVerified(request);
 const snapshot=await store.doc('customerProfiles/'+uid).get();
 if(!snapshot.exists||snapshot.data()?.email!==email)
   throw new HttpsError('failed-precondition','Termina primero tu registro y verifica tu correo.');
 return {uid,email,profile:snapshot.data()};
}
exports.customerMyQuotes=onCall({region:'us-central1',maxInstances:15},async request=>{
 try{
   const {uid,profile}=await requireCustomer(request);
   // Firestore aplica la consulta por UID en el servidor, nunca desde un enlace público.
   const snapshots=await store.collection('customerQuotes').where('uid','==',uid).limit(100).get();
   const quotes=snapshots.docs.map(d=>{
     const p=d.data();
     return {id:d.id,code:p.code,created_at:p.created_at?.toDate()?.toISOString()||'',
       items:p.items||[],total_usd:p.total_usd??null,total_ves:p.total_ves??null,
       rate:p.rate??null,rate_effective_date:p.rate_effective_date||'',
       status:p.status||'solicitada'};
   }).sort((a,b)=>b.created_at.localeCompare(a.created_at));
   return {name:profile.name,cedula_masked:profile.cedula_masked,quotes,
     limited:snapshots.size===100};
 }catch(e){throw toSafeError(e)}
});
exports.customerSaveQuote=onCall({
 region:'us-central1',maxInstances:20,timeoutSeconds:45
},async request=>{
 try{
   const {uid}=await requireCustomer(request);
   const lines=validateRequestedItems(request.data?.items);
   const nonce=String(request.data?.nonce||'');
   if(!/^[a-f0-9-]{36}$/i.test(nonce))throw new HttpsError('invalid-argument','Código de solicitud inválido.');
   const quoteRef=store.doc('customerQuotes/'+uid+'_'+nonce);
   const old=await quoteRef.get();
   if(old.exists)return {code:old.data().code,already_saved:true};
   const publicDocs=await Promise.all(lines.map(l=>store.doc('catalogPublic/'+l.id).get()));
   const products=publicDocs.map(d=>d.exists?{id:d.id,...d.data()}:null).filter(Boolean);
   const config=await publicConfig.get();
   const enabled=config.data()?.pricing?.enabled===true;
   let rate=null,rateDate='';
   if(enabled){
     try{
       const response=await fetch('https://bcv.today/api/v1/rate.json',
         {headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});
       if(response.ok){
         const validated=validBcvPayload(await response.json());
         rate=validated.usd_ves;rateDate=validated.effective_date;
       }
     }catch(e){console.warn('BCV quote rate unavailable:',e.message)}
   }
   let financials;
   try{financials=calculateQuote(lines,products,enabled,rate)}
   catch(error){throw new HttpsError('invalid-argument',error.message)}
   const stamp=admin.firestore.Timestamp.now();
   const code='POL-'+stamp.toDate().toISOString().slice(0,10).replace(/-/g,'')+'-'+crypto.randomBytes(4).toString('hex').toUpperCase();
   const day=stamp.toDate().toISOString().slice(0,10).replace(/-/g,'');
   const quotaRef=store.doc('customerQuoteQuotas/'+uid+'_'+day);
   const payload={uid,code,items:financials.lines,products:financials.products,
     units:financials.units,total_usd:financials.total_usd,total_ves:financials.total_ves,
     rate,rate_effective_date:rateDate,pricing_enabled:enabled,
     status:'solicitada',created_at:admin.firestore.FieldValue.serverTimestamp()};
   await store.runTransaction(async transaction=>{
     const snapshots=await Promise.all([transaction.get(quoteRef),transaction.get(quotaRef)]);
     if(snapshots[0].exists)return;
     const count=Number(snapshots[1].data()?.count)||0;
     if(count>=20)throw new HttpsError('resource-exhausted',
       'Has alcanzado el máximo de 20 solicitudes guardadas hoy.');
     transaction.create(quoteRef,payload);
     transaction.set(quotaRef,{uid,day,count:count+1},{merge:true});
   });
   const saved=await quoteRef.get();
   return {code:saved.data().code,already_saved:false};
 }catch(e){throw toSafeError(e)}
});
