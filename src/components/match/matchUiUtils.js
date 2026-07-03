// Helpers compartidos por los paneles de la pantalla de partido PC.

export function ratingClass(rating) {
  const r = Number(rating);
  if (!Number.isFinite(r)) return "mid";
  return r >= 7.3 ? "good" : r >= 6.6 ? "mid" : "bad";
}

export function initialsOf(name = "") {
  const parts = name.replace(".", " ").split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Mismo cálculo de rating en vivo que usaba PCMatchScreen: puntos por goles/asistencias/paradas/
// acciones defensivas, penalización por tarjetas. sentOffIds debe ser el del equipo del jugador.
export function computePlayerRating(playerId, { events, sentOffIds = [], currentMinute }) {
  if (!playerId || currentMinute <= 0) return null;
  const own = events.filter(e => e.playerId === playerId || e.assistId === playerId);
  const goals = own.filter(e => (e.type === "GOAL" || e.type === "PENALTY") && e.playerId === playerId).length;
  const assists = own.filter(e => e.assistId === playerId).length;
  const yellows = own.filter(e => e.type === "YELLOW" && e.playerId === playerId).length;
  const isRed = sentOffIds.includes(playerId);
  const saves = own.filter(e => e.type === "SAVE" && e.playerId === playerId).length;
  const defActions = own.filter(e => e.type === "DEFENSIVE_ACTION" && e.playerId === playerId).length;
  const rating = Math.max(4, Math.min(10, 6 + goals * 1.25 + assists * .7 + saves * .18 + defActions * .14 - yellows * .2 - (isRed ? 1.5 : 0)));
  return Number(rating.toFixed(1));
}

// energy = 100 - fatigue. Mismos umbrales de color que el resto de la UI de partido
// (good/mid/bad ya estilizados en GLOBAL_CSS con var(--good)/var(--mid)/var(--bad)).
export function energyClass(energy) {
  const e = Number(energy);
  if (!Number.isFinite(e)) return "mid";
  return e > 60 ? "good" : e >= 30 ? "mid" : "bad";
}

const POSITION_TIER = {
  POR: "GK",
  LD: "D", LI: "D", DFC: "D",
  MCD: "DM",
  MC: "AM", MCO: "AM", MD: "AM", MI: "AM",
  ED: "ST", DC: "ST", EI: "ST",
};

export function positionTier(pos) {
  return POSITION_TIER[pos] ?? "AM";
}

// Orden de filas del mini-campo: reversed=false ataca hacia arriba (delanteros primero),
// reversed=true ataca hacia abajo (portero primero) — así los dos paneles quedan espejados.
export const TIER_ORDER_ATTACK_UP = ["ST", "AM", "DM", "D", "GK"];
export const TIER_ORDER_ATTACK_DOWN = ["GK", "D", "DM", "AM", "ST"];
