import { calculateInjuryRisk, formatMedicalDuration } from "../medical/medicalEngine.js";
import { getPlayerPersonality } from "../morale/moraleEngine.js";
import { buildStaffRecommendations, getStaffMember } from "../staff/staffEngine.js";

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

function pickByDay(game, list = []) {
  if (!list.length) return null;
  const seed = Number(game?.matchday ?? 1) + Number(game?.season ?? 2025);
  return list[Math.abs(seed) % list.length];
}

function standingPosition(game, teamId) {
  const sorted = [...(game?.standings ?? [])].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);
  const index = sorted.findIndex(item => item.teamId === teamId);
  return index >= 0 ? index + 1 : null;
}

function weeklyPreparationMoment(game, fixture, context = {}, activeEvents = []) {
  if (!game || !fixture) return null;
  const stamp = currentStamp(game);
  const matchday = stamp.matchday ?? 1;
  if (matchday > 38) return null;
  const pressureCount = activeEvents.filter(event => ["critical", "important"].includes(event.priority)).length;
  if (activeEvents.some(event => event.priority === "critical") || pressureCount >= 3) return null;
  if (matchday > 1 && matchday % 7 === 0 && pressureCount > 0) return null;

  const opponentId = fixture.homeTeamId === game.teamId ? fixture.awayTeamId : fixture.homeTeamId;
  const opponentPos = standingPosition(game, opponentId);
  const userPos = standingPosition(game, game.teamId);
  const isImportantMatch = matchday >= 31 || (opponentPos && opponentPos <= 6) || (userPos && userPos <= 6);
  const tiredPlayer = [...(game.players ?? [])].sort((a, b) => (b.fatigue ?? 0) - (a.fatigue ?? 0))[0];
  const avgFatigue = (game.players ?? []).length ? (game.players ?? []).reduce((sum, player) => sum + (player.fatigue ?? 0), 0) / (game.players ?? []).length : 20;
  const bestYouth = [...(game.youth?.players ?? [])].sort((a, b) => (b.potential ?? 0) - (a.potential ?? 0))[0];
  const trainingLoad = game.trainingPlan?.load ?? "medium";
  const recommendedFocus = avgFatigue >= 48 ? "recovery" : isImportantMatch ? "defensiveShape" : trainingLoad === "low" ? "highPress" : "balanced";
  const recommendedLoad = recommendedFocus === "recovery" ? "low" : recommendedFocus === "highPress" ? "high" : "medium";
  const phase = Math.abs((matchday + Number(stamp.season ?? 2025)) % 6);
  const base = { season:stamp.season, matchday, priority:"normal" };
  const commonId = `${stamp.season}:${matchday}`;
  const candidates = [
    {
      id:`WeeklyPrep:Rival:${commonId}`,
      type:"WeeklyPreparationMoment",
      momentType:"weekly_rival_report",
      issueKey:`weekly_preparation:rival:${commonId}`,
      category:"match",
      ownerActorId:"assistantCoach",
      title:"El segundo entrenador trae el informe del rival",
      summary:opponentPos ? `El proximo rival llega ${opponentPos} en la tabla. Hay detalles que pueden condicionar el plan.` : "El cuerpo tecnico ha detectado un patron del rival para preparar el partido.",
      action:{ screen:"lineup" },
      actionLabel:"Preparar plan",
      expectedOutcome:"Decidir si mantener el plan o ajustar el planteamiento.",
      ...base,
    },
    {
      id:`WeeklyPrep:Training:${commonId}`,
      type:"WeeklyPreparationMoment",
      momentType:"weekly_training_focus",
      issueKey:`weekly_preparation:training:${commonId}`,
      category:"training",
      ownerActorId:"fitnessCoach",
      title:"El preparador fisico propone enfocar la semana",
      summary:`La carga actual es ${trainingLoad}. Recomienda una semana de ${recommendedFocus === "recovery" ? "recuperacion" : recommendedFocus === "highPress" ? "presion alta" : recommendedFocus === "defensiveShape" ? "organizacion defensiva" : "trabajo equilibrado"}.`,
      recommendedFocus,
      recommendedLoad,
      action:{ screen:"training" },
      actionLabel:"Revisar entrenamiento",
      expectedOutcome:"Elegir el enfoque de trabajo antes del partido.",
      ...base,
    },
    {
      id:`WeeklyPrep:Locker:${commonId}`,
      type:"WeeklyPreparationMoment",
      momentType:"weekly_locker_room",
      issueKey:`weekly_preparation:locker:${commonId}`,
      category:"training",
      ownerActorId:"captain",
      title:"El capitan pasa a tomar la temperatura del grupo",
      summary:"No hay una crisis, pero el vestuario tambien se prepara durante la semana.",
      action:{ screen:"lockerRoom" },
      actionLabel:"Escuchar vestuario",
      expectedOutcome:"Interpretar el animo del grupo antes del partido.",
      ...base,
    },
    {
      id:`WeeklyPrep:Medical:${commonId}`,
      type:"WeeklyPreparationMoment",
      momentType:"weekly_medical_followup",
      issueKey:`weekly_preparation:medical:${commonId}`,
      category:"medical",
      ownerActorId:"doctor",
      title:tiredPlayer ? `El medico quiere revisar la carga de ${firstName(tiredPlayer.name)}` : "El medico trae una nota de seguimiento",
      summary:tiredPlayer ? `${firstName(tiredPlayer.name)} acumula ${Math.round(tiredPlayer.fatigue ?? 0)}% de fatiga. No es una lesion, pero conviene vigilarlo.` : "El cuerpo medico prefiere llegar al partido sin sorpresas fisicas.",
      subjectId:tiredPlayer?.id,
      subjectName:tiredPlayer?.name,
      action:{ screen:"medical", playerId:tiredPlayer?.id },
      actionLabel:"Ver carga fisica",
      expectedOutcome:"Valorar descanso, minutos o seguimiento.",
      ...base,
    },
    bestYouth && {
      id:`WeeklyPrep:Academy:${bestYouth.id}:${commonId}`,
      type:"WeeklyPreparationMoment",
      momentType:"weekly_academy_progress",
      issueKey:`weekly_preparation:academy:${bestYouth.id}:${commonId}`,
      category:"youth",
      ownerActorId:"academyChief",
      title:`La cantera informa de ${firstName(bestYouth.name)}`,
      summary:`Esta semana ha dejado buenas sensaciones. Potencial ${bestYouth.potential}; no exige promocion, solo seguimiento.`,
      subjectId:bestYouth.id,
      subjectName:bestYouth.name,
      action:{ screen:"youth", playerId:bestYouth.id },
      actionLabel:"Escuchar cantera",
      expectedOutcome:"Decidir si merece seguimiento cercano.",
      ...base,
    },
    {
      id:`WeeklyPrep:Press:${commonId}`,
      type:"WeeklyPreparationMoment",
      momentType:"weekly_press_context",
      issueKey:`weekly_preparation:press:${commonId}`,
      category:"press",
      ownerActorId:"pressOfficer",
      priority:isImportantMatch ? "important" : "normal",
      title:isImportantMatch ? "La prensa empieza a calentar el partido" : "Comunicacion quiere cuidar el ambiente previo",
      summary:isImportantMatch ? "El contexto del proximo partido puede marcar titulares. Conviene alinear el mensaje." : "No hace falta rueda de prensa completa, pero si conviene cuidar el tono de la semana.",
      action:{ screen:"news" },
      actionLabel:"Revisar ambiente",
      expectedOutcome:"Decidir si conviene mandar un mensaje sereno o ambicioso.",
      ...base,
      priority:isImportantMatch ? "important" : "normal",
    },
  ].filter(Boolean);

  return candidates[phase] ?? pickByDay(game, candidates);
}

function userFixtureResult(game, fixture) {
  if (!fixture || !game?.teamId) return null;
  const isHome = fixture.homeTeamId === game.teamId;
  const goalsFor = isHome ? fixture.homeGoals : fixture.awayGoals;
  const goalsAgainst = isHome ? fixture.awayGoals : fixture.homeGoals;
  if (typeof goalsFor !== "number" || typeof goalsAgainst !== "number") return null;
  return {
    isHome,
    goalsFor,
    goalsAgainst,
    diff: goalsFor - goalsAgainst,
    won: goalsFor > goalsAgainst,
    drew: goalsFor === goalsAgainst,
    lost: goalsFor < goalsAgainst,
    opponentId: isHome ? fixture.awayTeamId : fixture.homeTeamId,
  };
}

function recentUserFixtures(game) {
  return [...(game?.fixtures ?? [])]
    .filter(item => item.played && (item.homeTeamId === game.teamId || item.awayTeamId === game.teamId))
    .sort((a, b) => (b.matchday ?? 0) - (a.matchday ?? 0));
}

function isRivalry(game, opponentId) {
  const teamId = game?.teamId;
  if (!teamId || !opponentId) return false;
  const rivalries = {
    athletic:["realsociedad", "osasuna", "alaves"],
    realsociedad:["athletic", "osasuna", "alaves"],
    osasuna:["athletic", "realsociedad"],
    alaves:["athletic", "realsociedad"],
    realmadrid:["barcelona", "atletico"],
    barcelona:["realmadrid", "espanyol"],
    atletico:["realmadrid", "rayo"],
    betis:["sevilla"],
    sevilla:["betis"],
    valencia:["villarreal"],
    villarreal:["valencia"],
    getafe:["leganes"],
    leganes:["getafe"],
  };
  return rivalries[teamId]?.includes(opponentId) ?? false;
}

function externalWorldMoment(game, activeEvents = []) {
  if (!game) return null;
  const stamp = currentStamp(game);
  const matchday = stamp.matchday ?? 1;
  if (matchday <= 1 || matchday > 39) return null;
  if (activeEvents.some(event => event.priority === "critical")) return null;
  if (activeEvents.filter(event => event.priority === "important").length >= 3) return null;

  const recent = recentUserFixtures(game);
  const lastFixture = recent[0];
  if (!lastFixture) return null;
  const result = userFixtureResult(game, lastFixture);
  if (!result) return null;
  const commonId = `${stamp.season}:${lastFixture.matchday}`;
  const userPos = standingPosition(game, game.teamId);
  const opponentPos = standingPosition(game, result.opponentId);
  const topContext = (userPos && userPos <= 6) || (opponentPos && opponentPos <= 6) || lastFixture.matchday >= 31;
  const derby = isRivalry(game, result.opponentId);
  const recentResults = recent.slice(0, 4).map(item => userFixtureResult(game, item)).filter(Boolean);
  const winStreak = recentResults.length >= 3 && recentResults.slice(0, 3).every(item => item.won);
  const lossStreak = recentResults.length >= 3 && recentResults.slice(0, 3).every(item => item.lost);
  const youthDebut = (game.players ?? []).find(player => player.academyData?.debutMatchday === lastFixture.matchday && String(player.academyData?.debutSeason ?? game.season) === String(game.season));
  const seriousInjury = (game.players ?? []).find(player => (player.medical?.startedMatchday ?? player.injuryMatchday) === lastFixture.matchday && (player.medical?.remainingDays ?? 0) >= 28);
  const recentOwnTransfer = [...(game.transfers ?? [])].reverse().find(item => Number(item.matchday ?? 0) >= matchday - 1 && (item.toTeamId === game.teamId || ["buy", "loanIn"].includes(item.type)));
  const star = [...(game.players ?? [])].filter(player => (player.overall ?? 0) >= 82).sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))[0];
  const marketWindow = matchday <= 8 || matchday >= 31;
  const canRumor = marketWindow && star && matchday % 5 === 0 && !recentOwnTransfer;
  const base = { season:stamp.season, matchday };
  const candidates = [
    derby && {
      id:`ExternalWorld:Derby:${commonId}`,
      type:"ExternalWorldMoment",
      momentType:result.won ? "world_derby_win" : result.lost ? "world_derby_loss" : "world_derby_draw",
      issueKey:`external_world:derby:${commonId}`,
      category:"press",
      ownerActorId:"pressOfficer",
      priority:"important",
      title:result.won ? "La ciudad habla del derbi" : "El derbi deja ruido fuera del club",
      summary:result.won ? "El ambiente alrededor del club es espectacular despues del resultado." : "La prensa y la aficion estan midiendo cada palabra despues del derbi.",
      action:{ screen:"news" },
      actionLabel:"Responder tono",
      expectedOutcome:"Elegir el tono publico tras un partido emocional.",
      ...base,
    },
    result.won && result.diff >= 3 && {
      id:`ExternalWorld:BigWin:${commonId}`,
      type:"ExternalWorldMoment",
      momentType:"world_big_win",
      issueKey:`external_world:big_win:${commonId}`,
      category:"press",
      ownerActorId:"pressOfficer",
      priority:"important",
      title:"La prensa empieza a hablar del equipo",
      summary:"La victoria ha tenido repercusion. Fuera del club empiezan a mirar el proyecto con otros ojos.",
      action:{ screen:"news" },
      actionLabel:"Marcar mensaje",
      expectedOutcome:"Decidir si alimentar la ilusion o mantener prudencia.",
      ...base,
    },
    result.lost && result.diff <= -2 && {
      id:`ExternalWorld:HardLoss:${commonId}`,
      type:"ExternalWorldMoment",
      momentType:"world_hard_loss",
      issueKey:`external_world:hard_loss:${commonId}`,
      category:"press",
      ownerActorId:"pressOfficer",
      priority:"important",
      title:"La derrota ha generado ruido",
      summary:"El resultado ha pesado fuera. La sala de prensa busca una explicacion sencilla.",
      action:{ screen:"news" },
      actionLabel:"Cuidar mensaje",
      expectedOutcome:"Decidir si proteger al grupo, asumir responsabilidad o rebajar el ruido.",
      ...base,
    },
    winStreak && {
      id:`ExternalWorld:WinStreak:${commonId}`,
      type:"ExternalWorldMoment",
      momentType:"world_win_streak",
      issueKey:`external_world:win_streak:${commonId}`,
      category:"board",
      ownerActorId:topContext ? "president" : "captain",
      priority:"important",
      title:topContext ? "El presidente nota el cambio de ambiente" : "La grada empieza a creer",
      summary:"La racha positiva ya no se queda dentro del vestuario. La ciudad empieza a hablar del equipo.",
      action:{ screen:"fans" },
      actionLabel:"Tomar pulso",
      expectedOutcome:"Gestionar la ilusion sin perder foco.",
      ...base,
    },
    lossStreak && {
      id:`ExternalWorld:LossStreak:${commonId}`,
      type:"ExternalWorldMoment",
      momentType:"world_negative_streak",
      issueKey:`external_world:negative_streak:${commonId}`,
      category:"board",
      ownerActorId:"president",
      priority:"important",
      title:"La mala racha ya se comenta fuera",
      summary:"La directiva y la aficion empiezan a mirar la tendencia con preocupacion.",
      action:{ screen:"board" },
      actionLabel:"Escuchar postura",
      expectedOutcome:"Asumir el contexto y definir un mensaje de reaccion.",
      ...base,
    },
    youthDebut && {
      id:`ExternalWorld:YouthDebut:${youthDebut.id}:${commonId}`,
      type:"ExternalWorldMoment",
      momentType:"world_youth_debut",
      issueKey:`external_world:youth_debut:${youthDebut.id}:${commonId}`,
      category:"press",
      ownerActorId:"pressOfficer",
      priority:"important",
      title:`Todo el mundo habla de ${firstName(youthDebut.name)}`,
      summary:"El debut del canterano ha conectado con la aficion. Conviene cuidar el mensaje alrededor del chico.",
      subjectId:youthDebut.id,
      subjectName:youthDebut.name,
      action:{ screen:"youth", playerId:youthDebut.id },
      actionLabel:"Cuidar mensaje",
      expectedOutcome:"Proteger al jugador sin apagar la ilusion.",
      ...base,
    },
    seriousInjury && {
      id:`ExternalWorld:SeriousInjury:${seriousInjury.id}:${commonId}`,
      type:"ExternalWorldMoment",
      momentType:"world_serious_injury",
      issueKey:`external_world:serious_injury:${seriousInjury.id}:${commonId}`,
      category:"medical",
      ownerActorId:"doctor",
      priority:"important",
      title:`La lesion de ${firstName(seriousInjury.name)} tambien preocupa fuera`,
      summary:"No es solo un asunto medico. La baja cambia el ambiente alrededor del equipo.",
      subjectId:seriousInjury.id,
      subjectName:seriousInjury.name,
      action:{ screen:"medical", playerId:seriousInjury.id },
      actionLabel:"Revisar informe",
      expectedOutcome:"Entender la repercusion deportiva y publica de la baja.",
      ...base,
    },
    recentOwnTransfer && {
      id:`ExternalWorld:Transfer:${recentOwnTransfer.id ?? commonId}`,
      type:"ExternalWorldMoment",
      momentType:"world_transfer_reaction",
      issueKey:`external_world:transfer:${recentOwnTransfer.id ?? commonId}`,
      category:"market",
      ownerActorId:"sportingDirector",
      priority:"important",
      title:`El movimiento de ${recentOwnTransfer.player?.name ?? "mercado"} ya tiene eco`,
      summary:"El mercado no termina cuando se firma. Fuera ya se interpreta lo que significa para el proyecto.",
      subjectId:recentOwnTransfer.player?.id,
      subjectName:recentOwnTransfer.player?.name,
      action:{ screen:"transfers" },
      actionLabel:"Revisar mercado",
      expectedOutcome:"Medir la lectura externa del movimiento.",
      ...base,
    },
    canRumor && {
      id:`ExternalWorld:Rumor:${star.id}:${Math.floor(matchday / 5)}`,
      type:"ExternalWorldMoment",
      momentType:"world_transfer_rumor",
      issueKey:`external_world:rumor:${star.id}:${Math.floor(matchday / 5)}`,
      category:"market",
      ownerActorId:"sportingDirector",
      priority:"normal",
      title:`Empiezan los rumores sobre ${firstName(star.name)}`,
      summary:"No hay oferta formal, pero algunos clubes observan. El ruido exterior ya existe.",
      subjectId:star.id,
      subjectName:star.name,
      action:{ screen:"transfers", playerId:star.id },
      actionLabel:"Mantener vigilancia",
      expectedOutcome:"Decidir si cerrar filas o escuchar el mercado.",
      ...base,
    },
  ].filter(Boolean);

  return candidates[0] ?? null;
}

function lockerRoomLifeMoment(game, activeEvents = []) {
  if (!game) return null;
  const stamp = currentStamp(game);
  const matchday = stamp.matchday ?? 1;
  if (matchday <= 1 || matchday > 39) return null;
  if (activeEvents.some(event => event.priority === "critical")) return null;
  if (activeEvents.filter(event => event.priority === "important").length >= 3) return null;

  const squad = game.players ?? [];
  if (!squad.length) return null;
  const recent = recentUserFixtures(game);
  const lastResult = userFixtureResult(game, recent[0]);
  const leaders = [...squad].sort((a, b) => ((b.personality?.traits?.leadership ?? 50) + (b.overall ?? 70) * .2) - ((a.personality?.traits?.leadership ?? 50) + (a.overall ?? 70) * .2));
  const leader = leaders[0];
  const mentor = leaders.find(player => (player.age ?? 0) >= 30) ?? leader;
  const young = [...squad].filter(player => (player.age ?? 99) <= 21 || player.academyData).sort((a, b) => (b.potential ?? 0) - (a.potential ?? 0))[0];
  const substitute = [...squad].filter(player => ["Suplente", "Rotación", "Promesa"].includes(player.squadRole ?? "") && (player.morale ?? 70) >= 58 && !(player.injured || player.medical?.phase === "injured")).sort((a, b) => (b.professionalism ?? b.personality?.traits?.professionalism ?? 50) - (a.professionalism ?? a.personality?.traits?.professionalism ?? 50))[0];
  const recovered = squad.find(player => player.medical?.phase === "available" && (player.medical?.recoveryProgress ?? player.medical?.recovery ?? 0) >= 80);
  const newSigning = [...squad].find(player => Number(player.joinedMatchday ?? player.transferMatchday ?? 0) >= matchday - 4);
  const commonId = `${stamp.season}:${matchday}`;
  const phase = Math.abs((matchday + Number(stamp.season ?? 2025)) % 6);
  const base = { season:stamp.season, matchday, category:"training", priority:"normal", action:{ screen:"lockerRoom" }, actionLabel:"Escuchar vestuario" };
  const candidates = [
    mentor && young && mentor.id !== young.id && {
      id:`LockerLife:Mentor:${mentor.id}:${young.id}:${commonId}`,
      type:"LockerRoomLifeMoment",
      momentType:"locker_mentor_young",
      issueKey:`locker_life:mentor:${mentor.id}:${young.id}:${commonId}`,
      ownerActorId:"captain",
      title:`${mentor.name} esta ayudando a ${young.name}`,
      summary:"Un veterano se ha acercado a un joven durante la semana. No es una crisis; es vestuario creciendo.",
      subjectId:young.id,
      subjectName:young.name,
      mentorId:mentor.id,
      mentorName:mentor.name,
      expectedOutcome:"Reconocer la dinamica o dejar que el grupo la gestione.",
      ...base,
    },
    leader && lastResult?.lost && {
      id:`LockerLife:LeaderAfterLoss:${leader.id}:${commonId}`,
      type:"LockerRoomLifeMoment",
      momentType:"locker_leader_after_loss",
      issueKey:`locker_life:leader_loss:${leader.id}:${commonId}`,
      ownerActorId:"captain",
      title:`${leader.name} ha reunido al grupo`,
      summary:"Tras la derrota, uno de los lideres ha intentado proteger el ambiente antes de que se tuerza.",
      subjectId:leader.id,
      subjectName:leader.name,
      expectedOutcome:"Decidir si reforzar el mensaje del lider o dejar que el vestuario respire.",
      ...base,
      priority:"important",
    },
    leader && lastResult?.won && (game.players ?? []).filter(player => (player.morale ?? 70) >= 75).length >= Math.max(4, Math.floor(squad.length / 4)) && {
      id:`LockerLife:GoodMood:${leader.id}:${commonId}`,
      type:"LockerRoomLifeMoment",
      momentType:"locker_good_mood",
      issueKey:`locker_life:good_mood:${commonId}`,
      ownerActorId:"captain",
      title:"El grupo respira confianza",
      summary:"El vestuario ha celebrado la semana con naturalidad. Hay buen ambiente sin necesidad de forzarlo.",
      subjectId:leader.id,
      subjectName:leader.name,
      expectedOutcome:"Reconocer el buen momento sin relajar la exigencia.",
      ...base,
    },
    young && {
      id:`LockerLife:YoungNervous:${young.id}:${commonId}`,
      type:"LockerRoomLifeMoment",
      momentType:"locker_young_nervous",
      issueKey:`locker_life:young:${young.id}:${commonId}`,
      ownerActorId:"captain",
      title:`${young.name} vive una semana especial`,
      summary:"El joven esta impresionado por entrenar con el primer equipo. Quiere estar a la altura.",
      subjectId:young.id,
      subjectName:young.name,
      expectedOutcome:"Proteger al joven, acercarte a el o dejar que el grupo lo arrope.",
      ...base,
    },
    substitute && {
      id:`LockerLife:Substitute:${substitute.id}:${commonId}`,
      type:"LockerRoomLifeMoment",
      momentType:"locker_substitute_positive",
      issueKey:`locker_life:substitute:${substitute.id}:${commonId}`,
      ownerActorId:"captain",
      title:`${substitute.name} esta trabajando muy bien`,
      summary:"Un suplente esta aceptando su rol y aprieta sin romper el ambiente. Ese tipo de profesionalidad sostiene un grupo.",
      subjectId:substitute.id,
      subjectName:substitute.name,
      expectedOutcome:"Reconocer su actitud o guardar el mensaje para el momento adecuado.",
      ...base,
    },
    recovered && {
      id:`LockerLife:RecoveryMood:${recovered.id}:${commonId}`,
      type:"LockerRoomLifeMoment",
      momentType:"locker_recovery_mood",
      issueKey:`locker_life:recovery:${recovered.id}:${commonId}`,
      ...base,
      ownerActorId:"doctor",
      category:"medical",
      title:`${recovered.name} vuelve con otro animo`,
      summary:"La recuperacion tambien se nota en la cabeza. El jugador esta mas integrado y con ganas de sentirse futbolista otra vez.",
      subjectId:recovered.id,
      subjectName:recovered.name,
      action:{ screen:"medical", playerId:recovered.id },
      actionLabel:"Escuchar informe",
      expectedOutcome:"Acompanhar el regreso sin precipitarlo.",
    },
    newSigning && {
      id:`LockerLife:NewSigning:${newSigning.id}:${commonId}`,
      type:"LockerRoomLifeMoment",
      momentType:"locker_new_signing",
      issueKey:`locker_life:new_signing:${newSigning.id}:${commonId}`,
      ownerActorId:"captain",
      title:`${newSigning.name} empieza a integrarse`,
      summary:"Los nuevos tambien necesitan sitio en el vestuario. El grupo parece estar haciendole hueco.",
      subjectId:newSigning.id,
      subjectName:newSigning.name,
      expectedOutcome:"Acompanhar la integracion o dejar que los lideres hagan su trabajo.",
      ...base,
    },
  ].filter(Boolean);

  return candidates[phase] ?? pickByDay(game, candidates);
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

function renewalResponseKind(status) {
  if (status === "accepted") return "RenewalAccepted";
  if (status === "rejected") return "RenewalRejected";
  if (["salaryCounter", "yearsCounter", "roleCounter"].includes(status)) return "RenewalCounterOffer";
  return "RenewalOfferAnswered";
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
  if (category === "contracts" && playerId && String(item.id ?? "").includes("renewal-response")) {
    return `contract_renewal_response:${playerId}`;
  }
  if (category === "contracts" && playerId && (title.includes("renov") || title.includes("contrato") || title.includes("contract"))) {
    return `contract_renewal_pending:${playerId}`;
  }
  if (category === "medical" && playerId && (title.includes("riesgo") || title.includes("fatiga"))) return `injury_risk:${playerId}`;
  if (category === "medical" && playerId) return `injury:${playerId}`;
  if (category === "training" && playerId && (title.includes("riesgo") || title.includes("fisico") || title.includes("fisico"))) return `injury_risk:${playerId}`;
  if (category === "youth" && playerId) return `youth_high_potential:${playerId}`;
  if (category === "market" && item.action?.offerId) return `market_decision:${item.action.offerId}`;
  if (category === "staff" && String(item.id ?? "").startsWith("staff-")) return `staff_recommendation:${item.id}`;
  if (category === "match" && title.includes("alineaci")) return "lineup_preparation";
  return String(item.id ?? `${category || "attention"}:${title || item.type || "unknown"}`);
}

export function dedupeAttentionItems(items = [], game = null) {
  const grouped = new Map();
  const renewalResponseSubjects = new Set();
  items.forEach(item => {
    if (!item || isClosedStatus(item.status)) return;
    const key = getAttentionIssueKey(item);
    const centralState = game ? attentionState(game, `legacy-event:${key}`) : null;
    if (centralState && isClosedStatus(centralState.status)) return;
    if (key.startsWith("contract_renewal_response:")) renewalResponseSubjects.add(key.replace("contract_renewal_response:", ""));
  });
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
    if (key.startsWith("contract_renewal_pending:") && renewalResponseSubjects.has(key.replace("contract_renewal_pending:", ""))) return;
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
  const playersWithRenewalResponse = new Set();
  for (const offer of game.contracts?.renewals ?? []) {
    if (!renewalStatuses.has(offer.status)) continue;
    playersWithRenewalResponse.add(offer.playerId);
    const title = `${firstName(offer.playerName)} ha respondido a la oferta de renovacion`;
    pushEvent(events, {
      id:`RenewalOfferAnswered:${offer.id}:${offer.status}`,
      type:"RenewalOfferAnswered",
      responseType:renewalResponseKind(offer.status),
      issueKey:`contract_renewal_response:${offer.playerId}`,
      category:"contracts",
      ownerActorId:"sportingDirector",
      priority:["accepted", "rejected", "salaryCounter", "yearsCounter", "roleCounter"].includes(offer.status) ? "critical" : "important",
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
    if (!playersWithRenewalResponse.has(player.id) && Number(player.contractEnd ?? 9999) <= Number(game.season ?? 2025) + 1) {
      pushEvent(events, {
        id:`ContractExpiringSoon:${player.id}:${player.contractEnd ?? "unknown"}`,
        type:"ContractExpiringSoon",
        issueKey:`contract_renewal_pending:${player.id}`,
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

    const personality = getPlayerPersonality(player);
    const unrestLimit = personality.id === "conflictive" || personality.id === "ambitious" || personality.id === "selfish" ? 45 : personality.id === "professional" || personality.id === "dressingRoomModel" ? 32 : 38;
    if ((player.morale ?? 70) <= unrestLimit || (player.happiness ?? 70) <= unrestLimit) {
      pushEvent(events, {
        id:`PlayerUnhappy:${player.id}:${Math.floor(Math.min(player.morale ?? 70, player.happiness ?? 70) / 10)}`,
        type:"PlayerUnhappy",
        issueKey:`player_unhappy:${player.id}`,
        category:"training",
        ownerActorId:"captain",
        priority:Math.min(player.morale ?? 70, player.happiness ?? 70) <= 25 ? "critical" : "important",
        title:`${player.name} necesita una conversacion`,
        summary:`${personality.label}: ${personality.line} Conviene hablar antes de que el malestar crezca.`,
        subjectId:player.id,
        subjectName:player.name,
        personalityId:personality.id,
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

  for (const rec of buildStaffRecommendations(game).filter(item => item.priority !== "info").slice(0, 3)) {
    const member = getStaffMember(game, rec.roleId);
    pushEvent(events, {
      id:`StaffRecommendation:${rec.id}`,
      type:"StaffRecommendation",
      issueKey:`staff_recommendation:${rec.id}`,
      category:"staff",
      ownerActorId:rec.roleId === "medicalDirector" ? "doctor" : rec.roleId,
      priority:rec.priority,
      title:rec.title,
      summary:rec.quote,
      subjectId:rec.action?.playerId,
      subjectName:(game.players ?? []).find(player => player.id === rec.action?.playerId)?.name,
      staffRoleId:rec.roleId,
      staffName:member.name,
      staffTrust:member.trust,
      staffPersonality:member.personality,
      action:rec.action,
      actionLabel:rec.actionLabel,
      expectedOutcome:"Valorar el criterio del especialista y decidir si actuar.",
      ...stamp,
    });
  }

  const externalMoment = externalWorldMoment(game, events);
  if (externalMoment) pushEvent(events, externalMoment);
  const hasCritical = events.some(event => event.priority === "critical");
  const lockerMoment = externalMoment ? null : lockerRoomLifeMoment(game, events);
  if (lockerMoment) pushEvent(events, lockerMoment);
  const weeklyMoment = externalMoment || lockerMoment ? null : weeklyPreparationMoment(game, fixture, context, events);
  if (weeklyMoment) pushEvent(events, weeklyMoment);
  const shouldBreathe = !weeklyMoment && !hasCritical && (stamp.matchday ?? 1) > 1 && (stamp.matchday ?? 1) % 4 === 0;
  if (shouldBreathe) {
    const bestYouth = [...(game.youth?.players ?? [])].sort((a, b) => (b.potential ?? 0) - (a.potential ?? 0))[0];
    const recovered = (game.players ?? []).find(player => player.medical?.phase === "available" && (player.medical?.recoveryProgress ?? 0) >= 95);
    const goodMood = (game.players ?? []).filter(player => (player.morale ?? 70) >= 78).length >= Math.max(3, Math.floor((game.players?.length ?? 20) / 4));
    const moments = [
      goodMood && {
        id:`ClubLifeMoment:captain:${stamp.season}:${stamp.matchday}`,
        type:"ClubLifeMoment",
        momentType:"captain_gratitude",
        issueKey:`club_life_moment:captain:${stamp.season}:${stamp.matchday}`,
        category:"training",
        ownerActorId:"captain",
        priority:"important",
        title:"El capitan quiere comentarte algo",
        summary:"El grupo ha agradecido como estas llevando estas semanas. No es un problema; es vestuario respirando.",
        action:{ screen:"lockerRoom" },
        actionLabel:"Escuchar",
        expectedOutcome:"Escuchar al capitan y reforzar la relacion con el vestuario.",
        ...stamp,
      },
      bestYouth && {
        id:`ClubLifeMoment:academy:${bestYouth.id}:${stamp.season}:${stamp.matchday}`,
        type:"ClubLifeMoment",
        momentType:"academy_hope",
        issueKey:`club_life_moment:academy:${bestYouth.id}`,
        category:"youth",
        ownerActorId:"academyChief",
        priority:"important",
        title:`${bestYouth.name} ilusiona en la cantera`,
        summary:`El jefe de cantera cree que ${firstName(bestYouth.name)} tiene algo especial. No exige una decision urgente, pero conviene seguirlo de cerca.`,
        subjectId:bestYouth.id,
        subjectName:bestYouth.name,
        action:{ screen:"youth", playerId:bestYouth.id },
        actionLabel:"Escuchar informe",
        expectedOutcome:"Conocer mejor al canterano y decidir si merece seguimiento cercano.",
        ...stamp,
      },
      recovered && {
        id:`ClubLifeMoment:medical:${recovered.id}:${stamp.season}:${stamp.matchday}`,
        type:"ClubLifeMoment",
        momentType:"medical_good_news",
        issueKey:`club_life_moment:medical:${recovered.id}`,
        category:"medical",
        ownerActorId:"doctor",
        priority:"important",
        title:`Buenas noticias sobre ${recovered.name}`,
        summary:"El medico trae una nota positiva de recuperacion. Hoy no todo son alarmas.",
        subjectId:recovered.id,
        subjectName:recovered.name,
        action:{ screen:"medical", playerId:recovered.id },
        actionLabel:"Escuchar informe",
        expectedOutcome:"Recibir una buena noticia medica y valorar el regreso progresivo.",
        ...stamp,
      },
      (game.legacy?.confidence ?? 70) >= 72 && {
        id:`ClubLifeMoment:president:${stamp.season}:${stamp.matchday}`,
        type:"ClubLifeMoment",
        momentType:"president_praise",
        issueKey:`club_life_moment:president:${stamp.season}:${stamp.matchday}`,
        category:"board",
        ownerActorId:"president",
        priority:"important",
        title:"El presidente pasa por tu despacho",
        summary:"Quiere reconocer que el club transmite una sensacion de rumbo. Una conversacion breve, pero importante.",
        action:{ screen:"board" },
        actionLabel:"Recibir",
        expectedOutcome:"Reforzar la confianza institucional.",
        ...stamp,
      },
      {
        id:`ClubLifeMoment:assistant:${stamp.season}:${stamp.matchday}`,
        type:"ClubLifeMoment",
        momentType:"assistant_training_good",
        issueKey:`club_life_moment:assistant:${stamp.season}:${stamp.matchday}`,
        category:"training",
        ownerActorId:"assistantCoach",
        priority:"important",
        title:"El segundo entrenador viene animado",
        summary:"El entrenamiento ha dejado buenas sensaciones. No todo necesita una crisis para merecer una conversacion.",
        action:{ screen:"training" },
        actionLabel:"Escuchar",
        expectedOutcome:"Recibir informacion util del cuerpo tecnico.",
        ...stamp,
      },
    ].filter(Boolean);
    const moment = pickByDay(game, moments);
    if (moment) pushEvent(events, moment);
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
        responseType:event.responseType ?? null,
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
        expectedOutcome:event.expectedOutcome ?? null,
        momentType:event.momentType ?? null,
        recommendedFocus:event.recommendedFocus ?? null,
        recommendedLoad:event.recommendedLoad ?? null,
        mentorId:event.mentorId ?? null,
        mentorName:event.mentorName ?? null,
        status:saved.status ?? "new",
        firstSeenAt:saved.firstSeenAt ?? null,
        updatedAt:saved.updatedAt ?? null,
      };
      logEvent("Event converted to Issue", { event:event.type, responseType:event.responseType ?? null, issueKey:event.issueKey, attentionId:id });
      logEvent("Issue created", { issueKey:event.issueKey, ownerActorId:event.ownerActorId, subjectId:event.subjectId ?? null });
      return item;
    })
    .filter(item => !isClosedStatus(item.status));
}
