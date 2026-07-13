import { REAL_SQUADS } from "../App.jsx";

// Único punto de escritura para REAL_SQUADS (objeto module-level fuera de React
// state, ver CLAUDE.md). Antes cada sitio mutaba REAL_SQUADS[teamId] directamente;
// ahora todos pasan por aquí para que quede un solo lugar que tocar si en el
// futuro hace falta validar, loggear o interceptar la escritura.

export function setRealSquad(teamId, players) {
  REAL_SQUADS[teamId] = players;
}

export function mutateRealSquad(teamId, updater) {
  REAL_SQUADS[teamId] = updater(REAL_SQUADS[teamId] ?? []);
}
