const PRIORITY_WEIGHT = { urgent: 100, critical: 100, important: 72, normal: 42, info: 16 };

const ACTOR_ROTATION = [
  "sportingDirector",
  "captain",
  "pressOfficer",
  "academyChief",
  "president",
  "assistantCoach",
  "doctor",
  "fitnessCoach",
  "analyst",
  "player",
];

const OWNER_PROFILES = {
  sportingDirector: { id:"sportingDirector", name:"Director deportivo", role:"Dirección deportiva", emoji:"👔", color:"#60a5fa", personality:"piensa en el largo plazo" },
  assistantCoach: { id:"assistantCoach", name:"Segundo entrenador", role:"Cuerpo técnico", emoji:"👥", color:"#c9a84c", personality:"directo y práctico" },
  doctor: { id:"doctor", name:"Médico", role:"Área médica", emoji:"👨‍⚕️", color:"#22c55e", personality:"prudente" },
  fitnessCoach: { id:"fitnessCoach", name:"Preparador físico", role:"Preparación física", emoji:"🏋️", color:"#f59e0b", personality:"protector con la carga" },
  analyst: { id:"analyst", name:"Analista", role:"Análisis de rendimiento", emoji:"📊", color:"#38bdf8", personality:"detecta patrones" },
  captain: { id:"captain", name:"Capitán", role:"Voz del vestuario", emoji:"❤️", color:"#ef4444", personality:"protege al grupo" },
  president: { id:"president", name:"Presidente", role:"Directiva", emoji:"🏛️", color:"#a78bfa", personality:"exigente" },
  academyChief: { id:"academyChief", name:"Jefe de cantera", role:"Cantera", emoji:"🌱", color:"#84cc16", personality:"protege el futuro" },
  pressOfficer: { id:"pressOfficer", name:"Responsable de prensa", role:"Comunicación", emoji:"🎙️", color:"#f97316", personality:"mide cada palabra" },
  player: { id:"player", name:"Jugador", role:"Plantilla", emoji:"👤", color:"#c9a84c", personality:"habla de su situación" },
};

const DEFAULT_DIRECTOR_STATE = {
  shown: {},
  resolved: {},
  ignored: {},
  issueStates: {},
  dayHistory: [],
  lastSelection: [],
  lastProtagonistActorId: null,
};

function isDue(date, game) {
  if (!date) return false;
  const season = String(game?.season ?? "2025");
  const matchday = game?.matchday ?? 1;
  return String(date.season ?? season) < season || (String(date.season ?? season) === season && (date.matchday ?? 0) <= matchday);
}

function isSoon(date, game) {
  if (!date) return false;
  const season = String(game?.season ?? "2025");
  const matchday = game?.matchday ?? 1;
  return String(date.season ?? season) === season && (date.matchday ?? 0) <= matchday + 1;
}

function normalizeState(state = {}) {
  return {
    ...DEFAULT_DIRECTOR_STATE,
    ...state,
    shown: state.shown ?? {},
    resolved: state.resolved ?? {},
    ignored: state.ignored ?? {},
    issueStates: state.issueStates ?? {},
    dayHistory: state.dayHistory ?? [],
    lastSelection: state.lastSelection ?? [],
  };
}

export function ensureLegacyDirectorState(game) {
  if (!game) return game;
  return { ...game, legacyDirector: normalizeState(game.legacyDirector) };
}

function stamp(game) {
  return { season: String(game.season ?? "2025"), matchday: game.matchday ?? 1 };
}

function protagonistForDay(game) {
  const matchday = game?.matchday ?? 1;
  return ACTOR_ROTATION[(matchday - 1) % ACTOR_ROTATION.length];
}

function actorNameFromId(actorId) {
  return OWNER_PROFILES[actorId]?.name ?? "alguien del club";
}

function normalizePriority(priority) {
  if (priority === "critical") return "urgent";
  if (["urgent", "important", "normal", "info"].includes(priority)) return priority;
  return "normal";
}

function normalizeOwnerId(value) {
  const key = String(value ?? "").toLowerCase();
  if (key.includes("director deportivo") || key === "sportingdirector") return "sportingDirector";
  if (key.includes("segundo entrenador") || key === "assistantcoach") return "assistantCoach";
  if (key.includes("médico") || key.includes("medico") || key === "doctor") return "doctor";
  if (key.includes("preparador") || key === "fitnesscoach") return "fitnessCoach";
  if (key.includes("analista") || key === "analyst") return "analyst";
  if (key.includes("capitán") || key.includes("capitan") || key === "captain") return "captain";
  if (key.includes("presidente") || key === "president") return "president";
  if (key.includes("cantera") || key === "academychief") return "academyChief";
  if (key.includes("prensa") || key.includes("comunicación") || key.includes("comunicacion") || key === "pressofficer") return "pressOfficer";
  if (key.includes("jugador") || key === "player") return "player";
  return value ?? "assistantCoach";
}

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function candidateText(candidate) {
  return [
    candidate.title,
    candidate.summary,
    candidate.topicKey,
    candidate.origin,
    candidate.issue?.title,
    candidate.issue?.message,
    candidate.issue?.actionRequired,
    candidate.issue?.person?.name,
    candidate.issue?.payload?.playerName,
    candidate.attention?.title,
    candidate.attention?.summary,
    candidate.attention?.playerName,
    candidate.playerName,
    candidate.conversation?.title,
    candidate.conversation?.opening,
    candidate.conversation?.actorName,
  ].filter(Boolean).join(" ");
}

function isContractText(candidate) {
  const text = normalizeText(candidateText(candidate));
  return text.includes("contrato")
    || text.includes("contract")
    || text.includes("renov")
    || text.includes("ultimo ano")
    || text.includes("ultimo año")
    || text.includes("claridad contractual")
    || text.includes("situacion contractual");
}

function playerFromText(candidate, game) {
  const text = normalizeText(candidateText(candidate));
  if (!text) return null;
  const players = game?.players ?? [];
  return players.find(player => {
    const full = normalizeText(player.name ?? "");
    if (!full) return false;
    const parts = full.split(/\s+/).filter(part => part.length > 2);
    const firstName = parts[0];
    const firstNameIsUnique = firstName
      ? players.filter(item => normalizeText(item.name).split(/\s+/)[0] === firstName).length === 1
      : false;
    return text.includes(full)
      || parts.every(part => text.includes(part))
      || (firstNameIsUnique && firstName.length > 3 && text.includes(firstName));
  }) ?? null;
}

function subjectId(candidate, game) {
  const player = playerFromText(candidate, game);
  if (isContractText(candidate) && player?.id) return player.id;
  return candidate.issue?.payload?.playerId
    ?? candidate.issue?.person?.id
    ?? candidate.attention?.playerId
    ?? candidate.attention?.action?.playerId
    ?? candidate.conversation?.actorId
    ?? candidate.playerId
    ?? candidate.payload?.playerId
    ?? player?.id
    ?? null;
}

function ownerActorId(candidate) {
  const origin = candidate.origin ?? candidate.category ?? "";
  if (isContractText(candidate)) return "sportingDirector";
  if (["contracts", "contract", "market", "transfers"].includes(origin)) return "sportingDirector";
  if (origin === "medical") return "doctor";
  if (origin === "training") return "fitnessCoach";
  if (origin === "staff") return normalizeOwnerId(candidate.ownerActorId ?? candidate.actorId ?? candidate.actorName ?? "assistantCoach");
  if (["lockerRoom", "morale"].includes(origin)) return "captain";
  if (["lineup", "match"].includes(origin)) return "assistantCoach";
  if (["press", "news"].includes(origin)) return "pressOfficer";
  if (["fans", "board", "career"].includes(origin)) return "president";
  if (["youth", "academy"].includes(origin)) return "academyChief";
  return normalizeOwnerId(candidate.ownerActorId ?? candidate.actorId ?? candidate.actorName ?? candidate.actorType ?? "assistantCoach");
}

function issueType(candidate) {
  const origin = candidate.origin ?? candidate.category ?? "";
  if (isContractText(candidate)) return "contract_renewal";
  if (["contracts", "contract"].includes(origin)) return "contract_renewal";
  if (origin === "medical") return "medical_risk";
  if (origin === "training") return "physical_load";
  if (["lockerRoom", "morale"].includes(origin)) return "locker_room";
  if (["lineup", "match"].includes(origin)) return candidate.topicKey === "match-recovery" ? "match_recovery" : "lineup_preparation";
  if (["market", "transfers"].includes(origin)) return "market_decision";
  if (["press", "news"].includes(origin)) return "press_message";
  if (["fans", "board", "career"].includes(origin)) return "institutional_pressure";
  if (["youth", "academy"].includes(origin)) return "academy_pathway";
  if (candidate.source === "conversation" && candidate.conversation?.actorType === "player") return "player_request";
  return origin || candidate.source || "general_issue";
}

function subjectName(candidate, game) {
  const player = playerFromText(candidate, game);
  if (isContractText(candidate) && player?.name) return player.name;
  return candidate.issue?.person?.name
    ?? candidate.issue?.payload?.playerName
    ?? candidate.attention?.playerName
    ?? candidate.conversation?.actorName
    ?? player?.name
    ?? null;
}

function narrativeIssueKey(candidate, game) {
  const type = issueType(candidate);
  const subject = subjectId(candidate, game);
  if (candidate.issueKey && !(type === "contract_renewal" && subject && !String(candidate.issueKey).startsWith("contract_renewal_"))) return candidate.issueKey;
  if (["locker_room", "lineup_preparation", "match_recovery", "press_message", "institutional_pressure"].includes(type)) return type;
  return `${type}:${subject ?? candidate.issue?.payload?.offerId ?? candidate.attention?.action?.offerId ?? candidate.rawId ?? groupKey(candidate)}`;
}

function cleanTitle(title = "", ownerId = "") {
  let text = String(title);
  if (ownerId === "sportingDirector") {
    text = text.replace(/^director deportivo\s*:\s*/i, "");
    text = text.replace(/^dirección deportiva\s*:\s*/i, "");
  }
  return text.trim() || "Asunto pendiente";
}

function renewalResponseGoal(candidate) {
  const responseType = candidate.attention?.responseType ?? candidate.responseType;
  if (responseType === "RenewalAccepted") return "Cerrar renovacion.";
  if (responseType === "RenewalRejected") return "Decidir si mejorar condiciones, mantener postura o retirar la oferta.";
  if (responseType === "RenewalCounterOffer") return "Responder a la contraoferta.";
  return "Revisar la respuesta de renovacion.";
}

function humanSummary(candidate, ownerId) {
  const issue = candidate.issue;
  const attention = candidate.attention;
  const conversation = candidate.conversation;
  if (conversation?.opening) return conversation.opening;
  if (issue?.origin === "contracts" && issue?.person?.name) {
    return `He hablado con su entorno. Empiezan a preguntar demasiado por el futuro.`;
  }
  if (issue?.origin === "lineup") return "Míster, todavía no hemos preparado el once para el próximo partido.";
  if (issue?.origin === "medical" && issue?.payload?.playerId) return `${issue.person?.name ?? issue.title} está acumulando señales de riesgo. Prefiero mirarlo antes de forzar.`;
  if (ownerId === "sportingDirector" && (issue?.message || attention?.summary)) return issue?.message ?? attention?.summary;
  return issue?.message ?? attention?.summary ?? candidate.summary ?? candidate.title ?? "Hay una decisión pendiente.";
}

function normalizeCandidateToIssue(candidate, game) {
  const ownerId = ownerActorId(candidate);
  const type = issueType(candidate);
  const subject = subjectId(candidate, game) ?? candidate.rawId ?? candidate.id;
  const key = narrativeIssueKey({ ...candidate, actorId:ownerId }, game);
  const owner = ownerId === "player" && candidate.conversation?.actorType === "player"
    ? { ...OWNER_PROFILES.player, id:candidate.conversation.actorId, name:candidate.conversation.actorName, role:candidate.conversation.role, portrait:candidate.conversation.portrait }
    : OWNER_PROFILES[ownerId] ?? OWNER_PROFILES.assistantCoach;
  const title = cleanTitle(candidate.issue?.title ?? candidate.attention?.title ?? candidate.conversation?.title ?? candidate.title ?? "Asunto pendiente", owner.id);
  const subjectLabel = subjectName(candidate, game);
  return {
    id: key,
    sourceItemId: candidate.id,
    rawId: candidate.rawId,
    type,
    subjectId: subject,
    subjectName: subjectLabel,
    ownerId: owner.id,
    ownerRole: owner.role,
    owner,
    participants: [subjectLabel].filter(Boolean),
    priority: normalizePriority(candidate.priority),
    status: candidate.status ?? "pending",
    createdAt: candidate.date ?? { season:String(game?.season ?? "2025"), matchday:game?.matchday ?? 1 },
    updatedAt: { season:String(game?.season ?? "2025"), matchday:game?.matchday ?? 1 },
    expiresAt: candidate.issue?.expiresAt ?? null,
    nextReviewAt: null,
    title,
    summary: humanSummary(candidate, owner.id),
    consequenceIfIgnored: candidate.consequenceIfIgnored ?? candidate.issue?.consequenceIfIgnored ?? candidate.attention?.summary ?? candidate.consequence,
    goal: key.startsWith("contract_renewal_response:") ? renewalResponseGoal(candidate) : candidate.attention?.expectedOutcome ?? candidate.issue?.expectedOutcome ?? "Tomar una decisión clara.",
    availableActions: [candidate.issue?.actionLabel ?? candidate.attention?.actionLabel ?? "Revisar"],
    responseType: candidate.attention?.responseType ?? candidate.responseType ?? null,
    momentType: candidate.attention?.momentType ?? candidate.momentType ?? null,
    history: [],
  };
}

function isIssueBlocked(candidate, game, directorState) {
  if (!game) return false;
  const issueState = directorState.issueStates[narrativeIssueKey(candidate, game)];
  if (!issueState) return false;
  if (issueState.status === "archived") return true;
  const currentMatchday = game.matchday ?? 1;
  const sameSeason = !issueState.nextAvailableAt?.season || issueState.nextAvailableAt.season === String(game.season ?? "2025");
  const blockedByDate = sameSeason && (issueState.nextAvailableAt?.matchday ?? 0) > currentMatchday;
  return ["resolved", "waiting"].includes(issueState.status) && blockedByDate;
}

function sourceScore(candidate, game, directorState) {
  const priority = normalizePriority(candidate.priority);
  const priorityScore = PRIORITY_WEIGHT[priority] ?? 20;
  const age = Math.max(0, (game.matchday ?? 1) - (candidate.date?.matchday ?? game.matchday ?? 1));
  const ignored = directorState.ignored[candidate.id]?.count ?? 0;
  const shownCount = directorState.shown[candidate.id]?.count ?? 0;
  const protagonist = protagonistForDay(game);
  const protagonistBoost = candidate.actorId === protagonist || (protagonist === "player" && candidate.actorType === "player") ? 16 : 0;
  const consequenceBoost = candidate.consequenceIfIgnored || candidate.consequence ? 10 : 0;
  const stalePenalty = shownCount > 0 && priority !== "urgent" ? Math.min(24, shownCount * 8) : 0;
  const lastActorPenalty = directorState.lastProtagonistActorId === actorKey(candidate) && priority !== "urgent" ? 12 : 0;
  return priorityScore + age * 5 + ignored * 8 + protagonistBoost + consequenceBoost - stalePenalty - lastActorPenalty;
}

function groupKey(candidate) {
  if (candidate.issueKey) return candidate.issueKey;
  if (candidate.topicKey) return candidate.topicKey;
  if (candidate.groupKey) return candidate.groupKey;
  const origin = candidate.origin ?? candidate.category ?? "";
  if (["lineup", "match"].includes(origin)) return "match-preparation";
  if (["contracts", "contract"].includes(origin)) return "contract-planning";
  if (["medical", "training"].includes(origin)) return "physical-management";
  if (["lockerRoom", "morale"].includes(origin)) return "locker-room";
  if (["market", "transfers"].includes(origin)) return "market-decision";
  if (["press", "news"].includes(origin)) return "press-message";
  if (["fans", "board", "career"].includes(origin)) return "club-pressure";
  if (["youth", "academy"].includes(origin)) return "academy-pathway";
  if (candidate.actorType === "player" && candidate.actorId) return `player:${candidate.actorId}`;
  if (origin) return origin;
  return candidate.actorId ?? candidate.actorName ?? candidate.id;
}

function actorKey(candidate) {
  return candidate.actorId ?? candidate.actorName ?? candidate.actorType ?? "unknown";
}

function shouldConsider(candidate, directorState) {
  return shouldConsiderForGame(candidate, null, directorState);
}

function shouldConsiderForGame(candidate, game, directorState) {
  if (!candidate?.id) return false;
  if (["resolved", "dismissed", "ignored"].includes(candidate.status)) return false;
  if (directorState.resolved[candidate.id]) {
    const issueState = game ? directorState.issueStates[narrativeIssueKey(candidate, game)] : null;
    if (!issueState || isIssueBlocked(candidate, game, directorState)) return false;
  }
  if (game && isIssueBlocked(candidate, game, directorState)) return false;
  if (candidate.requiresDecision === false && normalizePriority(candidate.priority) !== "urgent") return false;
  if (normalizePriority(candidate.priority) === "info" && !candidate.consequenceIfIgnored && !candidate.consequence) return false;
  return true;
}

function pickBestPerGroup(candidates, game, directorState) {
  const grouped = new Map();
  candidates.forEach(candidate => {
    const key = groupKey(candidate);
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, { ...candidate, groupKey:key, mergedCount:1, related:[candidate.id] });
      return;
    }
    const currentScore = sourceScore(current, game, directorState);
    const candidateScore = sourceScore(candidate, game, directorState);
    const best = candidateScore > currentScore ? candidate : current;
    grouped.set(key, {
      ...best,
      groupKey:key,
      mergedCount:(current.mergedCount ?? 1) + 1,
      related:[...(current.related ?? [current.id]), candidate.id].filter(Boolean),
      score:Math.max(candidateScore, currentScore) + Math.min(10, (current.mergedCount ?? 1) * 3),
    });
  });
  return [...grouped.values()];
}

function ensureProtagonistPresence(candidates, game, directorState) {
  const protagonist = protagonistForDay(game);
  const protagonistCandidate = candidates
    .filter(candidate => actorKey(candidate) === protagonist || (protagonist === "player" && candidate.actorType === "player"))
    .sort((a,b)=>sourceScore(b,game,directorState)-sourceScore(a,game,directorState))[0];
  if (!protagonistCandidate) return candidates;
  return candidates.map(candidate => candidate.id === protagonistCandidate.id ? { ...candidate, protagonistOfDay:true, score:(candidate.score ?? sourceScore(candidate,game,directorState)) + 18 } : candidate);
}

function filterNoise(candidates, game, directorState) {
  return candidates.filter(candidate => {
    const priority = normalizePriority(candidate.priority);
    const score = candidate.score ?? sourceScore(candidate, game, directorState);
    if (priority === "urgent") return true;
    if (candidate.consequenceIfIgnored || candidate.consequence) return score >= 38;
    return score >= 55;
  });
}

function compareCandidates(a, b, game, directorState) {
  const aScore = a.score ?? sourceScore(a, game, directorState);
  const bScore = b.score ?? sourceScore(b, game, directorState);
  if (bScore !== aScore) return bScore - aScore;
  return String(a.id).localeCompare(String(b.id));
}

function avoidSameActorSpam(candidates, game, directorState) {
  const usedActors = new Set();
  const selected = [];
  const sorted = [...candidates].sort((a, b) => compareCandidates(a, b, game, directorState));
  sorted.forEach(candidate => {
    const key = actorKey(candidate);
    const allowSameOwner = String(candidate.issueKey ?? candidate.normalizedIssue?.id ?? "").startsWith("contract_renewal_response:");
    if (allowSameOwner || !usedActors.has(key)) {
      selected.push(candidate);
      usedActors.add(key);
    }
  });
  return selected;
}

function waitingExpectationCandidates(game, directorState) {
  return Object.values(directorState.issueStates ?? {})
    .filter(state => state?.status === "waiting" && state.expectation && isDue(state.nextAvailableAt, game))
    .map(state => ({
      id: `expectation:${state.issueKey}:${state.updatedAt?.matchday ?? 0}`,
      rawId: state.issueKey,
      source: "expectation",
      origin: state.expectation.origin ?? "legacyDirector",
      category: state.expectation.origin ?? "legacyDirector",
      issueKey: state.issueKey,
      actorId: state.ownerActorId ?? state.expectation.ownerActorId ?? "assistantCoach",
      ownerActorId: state.ownerActorId ?? state.expectation.ownerActorId ?? "assistantCoach",
      priority: state.expectation.priority ?? "important",
      title: state.expectation.returnTitle ?? "Hay novedades en una historia abierta",
      summary: state.expectation.returnSummary ?? `${actorNameFromId(state.ownerActorId)} vuelve con novedades.`,
      consequenceIfIgnored: state.expectation.consequenceIfIgnored ?? "Si no lo atiendes, la historia seguira avanzando sin una decision clara.",
      expectedOutcome: state.expectation.expectedOutcome ?? "Escuchar la novedad y decidir el siguiente paso.",
      payload: { playerId: state.expectation.subjectId },
      playerName: state.expectation.subjectName,
      responseType: state.expectation.responseType ?? null,
      reappearedFromExpectation: true,
    }));
}

export function getLegacyDirectorSelection(game, candidates = []) {
  if (!game) return [];
  try {
    const safeGame = ensureLegacyDirectorState(game);
    const directorState = normalizeState(safeGame.legacyDirector);
    const availableCandidates = [...(candidates ?? []), ...waitingExpectationCandidates(safeGame, directorState)];
    const viable = availableCandidates
      .filter(Boolean)
      .map(candidate => {
        const owner = ownerActorId(candidate);
        const normalizedIssue = normalizeCandidateToIssue({ ...candidate, actorId:owner }, safeGame);
        return { ...candidate, actorId: owner, ownerActorId: owner, issueKey: normalizedIssue.id, normalizedIssue };
      })
      .filter(candidate => shouldConsiderForGame(candidate, safeGame, directorState))
      .map(candidate => ({
        ...candidate,
        priority: normalizePriority(candidate.priority),
        score: sourceScore(candidate, safeGame, directorState),
      }));
    const grouped = ensureProtagonistPresence(pickBestPerGroup(viable, safeGame, directorState), safeGame, directorState);
    const quality = filterNoise(grouped, safeGame, directorState);
    return avoidSameActorSpam(quality, safeGame, directorState)
      .sort((a, b) => compareCandidates(a, b, safeGame, directorState))
      .map(item => ({
        ...item,
        issueCard: {
          ...item.normalizedIssue,
          priority: item.priority,
          mergedCount: item.mergedCount ?? 1,
          protagonistOfDay: item.protagonistOfDay ?? false,
        },
      }))
      .slice(0, 3);
  } catch (error) {
    console.warn("[LegacyDirector] Selection skipped to keep Home stable", error);
    return [];
  }
}

export function rememberLegacyDirectorSelection(game, selection = []) {
  const safeGame = ensureLegacyDirectorState(game);
  const state = normalizeState(safeGame.legacyDirector);
  const today = stamp(safeGame);
  const shown = { ...state.shown };
  selection.forEach(item => {
    const previous = shown[item.id] ?? {};
    shown[item.id] = {
      count: (previous.count ?? 0) + 1,
      lastShown: today,
      actorId: item.ownerActorId ?? item.actorId ?? item.actorName ?? null,
      origin: item.origin ?? item.category ?? null,
      issueKey: item.issueKey ?? null,
    };
  });
  return {
    ...safeGame,
    legacyDirector: {
      ...state,
      shown,
      lastSelection: selection.map(item => item.id),
      lastProtagonistActorId: protagonistForDay(safeGame),
      dayHistory: [
        { ...today, selection: selection.map(item => item.id), protagonistActorId: protagonistForDay(safeGame) },
        ...state.dayHistory,
      ].slice(0, 80),
    },
  };
}

export function getLegacyDirectorExpectations(game) {
  if (!game) return [];
  const safeGame = ensureLegacyDirectorState(game);
  const state = normalizeState(safeGame.legacyDirector);
  return Object.values(state.issueStates ?? {})
    .filter(item => item?.status === "waiting" && item.expectation && isSoon(item.nextAvailableAt, safeGame))
    .sort((a,b)=>(a.nextAvailableAt?.matchday ?? 999)-(b.nextAvailableAt?.matchday ?? 999))
    .map(item => ({
      issueKey: item.issueKey,
      ownerActorId: item.ownerActorId ?? item.expectation.ownerActorId,
      ownerName: actorNameFromId(item.ownerActorId ?? item.expectation.ownerActorId),
      subjectName: item.expectation.subjectName,
      reminder: item.expectation.reminder,
      expectedToday: isDue(item.nextAvailableAt, safeGame),
    }))
    .slice(0, 3);
}

export function markLegacyDirectorItem(game, itemId, status = "resolved", meta = {}) {
  const safeGame = ensureLegacyDirectorState(game);
  const state = normalizeState(safeGame.legacyDirector);
  const today = stamp(safeGame);
  const issueKey = meta.issueKey ?? meta.item?.issueKey ?? null;
  const related = [itemId, ...(meta.related ?? meta.item?.related ?? [])].filter(Boolean);
  const nextAvailableAt = meta.nextAvailableAt ?? (
    status === "waiting" || status === "ignored"
      ? { ...today, matchday: today.matchday + 2 }
      : status === "resolved" || status === "delegated"
        ? { ...today, matchday: today.matchday + 3 }
        : null
  );
  const resolvedPatch = Object.fromEntries(related.map(id => [id, { status, resolvedAt: today, issueKey }]));
  const issueStates = issueKey ? {
    ...state.issueStates,
    [issueKey]: {
      ...(state.issueStates[issueKey] ?? {}),
      issueKey,
      ownerActorId: meta.ownerActorId ?? meta.item?.ownerActorId ?? meta.item?.actorId ?? null,
      status,
      updatedAt: today,
      nextAvailableAt,
      relatedIds: related,
      expectation: meta.expectation ?? state.issueStates[issueKey]?.expectation ?? null,
      history: [
        { status, at: today, decisionId: meta.decisionId ?? null },
        ...((state.issueStates[issueKey]?.history ?? []).slice(0, 19)),
      ],
    },
  } : state.issueStates;
  if (status === "ignored") {
    const previous = state.ignored[itemId] ?? {};
    return {
      ...safeGame,
      legacyDirector: {
        ...state,
        ignored: {
          ...state.ignored,
          [itemId]: { count: (previous.count ?? 0) + 1, lastIgnored: today },
        },
        issueStates,
      },
    };
  }
  return {
    ...safeGame,
    legacyDirector: {
      ...state,
      resolved: {
        ...state.resolved,
        ...resolvedPatch,
      },
      issueStates,
    },
  };
}
