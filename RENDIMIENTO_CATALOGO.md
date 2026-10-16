# Rendimiento del catálogo público — POLADENT

## Actualización 2026-10-16

Se optimizó la **parte pública** para que las marcas, fotografías y productos sean más ligeros en computadora y teléfono. No hay cambios en los documentos de Firebase, los 27 artículos ADALTA, los 13 VRC, las fichas IMODONTO ni los números de WhatsApp.

### Qué cambió
- **Menos JavaScript al visitar el catálogo:** `public-catalog.js` ya no carga `catalog-service.js` / `firebase-client.js`, que incluían módulos de Authentication, Firestore y Storage. Utiliza `catalog-public-data.js`, que consulta **solo** la colección pública `catalogPublic` desde Firestore REST.
- **Una lectura paginada en vez de varias consultas:** productos, presentaciones de marcas y contactos de WhatsApp se obtienen juntos. Las páginas de hasta 200 registros evitan que falten productos cuando el inventario crezca.
- **Fotos adaptadas al tamaño de pantalla:** las tarjetas usan versiones Cloudinary con transformación `f_auto,q_auto,c_limit,w_360/w_720` y `srcset`; las fotografías completas siguen disponibles al abrir la ficha. Se conservan los archivos originales, títulos, portadas y contraportadas.
- **Búsqueda más fluida:** se calcula el texto de búsqueda una vez y se retrasa 130 ms la renovación mientras se escribe. No se reconstruyen la portada y los botones de marcas en cada pulsación.
- **«Ver más productos» incremental:** añade únicamente las doce tarjetas nuevas en vez de volver a dibujar todas las anteriores.
- **WhatsApp intacto:** se conservan los enlaces `/share/ID/` con vista previa individual y los contactos configurados. Mientras el manifiesto de enlaces se actualiza, el catálogo puede usarse normalmente.

### Seguridad y coherencia
- Este lector solo solicita `catalogPublic`, que ya era visible para los visitantes. No obtiene credenciales privadas ni documentos de `catalogProducts`.
- Los registros internos y los productos que estén `hidden` se excluyen de la página pública.
- No guardamos en `localStorage` versiones antiguas de disponibilidad; cada apertura del catálogo consulta el inventario actual.
- El administrador conserva sus bibliotecas de Firebase para gestionar autenticación y almacenamiento: no se modificó su funcionamiento.

### Verificaciones
El workflow `.github/workflows/catalog-check.yml` prueba sintaxis, importación CSV, enlaces a WhatsApp, paginación REST, documentos de marca/contactos y enlaces optimizados de Cloudinary. En PR el generador OG consulta Firestore público de verdad.

### Prueba manual después de publicar
1. En PC abre el catálogo en modo incógnito y mide cómo cargan portada y primeras fotos; filtra ADALTA / VRC / IMODONTO y usa «Ver más».
2. Haz la misma prueba en el teléfono con Wi-Fi y con datos móviles.
3. Abre una ficha, elige Valencia o Maracay, comprueba el texto precargado y la vista previa en WhatsApp.
4. Marca temporalmente **un producto de prueba** como agotado y comprueba su visibilidad, sin modificar artículos comerciales importantes.
5. Si algo falla, conserva la captura y el enlace: el cambio puede revertirse desde GitHub sin tocar Firebase ni Cloudinary.

Nota: la mejora reduce JavaScript y las fotos, pero la velocidad también depende de la red y de la cantidad total de documentos públicos. Si supera varios miles de artículos, valorar paginación de Firestore por servidor y búsquedas indexadas como siguiente etapa.
