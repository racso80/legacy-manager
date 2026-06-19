import { getPlayerSeasonStats } from "../players/playerProfile.js";

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

export const DEFAULT_TRAINING_PLAN = {
  load:"medium",
  days:["recovery","physical","tactical","technical","activation"],
  individual:{},
};

export function normalizeTrainingPlan(plan) {
  return {
    load:TRAINING_LOADS[plan?.load] ? plan.load : DEFAULT_TRAINING_PLAN.load,
    days:TRAINING_DAYS.map((_,index)=>TRAINING_TYPES[plan?.days?.[index]] ? plan.days[index] : DEFAULT_TRAINING_PLAN.days[index]),
    individual:{ ...(plan?.individual ?? {}) },
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
  const sessions = plan.days.map(id=>TRAINING_TYPES[id]);
  const result = [];
  const changes = [];

  players.forEach(original => {
    const stats = getPlayerSeasonStats(original, game, game.teamId);
    const isUnavailable = original.injured || ["injured","recovery"].includes(original.medical?.phase);
    const factor = developmentFactor(original,stats) * load.development;
    const xp = { ...(original.developmentXP ?? {}) };
    const attrs = { ...(original.attrs ?? {}) };
    const playerChanges = [];
    let fatigueDelta = sessions.reduce((sum,session)=>sum+session.fatigue,0) * load.fatigue;
    if (isUnavailable) fatigueDelta = Math.min(-8, fatigueDelta - 10);

    if (!isUnavailable) {
      sessions.forEach(session => Object.entries(session.attrs).forEach(([key,amount]) => {
        xp[key] = (xp[key] ?? 0) + amount * factor;
      }));
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
    const trainingRiskModifier = clamp(load.risk + Math.max(0,fatigueDelta)*.45 - recoveryCount*3,0,25);
    const playedLast = game.fixtures?.filter(f=>f.played).slice(-1)[0]?.participation?.starters?.includes(original.id);
    let morale = original.morale ?? 70;
    if (playerChanges.some(change=>change.delta>0)) morale += 2;
    if (!playedLast && original.overall >= 78) morale -= 1;
    if (plan.load === "veryHigh" && 100-(original.fatigue??0)<55) morale -= 1;

    const player = {
      ...original, attrs, overall, developmentXP:xp, overallDevelopmentXP:overallXP, declineXP,
      tacticalSharpness, trainingRiskModifier,
      fatigue:clamp(Math.round((original.fatigue??20)+fatigueDelta),0,100),
      morale:clamp(morale,10,100), trainingFocus:plan.individual[original.id] ?? null,
    };
    result.push(player);
    changes.push({ playerId:player.id, name:player.name, overall:player.overall, potential:player.potential, fatigueDelta:Math.round(fatigueDelta), changes:playerChanges, progress:Object.entries(xp).filter(([key])=>key!=="tactical").sort((a,b)=>b[1]-a[1]).slice(0,2).map(([key,value])=>({key,label:ATTRIBUTE_LABELS[key]??key,value:Math.round(value)})) });
  });

  const improved = changes.filter(item=>item.changes.some(change=>change.delta>0)).sort((a,b)=>b.changes.length-a.changes.length);
  const prospects = result.filter(player=>player.age<=23&&(player.potential??player.overall)-player.overall>=3).sort((a,b)=>(b.potential-b.overall)-(a.potential-a.overall));
  const stagnant = changes.filter(item=>item.potential<=item.overall||item.progress.every(progress=>progress.value<25));
  const avgFatigueDelta = changes.length ? Math.round(changes.reduce((sum,item)=>sum+item.fatigueDelta,0)/changes.length) : 0;
  return {
    players:result,
    report:{ matchday:game.matchday, load:plan.load, changes, improved:improved.map(item=>item.playerId), prospects:prospects.map(player=>player.id), stagnant:stagnant.map(item=>item.playerId), avgFatigueDelta, generatedAt:new Date().toISOString() },
    tacticalBonus:result.length ? result.reduce((sum,player)=>sum+(player.tacticalSharpness??0),0)/result.length : 0,
  };
}
