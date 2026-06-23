import { calculateInjuryRisk, formatMedicalDuration } from "../medical/medicalEngine.js";

const PRIORITY_ORDER = { critical: 0, important: 1, info: 2 };
const CATEGORY_ORDER = ["medical", "market", "contracts", "board", "youth", "training", "match"];

export const ATTENTION_CATEGORIES = {
  medical: { label: "Médico", icon: "🏥", accent: "#ef4444" },
  market: { label: "Mercado", icon: "💰", accent: "#22c55e" },
  contracts: { label: "Contratos", icon: "📄", accent: "#f59e0b" },
  board: { label: "Directiva", icon: "🏛", accent: "#a78bfa" },
  youth: { label: "Cantera", icon: "🌱", accent: "#84cc16" },
  training: { label: "Entrenamiento", icon: "🏋", accent: "#60a5fa" },
  match: { label: "Partido", icon: "⚽", accent: "#c9a84c" },
};

export const ATTENTION_PRIORITIES = {
  critical: { label: "Crítico", icon: "🔴", color: "#ef4444" },
  important: { label: "Importante", icon: "🟠", color: "#f59e0b" },
  info: { label: "Informativo", icon: "🔵", color: "#60a5fa" },
};

function stateFor(game, id) {
  return game.attentionCenter?.items?.[id] ?? {};
}

function withState(game, item) {
  const saved = stateFor(game, item.id);
  return {
    ...item,
    status: saved.status ?? "new",
    firstSeenAt: saved.firstSeenAt ?? null,
    updatedAt: saved.updatedAt ?? null,
    dismissed: saved.status === "dismissed" || saved.status === "resolved",
  };
}

function createItem(game, item) {
  return withState(game, {
    season: String(game.season ?? "2025"),
    matchday: game.matchday ?? 1,
    actionLabel: "Revisar",
    ...item,
  });
}

function nextFixture(game) {
  return (game.fixtures ?? []).find(f => !f.played && (f.homeTeamId === game.teamId || f.awayTeamId === game.teamId));
}

function expiringContractLabel(player, game) {
  const yearsLeft = Number(player.contractEnd ?? 9999) - Number(game.season ?? 2025);
  if (yearsLeft <= 0) return "termina esta temporada";
  if (yearsLeft === 1) return "entra en su último año";
  return `termina en ${yearsLeft} años`;
}

export function getAttentionItems(game, context = {}) {
  if (!game) return [];
  const items = [];
  const fixture = nextFixture(game);
  const availableStarters = (context.lineup ?? game._lineup ?? []).filter(Boolean).length;

  if (fixture && availableStarters < 11) {
    items.push(createItem(game, {
      id: `lineup-incomplete:${game.season}:${game.matchday}`,
      category: "match",
      priority: "critical",
      title: "Alineación incompleta",
      summary: `Hay ${availableStarters}/11 titulares configurados para el próximo partido.`,
      action: { screen: "lineup" },
      actionLabel: "Completar once",
    }));
  }

  for (const player of game.players ?? []) {
    if (player.injured || (player.medical?.phase && player.medical.phase !== "available")) {
      const remaining = player.medical?.remainingDays ?? (player.injuryGames ?? 1) * 7;
      items.push(createItem(game, {
        id: `medical-injury:${player.id}:${player.medical?.startedMatchday ?? player.injuryGames ?? "active"}`,
        category: "medical",
        priority: "critical",
        title: `${player.name} está lesionado`,
        summary: `${player.medical?.type ?? "Lesión"} · ${formatMedicalDuration(remaining)} restante.`,
        playerId: player.id,
        action: { screen: "medical", playerId: player.id },
        actionLabel: "Abrir médico",
      }));
    }

    if (player.suspended || (player.suspGames ?? 0) > 0) {
      items.push(createItem(game, {
        id: `match-suspended:${player.id}:${game.season}:${player.suspGames ?? 1}`,
        category: "match",
        priority: "important",
        title: `${player.name} está sancionado`,
        summary: `No estará disponible durante ${player.suspGames ?? 1} jornada${(player.suspGames ?? 1) === 1 ? "" : "s"}.`,
        playerId: player.id,
        action: { screen: "lineup", playerId: player.id },
        actionLabel: "Revisar alineación",
      }));
    }

    const risk = calculateInjuryRisk(player, { fixtures: game.fixtures, teamId: game.teamId });
    if (!player.injured && risk >= 76) {
      items.push(createItem(game, {
        id: `training-risk:${player.id}:${game.season}:${game.matchday}`,
        category: "training",
        priority: "important",
        title: `${player.name} tiene riesgo físico crítico`,
        summary: `Riesgo de lesión ${risk}%. Conviene darle descanso o ajustar la carga.`,
        playerId: player.id,
        action: { screen: "training", playerId: player.id },
        actionLabel: "Gestionar carga",
      }));
    }

    if (Number(player.contractEnd ?? 9999) <= Number(game.season ?? 2025) + 1) {
      items.push(createItem(game, {
        id: `contract-expiring:${player.id}:${player.contractEnd ?? "unknown"}`,
        category: "contracts",
        priority: Number(player.contractEnd ?? 9999) <= Number(game.season ?? 2025) ? "critical" : "important",
        title: `${player.name} ${expiringContractLabel(player, game)}`,
        summary: "Revisa su situación contractual antes de perder margen de negociación.",
        playerId: player.id,
        action: { screen: "playerProfile", playerId: player.id },
        actionLabel: "Ver contrato",
      }));
    }
  }

  for (const offer of game.transferMarket?.incomingOffers ?? []) {
    if (offer.status !== "pending") continue;
    items.push(createItem(game, {
      id: `incoming-offer:${offer.id}`,
      category: "market",
      priority: "critical",
      title: `Oferta recibida por ${offer.playerName}`,
      summary: `${offer.type === "loan" ? "Cesión" : "Traspaso"} · €${Math.round((offer.amount ?? 0) / 1000 * 10) / 10}M sobre la mesa.`,
      playerId: offer.playerId,
      action: { screen: "transfers", tab: "vender", offerId: offer.id },
      actionLabel: "Ver oferta",
    }));
  }

  const actionableOfferStatuses = new Set(["clubCounter", "playerCounter", "roleCounter", "ready", "rejected", "outbid", "clubAccepted", "playerRejected"]);
  for (const offer of game.transferMarket?.offers ?? []) {
    if (!actionableOfferStatuses.has(offer.status)) continue;
    const critical = ["clubCounter", "playerCounter", "roleCounter", "ready", "clubAccepted"].includes(offer.status);
    const labels = {
      clubCounter: "El club pide mejorar la oferta",
      playerCounter: "El jugador pide más salario",
      roleCounter: "El jugador pide otro rol",
      ready: "Acuerdo listo para cerrar",
      rejected: "Oferta rechazada por el club",
      outbid: "Otro club se ha adelantado",
      clubAccepted: "El club acepta negociar contrato",
      playerRejected: "El jugador rechaza la propuesta",
    };
    items.push(createItem(game, {
      id: `market-response:${offer.id}:${offer.status}`,
      category: "market",
      priority: critical ? "critical" : "important",
      title: `${offer.playerName}: ${labels[offer.status] ?? "respuesta pendiente"}`,
      summary: "La operación necesita una decisión antes de seguir avanzando.",
      playerId: offer.playerId,
      action: { screen: "transfers", tab: "negociar", offerId: offer.id },
      actionLabel: "Abrir negociación",
    }));
  }

  const confidence = game.legacy?.confidence ?? 70;
  if (confidence < 50) {
    items.push(createItem(game, {
      id: `board-confidence:${game.season}:${Math.floor(confidence / 10)}`,
      category: "board",
      priority: confidence < 30 ? "critical" : "important",
      title: confidence < 30 ? "La directiva está al límite" : "La directiva muestra preocupación",
      summary: `Confianza actual: ${Math.round(confidence)}/100. Conviene revisar objetivos y resultados.`,
      action: { screen: "board" },
      actionLabel: "Ver directiva",
    }));
  }

  for (const prospect of game.youth?.players ?? []) {
    const ready = prospect.age >= 18 && (prospect.overall >= 70 || prospect.potential >= 86);
    if (!ready) continue;
    items.push(createItem(game, {
      id: `youth-ready:${prospect.id}:${game.season}`,
      category: "youth",
      priority: prospect.potential >= 88 ? "important" : "info",
      title: `${prospect.name} pide paso en la cantera`,
      summary: `${prospect.pos} de ${prospect.age} años · media ${prospect.overall} · potencial ${prospect.potential}.`,
      playerId: prospect.id,
      action: { screen: "youth", playerId: prospect.id },
      actionLabel: "Abrir cantera",
    }));
  }

  return items
    .filter(item => !item.dismissed)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      || CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
      || String(a.title).localeCompare(String(b.title)));
}

export function getAttentionCount(items = []) {
  return items.filter(item => item.priority !== "info" && !["resolved", "dismissed"].includes(item.status)).length;
}

export function groupAttentionItems(items = []) {
  return CATEGORY_ORDER.map(category => ({
    category,
    meta: ATTENTION_CATEGORIES[category],
    items: items.filter(item => item.category === category),
  })).filter(group => group.items.length);
}

export function markAttentionItem(game, itemId, status = "seen") {
  if (!game || !itemId) return game;
  const previous = game.attentionCenter?.items?.[itemId] ?? {};
  return {
    ...game,
    attentionCenter: {
      ...(game.attentionCenter ?? {}),
      items: {
        ...(game.attentionCenter?.items ?? {}),
        [itemId]: {
          ...previous,
          status,
          firstSeenAt: previous.firstSeenAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    },
  };
}
