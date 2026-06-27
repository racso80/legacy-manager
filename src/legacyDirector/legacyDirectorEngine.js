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
  const stalePenalty = shownCount > 0 && priority !== "urgent" ? Math.min(18, shownCount * 6) : 0;
  return priorityScore + age * 5 + ignored * 8 + protagonistBoost + consequenceBoost - stalePenalty;
}

function groupKey(candidate) {
  if (candidate.groupKey) return candidate.groupKey;
  if (candidate.origin) return candidate.origin;
  if (candidate.category) return candidate.category;
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
  return true;
}

function pickBestPerGroup(candidates, game, directorState) {
  const grouped = new Map();
  candidates.forEach(candidate => {
    const key = groupKey(candidate);
    const current = grouped.get(key);
    if (!current || sourceScore(candidate, game, directorState) > sourceScore(current, game, directorState)) {
      grouped.set(key, candidate);
    }
  });
  return [...grouped.values()];
}

function avoidSameActorSpam(candidates, game, directorState) {
  const usedActors = new Set();
  const selected = [];
  const sorted = [...candidates].sort((a, b) => sourceScore(b, game, directorState) - sourceScore(a, game, directorState));
  sorted.forEach(candidate => {
    const key = actorKey(candidate);
    const priority = normalizePriority(candidate.priority);
    if (!usedActors.has(key) || priority === "urgent") {
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
  const grouped = pickBestPerGroup(viable, safeGame, directorState);
  return avoidSameActorSpam(grouped, safeGame, directorState)
    .sort((a, b) => b.score - a.score)
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
