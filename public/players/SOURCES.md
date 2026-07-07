# Fuentes de las fotos de jugadores

Copias locales descargadas el 07-07-2026 desde la CDN pública de API-Sports
(`media.api-sports.io`), vía la API real (`v3.football.api-sports.io`, plan
free). Mismo aviso de licencia que `public/teams/SOURCES.md`: las fotos
pertenecen a sus respectivos titulares (agencias/clubes); son de uso
identificativo, verifica los permisos antes de una distribución comercial.

## Método

Para cada equipo se consultó `GET /players/squads?team={id}` (endpoint sin
restricción de temporada en el plan free) y se emparejó cada jugador interno
(`_p()` en `App.jsx` / `segundaSquads.js`) contra la plantilla real devuelta
por nombre (normalizando acentos/mayúsculas, comparando apellido y, cuando la
API abrevia el nombre de pila como `"J. Oblak"`, la inicial). Los casos
ambiguos (dos jugadores del mismo apellido en la plantilla, p.ej. "Iker Muñoz"
/ "Víctor Muñoz" en Osasuna) se resolvieron a mano comparando edad/dorsal/
posición contra el jugador real conocido. Solo se descargó cuando hubo una
coincidencia de confianza; no se adivinó ninguna foto.

Nota técnica: algunas imágenes de la CDN llegan codificadas como JPEG aunque
la URL/extensión sea `.png` (confirmado con `file`); esto no afecta al
renderizado (`<img>` no valida la codificación interna contra la extensión).

## Cobertura

**Primera (416 jugadores internos, 20 equipos):** 379/416 con foto.
`athletic` (23/23) y `barcelona` (20/20) tenían fotos reales de una
descarga anterior (commit `70c8112` / `684dc6b`) en un formato distinto (PNG
639×900 con fondo transparente / WebP 670×790) al del resto de equipos (PNG
150×150 de `media.api-sports.io`); el 07-07-2026 se volvieron a descargar
por el mismo proceso y se sobrescribieron para unificar formato/dimensiones
con el resto de la plantilla. La única excepción es `bar-7.png` (Pau
Cubarsí): sin coincidencia en el endpoint de plantilla del plan free, se
dejó el archivo antiguo (WebP 670×790) en vez de borrar una foto que sí
funciona — es el único archivo de jugador que aún no comparte el formato
150×150 del resto. El resto de jugadores sin foto son internos ficticios/de
relleno que no tienen contrapartida en la plantilla real vigente de la API
(frecuente en `villarreal`, cuya plantilla interna incluye varias salidas
reales recientes — Pau Torres, Albiol, Bailly, Chukwueze, etc. — que ya no
aparecen en el registro actual del club).

**Segunda (14 "anchors" — jugadores reales insertados en plantillas
procedurales, ver `ANCHORS` en `src/data/segundaSquads.js`):** 5/14 con foto
(`zaragoza-anchor`, `racing-anchor`, `udlaspalmas-anchor`, `eibar-anchor`,
`realvalladolid-anchor`). Los otros 9 anchors no aparecieron en el endpoint
de plantilla del plan free (jugador no registrado en el roster consultado) y
se dejaron sin foto — el juego cae automáticamente al avatar de iniciales
(`PlayerAvatar.jsx`).

Los 8 equipos de Segunda sin anchor (`ceuta`, `almeria`, `burgos`,
`castellon`, `mirandes`, `leonesa`, `huesca`, `realsociedad_b`) son
plantillas 100% ficticias/procedurales sin ningún jugador real asociado —
no se intentó ningún emparejamiento de foto para ellas. `ceuta` tampoco tiene
foto de escudo real en la API de todas formas (la plantilla del club no
devuelve resultados), pero eso es irrelevante aquí porque no es un equipo
anchor.
