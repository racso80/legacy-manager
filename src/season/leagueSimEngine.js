/**
 * leagueSimEngine.js
 *
 * Simula, de forma pura, las jornadas de una liga completa usando el mismo
 * simAIGame que ya resuelve los partidos IA-vs-IA de la liga del usuario
 * (App.jsx). Se usa tanto para avanzar cada liga "de fondo" jornada a
 * jornada como para adelantarla de golpe (migracion de guardados antiguos,
 * o alcanzar el total de jornadas de una liga mas larga al cierre de
 * temporada).
 *
 * simAIGame se recibe por parametro (en vez de importarse) para evitar un
 * import circular con App.jsx, donde vive definido junto al resto del motor
 * de partido.
 */

function applyMatchdayResult(standings, fixture) {
  const hi = standings.findIndex(s => s.teamId === fixture.homeTeamId);
  const ai = standings.findIndex(s => s.teamId === fixture.awayTeamId);
  if (hi === -1 || ai === -1) return;
  const hg = fixture.homeGoals, ag = fixture.awayGoals;
  standings[hi].played++; standings[ai].played++;
  standings[hi].goalsFor += hg; standings[hi].goalsAgainst += ag;
  standings[ai].goalsFor += ag; standings[ai].goalsAgainst += hg;
  standings[hi].goalDifference = standings[hi].goalsFor - standings[hi].goalsAgainst;
  standings[ai].goalDifference = standings[ai].goalsFor - standings[ai].goalsAgainst;
  if (hg > ag) { standings[hi].won++; standings[hi].points += 3; standings[ai].lost++; }
  else if (hg < ag) { standings[ai].won++; standings[ai].points += 3; standings[hi].lost++; }
  else { standings[hi].drawn++; standings[ai].drawn++; standings[hi].points++; standings[ai].points++; }
}

// Simula todos los partidos sin jugar de la jornada actual de una liga y
// devuelve la liga actualizada junto con los fixtures recien simulados
// (para que el llamador pueda aplicarles efectos secundarios, p.ej. desgaste
// fisico de la plantilla IA).
export function simulateLeagueMatchday(league, TEAMS, simAIGame) {
  const { fixtures, standings, matchday } = league;
  const simulatedFixtures = [];
  const newFixtures = fixtures.map(f => {
    if (f.matchday !== matchday || f.played) return f;
    const homeTeam = TEAMS.find(t => t.id === f.homeTeamId);
    const awayTeam = TEAMS.find(t => t.id === f.awayTeamId);
    if (!homeTeam || !awayTeam) return f;
    const result = simAIGame(homeTeam, awayTeam, fixtures);
    const played = { ...f, played: true, homeGoals: result.homeGoals, awayGoals: result.awayGoals, events: result.events ?? [] };
    simulatedFixtures.push(played);
    return played;
  });
  const newStandings = standings.map(s => ({ ...s }));
  simulatedFixtures.forEach(f => applyMatchdayResult(newStandings, f));
  return {
    league: { ...league, fixtures: newFixtures, standings: newStandings, matchday: matchday + 1 },
    simulatedFixtures,
  };
}

// Adelanta una liga jornada a jornada hasta targetMatchday (o hasta que se le
// acaben las jornadas disponibles, si su calendario es mas corto). Usado en
// la migracion de guardados antiguos y en el cierre de temporada para ponerse
// al dia con ligas de calendario mas largo que el de la liga del usuario.
export function simulateLeagueToMatchday(league, TEAMS, simAIGame, targetMatchday) {
  let current = league;
  const allSimulatedFixtures = [];
  while (current.matchday < targetMatchday) {
    const hasFixturesForMatchday = current.fixtures.some(f => f.matchday === current.matchday);
    if (!hasFixturesForMatchday) break;
    const { league: updated, simulatedFixtures } = simulateLeagueMatchday(current, TEAMS, simAIGame);
    current = updated;
    allSimulatedFixtures.push(...simulatedFixtures);
  }
  return { league: current, simulatedFixtures: allSimulatedFixtures };
}
