/**
 * promotionEngine.js
 *
 * Logica pura de ascensos/descensos entre esp_primera y esp_segunda al cierre
 * de temporada. No conoce React ni el motor de partido: App.jsx aporta las
 * plantillas (REAL_SQUADS) y, para el playoff interactivo del usuario, el
 * resultado ya jugado.
 */

function sortStandings(standings) {
  return [...(standings ?? [])].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
}

export function getRelegationCandidates(standings, leagueConfig) {
  const sorted = sortStandings(standings);
  const n = leagueConfig?.relegationSpots ?? 3;
  return sorted.slice(Math.max(0, sorted.length - n)).map(s => s.teamId);
}

export function getDirectPromotionCandidates(standings, leagueConfig) {
  const sorted = sortStandings(standings);
  const n = leagueConfig?.promotionSpots ?? 0;
  return sorted.slice(0, n).map(s => s.teamId);
}

// Equipos en zona de playoff de ascenso (p.ej. 3º-6º), ordenados por posicion final.
export function getPlayoffCandidates(standings, leagueConfig) {
  const sorted = sortStandings(standings);
  const start = leagueConfig?.promotionSpots ?? 0;
  const count = leagueConfig?.playoffSpots ?? 0;
  return sorted.slice(start, start + count).map(s => s.teamId);
}

// El emparejamiento clasico de un playoff a 4: mejor puesto vs peor puesto,
// segundo mejor vs segundo peor. El primero de cada pareja hace de local.
export function buildPlayoffPairing(candidates = []) {
  const [p3, p4, p5, p6] = candidates;
  return {
    semiA: { home: p3 ?? null, away: p6 ?? null },
    semiB: { home: p4 ?? null, away: p5 ?? null },
  };
}
