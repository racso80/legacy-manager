const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
const pickVariant=(seed,list)=>list[seed%list.length];
const TRANSFER_FEE_THRESHOLD = 20000;

export const FAN_IDENTITIES = {
  athletic: { label: "Cantera y compromiso", academy: 1.45, local: 1.35, style: .75, titles: .75, signings: .7, intensity: 1.15 },
  barcelona: { label: "Buen juego y cantera", academy: 1.25, local: .85, style: 1.35, titles: 1.05, signings: .95, intensity: .85 },
  atletico: { label: "Intensidad y competitividad", academy: .85, local: .8, style: .8, titles: 1.05, signings: .9, intensity: 1.45 },
  realmadrid: { label: "Títulos y grandes noches", academy: .75, local: .7, style: 1.05, titles: 1.55, signings: 1.35, intensity: .9 },
  realsociedad: { label: "Cantera y buen fútbol", academy: 1.25, local: 1.1, style: 1.15, titles: .85, signings: .85, intensity: .9 },
  osasuna: { label: "Compromiso y El Sadar", academy: 1.05, local: 1.15, style: .75, titles: .75, signings: .75, intensity: 1.35 },
  valencia: { label: "Exigencia histórica", academy: .95, local: .9, style: .95, titles: 1.15, signings: 1.05, intensity: 1.05 },
  sevilla: { label: "Ambición competitiva", academy: .85, local: .85, style: .9, titles: 1.15, signings: 1.0, intensity: 1.1 },
  betis: { label: "Identidad y espectáculo", academy: .95, local: .95, style: 1.15, titles: .9, signings: .95, intensity: 1.1 },
};

export function getFanIdentity(teamId) {
  return FAN_IDENTITIES[teamId] ?? { label: "Fidelidad y resultados", academy: 1, local: 1, style: 1, titles: 1, signings: 1, intensity: 1 };
}

export function getFanMood(value = 65) {
  if (value >= 82) return { stars: 5, label: "Entusiasmada", color: "#22c55e", icon: "⭐⭐⭐⭐⭐" };
  if (value >= 66) return { stars: 4, label: "Satisfecha", color: "#84cc16", icon: "⭐⭐⭐⭐" };
  if (value >= 48) return { stars: 3, label: "Expectante", color: "#c9a84c", icon: "⭐⭐⭐" };
  if (value >= 30) return { stars: 2, label: "Descontenta", color: "#f59e0b", icon: "⭐⭐" };
  return { stars: 1, label: "Muy enfadada", color: "#ef4444", icon: "⭐" };
}

export function getStadiumMood(value = 65) {
  if (value >= 82) return { label: "Ambiente espectacular", color: "#22c55e", icon: "🔥" };
  if (value >= 66) return { label: "Estadio caliente", color: "#84cc16", icon: "📣" };
  if (value >= 48) return { label: "Ambiente correcto", color: "#c9a84c", icon: "🏟️" };
  if (value >= 30) return { label: "Nerviosismo", color: "#f59e0b", icon: "😬" };
  return { label: "Silbidos y tensión", color: "#ef4444", icon: "📉" };
}

function initialFanbase(team) {
  const base = clamp(48 + (team?.fanbase ?? 3) * 7 + ((team?.avg ?? 74) - 74) * .8, 42, 86);
  return {
    version: 1,
    support: base,
    coachSupport: base,
    atmosphere: clamp(base + 3),
    loyalty: clamp(54 + (team?.fanbase ?? 3) * 8),
    expectation: clamp(42 + ((team?.avg ?? 74) - 70) * 2 + (team?.budget ?? 30) * .08, 35, 88),
    averageAttendance: 0,
    totalAttendance: 0,
    homeMatches: 0,
    ticketRevenue: 0,
    shirtSales: 0,
    merchandise: 0,
    seasonTickets: 0,
    recordAttendance: 0,
    trend: [],
    reactions: [],
    idols: [],
    identity: getFanIdentity(team?.id),
    lastUpdatedMatchday: 0,
  };
}

export function ensureFanbaseState(game, team = null, teams = []) {
  if (!game) return game;
  const current = game.fanbase ?? {};
  const base = current.version ? current : initialFanbase(team);
  const aiFanbases = { ...(game.aiFanbases ?? {}) };
  teams.forEach(item => {
    if (!aiFanbases[item.id]) aiFanbases[item.id] = initialFanbase(item);
  });
  const support = clamp(base.support ?? game.fanLove ?? 65);
  return {
    ...game,
    fanLove: support,
    fanbase: {
      ...initialFanbase(team),
      ...base,
      support,
      coachSupport: clamp(base.coachSupport ?? support),
      atmosphere: clamp(base.atmosphere ?? support),
      identity: base.identity ?? getFanIdentity(game.teamId),
      trend: base.trend ?? [],
      reactions: base.reactions ?? [],
      idols: base.idols ?? [],
      version: 1,
    },
    aiFanbases,
  };
}

function formStreak(game) {
  const fixtures = (game.fixtures ?? []).filter(item => item.played && (item.homeTeamId === game.teamId || item.awayTeamId === game.teamId)).sort((a, b) => b.matchday - a.matchday).slice(0, 5);
  let wins = 0, winless = 0, losses = 0;
  for (const fixture of fixtures) {
    const home = fixture.homeTeamId === game.teamId;
    const own = home ? fixture.homeGoals : fixture.awayGoals;
    const opp = home ? fixture.awayGoals : fixture.homeGoals;
    if (own > opp) { wins++; if (!winless) {} }
    else winless++;
    if (own < opp) losses++;
  }
  return { wins, winless, losses, matches: fixtures.length };
}

function positionOf(game) {
  const sorted = [...(game.standings ?? [])].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
  return sorted.findIndex(row => row.teamId === game.teamId) + 1;
}

export function estimateFanAttendance({ game, team, fixture, won = false, drew = false, leaguePos = null } = {}) {
  const fanbase = ensureFanbaseState(game, team).fanbase;
  const rivalId = fixture?.homeTeamId === game.teamId ? fixture?.awayTeamId : fixture?.homeTeamId;
  const rival = rivalId ? (game._teams ?? []).find(item => item.id === rivalId) : null;
  const derby = rival && rival.city && team?.city && rival.city === team.city;
  const rivalPull = Math.min(.13, ((rival?.avg ?? team?.avg ?? 74) - 72) * .007 + (rival?.fanbase ?? 2) * .012);
  const position = leaguePos ?? positionOf(game);
  const sportPull = position ? Math.max(-.08, Math.min(.12, (12 - position) * .012)) : 0;
  const supportPull = ((fanbase.support ?? 65) - 60) * .0024;
  const resultPull = won ? .045 : drew ? .008 : -.035;
  const derbyPull = derby ? .08 : 0;
  const base = .48 + (team?.fanbase ?? 3) * .07;
  const occupancy = clamp((base + rivalPull + sportPull + supportPull + resultPull + derbyPull) * 100, 24, 99) / 100;
  const attendance = Math.round((team?.capacity ?? 30000) * occupancy);
  return { occupancy, attendance, derby, rivalPull, sportPull };
}

export function applyFanMatchReaction(game, { team, fixture, won, drew, goalsFor = 0, goalsAgainst = 0, income = null, position = null, opponent = null } = {}) {
  const seeded = ensureFanbaseState(game, team);
  const fanbase = seeded.fanbase;
  const identity = fanbase.identity ?? getFanIdentity(seeded.teamId);
  const margin = goalsFor - goalsAgainst;
  const attacking = Math.max(0, goalsFor - 1) * .8 * identity.style;
  const bigWin = margin >= 3 ? 4.5 : margin >= 2 ? 2.5 : 0;
  const badLoss = margin <= -3 ? -6 : margin <= -2 ? -3.5 : 0;
  const resultDelta = won ? 4.2 : drew ? .3 : -4.8;
  const tablePos = position ?? positionOf(seeded);
  const expectationPressure = tablePos >= 15 ? -1.8 : tablePos <= 6 ? 1.2 : 0;
  const streak = formStreak(seeded);
  const streakDelta = streak.wins >= 4 ? 2.2 : streak.winless >= 4 ? -3.8 : streak.losses >= 3 ? -2.5 : 0;
  const delta = resultDelta + attacking + bigWin + badLoss + expectationPressure + streakDelta;
  const support = clamp((fanbase.support ?? 65) + delta);
  const coachSupport = clamp((fanbase.coachSupport ?? fanbase.support ?? 65) + delta * .75 + (seeded.legacy?.confidence < 40 ? -1.2 : 0));
  const atmosphere = clamp((fanbase.atmosphere ?? fanbase.support ?? 65) + delta * .9 + (fixture?.homeTeamId === seeded.teamId ? 1 : 0));
  const attendance = income?.matchAttendance ?? 0;
  const homeMatches = fanbase.homeMatches + (income?.isHome ? 1 : 0);
  const totalAttendance = fanbase.totalAttendance + (income?.isHome ? attendance : 0);
  const averageAttendance = homeMatches ? Math.round(totalAttendance / homeMatches) : fanbase.averageAttendance;
  const reaction = buildMatchReaction({ won, drew, goalsFor, goalsAgainst, support, atmosphere, team, fixture, streak, opponent });
  const trendEntry = { season: String(seeded.season), matchday: seeded.matchday, support, coachSupport, atmosphere, attendance: income?.isHome ? attendance : null, result: won ? "win" : drew ? "draw" : "loss" };
  const updated = {
    ...fanbase,
    support, coachSupport, atmosphere,
    averageAttendance, totalAttendance, homeMatches,
    ticketRevenue: fanbase.ticketRevenue + (income?.gateRevenue ?? 0),
    shirtSales: fanbase.shirtSales + (income?.shopIncome ?? 0),
    merchandise: fanbase.merchandise + (income?.shopIncome ?? 0),
    recordAttendance: Math.max(fanbase.recordAttendance ?? 0, income?.isHome ? attendance : 0),
    trend: [trendEntry, ...(fanbase.trend ?? [])].slice(0, 80),
    reactions: [reaction, ...(fanbase.reactions ?? [])].slice(0, 30),
    lastUpdatedMatchday: seeded.matchday,
  };
  return { ...seeded, fanLove: support, fanbase: updated };
}

function buildMatchReaction({ won, drew, goalsFor, goalsAgainst, support, atmosphere, team, fixture, streak, opponent }) {
  const mood = getFanMood(support);
  const stadium = getStadiumMood(atmosphere);
  const home = fixture?.homeTeamId === team?.id;
  const margin = goalsFor - goalsAgainst;
  const blowout = Math.abs(margin) >= 3;
  const derby = Boolean(opponent && team?.city && opponent.city === team.city);
  const outcome = won ? "win" : drew ? "draw" : "loss";
  const titleSeed = hash(`${fixture?.matchday ?? 0}:${team?.id ?? ""}:${opponent?.id ?? ""}:${outcome}:title`);
  const summarySeed = hash(`${fixture?.matchday ?? 0}:${team?.id ?? ""}:${opponent?.id ?? ""}:${outcome}:summary`);

  let titlePool;
  let summaryPool;
  if (won) {
    titlePool = blowout ? [
      `${team?.stadium ?? "La grada"} disfruta con una gran victoria`,
      opponent?.name ? `La afición se viene arriba con la goleada a ${opponent.name}` : "La afición se viene arriba con una goleada",
      derby ? "Triunfo contundente en el derbi: la grada lo celebra por todo lo alto" : "Fiesta en las gradas tras una goleada sin paliativos",
    ] : [
      "La afición celebra el triunfo",
      opponent?.name ? `La grada celebra la victoria ante ${opponent.name}` : "La grada celebra la victoria",
      derby ? "Victoria en el derbi que la grada celebra con ganas" : "Tres puntos que la afición recibe con satisfacción",
      "El triunfo deja buen sabor de boca en la grada",
    ];
    summaryPool = blowout ? [
      `${stadium.label}. El respaldo al entrenador sale reforzado tras la goleada.`,
      opponent?.name ? `La manera de superar a ${opponent.name} ilusiona a la grada.` : "La manera de ganar ilusiona a la grada.",
      "El equipo se gana el cariño del público con una exhibición.",
    ] : [
      `${stadium.label}. El respaldo al entrenador sigue siendo ${coachSupportText(support)}.`,
      opponent?.name ? `Ganar a ${opponent.name} en un partido ajustado deja buenas sensaciones.` : "Un triunfo ajustado que deja buenas sensaciones.",
      "Tres puntos trabajados que la grada sabe valorar.",
    ];
  } else if (drew) {
    titlePool = [
      "La grada queda expectante tras el empate",
      opponent?.name ? `El empate ante ${opponent.name} deja sensaciones repartidas` : "El empate deja sensaciones repartidas",
      "La afición no termina de conformarse con el reparto de puntos",
      derby ? "Un derbi igualado deja sabor agridulce en la grada" : "El punto sabe a poco para una grada que pedía más",
    ];
    summaryPool = [
      "La afición pide continuidad, pero espera una reacción en el próximo partido.",
      opponent?.name ? `El empate ante ${opponent.name} deja a la grada con ganas de más.` : "El empate deja a la grada con ganas de más.",
      "Un punto que no termina de convencer, pero tampoco hunde el ánimo.",
    ];
  } else {
    titlePool = blowout ? [
      "Silbidos tras una derrota dolorosa",
      opponent?.name ? `La grada no perdona la goleada ante ${opponent.name}` : "La grada no perdona una goleada en contra",
      derby ? "Derrota dura en el derbi: la grada sale dolida del estadio" : "El equipo se hunde y el estadio responde con silbidos",
    ] : [
      "Los aficionados muestran su decepción",
      opponent?.name ? `La afición se marcha decepcionada tras la derrota ante ${opponent.name}` : "La afición se marcha decepcionada",
      "El resultado no convence a una grada que pedía más",
      derby ? "Derrota en el derbi que sienta especialmente mal en la grada" : "La derrota deja un poso de duda entre la afición",
    ];
    summaryPool = [
      `${home ? team?.stadium ?? "El estadio" : "La afición desplazada"} termina con sensación amarga.`,
      opponent?.name ? `Perder ante ${opponent.name} no sienta bien en la grada.` : "La derrota no sienta bien en la grada.",
      "La afición pide una reacción antes de que el malestar vaya a más.",
    ];
  }

  const title = pickVariant(titleSeed, titlePool);
  let summary = pickVariant(summarySeed, summaryPool);
  if (!won && streak.winless >= 4) summary += " La racha empieza a generar presión.";

  return { id: `fan-reaction-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, season: String(new Date().getFullYear()), matchday: fixture?.matchday, title, summary, mood: mood.label, stadium: stadium.label, createdAt: new Date().toISOString() };
}

function coachSupportText(value) {
  if (value >= 75) return "muy alto";
  if (value >= 55) return "estable";
  if (value >= 35) return "discutido";
  return "muy bajo";
}

export function applyFanTransferReaction(game, { type, player, value = 0 } = {}) {
  const seeded = ensureFanbaseState(game);
  const fanbase = seeded.fanbase;
  const identity = fanbase.identity ?? getFanIdentity(seeded.teamId);
  const isStar = (player?.overall ?? 0) >= 82 || player?.squadRole === "Estrella";
  const isAcademy = Boolean(player?.academyData);
  const isYoung = (player?.age ?? 30) <= 22;
  const bigFee = value >= TRANSFER_FEE_THRESHOLD;
  const seed = hash(`${player?.id ?? ""}:${seeded.season}:${seeded.matchday}:${type}`);
  let delta = 0;
  let title = null;
  let summaryPool = ["La operación mueve el ánimo de la masa social."];
  let actionConcern = false;
  if (["buy", "loanIn"].includes(type)) {
    delta = (isStar ? 4.5 : isYoung ? 2 : 1) * identity.signings + (isAcademy ? identity.academy : 0);
    title = isStar ? `La afición se ilusiona con ${player?.name}` : `La grada recibe con interés a ${player?.name}`;
    summaryPool = isStar ? [
      `${player?.name} ilusiona a una grada que pedía un golpe de efecto.`,
      bigFee ? `La inversión en ${player?.name} genera expectación entre los aficionados.` : `La grada ya quiere ver a ${player?.name} con la camiseta.`,
      `Hay ganas de ver debutar a ${player?.name} cuanto antes.`,
    ] : [
      `La llegada de ${player?.name} se recibe con curiosidad moderada.`,
      `${player?.name} se incorpora sin grandes focos, pero con la confianza del club.`,
      `La afición espera ver a ${player?.name} con buenos ojos.`,
    ];
  } else if (type === "sell") {
    delta = -(isStar ? 8 : isAcademy ? 5 * identity.academy : 2.2);
    title = isStar || isAcademy ? `La venta de ${player?.name} genera debate entre la afición` : `${player?.name} abandona el club`;
    actionConcern = isStar || (isAcademy && identity.academy > 1.1);
    summaryPool = actionConcern ? [
      `La salida de ${player?.name} no convence a una parte de la grada.`,
      bigFee ? `El fichaje sale rentable, pero algunos cuestionan desprenderse de ${player?.name}.` : `Vender a ${player?.name} deja un sabor agridulce entre los aficionados.`,
      `Parte de la masa social pide explicaciones por la venta de ${player?.name}.`,
    ] : [
      `La marcha de ${player?.name} pasa sin grandes sobresaltos.`,
      `La afición despide a ${player?.name} sin demasiado ruido.`,
      `La salida de ${player?.name} apenas mueve el ánimo de la grada.`,
    ];
  } else if (type === "loanOut") {
    delta = -(isStar ? 8 : isAcademy ? 5 * identity.academy : 2.2);
    title = isStar || isAcademy ? `La cesión de ${player?.name} genera debate entre la afición` : `${player?.name} sale cedido`;
    actionConcern = isStar || (isAcademy && identity.academy > 1.1);
    summaryPool = actionConcern ? [
      `La cesión de ${player?.name} divide opiniones entre la afición.`,
      `Una parte de la grada no termina de entender por qué se cede a ${player?.name}.`,
      `Parte de la masa social pide explicaciones por la cesión de ${player?.name}.`,
    ] : [
      `La salida cedida de ${player?.name} pasa sin demasiado ruido.`,
      `La afición confía en que la cesión le venga bien a ${player?.name}.`,
      `Nadie pone el grito en el cielo por la cesión de ${player?.name}.`,
    ];
  }
  const summary = pickVariant(seed, summaryPool);
  const support = clamp((fanbase.support ?? 65) + delta);
  const coachSupport = clamp((fanbase.coachSupport ?? fanbase.support ?? 65) + delta * .65);
  const reaction = { id: `fan-transfer-${Date.now()}-${player?.id}`, season: String(seeded.season), matchday: seeded.matchday, title, summary, transferType: type, playerId: player?.id, actionConcern, createdAt: new Date().toISOString() };
  return { ...seeded, fanLove: support, fanbase: { ...fanbase, support, coachSupport, reactions: [reaction, ...(fanbase.reactions ?? [])].slice(0, 30), trend: [{ season: String(seeded.season), matchday: seeded.matchday, support, coachSupport, atmosphere: fanbase.atmosphere, event: "transfer" }, ...(fanbase.trend ?? [])].slice(0, 80) } };
}

export function applyFanYouthReaction(game, player) {
  const seeded = ensureFanbaseState(game);
  const fanbase = seeded.fanbase;
  const identity = fanbase.identity ?? getFanIdentity(seeded.teamId);
  const delta = clamp((2 + ((player?.potential ?? 75) - 75) * .08) * identity.academy, 1, 7);
  const support = clamp((fanbase.support ?? 65) + delta);
  const isStandout = (player?.potential ?? 75) >= 86;
  const seed = hash(`${player?.id ?? ""}:${seeded.season}:${seeded.matchday}:youth`);
  const title = isStandout ? `${player?.name} ilusiona a la grada` : `${player?.name} conecta con la grada`;
  const summaryPool = isStandout ? [
    `La cantera vuelve a dar una alegría: ${player?.name} llega con cartel de gran promesa.`,
    `La grada recibe con ilusión a ${player?.name}, una de las grandes apuestas de la cantera.`,
    "La promoción dispara las expectativas y refuerza la identidad del club.",
  ] : [
    "La promoción de cantera refuerza la identidad del club.",
    `${player?.name} se gana una oportunidad y la afición lo recibe con simpatía.`,
    "La grada valora la apuesta por la cantera, aunque sin grandes expectativas todavía.",
  ];
  const summary = pickVariant(seed, summaryPool);
  const reaction = { id: `fan-youth-${Date.now()}-${player?.id}`, season: String(seeded.season), matchday: seeded.matchday, title, summary, playerId: player?.id, createdAt: new Date().toISOString() };
  return { ...seeded, fanLove: support, fanbase: { ...fanbase, support, coachSupport: clamp((fanbase.coachSupport ?? support) + delta * .5), reactions: [reaction, ...(fanbase.reactions ?? [])].slice(0, 30) } };
}

export function generateFanNews({ game, before = null, matchday = null } = {}) {
  const fanbase = game?.fanbase;
  if (!fanbase) return [];
  const latest = fanbase.reactions?.[0];
  const news = [];
  if (latest && latest.matchday === matchday) {
    news.push({ id: `news-${latest.id}`, type: "fan", importance: latest.actionConcern ? "high" : "medium", title: latest.title, summary: latest.summary, season: String(game.season), matchday, createdAt: Date.now(), fingerprint: latest.id, teamIds: [game.teamId], playerIds: latest.playerId ? [latest.playerId] : [], metadata: { userClub: true, fans: true } });
  }
  if (before && Math.floor((before.support ?? 0) / 20) !== Math.floor((fanbase.support ?? 0) / 20)) {
    const mood = getFanMood(fanbase.support);
    const moodSummary = mood.stars >= 5
      ? `El ánimo de la grada se dispara: la afición está ${mood.label.toLowerCase()} con el momento del equipo.`
      : mood.stars <= 1
      ? `El ánimo de la grada se hunde: la afición está ${mood.label.toLowerCase()} y la paciencia empieza a agotarse.`
      : `El ánimo de la grada ha cambiado: ahora se sienten ${mood.label.toLowerCase()}.`;
    news.push({ id: `news-fan-mood-${game.season}-${matchday}-${mood.stars}`, type: "fan", importance: fanbase.support < 35 ? "high" : "medium", title: `La afición está ${mood.label.toLowerCase()}`, summary: moodSummary, season: String(game.season), matchday, createdAt: Date.now(), fingerprint: `fan-mood:${game.season}:${matchday}:${mood.stars}`, teamIds: [game.teamId], metadata: { userClub: true, fans: true } });
  }
  if ((fanbase.recordAttendance ?? 0) && latest?.matchday === matchday && fanbase.recordAttendance === fanbase.trend?.[0]?.attendance) {
    news.push({ id: `news-fan-record-${game.season}-${matchday}`, type: "fan", importance: "medium", title: "Récord de asistencia de la temporada", summary: `${fanbase.recordAttendance.toLocaleString("es-ES")} aficionados acudieron al estadio.`, season: String(game.season), matchday, createdAt: Date.now(), fingerprint: `fan-record:${game.season}:${matchday}:${fanbase.recordAttendance}`, teamIds: [game.teamId], metadata: { userClub: true, fans: true } });
  }
  return news;
}

export function getFanPressureItems(game) {
  const fanbase = game?.fanbase;
  if (!fanbase) return [];
  const items = [];
  if ((fanbase.support ?? 65) < 35) {
    const fanMood = getFanMood(fanbase.support);
    const supportSummary = fanMood.stars <= 1
      ? `La afición está ${fanMood.label.toLowerCase()} y empieza a cuestionar el proyecto. Convendría recuperar resultados pronto o dar explicaciones.`
      : `La afición está ${fanMood.label.toLowerCase()}. Convendría recuperar resultados pronto o dar explicaciones.`;
    items.push({ id: `fans-support:${Math.floor(fanbase.support / 10)}`, priority: "critical", title: "La afición empieza a perder la paciencia", summary: supportSummary, action: { screen: "fans" }, actionLabel: "Ver afición" });
  }
  if ((fanbase.coachSupport ?? 65) < 38) items.push({ id: `fans-coach:${Math.floor(fanbase.coachSupport / 10)}`, priority: "important", title: "El entrenador pierde apoyo popular", summary: "La opinión de la grada puede empezar a influir en la directiva.", action: { screen: "career" }, actionLabel: "Ver carrera" });
  if ((fanbase.atmosphere ?? 65) < 36) {
    const stadiumMood = getStadiumMood(fanbase.atmosphere);
    const atmosphereSummary = (fanbase.atmosphere ?? 65) < 30
      ? "El estadio responde con silbidos y tensión: el equipo necesita reconectar con la grada cuanto antes."
      : `El ambiente en el estadio es de ${stadiumMood.label.toLowerCase()} y el equipo necesita reconectar con la grada.`;
    items.push({ id: `fans-atmosphere:${Math.floor(fanbase.atmosphere / 10)}`, priority: "important", title: "El ambiente del estadio se deteriora", summary: atmosphereSummary, action: { screen: "fans" }, actionLabel: "Ver ambiente" });
  }
  const lastConcern = (fanbase.reactions ?? []).find(item => item.actionConcern);
  if (lastConcern && lastConcern.matchday >= (game.matchday ?? 1) - 2) items.push({ id: `fans-transfer-concern:${lastConcern.playerId}:${lastConcern.matchday}`, priority: "important", title: "La afición cuestiona una decisión de mercado", summary: lastConcern.summary, action: { screen: "fans" }, actionLabel: "Ver reacción" });
  return items;
}

export function advanceAiFanbases(game, teams = [], matchday = game?.matchday ?? 1) {
  if (!game) return game;
  const seeded = ensureFanbaseState(game, teams.find(team => team.id === game.teamId), teams);
  const aiFanbases = { ...(seeded.aiFanbases ?? {}) };
  const teamMap = Object.fromEntries(teams.map(team => [team.id, team]));
  (seeded.fixtures ?? []).filter(fixture => fixture.played && fixture.matchday === matchday).forEach(fixture => {
    [fixture.homeTeamId, fixture.awayTeamId].forEach(teamId => {
      if (teamId === seeded.teamId) return;
      const team = teamMap[teamId];
      const current = aiFanbases[teamId] ?? initialFanbase(team);
      const home = fixture.homeTeamId === teamId;
      const goalsFor = home ? fixture.homeGoals : fixture.awayGoals;
      const goalsAgainst = home ? fixture.awayGoals : fixture.homeGoals;
      const won = goalsFor > goalsAgainst;
      const drew = goalsFor === goalsAgainst;
      const delta = won ? 3 : drew ? 0 : -3.5;
      aiFanbases[teamId] = {
        ...current,
        support: clamp((current.support ?? 65) + delta),
        coachSupport: clamp((current.coachSupport ?? 65) + delta * .7),
        atmosphere: clamp((current.atmosphere ?? 65) + delta * .85),
        trend: [{ season:String(seeded.season), matchday, support:clamp((current.support ?? 65) + delta), result:won?"win":drew?"draw":"loss" }, ...(current.trend ?? [])].slice(0, 50),
      };
    });
  });
  return { ...seeded, aiFanbases };
}
