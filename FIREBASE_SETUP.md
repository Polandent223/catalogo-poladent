# POLADENT — activar Firebase sin afectar ATLAS ni ABONEXA

Este proyecto sigue alojado en GitHub Pages. Firebase aporta autenticación, documentos y (opcionalmente) fotos. No se crea ni pausa ningún proyecto de Supabase.

## Costos que debes conocer
- Firebase Authentication (correo y contraseña) y Cloud Firestore tienen cuotas gratuitas en Spark.
- **Cloud Storage for Firebase exige Blaze**, aun cuando el consumo quede dentro de sus tramos sin costo. Debes habilitar facturación para subir fotos desde el panel. Revisa tarifas y fija alertas de presupuesto; las alertas no son un tope de gasto.
- Si prefieres empezar sin tarjeta ni Blaze, puedes pegar enlaces públicos HTTPS de fotos previamente alojadas. El botón de subir archivo requiere Storage.

## Pasos en Firebase Console
1. Crea un proyecto `catalogo-poladent` y registra una aplicación **Web**. Copia la configuración pública (apiKey, authDomain, projectId, storageBucket y appId).
2. Activa **Authentication > Sign-in method > Email/Password** y crea tu usuario desde **Authentication > Users > Add user**. No hay botón de registro público en el catálogo.
3. Activa Cloud Firestore (base de datos `(default)`) y publica exactamente el contenido de `firestore.rules` en Firestore > Rules.
4. En Firestore crea la colección `catalogAdmins` y un documento cuyo ID sea el **UID del usuario** creado. Añade el campo booleano `active` = `true`. Los clientes no pueden crearse permisos a sí mismos.
5. Si vas a subir imágenes desde el panel, cambia a Blaze, activa Storage y pega las reglas de `storage.rules` en Storage > Rules. Si Firebase solicita permiso IAM para la consulta de Firestore desde Storage, concédelo desde la consola. Usa el nombre real de tu bucket.
6. En `config.js` rellena `window.CATALOGO_FIREBASE` con los datos públicos. **No publiques claves privadas, contraseñas, service accounts ni JSON de administrador**. Mantén URL/key de Supabase vacíos para preferir Firebase.
7. Abre `admin.html`, inicia sesión y pulsa **Importar productos ADALTA** para crear los 27 registros actuales.
8. Prueba con un producto de ensayo: crear, editar, agotado, oculto y eliminado. Verifica los cambios en el catálogo público desde una ventana de incógnito y comprueba que un usuario común no pueda editar ni borrar.

## Cómo funciona
- El administrador opera en `catalogProducts` y la vista pública usa exclusivamente `catalogPublic`. Se actualizan mediante una escritura atómica; ocultar borra la versión pública sin eliminar la privada.
- Las imágenes en Storage son públicas una vez subidas. Ocultar un producto no oculta una URL de imagen ya compartida.
- La presentación estática `adalta.html` conserva sus 30 páginas originales; no refleja estados en tiempo real.
- Si falta configuración de Firebase y Supabase, el catálogo muestra ADALTA desde sus archivos locales y el panel no simula guardados.
- Esta integración requiere pruebas finales reales con tu proyecto Firebase antes de pasar a producción.

Consulta oficial del requisito Blaze: https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
