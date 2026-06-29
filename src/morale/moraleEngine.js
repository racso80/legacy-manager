const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));
const PLAYER_PERSONALITIES_ENABLED = true;

const TRAIT_KEYS = ["professionalism","ambition","leadership","loyalty","patience","ego","competitiveness","mediaPressure","adaptability","character"];
export const PLAYER_PERSONALITY_PROFILES = {
  leader: { id:"leader", label:"Líder", tone:"protector", frequency:1.08, minutesSensitivity:.88, trainingResponse:1.05, negotiation:"equilibrada", line:"Míster, si el grupo me necesita, estaré ahí." },
  professional: { id:"professional", label:"Profesional", tone:"sereno", frequency:.82, minutesSensitivity:.78, trainingResponse:1.12, negotiation:"estable", line:"Seguiré trabajando. Lo importante es estar preparado." },
  ambitious: { id:"ambitious", label:"Ambicioso", tone:"directo", frequency:1.22, minutesSensitivity:1.28, trainingResponse:1.03, negotiation:"exigente", line:"Quiero sentir que el club apuesta de verdad por mí." },
  reserved: { id:"reserved", label:"Reservado", tone:"prudente", frequency:.72, minutesSensitivity:.86, trainingResponse:1, negotiation:"discreto", line:"No quería hacer ruido, pero necesitaba hablarlo." },
  competitive: { id:"competitive", label:"Competitivo", tone:"intenso", frequency:1.1, minutesSensitivity:1.12, trainingResponse:1.08, negotiation:"reto_deportivo", line:"Deme un reto y voy a responder." },
  veteran: { id:"veteran", label:"Veterano", tone:"calmado", frequency:.9, minutesSensitivity:.72, trainingResponse:.92, negotiation:"estabilidad", line:"A estas alturas valoro claridad y respeto." },
  insecureYoung: { id:"insecureYoung", label:"Joven inseguro", tone:"dubitativo", frequency:1.05, minutesSensitivity:1.05, trainingResponse:1.18, negotiation:"proteccion", line:"Solo quiero saber si voy por el buen camino." },
  selfish: { id:"selfish", label:"Egoísta", tone:"individualista", frequency:1.18, minutesSensitivity:1.35, trainingResponse:.96, negotiation:"estatus", line:"Necesito sentirme importante. Si no, esto se complica." },
  hardWorker: { id:"hardWorker", label:"Trabajador", tone:"humilde", frequency:.78, minutesSensitivity:.82, trainingResponse:1.18, negotiation:"meritocratica", line:"Voy a apretar cada día. Solo pido una oportunidad justa." },
  conflictive: { id:"conflictive", label:"Conflictivo", tone:"tenso", frequency:1.42, minutesSensitivity:1.48, trainingResponse:.86, negotiation:"dura", line:"No entiendo esta decisión. Y prefiero decirlo claro." },
  dressingRoomModel: { id:"dressingRoomModel", label:"Modelo de vestuario", tone:"colectivo", frequency:.86, minutesSensitivity:.72, trainingResponse:1.08, negotiation:"club", line:"El grupo está por encima de todos. Yo ayudaré desde donde toque." },
  balanced: { id:"balanced", label:"Equilibrado", tone:"natural", frequency:1, minutesSensitivity:1, trainingResponse:1, negotiation:"normal", line:"Míster, quería hablarlo con calma." },
};

const PERSONALITY_LABELS = [
  { id:"conflictive", test:t=>t.character>=72&&t.patience<=42&&t.loyalty<62 },
  { id:"leader", test:t=>t.leadership>=72&&t.character>=58 },
  { id:"dressingRoomModel", test:t=>t.leadership>=62&&t.loyalty>=72&&t.ego<=55 },
  { id:"professional", test:t=>t.professionalism>=72&&t.patience>=50 },
  { id:"hardWorker", test:t=>t.professionalism>=70&&t.ambition<70&&t.ego<62 },
  { id:"ambitious", test:t=>t.ambition>=72&&t.competitiveness>=60&&t.ego<78 },
  { id:"selfish", test:t=>t.ego>=76&&t.loyalty<62 },
  { id:"competitive", test:t=>t.competitiveness>=74&&t.character>=55 },
  { id:"veteran", test:t=>t.age>=31&&t.patience>=48 },
  { id:"insecureYoung", test:t=>t.age<=21&&t.character<58&&t.ego<55 },
  { id:"reserved", test:t=>t.leadership<45&&t.ego<55 },
];

export const LOCKER_ROLES = ["Estrella","Titular","Rotación","Promesa","Suplente","Emergencia"];

function hashNumber(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableTrait(seed, key, min = 28, max = 88) {
  const span = max - min;
  return min + (hashNumber(`${seed}:${key}`) % (span + 1));
}

export function buildPersonality(player) {
  const seed = player.id ?? player.name;
  const traits = Object.fromEntries(TRAIT_KEYS.map(key => [key, stableTrait(seed, key)]));
  if ((player.age ?? 25) >= 31) traits.leadership = clamp(traits.leadership + 10, 0, 99);
  if ((player.overall ?? 70) >= 84) { traits.ego = clamp(traits.ego + 8, 0, 99); traits.ambition = clamp(traits.ambition + 6, 0, 99); }
  if (player.academyData) traits.loyalty = clamp(traits.loyalty + 8, 0, 99);
  traits.age = player.age ?? 25;
  const profile = PLAYER_PERSONALITY_PROFILES[(PERSONALITY_LABELS.find(item => item.test(traits))?.id)] ?? PLAYER_PERSONALITY_PROFILES.balanced;
  return { profileId:profile.id, profileLabel:profile.label, tone:profile.tone, traits };
}

export function getPlayerPersonality(player) {
  if (!PLAYER_PERSONALITIES_ENABLED) {
    const traits = player?.personality?.traits ?? {};
    const profile = PLAYER_PERSONALITY_PROFILES.balanced;
    return { ...profile, profileId:profile.id, profileLabel:profile.label, label:profile.label, traits };
  }
  const personality = player?.personality?.traits ? player.personality : buildPersonality(player ?? {});
  const legacyMap = { temperamental:"conflictive", loyal:"dressingRoomModel", quiet:"reserved" };
  const profileId = PLAYER_PERSONALITY_PROFILES[personality.profileId] ? personality.profileId : legacyMap[personality.profileId] ?? "balanced";
  const profile = PLAYER_PERSONALITY_PROFILES[profileId] ?? PLAYER_PERSONALITY_PROFILES.balanced;
  return { ...profile, ...personality, id:profile.id, profileId:profile.id, profileLabel:profile.label, label:profile.label, traits:personality.traits ?? {} };
}

export function personalityLine(player, situation = "general") {
  const profile = getPlayerPersonality(player);
  const specific = {
    minutes: {
      professional: "Míster, seguiré trabajando, pero necesito saber qué espera de mí.",
      ambitious: "Quiero jugar más. Sé que puedo ser importante.",
      conflictive: "No entiendo esta decisión. No me parece justo.",
      reserved: "Confío en usted, pero quería entender mi situación.",
      hardWorker: "Voy a ganármelo entrenando, pero necesito una oportunidad.",
      leader: "Si mi rol cambia, prefiero hablarlo claro por el bien del grupo.",
      selfish: "Necesito sentirme protagonista. No he venido para mirar desde fuera.",
      insecureYoung: "No sé si estoy haciendo algo mal. Quería preguntárselo.",
      dressingRoomModel: "No quiero poner mi caso por encima del grupo, pero quería hablarlo.",
    },
    thanks: {
      professional: "Gracias por la confianza. Seguiré trabajando igual.",
      ambitious: "Gracias, míster. Quiero demostrar que puedo dar aún más.",
      reserved: "Gracias. Para mí significa mucho, aunque no lo diga demasiado.",
      leader: "Gracias. Intentaré devolverlo ayudando también al grupo.",
      hardWorker: "Gracias, míster. Voy a seguir apretando.",
    },
  }[situation] ?? {};
  return specific[profile.id] ?? profile.line;
}

export function personalityModifier(player, key, fallback = 1) {
  const profile = getPlayerPersonality(player);
  return Number(profile[key] ?? fallback);
}

export function ensurePlayerMorale(player, season = "2025") {
  const personality = getPlayerPersonality(player);
  const role = player.squadRole ?? (player.overall >= 84 ? "Estrella" : player.overall >= 78 ? "Titular" : player.age <= 21 ? "Promesa" : player.overall >= 72 ? "Rotación" : "Suplente");
  return {
    ...player,
    squadRole: role,
    personality,
    happiness: clamp(player.happiness ?? player.morale ?? 72),
    managerTrust: clamp(player.managerTrust ?? 70),
    moraleEvents: player.moraleEvents ?? [],
    promises: player.promises ?? [],
    relationships: player.relationships ?? { mentors:[], friends:[], rivals:[], protectedBy:null },
    morale: clamp(player.morale ?? 70),
    humanStateVersion: player.humanStateVersion ?? `human-${season}`,
  };
}

export function getMoraleLevel(value = 70) {
  const morale = clamp(value);
  if (morale >= 85) return { id:"excellent", label:"Excelente", icon:"🟢", color:"#22c55e" };
  if (morale >= 70) return { id:"high", label:"Alta", icon:"🟢", color:"#22c55e" };
  if (morale >= 50) return { id:"normal", label:"Normal", icon:"🟡", color:"#eab308" };
  if (morale >= 30) return { id:"low", label:"Baja", icon:"🟠", color:"#f97316" };
  return { id:"veryLow", label:"Muy baja", icon:"🔴", color:"#ef4444" };
}

export function getRoleExpectation(role) {
  return { Estrella:78, Titular:62, Rotación:38, Promesa:25, Suplente:18, Emergencia:8 }[role ?? "Rotación"] ?? 35;
}

function recentMinutes(player, fixtures = [], teamId) {
  const played = fixtures.filter(f => f.played && (f.homeTeamId === teamId || f.awayTeamId === teamId)).sort((a,b)=>(b.matchday??0)-(a.matchday??0)).slice(0,5);
  return played.reduce((sum,fixture)=>{
    const started = fixture.participation?.starters?.includes(player.id);
    const subIn = fixture.events?.find(event=>event.type==="SUBSTITUTION"&&event.playerId===player.id)?.minute;
    const subOut = fixture.events?.find(event=>event.type==="SUBSTITUTION"&&event.outPlayerId===player.id)?.minute;
    if (started) return sum + Math.min(95, subOut ?? 90);
    if (subIn) return sum + Math.max(0, 90 - subIn);
    return sum;
  },0);
}

export function updatePlayerHumanState(player, game, context = {}) {
  const current = ensurePlayerMorale(player, game?.season);
  const traits = current.personality.traits;
  const minutes5 = recentMinutes(current, game?.fixtures ?? [], game?.teamId);
  const expected = getRoleExpectation(current.squadRole);
  const minutesSatisfaction = clamp(50 + (minutes5 / 5 - expected) * .9);
  const resultDelta = context.result === "win" ? 5 : context.result === "draw" ? 1 : context.result === "loss" ? -5 : 0;
  const starterBonus = context.started ? 3 : context.played ? 1 : 0;
  const benchPenalty = !context.played && ["Estrella","Titular"].includes(current.squadRole) ? -(current.squadRole==="Estrella" ? 5 : 3) : 0;
  const injuryPenalty = current.injured ? -4 : 0;
  const trainingPenalty = (game?.trainingPlan?.load === "veryHigh" && (current.morale ?? 70) < 55) ? -2 : 0;
  const personalitySensitivity = personalityModifier(current, "minutesSensitivity", 1);
  const patienceMod = (traits.patience - 55) * .03;
  const egoMod = ["Estrella","Titular"].includes(current.squadRole) ? (traits.ego - 50) * .018 * personalitySensitivity : 0;
  const morale = clamp((current.morale ?? 70) + resultDelta + starterBonus + benchPenalty * personalitySensitivity + injuryPenalty + trainingPenalty + patienceMod - egoMod);
  const happinessTarget = (minutesSatisfaction * .42) + ((current.managerTrust ?? 70) * .25) + (morale * .25) + ((traits.loyalty ?? 60) * .08);
  const happiness = clamp((current.happiness ?? 70) * .82 + happinessTarget * .18);
  const trustDelta = context.started ? 1 : benchPenalty < 0 ? -1.5 : context.result === "win" ? .5 : 0;
  const managerTrust = clamp((current.managerTrust ?? 70) + trustDelta + (traits.loyalty - 55) * .01);
  const events = [...(current.moraleEvents ?? [])];
  if (benchPenalty < 0 && morale < 48) events.unshift({ id:`minutes-${game?.season}-${game?.matchday}`, type:"minutes", label:"Preocupado por sus minutos", matchday:game?.matchday, season:String(game?.season) });
  if (current.injured) events.unshift({ id:`injury-mood-${game?.season}-${game?.matchday}`, type:"injury", label:"La lesión afecta a su ánimo", matchday:game?.matchday, season:String(game?.season) });
  return { ...current, morale, happiness, managerTrust, moraleEvents:events.slice(0,8) };
}

export function ensureSquadMorale(players = [], season = "2025") {
  return players.map(player => ensurePlayerMorale(player, season));
}

export function getLockerRoomSummary(players = []) {
  const squad = players.map(player=>ensurePlayerMorale(player));
  const avgMorale = squad.length ? Math.round(squad.reduce((sum,p)=>sum+(p.morale??70),0)/squad.length) : 70;
  const avgHappiness = squad.length ? Math.round(squad.reduce((sum,p)=>sum+(p.happiness??70),0)/squad.length) : 70;
  const avgTrust = squad.length ? Math.round(squad.reduce((sum,p)=>sum+(p.managerTrust??70),0)/squad.length) : 70;
  const leaders = [...squad].sort((a,b)=>((b.personality?.traits?.leadership??50)+(b.overall??70)*.3)-((a.personality?.traits?.leadership??50)+(a.overall??70)*.3)).slice(0,4);
  const unhappy = squad.filter(player=>(player.morale??70)<40||(player.happiness??70)<38||(player.managerTrust??70)<35);
  const atmosphere = avgMorale>=75&&avgTrust>=68 ? "positivo" : unhappy.length>=3 || avgMorale<50 ? "tenso" : "estable";
  return { avgMorale, avgHappiness, avgTrust, leaders, unhappy, atmosphere };
}
