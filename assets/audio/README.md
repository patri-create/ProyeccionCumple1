# Carpeta de audio

Coloca aquí tus archivos `.mp3`. Si falta alguno, simplemente no suena: la
presentación no se rompe.

## Música de fondo
Se asigna en `index.html`, atributo `data-music` de cada `<section class="slide">`.
Una diapositiva sin `data-music` hereda la música de la anterior sin cortes.

| Archivo | Diapositivas |
|---|---|
| `musica-intro.mp3` | 01 Acceso concedido · 02 Perfil |
| `musica-tension.mp3` | 03 Historial · 04 Capacidades |
| `musica-misterio.mp3` | 05 Documento censurado · 06 Mensajes |
| `musica-accion.mp3` | 07 Nueva misión |
| `musica-final.mp3` | 08 Cierre |

## Efectos (SFX)
Se registran en `js/app.js`, objeto `SFX`. Se disparan con `data-sfx` (al entrar
en la diapositiva) o `data-click-sfx` (al pulsar un elemento).

| Archivo | Nombre | Dónde suena |
|---|---|---|
| `sfx-acceso.mp3` | `access` | Al conceder el acceso |
| `sfx-escaner.mp3` | `scan` | Escáner de la ficha del agente |
| `sfx-beep.mp3` | `beep` | Pitidos de consola y cuenta atrás |
| `sfx-sello.mp3` | `stamp` | Sello de ALTO SECRETO |
| `sfx-revelar.mp3` | `reveal` | Al desclasificar un bloque censurado |
| `sfx-alerta.mp3` | `alert` | Aviso de nueva misión |
| `sfx-fanfarria.mp3` | `fanfare` | Diapositiva final |
| `sfx-click.mp3` | `click` | Botones |
| `sfx-tecla.mp3` | `type` | Tecleo del terminal (muy bajito) |
| `sfx-siguiente.mp3` | `next` | Avance genérico de diapositiva |

## Dónde conseguir sonidos libres
- freesound.org (requiere cuenta; revisa la licencia de cada archivo)
- pixabay.com/sound-effects (uso libre)

Busca en inglés: *spy*, *surveillance*, *computer beep*, *access granted*,
*suspense loop*, *heartbeat*, *typewriter*.
