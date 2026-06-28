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
  "player",
];

const DEFAULT_DIRECTOR_STATE = {
  shown: {},
  resolved: {},
  ignored: {},
  issueStates: {},
  dayHistory: [],
  lastSelection: [],
  lastProtagonistActorId: null,
};

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

function normalizePriority(priority) {
  if (priority === "critical") return "urgent";
  if (["urgent", "important", "normal", "info"].includes(priority)) return priority;
  return "normal";
}

function subjectId(candidate) {
  return candidate.issue?.payload?.playerId
    ?? candidate.issue?.person?.id
    ?? candidate.attention?.playerId
    ?? candidate.attention?.action?.playerId
    ?? candidate.conversation?.actorId
    ?? candidate.playerId
    ?? candidate.payload?.playerId
    ?? null;
}

function ownerActorId(candidate) {
  const origin = candidate.origin ?? candidate.category ?? "";
  if (["contracts", "contract", "market", "transfers"].includes(origin)) return "sportingDirector";
  if (origin === "medical") return "doctor";
  if (origin === "training") return "fitnessCoach";
  if (["lockerRoom", "morale"].includes(origin)) return "captain";
  if (["lineup", "match"].includes(origin)) return "assistantCoach";
  if (["press", "news"].includes(origin)) return "pressOfficer";
  if (["fans", "board", "career"].includes(origin)) return "president";
  if (["youth", "academy"].includes(origin)) return "academyChief";
  return candidate.actorId ?? candidate.actorName ?? candidate.actorType ?? "assistantCoach";
}

function narrativeIssueKey(candidate) {
  if (candidate.issueKey) return candidate.issueKey;
  const origin = candidate.origin ?? candidate.category ?? "";
  const subject = subjectId(candidate);
  if (["contracts", "contract"].includes(origin)) return `contract:${subject ?? groupKey(candidate)}`;
  if (origin === "medical") return `medical:${subject ?? groupKey(candidate)}`;
  if (origin === "training") return `physical:${subject ?? groupKey(candidate)}`;
  if (["lockerRoom", "morale"].includes(origin)) return "locker-room";
  if (["lineup", "match"].includes(origin)) return "match-preparation";
  if (["market", "transfers"].includes(origin)) return `market:${candidate.issue?.payload?.offerId ?? candidate.attention?.action?.offerId ?? candidate.rawId ?? groupKey(candidate)}`;
  if (["press", "news"].includes(origin)) return "press-message";
  if (["fans", "board", "career"].includes(origin)) return "club-pressure";
  if (["youth", "academy"].includes(origin)) return `academy:${subject ?? groupKey(candidate)}`;
  if (candidate.source === "conversation" && candidate.conversation?.actorType === "player") return `player:${candidate.conversation.actorId}:${candidate.conversation.motive ?? candidate.topicKey ?? candidate.rawId}`;
  return candidate.topicKey ?? candidate.groupKey ?? groupKey(candidate);
}

function isIssueBlocked(candidate, game, directorState) {
  if (!game) return false;
  const issueState = directorState.issueStates[narrativeIssueKey(candidate)];
  if (!issueState) return false;
  if (["in_progress", "archived"].includes(issueState.status)) return true;
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
    const issueState = game ? directorState.issueStates[narrativeIssueKey(candidate)] : null;
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
    if (!usedActors.has(key)) {
      selected.push(candidate);
      usedActors.add(key);
    }
  });
  return selected;
}

export function getLegacyDirectorSelection(game, candidates = []) {
  if (!game) return [];
  try {
    const safeGame = ensureLegacyDirectorState(game);
    const directorState = normalizeState(safeGame.legacyDirector);
    const viable = (candidates ?? [])
      .filter(Boolean)
      .map(candidate => {
        const owner = ownerActorId(candidate);
        const issueKey = narrativeIssueKey(candidate);
        return { ...candidate, actorId: owner, ownerActorId: owner, issueKey };
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
