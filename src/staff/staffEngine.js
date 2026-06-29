const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));
const hash = value => {
  let result = 0;
  for (const char of String(value)) result = (Math.imul(result, 31) + char.charCodeAt(0)) | 0;
  return Math.abs(result);
};

export const STAFF_ROLES = {
  medicalDirector: {
    id: "medicalDirector",
    icon: "👨‍⚕️",
    title: "Director Médico",
    area: "Médico",
    attributes: ["diagnosis", "prevention", "recovery", "medicalManagement"],
    labels: { diagnosis: "Diagnóstico", prevention: "Prevención", recovery: "Recuperación", medicalManagement: "Gestión médica" },
  },
  fitnessCoach: {
    id: "fitnessCoach",
    icon: "🏋️",
    title: "Preparador Físico",
    area: "Rendimiento",
    attributes: ["fitness", "loadManagement", "prevention", "recovery"],
    labels: { fitness: "Preparación física", loadManagement: "Gestión de cargas", prevention: "Prevención", recovery: "Recuperación" },
  },
  assistantCoach: {
    id: "assistantCoach",
    icon: "⚽",
    title: "Segundo Entrenador",
    area: "Táctica",
    attributes: ["tactics", "matchReading", "squadManagement", "adaptation"],
    labels: { tactics: "Táctica", matchReading: "Lectura de partido", squadManagement: "Gestión de plantilla", adaptation: "Adaptación" },
  },
  sportingDirector: {
    id: "sportingDirector",
    icon: "📋",
    title: "Director Deportivo",
    area: "Mercado",
    attributes: ["negotiation", "finance", "marketVision", "squadPlanning"],
    labels: { negotiation: "Negociación", finance: "Gestión económica", marketVision: "Visión de mercado", squadPlanning: "Planificación deportiva" },
  },
  scoutingChief: {
    id: "scoutingChief",
    icon: "🔍",
    title: "Jefe de Scouting",
    area: "Scouting",
    attributes: ["talentDiscovery", "reportQuality", "coverage", "potentialAssessment"],
    labels: { talentDiscovery: "Descubrimiento", reportQuality: "Calidad de informes", coverage: "Cobertura", potentialAssessment: "Potencial" },
  },
  analyst: {
    id: "analyst",
    icon: "📊",
    title: "Analista",
    area: "Análisis",
    attributes: ["opponentAnalysis", "dataReading", "patternDetection", "setPieceAnalysis"],
    labels: { opponentAnalysis: "Análisis rival", dataReading: "Lectura de datos", patternDetection: "Detección de patrones", setPieceAnalysis: "Balón parado" },
  },
};

const STAFF_PERSONALITIES = {
  medicalDirector: { label:"Prudente", criterion:"prioriza la salud", style:"sereno y preventivo", initiative:72 },
  fitnessCoach: { label:"Metódico", criterion:"protege la carga semanal", style:"técnico y directo", initiative:76 },
  assistantCoach: { label:"Futbolístico", criterion:"piensa en rendimiento inmediato", style:"claro y de campo", initiative:70 },
  sportingDirector: { label:"Planificador", criterion:"mira contratos, valor y futuro", style:"empresarial y frío", initiative:68 },
  scoutingChief: { label:"Explorador", criterion:"busca oportunidades y talento", style:"observador y paciente", initiative:58 },
  analyst: { label:"Analítico", criterion:"detecta patrones del rival", style:"preciso y basado en datos", initiative:66 },
};

const FIRST_NAMES = ["Aitor", "Mikel", "Iñigo", "Xabier", "Unai", "Gorka", "Ander", "Jon", "Beñat", "Asier", "Luis", "Carlos", "Rubén", "Sergio", "Pablo"];
const LAST_NAMES = ["Urrutia", "Valdés", "Etxeberria", "Aguirre", "Santamaría", "Leiva", "Campos", "Arrieta", "Mendoza", "Salazar", "Alonso", "Giménez"];
const NATIONALITIES = ["España", "España", "España", "Francia", "Portugal", "Argentina"];

function staffSeed(teamId, roleId) {
  return hash(`${teamId}:${roleId}:legacy-staff`);
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
    personality: STAFF_PERSONALITIES[roleId] ?? { label:"Profesional", criterion:"trabaja en su área", style:"ordenado", initiative:60 },
    trust: clamp(58 + Math.round((overall - 70) * .25) + (seed % 9) - 4, 35, 88),
    initiative: STAFF_PERSONALITIES[roleId]?.initiative ?? 60,
    accuracy: clamp(55 + Math.round((overall - 70) * .35) + (seed % 11) - 5, 35, 92),
    delegation: { enabled:false, scope:[] },
    recommendations: [],
    history: [{ season: "2025", type:"arrival", outcome:"neutral", text: `Se incorpora como ${role.title}.` }],
  };
}

export function createClubStaff(team, prestige = 45) {
  const teamQuality = team?.avg ?? 74;
  return Object.keys(STAFF_ROLES).map(roleId => createStaffMember(team?.id ?? "club", roleId, teamQuality, prestige));
}

export function ensureStaffState(game, teams = []) {
  if (!game) return game;
  const byTeam = Object.fromEntries(teams.map(team => [team.id, team]));
  const current = game.staff ?? {};
  const clubStaff = current.members?.length ? current.members : createClubStaff(byTeam[game.teamId] ?? { id: game.teamId, avg: 74 }, game.legacy?.clubPrestige ?? 45);
  const roleIds = new Set(clubStaff.map(member => member.roleId));
  const missing = Object.keys(STAFF_ROLES).filter(roleId => !roleIds.has(roleId)).map(roleId => createStaffMember(game.teamId, roleId, byTeam[game.teamId]?.avg ?? 74, game.legacy?.clubPrestige ?? 45));
  const clubs = { ...(current.clubs ?? {}) };
  teams.forEach(team => {
    if (!clubs[team.id]?.members?.length) clubs[team.id] = { members: createClubStaff(team, game.legacy?.clubPrestige ?? 45) };
  });
  return {
    ...game,
    staff: {
      version: 1,
      members: [...clubStaff, ...missing].map(member => normalizeStaffMember(member)),
      clubs,
      recommendations: current.recommendations ?? [],
      history: current.history ?? [],
    },
  };
}

export function normalizeStaffMember(member) {
  const role = STAFF_ROLES[member.roleId] ?? STAFF_ROLES.assistantCoach;
  const attributes = { ...(member.attributes ?? {}) };
  role.attributes.forEach(key => { if (attributes[key] === undefined) attributes[key] = member.overall ?? 70; });
  const overall = clamp(member.overall ?? Object.values(attributes).reduce((sum, value) => sum + value, 0) / Object.values(attributes).length);
  return {
    ...member,
    roleTitle: member.roleTitle ?? role.title,
    icon: member.icon ?? role.icon,
    overall,
    personality: member.personality ?? STAFF_PERSONALITIES[member.roleId] ?? { label:"Profesional", criterion:"trabaja en su área", style:"ordenado", initiative:60 },
    trust: clamp(member.trust ?? 58 + Math.round((overall - 70) * .25), 0, 100),
    initiative: clamp(member.initiative ?? STAFF_PERSONALITIES[member.roleId]?.initiative ?? 60, 0, 100),
    accuracy: clamp(member.accuracy ?? 55 + Math.round((overall - 70) * .35), 0, 100),
    delegation: member.delegation ?? { enabled:false, scope:[] },
    attributes,
    specialties: member.specialties?.length ? member.specialties : Object.entries(attributes).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([key]) => role.labels[key] ?? key),
    recommendations: member.recommendations ?? [],
    history: member.history ?? [],
  };
}

function staffMemoryLine(member) {
  const recent = (member.history ?? []).filter(item => item.type === "recommendation").slice(0, 3);
  const hits = recent.filter(item => item.outcome === "hit").length;
  const misses = recent.filter(item => item.outcome === "miss").length;
  if (hits >= 2) return "Sus últimas recomendaciones han funcionado bien.";
  if (misses >= 2) return "Viene de varias recomendaciones discutibles; conviene contrastarlo.";
  return "No hay una tendencia clara todavía.";
}

function recommendationBase(member, extra = {}) {
  return {
    roleId: member.roleId,
    staffName: member.name,
    icon: member.icon,
    staffPersonality: member.personality,
    trust: member.trust,
    initiative: member.initiative,
    accuracy: member.accuracy,
    memoryLine: staffMemoryLine(member),
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
  if (value >= 88) return { label: "Élite", color: "#a78bfa" };
  if (value >= 78) return { label: "Muy bueno", color: "#22c55e" };
  if (value >= 65) return { label: "Correcto", color: "#c9a84c" };
  if (value >= 52) return { label: "Mejorable", color: "#f59e0b" };
  return { label: "Débil", color: "#ef4444" };
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
  const analyst = getStaffMember(ensured, "analyst");
  const tired = [...players].sort((a, b) => ((b.accumulatedFatigue ?? b.medical?.accumulatedFatigue ?? 0) + (b.fatigue ?? 0) * .45) - ((a.accumulatedFatigue ?? a.medical?.accumulatedFatigue ?? 0) + (a.fatigue ?? 0) * .45))[0];
  const unhappy = players.find(player => (player.happiness ?? 70) < 42 || (player.managerTrust ?? 70) < 42);
  const expiring = players.find(player => Number(player.contractEnd ?? 9999) <= Number(ensured.season ?? 2025) + 1);
  const inFormSub = [...players].filter(player => !player.injured && !player.suspended && !["Estrella","Titular"].includes(player.squadRole ?? "") && (player.morale ?? 70) >= 76 && (player.fatigue ?? 0) < 45).sort((a,b)=>(b.overall??0)-(a.overall??0))[0];
  const prospect = [...(ensured.youth?.players ?? [])].sort((a, b) => (b.potential ?? 0) - (a.potential ?? 0))[0];
  const activeMissions = ensured.scouting?.missions?.filter(item => item.status === "active").length ?? 0;
  const fixture = (ensured.fixtures ?? []).find(item => !item.played && (item.homeTeamId === ensured.teamId || item.awayTeamId === ensured.teamId));
  const opponentId = fixture ? (fixture.homeTeamId === ensured.teamId ? fixture.awayTeamId : fixture.homeTeamId) : null;

  if (tired && ((tired.accumulatedFatigue ?? tired.medical?.accumulatedFatigue ?? 0) >= 55 || (tired.fatigue ?? 0) >= 62)) {
    recommendations.push(recommendationBase(medical, {
      id: `staff-medical-load:${tired.id}:${Math.floor(((tired.accumulatedFatigue ?? 0) + (tired.fatigue ?? 0)) / 10)}`,
      priority: (tired.accumulatedFatigue ?? 0) >= 75 ? "critical" : "important",
      title: `${medical.roleTitle}: riesgo físico en ${tired.name}`,
      quote: `Míster, ${tired.name} empieza a mostrar señales de sobrecarga. Recomiendo valorar descanso esta jornada. ${staffMemoryLine(medical)}`,
      action: { screen: "medical", playerId: tired.id },
      actionLabel: "Abrir médico",
    }));
  }
  if ((ensured.trainingPlan?.load === "high" || ensured.trainingPlan?.load === "veryHigh") && players.some(player => (player.fatigue ?? 0) > 55)) {
    recommendations.push(recommendationBase(fitness, {
      id: `staff-fitness-load:${ensured.season}:${ensured.matchday}:${ensured.trainingPlan?.load}`,
      priority: ensured.trainingPlan?.load === "veryHigh" ? "critical" : "important",
      title: `${fitness.roleTitle}: carga semanal elevada`,
      quote: `La carga del equipo empieza a ser alta. Yo bajaría intensidad o metería más recuperación. ${staffMemoryLine(fitness)}`,
      action: { screen: "training" },
      actionLabel: "Ajustar entreno",
    }));
  }
  if (unhappy) {
    recommendations.push(recommendationBase(assistant, {
      id: `staff-assistant-morale:${unhappy.id}:${Math.floor((unhappy.happiness ?? unhappy.managerTrust ?? 0) / 10)}`,
      priority: "important",
      title: `${assistant.roleTitle}: situación de vestuario`,
      quote: `Creo que deberíamos hablar con ${unhappy.name}. Su rol o sus minutos empiezan a pesar en el grupo.`,
      action: { screen: "lockerRoom", playerId: unhappy.id },
      actionLabel: "Abrir vestuario",
    }));
  }
  if (inFormSub && (assistant.initiative ?? 60) >= 55) {
    recommendations.push(recommendationBase(assistant, {
      id: `staff-assistant-form:${inFormSub.id}:${ensured.season}:${Math.floor((ensured.matchday ?? 1) / 3)}`,
      priority: "important",
      title: `${assistant.roleTitle}: ${inFormSub.name} pide paso`,
      quote: `Míster, ${inFormSub.name} está entrenando bien y llega fresco. Creo que esta semana merece entrar en la conversación del once.`,
      action: { screen: "lineup", playerId: inFormSub.id },
      actionLabel: "Revisar once",
    }));
  }
  if (expiring) {
    recommendations.push(recommendationBase(sporting, {
      id: `staff-sporting-contract:${expiring.id}:${expiring.contractEnd}`,
      priority: Number(expiring.contractEnd ?? 9999) <= Number(ensured.season ?? 2025) ? "critical" : "important",
      title: `${sporting.roleTitle}: renovación prioritaria`,
      quote: `Recomiendo revisar cuanto antes el contrato de ${expiring.name}. Estamos perdiendo margen negociador.`,
      action: { screen: "contracts", playerId: expiring.id },
      actionLabel: "Abrir contratos",
    }));
  }
  if (fixture && opponentId && (analyst.initiative ?? 60) >= 55) {
    recommendations.push(recommendationBase(analyst, {
      id: `staff-analyst-rival:${opponentId}:${ensured.season}:${ensured.matchday}`,
      priority: "important",
      title: `${analyst.roleTitle}: informe del próximo rival`,
      quote: "He detectado patrones del rival que pueden condicionar el plan: conviene revisar el once, la presión y el balón parado antes del partido.",
      action: { screen: "lineup" },
      actionLabel: "Preparar partido",
    }));
  }
  if (!activeMissions && (ensured.matchday ?? 1) <= 30) {
    recommendations.push(recommendationBase(scouting, {
      id: `staff-scouting-idle:${ensured.season}:${ensured.matchday}`,
      priority: "info",
      title: `${scouting.roleTitle}: red de scouting disponible`,
      quote: prospect ? `Podemos comparar el mercado con la cantera. ${prospect.name} marca el nivel de potencial interno.` : "La red está disponible para iniciar una misión de seguimiento.",
      action: { screen: "scouting" },
      actionLabel: "Abrir scouting",
    }));
  }
  return recommendations;
}

export function recordStaffRecommendationOutcome(game, roleId, outcome = "neutral", text = "") {
  const ensured = ensureStaffState(game, []);
  return {
    ...ensured,
    staff: {
      ...ensured.staff,
      members: ensured.staff.members.map(member => {
        if (member.roleId !== roleId) return member;
        const trustDelta = outcome === "hit" ? 3 : outcome === "miss" ? -3 : 0;
        const accuracyDelta = outcome === "hit" ? 1 : outcome === "miss" ? -1 : 0;
        return normalizeStaffMember({
          ...member,
          trust: clamp((member.trust ?? 60) + trustDelta, 0, 100),
          accuracy: clamp((member.accuracy ?? 60) + accuracyDelta, 0, 100),
          history: [{ season:String(ensured.season ?? "2025"), matchday:ensured.matchday ?? 1, type:"recommendation", outcome, text }, ...(member.history ?? [])].slice(0, 12),
        });
      }),
    },
  };
}
