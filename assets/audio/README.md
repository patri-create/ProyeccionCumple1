# Carpeta de audio

Coloca aquí tus archivos `.mp3`. Nombres que el proyecto espera por defecto:

## Música de fondo
Se asigna en `index.html` con el atributo `data-music` de cada `<section class="slide">`.

| Archivo | Se usa en |
|---|---|
| `musica-1.mp3` | Diapositiva 1 (y 2, que la hereda) |
| `musica-2.mp3` | Diapositiva 3 |
| `musica-final.mp3` | Diapositiva 4 |

Si una diapositiva no lleva `data-music`, sigue sonando la música anterior sin cortes.

## Efectos (SFX)
Se registran en `js/app.js`, en el objeto `SFX`. Se disparan con `data-sfx` (al entrar en la
diapositiva) o `data-click-sfx` (al pulsar un elemento).

| Archivo | Nombre |
|---|---|
| `sfx-whoosh.mp3` | `whoosh` |
| `sfx-pop.mp3` | `pop` |
| `sfx-click.mp3` | `click` |
| `sfx-chime.mp3` | `chime` |
| `sfx-applause.mp3` | `applause` |
| `sfx-next.mp3` | `next` (avance genérico) |

Los archivos que falten simplemente no suenan: la presentación no se rompe.
