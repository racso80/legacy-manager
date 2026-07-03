/**
 * segundaTeams.js
 *
 * Los 22 equipos de LaLiga SmartBank (esp_segunda). Mismo shape de objeto
 * que los equipos de Primera en App.jsx (TEAMS), mas leagueId/countryId/tier.
 *
 * NOTA: dos ids del enunciado original colisionaban con ids ya usados por
 * Primera (valladolid = Real Oviedo, laspalmas = Elche CF son restos de un
 * ascenso/descenso anterior donde el id no se renombro). Se han renombrado
 * a "realvalladolid" y "udlaspalmas" para evitar pisar esos datos.
 *
 * `avg` es un valor de partida derivado del prestigio; segundaSquads.js lo
 * recalcula a partir de la plantilla real una vez generada.
 */

const avgFromPrestige = prestige => Math.round(62 + (prestige - 30) * 0.44);

const fanbaseFor = prestige => (prestige >= 50 ? 4 : prestige >= 40 ? 3 : prestige >= 34 ? 2 : 1);

const objFromPrestige = prestige => (prestige >= 50 ? "Ascenso directo" : prestige >= 40 ? "Playoff ascenso" : "Permanencia");

const RAW_SEGUNDA_TEAMS = [
  { id: "ceuta",           name: "AD Ceuta FC",                     short: "CEU", color: "#003087", stadium: "Alfonso Murube",              city: "Ceuta",             prestige: 32, capacity: 6500 },
  { id: "albacete",        name: "Albacete Balompié",               short: "ALB", color: "#f5a623", stadium: "Estadio Carlos Belmonte",     city: "Albacete",          prestige: 38, capacity: 17524 },
  { id: "almeria",         name: "UD Almería",                      short: "ALM", color: "#e63946", stadium: "Power Horse Stadium",         city: "Almería",           prestige: 48, capacity: 15274 },
  { id: "burgos",          name: "Burgos CF",                       short: "BUR", color: "#000000", stadium: "El Plantío",                  city: "Burgos",            prestige: 40, capacity: 12200 },
  { id: "cadiz",           name: "Cádiz CF",                        short: "CAD", color: "#f5c518", stadium: "Estadio Nuevo Mirandilla",    city: "Cádiz",             prestige: 50, capacity: 20724 },
  { id: "castellon",       name: "CD Castellón",                    short: "CAS", color: "#000000", stadium: "Estadio Castalia",            city: "Castellón",         prestige: 36, capacity: 15500 },
  { id: "leganes_b",       name: "CD Leganés",                      short: "LEG", color: "#0055a5", stadium: "Estadio Municipal de Butarque", city: "Leganés",          prestige: 44, capacity: 12454 },
  { id: "mirandes",        name: "CD Mirandés",                     short: "MIR", color: "#c8102e", stadium: "Estadio Municipal Anduva",    city: "Miranda de Ebro",   prestige: 35, capacity: 5759 },
  { id: "cordoba",         name: "Córdoba CF",                      short: "COR", color: "#006341", stadium: "Estadio El Arcángel",         city: "Córdoba",           prestige: 42, capacity: 21822 },
  { id: "leonesa",         name: "Cultural y Deportiva Leonesa",    short: "CUL", color: "#8B0000", stadium: "Reino de León",               city: "León",              prestige: 33, capacity: 13333 },
  { id: "eibar",           name: "SD Eibar",                        short: "EIB", color: "#003087", stadium: "Estadio Municipal de Ipurua", city: "Éibar",             prestige: 46, capacity: 6664 },
  { id: "andorra",         name: "FC Andorra",                      short: "AND", color: "#003087", stadium: "Estadi Nacional",             city: "Andorra la Vella",  prestige: 34, capacity: 3306 },
  { id: "granada",         name: "Granada CF",                      short: "GRA", color: "#c8102e", stadium: "Estadio Nuevo Los Cármenes",  city: "Granada",           prestige: 52, capacity: 19336 },
  { id: "huesca",          name: "SD Huesca",                       short: "HUE", color: "#003087", stadium: "El Alcoraz",                  city: "Huesca",            prestige: 44, capacity: 7638 },
  { id: "malaga",          name: "Málaga CF",                       short: "MAL", color: "#003087", stadium: "La Rosaleda",                 city: "Málaga",            prestige: 50, capacity: 30044 },
  { id: "deportivo",       name: "RC Deportivo de La Coruña",       short: "DEP", color: "#003087", stadium: "Abanca-Riazor",               city: "A Coruña",          prestige: 52, capacity: 32660 },
  { id: "racing",          name: "Real Racing Club de Santander",   short: "RAC", color: "#006341", stadium: "Estadio El Sardinero",        city: "Santander",         prestige: 42, capacity: 22271 },
  { id: "realsociedad_b",  name: "Real Sociedad B",                 short: "RSB", color: "#003087", stadium: "Zubieta",                     city: "San Sebastián",     prestige: 36, capacity: 2500 },
  { id: "sporting",        name: "Real Sporting de Gijón",          short: "SPO", color: "#c8102e", stadium: "Estadio El Molinón",          city: "Gijón",             prestige: 48, capacity: 29862 },
  { id: "realvalladolid",  name: "Real Valladolid CF",              short: "VLL", color: "#6a0dad", stadium: "Estadio José Zorrilla",       city: "Valladolid",        prestige: 50, capacity: 27618 },
  { id: "zaragoza",        name: "Real Zaragoza",                   short: "ZAR", color: "#003087", stadium: "La Romareda",                 city: "Zaragoza",          prestige: 50, capacity: 33608 },
  { id: "udlaspalmas",     name: "UD Las Palmas",                   short: "LPA", color: "#f5c518", stadium: "Estadio Gran Canaria",        city: "Las Palmas",        prestige: 48, capacity: 32392 },
];

export const SEGUNDA_TEAMS = RAW_SEGUNDA_TEAMS.map(t => ({
  ...t,
  leagueId: "esp_segunda",
  countryId: "ES",
  tier: 2,
  budget: Math.max(2, Math.round(t.prestige / 4)),
  avg: avgFromPrestige(t.prestige),
  obj: objFromPrestige(t.prestige),
  fanbase: fanbaseFor(t.prestige),
}));
