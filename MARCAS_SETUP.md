# Presentaciones de marcas — POLADENT

El catálogo profesional ahora permite asignar **logotipo original, portada y contraportada** a cada marca sin modificar sus productos existentes.

## Cómo usarlo

1. Abre [Panel administrador](https://polandent223.github.io/catalogo-poladent/admin.html) e inicia sesión con tu cuenta de Firebase.
2. Pulsa **Gestionar marcas, logotipos y portadas**. También puedes abrir [marcas.html](https://polandent223.github.io/catalogo-poladent/marcas.html).
3. Escribe la marca **exactamente** como aparece en sus productos (ejemplo: ADALTA).
4. Añade opcionalmente una frase, descripción, logotipo, portada y contraportada. Puedes subir JPG/PNG/WebP desde tu computadora o pegar enlaces HTTPS.
5. Guarda la presentación. En el catálogo público, selecciona esa marca para ver sus elementos visuales y sus productos.
6. Usa **Copiar enlace de la marca** para compartirla. Los enlaces existentes siguen funcionando.

## Reglas importantes

- No se rediseñan ni alteran los logotipos: se exhibe el archivo original. El cargador comprime las fotografías a WebP para optimizar el sitio.
- Una presentación de marca **no crea ni elimina productos**. Estos se controlan desde el panel normal.
- Los archivos subidos se alojan en Cloudinary; Firebase guarda enlaces y descripciones.
- Las fichas privadas de productos, las presentaciones y las solicitudes de carga requieren acceso administrador. La vista pública solo lee `catalogPublic`.
- El diseño es compatible con teléfono y computadora.
- Por ahora el administrador permite crear y editar las presentaciones. Para quitar una portada o borrar una presentación por completo, se debe agregar una opción segura que también limpie las imágenes; no elimines manualmente registros en Firestore.
- Hasta que una marca tenga logotipo y portadas configurados, aparece un encabezado elegante con su nombre.
- Antes de aplicar cambios de un logotipo oficial, comprueba que sea el original y que los permisos comerciales correspondan.

## Pruebas antes de usar con clientes

1. Configura primero una presentación temporal de marca y verifica desde otro navegador que aparezca sin sesión.
2. Comprueba que el buscador, los filtros y los estados Disponible/Agotado/Oculto sigan correctos.
3. Verifica que no aparezcan fichas de `brand_profile` como si fueran productos.
4. Revisa los enlaces de WhatsApp y la visualización en PC y móvil.

La integración se entrega en GitHub Pages tras la validación automática de sintaxis. Esto no reemplaza las pruebas reales de Firebase y Cloudinary.
