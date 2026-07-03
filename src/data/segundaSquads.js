/**
 * segundaSquads.js
 *
 * Plantillas de los 22 equipos de LaLiga SmartBank (esp_segunda). Mismo
 * shape de jugador que las plantillas de Primera (via _p en playerHelpers.js),
 * generadas proceduralmente a partir de un banco de nombres + un jugador
 * "ancla" reconocible por club, en vez de escribir ~550 jugadores a mano.
 *
 * Curva de nivel respecto a Primera (72-85 overall):
 *   overall 62-73, potential 65-82, salario 1-8 (€K/semana), fichas 2025-2028.
 */

import { _p } from "./playerHelpers.js";
import { SEGUNDA_TEAMS } from "./segundaTeams.js";

const FIRST_ES = [
  "Álvaro","Adrián","Sergio","Javier","Iker","Pablo","Diego","Marcos","Rubén","Raúl",
  "Hugo","Mario","Carlos","Jorge","Aitor","Iván","David","Manuel","Antonio","Alberto",
  "Guillermo","Enrique","Fernando","Rodrigo","Nacho","Óscar","Víctor","Samuel","Gonzalo","Andrés",
  "Eric","Marc","Pol","Bruno","Izan","Unai","Ander","Mikel","Jon","Ekaitz",
  "Miguel","Francisco","Ismael","Xavi","Josep","Toni","Ángel","Cristian","Dani","Jesús",
];
const LAST_ES = [
  "García","Martínez","López","Sánchez","Pérez","González","Rodríguez","Fernández","Gómez","Díaz",
  "Álvarez","Moreno","Muñoz","Alonso","Gutiérrez","Romero","Navarro","Torres","Domínguez","Vázquez",
  "Ramos","Gil","Serrano","Blanco","Suárez","Molina","Ortega","Delgado","Castro","Ortiz",
  "Rubio","Marín","Sanz","Iglesias","Núñez","Medina","Garrido","Cortés","Prieto","Cano",
  "Vidal","Ferrer","Camacho","Vega","Soler","Pascual","Ibáñez","Reyes","Flores","Peña",
];
const FOREIGN_POOL = [
  { nat: "AR", first: ["Matías","Facundo","Nicolás","Franco","Ezequiel","Lautaro"], last: ["Fernández","Ríos","Acosta","Toledo","Ledesma","Gómez"] },
  { nat: "UY", first: ["Agustín","Rodrigo","Nahuel","Bruno","Federico"], last: ["Suárez","Cabrera","Silva","Pereira","Machado"] },
  { nat: "CO", first: ["Yerry","Jhon","Luis","Cristian","Duván"], last: ["Palacios","Mosquera","Zapata","Arias","Cuesta"] },
  { nat: "BR", first: ["Gabriel","Lucas","Matheus","Rafael","Wesley"], last: ["Silva","Souza","Oliveira","Santos","Costa"] },
  { nat: "PT", first: ["João","Rui","Bruno","Tiago","André"], last: ["Ferreira","Costa","Pinto","Carvalho","Sousa"] },
  { nat: "MA", first: ["Youssef","Achraf","Yassine","Karim","Anas"], last: ["El Amrani","Benali","Ziani","Idrissi","Fassi"] },
  { nat: "FR", first: ["Lucas","Hugo","Théo","Nathan","Enzo"], last: ["Girard","Fontaine","Moreau","Lambert","Roche"] },
];

const rand = () => Math.random();
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = arr => arr[Math.floor(rand() * arr.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function rollName(nat) {
  if (nat === "ES") return { first: pick(FIRST_ES), last: pick(LAST_ES) };
  const pool = FOREIGN_POOL.find(p => p.nat === nat);
  return { first: pick(pool.first), last: pick(pool.last) };
}

function rollNat() {
  if (rand() < 0.7) return "ES";
  return pick(FOREIGN_POOL).nat;
}

function rollAge() {
  const r = rand();
  if (r < 0.32) return randInt(18, 23);
  if (r < 0.75) return randInt(24, 30);
  return randInt(31, 36);
}

function segundaSalary(ov) {
  return clamp(Math.round((ov - 61) * 0.75), 1, 8);
}

function attrsForGroup(group, ov) {
  const j = () => randInt(-8, 8);
  if (group === "DEF") return [clamp(ov - 6 + j(), 30, 88), clamp(ov - 22 + j(), 15, 70), clamp(ov - 8 + j(), 30, 85), clamp(ov - 14 + j(), 25, 80), clamp(ov + 6 + j(), 40, 92), clamp(ov + 4 + j(), 35, 90)];
  if (group === "MED") return [clamp(ov - 4 + j(), 30, 88), clamp(ov - 10 + j(), 25, 82), clamp(ov + 4 + j(), 35, 92), clamp(ov + 2 + j(), 35, 90), clamp(ov - 6 + j(), 25, 82), clamp(ov - 2 + j(), 30, 85)];
  if (group === "DEL") return [clamp(ov + 6 + j(), 40, 95), clamp(ov + 8 + j(), 40, 92), clamp(ov - 6 + j(), 25, 82), clamp(ov + 4 + j(), 35, 92), clamp(ov - 30 + j(), 15, 55), clamp(ov + j(), 35, 88)];
  return [clamp(ov - 25 + j(), 15, 55), clamp(ov - 55 + j(), 10, 35), clamp(ov - 15 + j(), 30, 68), clamp(ov - 30 + j(), 15, 55), clamp(ov - 40 + j(), 12, 45), clamp(ov - 5 + j(), 40, 85)];
}

const SLOTS = [
  ...Array(3).fill({ group: "POR", positions: ["POR"] }),
  ...Array(8).fill({ group: "DEF", positions: ["DFC", "DFC", "DFC", "LD", "LI"] }),
  ...Array(8).fill({ group: "MED", positions: ["MCD", "MC", "MC", "MCO"] }),
  ...Array(5).fill({ group: "DEL", positions: ["DC", "DC", "EI", "ED", "SD"] }),
];

// Un jugador reconocible por club (donde se conoce alguno asociado al club);
// se inserta como el jugador de campo mejor valorado de la plantilla.
const ANCHORS = {
  cadiz: { name: "Álvaro Negredo", pos: "DC", group: "DEL", age: 39, nat: "ES" },
  deportivo: { name: "Lucas Pérez", pos: "DC", group: "DEL", age: 36, nat: "ES" },
  sporting: { name: "Christian Santos", pos: "MCO", group: "MED", age: 20, nat: "ES" },
  malaga: { name: "Roberto Jiménez", pos: "POR", group: "POR", age: 33, nat: "ES" },
  zaragoza: { name: "Toni Moya", pos: "MC", group: "MED", age: 27, nat: "ES" },
  racing: { name: "Iñigo Vicente", pos: "ED", group: "DEL", age: 29, nat: "ES" },
  udlaspalmas: { name: "Kirian Rodríguez", pos: "MCD", group: "MED", age: 27, nat: "ES" },
  eibar: { name: "Sergio Álvarez", pos: "POR", group: "POR", age: 35, nat: "ES" },
  granada: { name: "Myrto Uzuni", pos: "SD", group: "DEL", age: 31, nat: "AL" },
  albacete: { name: "Higinio Marín", pos: "MC", group: "MED", age: 33, nat: "ES" },
  leganes_b: { name: "Miguel de la Fuente", pos: "DC", group: "DEL", age: 27, nat: "ES" },
  cordoba: { name: "Carlos Puga", pos: "MC", group: "MED", age: 28, nat: "ES" },
  andorra: { name: "Marc Domènech", pos: "DFC", group: "DEF", age: 27, nat: "ES" },
  realvalladolid: { name: "Iván Alejo", pos: "EI", group: "DEL", age: 30, nat: "ES" },
};

function teamOvBase(prestige) {
  return Math.round(62 + (prestige - 30) * 0.44);
}

function buildSquad(team) {
  const base = teamOvBase(team.prestige);
  const anchor = ANCHORS[team.id];
  const players = SLOTS.map((slot, i) => {
    const pos = pick(slot.positions);
    const age = rollAge();
    const ov = clamp(base + randInt(-4, 5), 62, 73);
    const potGap = age <= 21 ? randInt(6, 14) : age <= 25 ? randInt(2, 8) : randInt(0, 3);
    const pot = clamp(ov + potGap, 65, 82);
    const nat = rollNat();
    const { first, last } = rollName(nat);
    const contractEnd = String(randInt(2025, 2028));
    const [pace, shoot, pass, drib, def, phys] = attrsForGroup(slot.group, ov);
    const player = _p(`${team.id}-${i + 1}`, `${first} ${last}`, pos, slot.group, ov, age, nat, pace, shoot, pass, drib, def, phys, pot, contractEnd);
    player.salary = segundaSalary(ov);
    return player;
  });

  if (anchor) {
    const anchorOv = clamp(base + randInt(2, 5), 66, 73);
    const [pace, shoot, pass, drib, def, phys] = attrsForGroup(anchor.group, anchorOv);
    const anchorPlayer = _p(`${team.id}-anchor`, anchor.name, anchor.pos, anchor.group, anchorOv, anchor.age, anchor.nat, pace, shoot, pass, drib, def, phys, Math.min(82, anchorOv + randInt(0, 3)), String(randInt(2026, 2028)));
    anchorPlayer.salary = segundaSalary(anchorOv);
    // Sustituye al jugador generado del mismo grupo con menor overall para no desbordar la plantilla.
    const sameGroup = players.filter(p => p.group === anchor.group);
    const weakest = sameGroup.reduce((min, p) => (p.overall < min.overall ? p : min), sameGroup[0]);
    const idx = players.findIndex(p => p.id === weakest.id);
    players[idx] = anchorPlayer;
  }

  return players;
}

export const SEGUNDA_SQUADS = Object.fromEntries(SEGUNDA_TEAMS.map(team => [team.id, buildSquad(team)]));
