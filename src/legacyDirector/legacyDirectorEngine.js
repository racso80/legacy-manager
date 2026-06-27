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
  if (!candidate?.id) return false;
  if (["resolved", "dismissed", "ignored"].includes(candidate.status)) return false;
  if (directorState.resolved[candidate.id]) return false;
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
  const safeGame = ensureLegacyDirectorState(game);
  const directorState = normalizeState(safeGame.legacyDirector);
  const viable = candidates
    .filter(candidate => shouldConsider(candidate, directorState))
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
      actorId: item.actorId ?? item.actorName ?? null,
      origin: item.origin ?? item.category ?? null,
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

export function markLegacyDirectorItem(game, itemId, status = "resolved") {
  const safeGame = ensureLegacyDirectorState(game);
  const state = normalizeState(safeGame.legacyDirector);
  const today = stamp(safeGame);
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
      },
    };
  }
  return {
    ...safeGame,
    legacyDirector: {
      ...state,
      resolved: {
        ...state.resolved,
        [itemId]: { status, resolvedAt: today },
      },
    },
  };
}
