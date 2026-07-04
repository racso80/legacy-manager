// Cálculos de plantilla compartidos entre la ficha de equipo móvil (TeamSelection
// en App.jsx) y la ficha de equipo PC (PCClubSelectScreen), para no duplicar la
// lógica de medias/rarezas/dificultad en dos sitios.

export function computeSquadRatings(squad, fallbackAvg) {
  const groupAvg = (group) => {
    const g = squad.filter(p => p.group === group);
    return g.length ? Math.round(g.reduce((s, p) => s + p.overall, 0) / g.length) : 0;
  };
  const gkAvg  = groupAvg("POR");
  const defAvg = groupAvg("DEF");
  const medAvg = groupAvg("MED");
  const delAvg = groupAvg("DEL");
  const totalAvg = squad.length ? Math.round(squad.reduce((s, p) => s + p.overall, 0) / squad.length) : fallbackAvg;
  return { gkAvg, defAvg, medAvg, delAvg, totalAvg };
}

export function computeRarityCount(squad) {
  const rarityCount = { SPECIAL: 0, GOLD: 0, SILVER: 0, BRONZE: 0 };
  squad.forEach(p => rarityCount[p.rarity]++);
  return rarityCount;
}

export function getTopPlayers(squad, n = 3) {
  return [...squad].sort((a, b) => b.overall - a.overall).slice(0, n);
}

export function lineRatingColor(v) {
  return v >= 80 ? "#22c55e" : v >= 74 ? "#c9a84c" : v >= 68 ? "#f59e0b" : "#ef4444";
}

export function getTeamDifficulty(avg) {
  return avg >= 85 ? { label: "Muy difícil", color: "#ef4444", stars: 5, desc: "Máxima exigencia. Se esperan títulos." }
       : avg >= 79 ? { label: "Difícil",     color: "#f97316", stars: 4, desc: "Objetivo Champions. Presión alta." }
       : avg >= 74 ? { label: "Media",       color: "#f59e0b", stars: 3, desc: "Competir en la mitad alta de la tabla." }
       : avg >= 70 ? { label: "Asequible",   color: "#22c55e", stars: 2, desc: "Salvar la categoría como prioridad." }
       :             { label: "Fácil",        color: "#3b82f6", stars: 1, desc: "Sin presión. Ideal para aprender." };
}
