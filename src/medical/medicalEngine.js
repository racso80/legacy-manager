import { staffModifier } from "../staff/staffEngine.js";

const hashNumber = value => {
  let hash = 0;
  for (const char of String(value)) hash = (Math.imul(hash, 33) + char.charCodeAt(0)) | 0;
  return Math.abs(hash);
};

export const INJURY_TYPES = [
  { id:"overload", name:"Sobrecarga muscular", minDays:3, maxDays:5, minRisk:0 },
  { id:"discomfort", name:"Molestias musculares", minDays:7, maxDays:14, minRisk:20 },
  { id:"strain", name:"Rotura fibrilar", minDays:14, maxDays:42, minRisk:45 },
  { id:"sprain", name:"Esguince", minDays:14, maxDays:56, minRisk:55 },
  { id:"severe", name:"Lesión grave", minDays:60, maxDays:180, minRisk:78 },
];

export const MEDICAL_LEVELS = [
  { max:20, id:"low", label:"Bajo", color:"#22c55e", icon:"🟢" },
  { max:50, id:"moderate", label:"Moderado", color:"#eab308", icon:"🟡" },
  { max:75, id:"high", label:"Alto", color:"#f97316", icon:"🟠" },
  { max:100, id:"critical", label:"Crítico", color:"#ef4444", icon:"🔴" },
];

export function getRiskLevel(risk) {
  return MEDICAL_LEVELS.find(level => risk <= level.max) ?? MEDICAL_LEVELS[3];
}

export function getAccumulatedLoad(player) {
  return Math.max(0, Math.min(100, Math.round(player.accumulatedFatigue ?? player.medical?.accumulatedFatigue ?? 0)));
}

export function getLoadLevel(load) {
  const value = Math.max(0, Math.min(100, Math.round(load ?? 0)));
  if (value >= 76) return { id:"critical", label:"Crítica", icon:"🔴", color:"#ef4444" };
  if (value >= 56) return { id:"high", label:"Alta", icon:"🟠", color:"#f97316" };
  if (value >= 31) return { id:"medium", label:"Media", icon:"🟡", color:"#eab308" };
  return { id:"low", label:"Baja", icon:"🟢", color:"#22c55e" };
}

function workload(playerId, fixtures = [], teamId) {
  const played = fixtures.filter(f => f.played && (f.homeTeamId === teamId || f.awayTeamId === teamId)).sort((a,b)=>b.matchday-a.matchday);
  let consecutiveStarts = 0;
  for (const fixture of played) {
    if (fixture.participation?.starters?.includes(playerId)) consecutiveStarts++;
    else break;
  }
  let seasonMinutes = 0;
  played.forEach(fixture => {
    const started = fixture.participation?.starters?.includes(playerId);
    const subIn = fixture.events?.find(event => event.type === "SUBSTITUTION" && event.playerId === playerId);
    const subOut = fixture.events?.find(event => event.type === "SUBSTITUTION" && event.outPlayerId === playerId);
    if (started) seasonMinutes += subOut?.minute ?? 90;
    else if (subIn) seasonMinutes += Math.max(0, 90 - subIn.minute);
  });
  return { consecutiveStarts, seasonMinutes };
}

export function calculateInjuryRisk(player, { fixtures = [], teamId, tactics, currentMatchMinutes = 0, game = null } = {}) {
  if (player.medical?.phase === "injured" || player.medical?.phase === "recovery") return 100;
  const load = workload(player.id, fixtures, teamId);
  const fatigue = Math.max(0, Math.min(100, player.fatigue ?? 20));
  const accumulatedLoad = getAccumulatedLoad(player);
  const fatigueRisk = Math.max(0, fatigue - 18) * .66;
  const accumulatedRisk = Math.max(0, accumulatedLoad - 30) * .22;
  const ageRisk = Math.max(0, (player.age ?? 25) - 29) * 1.6 * (player.injuryRiskAgeModifier ?? 1);
  const streakRisk = Math.min(20, load.consecutiveStarts * 4);
  const minutesRisk = Math.min(10, load.seasonMinutes / 450);
  const inMatchRisk = Math.min(10, currentMatchMinutes / 12);
  const historyRisk = Math.min(10, (player.medicalHistory ?? []).filter(item => item.totalDays >= 28).length * 3);
  const limitationRisk = player.medical?.phase === "limited" ? 24 : 0;
  const trainingRisk = Math.max(0, Math.min(25, player.trainingRiskModifier ?? 0));
  const tacticalRisk = (tactics?.presion === "alta" ? 5 : 0) + (tactics?.ritmo === "rapido" ? 4 : 0);
  const staffPrevention = Math.max(0, staffModifier(game, "medicalDirector", "prevention", .1) + staffModifier(game, "fitnessCoach", "prevention", .08));
  return Math.round(Math.max(2, Math.min(98, (3 + fatigueRisk + accumulatedRisk + ageRisk + streakRisk + minutesRisk + inMatchRisk + historyRisk + limitationRisk + trainingRisk + tacticalRisk) * Math.max(.86, 1 - staffPrevention))));
}

function chooseInjuryType(risk, playerId, matchday) {
  const eligible = INJURY_TYPES.filter(type => risk >= type.minRisk);
  const severityRoll = Math.random() * 100;
  let maxSeverity = risk >= 85 && severityRoll < 7 ? 4 : risk >= 65 && severityRoll < 25 ? 3 : risk >= 45 && severityRoll < 45 ? 2 : risk >= 20 ? 1 : 0;
  maxSeverity = Math.min(maxSeverity, eligible.length - 1);
  const candidates = eligible.slice(0, maxSeverity + 1);
  return candidates[(hashNumber(`${playerId}:${matchday}:${Math.floor(severityRoll)}`) + Math.floor(Math.random()*candidates.length)) % candidates.length];
}

export function rollContextualInjury(players, context = {}) {
  const candidates = players.filter(player => !player.injured && player.medical?.phase !== "recovery");
  if (!candidates.length) return null;
  const weighted = candidates.map(player => ({ player, risk:calculateInjuryRisk(player, context) }));
  const averageRisk = weighted.reduce((sum,item)=>sum+item.risk,0) / weighted.length;
  const highestRisk = Math.max(...weighted.map(item=>item.risk));
  const segmentChance = Math.min(.026, .001 + averageRisk * .00011 + highestRisk * .00008);
  if (Math.random() >= segmentChance) return null;
  const totalWeight = weighted.reduce((sum,item)=>sum+Math.pow(item.risk,1.7),0);
  let roll = Math.random() * totalWeight;
  const selected = weighted.find(item => (roll -= Math.pow(item.risk,1.7)) <= 0) ?? weighted[weighted.length-1];
  const type = chooseInjuryType(selected.risk, selected.player.id, context.matchday);
  const loadPenalty = selected.player ? Math.max(0, getAccumulatedLoad(selected.player) - 60) : 0;
  const totalDays = Math.round((type.minDays + Math.floor(Math.random() * (type.maxDays - type.minDays + 1))) * (1 + Math.min(.18, loadPenalty * .004)));
  return { player:selected.player, risk:selected.risk, type, totalDays };
}

export function createInjuryEvent(result, minute) {
  if (!result) return null;
  return {
    minute, type:"INJURY", team:"user", playerId:result.player.id,
    injuryType:result.type.name, injuryTypeId:result.type.id,
    injuryDays:result.totalDays, injuryGames:Math.ceil(result.totalDays/7), riskAtInjury:result.risk,
    description:`🚑 ${result.player.name} sufre ${result.type.name.toLowerCase()} y no puede continuar.`,
  };
}

export function applyInjury(player, event, season, matchday) {
  const totalDays = event.injuryDays ?? Math.max(7, (event.injuryGames ?? 1) * 7);
  const record = {
    id:`inj_${player.id}_${season}_${matchday}_${event.minute}`,
    season:String(season), matchday, type:event.injuryType ?? "Lesión muscular",
    typeId:event.injuryTypeId ?? "legacy", totalDays, riskAtInjury:event.riskAtInjury ?? null,
  };
  return {
    ...player, injured:true, injuryGames:Math.ceil(totalDays/7),
    medical:{ phase:"injured", type:record.type, typeId:record.typeId, totalDays, remainingDays:totalDays, recovery:0, startedMatchday:matchday, expectedReturnMatchday:matchday+Math.ceil(totalDays/7) },
    medicalHistory:[...(player.medicalHistory ?? []), record],
  };
}

export function advanceMedicalRecovery(player, days = 7, game = null) {
  if (!player.medical || player.medical.phase === "available") return { ...player, injured:false, injuryGames:0, medical:player.medical ?? { phase:"available" } };
  const loadModifier = 1 + Math.max(0, getAccumulatedLoad(player) - 50) * .006;
  const staffRecovery = Math.max(0, staffModifier(game, "medicalDirector", "recovery", .12) + staffModifier(game, "fitnessCoach", "recovery", .08));
  const effectiveDays = Math.max(1, Math.round((days * (1 + staffRecovery)) / Math.max(.75, (player.recoveryModifier ?? 1) * loadModifier)));
  const remainingDays = Math.max(0, (player.medical.remainingDays ?? 0) - effectiveDays);
  const totalDays = Math.max(1, player.medical.totalDays ?? remainingDays);
  const recovery = Math.min(100, Math.round((1 - remainingDays / totalDays) * 100));
  if (remainingDays === 0) return { ...player, injured:false, injuryGames:0, fatigue:Math.max(player.fatigue ?? 0, 22), medical:{ ...player.medical, phase:"available", remainingDays:0, recovery:100 } };
  const phase = remainingDays <= 7 ? "limited" : recovery >= 40 ? "recovery" : "injured";
  return { ...player, injured:phase !== "limited", injuryGames:Math.ceil(remainingDays/7), medical:{ ...player.medical, phase, remainingDays, recovery } };
}

export function normalizeMedicalPlayer(player) {
  if (player.medical) return player;
  if (player.injured) {
    const remainingDays = Math.max(7, (player.injuryGames ?? 1) * 7);
    return { ...player, medical:{ phase:"injured", type:"Lesión muscular", typeId:"legacy", totalDays:remainingDays, remainingDays, recovery:0 }, medicalHistory:player.medicalHistory ?? [] };
  }
  return { ...player, medical:{ phase:"available", remainingDays:0, recovery:100 }, medicalHistory:player.medicalHistory ?? [] };
}

export function getPhysicalStatus(player) {
  if (player.medical?.phase === "injured") return { id:"injured", label:"Lesionado", icon:"🔴", color:"#ef4444" };
  if (player.medical?.phase === "recovery") return { id:"recovery", label:"En recuperación", icon:"🟠", color:"#f97316" };
  if (player.medical?.phase === "limited") return { id:"limited", label:"Apto con limitaciones", icon:"🟡", color:"#eab308" };
  const energy = 100 - (player.fatigue ?? 0);
  if (energy < 40) return { id:"overloaded", label:"Sobrecargado", icon:"🟠", color:"#f97316" };
  if (energy < 65) return { id:"fatigued", label:"Fatigado", icon:"🟡", color:"#eab308" };
  return { id:"available", label:"Disponible", icon:"🟢", color:"#22c55e" };
}

export function formatMedicalDuration(days) {
  if (days < 7) return `${days} día${days===1?"":"s"}`;
  if (days < 60) return `${Math.max(1,Math.round(days/7))} semana${Math.round(days/7)===1?"":"s"}`;
  return `${Math.max(2,Math.round(days/30))} meses`;
}
