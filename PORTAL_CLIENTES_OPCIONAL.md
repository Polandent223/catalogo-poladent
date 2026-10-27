# POLADENT — Portal opcional de clientes (pendiente de despliegue)

## Qué queda funcionando sin cambios
- El catálogo es público y continúa mostrando marcas, fotografías, estados y precios sin iniciar sesión.
- WhatsApp sigue permitiendo solicitudes anónimas: nombre/teléfono se envían únicamente cuando el usuario decide abrir el mensaje.
- El enlace de una solicitud anónima conserva su comportamiento anterior y **no** crea perfil ni historial privado automáticamente.
- La opción "Mi cuenta" y la nota de beneficios aparecen **solo si** el documento público \`catalogPublic/_catalog_contacts.customer_portal.enabled\` es verdadero. El valor por defecto es **falso**.

## Qué está preparado para cuentas optativas
- Correo + contraseña de Firebase Authentication, con **correo verificado** antes de registrar la cédula.
- Cédula venezolana V/E como identificador, **nunca como contraseña**. Se conserva únicamente un resumen enmascarado y una huella HMAC-SHA256 con secreto del servidor; no se guarda la cédula en texto plano en Firestore.
- Cada cuenta tiene su UID de Authentication. Las cotizaciones se crean y leen **solo mediante Cloud Functions** que comprueban ese UID, el correo verificado y el interruptor activo.
- Los importes guardados proceden de \`catalogPublic\` consultado por el servidor, nunca de precios proporcionados por el visitante. El cálculo Bs queda pendiente si no se obtiene una tasa válida.
- Se permite guardar voluntariamente el carrito. Mientras no se guarde, no existe una cotización privada.
- La página «Mi cuenta» muestra productos anteriormente cotizados y permite volver a pedirlos; en el catálogo se señala «Ya lo cotizaste» únicamente a los usuarios autenticados.
- El usuario no puede consultar otra cuenta proporcionando una cédula o código público.
- Firestore mantiene sus reglas actuales: ninguna colección nueva es legible o escribible directamente por clientes. Las Functions usan el SDK Admin detrás de su propia autorización.
- No representa una factura fiscal ni un comprobante de pago. Estado guardado = \`guardada\`, no venta confirmada.

## Requisitos antes de activar (no realizados aquí)
1. Comprobar que el proyecto \`catalogo-poladent\` puede ejecutar **Cloud Functions v2** (puede requerir plan de facturación). Evaluar presupuesto y límites.
2. Revisar respaldo completo, reglas publicadas y políticas de privacidad, retención y eliminación de datos.
3. En Firebase Authentication, habilitar **Correo/Contraseña** y añadir el dominio público de GitHub Pages a los dominios autorizados.
4. Configurar la clave privada de cédula con al menos 32 bytes aleatorios: 
   \`firebase functions:secrets:set POLADENT_CUSTOMER_PEPPER --project catalogo-poladent\`.
   **No** escribir ni versionar su valor en GitHub, capturas o ChatGPT.
5. Instalar Firebase CLI y, dentro de \`functions/\`, ejecutar \`npm ci\` si hay lockfile, o \`npm install\` inicialmente. Después, desde la raíz:
   \`firebase deploy --only functions:customerPortalStatus,functions:customerPortalAdminHealth,functions:customerPortalAdminSetEnabled,functions:customerRegister,functions:customerMyQuotes,functions:customerSaveQuote --project catalogo-poladent\`.
   Si se configura un codebase, adaptar este comando al codebase correspondiente.
6. Probar con al menos **dos usuarios reales de prueba diferentes**, verificando aislamiento entre historiales, creación duplicada de cédula, correo sin verificar, precios cambiantes, productos ocultos, tasa no disponible, importes guardados y retorno a carrito.
7. Comprobar costes y protección frente a abuso (App Check y políticas de rate-limit adicionales si se lanza ampliamente).
8. Solo entonces el administrador podrá activar el interruptor desde «Más herramientas». Hasta ese momento debe continuar **desactivado y bloqueado**.

## Seguridad importante
La verificación de correo prueba el control del correo, **no la identidad jurídica vinculada a una cédula**. Para operaciones financieras o fiscales, POLADENT debe validar documentación por un procedimiento adicional aprobado por la empresa.

La solución de fase 1 muestra hasta 100 cotizaciones recientes; el historial largo y exportación/política de retención requerirán paginación y controles adicionales. No se incluyen pagos, créditos ni sistema de facturación.
