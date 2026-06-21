export const NEWS_IMPORTANCE = {
  low: { label: "Baja", color: "#22c55e", rank: 1 },
  medium: { label: "Media", color: "#eab308", rank: 2 },
  high: { label: "Alta", color: "#f97316", rank: 3 },
  critical: { label: "Muy alta", color: "#ef4444", rank: 4 },
};

export const NEWS_FILTERS = [
  { id: "club", label: "📌 Club" },
  { id: "league", label: "🏆 Liga" },
  { id: "market", label: "💰 Mercado" },
  { id: "youth", label: "🌱 Cantera" },
  { id: "board", label: "🏛 Directiva" },
];

const TYPE_CATEGORY = {
  result: "league",
  standings: "league",
  streak: "league",
  scorer: "league",
  performance: "league",
  transfer: "market",
  injury: "league",
  finance: "board",
  board: "board",
  youth: "youth",
  scouting: "market",
};

const importanceRank = importance => NEWS_IMPORTANCE[importance]?.rank ?? 1;
const seasonKey = season => `${season}/${String(Number(season) + 1).slice(-2)}`;
const ordinal = position => `${position}.ª`;
const money = valueK => valueK >= 1000 ? `€${(valueK / 1000).toFixed(valueK % 1000 === 0 ? 0 : 1)}M` : `€${valueK}K`;

function stableId(fingerprint) {
  let hash = 2166136261;
  for (let i = 0; i < fingerprint.length; i++) {
    hash ^= fingerprint.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `news_${(hash >>> 0).toString(36)}`;
}

function createNews({ type, title, summary = "", importance = "low", season, matchday, teamIds = [], playerIds = [], userTeamId, fingerprint, metadata = {} }) {
  const key = `${season}:${matchday ?? "na"}:${type}:${fingerprint}`;
  const clubRelated = teamIds.includes(userTeamId) || metadata.userClub === true;
  return {
    id: stableId(key),
    fingerprint: key,
    type,
    category: TYPE_CATEGORY[type] ?? "league",
    title,
    summary,
    importance,
    season: String(season),
    seasonLabel: seasonKey(season),
    matchday: matchday ?? null,
    createdAt: new Date().toISOString(),
    teamIds: [...new Set(teamIds.filter(Boolean))],
    playerIds: [...new Set(playerIds.filter(Boolean))],
    clubRelated,
    featured: metadata.featured === true || importance === "critical",
    archived: importanceRank(importance) >= importanceRank("high") || type === "transfer",
    metadata,
  };
}

export function mergeNews(existing = [], incoming = []) {
  const byFingerprint = new Map(existing.map(item => [item.fingerprint ?? item.id, item]));
  incoming.forEach(item => byFingerprint.set(item.fingerprint ?? item.id, item));
  return [...byFingerprint.values()].sort(sortNews);
}

export function sortNews(a, b) {
  const seasonDiff = Number(b.season ?? 0) - Number(a.season ?? 0);
  if (seasonDiff) return seasonDiff;
  const dayDiff = Number(b.matchday ?? 0) - Number(a.matchday ?? 0);
  if (dayDiff) return dayDiff;
  const importanceDiff = importanceRank(b.importance) - importanceRank(a.importance);
  if (importanceDiff) return importanceDiff;
  return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
}

export function getFilteredNews(news = [], filter = "club", season = "all", context = {}) {
  return news.filter(item => {
    if (season !== "all" && String(item.season) !== String(season)) return false;
    if (filter === "all") return true;
    if (filter === "club") return item.clubRelated;
    if (filter === "league") return !item.clubRelated && ["result","standings","streak","scorer","performance","injury"].includes(item.type);
    if (filter === "market") return ["transfer","scouting"].includes(item.type);
    if (filter === "youth") return item.type === "youth" || item.metadata?.academy === true;
    if (filter === "board") return ["board","finance"].includes(item.type);
    return item.category === filter;
  }).sort(filter === "club" && context.game ? (a,b)=>getNewsRelevance(b,context)-getNewsRelevance(a,context)||sortNews(a,b) : sortNews);
}

function positions(standings = []) {
  const sorted = [...standings].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
  return Object.fromEntries(sorted.map((row, index) => [row.teamId, index + 1]));
}

export function getDirectRivalIds(game,radius=2){
  if(!game?.standings?.length)return[];
  const table=[...game.standings].sort((a,b)=>b.points-a.points||b.goalDifference-a.goalDifference||b.goalsFor-a.goalsFor);
  const index=table.findIndex(item=>item.teamId===game.teamId);
  if(index<0)return[];
  return table.filter((item,itemIndex)=>item.teamId!==game.teamId&&Math.abs(itemIndex-index)<=radius).map(item=>item.teamId);
}

export function getNewsRelevance(item,{game,userPlayerIds}={}){
  if(!item)return 0;
  const ownPlayers=userPlayerIds instanceof Set?userPlayerIds:new Set(userPlayerIds??(game?.players??[]).map(player=>player.id));
  const directRivals=new Set(getDirectRivalIds(game));
  const ownPlayer=(item.playerIds??[]).some(id=>ownPlayers.has(id));
  const directRival=!item.clubRelated&&(item.teamIds??[]).some(id=>directRivals.has(id));
  let score=item.clubRelated?100:ownPlayer?80:item.metadata?.academy?70:directRival?60:20;
  if(["injury","transfer","youth","board"].includes(item.type))score+=12;
  score+=(importanceRank(item.importance)-1)*6;
  if(item.featured||item.importance==="critical")score+=14;
  if(game&&String(item.season)===String(game.season))score+=Math.max(0,18-Math.max(0,(game.matchday??1)-(item.matchday??0))*3);
  return score;
}

export function isNewsStillCurrent(item,game){
  if(!item||!game)return false;
  if(item.type==="standings"&&Number.isFinite(Number(item.metadata?.newPosition))){
    const teamId=item.teamIds?.[0];
    const table=[...(game.standings??[])].sort((a,b)=>b.points-a.points||b.goalDifference-a.goalDifference||b.goalsFor-a.goalsFor);
    const currentPosition=table.findIndex(row=>row.teamId===teamId)+1;
    if(!currentPosition||currentPosition!==Number(item.metadata.newPosition))return false;
  }
  if(item.type==="injury"&&item.metadata?.injuryType&&item.playerIds?.[0]){
    const player=game.players?.find(candidate=>candidate.id===item.playerIds[0]);
    if(player&&!player.injured&&!["injured","recovery"].includes(player.medical?.phase))return false;
  }
  return true;
}

export function getDashboardNews(news=[],game,limit=3){
  if(!game)return[];
  const currentSeason=String(game.season);
  const ownPlayers=new Set((game.players??[]).map(player=>player.id));
  const directRivals=new Set(getDirectRivalIds(game));
  return news.filter(item=>{
    if(String(item.season)!==currentSeason)return false;
    if(!isNewsStillCurrent(item,game))return false;
    const age=Math.max(0,(game.matchday??1)-(item.matchday??0));
    const contextRelevant=item.clubRelated||(item.playerIds??[]).some(id=>ownPlayers.has(id))||(item.teamIds??[]).some(id=>directRivals.has(id));
    return contextRelevant&&(age<=8||item.featured||item.importance==="critical");
  }).map(item=>({...item,relevanceScore:getNewsRelevance(item,{game}),featured:item.featured||item.importance==="critical"}))
    .sort((a,b)=>b.relevanceScore-a.relevanceScore||sortNews(a,b)).slice(0,limit);
}

function resultFor(fixture, teamId) {
  const home = fixture.homeTeamId === teamId;
  const own = home ? fixture.homeGoals : fixture.awayGoals;
  const rival = home ? fixture.awayGoals : fixture.homeGoals;
  return own > rival ? "W" : own < rival ? "L" : "D";
}

function currentStreak(fixtures, teamId) {
  const results = fixtures
    .filter(f => f.played && (f.homeTeamId === teamId || f.awayTeamId === teamId))
    .sort((a, b) => b.matchday - a.matchday)
    .map(f => resultFor(f, teamId));
  if (!results.length) return { result: null, count: 0 };
  return { result: results[0], count: results.findIndex(r => r !== results[0]) === -1 ? results.length : results.findIndex(r => r !== results[0]) };
}

function previousStreak(fixtures, teamId, matchday) {
  return currentStreak(fixtures.filter(f => f.matchday < matchday), teamId);
}

function scorerTable(fixtures = [], playerLookup = {}) {
  const totals = new Map();
  fixtures.filter(f => f.played).forEach(fixture => {
    fixture.events?.filter(e => (e.type === "GOAL" || e.type === "PENALTY") && e.playerId).forEach(event => {
      const teamId = event.team === "home" ? fixture.homeTeamId : event.team === "away" ? fixture.awayTeamId : null;
      const player = playerLookup[event.playerId] ?? {};
      const current = totals.get(event.playerId) ?? { playerId: event.playerId, name: player.name ?? "Jugador desconocido", teamId, goals: 0 };
      current.goals += 1;
      totals.set(event.playerId, current);
    });
  });
  return [...totals.values()].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
}

export function buildPlayerLookup(teams = [], squads = {}, userPlayers = [], userTeamId) {
  const lookup = {};
  teams.forEach(team => (squads[team.id] ?? []).forEach(player => { lookup[player.id] = { ...player, teamId: team.id }; }));
  userPlayers.forEach(player => { lookup[player.id] = { ...player, teamId: userTeamId }; });
  return lookup;
}

export function generateMatchdayNews({ beforeFixtures, afterFixtures, beforeStandings, afterStandings, matchday, season, teams, userTeamId, playerLookup }) {
  const stories = [];
  const teamById = Object.fromEntries(teams.map(team => [team.id, team]));
  const dayFixtures = afterFixtures.filter(f => f.matchday === matchday && f.played);
  const oldPositions = positions(beforeStandings);
  const newPositions = positions(afterStandings);

  dayFixtures.forEach(fixture => {
    const home = teamById[fixture.homeTeamId];
    const away = teamById[fixture.awayTeamId];
    if (!home || !away) return;
    const draw = fixture.homeGoals === fixture.awayGoals;
    const winner = fixture.homeGoals > fixture.awayGoals ? home : away;
    const loser = fixture.homeGoals > fixture.awayGoals ? away : home;
    const userInvolved = [home.id, away.id].includes(userTeamId);
    stories.push(createNews({
      type: "result",
      title: draw
        ? `${home.name} y ${away.name} firman tablas (${fixture.homeGoals}-${fixture.awayGoals})`
        : `${winner.name} vence a ${loser.name} (${fixture.homeGoals}-${fixture.awayGoals})`,
      summary: `Resultado correspondiente a la jornada ${matchday}.`,
      importance: userInvolved || Math.abs(fixture.homeGoals - fixture.awayGoals) >= 3 ? "high" : "low",
      season, matchday, teamIds: [home.id, away.id], userTeamId,
      fingerprint: `result:${fixture.id}`,
      metadata: { fixtureId: fixture.id, score: `${fixture.homeGoals}-${fixture.awayGoals}` },
    }));

    const goalEvents = fixture.events?.filter(e => (e.type === "GOAL" || e.type === "PENALTY") && e.playerId) ?? [];
    const goalCounts = goalEvents.reduce((acc, event) => ({ ...acc, [event.playerId]: (acc[event.playerId] ?? 0) + 1 }), {});
    Object.entries(goalCounts).filter(([, goals]) => goals >= 2).forEach(([playerId, goals]) => {
      const player = playerLookup[playerId];
      if (!player) return;
      stories.push(createNews({
        type: "performance",
        title: goals >= 3 ? `${player.name} firma un triplete inolvidable` : `${player.name} marca un doblete decisivo`,
        summary: `${goals} goles en el ${home.name} ${fixture.homeGoals}-${fixture.awayGoals} ${away.name}.`,
        importance: goals >= 3 ? "critical" : "high",
        season, matchday, teamIds: [player.teamId], playerIds: [playerId], userTeamId,
        fingerprint: `performance:${fixture.id}:${playerId}:${goals}`,
      }));
    });
  });

  teams.forEach(team => {
    const oldPos = oldPositions[team.id];
    const newPos = newPositions[team.id];
    if (!oldPos || !newPos || oldPos === newPos) return;
    const enteredEurope = oldPos > 6 && newPos <= 6;
    const enteredRelegation = oldPos <= 17 && newPos >= 18;
    const becameLeader = oldPos !== 1 && newPos === 1;
    if (enteredEurope || enteredRelegation || becameLeader || team.id === userTeamId || Math.abs(oldPos - newPos) >= 3) {
      const title = becameLeader ? `${team.name} alcanza el liderato`
        : enteredEurope ? `${team.name} entra en puestos europeos`
        : enteredRelegation ? `${team.name} cae a puestos de descenso`
        : newPos < oldPos ? `${team.name} escala hasta la ${ordinal(newPos)} posición`
        : `${team.name} cae hasta la ${ordinal(newPos)} posición`;
      stories.push(createNews({
        type: "standings", title,
        summary: `${oldPos}.ª → ${newPos}.ª tras la jornada ${matchday}.`,
        importance: becameLeader || enteredRelegation ? "critical" : enteredEurope || team.id === userTeamId ? "high" : "medium",
        season, matchday, teamIds: [team.id], userTeamId,
        fingerprint: `standings:${team.id}:${oldPos}:${newPos}`,
        metadata: { oldPosition: oldPos, newPosition: newPos },
      }));
    }
  });

  teams.forEach(team => {
    const before = previousStreak(afterFixtures, team.id, matchday);
    const after = currentStreak(afterFixtures, team.id);
    if (after.count >= 3 && (after.count === 3 || after.count === 5 || after.count % 5 === 0)) {
      const label = after.result === "W" ? "victorias" : after.result === "L" ? "derrotas" : "empates";
      const crisis = after.result === "L" && after.count >= 4;
      stories.push(createNews({
        type: "streak",
        title: crisis ? `${team.name} entra en crisis tras ${after.count} derrotas consecutivas` : `${team.name} suma ${after.count} ${label} seguidos`,
        summary: `La dinámica del equipo marca la jornada ${matchday}.`,
        importance: after.count >= 5 || crisis ? "high" : "medium",
        season, matchday, teamIds: [team.id], userTeamId,
        fingerprint: `streak:${team.id}:${after.result}:${after.count}`,
      }));
    } else if (before.count >= 3 && after.count === 1 && before.result !== after.result) {
      const label = before.result === "W" ? "victorias" : before.result === "L" ? "derrotas" : "empates";
      stories.push(createNews({
        type: "streak",
        title: `${team.name} rompe una racha de ${before.count} ${label} consecutivos`,
        importance: team.id === userTeamId || before.count >= 5 ? "high" : "medium",
        season, matchday, teamIds: [team.id], userTeamId,
        fingerprint: `streak-broken:${team.id}:${before.result}:${before.count}`,
      }));
    }
  });

  const beforeScorers = scorerTable(beforeFixtures, playerLookup);
  const afterScorers = scorerTable(afterFixtures, playerLookup);
  const oldLeader = beforeScorers[0]?.playerId;
  const leader = afterScorers[0];
  if (leader && leader.playerId !== oldLeader) {
    stories.push(createNews({
      type: "scorer",
      title: `${leader.name} lidera la tabla de goleadores`,
      summary: `${leader.goals} goles en la temporada ${seasonKey(season)}.`,
      importance: "high", season, matchday, teamIds: [leader.teamId], playerIds: [leader.playerId], userTeamId,
      fingerprint: `scorer-leader:${leader.playerId}:${leader.goals}`,
    }));
  }
  const oldTop3 = new Set(beforeScorers.slice(0, 3).map(row => row.playerId));
  afterScorers.slice(0, 3).forEach((row, index) => {
    if (index > 0 && !oldTop3.has(row.playerId)) {
      stories.push(createNews({
        type: "scorer", title: `${row.name} entra en el Top 3 de máximos goleadores`,
        summary: `${row.goals} goles en la temporada ${seasonKey(season)}.`,
        importance: "medium", season, matchday, teamIds: [row.teamId], playerIds: [row.playerId], userTeamId,
        fingerprint: `scorer-top3:${row.playerId}:${row.goals}`,
      }));
    }
  });

  return mergeNews([], stories);
}

export function generateTransferNews({ transfer, season, matchday, userTeamId, userTeamName }) {
  const { type, player, cost, value, fromTeamId } = transfer;
  const buying = type === "buy";
  return [createNews({
    type: "transfer",
    title: buying
      ? `${userTeamName} incorpora a ${player.name} por ${money(cost)}`
      : `${player.name} abandona ${userTeamName} por ${money(value)}`,
    summary: buying ? `El nuevo fichaje llega para reforzar la posición de ${player.pos}.` : "El club confirma oficialmente la salida del jugador.",
    importance: (cost ?? value ?? 0) >= 50000 ? "critical" : "high",
    season, matchday,
    teamIds: buying ? [userTeamId, fromTeamId] : [userTeamId],
    playerIds: [player.id], userTeamId,
    fingerprint: `transfer:${type}:${player.id}:${matchday}:${cost ?? value}`,
    metadata: { userClub: true, amount: cost ?? value, direction: type },
  })];
}

export function generateMedicalNews({ injuryEvents = [], beforePlayers = [], afterPlayers = [], season, matchday, userTeamId, userTeamName }) {
  const stories = [];
  const beforeById = Object.fromEntries(beforePlayers.map(player => [player.id, player]));
  const afterById = Object.fromEntries(afterPlayers.map(player => [player.id, player]));

  injuryEvents.forEach(event => {
    const player = afterById[event.playerId] ?? beforeById[event.playerId];
    if (!player) return;
    const duration = formatMedicalDuration(event.injuryDays ?? (event.injuryGames ?? 1) * 7);
    stories.push(createNews({
      type:"injury", title:`${player.name} estará ${duration} de baja`,
      summary:`${userTeamName} confirma que el jugador sufre ${event.injuryType?.toLowerCase() ?? "una lesión muscular"}.`,
      importance:(event.injuryDays ?? 7) >= 42 || player.overall >= 85 ? "critical" : (event.injuryDays ?? 7) >= 14 ? "high" : "medium",
      season, matchday, teamIds:[userTeamId], playerIds:[player.id], userTeamId,
      fingerprint:`injury:${player.id}:${event.injuryTypeId ?? "legacy"}:${matchday}`,
      metadata:{ userClub:true, injuryType:event.injuryType, durationDays:event.injuryDays },
    }));
  });

  afterPlayers.forEach(player => {
    const before = beforeById[player.id];
    if (!before?.medical || !player.medical) return;
    if (["injured","recovery"].includes(before.medical.phase) && player.medical.phase === "limited") {
      stories.push(createNews({ type:"injury", title:`${player.name} entra en la recta final de su recuperación`, summary:"El cuerpo médico le declara apto con limitaciones.", importance:"medium", season, matchday, teamIds:[userTeamId], playerIds:[player.id], userTeamId, fingerprint:`limited:${player.id}:${before.medical.startedMatchday ?? "x"}`, metadata:{userClub:true} }));
    }
    if (before.medical.phase !== "available" && player.medical.phase === "available") {
      stories.push(createNews({ type:"injury", title:`${player.name} vuelve a entrenar con normalidad`, summary:"El jugador recibe el alta médica y vuelve a estar disponible.", importance:"medium", season, matchday, teamIds:[userTeamId], playerIds:[player.id], userTeamId, fingerprint:`recovered:${player.id}:${before.medical.startedMatchday ?? "x"}`, metadata:{userClub:true} }));
    }
  });
  return mergeNews([], stories);
}

export function generateBoardNews({ items = [], season, matchday, userTeamId }) {
  return items.map(item=>createNews({
    type:"board",title:item.title,summary:item.summary,importance:item.importance??"medium",
    season,matchday,teamIds:[userTeamId],userTeamId,
    fingerprint:item.fingerprint??`board:${matchday}:${item.title}`,
    metadata:{userClub:true},
  }));
}

export function generateYouthNews({ items = [], season, matchday, userTeamId, playerIds = [] }) {
  return items.map((item,index)=>createNews({
    type:"youth",title:item.title,summary:item.summary,importance:item.importance??"medium",
    season,matchday,teamIds:[userTeamId],playerIds:item.playerId?[item.playerId]:playerIds,userTeamId,
    fingerprint:item.fingerprint??`youth:${matchday}:${index}:${item.title}`,
    metadata:{userClub:true,academy:true},
  }));
}

export function generateScoutingNews({ items = [], season, matchday, userTeamId }) {
  return items.map((item,index)=>createNews({
    type:"scouting",title:item.title,summary:item.summary,importance:item.importance??"medium",
    season,matchday,teamIds:[userTeamId],userTeamId,
    fingerprint:item.fingerprint??`scouting:${matchday}:${index}:${item.title}`,
    metadata:{userClub:true,scouting:true},
  }));
}

export function generateDevelopmentNews({ report, players = [], season, matchday, userTeamId }) {
  const byId=Object.fromEntries(players.map(player=>[player.id,player]));
  return (report?.changes??[]).filter(item=>item.changes?.some(change=>change.key==="overall"&&change.delta>0)).slice(0,2).map(item=>{
    const player=byId[item.playerId];const overallChange=item.changes.find(change=>change.key==="overall"&&change.delta>0);
    return createNews({type:"performance",title:`${item.name} progresa hasta ${item.overall} de media`,summary:`El trabajo semanal se traduce en una mejora de ${overallChange?.delta??1} punto en su valoración general.`,importance:player?.age<=21&&item.overall>=78?"high":"medium",season,matchday,teamIds:[userTeamId],playerIds:[item.playerId],userTeamId,fingerprint:`development:${item.playerId}:${item.overall}`,metadata:{userClub:true,development:true}});
  });
}
import { formatMedicalDuration } from "../medical/medicalEngine.js";
