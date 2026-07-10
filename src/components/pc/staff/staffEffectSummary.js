import {
  getAssistantMatchReadingShift,
  getAssistantSquadManagementMultiplier,
  getStaffMember,
  staffModifier,
} from "../../../staff/staffEngine.js";

// Única fuente de las fórmulas/escalas reales por rol — antes vivían duplicadas (con
// pequeñas discrepancias de redondeo) en PCStaffImpact.jsx, PCTrainingStaffImpact.jsx y
// PCAcademyStaffPanel.jsx. Cada escala aquí es la MISMA que usa el motor real:
// - medicalDirector.prevention/recovery: medicalEngine.js:82,156
// - fitnessCoach.fitness/loadManagement: trainingEngine.js:136-137
// - fitnessCoach.prevention/recovery(medical): medicalEngine.js:82,156
// - fitnessCoach.recovery(training): trainingEngine.js:138
// - assistantCoach.tactics: App.jsx (calcTeamStrength/generateSegmentEvents)
// - assistantCoach.matchReading/squadManagement: staffEngine.js helpers
// - sportingDirector.negotiation: contractEngine.js:31,92 / transferEngine.js:177
// - scoutingChief.reportQuality: scoutingEngine.js:90 (mismo clamp -4 que el motor real)
// - academyDirector.talentDevelopment(floor -8%)/academyVision: trainingEngine.js:156,
//   youthEngine.js:103
// analyst no tiene entrada: sus 4 atributos son puramente narrativos (ver StaffScreen.jsx).
//
// Cada efecto lleva un "context" porque las pantallas existentes muestran solo el
// subconjunto relevante a su propio dominio (Médico no quiere ver "Desarrollo en
// entrenamiento" de fitnessCoach, Entrenamientos no quiere ver su "Reduce riesgo de
// lesión"), mientras que la pantalla de Staff completa los muestra todos. El texto
// exacto de cada label lo decide cada consumidor (para no forzar cambios visuales en
// pantallas ya existentes) — aquí solo vive el número/dirección real.

const pct = value => Math.round(value * 100);
// Acepta número o string ya formateada (p.ej. toFixed) — el signo se decide por el
// número original, no por una comparación implícita sobre el string.
const signed = (value, raw = Number(value)) => (raw > 0 ? `+${value}` : `${value}`);
const signedPct = value => `${signed(pct(value))}%`;
// positive/negative son campos separados (no uno el inverso del otro) para que un valor
// exactamente en 0 no se pinte como "malo" — mismo comportamiento que ya tenían los tres
// componentes originales (solo coloreaban en rojo lo estrictamente negativo).
const direction = raw => ({ positive: raw > 0, negative: raw < 0 });

function medicalDirectorEffects(game) {
  const prevention = staffModifier(game, "medicalDirector", "prevention", .1);
  const recovery = staffModifier(game, "medicalDirector", "recovery", .12);
  const preventionPct = pct(prevention);
  return [
    { key: "prevention", context: "medical", formatted: preventionPct === 0 ? "0%" : preventionPct > 0 ? `-${preventionPct}%` : `+${Math.abs(preventionPct)}%`, ...direction(preventionPct) },
    { key: "recovery", context: "medical", formatted: signedPct(recovery), ...direction(recovery) },
  ];
}

function fitnessCoachEffects(game) {
  const fitness = staffModifier(game, "fitnessCoach", "fitness", .1);
  const loadManagement = staffModifier(game, "fitnessCoach", "loadManagement", .16);
  const prevention = staffModifier(game, "fitnessCoach", "prevention", .08);
  const preventionPct = pct(prevention);
  const recoveryMedical = staffModifier(game, "fitnessCoach", "recovery", .08);
  const recoveryTraining = staffModifier(game, "fitnessCoach", "recovery", .14);
  return [
    { key: "fitness", context: "training", formatted: signedPct(fitness), ...direction(fitness) },
    { key: "loadManagement", context: "training", formatted: signedPct(loadManagement), ...direction(loadManagement) },
    { key: "prevention", context: "medical", formatted: preventionPct === 0 ? "0%" : preventionPct > 0 ? `-${preventionPct}%` : `+${Math.abs(preventionPct)}%`, ...direction(preventionPct) },
    { key: "recovery", context: "medical", formatted: signedPct(recoveryMedical), ...direction(recoveryMedical) },
    { key: "recovery", context: "training", formatted: signedPct(recoveryTraining), ...direction(recoveryTraining) },
  ];
}

function assistantCoachEffects(game) {
  const tactics = staffModifier(game, "assistantCoach", "tactics", 2);
  const readingShift = getAssistantMatchReadingShift(game);
  const squadMultiplier = getAssistantSquadManagementMultiplier(game);
  const benchChangePct = Math.round((1 - squadMultiplier) * 100);
  return [
    { key: "tactics", context: "match", formatted: signed(tactics.toFixed(1)), ...direction(tactics) },
    { key: "matchReading", context: "match", formatted: readingShift === 0 ? "sin cambio" : `~${Math.abs(readingShift)} min ${readingShift > 0 ? "antes" : "después"}`, ...direction(readingShift) },
    { key: "squadManagement", context: "morale", formatted: benchChangePct === 0 ? "0%" : `${benchChangePct > 0 ? "-" : "+"}${Math.abs(benchChangePct)}%`, ...direction(benchChangePct) },
  ];
}

function sportingDirectorEffects(game) {
  const negotiation = staffModifier(game, "sportingDirector", "negotiation", .08);
  return [
    { key: "negotiation", context: "market", formatted: signedPct(negotiation), ...direction(negotiation) },
  ];
}

function scoutingChiefEffects(game) {
  // Mismo clamp que scoutingEngine.js:90 (chiefBonus = puntos añadidos a confidence 0-100).
  const bonus = Math.round(Math.max(-4, staffModifier(game, "scoutingChief", "reportQuality", 7)));
  return [
    { key: "reportQuality", context: "scouting", formatted: `${signed(bonus)} pts`, ...direction(bonus) },
  ];
}

function academyDirectorEffects(game) {
  const talentPct = pct(Math.max(-.08, staffModifier(game, "academyDirector", "talentDevelopment", .12)));
  const visionShift = staffModifier(game, "academyDirector", "academyVision", .02);
  return [
    { key: "talentDevelopment", context: "academy", formatted: `${signed(talentPct)}%`, ...direction(talentPct) },
    // academyVision desplaza umbrales de una escalera de probabilidad, no un porcentaje
    // directo — mostrar "+X%" sería una precisión que la mecánica no tiene, así que
    // "formatted" queda vacío y el consumidor muestra solo la etiqueta cualitativa.
    // Umbral .002 (no > 0 estricto) para no etiquetar como "mejora" un ruido de redondeo.
    { key: "academyVision", context: "academy", formatted: "", ...direction(Math.abs(visionShift) > .002 ? visionShift : 0) },
  ];
}

const EFFECT_BUILDERS = {
  medicalDirector: medicalDirectorEffects,
  fitnessCoach: fitnessCoachEffects,
  assistantCoach: assistantCoachEffects,
  sportingDirector: sportingDirectorEffects,
  scoutingChief: scoutingChiefEffects,
  academyDirector: academyDirectorEffects,
  analyst: () => [],
};

// game debe venir ya pasado por ensureStaffState (mismo contrato que el resto de
// lecturas de staff en la app — el caller ya lo hace antes de llamar aquí).
export function getStaffCardEffects(game, roleId) {
  const member = getStaffMember(game, roleId);
  const effects = member ? (EFFECT_BUILDERS[roleId]?.(game) ?? []) : [];
  return { member, effects };
}
