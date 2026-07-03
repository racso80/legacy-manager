/**
 * playerHelpers.js
 *
 * Helpers de construccion de jugadores compartidos entre App.jsx (plantillas
 * de Primera) y los data files de otras divisiones (p. ej. segundaSquads.js).
 * Viven fuera de App.jsx para que un data file pueda importarlos sin crear
 * un ciclo de imports con App.jsx.
 */

export function _r(ov) {
  return ov >= 85 ? "SPECIAL" : ov >= 75 ? "GOLD" : ov >= 65 ? "SILVER" : "BRONZE";
}

/**
 * pot (potential) y contractEnd son opcionales — si no se pasan, el jugador
 * se comporta exactamente igual que antes de añadir estos dos campos.
 */
export function _p(id, name, pos, group, ov, age, nat, pace, shoot, pass, drib, def, phys, pot = ov, contractEnd = "2027") {
  const gk = group === "POR" ? Math.round(ov * 0.98) : Math.round(5 + Math.random() * 10);
  // Salario semanal en miles de euros según overall
  const salary = ov >= 88 ? 250 : ov >= 84 ? 150 : ov >= 80 ? 90 : ov >= 76 ? 55 : ov >= 72 ? 30 : ov >= 68 ? 16 : 8;
  return {
    id, name, pos, group, overall: ov, age, nat, rarity: _r(ov), potential: pot, contractEnd,
    fatigue: Math.floor(Math.random() * 25), morale: 65 + Math.floor(Math.random() * 30),
    injured: false, injuryGames: 0, suspended: false, suspGames: 0,
    yellowCards: Math.floor(Math.random() * 3),
    salary, // €K/semana
    attrs: { ritmo: pace, tiro: shoot, pase: pass, regate: drib, defensa: def, fisico: phys, porteria: gk },
  };
}
