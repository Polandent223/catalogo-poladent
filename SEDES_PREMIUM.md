# Sedes oficiales en la portada premium de POLADENT — borrador

Este cambio es una propuesta **no publicada**. Rama de desarrollo: `feature/sedes-premium-editor` y PR #31 (draft). Nunca fusionar/publicar sin revisar manualmente y aprobar la presentación.

## Seguridad y compatibilidad
- El diseño comercial y las sedes están ocultos cuando están desactivados. La portada inicial del catálogo, productos, carrito, WhatsApp y datos existentes permanecen sin cambios.
- Los campos de sedes se guardan dentro de `storefront` del documento ya usado para la configuración pública; el servicio existente valida administrador y usa operaciones de escritura `merge: true` para no sobrescribir contactos.
- Activar solo la casilla de sedes sin activar el escaparate no cambia el catálogo público.
- La vista previa usa mensajes del mismo origen y fotografías `blob:` locales, que no se escriben en Firebase.
- Se permiten hasta ocho sedes. Si no hay fotografía no se muestra una ficticia.

## Datos iniciales aportados por POLADENT
- Valencia: sede principal; Calle 137 Los Sauces, San José, edificio 137, piso 3, local 19; 8:00 a. m. – 5:00 p. m.; +58 422-6710634; RIF J-401910769.
- Maracay: Torre Sindoni, planta baja, local N13; 8:00 a. m. – 5:00 p. m.; +58 422-6710634; RIF J-401910769.
- Compra directa y retiro en ambas sedes. No inventar días de apertura ni políticas de entrega.
- Las fotos aportadas por el propietario deben subirse mediante el editor autenticado; no están publicadas automáticamente.

## Cómo revisar (con sesión de administrador)
1. Con el código desplegado en un entorno de prueba no público, abrir `diseno.html`.
2. Verificar que `Activar este diseño` no se marca automáticamente y que `Mostrar las sedes oficiales` inicia desactivado cuando no existe configuración anterior.
3. Seleccionar cada plantilla y verificar móvil/PC.
4. Activar **solo en borrador** la casilla de sedes; revisar Valencia y Maracay.
5. Subir una fotografía de prueba de cada sucursal y verificar la vista previa antes de guardar.
6. Agregar y quitar una tercera sucursal; comprobar que no se pierde la foto seleccionada de otra sede.
7. Guardar con `Activar este diseño` desactivado: el sitio público debe permanecer sin cambios.
8. Revisar permisos Firebase, botones de ubicación/WhatsApp y datos reales antes de activar.
9. **Solo tras aprobación del propietario**, publicar la actualización y revisar de nuevo en dos teléfonos y una PC.

## Pruebas automáticas
El flujo `Verificar catálogo estático` de GitHub Actions ejecuta `node storefront-tests.mjs` y las demás pruebas de seguridad. Las pruebas no sustituyen las pruebas en navegador con administrador real ni el envío de fotografías.
