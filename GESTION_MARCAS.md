# POLADENT — marcas del inventario y presentaciones

## Qué causaba el problema
- El campo **Marca** de cada producto en `catalogProducts` era un texto libre y no creaba ningún documento `brand_profile`.
- La página `marcas.html` mostraba únicamente documentos `brand_profile` existentes. Por eso al crear una marca en «Nuevo producto» no aparecía allí.
- Al editar el nombre de una presentación se guardaba solo `brand_profile.name`; los productos continuaban con su `brand` anterior. El catálogo público mostraba ambas marcas por separado.

## Cómo funciona ahora
1. «Gestionar marcas» reúne marcas de **todos los productos del inventario** (incluidos ocultos y agotados) y presentaciones configuradas.
2. Una marca con productos pero sin logotipo aparece como **Sin presentación** y ofrece **Configurar / corregir**. Se puede crear su logotipo, portada o contraportada, y opcionalmente corregir el nombre de todos esos productos.
3. Una marca con presentación ofrece **Editar marca**. Si solo se guarda su logotipo/portada/descripción, los productos NO se reescriben.
4. Si el administrador realmente cambia el nombre, primero aparece una **confirmación con la cantidad de productos afectados**. Firebase vuelve a consultar las fichas y presentaciones actuales, rechaza destinos que ya pertenezcan a otra marca, y usa **un único writeBatch** para actualizar el perfil en ambas colecciones y el campo `brand` de todos los productos privados y públicos correspondientes. Los ocultos solo se actualizan en privado.
5. Si falla alguna parte, Firestore no aplica el lote: no deja la mitad de los productos en una marca y la otra mitad en otra.
6. La corrección **no borra ninguna ficha, imagen, historial ni registro de auditoría**; solo modifica el texto del campo `brand` y la presentación de marca editada.

## Límites y precauciones
- No se fusionan automáticamente dos marcas existentes: si el nombre nuevo ya tiene productos o presentación, el administrador verá un aviso y no se realizarán cambios. Esto evita que una corrección ortográfica termine mezclando inventarios.
- Si hay presentaciones ambiguas repetidas con el nombre original, la corrección se bloquea para revisión.
- Por seguridad, el lote atómico se limita a 450 escrituras: para marcas con más productos se necesita un procedimiento supervisado por lotes y con respaldo.
- La corrección no hace una copia de seguridad automática. El administrador puede descargar el respaldo privado existente antes de cambios grandes.
- Los cambios no se aplican hasta que una cuenta administradora autorizada los guarde y confirme en `marcas.html`.
- Si otros administradores están cambiando los mismos productos al mismo tiempo, evitar editar simultáneamente durante un renombrado. Esta mejora es atómica al guardar, pero no implementa un bloqueo interusuario persistente.
- Renombrar una marca cambia también el parámetro `?marca=...` de sus enlaces de marca anteriores: conviene compartir el enlace actualizado. Los enlaces individuales `#producto=ID` mantienen el mismo ID.

## Pruebas
`node brand-management-tests.mjs` valida visibilidad de marcas del inventario, perfiles opcionales, detección de colisiones, estados ocultos, límite atómico y conservación de otras características. Se ejecuta dentro de CI junto con el resto de pruebas del catálogo.
