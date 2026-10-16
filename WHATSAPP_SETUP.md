# Consultas de productos por WhatsApp — POLADENT Casa Dental

## Configuración por el administrador

1. Entra a [Administrador](https://polandent223.github.io/catalogo-poladent/admin.html) con el usuario autorizado.
2. Pulsa **Configurar WhatsApp** o abre [contacto.html](https://polandent223.github.io/catalogo-poladent/contacto.html).
3. Puedes agregar hasta **5 números de atención** con nombres descriptivos (por ejemplo, «Ventas Valencia» y «Ventas Maracay»).
4. En el campo de teléfono escribe el número internacional **incluyendo código de país y sin el cero inicial**, por ejemplo para Venezuela `58412XXXXXXX`; no pegues «wa.me/» ni un enlace completo.
5. Pulsa **Guardar números de WhatsApp**. Los cambios aparecen en el catálogo público sin modificar GitHub.
6. Para cambiar un número, edítalo y guarda. Para quitarlo, pulsa **Quitar** y guarda. También puedes quitar todos los números; entonces desaparece el botón público de consulta.

## Vista del cliente

- El cliente entra al catálogo, selecciona la marca y abre un producto con «Ver producto».
- Si la empresa tiene números configurados, aparece «Consultar por WhatsApp».
- Si hay más de un número, puede escoger a cuál contacto escribir.
- Al pulsar el botón, se abre `https://wa.me/...` en una nueva pestaña con un texto que incluye el **producto, la marca y el enlace directo a su ficha**. El cliente puede modificar el texto antes de enviarlo.
- Para productos agotados, el botón dice «Consultar disponibilidad por WhatsApp».

## Privacidad y seguridad

- **Solo administradores** autorizados con Firebase Authentication y `catalogAdmins/{uid}.active = true` pueden editar los contactos.
- Las líneas de atención configuradas son **públicas** porque deben aparecer en el enlace de WhatsApp. Evita utilizar números privados o personales.
- Los contactos se guardan en los documentos `catalogProducts/_catalog_contacts` (admin) y `catalogPublic/_catalog_contacts` (lectura pública); el catálogo no los muestra como fichas comerciales.
- No se usan proveedores externos ni credenciales de WhatsApp Business API; es una apertura normal de la aplicación/web de WhatsApp con mensaje precargado.
- El código no trae teléfonos predeterminados: **debes configurar al menos uno** para habilitar el botón.
- Las reglas Firestore existentes solo permiten crear/actualizar el documento público a administradores. Su campo `status` es `available` y su `kind` es `contact_settings`.

## Contraportada

La contraportada original de cada marca se conserva, pero se muestra al final de sus productos en un bloque compacto de cierre, con texto de agradecimiento. Si aún quedan artículos detrás de «Ver más productos» o se está filtrando la lista, la contraportada se oculta temporalmente.
