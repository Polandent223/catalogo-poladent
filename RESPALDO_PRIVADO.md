# Respaldo privado de datos POLADENT

## Alcance
En el administrador se añade `respaldo.html`, protegido mediante autenticación Firebase y autorización `catalogAdmins/{uid}.active=true`.

La opción **Descargar respaldo privado JSON** hace solicitudes de solo lectura a Firestore REST con el ID token del administrador, y recupera mediante paginación tres colecciones:
- `catalogProducts`: productos, marcas, portadas y configuración interna.
- `catalogPublic`: catálogo público y contactos publicados.
- `catalogAnalyticsEvents`: historial de visitas, navegación y clics WhatsApp.

Los documentos se exportan con `name`, `fields`, fechas y tipos de datos **tal como los devuelve la API REST de Firestore**. No se utilizan permisos administrativos públicos ni claves secretas.

## Verificación
- La descarga se cancela por completo si falla alguna página, se excede el límite de paginación, el servidor responde con documentos malformados o hay IDs duplicados.
- El programa compara la cantidad de documentos recuperados con los conteos escritos en el JSON y calcula un SHA-256 sobre `JSON.stringify(collections)`.
- Se vuelve a analizar el archivo en memoria y se repite la validación estructural y de SHA-256 **antes** de descargarlo.
- El sistema nunca escribe, elimina o restaura registros en Firebase.
- El respaldo se genera en el navegador autorizado; el código no lo envía a un servidor de terceros.
- Como la exportación implica varias lecturas en momentos distintos, **no equivale a una copia transaccional en un instante único**. Un catálogo que cambie durante la exportación podría tener algunas versiones de documentos de diferentes instantes.

## Cómo hacer la copia
1. Abre [respaldo.html](https://polandent223.github.io/catalogo-poladent/respaldo.html), o pulsa **Descargar respaldo privado** desde el administrador.
2. Entra como administrador.
3. Pulsa **Descargar respaldo privado JSON** y espera a que terminen las tres colecciones. No cierres la página.
4. Guarda el archivo en una ubicación **privada**, preferiblemente con una copia adicional protegida fuera de tu computadora. Este JSON puede contener números comerciales de WhatsApp y datos internos.
5. Comprueba que el archivo JSON existe, que no está vacío y que aparece el mensaje de checksum SHA-256 verificado. Guarda también el código si deseas compararlo después.
6. Repite el respaldo después de modificaciones importantes del inventario y periódicamente.

## Qué NO cubre
- Imágenes y videos binarios originales alojados en Cloudinary (solo se exportan sus enlaces y rutas).
- Cuentas, contraseñas o registros de Firebase Authentication.
- Colecciones distintas de las tres indicadas (por ejemplo, el listado de `catalogAdmins`, cuya lectura general está prohibida por seguridad).
- Otros proyectos Firebase, como un sistema separado de empleados y marcaciones.
- Copia automática fuera de la máquina del administrador.
- Restauración automatizada. **El sistema no contiene ningún botón de restaurar ni borrar desde este respaldo.**

Para una recuperación integral ante desastre se debe planificar también la exportación administrada de Firestore y el respaldo de activos Cloudinary, con permisos seguros. El exportador no es sustituto de esa infraestructura.

## Costos y límites
Consultar el historial completo puede generar lecturas en Firestore según su tamaño. Al crecer los eventos convendrá crear informes compactos y usar respaldos programados administrados en vez de exportaciones frecuentes desde el navegador.

## Pruebas
`node backup-tests.mjs`; `.github/workflows/catalog-check.yml` valida también el módulo. Tras publicar, descargar una copia de prueba, comprobar que las colecciones figuran con conteos y que el archivo JSON abre correctamente. Nunca subir el archivo a un repositorio público.
