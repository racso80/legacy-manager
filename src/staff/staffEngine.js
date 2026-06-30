import { shouldShowLowPriorityStaff, staffRecommendationLimit } from "../balance/gameFeelEngine.js";
import { buildYouthDirectorRecommendations } from "../youth/youthEngine.js";

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const hash = value => {
  let result = 0;
  for (const char of String(value)) result = (Math.imul(result, 31) + char.charCodeAt(0)) | 0;
  return Math.abs(result);
};

const pickVariant = (seed, list) => list[seed % list.length];

export const STAFF_PERSONALITIES = {
  balanced: { id:"balanced", label:"Equilibrado", tone:"sereno", initiative:0, risk:0 },
  methodical: { id:"methodical", label:"Metódico", tone:"prudente", initiative:-4, risk:-8 },
  proactive: { id:"proactive", label:"Proactivo", tone:"directo", initiative:8, risk:4 },
  demanding: { id:"demanding", label:"Exigente", tone:"firme", initiative:5, risk:8 },
  analytical: { id:"analytical", label:"Analítico", tone:"preciso", initiative:4, risk:-2 },
};

export const STAFF_ROLES = {
  medicalDirector: {
    id: "medicalDirector",
    icon: "🧑‍⚕️",
    title: "Médico",
    area: "Médico",
    attributes: ["diagnosis", "prevention", "recovery", "medicalManagement"],
    labels: { diagnosis:"Diagnóstico", prevention:"Prevención", recovery:"Recuperación", medicalManagement:"Gestión médica" },
    defaultPersonality: "methodical",
  },
  fitnessCoach: {
    id: "fitnessCoach",
    icon: "🏋️",
    title: "Preparador físico",
    area: "Rendimiento",
    attributes: ["fitness", "loadManagement", "prevention", "recovery"],
    labels: { fitness:"Preparación física", loadManagement:"Gestión de cargas", prevention:"Prevención", recovery:"Recuperación" },
    defaultPersonality: "proactive",
  },
  assistantCoach: {
    id: "assistantCoach",
    icon: "⚽",
    title: "Segundo entrenador",
    area: "Táctica",
    attributes: ["tactics", "matchReading", "squadManagement", "adaptation"],
    labels: { tactics:"Táctica", matchReading:"Lectura de partido", squadManagement:"Gestión de plantilla", adaptation:"Adaptación" },
    defaultPersonality: "balanced",
  },
  sportingDirector: {
    id: "sportingDirector",
    icon: "📋",
    title: "Director deportivo",
    area: "Mercado",
    attributes: ["negotiation", "finance", "marketVision", "squadPlanning"],
    labels: { negotiation:"Negociación", finance:"Gestión económica", marketVision:"Visión de mercado", squadPlanning:"Planificación deportiva" },
    defaultPersonality: "analytical",
  },
  scoutingChief: {
    id: "scoutingChief",
    icon: "🔎",
    title: "Jefe de scouting",
    area: "Scouting",
    attributes: ["talentDiscovery", "reportQuality", "coverage", "potentialAssessment"],
    labels: { talentDiscovery:"Descubrimiento", reportQuality:"Calidad de informes", coverage:"Cobertura", potentialAssessment:"Potencial" },
    defaultPersonality: "proactive",
  },
  academyDirector: {
    id: "academyDirector",
    icon: "🌱",
    title: "Director de cantera",
    area: "Cantera",
    attributes: ["talentDevelopment", "promotionTiming", "loanPlanning", "academyVision"],
    labels: { talentDevelopment:"Desarrollo de talento", promotionTiming:"Momento de promoción", loanPlanning:"Plan de cesiones", academyVision:"Visión de cantera" },
    defaultPersonality: "methodical",
  },
  analyst: {
    id: "analyst",
    icon: "📊",
    title: "Analista",
    area: "Rival",
    attributes: ["opponentAnalysis", "dataReading", "setPieces", "trendDetection"],
    labels: { opponentAnalysis:"Análisis rival", dataReading:"Lectura de datos", setPieces:"Balón parado", trendDetection:"Detección de tendencias" },
    defaultPersonality: "analytical",
  },
};

const FIRST_NAMES = ["Aitor", "Mikel", "Iñigo", "Xabier", "Unai", "Gorka", "Ander", "Jon", "Beñat", "Asier", "Luis", "Carlos", "Rubén", "Sergio", "Pablo"];
const LAST_NAMES = ["Urrutia", "Valdés", "Etxeberria", "Aguirre", "Santamaría", "Leiva", "Campos", "Arrieta", "Mendoza", "Salazar", "Alonso", "Giménez"];
const NATIONALITIES = ["España", "España", "España", "Francia", "Portugal", "Argentina"];

function staffSeed(teamId, roleId) {
  return hash(`${teamId}:${roleId}:legacy-staff`);
}

function pickPersonality(roleId, seed) {
  const role = STAFF_ROLES[roleId];
  const ids = Object.keys(STAFF_PERSONALITIES);
  return role?.defaultPersonality ?? ids[seed % ids.length] ?? "balanced";
}

function createStaffMember(teamId, roleId, teamQuality = 72, prestige = 45) {
  const role = STAFF_ROLES[roleId];
  const seed = staffSeed(teamId, roleId);
  const base = clamp(teamQuality * .58 + prestige * .28 + 18 + (seed % 13) - 6, 45, 92);
  const attrs = {};
  role.attributes.forEach((key, index) => {
    attrs[key] = clamp(base + ((seed >> (index * 3)) % 17) - 8, 35, 97);
  });
  const overall = clamp(Object.values(attrs).reduce((sum, value) => sum + value, 0) / Object.values(attrs).length);
  const personalityId = pickPersonality(roleId, seed);
  const personality = STAFF_PERSONALITIES[personalityId] ?? STAFF_PERSONALITIES.balanced;
  return {
    id: `${teamId}_${roleId}`,
    roleId,
    roleTitle: role.title,
    icon: role.icon,
    name: `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(seed / 7) % LAST_NAMES.length]}`,
    age: 34 + (seed % 25),
    nationality: NATIONALITIES[Math.floor(seed / 11) % NATIONALITIES.length],
    overall,
    attributes: attrs,
    specialties: Object.entries(attrs).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([key]) => role.labels[key] ?? key),
    contractEnd: 2026 + (seed % 4),
    salary: Math.round((overall * 1.9 + prestige * .55 + (seed % 28)) / 5) * 5,
    avatar: role.icon,
    personalityId,
    personalityLabel: personality.label,
    confidence: clamp(58 + Math.floor(overall * .28) + (seed % 15) - 7),
    initiative: clamp(48 + personality.initiative + Math.floor(overall * .22) + (seed % 13) - 6),
    accuracyHistory: seedAccuracyHistory(seed, overall),
    delegation: { enabled:false, scope:[] },
    recommendations: [],
    history: [],
  };
}

export function createClubStaff(team, prestige = 45) {
  const teamQuality = team?.avg ?? 74;
  return Object.keys(STAFF_ROLES).map(roleId => createStaffMember(team?.id ?? "club", roleId, teamQuality, prestige));
}

export function normalizeStaffMember(member) {
  const role = STAFF_ROLES[member.roleId] ?? STAFF_ROLES.assistantCoach;
  const attributes = { ...(member.attributes ?? {}) };
  role.attributes.forEach(key => { if (attributes[key] === undefined) attributes[key] = member.overall ?? 70; });
  const overall = clamp(member.overall ?? Object.values(attributes).reduce((sum, value) => sum + value, 0) / Object.values(attributes).length);
  const personalityId = member.personalityId ?? role.defaultPersonality ?? "balanced";
  const personality = STAFF_PERSONALITIES[personalityId] ?? STAFF_PERSONALITIES.balanced;
  return {
    ...member,
    roleTitle: member.roleTitle ?? role.title,
    icon: member.icon ?? role.icon,
    avatar: member.avatar ?? member.icon ?? role.icon,
    overall,
    attributes,
    personalityId,
    personalityLabel: member.personalityLabel ?? personality.label,
    confidence: clamp(member.confidence ?? 60 + Math.floor(overall * .25)),
    initiative: clamp(member.initiative ?? 55 + personality.initiative),
    accuracyHistory: member.accuracyHistory?.length ? member.accuracyHistory : seedAccuracyHistory(hash(`${member.id ?? member.roleId ?? member.name}:history-seed`), overall),
    delegation: member.delegation ?? { enabled:false, scope:[] },
    specialties: member.specialties?.length ? member.specialties : Object.entries(attributes).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([key]) => role.labels[key] ?? key),
    recommendations: member.recommendations ?? [],
    history: member.history ?? [],
  };
}

export function ensureStaffState(game, teams = []) {
  if (!game) return game;
  const byTeam = Object.fromEntries(teams.map(team => [team.id, team]));
  const current = game.staff ?? {};
  const clubStaff = current.members?.length ? current.members : createClubStaff(byTeam[game.teamId] ?? { id:game.teamId, avg:74 }, game.legacy?.clubPrestige ?? 45);
  const roleIds = new Set(clubStaff.map(member => member.roleId));
  const missing = Object.keys(STAFF_ROLES).filter(roleId => !roleIds.has(roleId)).map(roleId => createStaffMember(game.teamId, roleId, byTeam[game.teamId]?.avg ?? 74, game.legacy?.clubPrestige ?? 45));
  const clubs = { ...(current.clubs ?? {}) };
  teams.forEach(team => {
    if (!clubs[team.id]?.members?.length) clubs[team.id] = { members:createClubStaff(team, game.legacy?.clubPrestige ?? 45) };
  });
  return {
    ...game,
    staff: {
      version: 2,
      members: [...clubStaff, ...missing].map(member => normalizeStaffMember(member)),
      clubs,
      recommendations: current.recommendations ?? [],
      history: current.history ?? [],
    },
  };
}

function recommendationBase(member, extra = {}) {
  return {
    roleId: member.roleId,
    staffName: member.name,
    icon: member.icon,
    staffConfidence: member.confidence,
    staffPersonality: member.personalityLabel,
    ...extra,
  };
}

export function getStaffMember(game, roleId) {
  const ensured = ensureStaffState(game, []);
  return ensured?.staff?.members?.find(member => member.roleId === roleId) ?? createStaffMember(game?.teamId ?? "club", roleId);
}

export function getStaffQuality(game, roleId, key = null) {
  const member = getStaffMember(game, roleId);
  if (!key) return member.overall ?? 70;
  return member.attributes?.[key] ?? member.overall ?? 70;
}

export function staffModifier(game, roleId, key = null, scale = .18) {
  return (getStaffQuality(game, roleId, key) - 70) / 30 * scale;
}

export function getStaffLevel(value = 70) {
  if (value >= 88) return { label:"Élite", color:"#a78bfa" };
  if (value >= 78) return { label:"Muy bueno", color:"#22c55e" };
  if (value >= 65) return { label:"Correcto", color:"#c9a84c" };
  if (value >= 52) return { label:"Mejorable", color:"#f59e0b" };
  return { label:"Débil", color:"#ef4444" };
}

export function getConfidenceTier(value = 65) {
  if (value >= 80) return { label:"Seguro", color:"#22c55e" };
  if (value >= 60) return { label:"Estable", color:"#c9a84c" };
  return { label:"Dubitativo", color:"#f59e0b" };
}

export function getInitiativeTier(value = 60) {
  if (value >= 80) return { label:"Muy proactivo", color:"#22c55e" };
  if (value >= 60) return { label:"Proactivo", color:"#c9a84c" };
  return { label:"Reactivo", color:"#f59e0b" };
}

export function staffMemoryLine(member, fallback = "") {
  const last = member?.history?.[0];
  if (last?.summary) return `Hace poco comentaste: "${last.summary}"`;
  const recent = (member?.accuracyHistory ?? []).slice(0, 5);
  if (recent.length >= 3) {
    const ratio = recent.filter(item => item.worked).length / recent.length;
    if (ratio >= .6) return "Mis últimas recomendaciones en esta línea han funcionado bien.";
    if (ratio <= .4) return "He fallado en situaciones parecidas últimamente, lo digo con honestidad.";
    return "Voy ajustando mis recomendaciones con lo que ha funcionado estas semanas.";
  }
  return fallback;
}

function seedAccuracyHistory(seed, overall = 70) {
  return Array.from({ length: 3 }, (_, index) => ({
    recommendationId: `seed-${index}`,
    worked: ((seed >> (index * 5)) % 100) < overall,
    date: Date.now() - (index + 1) * 7 * 24 * 3600 * 1000,
  }));
}

function withMemory(quote, member) {
  const memory = staffMemoryLine(member);
  return memory ? `${quote} ${memory}` : quote;
}

export function recordStaffRecommendationOutcome(game, recommendationId, worked = true, summary = "") {
  if (!game?.staff?.members?.length) return game;
  return {
    ...game,
    staff: {
      ...game.staff,
      members: game.staff.members.map(member => ({
        ...member,
        confidence: clamp((member.confidence ?? 65) + (worked ? 2 : -3)),
        accuracyHistory: [...(member.accuracyHistory ?? []), { recommendationId, worked, date:Date.now() }].slice(-12),
        history: summary ? [{ recommendationId, worked, summary, date:Date.now() }, ...(member.history ?? [])].slice(0, 10) : member.history,
      })),
    },
  };
}

function toneOf(member) {
  return STAFF_PERSONALITIES[member?.personalityId]?.tone ?? "sereno";
}

function medicalFatigueQuote(member, name, seed) {
  const pools = {
    sereno: [
      `Míster, no hay alarma, pero ${name} empieza a acumular carga. Yo valoraría darle descanso esta jornada.`,
      `Con calma, pero sin demorarlo: ${name} está acumulando fatiga y convendría descansarlo esta jornada.`,
    ],
    directo: [
      `${name} está sobrecargado. Hay que quitarle minutos esta jornada, sin más vueltas.`,
      `Claro y directo: descanso para ${name} esta jornada. No hay otra.`,
    ],
    prudente: [
      `Prefiero pecar de cauto: ${name} muestra señales de sobrecarga y convendría no forzar esta jornada.`,
      `No quiero alarmar, pero por precaución recomendaría descansar a ${name} esta jornada.`,
    ],
    firme: [
      `Tengo que ser claro: ${name} necesita descanso esta jornada. No deberíamos arriesgar.`,
      `Esto no es negociable: ${name} descansa esta jornada.`,
    ],
    preciso: [
      `Los datos de carga de ${name} han subido de forma notable. Recomiendo descanso esta jornada.`,
      `La curva de fatiga de ${name} supera el umbral seguro. Recomiendo rotación esta jornada.`,
    ],
  };
  return pickVariant(seed, pools[toneOf(member)] ?? pools.sereno);
}

function fitnessLoadQuote(member, seed) {
  const pools = {
    sereno: [
      "La carga general va subiendo poco a poco. Convendría bajar intensidad o sumar algo de recuperación.",
      "Sin agobios, pero la carga de la semana pide algo de cuidado: menos intensidad o más recuperación.",
    ],
    directo: [
      "La carga está alta. Bajamos intensidad esta semana o metemos más recuperación, sin debate.",
      "Esta semana hay que cortar: menos intensidad o más recuperación, ya.",
    ],
    prudente: [
      "No quiero adelantarme, pero la carga semanal me preocupa un poco. Mejor bajar intensidad por precaución.",
      "Por si acaso, propondría bajar intensidad esta semana antes de que la carga se note de verdad.",
    ],
    firme: [
      "La carga del equipo es alta y hay que actuar ya: menos intensidad o más recuperación esta semana.",
      "No hay margen para esperar: bajamos intensidad esta semana.",
    ],
    preciso: [
      "Los números de carga semanal superan el umbral habitual. Recomiendo reducir intensidad o aumentar recuperación.",
      "La carga acumulada del grupo está por encima de la media de las últimas semanas. Recomiendo ajustar el plan.",
    ],
  };
  return pickVariant(seed, pools[toneOf(member)] ?? pools.sereno);
}

function sportingRenewalQuote(member, name, seed) {
  const pools = {
    sereno: [
      `Conviene mirar con calma el contrato de ${name} pronto. Cuanto más esperemos, menos margen tendremos.`,
      `Sin prisas, pero sería buen momento para abrir la renovación de ${name}.`,
    ],
    directo: [
      `Hay que sentarse con ${name} ya. Cada semana que pasa perdemos margen de negociación.`,
      `Vamos a resolver lo de ${name} cuanto antes. No tiene sentido esperar más.`,
    ],
    prudente: [
      `Sin querer meter presión, creo que deberíamos revisar el contrato de ${name} antes de que se complique.`,
      `Lo digo con cautela: convendría adelantarnos con el contrato de ${name} antes de que pierda valor negociador.`,
    ],
    firme: [
      `Esto no puede esperar: hay que resolver el contrato de ${name} cuanto antes.`,
      `Tengo que insistir: la renovación de ${name} es prioritaria ahora mismo.`,
    ],
    preciso: [
      `El contrato de ${name} vence pronto y el margen negociador se reduce cada jornada. Recomiendo actuar ya.`,
      `Los plazos del contrato de ${name} entran en zona de riesgo. Recomiendo abrir la negociación esta semana.`,
    ],
  };
  return pickVariant(seed, pools[toneOf(member)] ?? pools.sereno);
}

function scoutingProspectQuote(member, name, seed) {
  const pools = {
    sereno: [
      `Sin prisa, pero merece la pena comparar el mercado con la cantera. ${name} marca un buen nivel de potencial interno.`,
      `Con calma, conviene tener presente a ${name}: marca el nivel de potencial que tenemos en casa.`,
    ],
    directo: [
      `Antes de mirar fuera, fíjense en ${name}. Marca el nivel de potencial que tenemos en casa.`,
      `${name} ya está ahí. Antes de gastar en el mercado, hay que valorarlo en serio.`,
    ],
    prudente: [
      `No quiero presionar, pero ${name} ya marca un nivel de potencial interno a tener en cuenta antes de salir al mercado.`,
      `Lo digo con cautela: convendría valorar a ${name} antes de cerrar cualquier operación de mercado.`,
    ],
    firme: [
      `Hay que mirar primero dentro: ${name} marca el nivel de potencial interno y merece una oportunidad real.`,
      `Insisto: ${name} merece prioridad sobre cualquier opción de mercado ahora mismo.`,
    ],
    preciso: [
      `${name} lidera el potencial de la cantera ahora mismo. Útil como referencia antes de buscar en el mercado.`,
      `Los informes sitúan a ${name} por encima del resto de la cantera. Dato a tener en cuenta antes de fichar fuera.`,
    ],
  };
  return pickVariant(seed, pools[toneOf(member)] ?? pools.sereno);
}

function scoutingIdleQuote(seed) {
  return pickVariant(seed, [
    "La red está disponible para iniciar una misión de seguimiento.",
    "No hay ninguna misión activa ahora mismo. Cuando quieras, lanzamos una nueva.",
  ]);
}

function analystRivalQuote(member, seed) {
  const pools = {
    sereno: [
      "He estado revisando con calma al rival y hay una tendencia clara. Conviene mirarla antes de cerrar el once.",
      "Con tranquilidad, he detectado un patrón del rival que merece la pena valorar antes del partido.",
    ],
    directo: [
      "El rival tiene un patrón claro. Hay que aprovecharlo antes de cerrar el once, sin perder tiempo.",
      "Lo digo claro: el rival tiene un punto débil evidente. Hay que explotarlo en el once.",
    ],
    prudente: [
      "Sin sacar conclusiones precipitadas, el rival muestra una tendencia que conviene revisar antes de cerrar el once.",
      "No quiero adelantar demasiado, pero el patrón del rival merece una revisión antes del partido.",
    ],
    firme: [
      "Tenemos que actuar sobre esto: el rival tiene un patrón claro y hay que explotarlo en el once.",
      "Es una oportunidad clara: hay que construir el plan de partido sobre el patrón del rival.",
    ],
    preciso: [
      "Los datos del rival muestran una tendencia repetida en las últimas jornadas. Recomiendo revisarla antes de cerrar el once.",
      "El análisis estadístico del rival apunta a un patrón consistente. Recomiendo incorporarlo al plan de partido.",
    ],
  };
  return pickVariant(seed, pools[toneOf(member)] ?? pools.sereno);
}

export function buildStaffRecommendations(game) {
  const ensured = ensureStaffState(game, []);
  const players = ensured.players ?? [];
  const recommendations = [];
  const medical = getStaffMember(ensured, "medicalDirector");
  const fitness = getStaffMember(ensured, "fitnessCoach");
  const assistant = getStaffMember(ensured, "assistantCoach");
  const sporting = getStaffMember(ensured, "sportingDirector");
  const scouting = getStaffMember(ensured, "scoutingChief");
  const academy = getStaffMember(ensured, "academyDirector");
  const analyst = getStaffMember(ensured, "analyst");

  const tired = [...players].sort((a, b) => ((b.accumulatedFatigue ?? b.medical?.accumulatedFatigue ?? 0) + (b.fatigue ?? 0) * .45) - ((a.accumulatedFatigue ?? a.medical?.accumulatedFatigue ?? 0) + (a.fatigue ?? 0) * .45))[0];
  const unhappy = players.find(player => (player.happiness ?? 70) < 42 || (player.managerTrust ?? 70) < 42);
  const expiring = players.find(player => Number(player.contractEnd ?? 9999) <= Number(ensured.season ?? 2025) + 1);
  const prospect = [...(ensured.youth?.players ?? [])].sort((a, b) => (b.potential ?? 0) - (a.potential ?? 0))[0];
  const activeMissions = ensured.scouting?.missions?.filter(item => item.status === "active").length ?? 0;
  const inFormSub = [...players].filter(player => !(ensured._lineup ?? []).includes(player.id)).sort((a, b) => (b.form ?? b.rating ?? 70) - (a.form ?? a.rating ?? 70))[0];
  const fixture = (ensured.fixtures ?? []).find(item => !item.played && (item.homeTeamId === ensured.teamId || item.awayTeamId === ensured.teamId));

  if (tired && ((tired.accumulatedFatigue ?? tired.medical?.accumulatedFatigue ?? 0) >= 55 || (tired.fatigue ?? 0) >= 62)) {
    const id = `staff-medical-load:${tired.id}:${Math.floor(((tired.accumulatedFatigue ?? 0) + (tired.fatigue ?? 0)) / 10)}`;
    recommendations.push(recommendationBase(medical, {
      id,
      priority:(tired.accumulatedFatigue ?? 0) >= 75 ? "critical" : "important",
      title:`${medical.roleTitle}: riesgo físico en ${tired.name}`,
      quote:withMemory(medicalFatigueQuote(medical, tired.name, hash(id)), medical),
      action:{ screen:"medical", playerId:tired.id },
      actionLabel:"Abrir médico",
    }));
  }

  if ((ensured.trainingPlan?.load === "high" || ensured.trainingPlan?.load === "veryHigh") && players.some(player => (player.fatigue ?? 0) > 55)) {
    const id = `staff-fitness-load:${ensured.season}:${ensured.matchday}:${ensured.trainingPlan?.load}`;
    recommendations.push(recommendationBase(fitness, {
      id,
      priority:ensured.trainingPlan?.load === "veryHigh" ? "critical" : "important",
      title:`${fitness.roleTitle}: carga semanal elevada`,
      quote:withMemory(fitnessLoadQuote(fitness, hash(id)), fitness),
      action:{ screen:"training" },
      actionLabel:"Ajustar entreno",
    }));
  }

  if (unhappy) {
    const id = `staff-assistant-morale:${unhappy.id}:${Math.floor((unhappy.happiness ?? unhappy.managerTrust ?? 0) / 10)}`;
    recommendations.push(recommendationBase(assistant, {
      id,
      priority:"important",
      title:`${assistant.roleTitle}: situación de vestuario`,
      quote:withMemory(`Creo que deberíamos hablar con ${unhappy.name}. Su rol o sus minutos empiezan a pesar en el grupo.`, assistant),
      action:{ screen:"lockerRoom", playerId:unhappy.id },
      actionLabel:"Abrir vestuario",
    }));
  }

  if (inFormSub && (inFormSub.form ?? inFormSub.rating ?? 70) >= 78) {
    recommendations.push(recommendationBase(assistant, {
      id:`staff-assistant-form:${inFormSub.id}:${ensured.matchday}`,
      priority:"normal",
      title:`${assistant.roleTitle}: un suplente pide paso`,
      quote:withMemory(`${inFormSub.name} está entrenando muy bien. No lo impondría, pero merece estar en la conversación del once.`, assistant),
      action:{ screen:"lineup", playerId:inFormSub.id },
      actionLabel:"Revisar once",
    }));
  }

  if (expiring) {
    const id = `staff-sporting-contract:${expiring.id}:${expiring.contractEnd}`;
    recommendations.push(recommendationBase(sporting, {
      id,
      priority:Number(expiring.contractEnd ?? 9999) <= Number(ensured.season ?? 2025) ? "critical" : "important",
      title:`${sporting.roleTitle}: renovación prioritaria`,
      quote:withMemory(sportingRenewalQuote(sporting, expiring.name, hash(id)), sporting),
      action:{ screen:"contracts", playerId:expiring.id },
      actionLabel:"Abrir contratos",
    }));
  }

  if (!activeMissions && (ensured.matchday ?? 1) <= 30) {
    const id = `staff-scouting-idle:${ensured.season}:${ensured.matchday}`;
    recommendations.push(recommendationBase(scouting, {
      id,
      priority:"info",
      title:`${scouting.roleTitle}: red de scouting disponible`,
      quote:withMemory(prospect ? scoutingProspectQuote(scouting, prospect.name, hash(id)) : scoutingIdleQuote(hash(id)), scouting),
      action:{ screen:"scouting" },
      actionLabel:"Abrir scouting",
    }));
  }

  if (fixture && (ensured.matchday ?? 1) % 3 === 0) {
    const id = `staff-analyst-rival:${ensured.season}:${ensured.matchday}:${fixture.id}`;
    recommendations.push(recommendationBase(analyst, {
      id,
      priority:"normal",
      title:`${analyst.roleTitle}: patrón del rival`,
      quote:withMemory(analystRivalQuote(analyst, hash(id)), analyst),
      action:{ screen:"lineup" },
      actionLabel:"Ver informe",
    }));
  }

  buildYouthDirectorRecommendations(ensured).forEach(item => {
    recommendations.push(recommendationBase(academy, {
      id:`staff-academy:${item.id}`,
      priority:item.priority,
      title:`${academy.roleTitle}: ${item.title}`,
      quote:withMemory(item.summary, academy),
      action:{ screen:"youth", playerId:item.player.id },
      actionLabel:"Ver cantera",
    }));
  });

  const sorted = recommendations.sort((a, b) => {
    const rank = { critical:4, important:3, normal:2, info:1 };
    return (rank[b.priority] ?? 0) - (rank[a.priority] ?? 0);
  });
  const limit = staffRecommendationLimit(ensured);
  const meaningful = sorted.filter(item => item.priority !== "info");
  const lowPriority = sorted.filter(item => item.priority === "info");
  const selected = [...meaningful];

  if (selected.length < limit && shouldShowLowPriorityStaff(ensured, selected.length)) {
    selected.push(...lowPriority);
  }

  return selected.slice(0, limit);
}
