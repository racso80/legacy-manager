export const DEFAULT_TACTICS = {
  mentalidad: "equilibrada",  // defensiva | equilibrada | ofensiva
  presion:    "media",        // baja | media | alta
  ritmo:      "normal",       // lento | normal | rapido
  estilo:     "posesion",     // directo | posesion | bandas | contraataque
  riesgo:     "normal",       // conservador | normal | agresivo
};

export const TACTICS_FIELD_OPTIONS = {
  mentalidad: ["defensiva", "equilibrada", "ofensiva"],
  presion:    ["baja", "media", "alta"],
  ritmo:      ["lento", "normal", "rapido"],
  estilo:     ["directo", "posesion", "bandas", "contraataque"],
  riesgo:     ["conservador", "normal", "agresivo"],
};

export const TACTICS_FIELD_LABELS = {
  mentalidad: { defensiva:"Defensiva", equilibrada:"Equilibrada", ofensiva:"Ofensiva" },
  presion:    { baja:"Presión baja", media:"Presión media", alta:"Presión alta" },
  ritmo:      { lento:"Ritmo lento", normal:"Ritmo normal", rapido:"Ritmo rápido" },
  estilo:     { directo:"Directo", posesion:"Posesión", bandas:"Bandas", contraataque:"Contra" },
  riesgo:     { conservador:"Conservador", normal:"Riesgo normal", agresivo:"Agresivo" },
};

export const TACTICS_PRESET_ICONS = ["⚙️","🛡️","⚔️","🔥","🧊","🎯","🔄"];

export const TACTICS_FIELD_DESCRIPTIONS = {
  mentalidad: {
    defensiva:   "−3 ataque · +4 defensa · Menos ocasiones generadas",
    equilibrada: "Balance neutro entre ataque y defensa",
    ofensiva:    "+4 ataque · −3 defensa · Más ocasiones, más espacios atrás",
  },
  presion: {
    baja:  "Menos cansancio · +2 defensa · Menor riesgo de amarillas",
    media: "Balance neutro · Presión moderada en todo el campo",
    alta:  "+2 ataque · +3 cansancio · Más amarillas · Más recuperaciones",
  },
  ritmo: {
    lento:  "−1 cansancio · Más control · Menos ocasiones por tramo",
    normal: "Ritmo equilibrado en el partido",
    rapido: "+1.5 cansancio · Más transiciones · Más ocasiones",
  },
  estilo: {
    directo:      "Balones largos · Mejor conversión de gol · Menos toque",
    posesion:     "+1 defensa · Más toque · Desgaste rival",
    bandas:       "+2 ataque · Más centros · Ideal con extremos rápidos",
    contraataque: "+3 defensa · Alta conversión · Ideal siendo inferior",
  },
  riesgo: {
    conservador: "−2 ataque · +3 defensa · Gestión segura del resultado",
    normal:      "Riesgo equilibrado según el contexto",
    agresivo:    "+3 ataque · −2 defensa · Más amarillas · A por el partido",
  },
};

// Migración: partidas guardadas sin _tactics (o con un valor corrupto en algún
// campo) caen de vuelta a DEFAULT_TACTICS campo a campo, igual que
// normalizeTrainingPlan hace con el plan de entrenamiento semanal.
export function normalizeTactics(tactics) {
  const result = { ...DEFAULT_TACTICS };
  Object.keys(TACTICS_FIELD_OPTIONS).forEach(field => {
    if (TACTICS_FIELD_OPTIONS[field].includes(tactics?.[field])) result[field] = tactics[field];
  });
  return result;
}

// Modificadores tácticos sobre la fuerza de ataque/defensa y cansancio
export function tacticModifiers(tactics) {
  const m = { atkBonus: 0, defBonus: 0, fatigueExtra: 0, goalConvRate: 0, chancesRate: 0, yellowRisk: 0 };

  // Mentalidad
  if (tactics.mentalidad === "ofensiva")   { m.atkBonus += 4; m.defBonus -= 3; m.chancesRate += 0.06; }
  if (tactics.mentalidad === "defensiva")  { m.atkBonus -= 3; m.defBonus += 4; m.chancesRate -= 0.04; }

  // Presión
  if (tactics.presion === "alta")  { m.atkBonus += 2; m.fatigueExtra += 4; m.yellowRisk += 0.05; m.chancesRate += 0.03; }
  if (tactics.presion === "baja")  { m.defBonus += 2; m.fatigueExtra -= 2; }

  // Ritmo
  if (tactics.ritmo === "rapido") { m.chancesRate += 0.04; m.fatigueExtra += 3; }
  if (tactics.ritmo === "lento")  { m.chancesRate -= 0.03; m.fatigueExtra -= 2; m.defBonus += 1; }

  // Estilo
  if (tactics.estilo === "directo")       { m.goalConvRate += 0.06; m.chancesRate -= 0.02; }
  if (tactics.estilo === "posesion")      { m.defBonus += 1; m.chancesRate += 0.02; }
  if (tactics.estilo === "bandas")        { m.atkBonus += 2; m.chancesRate += 0.03; }
  if (tactics.estilo === "contraataque")  { m.atkBonus -= 1; m.defBonus += 3; m.goalConvRate += 0.08; }

  // Riesgo
  if (tactics.riesgo === "agresivo")    { m.atkBonus += 3; m.defBonus -= 2; m.yellowRisk += 0.04; }
  if (tactics.riesgo === "conservador") { m.atkBonus -= 2; m.defBonus += 3; }

  return m;
}
