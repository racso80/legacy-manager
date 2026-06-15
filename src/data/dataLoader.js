/**
 * dataLoader.js
 *
 * Fusiona los datos externos (data.json exportado desde el Admin)
 * con los datos integrados en el bundle como fallback.
 *
 * Prioridad:
 *   1. data.json en /public/data/data.json (actualizable sin redeploy)
 *   2. Datos integrados en BUILT_IN_TEAMS / BUILT_IN_SQUADS
 */

// ─── DATOS INTEGRADOS (fallback) ─────────────────────────────────────────────
// Estos se usan si no existe data.json en el servidor.
// Para actualizar solo jugadores/fotos sin redeploy, usa el Admin y sube data.json.

export const BUILT_IN_TEAMS = [
  { id:"athletic",    name:"Athletic Club",      short:"ATH", color:"#c9a84c", stadium:"San Mamés",                  budget:48,  avg:79, obj:"Top 6",       city:"Bilbao"        },
  { id:"atletico",    name:"Atlético Madrid",     short:"ATM", color:"#c8102e", stadium:"Civitas Metropolitano",      budget:120, avg:85, obj:"Campeón",     city:"Madrid"        },
  { id:"barcelona",   name:"FC Barcelona",        short:"BAR", color:"#a50044", stadium:"Spotify Camp Nou",          budget:180, avg:88, obj:"Campeón",     city:"Barcelona"     },
  { id:"betis",       name:"Real Betis",          short:"BET", color:"#00a650", stadium:"Benito Villamarín",         budget:65,  avg:78, obj:"Top 6",       city:"Sevilla"       },
  { id:"celta",       name:"Celta de Vigo",       short:"CEL", color:"#6cb4e4", stadium:"Abanca Balaídos",           budget:38,  avg:75, obj:"Mitad tabla", city:"Vigo"          },
  { id:"espanyol",    name:"RCD Espanyol",        short:"ESP", color:"#005395", stadium:"Stage Front Stadium",       budget:32,  avg:74, obj:"Permanencia", city:"Barcelona"     },
  { id:"getafe",      name:"Getafe CF",           short:"GET", color:"#005ca9", stadium:"Coliseum",                  budget:28,  avg:73, obj:"Permanencia", city:"Getafe"        },
  { id:"girona",      name:"Girona FC",           short:"GIR", color:"#b22222", stadium:"Montilivi",                 budget:44,  avg:77, obj:"Top 10",      city:"Girona"        },
  { id:"laspalmas",   name:"Elche CF",            short:"ELC", color:"#006400", stadium:"Martínez Valero",           budget:22,  avg:73, obj:"Permanencia", city:"Elche"         },
  { id:"leganes",     name:"Levante UD",          short:"LEV", color:"#003DA5", stadium:"Estadio Ciudad de Valencia",budget:24,  avg:72, obj:"Permanencia", city:"Valencia"      },
  { id:"mallorca",    name:"RCD Mallorca",        short:"MAL", color:"#c8102e", stadium:"Visit Mallorca Estadi",     budget:30,  avg:74, obj:"Permanencia", city:"Palma"         },
  { id:"osasuna",     name:"CA Osasuna",          short:"OSA", color:"#c8102e", stadium:"El Sadar",                  budget:32,  avg:74, obj:"Mitad tabla", city:"Pamplona"      },
  { id:"rayo",        name:"Rayo Vallecano",      short:"RAY", color:"#c8102e", stadium:"Estadio de Vallecas",       budget:25,  avg:74, obj:"Permanencia", city:"Madrid"        },
  { id:"realmadrid",  name:"Real Madrid",         short:"RMA", color:"#ffd700", stadium:"Santiago Bernabéu",         budget:250, avg:90, obj:"Campeón",     city:"Madrid"        },
  { id:"realsociedad",name:"Real Sociedad",       short:"RSO", color:"#003DA5", stadium:"Reale Arena",               budget:72,  avg:79, obj:"Top 6",       city:"San Sebastián" },
  { id:"sevilla",     name:"Sevilla FC",          short:"SEV", color:"#e8001c", stadium:"Ramón Sánchez-Pizjuán",     budget:85,  avg:76, obj:"Top 10",      city:"Sevilla"       },
  { id:"valencia",    name:"Valencia CF",         short:"VAL", color:"#ff7f00", stadium:"Mestalla",                  budget:52,  avg:75, obj:"Mitad tabla", city:"Valencia"      },
  { id:"valladolid",  name:"Real Oviedo",         short:"OVI", color:"#003DA5", stadium:"Carlos Tartiere",           budget:18,  avg:72, obj:"Permanencia", city:"Oviedo"        },
  { id:"villarreal",  name:"Villarreal CF",       short:"VIL", color:"#ffd700", stadium:"Estadio de la Cerámica",    budget:78,  avg:79, obj:"Top 6",       city:"Villarreal"    },
  { id:"alaves",      name:"Deportivo Alavés",    short:"ALA", color:"#007ac2", stadium:"Mendizorroza",              budget:22,  avg:72, obj:"Permanencia", city:"Vitoria"       },
]

// El objeto de plantillas se importa desde el archivo generado por el Admin
// (o se usa el integrado si no existe data.json)
// Para no duplicar los ~500 jugadores aquí, el LegacyManager.jsx los lleva integrados
// y este loader simplemente los sobreescribe si hay JSON externo.
export const BUILT_IN_SQUADS = {} // Se rellena desde LegacyManager.jsx via REAL_SQUADS

/**
 * Resuelve los datos finales a usar en el juego.
 * @param {Object|null} externalData - JSON cargado desde /data/data.json, o null
 * @returns {{ teams: Team[], players: Record<string, Player[]> }}
 */
export function resolveGameData(externalData) {
  if (!externalData) {
    return { teams: BUILT_IN_TEAMS, players: BUILT_IN_SQUADS }
  }

  // Fusionar: datos externos tienen prioridad sobre los integrados
  const teams   = externalData.teams   ?? BUILT_IN_TEAMS
  const players = externalData.players ?? BUILT_IN_SQUADS

  // Asegurarse de que los jugadores tienen los campos de estado del juego
  // (fatigue, morale, etc.) en caso de que el JSON externo solo tenga datos base
  const enrichedPlayers = {}
  teams.forEach(team => {
    enrichedPlayers[team.id] = (players[team.id] ?? []).map(p => ({
      // Estado de juego con valores por defecto seguros
      fatigue:     typeof p.fatigue     === 'number' ? p.fatigue     : Math.floor(Math.random() * 20),
      morale:      typeof p.morale      === 'number' ? p.morale      : 70 + Math.floor(Math.random() * 25),
      injured:     p.injured    ?? false,
      injuryGames: p.injuryGames ?? 0,
      suspended:   p.suspended  ?? false,
      suspGames:   p.suspGames  ?? 0,
      yellowCards: p.yellowCards ?? 0,
      salary:      p.salary ?? (p.overall >= 88 ? 250 : p.overall >= 84 ? 150 : p.overall >= 80 ? 90 : p.overall >= 76 ? 55 : p.overall >= 72 ? 30 : 16),
      imageUrl:    p.imageUrl ?? '',
      ...p, // datos del JSON tienen prioridad sobre los defaults
      // Pero forzamos los numéricos a ser números válidos
      fatigue:     typeof p.fatigue === 'number' && !isNaN(p.fatigue) ? p.fatigue : Math.floor(Math.random() * 20),
      morale:      typeof p.morale  === 'number' && !isNaN(p.morale)  ? p.morale  : 70 + Math.floor(Math.random() * 25),
      overall:     typeof p.overall === 'number' && !isNaN(p.overall) ? p.overall : 72,
    }))
  })

  return { teams, players: enrichedPlayers }
}

/**
 * Resuelve la URL de la foto de un jugador.
 * Primero intenta la imageUrl del JSON, luego la carpeta /players/{id}.png
 * Si no existe ninguna, devuelve null (el juego mostrará el avatar).
 */
export function resolvePlayerPhoto(player) {
  if (player.imageUrl && player.imageUrl.startsWith('http')) return player.imageUrl
  if (player.imageUrl && player.imageUrl.length > 0) return player.imageUrl
  // Intentar foto automática por ID desde carpeta pública
  return `/players/${player.id}.png`
}
