import { calculateInjuryRisk, formatMedicalDuration } from "../medical/medicalEngine.js";

const DEBUG_EVENTS = true;

function logEvent(message, payload) {
  if (!DEBUG_EVENTS) return;
  console.debug(`[LegacyDirectorEventSystem] ${message}`, payload);
}

function currentStamp(game) {
  return { season:String(game?.season ?? "2025"), matchday:game?.matchday ?? 1 };
}

function nextFixture(game) {
  return (game?.fixtures ?? []).find(item => !item.played && (item.homeTeamId === game.teamId || item.awayTeamId === game.teamId));
}

function firstName(name = "") {
  return String(name).split(" ")[0] || String(name);
}

function attentionState(game, id) {
  return game?.attentionCenter?.items?.[id] ?? {};
}

function isClosedStatus(status) {
  return ["resolved", "dismissed", "archived"].includes(status);
}

function pushEvent(events, event) {
  events.push(event);
  logEvent("Event published", event);
}

function renewalLabel(status) {
  return {
    accepted: "ha respondido positivamente a la oferta de renovacion",
    rejected: "ha rechazado la oferta de renovacion",
    salaryCounter: "pide mejorar el salario",
    yearsCounter: "pide mas anos de contrato",
    roleCounter: "pide un rol superior",
  }[status] ?? "ha respondido a la oferta de renovacion";
}

function transferLabel(status) {
  return {
    clubCounter: "el club pide mejorar la oferta",
    playerCounter: "el jugador pide mas salario",
    roleCounter: "el jugador pide otro rol",
    ready: "acuerdo listo para cerrar",
    rejected: "oferta rechazada",
    outbid: "otro club se ha adelantado",
    clubAccepted: "el club acepta negociar contrato",
    playerRejected: "el jugador rechaza la propuesta",
  }[status] ?? "respuesta pendiente";
}

export function getAttentionIssueKey(item = {}) {
  if (item.issueKey) return item.issueKey;
  const category = item.category ?? "";
  const title = String(item.title ?? "").toLowerCase();
  const playerId = item.playerId ?? item.action?.playerId;
  if (category === "contracts" && playerId && (title.includes("renov") || title.includes("contrato") || title.includes("contract"))) {
    return `contract_renewal:${playerId}`;
  }
  if (category === "medical" && playerId && (title.includes("riesgo") || title.includes("fatiga"))) return `injury_risk:${playerId}`;
  if (category === "medical" && playerId) return `injury:${playerId}`;
  if (category === "training" && playerId && (title.includes("riesgo") || title.includes("fisico") || title.includes("fisico"))) return `injury_risk:${playerId}`;
  if (category === "youth" && playerId) return `youth_high_potential:${playerId}`;
  if (category === "market" && item.action?.offerId) return `market_decision:${item.action.offerId}`;
  if (category === "match" && title.includes("alineaci")) return "lineup_preparation";
  return item.id;
}

export function dedupeAttentionItems(items = [], game = null) {
  const grouped = new Map();
  const score = item => {
    const priority = item.priority === "critical" ? 100 : item.priority === "important" ? 60 : 20;
    const eventBoost = item.source === "legacyDirectorEvent" ? 12 : 0;
    const statusPenalty = item.status === "seen" ? 4 : item.status === "waiting" ? 8 : 0;
    return priority + eventBoost - statusPenalty;
  };
  items.forEach(item => {
    if (!item || isClosedStatus(item.status)) return;
    const key = getAttentionIssueKey(item);
    const centralState = game ? attentionState(game, `legacy-event:${key}`) : null;
    if (centralState && isClosedStatus(centralState.status)) return;
    const current = grouped.get(key);
    if (!current || score(item) > score(current)) {
      grouped.set(key, { ...item, issueKey:key });
    }
  });
  return [...grouped.values()];
}

export function buildLegacyDirectorEvents(game, context = {}) {
  if (!game) return [];
  const events = [];
  const stamp = currentStamp(game);
  const fixture = nextFixture(game);
  const starters = (context.lineup ?? game._lineup ?? []).filter(Boolean).length;

  if (fixture && starters < 11) {
    pushEvent(events, {
      id:`LineupIncomplete:${stamp.season}:${stamp.matchday}`,
      type:"LineupIncomplete",
      issueKey:"lineup_preparation",
      category:"match",
      ownerActorId:"assistantCoach",
      priority:"critical",
      title:"Alineacion incompleta",
      summary:`Hay ${starters}/11 titulares preparados para el proximo partido.`,
      action:{ screen:"lineup" },
      actionLabel:"Completar once",
      ...stamp,
    });
  }

  const renewalStatuses = new Set(["accepted", "rejected", "salaryCounter", "yearsCounter", "roleCounter"]);
  for (const offer of game.contracts?.renewals ?? []) {
    if (!renewalStatuses.has(offer.status)) continue;
    const title = `${firstName(offer.playerName)} ha respondido a la oferta de renovacion`;
    pushEvent(events, {
      id:`RenewalOfferAnswered:${offer.id}:${offer.status}`,
      type:"RenewalOfferAnswered",
      issueKey:`contract_renewal:${offer.playerId}`,
      category:"contracts",
      ownerActorId:"sportingDirector",
      priority:offer.status === "rejected" ? "critical" : "important",
      title,
      summary:`Mister, ya tenemos respuesta del entorno de ${firstName(offer.playerName)}: ${renewalLabel(offer.status)}. Tenemos que decidir el siguiente paso.`,
      subjectId:offer.playerId,
      subjectName:offer.playerName,
      action:{ screen:"contracts", playerId:offer.playerId, renewalId:offer.id },
      actionLabel:"Revisar respuesta",
      ...stamp,
    });
  }

  for (const player of game.players ?? []) {
    if (Number(player.contractEnd ?? 9999) <= Number(game.season ?? 2025) + 1) {
      pushEvent(events, {
        id:`ContractExpiringSoon:${player.id}:${player.contractEnd ?? "unknown"}`,
        type:"ContractExpiringSoon",
        issueKey:`contract_renewal:${player.id}`,
        category:"contracts",
        ownerActorId:"sportingDirector",
        priority:Number(player.contractEnd ?? 9999) <= Number(game.season ?? 2025) ? "critical" : "important",
        title:`${player.name} necesita claridad contractual`,
        summary:"Nos estamos quedando sin margen para decidir su futuro.",
        subjectId:player.id,
        subjectName:player.name,
        action:{ screen:"contracts", playerId:player.id },
        actionLabel:"Abrir contratos",
        ...stamp,
      });
    }

    if (player.injured || (player.medical?.phase && player.medical.phase !== "available")) {
      const remaining = player.medical?.remainingDays ?? (player.injuryGames ?? 1) * 7;
      pushEvent(events, {
        id:`InjuryDetected:${player.id}:${player.medical?.startedMatchday ?? "active"}`,
        type:"InjuryDetected",
        issueKey:`injury:${player.id}`,
        category:"medical",
        ownerActorId:"doctor",
        priority:"critical",
        title:`${player.name} esta lesionado`,
        summary:`${player.medical?.type ?? "Lesion"} - ${formatMedicalDuration(remaining)} restante.`,
        subjectId:player.id,
        subjectName:player.name,
        action:{ screen:"medical", playerId:player.id },
        actionLabel:"Ver informe medico",
        ...stamp,
      });
    }

    const risk = calculateInjuryRisk(player, { fixtures:game.fixtures, teamId:game.teamId, game });
    if (!player.injured && risk >= 76) {
      pushEvent(events, {
        id:`HighInjuryRisk:${player.id}:${stamp.season}:${stamp.matchday}`,
        type:"HighInjuryRisk",
        issueKey:`injury_risk:${player.id}`,
        category:"medical",
        ownerActorId:"doctor",
        priority:"important",
        title:`${player.name} presenta riesgo fisico alto`,
        summary:`Riesgo de lesion ${risk}%. Conviene revisar su carga antes de forzar.`,
        subjectId:player.id,
        subjectName:player.name,
        action:{ screen:"medical", playerId:player.id },
        actionLabel:"Ver informe medico",
        ...stamp,
      });
    }

    if ((player.morale ?? 70) <= 35 || (player.happiness ?? 70) <= 38) {
      pushEvent(events, {
        id:`PlayerUnhappy:${player.id}:${Math.floor(Math.min(player.morale ?? 70, player.happiness ?? 70) / 10)}`,
        type:"PlayerUnhappy",
        issueKey:`player_unhappy:${player.id}`,
        category:"training",
        ownerActorId:"captain",
        priority:Math.min(player.morale ?? 70, player.happiness ?? 70) <= 25 ? "critical" : "important",
        title:`${player.name} necesita una conversacion`,
        summary:"El vestuario empieza a notar su malestar. Conviene hablar antes de que crezca.",
        subjectId:player.id,
        subjectName:player.name,
        action:{ screen:"lockerRoom", playerId:player.id },
        actionLabel:"Abrir vestuario",
        ...stamp,
      });
    }
  }

  for (const prospect of game.youth?.players ?? []) {
    if ((prospect.potential ?? 0) >= 78) {
      pushEvent(events, {
        id:`YouthHighPotentialDetected:${prospect.id}:${prospect.potential}`,
        type:"YouthHighPotentialDetected",
        issueKey:`youth_high_potential:${prospect.id}`,
        category:"youth",
        ownerActorId:"academyChief",
        priority:(prospect.potential ?? 0) >= 85 ? "critical" : "important",
        title:`${prospect.name} destaca en la cantera`,
        summary:`${prospect.pos} de ${prospect.age} anos, potencial estimado ${prospect.potential}. Merece seguimiento del primer equipo.`,
        subjectId:prospect.id,
        subjectName:prospect.name,
        action:{ screen:"youth", playerId:prospect.id },
        actionLabel:"Ver informe",
        ...stamp,
      });
    }
  }

  for (const offer of game.transferMarket?.incomingOffers ?? []) {
    if (offer.status !== "pending") continue;
    pushEvent(events, {
      id:`TransferOfferReceived:${offer.id}`,
      type:"TransferOfferReceived",
      issueKey:`market_decision:${offer.id}`,
      category:"market",
      ownerActorId:"sportingDirector",
      priority:"critical",
      title:`Oferta recibida por ${offer.playerName}`,
      summary:"Ha llegado una propuesta que requiere una decision del club.",
      subjectId:offer.playerId,
      subjectName:offer.playerName,
      action:{ screen:"transfers", tab:"vender", offerId:offer.id },
      actionLabel:"Ver oferta",
      ...stamp,
    });
  }

  const actionableOfferStatuses = new Set(["clubCounter", "playerCounter", "roleCounter", "ready", "rejected", "outbid", "clubAccepted", "playerRejected"]);
  for (const offer of game.transferMarket?.offers ?? []) {
    if (!actionableOfferStatuses.has(offer.status)) continue;
    pushEvent(events, {
      id:`TransferOfferAnswered:${offer.id}:${offer.status}`,
      type:offer.status === "rejected" || offer.status === "playerRejected" ? "TransferOfferRejected" : "TransferOfferAccepted",
      issueKey:`market_decision:${offer.id}`,
      category:"market",
      ownerActorId:"sportingDirector",
      priority:["clubCounter", "playerCounter", "roleCounter", "ready", "clubAccepted"].includes(offer.status) ? "critical" : "important",
      title:`${offer.playerName}: ${transferLabel(offer.status)}`,
      summary:"La operacion necesita una decision antes de seguir avanzando.",
      subjectId:offer.playerId,
      subjectName:offer.playerName,
      action:{ screen:"transfers", tab:"negociar", offerId:offer.id },
      actionLabel:"Abrir negociacion",
      ...stamp,
    });
  }

  const confidence = game.legacy?.confidence ?? 70;
  if (confidence < 50) {
    pushEvent(events, {
      id:`PresidentConcern:${stamp.season}:${Math.floor(confidence / 10)}`,
      type:"PresidentConcern",
      issueKey:"institutional_pressure",
      category:"board",
      ownerActorId:"president",
      priority:confidence < 30 ? "critical" : "important",
      title:"El presidente quiere hablar contigo",
      summary:`La confianza esta en ${Math.round(confidence)}/100. La directiva necesita una senal clara.`,
      action:{ screen:"board" },
      actionLabel:"Ver directiva",
      ...stamp,
    });
  }

  return events;
}

export function legacyDirectorEventsToAttentionItems(game, events = []) {
  return events
    .map(event => {
      const id = `legacy-event:${event.issueKey}`;
      const saved = attentionState(game, id);
      const item = {
        id,
        source:"legacyDirectorEvent",
        sourceEventId:event.id,
        sourceEventType:event.type,
        issueKey:event.issueKey,
        ownerActorId:event.ownerActorId,
        category:event.category,
        priority:event.priority,
        title:event.title,
        summary:event.summary,
        season:event.season,
        matchday:event.matchday,
        playerId:event.subjectId,
        playerName:event.subjectName,
        action:event.action,
        actionLabel:event.actionLabel ?? "Revisar",
        status:saved.status ?? "new",
        firstSeenAt:saved.firstSeenAt ?? null,
        updatedAt:saved.updatedAt ?? null,
      };
      logEvent("Event converted to Issue", { event:event.type, issueKey:event.issueKey, attentionId:id });
      return item;
    })
    .filter(item => !isClosedStatus(item.status));
}
