# Portada oficial POLADENT Casa Dental

## Estado y diseño aprobado
La imagen aprobada muestra a un técnico dental (izquierda) y a una odontóloga en el consultorio (derecha), con el logotipo oficial POLADENT en el centro y los textos:
- «Bienvenido a tu catálogo POLADENT»
- «Encuentra los productos para tu consultorio y laboratorio.»
- «Entrar al catálogo»

La composición original se conserva. El botón impreso en la imagen es un elemento gráfico, y hay un **botón HTML real y accesible colocado encima** con el mismo tamaño visual. En teléfonos también aparece un botón independiente, cómodo de pulsar.

## Cómo activar por primera vez

La imagen original aprobada fue generada en ChatGPT y no está en GitHub ni en Cloudinary hasta que un administrador la suba. Para no publicar una página con imagen rota, el catálogo conserva su entrada habitual hasta activar la portada.

1. Descarga la imagen oficial aprobada desde ChatGPT (el archivo optimizado se entrega en la conversación).
2. Abre [Administración POLADENT](https://polandent223.github.io/catalogo-poladent/admin.html) y pulsa **Configurar portada principal**, o abre directamente [portada.html](https://polandent223.github.io/catalogo-poladent/portada.html).
3. Inicia sesión con el usuario administrador de Firebase.
4. Selecciona la imagen oficial WebP/JPG/PNG en **Seleccionar imagen oficial**; Cloudinary la alojará sin modificar la composición ni el texto (solo optimiza su formato).
5. Marca **Mostrar esta pantalla al ingresar al catálogo**.
6. Pulsa **Guardar portada y configuración**.
7. Abre la página pública en una ventana privada sin parámetros para comprobar la primera impresión y pulsar **Entrar al catálogo**.

## Comportamiento de entrada

- La raíz `https://polandent223.github.io/catalogo-poladent/` muestra la portada **cuando el administrador la haya activado**.
- Pulsar el botón navega de inmediato al catálogo dentro de la misma web, sin recargar ni descargar Firebase de administración.
- Las direcciones antiguas con `?marca=VRC`, `?marca=IMODONTO` y `#producto=...` se abren directamente sin pantalla intermedia.
- También puedes usar `?catalogo=1` para ir directamente al listado sin portada.
- El catálogo público, estados Disponible/Agotado/Oculto, imágenes, WhatsApp y vistas previas individuales no se alteran.
- Los archivos originales de imagen permanecen en Cloudinary. Al sustituir una portada, verifica si la anterior todavía se utiliza antes de eliminarla.
- Si Firebase no responde o la portada está desactivada, **entra directamente al catálogo**, sin bloquear clientes.

## Si deseas cambiar o desactivar la bienvenida

Abre `portada.html` y desmarca la casilla **Mostrar esta pantalla**. Guarda. El catálogo volverá a abrir directamente en la lista habitual y conservará la imagen por si deseas reactivarla.

## Pruebas de publicación

`node welcome-tests.mjs` y las verificaciones normales de GitHub Actions validan que el botón real exista, que los enlaces de marcas y productos salten la portada, y que el acceso administrativo esté protegido. La prueba en teléfono y ordenador debe hacerse luego de subir la imagen oficial desde el panel.
