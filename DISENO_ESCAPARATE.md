# POLADENT — primera pantalla comercial, editable desde el administrador

## Estado inicial: vista previa, sin modificar la web aprobada
- Abre `https://polandent223.github.io/catalogo-poladent/?catalogo=1&vista=1` para observar la propuesta con marcas y productos públicos reales.
- Abre `https://polandent223.github.io/catalogo-poladent/diseno.html` e inicia sesión como administrador para editarla mientras observas el simulador de teléfono.
- **La nueva propuesta NO reemplaza la primera pantalla pública hasta que el administrador marque «Activar este diseño para TODOS los clientes» y pulse «Guardar configuración».** Si el selector está desactivado, la web pública sigue usando la presentación anterior.
- La portada principal de bienvenida, su versión 9:16 para teléfonos y su funcionalidad de toque en cualquier punto son independientes del escaparate interior y no se cambian.

## Ajustes disponibles
- Banner horizontal para computadora y banner vertical para teléfono: imagen JPG/PNG/WebP o URL HTTPS.
- Título, texto superior y descripción comercial.
- Textos de ambos botones: **Explorar marcas** y **Buscar productos** (las acciones reales se conservan).
- Tres mensajes de confianza.
- Hasta cuatro marcas destacadas con el logotipo configurado o la fotografía de un artículo; sus conteos se obtienen de los productos públicos.
- Títulos de sección para marcas destacadas y todas las marcas.
- Activar/desactivar el escaparate nuevo.
- Sin banner personalizado: un fondo premium azul con fotografías **reales** de productos del catálogo; no se inventan instrumentos ni se usan imágenes de marcas ajenas.

## Funcionamiento técnico y límites
- La configuración se guarda en `catalogProducts/_catalog_contacts.storefront` y `catalogPublic/_catalog_contacts.storefront`, con `writeBatch.set(...,{merge:true})`. Conserva los contactos WhatsApp y la portada de bienvenida que comparte ese documento.
- Es necesario iniciar sesión y tener `catalogAdmins/{uid}.active = true` para guardar. La vista previa del catálogo contiene información pública, no contraseñas.
- El navegador manda los ajustes temporales al iframe por `postMessage` limitado al mismo origen y solo en `?vista=1`. Los cambios que solo ves en el simulador NO se guardan automáticamente.
- Las imágenes se guardan usando el servicio actual Cloudinary (si está configurado) al pulsar «Guardar». Si la subida a Cloudinary funciona pero la escritura Firestore falla, se intenta retirar la imagen recién subida. Los anteriores archivos no se eliminan automáticamente.
- Los cambios no publican ni cambian productos, sus fotos, sus estados, carrito, reglas de Firebase, historial ni registros de estadísticas. El formulario de cotización individual y el carrito siguen funcionando.
- Si el cliente abre `?marca=ICE` u otro enlace individual, puede ir directamente a los productos de esa marca, conservando la portada de marca existente.
- Solo son editables **los textos, imágenes y marcas** de los bloques comerciales. La estructura y las posiciones se mantienen deliberadamente fijas y responsive para que no se rompa el diseño al modificar contenidos.

## Verificación
1. En `diseno.html`, ver una pantalla simulada y modificar el título; comprobar que cambia en la vista previa sin afectar la web pública.
2. Elegir hasta cuatro marcas reales; probar sus botones en la vista previa.
3. Subir banner distinto de PC y teléfono y guardar con **Activar este diseño** desactivado. La propuesta se puede volver a editar, pero no se publica al cliente.
4. Una vez aprobado, activar el diseño y guardar. Probar teléfono y PC y luego el flujo de cotización individual/carro completo.
5. Si prefieres volver al diseño anterior, desmarcar **Activar este diseño** y guardar.

Pruebas automáticas: `node storefront-tests.mjs` (además de CI anterior). Sin acceso al navegador autenticado no se puede certificar una subida real de banner ni el guardado de configuración; el usuario autorizado debe comprobar la operación.
