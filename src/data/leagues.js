/**
 * leagues.js
 *
 * Configuracion central de ligas/divisiones. Toda logica de fixtures,
 * clasificacion, ascensos/descensos debe derivar sus reglas de aqui en vez
 * de asumir un numero fijo de equipos o una unica division.
 */

export const LEAGUES = [
  {
    id: "esp_primera",
    name: "LaLiga Santander",
    shortName: "LaLiga",
    country: "ES",
    countryName: "España",
    flag: "🇪🇸",
    tier: 1,
    teamsCount: 20,
    promotionSpots: 0,
    playoffSpots: 0,
    relegationSpots: 3,
    hasPlayoff: false,
    playoffDescription: "",
  },
  {
    id: "esp_segunda",
    name: "LaLiga Hypermotion",
    shortName: "LaLiga Hypermotion",
    country: "ES",
    countryName: "España",
    flag: "🇪🇸",
    tier: 2,
    teamsCount: 22,
    promotionSpots: 2,
    playoffSpots: 4,
    relegationSpots: 4,
    hasPlayoff: true,
    playoffDescription: "3º-6º disputan eliminatoria a doble partido. El ganador asciende.",
  },
];

export const getLeagueById = id => LEAGUES.find(l => l.id === id);
export const getLeaguesByCountry = country => LEAGUES.filter(l => l.country === country);

/**
 * Numero total de jornadas de una liga (ida y vuelta contra todos los rivales),
 * derivado de teamsCount en vez de asumir siempre 38 (20 equipos).
 */
export function getTotalMatchdays(league) {
  const teamsCount = league?.teamsCount ?? 20;
  return (teamsCount - 1) * 2;
}

/**
 * Zona de clasificacion (ascenso/Europa/descenso) para una posicion dada,
 * derivada de la config de la liga en vez de asumir siempre las reglas de
 * Primera. `league` es un objeto LEAGUES (o game.leagueConfig).
 */
export function getStandingsZone(pos, total, league) {
  const tier = league?.tier ?? 1;
  const relegationSpots = league?.relegationSpots ?? (tier === 2 ? 4 : 3);
  const relegationStart = total - relegationSpots + 1;

  if (tier === 2) {
    const promotionSpots = league?.promotionSpots ?? 2;
    const playoffSpots = league?.playoffSpots ?? 4;
    if (pos <= promotionSpots) return { key: "promotion", label: "Ascenso directo", color: "#22c55e" };
    if (pos <= promotionSpots + playoffSpots) return { key: "playoff", label: "Playoff de ascenso", color: "#4ade80" };
    if (pos >= relegationStart) return { key: "relegation", label: "Descenso", color: "#ef4444" };
    return { key: "mid", label: "Liga", color: "#6b7280" };
  }

  // tier 1 (esp_primera y por defecto)
  if (pos <= 4) return { key: "cl", label: "Champions League", color: "#22c55e" };
  if (pos <= 6) return { key: "el", label: "Europa League", color: "#3b82f6" };
  if (pos >= relegationStart) return { key: "relegation", label: "Descenso", color: "#ef4444" };
  return { key: "mid", label: "Liga", color: "#6b7280" };
}
