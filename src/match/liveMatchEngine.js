import { getAccumulatedLoad } from "../medical/medicalEngine.js";
import { getTrainingMatchModifiers } from "../training/trainingEngine.js";

const EVENT_SIDE = {
  user: "user",
  opp: "opponent",
};

function eventSide(event, isHome, context = {}) {
  if (event?.teamId && event.teamId === context.userTeamId) return "user";
  if (event?.teamId && event.teamId === context.opponentTeamId) return "opponent";
  if (event?.playerId && context.userPlayerIds?.has(event.playerId)) return "user";
  if (event?.playerId && context.opponentPlayerIds?.has(event.playerId)) return "opponent";
  if (EVENT_SIDE[event?.team]) return EVENT_SIDE[event.team];
  if (event?.team === "home") return isHome ? "user" : "opponent";
  if (event?.team === "away") return isHome ? "opponent" : "user";
  return "neutral";
}

function countEvents(events, isHome, side, types, context) {
  const typeSet = new Set(types);
  return events.filter(event => eventSide(event, isHome, context) === side && typeSet.has(event.type)).length;
}

function yellowsByPlayer(events, isHome, side, context) {
  return events.reduce((map, event) => {
    if (event.type !== "YELLOW" || !event.playerId || eventSide(event, isHome, context) !== side) return map;
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
  userTeamId = null,
  opponentTeamId = null,
  lineup = [],
  opponentLineup = [],
  sentOffIds = [],
  opponentSentOffIds = [],
  tactics = {},
  formation = "4-3-3",
  opponentFormation = "4-3-3",
  trainingPlan = null,
  subsUsed = 0,
  maxSubs = 5,
}) {
  const userGoals = isHome ? score.home : score.away;
  const opponentGoals = isHome ? score.away : score.home;
  const sideContext = {
    userTeamId,
    opponentTeamId,
    userPlayerIds: new Set(userPlayers.map(player => player.id)),
    opponentPlayerIds: new Set(opponentPlayers.map(player => player.id)),
  };
  const userActiveIds = activePlayerIds(lineup, sentOffIds);
  const opponentActiveIds = activePlayerIds(opponentLineup, opponentSentOffIds);
  const userActive = userActiveIds
    .map(id => userPlayers.find(player => player.id === id))
    .filter(player => player && !player.injured);
  const opponentActive = opponentActiveIds
    .map(id => opponentPlayers.find(player => player.id === id))
    .filter(Boolean);
  const yellowMap = yellowsByPlayer(events, isHome, "user", sideContext);
  const trainingMod = getTrainingMatchModifiers(trainingPlan);

  const userGoalsCount = countEvents(events, isHome, "user", ["GOAL", "PENALTY"], sideContext);
  const opponentGoalsCount = countEvents(events, isHome, "opponent", ["GOAL", "PENALTY"], sideContext);
  const userChanceEvents = countEvents(events, isHome, "user", ["BIG_CHANCE", "DANGEROUS_CROSS", "CORNER"], sideContext);
  const opponentChanceEvents = countEvents(events, isHome, "opponent", ["BIG_CHANCE", "DANGEROUS_CROSS", "CORNER"], sideContext);
  const userBlockedShots = countEvents(events, isHome, "user", ["BLOCKED_SHOT"], sideContext);
  const opponentBlockedShots = countEvents(events, isHome, "opponent", ["BLOCKED_SHOT"], sideContext);
  const userSaves = countEvents(events, isHome, "user", ["SAVE"], sideContext);
  const opponentSaves = countEvents(events, isHome, "opponent", ["SAVE"], sideContext);

  const stats = {
    userGoals,
    opponentGoals,
    userShots: userGoalsCount + userChanceEvents + userBlockedShots + opponentSaves,
    opponentShots: opponentGoalsCount + opponentChanceEvents + opponentBlockedShots + userSaves,
    userBigChances: userGoalsCount + opponentSaves + userChanceEvents,
    opponentBigChances: opponentGoalsCount + userSaves + opponentChanceEvents,
    userSaves,
    opponentSaves,
    userShotsOnTarget: userGoalsCount + opponentSaves,
    opponentShotsOnTarget: opponentGoalsCount + userSaves,
    userYellows: countEvents(events, isHome, "user", ["YELLOW"], sideContext),
    opponentYellows: countEvents(events, isHome, "opponent", ["YELLOW"], sideContext),
    userReds: countEvents(events, isHome, "user", ["RED"], sideContext),
    opponentReds: countEvents(events, isHome, "opponent", ["RED"], sideContext),
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

  if (minute >= 60 && userGoals < opponentGoals && !["4-3-3","3-5-2"].includes(formation)) {
    signals.push({
      key: `formation:attack:${formation}`,
      source: "assistant",
      severity: minute >= 75 ? "urgent" : "important",
      title: "Podemos cambiar el dibujo",
      message: "El segundo entrenador propone pasar a un sistema mas ofensivo para ganar metros y cargar el area.",
      action: "Cambiar formacion",
      targetTab: "tacticas",
      suggestedFormation: "4-3-3",
      requiresDecision: true,
    });
  }

  if (minute >= 70 && userGoals > opponentGoals && !["5-4-1","5-3-2","4-5-1"].includes(formation)) {
    signals.push({
      key: `formation:protect:${formation}`,
      source: "assistant",
      severity: "important",
      title: "Cerrar mejor el partido",
      message: "El segundo entrenador cree que una linea mas protegida ayudaria a defender el resultado sin romper al equipo.",
      action: "Cambiar formacion",
      targetTab: "tacticas",
      suggestedFormation: "5-4-1",
      requiresDecision: true,
    });
  }

  if (minute >= 35 && stats.userReds > stats.opponentReds && !["5-4-1","5-3-2","4-4-2"].includes(formation)) {
    signals.push({
      key: `formation:red:${formation}:${stats.userReds}`,
      source: "assistant",
      severity: "urgent",
      title: "Reajustar tras la expulsion",
      message: "Con uno menos, el banquillo pide recolocar el equipo antes de que el rival encuentre espacios.",
      action: "Cambiar formacion",
      targetTab: "tacticas",
      suggestedFormation: "5-4-1",
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

  if (minute >= 25 && trainingMod.focusId && trainingMod.focusId !== "balanced") {
    const setPieceEvents = countEvents(events, isHome, "user", ["CORNER", "DANGEROUS_FOUL"], sideContext);
    const pressureEvents = countEvents(events, isHome, "user", ["DANGEROUS_FOUL", "BLOCKED_SHOT", "DEFENSIVE_ACTION"], sideContext);
    const shouldMention =
      (trainingMod.setPieceAttack > 0 && setPieceEvents >= 1)
      || (trainingMod.pressure > 0 && pressureEvents >= 1)
      || (trainingMod.goalConv > 0 && stats.userShotsOnTarget >= 1)
      || (trainingMod.defense > 0 && stats.opponentBigChances <= stats.userBigChances + 1)
      || (trainingMod.possession > 0 && stats.userShots >= stats.opponentShots);
    if (shouldMention) {
      signals.push({
        key: `training-focus:${trainingMod.focusId}`,
        source: "assistant",
        severity: "info",
        title: `Se nota el trabajo de ${trainingMod.focusName}`,
        message: "El segundo entrenador apunta que parte de lo trabajado esta semana empieza a aparecer en el partido. No garantiza nada, pero el equipo reconoce el plan.",
        action: "Seguir observando",
        targetTab: "eventos",
        requiresDecision: false,
      });
    }
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
