> Este documento describe la alternativa **Supabase**. Para crear el catálogo con **Firebase** y no consumir otro proyecto de Supabase, consulta [FIREBASE_SETUP.md](FIREBASE_SETUP.md).

# Activar administración

1. Crear un proyecto independiente en Supabase llamado catalogo-poladent en la organización elegida. Revisar el plan/costo mostrado antes de crearlo.
2. Ejecutar setup.sql una sola vez desde SQL Editor.
3. En Authentication > Users crear la cuenta administradora con un correo y una contraseña que solo conozca el propietario. Desactivar el registro público en Authentication para este proyecto. No publicar contraseñas en GitHub.
4. Ejecutar la sentencia final comentada de setup.sql con el correo real para autorizar esa cuenta. Un usuario autenticado sin esta autorización no puede modificar productos ni subir archivos.
5. Añadir en config.js la URL del proyecto y su clave PUBLICABLE (o anon compatible). Nunca usar service_role ni una clave secreta.
6. Abrir admin.html, iniciar sesión y pulsar Importar productos ADALTA. Verificar los 27 productos importados antes de publicar config.js; al conectarse, el catálogo lee los registros de la base de datos.
7. Probar crear, editar, marcar agotado, ocultar y eliminar un producto de prueba, comprobando los resultados en una ventana sin iniciar sesión.

El enlace público principal reúne todas las marcas que tengan productos visibles. admin.html administra los productos. adalta.html conserva las 30 páginas originales como folleto estático y no refleja estados de disponibilidad; la disponibilidad actual se consulta en el catálogo principal. Las imágenes de un bucket público pueden abrirse mediante su URL incluso si un producto está oculto. Ocultar retira el producto de la lista, no convierte sus imágenes en archivos privados.

Las imágenes nuevas se comprimen en el navegador a WebP, con un máximo de 1440 píxeles por lado. Las eliminaciones borran primero el producto y luego intentan retirar su archivo propio; una interrupción puede dejar una imagen sin referencia, pero no elimina imágenes de otros productos. Al sustituir imágenes se conserva el archivo anterior para evitar pérdida accidental.

Estado de entrega: interfaz y esquema preparados. Las funciones conectadas requieren completar estos pasos y las pruebas reales. No existe una contraseña predeterminada ni un modo de administración local que simule cambios públicos.
