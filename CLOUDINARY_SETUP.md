# POLADENT — subir imágenes sin activar Blaze

## Servicios
- **Cloudinary Free:** plan sin tarjeta de crédito, 25 créditos mensuales compartidos entre almacenamiento, transformaciones y transferencia. https://cloudinary.com/pricing
- **Cloudflare Workers Free:** genera firmas para autorizar cada fotografía; 100.000 solicitudes al día en el plan gratuito. https://www.cloudflare.com/plans/developer-platform/
- **Firebase:** conserva usuarios y fichas en Firestore; no cambia ni se migra la base de datos.

> Seguridad: nunca publicar la API Secret de Cloudinary ni el token ID de Firebase en GitHub o en el chat. El preset de subida sin firma no se usa: cualquiera que conozca su nombre podría consumir la cuota.

## 1. Crear cuenta Cloudinary
1. Visita https://cloudinary.com/users/register/free y crea una cuenta Free.
2. En **Console / API Keys** localiza el **Cloud name** y la **API Key**. Son datos públicos que pueden guardarse en `config.js`.
3. Localiza **API Secret**, pero **NO** lo copies al código del catálogo ni lo compartas por chat. Solo se colocará como secreto en Cloudflare.

## 2. Crear Cloudflare Worker
1. Accede a https://dash.cloudflare.com/ y entra en **Workers & Pages → Create → Worker**; usa el plan gratuito.
2. Elige **Importar desde GitHub** y conecta el repositorio `Polandent223/catalogo-poladent`, rama `main`. Ya existe `wrangler.jsonc`: declara `poladent-imagenes` como Worker e indica que el archivo principal es `cloudinary-upload-worker.js`. No importa ni sustituye el catálogo de GitHub Pages.
   - Si aparece **Build command**, déjalo vacío (no se necesita construir una app).
   - Si aparece **Deploy command**, usa `npx wrangler deploy`.
   - Si aparece **Root directory**, deja `/` (raíz del repositorio).
   - Comprueba que el Worker creado se llama `poladent-imagenes`.
   - Si Cloudflare ofrece una opción de *Pages* para publicar HTML, no la elijas: necesitamos **Workers** para firmar las fotografías.
3. Después del despliegue, abre **Settings → Variables and Secrets** de ese Worker y agrega:
   - `CLOUDINARY_CLOUD_NAME`: tu Cloud name (texto).
   - `CLOUDINARY_API_KEY`: tu API Key (texto).
   - `CLOUDINARY_API_SECRET`: tu API Secret, marcada como **Secret** (no texto visible ni variable pública).
4. Guarda las variables y copia la URL HTTPS de tu Worker, normalmente `https://poladent-imagenes.<tu-subdominio>.workers.dev`.
5. No borres `catalogAdmins`. El Worker verifica que el usuario tenga su documento `catalogAdmins/{uid}` con `active = true`; verifica además la firma criptográfica y la vigencia del token de Firebase.

## 3. Conectar al catálogo
1. Completa `window.CATALOGO_IMAGES` en `config.js` con tus datos públicos: `{ provider: 'cloudinary', workerUrl: 'https://...', cloudName: '...', apiKey: '...' }`.
2. Nunca insertes el API Secret en `config.js`, `firebase-client.js`, `admin.html` ni otros archivos públicos.
3. Abre el panel de administración, selecciona una foto JPG, PNG o WebP y guarda el producto. La foto se comprimirá automáticamente a WebP y se enviará a Cloudinary mediante un permiso firmado.
4. Comprueba que la imagen aparezca en el catálogo público en una ventana de incógnito. Haz primero una prueba con un producto temporal y luego con un producto de una marca nueva.

## Funcionamiento / limitaciones
- Solo puede solicitar firmas una cuenta de Firebase autenticada y autorizada como administradora por Firestore.
- Las imágenes finales son públicas, como corresponde a un catálogo. Ocultar una ficha no vuelve privada una URL de imagen ya publicada.
- Al borrar un producto con una foto propia de Cloudinary, primero se crea una tarea de limpieza en `catalogProducts` y luego se elimina el producto. Si Cloudinary no confirma la eliminación, el administrador verá un aviso y el botón **Reintentar eliminación de fotografías**. Las tareas no son visibles al cliente. Una vez confirmado el borrado, se retira también la tarea pendiente.
- Los archivos huérfanos de productos borrados **antes de instalar esta mejora** no se pueden asociar automáticamente porque su ruta ya se perdió. Localízalos por carpeta `poladent-catalogo` y fecha en Cloudinary Media Library; comprueba que no estén asociados a un producto actual antes de retirarlos.
- Si sustituyes una foto, el archivo anterior se conserva por seguridad, para evitar pérdida accidental.
- No se hace ninguna operación ni se factura automáticamente a Cloudinary o Cloudflare hasta crear y conectar ambas cuentas.
- La edición existente con URLs públicas sigue disponible.
