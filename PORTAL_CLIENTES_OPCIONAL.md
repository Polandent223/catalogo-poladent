# POLADENT — despliegue seguro del portal opcional

## Estado real

El código del frontend ya está publicado por GitHub Pages. **La creación de cuentas y el historial privado permanecen inactivos** mientras no se desplieguen las seis Cloud Functions y no se apruebe el lanzamiento. Ni el carrito ni WhatsApp requieren inicio de sesión; el cliente puede seguir cotizando sin cuenta.

El interruptor de **Administración → Más herramientas → Cuentas y cotizaciones de clientes** permanecerá bloqueado mientras el backend no esté preparado. Su activación no crea automáticamente cuentas para los visitantes anteriores.

## Preparación requerida: SOLO responsables de Firebase

1. Confirmar el **proyecto correcto**: `catalogo-poladent`, los datos y reglas actuales. Hacer respaldo privado completo y comprobarlo antes de cualquier cambio. **No borrar ni restaurar inventario, fotos, estadísticas ni auditorías.**
2. Comprobar plan **Blaze** de Firebase (Cloud Functions requiere facturación) y alertas de presupuesto/cotas; la mera creación del flujo no debe forzar cambio de plan.
3. Verificar en Authentication el método **Correo/Contraseña**, las plantillas de verificación de correo y el dominio autorizado `polandent223.github.io`.
4. Desde un terminal confiable de administración, asignar un secreto privado HMAC de al menos 32 bytes aleatorios para el tratamiento de cédulas:
   `firebase functions:secrets:set POLADENT_CUSTOMER_PEPPER --project catalogo-poladent`.
   **No compartir aquí ni subir a GitHub valores secretos, credenciales JSON, archivos de backup o claves de sesión.**
5. Desplegar **solo** el codebase `customer-portal`, sin reglas/Hosting/Storage:
   `firebase deploy --only functions:customer-portal --project catalogo-poladent --non-interactive`.
   Alternativamente, la acción manual `.github/workflows/customer-portal-deploy.yml` usa Workload Identity Federation (OIDC), **sin claves JSON permanentes en GitHub**. Requiere configurar `GCP_WORKLOAD_IDENTITY_PROVIDER` y `GCP_FIREBASE_DEPLOYER_SA` en el entorno GitHub `firebase-production`, con permisos mínimos y aprobación humana. Solo se ejecuta manualmente desde `main` y con la confirmación `DESPLEGAR-PORTAL`. No ejecutar hasta verificar permiso y respaldo.
6. Ejecutar pruebas funcionales completas en **entorno aislado de prueba** con dos cuentas distintas; entre ellas: cédula duplicada, correo no verificado, autorización por UID, páginas ocultas, importes USD/Bs, estado de producto, tasa BCV fallida, protección de datos y recuperación del carrito. El entorno de pruebas necesita su propio proyecto Firebase y configuración de ensayo; NO usar las cuentas de clientes reales.
7. En producción, una vez verificado el respaldo, las pruebas y las funciones, un operador del proyecto con permiso administrativo de Firestore crea **manualmente** este documento privado:
   - Ruta: `customerPortalDeployment/production`
   - Campos Firestore tipados (todos obligatorios): `approved: true` (Boolean), `tested_two_accounts: true` (Boolean), `backup_verified: true` (Boolean), `release_version: "customer-portal-v1"` (String).
   - Este documento **no** se publica en `catalogPublic`. Las reglas actuales niegan acceso directo a clientes y web.
8. Después de la aprobación, el panel de administración desbloquea el interruptor. La jefa puede activar y desactivar el portal, sin ocultar catálogo ni WhatsApp. El estado por defecto es **OFF**. No activar hasta terminar las pruebas.

## Seguridad y funcionamiento

- **Cédula es identificador, no contraseña ni prueba concluyente de identidad legal.** El acceso requiere contraseña y correo verificado. Un registro malicioso con la cédula de otra persona sigue siendo posible hasta verificar documentalmente la identidad por un proceso independiente aprobado por la empresa.
- La cédula se transforma en HMAC-SHA256 con secreto en servidor; solo se conserva su versión enmascarada y la huella, no el número completo en el historial.
- Cotizaciones almacenadas en `customerQuotes` son **privadas**, consultadas solo mediante funciones que autentican y filtran por UID; Firestore cliente no dispone de permisos directos. La cédula no aparece en la URL.
- Productos, cantidades y precios de cada cotización guardada se toman del catálogo publicado **en el servidor**, no del total enviado por el navegador. La solicitud guardada no es una factura fiscal ni implica que el vendedor haya aceptado la venta.
- El cliente NO necesita cuenta para hacer consultas; a los registrados se les indica «Ya lo cotizaste» para evitar búsquedas repetidas y pueden reenviar productos anteriores al carrito.
- **Ninguna página crea cuentas cuando el portal está OFF.** Si un usuario ya había creado cuenta durante pruebas, la bandera OFF impide acceder a su historial desde este sistema.
- Existen límites iniciales de guardado y lectura. Antes del lanzamiento comercial, revisar App Check, políticas de conservación/rectificación/eliminación, asistencia por pérdida de acceso y manejo del spam.

## Comprobaciones automáticas (no equivalen a una prueba en Firebase real)

- `node customer-portal-tests.mjs`
- `node --check functions/index.js`
- `node --check functions/customer-core.cjs`

No hay una tarea automática de despliegue en cada push: el flujo manual requiere un responsable que confirme el entorno real. **No desplegar** `firestore.rules` ni `storage.rules` como parte de esta fase.
