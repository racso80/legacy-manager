import { getPlayerSeasonStats } from "../players/playerProfile.js";
import { getAccumulatedLoad } from "../medical/medicalEngine.js";
import { staffModifier } from "../staff/staffEngine.js";
import { getPlayerPersonality, personalityModifier } from "../morale/moraleEngine.js";

export const TRAINING_TYPES = {
  recovery:{ id:"recovery", icon:"💆", name:"Recuperación", description:"Reduce fatiga y riesgo, sin mejora deportiva.", fatigue:-5, attrs:{} },
  physical:{ id:"physical", icon:"🏃", name:"Físico", description:"Mejora ritmo y resistencia con carga elevada.", fatigue:4, attrs:{ ritmo:3.2, fisico:3.8 } },
  technical:{ id:"technical", icon:"⚽", name:"Técnico", description:"Trabaja pase, regate y finalización.", fatigue:2.5, attrs:{ pase:3, regate:3, tiro:3 } },
  tactical:{ id:"tactical", icon:"🧠", name:"Táctico", description:"Mejora comprensión y rendimiento colectivo.", fatigue:1.2, attrs:{ tactical:5 } },
  activation:{ id:"activation", icon:"✨", name:"Activación", description:"Sesión ligera previa al partido.", fatigue:.5, attrs:{ ritmo:.5, tactical:1 } },
};

export const TRAINING_LOADS = {
  low:{ id:"low", icon:"🟢", name:"Baja", development:.65, fatigue:.65, risk:0 },
  medium:{ id:"medium", icon:"🟡", name:"Media", development:1, fatigue:1, risk:4 },
  high:{ id:"high", icon:"🟠", name:"Alta", development:1.35, fatigue:1.35, risk:10 },
  veryHigh:{ id:"veryHigh", icon:"🔴", name:"Muy alta", development:1.65, fatigue:1.75, risk:18 },
};

export const TRAINING_DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes"];
export const ATTRIBUTE_LABELS = { ritmo:"Velocidad", fisico:"Resistencia", pase:"Pase", regate:"Regate", tiro:"Finalización", defensa:"Defensa", porteria:"Portería", tactical:"Comprensión táctica" };
export const INDIVIDUAL_FOCUSES = ["ritmo","fisico","pase","regate","tiro","defensa","porteria"];

export const WEEKLY_TRAINING_FOCUSES = {
  balanced:{ id:"balanced", icon:"⚖️", name:"Plan equilibrado", description:"Mantiene una semana completa sin priorizar un aspecto concreto.", load:"medium", days:["recovery","physical","tactical","technical","activation"], attrs:{ tactical:1 }, match:{}, fatigueMultiplier:1, riskDelta:0 },
  recovery:{ id:"recovery", icon:"💆", name:"Recuperación física", description:"Reduce carga y riesgo antes del siguiente partido.", load:"low", days:["recovery","recovery","tactical","activation","recovery"], attrs:{}, match:{ attack:-.4, defense:.2, fatigueMultiplier:.88, injuryRisk:-4 }, fatigueMultiplier:.62, riskDelta:-5 },
  highPress:{ id:"highPress", icon:"🔥", name:"Presión alta", description:"Trabaja presión tras pérdida, intensidad y robos altos.", load:"high", days:["physical","tactical","physical","technical","activation"], attrs:{ fisico:1.8, ritmo:1.2, tactical:2.2 }, match:{ chanceRate:.035, pressure:.08, fatigueMultiplier:1.08, yellowRisk:.02 }, fatigueMultiplier:1.18, riskDelta:4 },
  defensiveShape:{ id:"defensiveShape", icon:"🛡️", name:"Organización defensiva", description:"Mejora ayudas, bloque y protección del área.", load:"medium", days:["recovery","tactical","tactical","physical","activation"], attrs:{ defensa:2.2, tactical:2.4 }, match:{ defense:1.4, opponentChanceRate:-.025 }, fatigueMultiplier:.96, riskDelta:0 },
  wingAttack:{ id:"wingAttack", icon:"↔️", name:"Ataque por bandas", description:"Busca amplitud, centros y llegadas exteriores.", load:"medium", days:["technical","tactical","technical","physical","activation"], attrs:{ ritmo:1.1, regate:1.4, pase:.8 }, match:{ chanceRate:.025, wingBonus:.05 }, fatigueMultiplier:1.02, riskDelta:1 },
  setPieceAttack:{ id:"setPieceAttack", icon:"🎯", name:"Balón parado ofensivo", description:"Aumenta peligro en córners y faltas laterales.", load:"medium", days:["tactical","technical","tactical","technical","activation"], attrs:{ pase:1.2, tiro:1.2, tactical:2 }, match:{ setPieceAttack:.08, goalConv:.018 }, fatigueMultiplier:.94, riskDelta:0 },
  setPieceDefense:{ id:"setPieceDefense", icon:"📐", name:"Balón parado defensivo", description:"Reduce concesiones en córners y faltas rivales.", load:"medium", days:["tactical","tactical","physical","technical","activation"], attrs:{ defensa:1.6, porteria:.8, tactical:2 }, match:{ defense:.7, setPieceDefense:.08, opponentChanceRate:-.015 }, fatigueMultiplier:.96, riskDelta:0 },
  possession:{ id:"possession", icon:"🧠", name:"Posesión", description:"Mejora circulación, paciencia y control con balón.", load:"medium", days:["technical","tactical","technical","tactical","activation"], attrs:{ pase:1.8, regate:.6, tactical:2.2 }, match:{ possession:4, chanceRate:.015 }, fatigueMultiplier:.96, riskDelta:0 },
  transitions:{ id:"transitions", icon:"⚡", name:"Transiciones rápidas", description:"Trabaja robo y salida vertical.", load:"medium", days:["physical","technical","tactical","physical","activation"], attrs:{ ritmo:1.5, pase:.8, tactical:1.4 }, match:{ chanceRate:.025, transition:.05, fatigueMultiplier:1.03 }, fatigueMultiplier:1.08, riskDelta:2 },
  finishing:{ id:"finishing", icon:"🥅", name:"Definición", description:"Afina últimos metros y toma de decisión en área.", load:"medium", days:["technical","technical","tactical","technical","activation"], attrs:{ tiro:2.4, pase:.4 }, match:{ goalConv:.035 }, fatigueMultiplier:.98, riskDelta:0 },
  stamina:{ id:"stamina", icon:"🏃", name:"Resistencia", description:"Sube el fondo físico con más carga acumulada.", load:"high", days:["physical","physical","tactical","physical","activation"], attrs:{ fisico:2.6, ritmo:.7 }, match:{ fatigueMultiplier:.94 }, fatigueMultiplier:1.24, riskDelta:5 },
  cohesion:{ id:"cohesion", icon:"🤝", name:"Cohesión de grupo", description:"Refuerza confianza colectiva y automatismos sencillos.", load:"low", days:["recovery","tactical","technical","tactical","activation"], attrs:{ tactical:1.8 }, match:{ attack:.4, defense:.4 }, fatigueMultiplier:.82, riskDelta:-1, moraleDelta:1 },
  youth:{ id:"youth", icon:"🌱", name:"Trabajo específico para jóvenes", description:"Acelera aprendizaje de jugadores jóvenes sin cargar a todo el grupo.", load:"medium", days:["technical","tactical","technical","recovery","activation"], attrs:{ pase:.8, regate:.8, tiro:.8, tactical:1.2 }, match:{}, fatigueMultiplier:.94, riskDelta:0, youthBoost:.18 },
};

export const DEFAULT_TRAINING_PLAN = {
  load:"medium",
  weeklyFocus:"balanced",
  days:["recovery","physical","tactical","technical","activation"],
  individual:{},
};

export function normalizeTrainingPlan(plan) {
  return {
    load:TRAINING_LOADS[plan?.load] ? plan.load : DEFAULT_TRAINING_PLAN.load,
    weeklyFocus:WEEKLY_TRAINING_FOCUSES[plan?.weeklyFocus] ? plan.weeklyFocus : DEFAULT_TRAINING_PLAN.weeklyFocus,
    days:TRAINING_DAYS.map((_,index)=>TRAINING_TYPES[plan?.days?.[index]] ? plan.days[index] : DEFAULT_TRAINING_PLAN.days[index]),
    individual:{ ...(plan?.individual ?? {}) },
  };
}

export function applyTrainingFocusPreset(plan, focusId) {
  const focus = WEEKLY_TRAINING_FOCUSES[focusId] ?? WEEKLY_TRAINING_FOCUSES.balanced;
  return normalizeTrainingPlan({
    ...(plan ?? DEFAULT_TRAINING_PLAN),
    weeklyFocus:focus.id,
    load:focus.load ?? plan?.load ?? DEFAULT_TRAINING_PLAN.load,
    days:focus.days ?? plan?.days ?? DEFAULT_TRAINING_PLAN.days,
  });
}

export function getTrainingFocusMeta(focusId) {
  return WEEKLY_TRAINING_FOCUSES[focusId] ?? WEEKLY_TRAINING_FOCUSES.balanced;
}

export function getTrainingMatchModifiers(rawPlan) {
  const plan = normalizeTrainingPlan(rawPlan);
  const focus = getTrainingFocusMeta(plan.weeklyFocus);
  const match = focus.match ?? {};
  return {
    attack:match.attack ?? 0,
    defense:match.defense ?? 0,
    possession:match.possession ?? 0,
    chanceRate:match.chanceRate ?? 0,
    opponentChanceRate:match.opponentChanceRate ?? 0,
    goalConv:match.goalConv ?? 0,
    setPieceAttack:match.setPieceAttack ?? 0,
    setPieceDefense:match.setPieceDefense ?? 0,
    wingBonus:match.wingBonus ?? 0,
    transition:match.transition ?? 0,
    pressure:match.pressure ?? 0,
    yellowRisk:match.yellowRisk ?? 0,
    fatigueMultiplier:match.fatigueMultiplier ?? 1,
    injuryRisk:match.injuryRisk ?? 0,
    focusId:focus.id,
    focusName:focus.name,
  };
}

function developmentFactor(player, stats) {
  const room = Math.max(0, (player.potential ?? player.overall) - player.overall);
  const age = player.age <= 20 ? 1.45 : player.age <= 23 ? 1.25 : player.age <= 27 ? 1 : player.age <= 31 ? .72 : .42;
  const potential = room >= 7 ? 1.35 : room >= 3 ? 1.1 : room > 0 ? .8 : .25;
  const minutes = stats.minutes >= 1800 ? 1.2 : stats.minutes >= 900 ? 1.08 : stats.minutes >= 300 ? .95 : .78;
  const morale = .75 + Math.max(0, Math.min(100, player.morale ?? 70)) / 200;
  return age * potential * minutes * morale;
}

function clamp(value,min,max){ return Math.max(min,Math.min(max,value)); }

export function applyWeeklyTraining(players, game, rawPlan) {
  const plan = normalizeTrainingPlan(rawPlan);
  const load = TRAINING_LOADS[plan.load];
  const focus = getTrainingFocusMeta(plan.weeklyFocus);
  const fitnessDevelopmentBoost = 1 + Math.max(-.08, staffModifier(game, "fitnessCoach", "fitness", .1));
  const loadManagementBoost = staffModifier(game, "fitnessCoach", "loadManagement", .16);
  const recoveryBoost = staffModifier(game, "fitnessCoach", "recovery", .14);
  const sessions = plan.days.map(id=>TRAINING_TYPES[id]);
  const focusAttrs = focus.attrs ?? {};
  const result = [];
  const changes = [];

  players.forEach(original => {
    const stats = getPlayerSeasonStats(original, game, game.teamId);
    const isUnavailable = original.injured || ["injured","recovery"].includes(original.medical?.phase);
    const youthBoost = original.age <= 23 ? (focus.youthBoost ?? 0) : 0;
    const personality = getPlayerPersonality(original);
    const personalityTraining = personalityModifier(original, "trainingResponse", 1);
    const confidenceBoost = personality.id === "insecureYoung" && focus.id === "youth" ? 1.12 : 1;
    const factor = developmentFactor(original,stats) * load.development * fitnessDevelopmentBoost * (1 + youthBoost) * personalityTraining * confidenceBoost;
    const xp = { ...(original.developmentXP ?? {}) };
    const attrs = { ...(original.attrs ?? {}) };
    const playerChanges = [];
    let fatigueDelta = sessions.reduce((sum,session)=>sum+session.fatigue,0) * load.fatigue * (focus.fatigueMultiplier ?? 1);
    if (fatigueDelta > 0) fatigueDelta *= Math.max(.82, 1 - loadManagementBoost);
    if (fatigueDelta < 0) fatigueDelta *= Math.max(.9, 1 + recoveryBoost);
    if (isUnavailable) fatigueDelta = Math.min(-8, fatigueDelta - 10);

    if (!isUnavailable) {
      sessions.forEach(session => Object.entries(session.attrs).forEach(([key,amount]) => {
        xp[key] = (xp[key] ?? 0) + amount * factor;
      }));
      Object.entries(focusAttrs).forEach(([key,amount]) => {
        xp[key] = (xp[key] ?? 0) + amount * factor;
      });
      const focus = plan.individual[original.id];
      if (focus && attrs[focus] !== undefined) xp[focus] = (xp[focus] ?? 0) + 4 * factor;
    }

    let attributeGains = 0;
    Object.keys(xp).forEach(key => {
      if (key === "tactical") return;
      while (xp[key] >= 100 && (attrs[key] ?? 0) < 99 && original.overall < (original.potential ?? original.overall)) {
        xp[key] -= 100;
        attrs[key] = (attrs[key] ?? original.overall) + 1;
        attributeGains++;
        playerChanges.push({ key, label:ATTRIBUTE_LABELS[key] ?? key, delta:1 });
      }
    });

    let overallXP = (original.overallDevelopmentXP ?? 0) + attributeGains * 36;
    let overall = original.overall;
    if (overallXP >= 100 && overall < (original.potential ?? overall)) {
      overallXP -= 100; overall++;
      playerChanges.push({ key:"overall", label:"Media general", delta:1 });
    }

    let declineXP = original.declineXP ?? 0;
    if (original.age >= 33) declineXP += (original.age - 32) * 1.4 + (stats.minutes < 450 ? 1.5 : 0);
    if (declineXP >= 100) {
      declineXP -= 100; overall = Math.max(55,overall-1);
      const physicalKey = (attrs.ritmo ?? 99) >= (attrs.fisico ?? 99) ? "ritmo" : "fisico";
      attrs[physicalKey] = Math.max(40,(attrs[physicalKey] ?? overall)-1);
      playerChanges.push({ key:"overall", label:"Media general", delta:-1 });
      playerChanges.push({ key:physicalKey, label:ATTRIBUTE_LABELS[physicalKey], delta:-1 });
    }

    const tacticalXP = xp.tactical ?? 0;
    const tacticalGain = Math.floor(tacticalXP/100);
    xp.tactical = tacticalXP%100;
    const tacticalSharpness = clamp((original.tacticalSharpness ?? 0)*.8 + tacticalGain*.8 + sessions.filter(s=>s.id==="tactical").length*.18,0,5);
    const recoveryCount = sessions.filter(session=>session.id==="recovery").length;
    const highIntensityCount = sessions.filter(session=>["physical","technical"].includes(session.id)).length;
    const trainingRiskModifier = clamp(load.risk + (focus.riskDelta ?? 0) + Math.max(0,fatigueDelta)*.45 - recoveryCount*3 - Math.max(0, loadManagementBoost) * 12,0,25);
    const accumulatedBefore = getAccumulatedLoad(original);
    const loadDelta = Math.round(((load.id==="veryHigh"?7:load.id==="high"?4:load.id==="medium"?1:-2) + highIntensityCount*1.2 - recoveryCount*3 + Math.max(0,fatigueDelta)*.18) * Math.max(.82, 1 - loadManagementBoost));
    const accumulatedFatigue = clamp(accumulatedBefore + loadDelta,0,100);
    const playedLast = game.fixtures?.filter(f=>f.played).slice(-1)[0]?.participation?.starters?.includes(original.id);
    let morale = original.morale ?? 70;
    if (playerChanges.some(change=>change.delta>0)) morale += 2;
    morale += focus.moraleDelta ?? 0;
    if (!playedLast && original.overall >= 78) morale -= 1;
    if (plan.load === "veryHigh" && 100-(original.fatigue??0)<55) morale -= 1;
    if (personality.id === "professional" || personality.id === "hardWorker") morale += plan.load === "veryHigh" ? 1 : 0;
    if (personality.id === "conflictive" && plan.load === "veryHigh") morale -= 2;
    if (personality.id === "veteran" && plan.load === "low") morale += 1;

    const player = {
      ...original, attrs, overall, developmentXP:xp, overallDevelopmentXP:overallXP, declineXP,
      tacticalSharpness, trainingRiskModifier,
      fatigue:clamp(Math.round((original.fatigue??20)+fatigueDelta),0,100),
      accumulatedFatigue,
      medical:{...(original.medical??{}),accumulatedFatigue},
      morale:clamp(morale,10,100), trainingFocus:plan.individual[original.id] ?? null, weeklyTrainingFocus:focus.id,
    };
    result.push(player);
    changes.push({ playerId:player.id, name:player.name, overall:player.overall, potential:player.potential, personalityId:personality.id, personalityLabel:personality.label, fatigueDelta:Math.round(fatigueDelta), changes:playerChanges, progress:Object.entries(xp).filter(([key])=>key!=="tactical").sort((a,b)=>b[1]-a[1]).slice(0,2).map(([key,value])=>({key,label:ATTRIBUTE_LABELS[key]??key,value:Math.round(value)})) });
  });

  const improved = changes.filter(item=>item.changes.some(change=>change.delta>0)).sort((a,b)=>b.changes.length-a.changes.length);
  const prospects = result.filter(player=>player.age<=23&&(player.potential??player.overall)-player.overall>=3).sort((a,b)=>(b.potential-b.overall)-(a.potential-a.overall));
  const stagnant = changes.filter(item=>item.potential<=item.overall||item.progress.every(progress=>progress.value<25));
  const avgFatigueDelta = changes.length ? Math.round(changes.reduce((sum,item)=>sum+item.fatigueDelta,0)/changes.length) : 0;
  return {
    players:result,
    report:{ matchday:game.matchday, load:plan.load, weeklyFocus:focus.id, weeklyFocusName:focus.name, changes, improved:improved.map(item=>item.playerId), prospects:prospects.map(player=>player.id), stagnant:stagnant.map(item=>item.playerId), avgFatigueDelta, generatedAt:new Date().toISOString() },
    tacticalBonus:result.length ? result.reduce((sum,player)=>sum+(player.tacticalSharpness??0),0)/result.length : 0,
  };
}
