const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const hash = value => {
  let result = 0;
  for (const char of String(value)) result = (Math.imul(result, 31) + char.charCodeAt(0)) | 0;
  return Math.abs(result);
};

const FIRST_NAMES = ["Aitor", "Mikel", "Unai", "Iñaki", "Ander", "Xabier", "Luis", "Carlos", "Sergio", "Pablo", "Diego", "Rubén"];
const LAST_NAMES = ["Funes", "Valdés", "Urrutia", "Etxeberria", "Alonso", "Giménez", "Mendoza", "Aguirre", "Campos", "Santamaría"];

export const COACH_PHILOSOPHIES = [
  { id: "balanced", label: "Equilibrado", icon: "⚖️" },
  { id: "attacking", label: "Juego ofensivo", icon: "⚽" },
  { id: "defensive", label: "Juego defensivo", icon: "🛡️" },
  { id: "possession", label: "Posesión", icon: "🧠" },
  { id: "counter", label: "Contraataque", icon: "⚡" },
  { id: "academy", label: "Cantera", icon: "🌱" },
  { id: "development", label: "Desarrollo joven", icon: "📈" },
  { id: "lockerRoom", label: "Gestión de vestuario", icon: "🗣️" },
];

export const COACH_PRESTIGE_LEVELS = [
  { max: 20, label: "Entrenador Local", color: "#9ca3af" },
  { max: 40, label: "Entrenador Nacional", color: "#60a5fa" },
  { max: 60, label: "Entrenador Reconocido", color: "#c9a84c" },
  { max: 80, label: "Entrenador Europeo", color: "#a78bfa" },
  { max: 100, label: "Leyenda del Fútbol", color: "#f59e0b" },
];

export function getCoachPrestigeLevel(value = 10) {
  return COACH_PRESTIGE_LEVELS.find(level => value <= level.max) ?? COACH_PRESTIGE_LEVELS[4];
}

function ageFromBirthDate(birthDate, season = "2025") {
  const year = Number(String(birthDate ?? "1988-07-01").slice(0, 4)) || 1988;
  return Math.max(25, Number(season) - year);
}

function initialStats() {
  return {
    matches: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0,
    seasons: 0, titles: 0, promotedYouth: 0, debuts: 0, transferProfit: 0,
    bestWinStreak: 0, currentWinStreak: 0, biggestWin: null, bestSeason: null,
  };
}

export function createCoachCareer(data = {}, team = {}, season = "2025") {
  const firstName = String(data.firstName ?? data.name ?? "Oscar").trim() || "Oscar";
  const lastName = String(data.lastName ?? "Funes").trim();
  const fullName = `${firstName}${lastName ? ` ${lastName}` : ""}`;
  const prestige = clamp(data.prestige ?? 12 + Math.max(0, (team.avg ?? 74) - 74), 1, 45);
  return {
    id: data.id ?? `coach_${Date.now()}_${hash(fullName).toString(36)}`,
    firstName,
    lastName,
    name: fullName,
    birthDate: data.birthDate ?? "1988-07-01",
    nationality: data.nationality ?? "España",
    avatar: data.avatar ?? "🧑‍💼",
    currentClubId: team.id,
    currentClubName: team.name,
    joinedAt: data.joinedAt ?? `${season}-07-01`,
    prestige,
    initialPrestige: prestige,
    philosophy: data.philosophy ?? "balanced",
    career: {
      startedSeason: String(season),
      clubs: [{
        clubId: team.id,
        clubName: team.name,
        fromSeason: String(season),
        toSeason: null,
        seasons: 0,
        titles: 0,
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        confidenceEnd: null,
        exitReason: null,
      }],
      history: [],
      trophies: [],
      relationships: {},
    },
    stats: initialStats(),
    records: {},
    awards: [],
    notifications: [],
    version: 1,
  };
}

function createAiCoach(team, season = "2025") {
  const seed = hash(team.id);
  return {
    id: `ai_coach_${team.id}`,
    name: `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(seed / 5) % LAST_NAMES.length]}`,
    nationality: "España",
    birthDate: `${1972 + (seed % 22)}-07-01`,
    prestige: clamp((team.avg ?? 74) - 42 + (team.fanbase ?? 2) * 4 + (seed % 10), 8, 88),
    currentClubId: team.id,
    currentClubName: team.name,
    joinedAt: `${season}-07-01`,
    history: [],
  };
}

export function ensureAiCoaches(game, teams = []) {
  const current = game.aiCoaches ?? {};
  const next = { ...current };
  teams.forEach(team => {
    if (!next[team.id]) next[team.id] = createAiCoach(team, game.season ?? "2025");
  });
  return next;
}

export function ensureCoachCareer(game, team = null, teams = []) {
  if (!game) return game;
  const current = game.coachCareer;
  const legacyManager = game.legacy?.manager;
  const coach = current ? {
    ...current,
    name: current.name ?? (`${current.firstName ?? ""} ${current.lastName ?? ""}`.trim() || legacyManager?.name || "Entrenador"),
    currentClubId: current.currentClubId ?? game.teamId,
    currentClubName: current.currentClubName ?? team?.name ?? game.name,
    prestige: clamp(current.prestige ?? legacyManager?.prestige ?? 10),
    career: { clubs: [], history: [], trophies: [], relationships: {}, ...(current.career ?? {}) },
    stats: { ...initialStats(), ...(current.stats ?? {}) },
    awards: current.awards ?? [],
    notifications: current.notifications ?? [],
    version: 1,
  } : createCoachCareer({
    firstName: legacyManager?.name?.split(" ")?.[0] ?? "Oscar",
    lastName: legacyManager?.name?.split(" ")?.slice(1).join(" ") ?? "Funes",
    prestige: legacyManager?.prestige ?? 10,
  }, team ?? { id: game.teamId, name: game.name, avg: 74 }, game.season ?? "2025");

  if (!coach.career.clubs?.length) {
    coach.career.clubs = [{ clubId: game.teamId, clubName: team?.name ?? game.name, fromSeason: String(game.season ?? "2025"), toSeason: null, seasons: 0, titles: 0, matches: 0, wins: 0, draws: 0, losses: 0, confidenceEnd: null, exitReason: null }];
  }

  const legacy = game.legacy ? {
    ...game.legacy,
    manager: {
      ...(game.legacy.manager ?? {}),
      name: coach.name,
      prestige: coach.prestige,
      seasons: coach.stats.seasons,
      titles: coach.stats.titles,
      wins: coach.stats.wins,
      draws: coach.stats.draws,
      losses: coach.stats.losses,
      history: coach.career.history ?? game.legacy.manager?.history ?? [],
    },
  } : game.legacy;

  return { ...game, coachCareer: coach, aiCoaches: ensureAiCoaches({ ...game, coachCareer: coach }, teams), legacy };
}

function updateCurrentClubSpell(coach, result) {
  const clubs = [...(coach.career.clubs ?? [])];
  const index = clubs.findIndex(item => item.clubId === coach.currentClubId && !item.toSeason);
  if (index === -1) return coach;
  const current = clubs[index];
  clubs[index] = {
    ...current,
    matches: (current.matches ?? 0) + 1,
    wins: (current.wins ?? 0) + (result === "win" ? 1 : 0),
    draws: (current.draws ?? 0) + (result === "draw" ? 1 : 0),
    losses: (current.losses ?? 0) + (result === "loss" ? 1 : 0),
  };
  return { ...coach, career: { ...coach.career, clubs } };
}

export function recordCoachMatch(game, { result, goalsFor = 0, goalsAgainst = 0, fixture = null, lockerSummary = null, trainingReport = null } = {}) {
  const seeded = ensureCoachCareer(game);
  let coach = seeded.coachCareer;
  const stats = { ...initialStats(), ...(coach.stats ?? {}) };
  const win = result === "win";
  const draw = result === "draw";
  const loss = result === "loss";
  const margin = goalsFor - goalsAgainst;
  const currentWinStreak = win ? (stats.currentWinStreak ?? 0) + 1 : 0;
  const biggestWin = margin > 0 && (!stats.biggestWin || margin > stats.biggestWin.margin)
    ? { margin, goalsFor, goalsAgainst, matchday: fixture?.matchday ?? seeded.matchday, season: String(seeded.season), rivalId: fixture?.homeTeamId === seeded.teamId ? fixture?.awayTeamId : fixture?.homeTeamId }
    : stats.biggestWin;
  const promotedYouth = (seeded.youth?.promotions ?? []).filter(item => String(item.season) === String(seeded.season)).length;
  const transferProfit = (seeded.transfers ?? []).filter(item => String(item.season ?? seeded.season) === String(seeded.season)).reduce((sum, item) => sum + (item.type === "sell" ? number(item.value ?? item.cost) : item.type === "buy" ? -number(item.cost ?? item.value) : 0), 0);
  const lockerPenalty = lockerSummary?.atmosphere === "tenso" ? -.08 : lockerSummary?.atmosphere === "positivo" ? .05 : 0;
  const developmentBonus = Math.min(.08, (trainingReport?.improved?.length ?? 0) * .02);
  const prestigeDelta = (win ? .16 : draw ? .04 : -.05) + lockerPenalty + developmentBonus;
  coach = {
    ...coach,
    prestige: clamp((coach.prestige ?? 10) + prestigeDelta),
    stats: {
      ...stats,
      matches: stats.matches + 1,
      wins: stats.wins + (win ? 1 : 0),
      draws: stats.draws + (draw ? 1 : 0),
      losses: stats.losses + (loss ? 1 : 0),
      goalsFor: stats.goalsFor + goalsFor,
      goalsAgainst: stats.goalsAgainst + goalsAgainst,
      currentWinStreak,
      bestWinStreak: Math.max(stats.bestWinStreak ?? 0, currentWinStreak),
      biggestWin,
      promotedYouth,
      transferProfit,
    },
  };
  coach = updateCurrentClubSpell(coach, result);
  return ensureCoachCareer({ ...seeded, coachCareer: coach }, null, []);
}

function buildPrestigeNotification({ prestigeDelta, title, youthReport, season }) {
  let text;
  if (title) text = "Ganar el título ha disparado tu prestigio.";
  else if (prestigeDelta > 0 && (youthReport?.promoted ?? 0) >= 2) text = "Apostar por la cantera ha reforzado tu imagen.";
  else if (prestigeDelta >= 8) text = "Tu nombre empieza a sonar en círculos más exigentes.";
  else if (prestigeDelta >= 4) text = "Una temporada que refuerza tu reputación como entrenador.";
  else if (prestigeDelta >= 1) text = "Tu trabajo está dejando huella poco a poco.";
  else if (prestigeDelta <= -8) text = "Tu continuidad empieza a generar dudas fuera del club.";
  else if (prestigeDelta <= -4) text = "Una temporada complicada empieza a pesar en tu reputación.";
  else return null;
  return { id: `coach-prestige-${season}`, type: prestigeDelta < 0 ? "prestige-drop" : "prestige", title: text, season, createdAt: new Date().toISOString() };
}

export function finalizeCoachSeason(game, { team, position, points = 0, title = null, confidence = null, youthReport = null, legacyDelta = 0 } = {}) {
  const seeded = ensureCoachCareer(game, team);
  const coach = seeded.coachCareer;
  const stats = { ...initialStats(), ...(coach.stats ?? {}) };
  const season = String(seeded.season ?? "2025");
  if ((coach.career.history ?? []).some(item => item.season === season && item.clubId === seeded.teamId)) return seeded;
  const seasonMatches = (seeded.fixtures ?? []).filter(item => item.played && (item.homeTeamId === seeded.teamId || item.awayTeamId === seeded.teamId));
  const seasonWins = seasonMatches.filter(item => {
    const home = item.homeTeamId === seeded.teamId;
    return home ? item.homeGoals > item.awayGoals : item.awayGoals > item.homeGoals;
  }).length;
  const seasonDraws = seasonMatches.filter(item => item.homeGoals === item.awayGoals).length;
  const seasonLosses = seasonMatches.length - seasonWins - seasonDraws;
  const seasonEntry = {
    id: `coach-season-${season}-${seeded.teamId}`,
    season,
    clubId: seeded.teamId,
    clubName: team?.name ?? seeded.name,
    position,
    points,
    matches: seasonMatches.length,
    wins: seasonWins,
    draws: seasonDraws,
    losses: seasonLosses,
    title: title?.name ?? null,
    confidence,
    prestige: coach.prestige,
  };
  const trophies = title ? [{ id: `coach-trophy-${title.id}`, season, clubId: seeded.teamId, clubName: team?.name ?? seeded.name, name: title.name, type: title.type ?? "Liga" }, ...(coach.career.trophies ?? [])] : coach.career.trophies ?? [];
  const clubs = (coach.career.clubs ?? []).map(item => item.clubId === seeded.teamId && !item.toSeason ? { ...item, seasons: (item.seasons ?? 0) + 1, titles: (item.titles ?? 0) + (title ? 1 : 0), confidenceEnd: confidence ?? item.confidenceEnd } : item);
  const bestSeason = !stats.bestSeason || points > (stats.bestSeason.points ?? 0) ? { season, clubName: team?.name ?? seeded.name, position, points } : stats.bestSeason;
  const prestigeDelta = (position === 1 ? 8 : position <= 4 ? 4 : position <= 6 ? 2 : position >= 18 ? -7 : 0) + Math.max(-4, Math.min(5, legacyDelta)) + (youthReport?.promoted ? Math.min(2, youthReport.promoted) : 0);
  const updatedCoach = {
    ...coach,
    prestige: clamp((coach.prestige ?? 10) + prestigeDelta),
    career: {
      ...coach.career,
      history: [seasonEntry, ...(coach.career.history ?? [])],
      trophies,
      clubs,
      relationships: {
        ...(coach.career.relationships ?? {}),
        [seeded.teamId]: { clubId: seeded.teamId, clubName: team?.name ?? seeded.name, seasons: (clubs.find(item => item.clubId === seeded.teamId && !item.toSeason)?.seasons ?? 0), titles: (clubs.find(item => item.clubId === seeded.teamId && !item.toSeason)?.titles ?? 0), confidenceEnd: confidence, lastSeason: season },
      },
    },
    stats: { ...stats, seasons: stats.seasons + 1, titles: stats.titles + (title ? 1 : 0), promotedYouth: stats.promotedYouth + (youthReport?.promoted ?? 0), bestSeason },
    notifications: (() => {
      const notification = buildPrestigeNotification({ prestigeDelta, title, youthReport, season });
      return notification ? [notification, ...(coach.notifications ?? [])] : coach.notifications ?? [];
    })(),
  };
  return ensureCoachCareer({ ...seeded, coachCareer: updatedCoach }, team, []);
}

export function coachWinRate(coach) {
  const matches = coach?.stats?.matches ?? 0;
  return matches ? Math.round((coach.stats.wins / matches) * 100) : 0;
}

export function coachPointsPerMatch(coach) {
  const matches = coach?.stats?.matches ?? 0;
  return matches ? ((coach.stats.wins * 3 + coach.stats.draws) / matches).toFixed(2) : "0.00";
}
