const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const GAME_FEEL_VERSION = "0.96";

export function getSeasonRhythm(game = {}) {
  const matchday = Number(game.matchday ?? 1);
  const totalMatchdays = Number(game.totalMatchdays ?? game.fixtures?.filter?.(fixture => fixture.homeTeamId === game.teamId || fixture.awayTeamId === game.teamId)?.length ?? 38);
  const progress = totalMatchdays > 0 ? matchday / totalMatchdays : 0;

  if (matchday <= 3) return "opening";
  if (progress >= 0.82) return "run_in";
  if (matchday % 6 === 0) return "spotlight";
  return "normal";
}

export function rhythmProfile(game = {}) {
  const rhythm = getSeasonRhythm(game);
  const base = {
    rhythm,
    maxHomeIssues: 2,
    noiseThreshold: 42,
    softNoiseThreshold: 56,
    protagonistBoost: 14,
    repeatedActorPenalty: 16,
    repeatedIssuePenalty: 11,
    maxAgeBoost: 18,
    staffRecommendationLimit: 3,
  };

  if (rhythm === "opening") {
    return {
      ...base,
      maxHomeIssues: 3,
      noiseThreshold: 38,
      softNoiseThreshold: 52,
      repeatedActorPenalty: 10,
      staffRecommendationLimit: 4,
    };
  }

  if (rhythm === "run_in") {
    return {
      ...base,
      maxHomeIssues: 3,
      noiseThreshold: 36,
      softNoiseThreshold: 50,
      protagonistBoost: 18,
      staffRecommendationLimit: 4,
    };
  }

  if (rhythm === "spotlight") {
    return {
      ...base,
      maxHomeIssues: 3,
      protagonistBoost: 20,
      repeatedActorPenalty: 18,
    };
  }

  return base;
}

export function scoreIssueFreshness(candidate = {}, game = {}, directorState = {}) {
  const profile = rhythmProfile(game);
  const shownCount = directorState.shown?.[candidate.id]?.count ?? 0;
  const age = Math.max(0, Number(game.matchday ?? 1) - Number(candidate.date?.matchday ?? game.matchday ?? 1));
  const ageBoost = clamp(age * 4, 0, profile.maxAgeBoost);
  const repeatedPenalty = shownCount > 0 ? clamp(shownCount * profile.repeatedIssuePenalty, 0, 34) : 0;
  return ageBoost - repeatedPenalty;
}

export function shouldSurfaceCandidate(candidate = {}, score = 0, priority = "normal", game = {}) {
  const profile = rhythmProfile(game);
  if (priority === "urgent") return true;
  if (priority === "important" && (candidate.consequenceIfIgnored || candidate.consequence)) {
    return score >= profile.noiseThreshold;
  }
  if (candidate.consequenceIfIgnored || candidate.consequence) {
    return score >= profile.noiseThreshold + 4;
  }
  return score >= profile.softNoiseThreshold;
}

export function selectionLimit(game = {}, candidates = []) {
  const profile = rhythmProfile(game);
  const urgentCount = candidates.filter(candidate => ["urgent", "critical"].includes(candidate.priority)).length;
  if (urgentCount >= 2) return 3;
  return profile.maxHomeIssues;
}

export function staffRecommendationLimit(game = {}) {
  return rhythmProfile(game).staffRecommendationLimit;
}

export function shouldShowLowPriorityStaff(game = {}, currentCount = 0) {
  const matchday = Number(game.matchday ?? 1);
  if (currentCount === 0) return true;
  if (matchday <= 2) return true;
  return matchday % 5 === 0;
}
