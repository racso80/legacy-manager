// Presentación compartida de noticias — usada por PCDashboardContent.jsx (carrusel)
// y PCNewsScreen.jsx (pantalla completa), para no duplicar estos mapas/heurísticas.

// Las noticias no guardan leagueId propio: se deriva del equipo mencionado (item.teamIds[0]),
// que ya refleja la liga actual del equipo (incluso tras un ascenso/descenso reciente).
// Si la noticia no menciona ningún equipo, se asume la liga del propio club del usuario.
export function resolveNewsLeagueId(item, game, teams) {
  const team = item.teamIds?.[0] ? teams.find(t => t.id === item.teamIds[0]) : null;
  return team?.leagueId ?? game.leagueId ?? "esp_primera";
}

export const NEWS_TYPE_ICON = { result: "⚽", standings: "📊", streak: "🔥", scorer: "🥇", performance: "⭐", transfer: "🔄", finance: "💶", injury: "🚑", board: "🤝", youth: "🌱", scouting: "🔎" };
export const NEWS_TYPE_LABEL = { result: "Liga", standings: "Liga", streak: "Liga", scorer: "Liga", performance: "Liga", transfer: "Mercado", finance: "Finanzas", injury: "Médico", board: "Directiva", youth: "Cantera", scouting: "Scouting" };
export const NEWS_META_TEXT = { result: "LaLiga", standings: "LaLiga", streak: "LaLiga", scorer: "LaLiga", performance: "LaLiga", transfer: "Mercado de fichajes", finance: "Finanzas del club", injury: "Parte médico", board: "Directiva del club", youth: "Academia", scouting: "Departamento de scouting" };

export function newsAccent(type) {
  if (type === "youth") return "#3ecf8e";
  if (type === "board") return "#c9a84c";
  return "var(--club-accent, #c9a84c)";
}

// Tipos ligados a una competición real (tienen sentido bajo un "1ª"/"2ª"); el resto
// (cantera, directiva, finanzas) son internos al club y se etiquetan por categoría.
const LEAGUE_LINKED_TYPES = new Set(["result", "standings", "streak", "scorer", "performance", "injury", "transfer", "scouting"]);
export function isLeagueLinkedNews(item) {
  return LEAGUE_LINKED_TYPES.has(item.type);
}
