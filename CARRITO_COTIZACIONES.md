# Carrito de cotización POLADENT — sin precios

## Para clientes
1. El catálogo sigue mostrando las marcas, fotografías y disponibilidad sin precios.
2. Cada tarjeta y ficha permite **Agregar a cotización**; si se pulsa de nuevo, aumenta la cantidad en una unidad. El cliente puede añadir hasta **10 productos distintos** en una misma solicitud.
3. El botón **Mi cotización (N)** abre una lista donde se pueden cambiar cantidades entre 1 y 9.999, eliminar productos y comprobar si alguno está agotado.
4. En la lista se indica ciudad, intención de compra (**Hoy**, **Esta semana**, **Este mes**, **Más adelante** o **Solo estoy comparando opciones**) y el contacto de WhatsApp configurado por la empresa.
5. Al pulsar **Enviar una sola cotización por WhatsApp**, se abre WhatsApp con un mensaje prellenado que enumera productos, marcas, cantidades, enlaces individuales, ciudad y momento estimado. **El usuario todavía debe pulsar Enviar en WhatsApp.**
6. La cotización individual que ya funcionaba continúa en la ficha de cada producto.

## Privacidad y estado de los productos
- El carrito solo guarda **identificadores de los productos y cantidades en sessionStorage** del mismo navegador/pestaña. Se mantiene después de recargar la pestaña, pero no se sincroniza entre equipos ni constituye un pedido confirmado.
- La ciudad, el contacto elegido y el plazo de compra NO se guardan en Firebase ni en sessionStorage. Solo se incluyen en el enlace que abre WhatsApp.
- Al volver a cargar el inventario, se eliminan del carrito local los productos cuyo estado es oculto, eliminados o que ya no se publican. El carrito usa solo productos públicos disponibles o agotados.
- Los agotados siguen pudiéndose consultar; el mensaje identifica el artículo como agotado para pedir disponibilidad.
- La URL de WhatsApp se limita a un tamaño prudente; si la lista es excesivamente larga, el cliente puede quitar algunos artículos y enviar dos solicitudes. El límite también evita enlaces desmesurados en móviles.

## Estadísticas y seguridad
- Un clic de una cotización múltiple se registra como **un solo evento WhatsApp** con grupo `Cotización múltiple`, sin atribuirlo artificialmente a cada marca/producto ni guardar ciudad, cantidades u otros datos del formulario.
- Las cifras de WhatsApp siguen indicando clics, no mensajes enviados, cotizaciones recibidas ni ventas.
- No se cambian reglas ni datos de Firebase, productos, fotografías, configuraciones comerciales, contactos, respaldos o historiales.
- No se implementa checkout ni pago electrónico; es una solicitud comercial.

## Comprobación rápida
1. Desde PC y desde teléfono, agrega dos artículos de distintas marcas, uno agotado si está disponible para la prueba.
2. Abre `Mi cotización`, cambia la cantidad y elimina un artículo; vuelve a agregarlo.
3. Elige contacto Valencia o Maracay, ciudad y **Hoy**; comprueba en WhatsApp que el texto contiene todos los productos con cantidades correctas. No hace falta enviar el mensaje.
4. Comprueba que el enlace de cotización individual sigue funcionando sin carrito.
5. Recarga la pestaña y revisa que la selección siga ahí (sin conservar la ciudad).

Prueba automática: `node quote-cart-tests.mjs`, además de las anteriores pruebas de WhatsApp, estadísticas, rendimiento y portada en GitHub Actions.
