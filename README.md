# Catálogo Poladent

Catálogo público por marcas con búsqueda, filtros de disponibilidad y detalle compartible. Incluye panel privado para agregar, editar, eliminar y ocultar productos, con compresión de imágenes en el navegador.

## Estado

La vista pública muestra los 27 productos originales de ADALTA mientras no haya conexión. El panel muestra un aviso de configuración y no permite simular guardados. Para activar la administración real, completar CONFIGURACION.md con un proyecto independiente de Supabase y una cuenta autorizada. Sin claves secretas en el repositorio.

La presentación original de 30 páginas permanece en adalta.html. No refleja cambios de disponibilidad.

## Verificación

Sintaxis de módulos comprobada. Pruebas del cliente HTTP con respuestas simuladas: rechazo de cuentas sin autorización, sesión autorizada, separación de acceso público/privado, cierre de sesión y validación de URL. Pendientes pruebas integrales con el proyecto real: permisos RLS, archivos, acceso, edición y consulta pública.
