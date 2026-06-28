import { getAccumulatedLoad } from "../medical/medicalEngine.js";

const EVENT_SIDE = {
  user: "user",
  opp: "opponent",
};

function eventSide(event, isHome) {
  if (EVENT_SIDE[event?.team]) return EVENT_SIDE[event.team];
  if (event?.team === "home") return isHome ? "user" : "opponent";
  if (event?.team === "away") return isHome ? "opponent" : "user";
  return "neutral";
}

function countEvents(events, isHome, side, types) {
  const typeSet = new Set(types);
  return events.filter(event => eventSide(event, isHome) === side && typeSet.has(event.type)).length;
}

function yellowsByPlayer(events, isHome, side) {
  return events.reduce((map, event) => {
    if (event.type !== "YELLOW" || !event.playerId || eventSide(event, isHome) !== side) return map;
    map[event.playerId] = (map[event.playerId] ?? 0) + 1;
    return map;
  }, {});
}

function signalRank(signal) {
  return { urgent: 4, important: 3, warning: 2, info: 1 }[signal.severity] ?? 0;
}

function activePlayerIds(ids = [], blockedIds = []) {
  const blocked = new Set(blockedIds);
  return ids.filter(id => id && !blocked.has(id));
}

export function buildLiveMatchState({
  minute = 0,
  events = [],
  score = { home: 0, away: 0 },
  isHome = true,
  userPlayers = [],
  opponentPlayers = [],
  lineup = [],
  opponentLineup = [],
  sentOffIds = [],
  opponentSentOffIds = [],
  tactics = {},
  subsUsed = 0,
  maxSubs = 5,
}) {
  const userGoals = isHome ? score.home : score.away;
  const opponentGoals = isHome ? score.away : score.home;
  const userActiveIds = activePlayerIds(lineup, sentOffIds);
  const opponentActiveIds = activePlayerIds(opponentLineup, opponentSentOffIds);
  const userActive = userActiveIds
    .map(id => userPlayers.find(player => player.id === id))
    .filter(player => player && !player.injured);
  const opponentActive = opponentActiveIds
    .map(id => opponentPlayers.find(player => player.id === id))
    .filter(Boolean);
  const yellowMap = yellowsByPlayer(events, isHome, "user");

  const userGoalsCount = countEvents(events, isHome, "user", ["GOAL", "PENALTY"]);
  const opponentGoalsCount = countEvents(events, isHome, "opponent", ["GOAL", "PENALTY"]);
  const userBigChances = countEvents(events, isHome, "user", ["BIG_CHANCE"]);
  const opponentBigChances = countEvents(events, isHome, "opponent", ["BIG_CHANCE"]);
  const userSaves = countEvents(events, isHome, "user", ["SAVE"]);
  const opponentSaves = countEvents(events, isHome, "opponent", ["SAVE"]);

  const stats = {
    userGoals,
    opponentGoals,
    userShots: userGoalsCount + userBigChances + opponentSaves,
    opponentShots: opponentGoalsCount + opponentBigChances + userSaves,
    userBigChances,
    opponentBigChances,
    userSaves,
    opponentSaves,
    userYellows: countEvents(events, isHome, "user", ["YELLOW"]),
    opponentYellows: countEvents(events, isHome, "opponent", ["YELLOW"]),
    userReds: countEvents(events, isHome, "user", ["RED"]),
    opponentReds: countEvents(events, isHome, "opponent", ["RED"]),
    userActiveCount: userActive.length,
    opponentActiveCount: opponentActive.length,
  };

  const signals = [];
  const subsLeft = Math.max(0, maxSubs - subsUsed);
  const mostTired = [...userActive]
    .filter(player => player.group !== "POR")
    .sort((a, b) => (b.fatigue ?? 0) - (a.fatigue ?? 0))[0];

  if (minute >= 55 && mostTired && (mostTired.fatigue ?? 0) >= 78 && subsLeft > 0) {
    signals.push({
      key: `fatigue:${mostTired.id}:critical`,
      source: "doctor",
      severity: "urgent",
      title: `${mostTired.name} esta al limite`,
      message: `El medico avisa: acumula ${Math.round(mostTired.fatigue ?? 0)} de cansancio y su carga previa es ${Math.round(getAccumulatedLoad(mostTired))}. Conviene valorar un cambio.`,
      action: "Abrir cambios",
      targetTab: "cambios",
      requiresDecision: true,
    });
  } else if (minute >= 60 && mostTired && (mostTired.fatigue ?? 0) >= 68) {
    signals.push({
      key: `fatigue:${mostTired.id}:warning`,
      source: "doctor",
      severity: "warning",
      title: `${mostTired.name} empieza a sufrir`,
      message: `Su cansancio ya es ${Math.round(mostTired.fatigue ?? 0)}. Si el partido se rompe, puede ser el primer candidato a salir.`,
      action: "Revisar banquillo",
      targetTab: "cambios",
      requiresDecision: false,
    });
  }

  const cardRisk = userActive.find(player => yellowMap[player.id] >= 1 && player.group !== "POR");
  if (minute >= 35 && cardRisk && subsLeft > 0) {
    signals.push({
      key: `yellow:${cardRisk.id}:${yellowMap[cardRisk.id]}`,
      source: "assistant",
      severity: minute >= 60 ? "important" : "warning",
      title: `${cardRisk.name} juega condicionado`,
      message: `El segundo entrenador recuerda que ya tiene amarilla. Si el rival carga por su zona, hay riesgo de quedarnos con diez.`,
      action: "Valorar cambio",
      targetTab: "cambios",
      requiresDecision: minute >= 60,
    });
  }

  if (minute >= 60 && userGoals < opponentGoals && tactics.mentalidad !== "ofensiva") {
    signals.push({
      key: `tactical:losing:${minute >= 75 ? "late" : "mid"}`,
      source: "assistant",
      severity: minute >= 75 ? "urgent" : "important",
      title: "El partido pide una decision",
      message: `Vamos por detras y seguimos con mentalidad ${tactics.mentalidad ?? "equilibrada"}. El segundo entrenador propone ajustar el plan antes de que se escape.`,
      action: "Abrir tacticas",
      targetTab: "tacticas",
      requiresDecision: true,
    });
  }

  if (minute >= 70 && userGoals > opponentGoals && tactics.mentalidad === "ofensiva") {
    signals.push({
      key: "tactical:protect_lead",
      source: "assistant",
      severity: "important",
      title: "Toca proteger el resultado",
      message: "El segundo entrenador ve al equipo partido. Podemos bajar riesgos o refrescar piernas para cerrar el partido.",
      action: "Ajustar tacticas",
      targetTab: "tacticas",
      requiresDecision: true,
    });
  }

  if (minute >= 50 && stats.opponentBigChances >= stats.userBigChances + 2) {
    signals.push({
      key: "flow:opponent_chances",
      source: "assistant",
      severity: "important",
      title: "El rival esta encontrando ocasiones",
      message: "Los datos en directo muestran demasiadas llegadas claras del rival. El banquillo pide corregir antes del siguiente tramo.",
      action: "Revisar tacticas",
      targetTab: "tacticas",
      requiresDecision: true,
    });
  }

  const mood = userGoals > opponentGoals
    ? "control"
    : userGoals < opponentGoals
      ? "chasing"
      : stats.opponentBigChances > stats.userBigChances
        ? "warning"
        : "balanced";

  return {
    stats,
    signals: signals.sort((a, b) => signalRank(b) - signalRank(a)),
    mood,
  };
}
