# Vistas previas individuales para WhatsApp y redes — POLADENT

## Qué hace
Al compartir un producto desde el catálogo, la ficha pública de ese artículo puede tener su **propio título e imagen** en la vista previa de WhatsApp.

- Los enlaces generados tienen el formato `https://polandent223.github.io/catalogo-poladent/share/ID-DEL-PRODUCTO/`.
- Cada HTML contiene metadatos Open Graph (`og:title`, `og:description`, `og:image`, `og:url`) y Twitter Card con el nombre y la foto del producto.
- Cuando una persona toca ese enlace, su navegador la lleva automáticamente al catálogo original y abre el producto seleccionado.
- La fotografía de Cloudinary se entrega como JPEG en un marco 1200 × 630 para mayor compatibilidad de vista previa; los archivos originales permanecen intactos.
- Los enlaces antiguos con `?marca=...#producto=...` siguen funcionando.
- Si un producto es nuevo y todavía no aparece en el manifiesto publicado, WhatsApp utilizará el enlace anterior para evitar enlaces rotos.
- **WhatsApp decide cómo y cuándo almacenar sus vistas previas**. Puede mostrar por algún tiempo una imagen anterior en caché.

## Actualización automática
El workflow `.github/workflows/product-previews.yml` consulta la colección **pública** `catalogPublic` de Firebase y vuelve a crear las páginas individuales cada **seis horas**. También se ejecuta cuando actualizamos la rama principal.

Si acabas de importar una marca y deseas actualizar de inmediato:
1. Abre [GitHub Actions](https://github.com/Polandent223/catalogo-poladent/actions/workflows/product-previews.yml).
2. Selecciona **Run workflow** / **Ejecutar flujo de trabajo** en la rama main.
3. Espera a que termine y comprueba la publicación en Pages.

Los productos eliminados u ocultos se retiran del paquete de vistas previas en la siguiente sincronización. Aunque su HTML anterior aún pueda permanecer en caché, el catálogo real no los mostrará.

## Para el administrador
No necesitas volver a introducir productos, números de WhatsApp ni imágenes. Este cambio no modifica Firestore, Cloudinary o la agenda de WhatsApp; solo produce páginas estáticas a partir de lo publicado.

## Seguridad y rendimiento
- El generador usa la misma lectura pública de Firestore que ya requiere el catálogo; no usa cuentas de servicio ni tokens privados.
- Escapa nombres y descripciones antes de colocarlos en HTML.
- Nunca genera páginas para productos ocultos, tareas internas o ajustes de contacto.
- El navegador descarga el manifiesto de enlaces en segundo plano; el catálogo sigue funcionando incluso si ese archivo aún no está publicado o hay errores de red.
- Si la tarea de GitHub falla, permanecen activos los enlaces anteriores y se puede revisar la ejecución sin tocar las fichas.

## Confirmación real
GitHub Actions puede comprobar que los HTML se generan, pero eso **no garantiza** que WhatsApp muestre inmediatamente la imagen. Tras la primera publicación, comparte un enlace de producto desde WhatsApp en una conversación de prueba y verifica el resultado, preferiblemente sin usar un mensaje anterior en caché.
