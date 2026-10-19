# POLADENT · Portada premium administrable con sucursales

## Estado seguro
Esta funcionalidad se desarrolla en la rama `feature/portada-premium-sedes-borradores` y en un PR **draft**. No está fusionada ni activada en la web pública. La página de bienvenida anterior, las cuatro plantillas existentes, el inventario, el carrito y los contactos actuales permanecen intactos.

## Dónde editar después de aprobar la integración
1. Entrar al **Administrador → Portada premium · Tiendas oficiales** (`confianza.html`).
2. Modificar textos, fotografía principal, logo (opcional), estilo Premium / Clínica / Minimalista / Comercial y visibilidad de secciones.
3. En cada sucursal se pueden editar nombre, ciudad, dirección, RIF, horario, WhatsApp, compra directa, retiro y hasta **3 fotos** reales.
4. Se pueden agregar hasta **6 sucursales**. El administrador ofrece foto 1 (fachada), foto 2 (interior), foto 3 (productos). Se pueden subir archivos JPG, PNG o WebP de hasta 10 MB o pegar enlaces HTTPS.
5. La **vista previa del teléfono** cambia sin guardar y sin publicar. Los archivos locales solo se muestran en la vista previa.
6. Pulsar **Guardar borrador privado** para guardar el contenido y subir imágenes por el método seguro ya integrado (Cloudinary Worker, si está configurado).
7. Pulsar **Publicar portada aprobada** y confirmar explícitamente. Solo entonces aparece en el catálogo público. Cada sede visible debe tener al menos una foto real, un WhatsApp válido, nombre y dirección.
8. Para volver a la presentación anterior: **Desactivar portada premium**. La configuración queda guardada para más adelante.

## Sucursales precargadas (datos facilitados por POLADENT)
- **Valencia · Principal:** Calle 137 Los Sauces, San José, edificio 137, piso 3, local 19, Valencia, Carabobo. RIF J-401910769. 8:00 a. m.–5:00 p. m. WhatsApp +58 422-6710634. Compra y retiro en tienda.
- **Maracay:** Torre Sindoni, planta baja, local N13, Maracay, Aragua. Mismo RIF, horario y WhatsApp facilitados. Compra y retiro en tienda.
- **Fotografías:** el contenido textual viene precargado, pero las fotos enviadas por chat todavía deben subirse una vez desde el editor autorizado. **No se han enviado ni publicado en GitHub** esas fotos. El propio administrador conserva las fotos subidas, y permite sustituirlas posteriormente.

## Persistencia y límites
- `catalogProducts/_catalog_contacts.trust_home_draft`: **borrador privado**. Solo se escribe si pasa la autorización de administrador.
- `catalogProducts/_catalog_contacts.trust_home` + `catalogPublic/_catalog_contacts.trust_home`: configuración publicada, escrita en **un mismo lote atómico**.
- `catalogPublic` nunca contiene el borrador privado.
- `{merge:true}` preserva los contactos, la portada de bienvenida y los ajustes `storefront` anteriores.
- No se crean ni eliminan documentos de productos ni se tocan marcas, estados, carrito, pedidos ni estadísticas.
- La lectura pública ignora `trust_home` si está desactivado. En ese caso se conserva la presentación previa.
- La nueva portada no altera los permisos de Firebase, no permite cargas sin autenticación y no expone el correo ni las claves de administración.

## Pruebas antes de activar
- En CI: `node trust-home-tests.mjs`, `node storefront-tests.mjs` y todas las comprobaciones históricas.
- Pendiente de prueba manual por administrador autorizado en Android y PC: iniciar sesión, subir imágenes reales de ambas sedes, editar, previsualizar, guardar borrador, refrescar, publicar, comprobar desde otra sesión y desactivar.
- **No fusionar ni activar hasta validar estas operaciones reales y recibir aprobación.**
