/**
 * leagues.js
 *
 * Configuracion central de ligas/divisiones. Toda logica de fixtures,
 * clasificacion, ascensos/descensos debe derivar sus reglas de aqui en vez
 * de asumir un numero fijo de equipos o una unica division.
 */

export const LEAGUES = [
  {
    id: "esp_primera",
    name: "LaLiga Santander",
    shortName: "LaLiga",
    country: "ES",
    countryName: "España",
    flag: "🇪🇸",
    tier: 1,
    teamsCount: 20,
    promotionSpots: 0,
    playoffSpots: 0,
    relegationSpots: 3,
    hasPlayoff: false,
    playoffDescription: "",
  },
  {
    id: "esp_segunda",
    name: "LaLiga SmartBank",
    shortName: "Segunda",
    country: "ES",
    countryName: "España",
    flag: "🇪🇸",
    tier: 2,
    teamsCount: 22,
    promotionSpots: 2,
    playoffSpots: 4,
    relegationSpots: 4,
    hasPlayoff: true,
    playoffDescription: "3º-6º disputan eliminatoria a doble partido. El ganador asciende.",
  },
];

export const getLeagueById = id => LEAGUES.find(l => l.id === id);
export const getLeaguesByCountry = country => LEAGUES.filter(l => l.country === country);
