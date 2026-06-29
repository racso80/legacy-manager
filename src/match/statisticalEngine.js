const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value ?? 0)));

export function weightedPick(items = [], weightFn = () => 1) {
  const weighted = items
    .map(item => ({ item, weight: Math.max(0, Number(weightFn(item) ?? 0)) }))
    .filter(entry => entry.weight > 0);
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (!total) return items[0] ?? null;
  let roll = Math.random() * total;
  return weighted.find(entry => (roll -= entry.weight) <= 0)?.item ?? weighted.at(-1)?.item ?? null;
}

export function playerScoringProfile(player = {}) {
  const pos = player.pos ?? "";
  if (["DC", "SD"].includes(pos)) return "finalizador";
  if (["ED", "EI", "MD", "MI"].includes(pos)) return "extremo";
  if (["MCO", "MC"].includes(pos)) return "llegador";
  if (["DFC"].includes(pos)) return "rematador";
  if (["LD", "LI", "MCD"].includes(pos)) return "secundario";
  return player.group === "DEL" ? "finalizador" : player.group === "MED" ? "llegador" : "secundario";
}

export function playerAssistProfile(player = {}) {
  const pos = player.pos ?? "";
  if (["MCO", "MC"].includes(pos)) return "organizador";
  if (["ED", "EI", "MD", "MI", "LD", "LI"].includes(pos)) return "centros";
  if (["MCD"].includes(pos)) return "primer_pase";
  return player.group === "MED" ? "organizador" : player.group === "DEL" ? "asociativo" : "apoyo";
}

export function recentPlayerStats(playerId, fixtures = []) {
  const played = fixtures
    .filter(fixture => fixture.played && (fixture.events ?? []).some(event => event.playerId === playerId || event.assistId === playerId))
    .slice(-8);
  const goals = played.flatMap(fixture => fixture.events ?? []).filter(event => ["GOAL", "PENALTY"].includes(event.type) && event.playerId === playerId).length;
  const assists = played.flatMap(fixture => fixture.events ?? []).filter(event => event.assistId === playerId).length;
  return { goals, assists, matches:played.length };
}

export function scoringWeight(player = {}, context = {}) {
  if (!player || player.group === "POR") return 0;
  const attrs = player.attrs ?? {};
  const profile = playerScoringProfile(player);
  const profileBoost = {
    finalizador: 7.5,
    extremo: 4.2,
    llegador: 1.9,
    rematador: 0.85,
    secundario: 0.45,
  }[profile] ?? 0.5;
  const shooting = clamp(attrs.tiro ?? player.overall ?? 65);
  const pace = clamp(attrs.ritmo ?? 65);
  const dribbling = clamp(attrs.regate ?? 65);
  const physical = clamp(attrs.fisico ?? 65);
  const morale = clamp(player.morale ?? 70);
  const recent = context.fixtures ? recentPlayerStats(player.id, context.fixtures) : { goals:0 };
  const tacticalBoost =
    context.tactics?.estilo === "bandas" && profile === "extremo" ? 1.18 :
    context.tactics?.estilo === "directo" && ["finalizador", "rematador"].includes(profile) ? 1.14 :
    context.tactics?.estilo === "posesion" && profile === "llegador" ? 1.08 :
    context.tactics?.estilo === "contraataque" && (pace >= 78 || profile === "extremo") ? 1.12 : 1;
  const formBoost = 1 + Math.min(0.32, recent.goals * 0.055);
  const fatiguePenalty = Math.max(0.72, 1 - (player.fatigue ?? 0) * 0.0032);
  const quality = shooting * 1.45 + pace * 0.28 + dribbling * 0.22 + physical * 0.16 + (player.overall ?? 70) * 0.38 + (morale - 65) * 0.18;
  return Math.max(0.1, profileBoost * quality * tacticalBoost * formBoost * fatiguePenalty);
}

export function assistWeight(player = {}, context = {}) {
  if (!player || player.group === "POR") return 0;
  const attrs = player.attrs ?? {};
  const profile = playerAssistProfile(player);
  const profileBoost = {
    organizador: 5.2,
    centros: 4.4,
    primer_pase: 2.2,
    asociativo: 1.35,
    apoyo: 0.75,
  }[profile] ?? 1;
  const passing = clamp(attrs.pase ?? player.overall ?? 65);
  const dribbling = clamp(attrs.regate ?? 65);
  const pace = clamp(attrs.ritmo ?? 65);
  const recent = context.fixtures ? recentPlayerStats(player.id, context.fixtures) : { assists:0 };
  const tacticalBoost =
    context.tactics?.estilo === "bandas" && profile === "centros" ? 1.2 :
    context.tactics?.estilo === "posesion" && profile === "organizador" ? 1.14 :
    context.tactics?.estilo === "directo" && ["primer_pase", "centros"].includes(profile) ? 1.08 : 1;
  return Math.max(0.1, profileBoost * (passing * 1.35 + dribbling * 0.34 + pace * 0.18 + (player.overall ?? 70) * 0.28) * tacticalBoost * (1 + Math.min(0.24, recent.assists * 0.05)));
}

export function cardWeight(player = {}, context = {}) {
  if (!player || player.group === "POR") return 0.08;
  const pos = player.pos ?? "";
  const positionBoost =
    ["DFC"].includes(pos) ? 4.2 :
    ["MCD"].includes(pos) ? 3.8 :
    ["LD", "LI"].includes(pos) ? 2.8 :
    ["MC"].includes(pos) ? 2.1 :
    player.group === "DEF" ? 2.5 :
    player.group === "MED" ? 1.7 : 0.9;
  const physical = clamp(player.attrs?.fisico ?? 65);
  const defense = clamp(player.attrs?.defensa ?? 55);
  const pressureBoost = context.tactics?.presion === "alta" ? 1.2 : context.tactics?.riesgo === "agresivo" ? 1.16 : 1;
  const fatigueBoost = 1 + Math.max(0, (player.fatigue ?? 0) - 55) * 0.012;
  return positionBoost * (physical * 0.45 + defense * 0.35 + 20) * pressureBoost * fatigueBoost;
}

export function selectGoalScorer(squad = [], context = {}) {
  const candidates = squad.filter(player => player && player.group !== "POR" && !player.injured && !player.suspended);
  return weightedPick(candidates, player => scoringWeight(player, context));
}

export function selectAssistant(squad = [], scorer = null, context = {}) {
  if (Math.random() < (context.soloGoalRate ?? 0.12)) return null;
  const candidates = squad.filter(player => player && player.group !== "POR" && player.id !== scorer?.id && !player.injured && !player.suspended);
  return weightedPick(candidates, player => assistWeight(player, context));
}

export function selectCardedPlayer(squad = [], context = {}) {
  const candidates = squad.filter(player => player && player.group !== "POR" && !player.injured && !player.suspended);
  return weightedPick(candidates, player => cardWeight(player, context));
}

export function selectGoalkeeper(squad = []) {
  return squad.find(player => player.group === "POR") ?? null;
}

export function createGoalEvent({ minute, team, squad, teamName, tactics, fixtures, descriptionPrefix = "" }) {
  const scorer = selectGoalScorer(squad, { tactics, fixtures });
  const isPenalty = Boolean(scorer) && Math.random() < (["DC", "MCO"].includes(scorer.pos) ? 0.12 : 0.06);
  const assistant = isPenalty ? null : selectAssistant(squad, scorer, { tactics, fixtures });
  return {
    minute,
    type: isPenalty ? "PENALTY" : "GOAL",
    team,
    playerId: scorer?.id,
    assistId: assistant?.id,
    description: isPenalty
      ? `${descriptionPrefix}${scorer?.name ?? teamName} marca de penalti.`
      : `${descriptionPrefix}Gol de ${scorer?.name ?? teamName}${assistant ? `, asistido por ${assistant.name}` : ""}.`,
  };
}
