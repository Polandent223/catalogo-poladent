# POLADENT — Premium Compacta Responsive (sexta plantilla)

Esta plantilla es **independiente** de Premium, Clínica, Minimalista, Comercial y Premium Confianza. No reemplaza automáticamente el catálogo ni cambia los productos existentes.

## Diseño por pantalla
- **Teléfono (hasta 700 px)**: portada breve (315 px por defecto), tres mensajes de confianza compactos, marcas desplazables horizontalmente, buscador y productos a continuación. El texto largo de «Por qué elegirnos», las sucursales y la guía de compra se muestran después de los productos, salvo que el administrador cambie el orden.
- **PC (desde 701 px)**: portada fotográfica amplia (430 px por defecto), ventajas empresariales y sedes antes de productos, si así se configuran.
- La imagen del banner, el título breve y el resumen para teléfono son independientes del banner y texto de PC.

## Cómo administrar
1. Abre `/diseno.html` con una cuenta administradora.
2. Selecciona **Premium Compacta Responsive** en la sexta tarjeta.
3. Edita los textos del banner y el título/resumen exclusivo de teléfono.
4. Dentro de **Personalizar teléfono y PC**, configura alturas, mueve secciones con flechas ↑/↓ y marca «Ocultar» por dispositivo.
5. El bloque «Marcas y productos» nunca puede ocultarse. Los filtros, enlaces, carrito y productos mantienen sus nodos y eventos originales.
6. Usa los botones **Teléfono** y **Computadora** para alternar la simulación. Desde un móvil, la vista PC permite desplazamiento horizontal.
7. Activa «Mostrar sedes» y sube fotografías reales si quieres mostrar Valencia y Maracay.
8. Al guardar con «Activar este diseño para TODOS los clientes» desmarcado, **no cambias la portada pública**.
9. Cuando hayas aprobado la vista previa, activa el diseño y guarda. Solo marca «Usar ... como primera pantalla» si deseas que sustituya la bienvenida actual (la configuración anterior permanece guardada).

## Protección
- La configuración se valida y normaliza antes de guardar; no acepta nombres extraños en la lista de secciones.
- No se modifican documentos individuales de productos, contactos, compras, inventario ni historial; el guardado actual de storefront usa `merge:true`.
- El diseño se reordena con CSS `order` y valores de estilos en cada sección: **no mueve nodos** ni reconstruye formularios.
- Se conservan las cinco plantillas preexistentes y la portada anterior por defecto.
- El código se integra sin seleccionar, activar ni publicar la sexta plantilla en Firebase.
- GitHub Actions verifica JavaScript y pruebas del catálogo; falta comprobación visual en navegador autenticado y carga de fotografías reales.

## Vista previa directa
En una versión desplegada del código, visita:
`?catalogo=1&vista=1&tema=premium-compacta`

La opción `vista=1` es una vista local y no guarda ninguna modificación.
