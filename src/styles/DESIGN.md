# Sistema visual

Basado en la salida de Google Stitch, con los colores ajustados a contraste AA. Las clases están en `globals.css` y los tokens en `tailwind.config.js`.

## Colores

| Uso | Token | Valor |
| --- | --- | --- |
| Fondo de la app | `bg-sand` | `#FAF7F2` |
| Tarjetas | `bg-white` + `border-slate-200` | |
| Acción principal, pestaña activa | `emerald-700` (hover `emerald-800`) | `#047857` |
| Etiquetas sobre títulos (eyebrow) | `text-terracotta-700` | `#A84E31` |
| Detalle decorativo | `terracotta`, `ochre` | nunca como texto chico ni como estado |

Se usa `emerald-700` y no `emerald-600` para botones, porque el texto blanco sobre `emerald-600` no llega a 4.5:1.

## Estados, prioridades y tendencias

Siempre los mismos colores en todas las pantallas. No se reemplazan por colores de marca.

| Clase | Significado |
| --- | --- |
| `pill status-new` / `status-reviewing` / `status-in_progress` / `status-resolved` | Nuevo (celeste), En revisión (violeta), En curso (ámbar), Resuelto (verde) |
| `pill priority-low` / `-medium` / `-high` / `-critical` | Baja (gris), Media (ámbar), Alta (naranja), Crítica (rojo) |
| `pill tag-demo` / `pill tag-simulated` | "Ejemplo" en reportes precargados, "Simulado" en zonas demo |
| `trend-up` / `trend-down` / `trend-flat` | Mejora, empeora, sin cambio: siempre con flecha, no solo color |

El sufijo de las clases coincide con los valores de `ReportStatus` y `Priority`, así que se puede escribir `` `pill status-${report.status}` ``.

## Componentes

- `card`: tarjeta blanca, `rounded-2xl`, borde sutil, `p-5`.
- `eyebrow` + `section-title` (o `page-title` + `page-lead` al inicio de cada sección).
- `btn-primary`, `btn-secondary`, `btn-ghost`: 44 px de alto mínimo.
- `field-label`, `field-input`, `field-hint`, `field-error`.

## Tipografía y forma

- Plus Jakarta Sans (Google Fonts, cargada en `index.html`), con fuentes del sistema como respaldo.
- Números con `tabular-nums`.
- Radios: tarjetas `rounded-2xl`, campos y botones `rounded-lg`, pastillas `rounded-full`.
- Objetivos táctiles de 44 × 44 px como mínimo.

## Navegación

- Desktop: pestañas arriba con ícono y texto.
- Mobile: barra inferior fija (`bottom-nav`); `app-main` deja espacio abajo para que no tape contenido.
- Al imprimir se ocultan las navegaciones y el footer; el aviso de datos demostrativos queda.

## Textos que no usamos

El prototipo no tiene datos en vivo, sensores, GPS de precisión ni usuarios. No usar "en vivo", "tiempo real", "detección confirmada", avatares, IDs inventados ni fotos de stock como si fueran reportes reales.
