# POLADENT — cotización comercial por WhatsApp (sin precios)

## Experiencia del cliente
- Los productos siguen visibles, con sus nombres, marcas y estado disponible/agotado; no se publican precios.
- Al abrir una ficha aparece «Solicita una cotización», con **cantidad** (1 a 9.999 unidades), **ciudad** (mínimo dos caracteres) y **cuándo piensa comprar** (esta semana, este mes, más adelante o solo comparando opciones).
- Se conserva la selección de contactos de WhatsApp (por ejemplo Valencia y Maracay) configurados por el administrador.
- Una vez completados los campos, se activa **Solicitar cotización por WhatsApp**. El enlace lleva un mensaje precargado con producto, marca, cantidad, ciudad, prioridad temporal y enlace individual del artículo.
- Si el producto aparece agotado, el texto de consulta menciona expresamente la necesidad de confirmar cuándo estará disponible.
- WhatsApp no envía el mensaje automáticamente: el usuario debe revisarlo y pulsar «Enviar».

## Privacidad y estadísticas
- Los campos de ciudad, unidades y plazo **no se guardan en Firestore ni en el navegador**. Solo se utilizan para construir el mensaje de WhatsApp.
- Las estadísticas solo registran la pulsación real del enlace habilitado que abre WhatsApp, siguiendo los límites anónimos ya existentes. No se registra la apertura del formulario como consulta.
- Un clic no equivale a un mensaje enviado, una venta ni un pedido confirmado.
- No se modifican reglas Firestore, inventario, marcas, portadas, contactos existentes, respaldos ni los documentos del historial.
- Se evita repetir detalles del producto anterior al abrir otro artículo y se mantiene el funcionamiento en teléfono y computadora.

## Pruebas
- `node whatsapp-tests.mjs` verifica unidades, opciones de plazo, teléfonos, datos faltantes, mensajes de agotados y las direcciones originales de los productos.
- Prueba manual: abre un artículo disponible y otro agotado, selecciona diferentes contactos, completa el formulario, abre WhatsApp y comprueba la previsualización del mensaje. No necesitas enviar el mensaje para comprobarlo.
- El catálogo debe seguir abriendo enlaces directos a artículos y compartiendo fichas por WhatsApp.
