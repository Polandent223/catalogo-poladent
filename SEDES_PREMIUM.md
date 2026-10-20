# POLADENT — Premium Confianza (quinta plantilla)

## Estado

Implementada en el repositorio principal mediante PR #31, tras pasar las pruebas de GitHub Actions.
Es una opción del administrador: **no está activada automáticamente** y no reemplaza la portada de bienvenida hasta que el administrador lo decida.

## Secciones de la nueva plantilla

- Presentación premium con imagen real opcional de la sucursal, banner editable y WhatsApp directo.
- Bloque «¿Por qué elegir POLADENT?» con título, párrafo y cuatro ventajas editables.
- Información de sucursales oficiales: fotos, nombres, RIF, direcciones, horarios, compra directa, retiro en tienda, WhatsApp y Google Maps.
- Guía de cuatro pasos de compra, editable, y bloque de cierre comercial.
- Logo original opcional mediante subida privada desde el administrador.

## Para revisar sin publicar

1. Abre `diseno.html` desde el catálogo e inicia sesión como administrador.
2. Selecciona **Premium Confianza** (las cuatro plantillas anteriores siguen disponibles).
3. Edita «Por qué elegirnos», ventajas, pasos y cierre.
4. Activa «Mostrar las sedes oficiales» para verlas en el simulador.
5. Carga las fotos verdaderas de Valencia y Maracay; inicialmente las fotos no se cargaron en el servidor de manera automática.
6. Revisa texto, imagen, contactos y dirección tanto en PC como en teléfono.
7. Sólo al terminar, selecciona **Activar este diseño para TODOS los clientes** y guarda.
8. Si también quieres que sustituya la pantalla de bienvenida existente, marca por separado **Usar Premium Confianza como primera pantalla del catálogo**. Esto conserva la bienvenida anterior en su configuración para poder restaurarla.

La vista previa pública sin modificar Firebase se puede abrir con
`?catalogo=1&vista=1&tema=premium-confianza` (puede utilizar el diseño de muestra y la información guardada, sin modificarla).

## Protección

La configuración del escaparate se guarda dentro del documento de contactos con `merge:true`, sin cambiar productos, carrito, historial ni contactos.
Las fotos tienen URLs HTTPS o `blob:` local sólo en la vista previa. Los borradores no se escriben al servidor hasta pulsar Guardar.

## Comprobación pendiente

Confirmar en navegador autenticado la subida real de fotos y verificar su aspecto final en teléfonos.
Aunque las pruebas automáticas pasaron, esa prueba visual todavía requiere sesión del administrador.
