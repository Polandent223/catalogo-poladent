# POLADENT — Estadísticas del catálogo

## Qué cuenta
- **Visitas**: cada apertura efectiva del catálogo (incluidos enlaces directos de productos). Una persona puede producir más de una visita. No se identifica al visitante ni se promete contar personas únicas.
- **Tiempo aproximado dentro del catálogo**: fragmentos de navegación con la pestaña visible, guardados aproximadamente cada 15 segundos. El promedio se calcula dividiendo el tiempo visible acumulado entre el número de visitas. La última fracción de tiempo puede perderse si se cierra el navegador antes de completar la escritura.
- **Consultas iniciadas por WhatsApp**: pulsaciones de «Consultar por WhatsApp» en la ficha de un producto. **No son mensajes confirmados, conversaciones ni ventas.**
- **Productos abiertos / marcas más exploradas**: aperturas de fichas por marca.
- **Historial**: el administrador puede consultar los últimos 7 días o cualquiera de los últimos 12 meses de forma independiente. Los eventos anteriores no se eliminan ni se sobrescriben.

## Activación imprescindible en Firebase

GitHub Pages está alojado en GitHub, pero las estadísticas se guardan en Firestore. **Subir el código a GitHub NO publica las reglas de Firestore automáticamente.**

1. Entra a [Firebase Console — Firestore Reglas](https://console.firebase.google.com/project/catalogo-poladent/firestore/databases/-default-/rules).
2. Abre el archivo [firestore.rules de POLADENT](https://github.com/Polandent223/catalogo-poladent/blob/main/firestore.rules).
3. Copia el **archivo completo**, no solo la nueva sección, y pégalo en las reglas de Firestore, revisando que coincida con tus reglas actuales. Si hiciste modificaciones manuales en Firebase que no figuran en GitHub, concílialas antes de publicar: no reemplaces reglas que estés usando sin comprobarlas.
4. Pulsa **Publicar**.
5. Entra en [Estadísticas del catálogo](https://polandent223.github.io/catalogo-poladent/estadisticas.html) con el administrador autorizado.
6. Abre el catálogo en otro navegador o pestaña privada, pulsa **Entrar al catálogo**, abre un producto, deja la pestaña visible al menos 20–30 segundos y pulsa «Consultar por WhatsApp». No es necesario enviar ningún mensaje.
7. Vuelve al administrador y pulsa **Actualizar estadísticas**. Debe reflejar al menos una visita, la apertura y el clic de consulta. No habrá cifras anteriores a esta activación.

## Seguridad y privacidad
- Los clientes **solo pueden crear** documentos de eventos con campos estrictamente definidos y marca de tiempo del servidor. **Ningún visitante puede consultar, editar ni borrar** los eventos. Solo un administrador autorizado con `catalogAdmins/{uid}.active = true` puede leer el historial.
- Las escrituras son anónimas y contienen únicamente el tipo de evento, su duración (en segundos), la marca y el ID técnico del producto cuando corresponda. No almacenamos IP, teléfonos, datos del dispositivo, datos de los clientes, contenido de mensajes ni identificadores persistentes.
- Se respetan las señales `Do Not Track` y `Global Privacy Control` del navegador; esas visitas no se cuentan.
- Las reglas de Firestore limitan el esquema, **pero no impiden completamente que un actor automatizado genere eventos falsos o muchos documentos**. Si el catálogo crece, la protección recomendada es mover la recepción de eventos a un endpoint con controles de frecuencia y protección contra bots, o habilitar Firebase App Check tras verificar su compatibilidad.
- Los registros ocupan lecturas y escrituras en Firestore. Superar cuotas puede generar costos según el plan contratado. El administrador consulta un periodo a la vez para limitar lecturas.
- No existe función de borrar estadísticas en el panel. Los registros se conservan para el historial; cualquier política futura de retención deberá definirse por separado.
- La ausencia de estadísticas nunca debe impedir cargar el catálogo o abrir WhatsApp.

## Configuración de métricas
En `catalog-analytics.js` se generan los eventos `visit`, `engagement`, `product_open` y `whatsapp`. El documento Firestore se crea con `serverTimestamp()` y sin datos de identificación personal. Las reglas están en `firestore.rules` y el panel privado en `estadisticas.html`.

## Pruebas
Ejecuta `node analytics-tests.mjs` y el conjunto de pruebas GitHub Actions. Confirma luego una prueba real con un navegador sin bloquear estadísticas y una cuenta autorizada del administrador.
