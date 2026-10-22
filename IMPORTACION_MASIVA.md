# Importar productos en cantidad — POLADENT

El catálogo ADALTA inicial se importó desde datos preparados en el repositorio. Para cargar **otras marcas sin programar ni pedirme que agregue cada producto**, el administrador incluye ahora **Importar muchos productos**.

## Preparar la tabla
1. Descarga `plantilla_productos.csv` desde la administración.
2. Ábrela con Excel o una herramienta similar y agrega **una fila por producto**. No modifiques los nombres de las columnas.
3. Exporta como **CSV UTF-8** (separador coma o punto y coma).
4. Se admiten hasta **200 productos por archivo**, en lotes automáticos de 25.
5. En la columna `foto`, escribe el nombre exacto del JPG/PNG/WebP. Selecciona todos esos archivos juntos desde el formulario.
6. También puedes utilizar `imagen_url` con una dirección HTTPS pública (si tiene URL, esa fila no subirá una imagen nueva).
7. En la columna opcional `area_id` puedes poner el identificador del área (por ejemplo `endodoncia`) para asignarla directamente. También se reconocen cabeceras `area`, `categoria` o `area_del_producto`. Los identificadores estándar son `endodoncia`, `ortodoncia`, `instrumental`, `laboratorio`, `equipos` y `restauracion`. Usa minúsculas sin espacios ni tildes. Las áreas personalizadas deben estar creadas en el editor de diseño antes de usarse.
8. Si dejas `area_id` vacío o usas un CSV antiguo sin esa columna, el producto permanece sin asignación manual y puede clasificarse automáticamente si tienes esa función activada.
9. Si una fila tiene el mismo nombre y marca que un producto existente, se omite. La importación no altera ni duplica esos productos.

Ejemplo ilustrativo (no es necesario copiarlo a tus productos):

```csv
codigo,nombre,marca,descripcion,estado,foto,imagen_url,orden,area_id
MD-100,Forceps de ejemplo,MEDESY,Instrumento dental,disponible,forceps-100.jpg,,1,instrumental
ICE-200,Elevador de ejemplo,ICE,Instrumento de extracción,agotado,elevador-200.png,,2,instrumental
```

Los estados aceptados son `disponible`, `agotado`, `oculto`. Los productos `oculto` solo aparecerán en el administrador. Puedes importar DENCO primero como `oculto` y revisar sus fotografías antes de cambiarlo a `disponible`.

## Paso a paso
- Entra a `admin.html` con Firebase.
- Busca **Importar muchos productos** y descarga la plantilla.
- Completa la tabla y reúne las fotografías en una carpeta de tu computadora. No hace falta comprimirlas.
- Selecciona el CSV y luego **todas las fotografías** de una vez (puedes usar Ctrl+A dentro del selector).
- Revisa la vista previa, la cantidad de productos nuevos y los omitidos.
- Pulsa **Revisar e importar**, confirma y espera sin cerrar la pestaña.
- Cuando termine, verifica la marca en el catálogo público. Puedes subir logotipos y portadas desde `marcas.html`.

## Seguridad y consideraciones
- La importación requiere autenticación de administrador en Firebase.
- Las imágenes nuevas se comprimen a WebP y se almacenan en Cloudinary con firma emitida por Cloudflare.
- La operación puede tardar si hay muchas fotografías; no cierres la pestaña mientras muestra progreso.
- Los productos se guardan en bloques. Si falla una operación a mitad, los bloques ya completados permanecen y pueden revisarse; al volver a seleccionar la misma tabla se omiten las fichas que ya existen.
- Al fallar un bloque, se intentan borrar las imágenes subidas en ese bloque para no dejar residuos; si Cloudinary falla también al borrarlas, se muestra una advertencia para revisarlas manualmente.
- El administrador muestra inicialmente 24 artículos y permite cargar más, evitando renderizar todas las tarjetas al abrirlo.
- Este importador no lee hojas `.xlsx` directamente: primero exporta CSV UTF-8.
