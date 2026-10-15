# Catálogo profesional POLADENT Casa Dental

Catálogo web de odontología y laboratorio dental organizado por marcas, con buscador y detalle compartible. Incluye un panel de administración para agregar, editar, eliminar y cambiar el estado de disponibilidad, así como imágenes WebP comprimidas en el navegador.

## Estado
- Publicación actual: la versión de `main` conserva los 27 productos originales de ADALTA y el folleto fijo de 30 páginas.
- Esta rama propone **Firebase (Authentication, Firestore y Storage opcional)** como alternativa al límite de proyectos de Supabase, manteniendo también el adaptador Supabase anterior.
- Hasta conectar un backend real, el panel **no simula guardados**. La vista pública mantiene los productos ADALTA locales.
- Las 30 páginas estáticas de `adalta.html` no reflejan agotados u ocultos. Para consultar estados reales se usa el catálogo principal.

## Activación
- Para Firebase: seguir `FIREBASE_SETUP.md`, las reglas de `firestore.rules` y `storage.rules`.
- Para Supabase: seguir `CONFIGURACION.md`.
- Nunca subir contraseñas, secretos ni credenciales de administrador al repositorio.
- **Firebase Storage requiere el plan Blaze** para subir imágenes desde el panel. Sin Blaze se pueden usar URL públicas existentes.
- La integración necesita pruebas reales de autenticación, permisos, escritura y consulta pública antes de publicarse.

## Publicación inicial sin pérdida de contenido

Mientras Firestore no tenga publicaciones, la web muestra las 27 fichas originales de ADALTA.
Al crear o importar el primer producto, el adaptador crea un registro público interno `catalogPublic/_catalog_state` de activación. La web filtra ese registro y utiliza solo la base de datos, incluso si todos los productos terminan ocultos o eliminados. No se requiere modificar nuevamente las reglas de Firestore compartidas previamente.


## Fotos sin facturación de Firebase
El panel admite la futura integración **Cloudinary Free** para almacenar imágenes y **Cloudflare Workers Free** para firmar las solicitudes y validar el administrador de Firebase. No utiliza presets de subidas anónimas.

La integración está preparada, pero **no está activada** hasta configurar la URL del Worker y los datos públicos de Cloudinary en `config.js`. Consulta [CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md). Nunca publicar la `CLOUDINARY_API_SECRET`, contraseñas o ID tokens en este repositorio. El usuario puede seguir pegando URLs de imágenes como antes.
