// Helpers compartidos por los paneles de la pantalla de partido PC.
export { computePlayerRating } from "../../match/matchFlow.js";

export function ratingClass(rating) {
  const r = Number(rating);
  if (!Number.isFinite(r)) return "mid";
  return r >= 7.3 ? "good" : r >= 6.6 ? "mid" : "bad";
}

export function initialsOf(name = "") {
  const parts = name.replace(".", " ").split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
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
