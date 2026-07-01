import { calculateInjuryRisk, getAccumulatedLoad, getPhysicalStatus, getRiskLevel } from "../medical/medicalEngine.js";
import { ensurePlayerMorale } from "../morale/moraleEngine.js";

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(Number(value ?? 0))));

const isRecoveringPhase = phase => ["recovery", "limited"].includes(phase);

export function buildPlayerState(player, game = null) {
  if (!player) return null;
  const normalized = ensurePlayerMorale(player, game?.season);
  const physicalStatus = getPhysicalStatus(normalized);
  const injuryRisk = calculateInjuryRisk(normalized, {
    fixtures: game?.fixtures ?? [],
    teamId: game?.teamId,
    game,
  });
  const accumulatedLoad = getAccumulatedLoad(normalized);
  const medicalPhase = normalized.medical?.phase ?? (normalized.injured ? "injured" : "available");
  const isInjured = Boolean(normalized.injured || medicalPhase === "injured");
  const isRecovering = Boolean(!isInjured && isRecoveringPhase(medicalPhase));
  const suspensionGames = normalized.suspGames ?? normalized.suspensionGames ?? 0;
  const isSuspended = Boolean(normalized.suspended || suspensionGames > 0);
  const fatigue = clamp(normalized.fatigue ?? 0);
  const energy = clamp(100 - fatigue);
  const lastEvent = normalized.moraleEvents?.[0] ?? normalized.medicalHistory?.at?.(-1) ?? null;

  return {
    ...normalized,
    fatigue,
    energy,
    injuryRisk,
    riskLevel: getRiskLevel(injuryRisk),
    accumulatedLoad,
    physicalStatus,
    medicalPhase,
    isInjured,
    isRecovering,
    isSuspended,
    isAvailable: !isInjured && !isSuspended,
    availabilityLabel: isInjured ? "Lesionado" : isSuspended ? "Sancionado" : isRecovering ? "Apto con limitaciones" : "Disponible",
    availabilityReason: isInjured
      ? normalized.medical?.type ?? "Tiene una lesión activa."
      : isSuspended
        ? `No puede jugar por sanción${suspensionGames ? ` (${suspensionGames} jornada${suspensionGames === 1 ? "" : "s"})` : ""}.`
        : isRecovering
          ? "Está en recuperación progresiva y conviene controlar la carga."
          : "",
    lastEvent,
  };
}

export function getMedicalAlerts(game, { limit = null, riskThreshold = 50, loadThreshold = 55 } = {}) {
  const alerts = (game?.players ?? [])
    .map(player => {
      const state = buildPlayerState(player, game);
      return {
        player,
        state,
        risk: state.injuryRisk,
        status: state.physicalStatus,
        load: state.accumulatedLoad,
      };
    })
    .filter(item => item.state.isInjured || item.state.isRecovering || item.risk > riskThreshold || item.load >= loadThreshold)
    .sort((a, b) =>
      Number(b.state.isInjured) - Number(a.state.isInjured)
      || Number(b.state.isRecovering) - Number(a.state.isRecovering)
      || b.risk - a.risk
      || b.load - a.load
    );
  return limit ? alerts.slice(0, limit) : alerts;
}

export function getInjuryRiskBadge(state) {
  if (!state) return null;
  const level = state.riskLevel?.id;
  const risk = state.injuryRisk ?? 0;
  if (level === "critical") return { level: "high", label: `🔴 Riesgo crítico ${risk}%`, risk, color: state.riskLevel.color };
  if (level === "high") return { level: "high", label: `🟠 Riesgo alto ${risk}%`, risk, color: state.riskLevel.color };
  if (level === "moderate") return { level: "mid", label: `🟡 Riesgo moderado ${risk}%`, risk, color: state.riskLevel.color };
  return null;
}

export function getPlayerSmartActions(player, game = null) {
  const state = buildPlayerState(player, game);
  if (!state) return [];

  if (state.isInjured) {
    return [{
      id: "medical",
      label: "Ver recuperación",
      screen: "medical",
      reason: `${state.name} no puede recibir minutos ahora mismo: ${state.availabilityReason}`,
    }];
  }

  if (state.isSuspended) {
    return [{
      id: "lineup-suspension",
      label: "Revisar sanción",
      screen: "lineup",
      reason: `${state.name} no está disponible para el próximo partido por sanción.`,
    }];
  }

  const actions = [];
  if (state.injuryRisk >= 76 || state.accumulatedLoad >= 65 || state.fatigue >= 65) {
    actions.push({
      id: "training-load",
      label: "Reducir carga",
      screen: "training",
      reason: `Riesgo ${state.injuryRisk}% y carga ${state.accumulatedLoad}/100. Conviene protegerlo antes de darle más minutos.`,
    });
  } else if ((state.morale ?? 70) < 45 || (state.happiness ?? 70) < 45 || (state.managerTrust ?? 70) < 45) {
    actions.push({
      id: "lineup-minutes",
      label: "Dar minutos",
      screen: "lineup",
      reason: "Está disponible y su situación emocional puede mejorar con protagonismo deportivo.",
    });
  }

  if (Number(state.contractEnd ?? 9999) <= Number(game?.season ?? 2025) + 1) {
    actions.push({
      id: "contract",
      label: "Contrato",
      screen: "contracts",
      reason: "Su situación contractual requiere una decisión del club.",
    });
  }

  if (!actions.length) {
    actions.push({
      id: "profile",
      label: "Ver perfil",
      screen: "profile",
      reason: "No hay una acción urgente; conviene revisar su contexto completo.",
    });
  }

  return actions.slice(0, 3);
}

export function sanitizeLineupSelection(lineup = [], subs = [], players = [], sizes = {}) {
  const starterSize = sizes.starters ?? 11;
  const benchSize = sizes.bench ?? 12;
  const byId = new Map(players.map(player => [player.id, player]));
  const used = new Set();
  const removed = [];

  const cleanSlot = (id, slotType, index) => {
    if (!id) return null;
    const player = byId.get(id);
    const state = player ? buildPlayerState(player) : null;
    let reason = "";
    if (!player) reason = "ya no existe en la plantilla";
    else if (used.has(id)) reason = "estaba duplicado";
    else if (!state.isAvailable) reason = state.availabilityReason || state.availabilityLabel.toLowerCase();

    if (reason) {
      removed.push({ id, name: player?.name ?? id, reason, slotType, index });
      return null;
    }

    used.add(id);
    return id;
  };

  const cleanLineup = Array.from({ length: starterSize }, (_, index) => cleanSlot(lineup[index], "titular", index));
  const cleanSubs = Array.from({ length: benchSize }, (_, index) => cleanSlot(subs[index], "banquillo", index));
  return { lineup: cleanLineup, subs: cleanSubs, removed };
}

export function cleanConsequenceText(text, fallback = "Hay una consecuencia pendiente que revisar.") {
  const cleaned = String(text ?? "")
    .replace(/\bundefined\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
  return cleaned || fallback;
}

export const PlayerState = {
  build: buildPlayerState,
  smartActions: getPlayerSmartActions,
  sanitizeLineupSelection,
};

export const MedicalState = {
  alerts: getMedicalAlerts,
};

export const TransferState = {};
export const AttentionState = {};
export const TrainingState = {};
export const CompetitionState = {};
