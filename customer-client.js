// Cuenta personal opcional. NO se carga en visitantes del catálogo cuando
// customer_portal.enabled=false. No modifica la sesión del administrador.
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,
 signInWithEmailAndPassword,sendEmailVerification,signOut} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js';
const cfg=window.CATALOGO_FIREBASE||{};
const app=getApps().find(x=>x.name==='poladent-optional-customers')||
 initializeApp(cfg,'poladent-optional-customers');
const auth=getAuth(app),functions=getFunctions(app,'us-central1');
const call=(name,data={})=>httpsCallable(functions,name)(data).then(x=>x.data);
export const observeCustomerSession=listener=>onAuthStateChanged(auth,listener);
export const currentCustomer=()=>auth.currentUser;
export const customerFeatureStatus=()=>call('customerPortalStatus');
export const createCustomerLogin=(email,password)=>createUserWithEmailAndPassword(auth,email,password);
export const sendCustomerVerification=()=>sendEmailVerification(auth.currentUser);
export const loginCustomer=(email,password)=>signInWithEmailAndPassword(auth,email,password);
export const customerLogout=()=>signOut(auth);
export async function registerCustomer(name,cedula,consent){
 if(!auth.currentUser)throw Error('Inicia sesión.');
 await auth.currentUser.reload();
 if(!auth.currentUser.emailVerified)throw Error('Primero confirma el correo de verificación.');
 await auth.currentUser.getIdToken(true);
 return call('customerRegister',{name,cedula,consent:consent===true});
}
export async function getCustomerQuotes(){
 if(!auth.currentUser?.emailVerified)throw Error('Verifica tu correo antes de consultar tus cotizaciones.');
 await auth.currentUser.getIdToken(true);
 return call('customerMyQuotes');
}
export async function saveCustomerQuote(items,nonce=crypto.randomUUID()){
 if(!auth.currentUser?.emailVerified)throw Error('Verifica tu correo antes de guardar cotizaciones.');
 await auth.currentUser.getIdToken(true);
 return call('customerSaveQuote',{items,nonce});
}
