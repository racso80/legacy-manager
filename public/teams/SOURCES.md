# Fuentes de los escudos

Copias locales descargadas el 20-06-2026 desde la CDN pública de API-Sports (`media.api-sports.io`). Los nombres de archivo corresponden a los IDs históricos usados internamente por Legacy Manager.

| Archivo | Club 2025/26 | Fuente |
|---|---|---|
| `athletic.png` | Athletic Club | `football/teams/531.png` |
| `atletico.png` | Atlético de Madrid | `football/teams/530.png` |
| `barcelona.png` | FC Barcelona | `football/teams/529.png` |
| `betis.png` | Real Betis | `football/teams/543.png` |
| `celta.png` | RC Celta | `football/teams/538.png` |
| `espanyol.png` | RCD Espanyol | `football/teams/540.png` |
| `getafe.png` | Getafe CF | `football/teams/546.png` |
| `girona.png` | Girona FC | `football/teams/547.png` |
| `laspalmas.png` | Elche CF | `football/teams/797.png` |
| `leganes.png` | Levante UD | `football/teams/539.png` |
| `mallorca.png` | RCD Mallorca | `football/teams/798.png` |
| `osasuna.png` | CA Osasuna | `football/teams/727.png` |
| `rayo.png` | Rayo Vallecano | `football/teams/728.png` |
| `realmadrid.png` | Real Madrid | `football/teams/541.png` |
| `realsociedad.png` | Real Sociedad | `football/teams/548.png` |
| `sevilla.png` | Sevilla FC | `football/teams/536.png` |
| `valencia.png` | Valencia CF | `football/teams/532.png` |
| `valladolid.png` | Real Oviedo | `football/teams/718.png` |
| `villarreal.png` | Villarreal CF | `football/teams/533.png` |
| `alaves.png` | Deportivo Alavés | `football/teams/542.png` |

Copias locales descargadas el 06-07-2026 desde la misma CDN pública de API-Sports (`media.api-sports.io`), vía la API real (`v3.football.api-sports.io`, plan free) — IDs verificados por nombre de equipo (`GET /teams?name=...`), no adivinados. Corresponden a los 22 clubes de LaLiga Hypermotion (Segunda División, esp_segunda) 2025/26 listados en `src/data/segundaTeams.js`.

| Archivo | Club 2025/26 | Fuente |
|---|---|---|
| `ceuta.png` | AD Ceuta FC | `football/teams/5255.png` |
| `albacete.png` | Albacete Balompié | `football/teams/722.png` |
| `almeria.png` | UD Almería | `football/teams/723.png` |
| `burgos.png` | Burgos CF | `football/teams/9580.png` |
| `cadiz.png` | Cádiz CF | `football/teams/724.png` |
| `castellon.png` | CD Castellón | `football/teams/5254.png` |
| `leganes_b.png` | CD Leganés | `football/teams/537.png` |
| `mirandes.png` | CD Mirandés | `football/teams/799.png` |
| `cordoba.png` | Córdoba CF | `football/teams/713.png` |
| `leonesa.png` | Cultural y Deportiva Leonesa | `football/teams/725.png` |
| `eibar.png` | SD Eibar | `football/teams/545.png` |
| `andorra.png` | FC Andorra | `football/teams/1110.png` |
| `granada.png` | Granada CF | `football/teams/715.png` |
| `huesca.png` | SD Huesca | `football/teams/726.png` |
| `malaga.png` | Málaga CF | `football/teams/535.png` |
| `deportivo.png` | RC Deportivo de La Coruña | `football/teams/544.png` |
| `racing.png` | Real Racing Club de Santander | `football/teams/4665.png` |
| `realsociedad_b.png` | Real Sociedad B (Real Sociedad II) | `football/teams/9585.png` |
| `sporting.png` | Real Sporting de Gijón | `football/teams/731.png` |
| `realvalladolid.png` | Real Valladolid CF | `football/teams/720.png` |
| `zaragoza.png` | Real Zaragoza | `football/teams/732.png` |
| `udlaspalmas.png` | UD Las Palmas | `football/teams/534.png` |

Notas de desambiguación: `mirandes.png` y `udlaspalmas.png` tenían un segundo resultado homónimo en países distintos (Mirandês de Portugal id 10148, Las Palmas de Perú id 12258) — se usó siempre el club español. `leonesa.png` y `realsociedad_b.png` no aparecían en el listado de Segunda 2024 (temporada más reciente accesible en el plan free); se localizaron vía el listado de Primera División RFEF Grupo 1 2024, la categoría de la que ascendieron para 2025/26.

Los escudos y marcas pertenecen a sus respectivos clubes. Verifica los permisos de uso antes de una distribución comercial.
