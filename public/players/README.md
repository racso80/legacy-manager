# 📁 public/players/

Coloca aquí las fotos de los jugadores en formato PNG o JPG.

## Formato del nombre de archivo

El nombre del archivo debe coincidir exactamente con el `id` del jugador en `data.json`:

```
public/players/ath-20.png     → Nico Williams (Athletic)
public/players/rma-23.png     → Kylian Mbappé (Real Madrid)
public/players/bar-19.png     → Lamine Yamal (Barcelona)
```

## Tamaño recomendado

- **300×400px** o proporción **3:4**
- Formato: PNG con fondo transparente (ideal) o JPG
- Peso máximo: 150KB por foto

## Si no hay foto

Si un jugador no tiene foto, el juego muestra automáticamente un avatar con sus iniciales.
No es necesario que todos los jugadores tengan foto — el juego funciona igual.

## IDs de jugadores por equipo

Los IDs siguen el patrón `{short_team}-{número}`:
- Athletic: `ath-1`, `ath-2`, ..., `ath-23`
- Real Madrid: `rma-1`, `rma-2`, ..., `rma-24`
- Barcelona: `bar-1`, `bar-2`, ..., `bar-20`
- Atlético: `atm-1`, `atm-2`, ..., `atm-25`
- (ver `src/data/data.json` para el listado completo)
