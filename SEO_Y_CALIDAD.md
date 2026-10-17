# POLADENT — posicionamiento básico y calidad de estadísticas

## Cambios publicados

### Página comercial
- `index.html`: título descriptivo, descripción, URL canónica, metadatos Open Graph, idioma de la marca y datos estructurados `WebSite` con la dirección pública real.
- `sitemap.xml`: únicamente la página comercial y el folleto estático público ADALTA, ambos accesibles sin iniciar sesión.
- `robots.txt`: indica el sitemap y desaconseja que buscadores exploren rutas privadas del administrador. **No protege la seguridad** de estas páginas: esa responsabilidad sigue en Firebase Authentication y Firestore Rules.
- `aviso-estadisticas.html`: información pública sobre qué mide el contador y qué NO puede confirmar, con enlace desde el pie de la página comercial.

Las páginas generadas en `share/{id}/` existen para vistas previas de WhatsApp y redirigen al catálogo; tienen `noindex`. Por tanto no se incluyeron en sitemap. **Esta etapa no convierte las fichas individuales en resultados de Google.** Para indexar cada producto se necesitarían URLs y páginas de contenido público independientes, sin redirección automática, con gestión de agotados y ocultos.

### Conteos y prevención de errores
- `analytics-quality.js` limita eventos repetidos de la misma ficha en 1.5 segundos y clics repetidos de WhatsApp en 4 segundos; limita hasta 60 consultas y 500 aperturas por carga de página para reducir el volumen accidental.
- Solo cuenta clics de interacción del navegador (`isTrusted`) a un enlace válido `https://wa.me/NÚMERO?text=...`; no registra eventos de pulsación sintetizados por JavaScript.
- Preserva señales `Do Not Track` y `Global Privacy Control`, marca temporal de Firestore, los tipos de eventos y todas las consultas del catálogo actual.
- El contador no utiliza identificadores nuevos, cookies o almacenamiento persistente de seguimiento.
- El filtro se ejecuta **solo en el navegador**. No puede impedir un atacante que contacte directamente Firestore y fabrique eventos. Las reglas actuales solo validan tipos y tamaños, no frecuencia ni procedencia.

## Pendiente para defensa real contra bots y abusos

Para proteger contra exceso de escrituras y estadísticas inventadas se requiere diseñar, probar y desplegar una medida del lado servidor, por ejemplo un endpoint autenticado mediante App Check, verificación de origen y limitación de frecuencia; no debe aceptarse una cabecera Origin como autenticación única. Valorar Firebase App Check donde esté admitido y su modo de supervisión antes de exigirlo: activarlo de golpe podría bloquear visitas reales.

**No cambiar reglas Firebase sin respaldo verificado, pruebas de clientes reales y plan de reversión.** Los actuales datos, empleados de otros proyectos y estadísticas se conservan; no se requiere migración.

## Pasos para Google

1. Abrir [Google Search Console](https://search.google.com/search-console/) e incorporar/verificar la propiedad URL-prefix `https://polandent223.github.io/catalogo-poladent/` si aún no está verificada.
2. Abrir la sección **Sitemaps** y enviar `https://polandent223.github.io/catalogo-poladent/sitemap.xml`.
3. Inspeccionar la URL principal y solicitar indexación cuando Search Console lo permita.
4. Esperar el rastreo. **Publicar un sitemap no garantiza indexación o posición en los resultados**; depende de Google y de su análisis del contenido.

## Pruebas automáticas
`node seo-quality-tests.mjs`, además de `node analytics-tests.mjs`, `node welcome-tests.mjs` y el resto de CI de GitHub. Confirmar tras publicar que sitemap, robots y aviso entregan HTML/XML/texto válidos.
