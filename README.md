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
