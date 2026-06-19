const hashNumber = value => {
  let hash = 0;
  for (const char of String(value)) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  return Math.abs(hash);
};

export function getMarketValue(player) {
  const base = player.overall >= 88 ? 80000 : player.overall >= 84 ? 50000 : player.overall >= 80 ? 30000
    : player.overall >= 76 ? 18000 : player.overall >= 72 ? 10000 : player.overall >= 68 ? 5000 : 2000;
  const ageMod = player.age <= 23 ? 1.4 : player.age <= 27 ? 1.2 : player.age <= 30 ? 1 : player.age <= 33 ? .7 : .4;
  return Math.round(base * ageMod);
}

export function getPotential(player) {
  if (Number.isFinite(player.potential)) return player.potential;
  const room = player.age <= 20 ? 8 : player.age <= 23 ? 5 : player.age <= 26 ? 3 : 1;
  return Math.min(95, player.overall + Math.max(0, room - (hashNumber(player.id) % 3)));
}

export function enrichPlayerProfile(player, season = "2025") {
  const contractYears = player.age >= 32 ? 2 : 3 + (hashNumber(player.id) % 3);
  const marketValue = getMarketValue(player);
  return {
    ...player,
    potential: getPotential(player),
    contractEnd: player.contractEnd ?? String(Number(season) + contractYears),
    releaseClause: player.releaseClause ?? Math.round(marketValue * (1.5 + (hashNumber(`${player.id}:clause`) % 40) / 100)),
    seasonStartOverall: player.seasonStartOverall ?? player.overall,
    seasonStartValue: player.seasonStartValue ?? marketValue,
    careerHistory: player.careerHistory ?? [],
  };
}

function playerTeamAtFixture(playerId, fixture, game, fallbackTeamId) {
  const participatedForUser = fixture.participation?.starters?.includes(playerId)
    || fixture.participation?.finishers?.includes(playerId)
    || fixture.events?.some(event => event.type === "SUBSTITUTION" && (event.playerId === playerId || event.outPlayerId === playerId));
  if (participatedForUser && fixture.participation?.teamId) return fixture.participation.teamId;
  const transfers = (game.transfers ?? []).filter(item => item.player?.id === playerId).sort((a,b) => a.matchday - b.matchday);
  let currentTeam = transfers[0]?.type === "buy" ? transfers[0].fromTeamId : transfers[0]?.type === "sell" ? game.teamId : fallbackTeamId;
  transfers.filter(item => item.matchday <= fixture.matchday).forEach(item => {
    currentTeam = item.type === "buy" ? game.teamId : null;
  });
  return currentTeam;
}

export function getPlayerSeasonStats(player, game, teamId) {
  const seasonFixtures = game.fixtures?.filter(fixture => fixture.played) ?? [];
  let appearances = 0, starts = 0, minutes = 0, goals = 0, assists = 0, yellows = 0, reds = 0, cleanSheets = 0;
  const ratings = [];

  seasonFixtures.forEach(fixture => {
    const events = fixture.events ?? [];
    const playerEvents = events.filter(event => event.playerId === player.id || event.assistId === player.id);
    const participation = fixture.participation;
    const wasStarter = participation?.starters?.includes(player.id);
    const subIn = events.find(event => event.type === "SUBSTITUTION" && event.playerId === player.id);
    const subOut = events.find(event => event.type === "SUBSTITUTION" && event.outPlayerId === player.id);
    const fixtureTeam = playerTeamAtFixture(player.id, fixture, game, teamId);
    const teamPlayed = fixtureTeam && (fixture.homeTeamId === fixtureTeam || fixture.awayTeamId === fixtureTeam);
    const hasExactParticipation = Boolean(participation?.starters) && fixtureTeam === game.teamId;
    const appeared = hasExactParticipation ? (wasStarter || Boolean(subIn)) : Boolean(teamPlayed);
    if (!appeared) return;

    appearances++;
    if (wasStarter || (!hasExactParticipation && fixtureTeam !== game.teamId)) starts++;
    const playedMinutes = wasStarter ? (subOut?.minute ?? 90) : subIn ? Math.max(0, 90 - subIn.minute) : 90;
    minutes += playedMinutes;
    const matchGoals = events.filter(event => (event.type === "GOAL" || event.type === "PENALTY") && event.playerId === player.id).length;
    const matchAssists = events.filter(event => event.assistId === player.id).length;
    const matchYellows = events.filter(event => event.type === "YELLOW" && event.playerId === player.id).length;
    const matchReds = events.filter(event => event.type === "RED" && event.playerId === player.id).length;
    goals += matchGoals; assists += matchAssists; yellows += matchYellows; reds += matchReds;

    if (player.group === "POR" || player.pos === "POR") {
      const conceded = fixture.homeTeamId === fixtureTeam ? fixture.awayGoals : fixture.homeGoals;
      if (conceded === 0) cleanSheets++;
    }
    const won = fixtureTeam && ((fixture.homeTeamId === fixtureTeam && fixture.homeGoals > fixture.awayGoals) || (fixture.awayTeamId === fixtureTeam && fixture.awayGoals > fixture.homeGoals));
    const drew = fixture.homeGoals === fixture.awayGoals;
    ratings.push(Math.max(4, Math.min(10, 6.2 + (won ? .35 : drew ? .1 : -.25) + matchGoals * 1.15 + matchAssists * .7 - matchYellows * .2 - matchReds * 1.2)));
  });

  return {
    appearances, starts, minutes, goals, assists, cleanSheets, yellows, reds,
    averageRating: ratings.length ? (ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1) : "—",
  };
}

export function getRecentForm(player, game, teamId) {
  const recent = (game.fixtures ?? []).filter(f => f.played && (f.homeTeamId === teamId || f.awayTeamId === teamId)).slice(-5);
  if (!recent.length) return { label: "Sin datos", color: "#6b7280", score: 0 };
  let score = 0;
  recent.forEach(fixture => {
    const own = fixture.homeTeamId === teamId ? fixture.homeGoals : fixture.awayGoals;
    const rival = fixture.homeTeamId === teamId ? fixture.awayGoals : fixture.homeGoals;
    score += own > rival ? 2 : own === rival ? 1 : 0;
    score += (fixture.events ?? []).filter(event => event.playerId === player.id && (event.type === "GOAL" || event.type === "PENALTY")).length * 2;
    score += (fixture.events ?? []).filter(event => event.assistId === player.id).length;
  });
  return score >= 9 ? { label:"Excelente", color:"#22c55e", score } : score >= 6 ? { label:"Buena", color:"#84cc16", score } : score >= 3 ? { label:"Irregular", color:"#f59e0b", score } : { label:"Baja", color:"#ef4444", score };
}

export function getPlayerTags(player, stats, form, currentSeason) {
  const tags = [];
  const potential = getPotential(player);
  if (player.injured) tags.push({ icon:"🏥", label:"Lesionado", color:"#ef4444" });
  if (player.age <= 23 && potential - player.overall >= 4) tags.push({ icon:"💎", label:"Promesa", color:"#60a5fa" });
  if (player.overall >= 85) tags.push({ icon:"⭐", label:"Estrella", color:"#c9a84c" });
  if (form.label === "Excelente") tags.push({ icon:"🔥", label:"En forma", color:"#f97316" });
  if (player.overall > (player.seasonStartOverall ?? player.overall)) tags.push({ icon:"📈", label:"Progresando", color:"#22c55e" });
  if (stats.appearances >= 5 && Number(stats.averageRating) < 6) tags.push({ icon:"📉", label:"Bajo rendimiento", color:"#ef4444" });
  if (Number(player.contractEnd) <= Number(currentSeason) + 1) tags.push({ icon:"⚠", label:"Fin de contrato", color:"#f59e0b" });
  return tags;
}

export function getKeyAttributes(player) {
  const attrs = player.attrs ?? {};
  const avg = (...values) => Math.round(values.reduce((sum, value) => sum + (value ?? player.overall), 0) / values.length);
  if (player.group === "POR" || player.pos === "POR") return [
    ["Reflejos", attrs.porteria ?? player.overall], ["Colocación", avg(attrs.porteria, attrs.defensa)], ["Juego aéreo", avg(attrs.porteria, attrs.fisico)],
  ];
  if (player.group === "DEF") return [["Defensa", attrs.defensa], ["Marcaje", avg(attrs.defensa, attrs.ritmo)], ["Fuerza", attrs.fisico]];
  if (player.group === "MED") return [["Pase", attrs.pase], ["Visión", avg(attrs.pase, attrs.regate)], ["Técnica", attrs.regate]];
  return [["Finalización", attrs.tiro], ["Velocidad", attrs.ritmo], ["Regate", attrs.regate]];
}

export function createSeasonHistoryEntry(player, game, teamId, teamName) {
  return { season: String(game.season), clubId: teamId, clubName: teamName, ...getPlayerSeasonStats(player, game, teamId), overall: player.overall, marketValue: getMarketValue(player) };
}
