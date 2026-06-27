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
    recommendations: [],
    history: [{ season: "2025", text: `Se incorpora como ${role.title}.` }],
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
    attributes,
    specialties: member.specialties?.length ? member.specialties : Object.entries(attributes).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([key]) => role.labels[key] ?? key),
    recommendations: member.recommendations ?? [],
    history: member.history ?? [],
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
  const tired = [...players].sort((a, b) => ((b.accumulatedFatigue ?? b.medical?.accumulatedFatigue ?? 0) + (b.fatigue ?? 0) * .45) - ((a.accumulatedFatigue ?? a.medical?.accumulatedFatigue ?? 0) + (a.fatigue ?? 0) * .45))[0];
  const unhappy = players.find(player => (player.happiness ?? 70) < 42 || (player.managerTrust ?? 70) < 42);
  const expiring = players.find(player => Number(player.contractEnd ?? 9999) <= Number(ensured.season ?? 2025) + 1);
  const prospect = [...(ensured.youth?.players ?? [])].sort((a, b) => (b.potential ?? 0) - (a.potential ?? 0))[0];
  const activeMissions = ensured.scouting?.missions?.filter(item => item.status === "active").length ?? 0;

  if (tired && ((tired.accumulatedFatigue ?? tired.medical?.accumulatedFatigue ?? 0) >= 55 || (tired.fatigue ?? 0) >= 62)) {
    recommendations.push({
      id: `staff-medical-load:${tired.id}:${Math.floor(((tired.accumulatedFatigue ?? 0) + (tired.fatigue ?? 0)) / 10)}`,
      roleId: "medicalDirector",
      staffName: medical.name,
      icon: medical.icon,
      priority: (tired.accumulatedFatigue ?? 0) >= 75 ? "critical" : "important",
      title: `${medical.roleTitle}: riesgo físico en ${tired.name}`,
      quote: `Míster, ${tired.name} empieza a mostrar señales de sobrecarga. Recomiendo valorar descanso esta jornada.`,
      action: { screen: "medical", playerId: tired.id },
      actionLabel: "Abrir médico",
    });
  }
  if ((ensured.trainingPlan?.load === "high" || ensured.trainingPlan?.load === "veryHigh") && players.some(player => (player.fatigue ?? 0) > 55)) {
    recommendations.push({
      id: `staff-fitness-load:${ensured.season}:${ensured.matchday}:${ensured.trainingPlan?.load}`,
      roleId: "fitnessCoach",
      staffName: fitness.name,
      icon: fitness.icon,
      priority: ensured.trainingPlan?.load === "veryHigh" ? "critical" : "important",
      title: `${fitness.roleTitle}: carga semanal elevada`,
      quote: "La carga del equipo empieza a ser alta. Conviene reducir intensidad o introducir más recuperación.",
      action: { screen: "training" },
      actionLabel: "Ajustar entreno",
    });
  }
  if (unhappy) {
    recommendations.push({
      id: `staff-assistant-morale:${unhappy.id}:${Math.floor((unhappy.happiness ?? unhappy.managerTrust ?? 0) / 10)}`,
      roleId: "assistantCoach",
      staffName: assistant.name,
      icon: assistant.icon,
      priority: "important",
      title: `${assistant.roleTitle}: situación de vestuario`,
      quote: `Creo que deberíamos hablar con ${unhappy.name}. Su rol o sus minutos empiezan a pesar en el grupo.`,
      action: { screen: "lockerRoom", playerId: unhappy.id },
      actionLabel: "Abrir vestuario",
    });
  }
  if (expiring) {
    recommendations.push({
      id: `staff-sporting-contract:${expiring.id}:${expiring.contractEnd}`,
      roleId: "sportingDirector",
      staffName: sporting.name,
      icon: sporting.icon,
      priority: Number(expiring.contractEnd ?? 9999) <= Number(ensured.season ?? 2025) ? "critical" : "important",
      title: `${sporting.roleTitle}: renovación prioritaria`,
      quote: `Recomiendo revisar cuanto antes el contrato de ${expiring.name}. Estamos perdiendo margen negociador.`,
      action: { screen: "contracts", playerId: expiring.id },
      actionLabel: "Abrir contratos",
    });
  }
  if (!activeMissions && (ensured.matchday ?? 1) <= 30) {
    recommendations.push({
      id: `staff-scouting-idle:${ensured.season}:${ensured.matchday}`,
      roleId: "scoutingChief",
      staffName: scouting.name,
      icon: scouting.icon,
      priority: "info",
      title: `${scouting.roleTitle}: red de scouting disponible`,
      quote: prospect ? `Podemos comparar el mercado con la cantera. ${prospect.name} marca el nivel de potencial interno.` : "La red está disponible para iniciar una misión de seguimiento.",
      action: { screen: "scouting" },
      actionLabel: "Abrir scouting",
    });
  }
  return recommendations;
}

