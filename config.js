// Configuración pública. No insertar service_role, contraseñas ni credenciales privadas.
window.CATALOGO_CONFIG = {url:'',key:''};
window.CATALOGO_FIREBASE = {
  apiKey: 'AIzaSyD0G0LjzGH-6uwUqXTETWh99TCeJuhrmhg',
  authDomain: 'catalogo-poladent.firebaseapp.com',
  projectId: 'catalogo-poladent',
  storageBucket: 'catalogo-poladent.firebasestorage.app',
  messagingSenderId: '1031541087641',
  appId: '1:1031541087641:web:c7898a966258c660f68708'
};

// Alojamiento de imágenes opcional: datos PUBLICOS solamente.
// No incluyas aquí el API Secret de Cloudinary ni tokens de Firebase.
window.CATALOGO_IMAGES = {
  provider: 'cloudinary',
  workerUrl: 'https://poladent-imagenes.samuel-eliuzeq-223.workers.dev',
  cloudName: 'pewsdgm5', // Cloud name público de POLADENT
  apiKey: '' // API Key pública de Cloudinary
};
