import { calculateInjuryRisk } from "../medical/medicalEngine.js";
import { getLockerRoomSummary } from "../morale/moraleEngine.js";

const PRIORITY_SCORE = { urgent: 0, important: 1, normal: 2, info: 3 };

export const CLUB_LIFE_ACTORS = {
  sportingDirector: {
    id: "sportingDirector",
    name: "Director deportivo",
    role: "Dirección deportiva",
    emoji: "👔",
    color: "#60a5fa",
    personality: "piensa en el largo plazo",
    speakingStyle: "analítico y prudente",
    priorities: ["contratos", "mercado", "planificación"],
    insistence: 62,
    frequency: "media",
  },
  assistantCoach: {
    id: "assistantCoach",
    name: "Segundo entrenador",
    role: "Cuerpo técnico",
    emoji: "👥",
    color: "#c9a84c",
    personality: "directo y práctico",
    speakingStyle: "breve y claro",
    priorities: ["alineación", "rival", "táctica"],
    insistence: 58,
    frequency: "alta",
  },
  doctor: {
    id: "doctor",
    name: "Médico",
    role: "Área médica",
    emoji: "👨‍⚕️",
    color: "#22c55e",
    personality: "prudente",
    speakingStyle: "sereno y preventivo",
    priorities: ["lesiones", "recuperación", "riesgo físico"],
    insistence: 74,
    frequency: "media",
  },
  fitnessCoach: {
    id: "fitnessCoach",
    name: "Preparador físico",
    role: "Preparación física",
    emoji: "🏋️",
    color: "#f59e0b",
    personality: "protector con la carga",
    speakingStyle: "práctico y preocupado",
    priorities: ["carga", "descanso", "entrenamiento"],
    insistence: 66,
    frequency: "alta",
  },
  psychologist: {
    id: "psychologist",
    name: "Psicólogo",
    role: "Rendimiento mental",
    emoji: "🧠",
    color: "#38bdf8",
    personality: "observador",
    speakingStyle: "calmado y empático",
    priorities: ["moral", "confianza", "relaciones"],
    insistence: 50,
    frequency: "baja",
  },
  captain: {
    id: "captain",
    name: "Capitán",
    role: "Voz del vestuario",
    emoji: "❤️",
    color: "#ef4444",
    personality: "protege al grupo",
    speakingStyle: "cercano y honesto",
    priorities: ["vestuario", "minutos", "grupo"],
    insistence: 70,
    frequency: "media",
  },
  president: {
    id: "president",
    name: "Presidente",
    role: "Directiva",
    emoji: "🏛️",
    color: "#a78bfa",
    personality: "exigente",
    speakingStyle: "formal y directo",
    priorities: ["objetivos", "economía", "prestigio"],
    insistence: 78,
    frequency: "baja",
  },
  academyChief: {
    id: "academyChief",
    name: "Jefe de cantera",
    role: "Cantera",
    emoji: "🌱",
    color: "#84cc16",
    personality: "protege el futuro",
    speakingStyle: "ilusionado y paciente",
    priorities: ["jóvenes", "promoción", "desarrollo"],
    insistence: 48,
    frequency: "media",
  },
  pressOfficer: {
    id: "pressOfficer",
    name: "Responsable de prensa",
    role: "Comunicación",
    emoji: "🎙️",
    color: "#f97316",
    personality: "mide cada palabra",
    speakingStyle: "cuidadoso y urgente",
    priorities: ["prensa", "afición", "imagen"],
    insistence: 64,
    frequency: "media",
  },
};

function currentStamp(game) {
  return {
    season: String(game.season ?? "2025"),
    matchday: game.matchday ?? 1,
  };
}

function normalizeActor(actor) {
  return {
    ...actor,
    trust: actor.trust ?? 60,
    memory: actor.memory ?? [],
    history: actor.history ?? [],
  };
}

function defaultActors() {
  return Object.fromEntries(Object.values(CLUB_LIFE_ACTORS).map(actor => [actor.id, normalizeActor(actor)]));
}

function normalizeClubLife(state = {}) {
  return {
    actors: { ...defaultActors(), ...(state.actors ?? {}) },
    issues: state.issues ?? {},
    memories: state.memories ?? [],
    log: state.log ?? [],
    lastProcessedMatchday: state.lastProcessedMatchday ?? null,
  };
}

export function ensureClubLifeState(game) {
  if (!game) return game;
  return { ...game, clubLife: normalizeClubLife(game.clubLife) };
}

function daysSince(issue, game) {
  const created = issue.date?.matchday ?? game.matchday ?? 1;
  return Math.max(0, (game.matchday ?? 1) - created);
}

function nextFixture(game) {
  return (game.fixtures ?? []).find(f => !f.played && (f.homeTeamId === game.teamId || f.awayTeamId === game.teamId));
}

function lastUserFixture(game) {
  return [...(game.fixtures ?? [])]
    .filter(f => f.played && (f.homeTeamId === game.teamId || f.awayTeamId === game.teamId))
    .sort((a, b) => (b.matchday ?? 0) - (a.matchday ?? 0))[0] ?? null;
}

function resultForUser(game, fixture) {
  if (!fixture) return null;
  const isHome = fixture.homeTeamId === game.teamId;
  const userGoals = isHome ? fixture.homeGoals : fixture.awayGoals;
  const oppGoals = isHome ? fixture.awayGoals : fixture.homeGoals;
  return { userGoals, oppGoals, lost: userGoals < oppGoals, won: userGoals > oppGoals, margin: Math.abs(userGoals - oppGoals) };
}

function issue(game, data) {
  const stamp = currentStamp(game);
  return {
    id: data.id,
    origin: data.origin,
    actorId: data.actorId,
    person: data.person ?? null,
    priority: data.priority ?? "normal",
    date: data.date ?? stamp,
    expiresAt: data.expiresAt ?? { season: stamp.season, matchday: stamp.matchday + 4 },
    status: data.status ?? "open",
    escalationLevel: data.escalationLevel ?? 0,
    actionRequired: data.actionRequired,
    consequenceIfIgnored: data.consequenceIfIgnored,
    expectedOutcome: data.expectedOutcome,
    title: data.title,
    message: data.message,
    emotionalState: data.emotionalState ?? "neutral",
    action: data.action ?? { screen: "dashboard" },
    actionLabel: data.actionLabel ?? "Responder",
    payload: data.payload ?? {},
  };
}

function contractYearsLeft(player, game) {
  return Number(player.contractEnd ?? 9999) - Number(game.season ?? 2025);
}

function observeNeeds(game, context = {}) {
  const needs = [];
  const lineupCount = (context.lineup ?? game._lineup ?? []).filter(Boolean).length;
  const fixture = nextFixture(game);
  if (fixture && lineupCount < 11) {
    needs.push(issue(game, {
      id: `life-lineup:${game.season}:${game.matchday}`,
      origin: "lineup",
      actorId: "assistantCoach",
      priority: "urgent",
      title: "El once no está preparado",
      message: "Míster, todavía no hemos preparado el once para el próximo partido.",
      emotionalState: "directo",
      actionRequired: "Completar alineación antes de jugar.",
      consequenceIfIgnored: "El equipo puede llegar al partido con una estructura incompleta.",
      expectedOutcome: "Once titular definido.",
      action: { screen: "lineup" },
      actionLabel: "Preparar once",
      expiresAt: { season: String(game.season ?? "2025"), matchday: game.matchday ?? 1 },
    }));
  }

  const expiring = [...(game.players ?? [])]
    .filter(player => contractYearsLeft(player, game) <= 1)
    .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))[0];
  if (expiring) {
    needs.push(issue(game, {
      id: `life-contract:${expiring.id}:${game.season}`,
      origin: "contracts",
      actorId: "sportingDirector",
      person: { type: "player", id: expiring.id, name: expiring.name, portrait: expiring.imageUrl || `/players/${expiring.id}.png` },
      priority: expiring.overall >= 78 ? "urgent" : "important",
      title: `${expiring.name} necesita claridad contractual`,
      message: `He revisado el contrato de ${expiring.name}. Nos estamos quedando sin margen para negociar.`,
      emotionalState: "serio",
      actionRequired: "Decidir si se abre una renovación.",
      consequenceIfIgnored: "El jugador puede perder confianza o escuchar propuestas externas.",
      expectedOutcome: "Situación contractual definida.",
      action: { screen: "contracts", playerId: expiring.id },
      actionLabel: "Negociar",
      expiresAt: { season: String(game.season ?? "2025"), matchday: (game.matchday ?? 1) + 5 },
      payload: { playerId: expiring.id },
    }));
  }

  const risky = (game.players ?? [])
    .map(player => ({ player, risk: calculateInjuryRisk(player, { fixtures: game.fixtures, teamId: game.teamId, game }) }))
    .filter(item => !item.player.injured && item.risk >= 76)
    .sort((a, b) => b.risk - a.risk)[0];
  if (risky) {
    needs.push(issue(game, {
      id: `life-medical-risk:${risky.player.id}:${Math.floor(risky.risk / 10)}`,
      origin: "medical",
      actorId: "doctor",
      priority: "urgent",
      title: `${risky.player.name} necesita descanso`,
      message: `${risky.player.name} está acumulando señales de riesgo. Yo no lo forzaría.`,
      emotionalState: "preocupado",
      actionRequired: "Revisar carga, entrenamiento o alineación.",
      consequenceIfIgnored: "Aumenta el riesgo de lesión y bajada de rendimiento.",
      expectedOutcome: "Riesgo físico reducido.",
      action: { screen: "medical", playerId: risky.player.id },
      actionLabel: "Ver informe",
      payload: { playerId: risky.player.id, risk: risky.risk },
    }));
  }

  const locker = getLockerRoomSummary(game.players ?? []);
  if (locker.atmosphere === "tenso" || locker.unhappy.length >= 2) {
    needs.push(issue(game, {
      id: `life-locker:${game.season}:${game.matchday}:${locker.unhappy.length}`,
      origin: "lockerRoom",
      actorId: "captain",
      priority: locker.unhappy.length >= 3 ? "urgent" : "important",
      title: "El vestuario necesita una señal",
      message: `Hay ${locker.unhappy.length} jugador${locker.unhappy.length === 1 ? "" : "es"} molesto${locker.unhappy.length === 1 ? "" : "s"}. El grupo espera que hagas algo.`,
      emotionalState: "serio",
      actionRequired: "Hablar con el grupo o revisar minutos/roles.",
      consequenceIfIgnored: "Puede caer la moral colectiva y crecer la desconfianza.",
      expectedOutcome: "Vestuario estabilizado.",
      action: { screen: "lockerRoom" },
      actionLabel: "Hablar",
    }));
  }

  const incomingOffer = (game.transferMarket?.incomingOffers ?? []).find(offer => offer.status === "pending");
  if (incomingOffer) {
    needs.push(issue(game, {
      id: `life-offer:${incomingOffer.id}`,
      origin: "market",
      actorId: "sportingDirector",
      priority: "important",
      title: `Oferta por ${incomingOffer.playerName}`,
      message: `Ha llegado una oferta por ${incomingOffer.playerName}. Necesitamos decidir antes de que se enfríe.`,
      emotionalState: "expectante",
      actionRequired: "Aceptar, rechazar o negociar la oferta.",
      consequenceIfIgnored: "La operación puede caducar y afectar a la planificación.",
      expectedOutcome: "Respuesta al club comprador.",
      action: { screen: "transfers" },
      actionLabel: "Revisar oferta",
      payload: { offerId: incomingOffer.id },
    }));
  }

  const last = lastUserFixture(game);
  const result = resultForUser(game, last);
  if (last && last.matchday === (game.matchday ?? 1) - 1 && result?.lost && result.margin >= 2) {
    needs.push(issue(game, {
      id: `life-press-loss:${last.id}`,
      origin: "press",
      actorId: "pressOfficer",
      priority: "important",
      title: "La prensa espera una explicación",
      message: "La sala de prensa está pendiente de tu reacción. Conviene controlar el mensaje.",
      emotionalState: "tenso",
      actionRequired: "Responder públicamente o proteger al grupo.",
      consequenceIfIgnored: "La presión externa puede aumentar sobre jugadores y entrenador.",
      expectedOutcome: "Mensaje público definido.",
      action: { screen: "news" },
      actionLabel: "Responder",
    }));
  }

  const fanSupport = game.fanbase?.support ?? game.fanLove ?? 70;
  if (fanSupport < 42) {
    needs.push(issue(game, {
      id: `life-fans:${game.season}:${Math.floor(fanSupport / 10)}`,
      origin: "fans",
      actorId: "president",
      priority: "important",
      title: "La afición está perdiendo confianza",
      message: "La grada está empezando a dudar. Necesitamos una reacción deportiva o un mensaje claro.",
      emotionalState: "exigente",
      actionRequired: "Revisar objetivos, discurso o rendimiento.",
      consequenceIfIgnored: "Bajará la confianza institucional y aumentará la presión.",
      expectedOutcome: "Afición contenida.",
      action: { screen: "fans" },
      actionLabel: "Escuchar afición",
    }));
  }

  const prospect = [...(game.youth?.players ?? [])].sort((a, b) => (b.potential ?? 0) - (a.potential ?? 0))[0];
  if (prospect && (prospect.potential ?? 0) >= 86 && (game.players ?? []).length < 30) {
    needs.push(issue(game, {
      id: `life-youth:${prospect.id}:${game.season}`,
      origin: "youth",
      actorId: "academyChief",
      priority: "normal",
      title: `${prospect.name} está llamando a la puerta`,
      message: `${prospect.name} está creciendo rápido. Creo que merece que lo mires con calma.`,
      emotionalState: "ilusionado",
      actionRequired: "Valorar promoción o plan de desarrollo.",
      consequenceIfIgnored: "El jugador puede estancarse o perder una oportunidad de integración.",
      expectedOutcome: "Decisión sobre su desarrollo.",
      action: { screen: "youth", playerId: prospect.id },
      actionLabel: "Ver cantera",
      payload: { playerId: prospect.id },
    }));
  }

  return needs;
}

function applyIgnoredConsequence(game, issueItem) {
  if (issueItem.consequenceAppliedAt === game.matchday) return game;
  let updated = game;
  if (issueItem.payload?.playerId) {
    updated = {
      ...updated,
      players: (updated.players ?? []).map(player => player.id === issueItem.payload.playerId
        ? { ...player, morale: Math.max(1, (player.morale ?? 70) - 3), managerTrust: Math.max(1, (player.managerTrust ?? 70) - 4) }
        : player),
    };
  }
  if (issueItem.origin === "lockerRoom") {
    updated = {
      ...updated,
      players: (updated.players ?? []).map(player => ({ ...player, morale: Math.max(1, (player.morale ?? 70) - 2), managerTrust: Math.max(1, (player.managerTrust ?? 70) - 1) })),
    };
  }
  if (issueItem.origin === "fans" && updated.legacy) {
    updated = { ...updated, legacy: { ...updated.legacy, confidence: Math.max(0, (updated.legacy.confidence ?? 65) - 2) } };
  }
  const state = normalizeClubLife(updated.clubLife);
  return {
    ...updated,
    clubLife: {
      ...state,
      issues: {
        ...state.issues,
        [issueItem.id]: { ...issueItem, consequenceAppliedAt: game.matchday ?? 1 },
      },
    },
  };
}

function evolveIssue(game, issueItem) {
  if (issueItem.status !== "open") return { game, issue: issueItem };
  const age = daysSince(issueItem, game);
  let nextIssue = issueItem;
  let nextGame = game;
  if (age >= 3 && issueItem.escalationLevel < 1) {
    nextIssue = {
      ...nextIssue,
      escalationLevel: 1,
      priority: issueItem.priority === "info" ? "normal" : issueItem.priority === "normal" ? "important" : issueItem.priority,
      emotionalState: ["preocupado", "serio", "expectante"].includes(issueItem.emotionalState) ? issueItem.emotionalState : "preocupado",
      message: `${issueItem.message} Ya lleva varios días sin resolverse.`,
    };
  }
  if (age >= 7 && issueItem.escalationLevel < 2) {
    nextIssue = {
      ...nextIssue,
      escalationLevel: 2,
      priority: "urgent",
      emotionalState: "enfadado",
      message: `${issueItem.message} La situación empieza a tener consecuencias.`,
    };
    nextGame = applyIgnoredConsequence(nextGame, nextIssue);
  }
  if (age >= 15 && issueItem.escalationLevel < 3) {
    nextIssue = {
      ...nextIssue,
      escalationLevel: 3,
      priority: "urgent",
      status: "ignored",
      emotionalState: "enfadado",
    };
    nextGame = applyIgnoredConsequence(nextGame, nextIssue);
  }
  return { game: nextGame, issue: nextIssue };
}

export function advanceClubLife(game, context = {}) {
  if (!game) return game;
  let safeGame = ensureClubLifeState(game);
  let state = normalizeClubLife(safeGame.clubLife);
  const observed = observeNeeds(safeGame, context);
  let issues = { ...state.issues };

  observed.forEach(item => {
    const existing = issues[item.id];
    if (!existing || ["resolved", "ignored", "dismissed"].includes(existing.status)) {
      issues[item.id] = item;
    } else {
      issues[item.id] = { ...existing, ...item, date: existing.date, status: existing.status, escalationLevel: existing.escalationLevel ?? 0 };
    }
  });

  safeGame = { ...safeGame, clubLife: { ...state, issues } };
  state = normalizeClubLife(safeGame.clubLife);
  issues = {};
  Object.values(state.issues).forEach(item => {
    const evolved = evolveIssue(safeGame, item);
    safeGame = evolved.game;
    issues[evolved.issue.id] = evolved.issue;
  });

  return {
    ...safeGame,
    clubLife: {
      ...normalizeClubLife(safeGame.clubLife),
      issues,
      lastProcessedMatchday: safeGame.matchday ?? 1,
    },
  };
}

export function getClubLifeIssues(game, context = {}) {
  if (!game) return [];
  const safeGame = advanceClubLife(game, context);
  const state = normalizeClubLife(safeGame.clubLife);
  return Object.values(state.issues)
    .filter(item => item.status === "open")
    .sort((a, b) => PRIORITY_SCORE[a.priority] - PRIORITY_SCORE[b.priority] || (a.date?.matchday ?? 0) - (b.date?.matchday ?? 0));
}

export function resolveClubLifeIssue(game, issueId, outcome = "resolved") {
  const safeGame = ensureClubLifeState(game);
  const state = normalizeClubLife(safeGame.clubLife);
  const current = state.issues[issueId];
  if (!current) return safeGame;
  return {
    ...safeGame,
    clubLife: {
      ...state,
      issues: {
        ...state.issues,
        [issueId]: {
          ...current,
          status: outcome,
          resolvedAt: currentStamp(safeGame),
        },
      },
      log: [
        { id: `club_life_log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, issueId, outcome, season: String(safeGame.season ?? "2025"), matchday: safeGame.matchday ?? 1, createdAt: Date.now() },
        ...state.log,
      ].slice(0, 100),
    },
  };
}
