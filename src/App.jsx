import { useState, useEffect, useCallback } from "react";
import { resolvePlayerPhoto } from "./data/dataLoader.js";
import NewsScreen from "./components/NewsScreen.jsx";
import PlayerProfileScreen from "./components/PlayerProfileScreen.jsx";
import MedicalCenterScreen from "./components/MedicalCenterScreen.jsx";
import TrainingCenterScreen from "./components/TrainingCenterScreen.jsx";
import BoardLegacyScreen from "./components/BoardLegacyScreen.jsx";
import LegacyMuseumScreen from "./components/LegacyMuseumScreen.jsx";
import ScoutingScreen from "./components/ScoutingScreen.jsx";
import TeamCrest from "./components/TeamCrest.jsx";
import { buildMatchdaySquad, buildStartingEleven, calculateMatchRatings, chooseOpponentFormation, eventsUntilExtraordinary, intervalProbability, promoteSecondYellow, strengthWithPlayerCount } from "./match/matchFlow.js";
import YouthAcademyScreen from "./components/YouthAcademyScreen.jsx";
import MoreMenuScreen from "./components/MoreMenuScreen.jsx";
import SettingsScreen from "./components/SettingsScreen.jsx";
import SeasonTransitionScreen from "./components/SeasonTransitionScreen.jsx";
import PreseasonScreen from "./components/PreseasonScreen.jsx";
import AttentionCenterScreen from "./components/AttentionCenterScreen.jsx";
import ContractsScreen from "./components/ContractsScreen.jsx";
import { SwipeTabs, useEdgeSwipeBack } from "./components/SwipeNavigation.jsx";
import { buildPlayerLookup, generateBoardNews, generateDevelopmentNews, generateMatchdayNews, generateMedicalNews, generateScoutingNews, generateTransferNews, generateYouthNews, getDashboardNews, mergeNews } from "./news/newsEngine.js";
import { createSeasonHistoryEntry, enrichPlayerProfile, getMarketValue, getPlayerSeasonStats } from "./players/playerProfile.js";
import { advanceSquadLifecycle, applyRetirementsToLegacy, ensurePlayerLifecycle, lifecycleNews, processBirthdays } from "./players/lifecycle.js";
import { advanceMedicalRecovery, applyInjury, calculateInjuryRisk, createInjuryEvent, getPhysicalStatus, getRiskLevel, normalizeMedicalPlayer, rollContextualInjury } from "./medical/medicalEngine.js";
import { applyWeeklyTraining, DEFAULT_TRAINING_PLAN, normalizeTrainingPlan } from "./training/trainingEngine.js";
import { ensureLegacyState, evaluateLegacyMatchday, finalizeLegacySeason, getPrestigeLevel, startNextLegacySeason } from "./legacy/legacyEngine.js";
import { createYouthAnnualReport, ensureYouthState, getTalentCategory } from "./youth/youthEngine.js";
import { advanceScouting, bootstrapScouting, cancelScoutingMission, createScoutingMission, ensureScoutingState, refreshScoutingRecommendations, registerScoutingSigning, toggleScoutingWatch } from "./scouting/scoutingEngine.js";
import { PRIMARY_NAV, SECONDARY_SCREEN_IDS } from "./navigation/navigationConfig.js";
import { acceptClubCounter, acceptPlayerCounter, acceptRoleCounter, advanceTransferNegotiations, completeOffer, createClubOffer, createContractOffer, ensureTransferState, maybeCreateAITransfer, maybeCreateIncomingOffer, refreshTransferListings, resolveIncomingOffer, setUserMarketStatus, withdrawOffer } from "./transfers/transferEngine.js";
import { getAttentionCount, getAttentionItems, markAttentionItem } from "./attention/attentionEngine.js";
import { acceptRenewalCounter, advanceRenewals, completeRenewal, createRenewalOffer, ensureContractState, withdrawRenewalOffer } from "./contracts/contractEngine.js";

const STARTERS_SLOTS = 11;
const BENCH_SLOTS = 12;
const CALLED_UP_SLOTS = STARTERS_SLOTS + BENCH_SLOTS;
const MAX_MATCH_SUBS = 5;
const emptyLineup = () => Array(STARTERS_SLOTS).fill(null);
const emptyBench = () => Array(BENCH_SLOTS).fill(null);
const normalizeSlots = (list = [], size) => [...list.slice(0, size), ...Array(Math.max(0, size - list.length)).fill(null)];

// ─── DATOS ───────────────────────────────────────────────────────────────────

const TEAMS = [
  { id: "athletic",    name: "Athletic Club",      short: "ATH", color: "#c9a84c", stadium: "San Mamés",               budget: 48,  avg: 79, obj: "Top 6",       city: "Bilbao",        capacity: 53289, fanbase: 4 },
  { id: "atletico",   name: "Atlético Madrid",     short: "ATM", color: "#c8102e", stadium: "Civitas Metropolitano",   budget: 120, avg: 85, obj: "Campeón",     city: "Madrid",        capacity: 70460, fanbase: 5 },
  { id: "barcelona",  name: "FC Barcelona",        short: "BAR", color: "#a50044", stadium: "Spotify Camp Nou",        budget: 180, avg: 88, obj: "Campeón",     city: "Barcelona",     capacity: 105000, fanbase: 5 },
  { id: "betis",      name: "Real Betis",          short: "BET", color: "#00a650", stadium: "Benito Villamarín",       budget: 65,  avg: 78, obj: "Top 6",       city: "Sevilla",       capacity: 60721, fanbase: 4 },
  { id: "celta",      name: "Celta de Vigo",       short: "CEL", color: "#6cb4e4", stadium: "Abanca Balaídos",         budget: 38,  avg: 75, obj: "Mitad tabla", city: "Vigo",          capacity: 29000, fanbase: 3 },
  { id: "espanyol",   name: "RCD Espanyol",        short: "ESP", color: "#005395", stadium: "Stage Front Stadium",     budget: 32,  avg: 74, obj: "Permanencia", city: "Barcelona",     capacity: 40500, fanbase: 2 },
  { id: "getafe",     name: "Getafe CF",           short: "GET", color: "#005ca9", stadium: "Coliseum",                budget: 28,  avg: 73, obj: "Permanencia", city: "Getafe",        capacity: 17393, fanbase: 2 },
  { id: "girona",     name: "Girona FC",           short: "GIR", color: "#b22222", stadium: "Montilivi",               budget: 44,  avg: 77, obj: "Top 10",      city: "Girona",        capacity: 14624, fanbase: 2 },
  { id: "laspalmas",  name: "Elche CF",            short: "ELC", color: "#006400", stadium: "Martínez Valero",         budget: 22,  avg: 73, obj: "Permanencia", city: "Elche",         capacity: 33732, fanbase: 2 },
  { id: "leganes",    name: "Levante UD",          short: "LEV", color: "#003DA5", stadium: "Estadio Ciudad de Valencia", budget: 24, avg: 72, obj: "Permanencia", city: "Valencia",    capacity: 26354, fanbase: 2 },
  { id: "mallorca",   name: "RCD Mallorca",        short: "MAL", color: "#c8102e", stadium: "Visit Mallorca Estadi",   budget: 30,  avg: 74, obj: "Permanencia", city: "Palma",         capacity: 23142, fanbase: 2 },
  { id: "osasuna",    name: "CA Osasuna",          short: "OSA", color: "#c8102e", stadium: "El Sadar",                budget: 32,  avg: 74, obj: "Mitad tabla", city: "Pamplona",      capacity: 23576, fanbase: 3 },
  { id: "rayo",       name: "Rayo Vallecano",      short: "RAY", color: "#c8102e", stadium: "Estadio de Vallecas",     budget: 25,  avg: 74, obj: "Permanencia", city: "Madrid",        capacity: 14708, fanbase: 2 },
  { id: "realmadrid", name: "Real Madrid",         short: "RMA", color: "#ffd700", stadium: "Santiago Bernabéu",       budget: 250, avg: 90, obj: "Campeón",     city: "Madrid",        capacity: 78297, fanbase: 5 },
  { id: "realsociedad",name: "Real Sociedad",      short: "RSO", color: "#003DA5", stadium: "Reale Arena",             budget: 72,  avg: 79, obj: "Top 6",       city: "San Sebastián", capacity: 39313, fanbase: 4 },
  { id: "sevilla",    name: "Sevilla FC",          short: "SEV", color: "#e8001c", stadium: "Ramón Sánchez-Pizjuán",   budget: 85,  avg: 76, obj: "Top 10",      city: "Sevilla",       capacity: 43883, fanbase: 4 },
  { id: "valencia",   name: "Valencia CF",         short: "VAL", color: "#ff7f00", stadium: "Mestalla",                budget: 52,  avg: 75, obj: "Mitad tabla", city: "Valencia",      capacity: 49430, fanbase: 4 },
  { id: "valladolid", name: "Real Oviedo",         short: "OVI", color: "#003DA5", stadium: "Carlos Tartiere",         budget: 18,  avg: 72, obj: "Permanencia", city: "Oviedo",        capacity: 30500, fanbase: 2 },
  { id: "villarreal", name: "Villarreal CF",       short: "VIL", color: "#ffd700", stadium: "Estadio de la Cerámica",  budget: 78,  avg: 79, obj: "Top 6",       city: "Villarreal",    capacity: 23008, fanbase: 3 },
  { id: "alaves",     name: "Deportivo Alavés",    short: "ALA", color: "#007ac2", stadium: "Mendizorroza",            budget: 22,  avg: 72, obj: "Permanencia", city: "Vitoria",       capacity: 19840, fanbase: 2 },
];

// ─── PLANTILLAS REALES LALIGA 2025/26 ────────────────────────────────────────
function _r(ov){return ov>=85?"SPECIAL":ov>=75?"GOLD":ov>=65?"SILVER":"BRONZE";}
function _p(id,name,pos,group,ov,age,nat,pace,shoot,pass,drib,def,phys){
  const gk=group==="POR"?Math.round(ov*0.98):Math.round(5+Math.random()*10);
  // Salario semanal en miles de euros según overall
  const salary = ov>=88?250:ov>=84?150:ov>=80?90:ov>=76?55:ov>=72?30:ov>=68?16:8;
  return{id,name,pos,group,overall:ov,age,nat,rarity:_r(ov),
    fatigue:Math.floor(Math.random()*25),morale:65+Math.floor(Math.random()*30),
    injured:false,injuryGames:0,suspended:false,suspGames:0,
    yellowCards:Math.floor(Math.random()*3),
    salary, // €K/semana
    attrs:{ritmo:pace,tiro:shoot,pase:pass,regate:drib,defensa:def,fisico:phys,porteria:gk}};
}

const REAL_SQUADS = {
  athletic:[
    _p("ath-1","Unai Simón","POR","POR",84,27,"ES",60,22,63,44,20,74),
    _p("ath-2","Álex Padilla","POR","POR",70,22,"ES",55,18,55,40,18,65),
    _p("ath-3","Dani Vivian","DFC","DEF",79,24,"ES",65,40,66,54,80,78),
    _p("ath-4","Aitor Paredes","DFC","DEF",78,24,"ES",66,38,64,52,79,77),
    _p("ath-5","Yeray Álvarez","DFC","DEF",77,29,"ES",60,35,65,50,79,80),
    _p("ath-6","Aymeric Laporte","DFC","DEF",83,31,"ES",63,44,72,58,84,78),
    _p("ath-7","Iñigo Lekue","LD","DEF",74,32,"ES",73,50,68,62,72,70),
    _p("ath-8","Andoni Gorosabel","LD","DEF",73,27,"ES",74,48,66,60,71,69),
    _p("ath-9","Yuri Berchiche","LI","DEF",76,34,"FR",70,50,70,63,73,70),
    _p("ath-10","Jesús Areso","LD","DEF",72,24,"ES",76,46,64,62,70,68),
    _p("ath-11","Mikel Vesga","MCD","MED",76,31,"ES",64,58,72,60,77,78),
    _p("ath-12","Oihan Sancet","MC","MED",82,23,"ES",76,74,80,78,52,72),
    _p("ath-13","I. Ruiz de Galarreta","MC","MED",75,28,"ES",68,60,76,66,68,72),
    _p("ath-14","Beñat Prados","MC","MED",73,22,"ES",70,62,74,68,54,68),
    _p("ath-15","Unai Gómez","MCO","MED",74,23,"ES",68,68,76,72,44,66),
    _p("ath-16","Mikel Jauregizar","LD","DEF",71,22,"ES",74,44,64,60,70,68),
    _p("ath-17","Robert Navarro","EI","DEL",76,23,"ES",84,70,72,80,36,70),
    _p("ath-18","Selton Sánchez","MC","MED",68,20,"ES",72,58,70,66,48,64),
    _p("ath-19","Iñaki Williams","DC","DEL",83,30,"GH",91,78,68,80,40,86),
    _p("ath-20","Nico Williams","EI","DEL",88,22,"ES",95,80,78,91,38,74),
    _p("ath-21","Gorka Guruzeta","DC","DEL",80,27,"ES",74,80,64,70,38,82),
    _p("ath-22","Maroan Sannadi","DC","DEL",68,20,"ES",76,64,58,68,32,70),
    _p("ath-23","Urko Izeta","EI","DEL",66,19,"ES",80,58,60,72,28,64),
  ],
  atletico:[
    _p("atm-1","Jan Oblak","POR","POR",88,32,"SI",58,20,62,40,18,88),
    _p("atm-2","Juan Musso","POR","POR",78,31,"AR",56,18,58,38,16,78),
    _p("atm-3","José M. Giménez","DFC","DEF",83,30,"UY",66,46,68,56,84,82),
    _p("atm-4","Nahuel Molina","LD","DEF",80,27,"AR",84,58,72,70,74,74),
    _p("atm-5","Robin Le Normand","DFC","DEF",82,28,"ES",64,42,70,56,83,80),
    _p("atm-6","Clément Lenglet","DFC","DEF",77,29,"FR",62,40,70,56,78,74),
    _p("atm-7","Matteo Ruggeri","LI","DEF",78,24,"IT",78,50,70,66,75,74),
    _p("atm-8","Marc Pubill","LD","DEF",75,22,"ES",82,50,68,68,72,72),
    _p("atm-9","Dávid Hancko","DFC","DEF",80,27,"SK",68,44,70,58,82,76),
    _p("atm-10","Koke","MC","MED",82,33,"ES",68,70,84,76,60,72),
    _p("atm-11","Marcos Llorente","MC","MED",83,30,"ES",84,72,78,78,64,80),
    _p("atm-12","Pablo Barrios","MCD","MED",80,22,"ES",72,62,78,72,72,74),
    _p("atm-13","Javi Serrano","MCD","MED",74,22,"ES",70,58,74,68,70,70),
    _p("atm-14","Álex Baena","MCO","MED",83,24,"ES",84,76,80,84,44,70),
    _p("atm-15","Thiago Almada","MC","MED",80,24,"AR",80,72,78,82,48,72),
    _p("atm-16","Johnny Cardoso","MCD","MED",77,23,"US",72,60,74,68,74,76),
    _p("atm-17","Obed Vargas","MCD","MED",73,20,"US",74,58,72,68,68,70),
    _p("atm-18","Antoine Griezmann","SD","DEL",87,34,"FR",80,86,84,84,50,76),
    _p("atm-19","Giuliano Simeone","ED","DEL",78,22,"AR",86,72,68,82,36,72),
    _p("atm-20","Borja Garcés","DC","DEL",74,23,"ES",74,76,62,68,34,74),
    _p("atm-21","Alexander Sørloth","DC","DEL",80,29,"NO",76,82,64,68,40,84),
    _p("atm-22","Julián Álvarez","DC","DEL",87,25,"AR",84,86,80,84,46,80),
    _p("atm-23","Nico González","EI","DEL",76,23,"ES",84,70,72,80,36,70),
    _p("atm-24","Ademola Lookman","EI","DEL",85,27,"NG",90,82,76,88,36,72),
  ],
  osasuna:[
    _p("osa-1","Sergio Herrera","POR","POR",78,32,"ES",58,20,60,40,18,78),
    _p("osa-2","Aitor Fernández","POR","POR",75,34,"ES",55,18,58,38,16,75),
    _p("osa-3","Juan Cruz","LI","DEF",75,26,"AR",76,50,68,62,73,72),
    _p("osa-4","Alejandro Catena","DFC","DEF",77,27,"ES",62,38,66,52,78,78),
    _p("osa-5","Jorge Herrando","DFC","DEF",73,23,"ES",64,36,64,50,74,74),
    _p("osa-6","Diego Moreno","LD","DEF",72,22,"ES",74,46,64,60,70,68),
    _p("osa-7","Enzo Boyomo","DFC","DEF",74,25,"CM",66,38,62,52,76,78),
    _p("osa-8","Valentin Rosier","LD","DEF",73,28,"FR",78,48,66,64,70,68),
    _p("osa-9","Javi Galán","LI","DEF",78,29,"ES",80,52,72,70,72,72),
    _p("osa-10","Lucas Torró","MCD","MED",76,31,"ES",66,58,72,62,76,76),
    _p("osa-11","Jon Moncayola","MC","MED",76,28,"ES",72,64,74,70,62,72),
    _p("osa-12","Aimar Oroz","MCO","MED",78,23,"ES",74,72,78,76,48,68),
    _p("osa-13","Moi Gómez","MCO","MED",78,31,"ES",78,72,76,78,44,68),
    _p("osa-14","Iker Muñoz","MC","MED",70,23,"ES",68,60,70,66,58,68),
    _p("osa-15","Víctor Muñoz","MCD","MED",71,24,"ES",68,56,70,62,68,70),
    _p("osa-16","Kike Barja","ED","DEL",76,27,"ES",84,70,68,80,34,68),
    _p("osa-17","Rubén García","EI","DEL",76,30,"ES",80,72,70,78,36,68),
    _p("osa-18","Ante Budimir","DC","DEL",80,33,"HR",72,82,62,66,38,80),
    _p("osa-19","Raúl García","DC","DEL",77,37,"ES",70,78,66,68,44,78),
    _p("osa-20","Raúl Moro","EI","DEL",74,23,"ES",84,68,68,78,30,66),
    _p("osa-21","Ander Yoldi","DC","DEL",68,21,"ES",72,66,58,62,30,68),
  ],
  alaves:[
    _p("ala-1","Antonio Sivera","POR","POR",76,28,"ES",58,18,58,38,16,76),
    _p("ala-2","Raúl Fernández","POR","POR",72,30,"ES",55,16,54,36,14,72),
    _p("ala-3","Nahuel Tenaglia","LD","DEF",74,28,"AR",76,48,66,62,72,70),
    _p("ala-4","Facundo Garcés","DFC","DEF",75,25,"AR",64,38,64,52,76,78),
    _p("ala-5","Iurie Iovu","DFC","DEF",72,24,"MD",62,36,62,50,74,74),
    _p("ala-6","Jonny Otto","LD","DEF",74,29,"ES",78,52,68,64,70,68),
    _p("ala-7","Jon Pacheco","DFC","DEF",73,27,"ES",62,36,64,50,74,74),
    _p("ala-8","Ander Guevara","MCD","MED",76,25,"ES",68,58,74,66,72,72),
    _p("ala-9","Antonio Blanco","MCD","MED",74,24,"ES",70,58,72,64,70,70),
    _p("ala-10","Jon Guridi","MC","MED",73,25,"ES",70,60,72,66,60,68),
    _p("ala-11","Carlos Benavidez","MC","MED",72,24,"UY",72,60,72,68,56,68),
    _p("ala-12","Carles Aleñá","MC","MED",74,27,"ES",70,64,76,72,52,66),
    _p("ala-13","Denis Suárez","MCO","MED",75,31,"ES",72,68,78,74,48,66),
    _p("ala-14","Calebe","MC","MED",73,23,"BR",74,62,72,70,50,68),
    _p("ala-15","Toni Martínez","DC","DEL",76,30,"ES",72,78,60,64,34,78),
    _p("ala-16","Abde Rebbach","EI","DEL",74,23,"MA",86,66,62,80,30,66),
    _p("ala-17","Lucas Boyé","DC","DEL",74,28,"AR",78,74,60,70,32,76),
    _p("ala-18","Ibrahim Diabate","DC","DEL",72,23,"CI",74,72,56,64,30,76),
    _p("ala-19","Mariano Díaz","DC","DEL",73,30,"DO",76,74,58,66,32,76),
  ],
  laspalmas:[ // Elche CF
    _p("elc-1","Matías Dituro","POR","POR",76,34,"AR",56,18,56,36,14,76),
    _p("elc-2","Axel Werner","POR","POR",71,26,"AR",54,16,52,34,12,71),
    _p("elc-3","Iñaki Peña","POR","POR",74,26,"ES",56,18,58,36,14,74),
    _p("elc-4","John Donald","DFC","DEF",72,25,"SE",62,34,60,48,74,74),
    _p("elc-5","Pedro Bigas","DFC","DEF",73,31,"ES",60,34,62,48,74,76),
    _p("elc-6","Léo Pétrot","LI","DEF",72,27,"FR",72,42,62,58,70,66),
    _p("elc-7","Víctor Chust","DFC","DEF",73,25,"ES",62,34,62,48,74,72),
    _p("elc-8","Héctor Fort","LD","DEF",73,21,"ES",76,44,64,62,70,64),
    _p("elc-9","Adrià Pedrosa","LI","DEF",73,26,"ES",74,44,64,60,70,64),
    _p("elc-10","Aleix Febas","MC","MED",74,29,"ES",68,62,72,66,54,64),
    _p("elc-11","Marc Aguado","MCD","MED",72,24,"ES",68,56,68,60,66,66),
    _p("elc-12","Federico Redondo","MC","MED",74,23,"AR",70,62,74,68,54,66),
    _p("elc-13","Gonzalo Villar","MC","MED",74,26,"ES",68,60,74,66,54,64),
    _p("elc-14","Martim Neto","MC","MED",70,22,"PT",68,56,68,62,56,64),
    _p("elc-15","Álvaro Rodríguez","DC","DEL",74,22,"ES",74,72,62,66,30,68),
    _p("elc-16","André Silva","DC","DEL",76,30,"PT",72,76,62,64,32,74),
    _p("elc-17","Josan","EI","DEL",72,30,"ES",78,66,62,72,28,62),
    _p("elc-18","Grady Diangana","EI","DEL",73,27,"CD",82,66,62,74,28,64),
    _p("elc-19","Rafa Mir","DC","DEL",74,27,"ES",70,74,60,62,32,74),
  ],
  barcelona:[
    _p("bar-1","Wojciech Szczęsny","POR","POR",84,35,"PL",55,20,62,38,16,84),
    _p("bar-2","Joan García","POR","POR",78,23,"ES",58,18,60,38,16,78),
    _p("bar-3","Álex Balde","LI","DEF",82,21,"ES",86,58,74,76,76,76),
    _p("bar-4","Ronald Araújo","DFC","DEF",85,26,"UY",70,50,70,60,87,86),
    _p("bar-5","Andreas Christensen","DFC","DEF",82,29,"DK",66,44,76,60,84,76),
    _p("bar-6","Jules Koundé","LD","DEF",85,26,"FR",82,58,76,76,86,80),
    _p("bar-7","Pau Cubarsí","DFC","DEF",83,18,"ES",68,44,76,62,84,76),
    _p("bar-8","Eric García","DFC","DEF",78,24,"ES",64,40,72,58,80,72),
    _p("bar-9","João Cancelo","LD","DEF",84,31,"PT",84,62,78,78,80,76),
    _p("bar-10","Gavi","MC","MED",85,20,"ES",78,74,84,84,68,76),
    _p("bar-11","Pedri","MC","MED",88,23,"ES",80,78,88,90,60,72),
    _p("bar-12","Fermín López","MC","MED",81,22,"ES",78,76,80,80,56,72),
    _p("bar-13","Frenkie de Jong","MC","MED",85,28,"NL",76,70,86,82,64,78),
    _p("bar-14","Marc Casadó","MCD","MED",78,21,"ES",72,60,78,70,72,72),
    _p("bar-15","Dani Olmo","MCO","MED",85,27,"ES",82,80,84,84,52,74),
    _p("bar-16","Ferrán Torres","ED","DEL",80,25,"ES",84,78,72,82,40,70),
    _p("bar-17","Robert Lewandowski","DC","DEL",88,37,"PL",74,92,78,80,36,80),
    _p("bar-18","Raphinha","ED","DEL",87,28,"BR",90,84,78,88,38,72),
    _p("bar-19","Lamine Yamal","ED","DEL",92,18,"ES",92,86,84,94,36,68),
    _p("bar-20","Marcus Rashford","EI","DEL",82,27,"EN",90,78,72,84,42,76),
  ],
  getafe:[
    _p("get-1","David Soria","POR","POR",78,30,"ES",58,18,60,38,16,78),
    _p("get-2","Jiri Letacek","POR","POR",70,26,"CZ",54,16,54,36,14,70),
    _p("get-3","Djené","DFC","DEF",77,31,"TG",70,38,62,54,79,80),
    _p("get-4","Domingos Duarte","DFC","DEF",76,30,"PT",64,38,64,52,78,80),
    _p("get-5","Juan Iglesias","DFC","DEF",72,26,"ES",62,34,62,50,74,74),
    _p("get-6","Diego Rico","LI","DEF",74,31,"ES",74,46,68,60,72,68),
    _p("get-7","Kiko Femenía","LD","DEF",74,33,"ES",76,48,68,62,72,68),
    _p("get-8","Zaid Romero","DFC","DEF",73,25,"AR",66,36,62,52,74,76),
    _p("get-9","Allan Nyom","LD","DEF",72,34,"CM",76,46,62,62,70,70),
    _p("get-10","Luis Milla","MC","MED",76,27,"ES",68,62,74,68,62,70),
    _p("get-11","Mauro Arambarri","MCD","MED",77,29,"UY",70,60,72,64,74,76),
    _p("get-12","Javi Muñoz","MC","MED",72,26,"ES",68,60,72,66,58,68),
    _p("get-13","Mario Martín","MC","MED",68,21,"ES",66,58,68,62,54,64),
    _p("get-14","Borja Mayoral","DC","DEL",78,28,"ES",74,78,66,70,36,74),
    _p("get-15","Juanmi","DC","DEL",74,32,"ES",74,74,64,68,34,68),
    _p("get-16","Álex Sancris","EI","DEL",70,22,"ES",80,64,60,72,30,64),
    _p("get-17","Adrián Liso","EI","DEL",72,21,"ES",82,66,62,74,28,64),
    _p("get-18","Abu Kamara","ED","DEL",74,23,"SL",84,68,64,76,30,70),
    _p("get-19","Martín Satriano","DC","DEL",74,24,"UY",72,74,60,66,34,76),
    _p("get-20","Veljko Birmancevic","ED","DEL",74,26,"RS",82,68,64,76,30,68),
  ],
  girona:[
    _p("gir-1","M-A. ter Stegen","POR","POR",85,33,"DE",58,20,64,40,18,85),
    _p("gir-2","Paulo Gazzaniga","POR","POR",78,33,"AR",56,18,58,38,16,78),
    _p("gir-3","Rubén Blanco","POR","POR",74,31,"ES",56,18,56,38,14,74),
    _p("gir-4","Arnau Martínez","LD","DEF",77,23,"ES",80,52,70,66,74,70),
    _p("gir-5","David López","DFC","DEF",77,33,"ES",60,38,68,54,78,76),
    _p("gir-6","Daley Blind","DFC","DEF",78,35,"NL",62,40,76,60,78,70),
    _p("gir-7","Vitor Reis","DFC","DEF",76,20,"BR",68,40,66,56,77,76),
    _p("gir-8","Álex Moreno","LI","DEF",78,31,"ES",80,52,72,70,74,70),
    _p("gir-9","Alejandro Francés","DFC","DEF",75,24,"ES",64,38,66,54,76,74),
    _p("gir-10","Iván Martín","MCO","MED",78,24,"ES",76,72,78,76,50,68),
    _p("gir-11","Donny van de Beek","MC","MED",77,28,"NL",74,68,78,74,56,72),
    _p("gir-12","Thomas Lemar","MC","MED",79,29,"FR",78,72,82,80,52,68),
    _p("gir-13","Axel Witsel","MCD","MED",78,36,"BE",62,60,74,62,74,76),
    _p("gir-14","Fran Beltrán","MCD","MED",76,27,"ES",68,60,76,64,70,70),
    _p("gir-15","Azzedine Ounahi","MC","MED",76,25,"MA",76,64,74,74,58,70),
    _p("gir-16","Claudio Echeverri","MCO","MED",76,20,"AR",78,70,76,80,44,66),
    _p("gir-17","Cristhian Stuani","DC","DEL",77,38,"UY",72,80,62,64,36,78),
    _p("gir-18","Viktor Tsygankov","EI","DEL",78,27,"UA",86,72,70,82,32,68),
    _p("gir-19","Bryan Gil","EI","DEL",76,24,"ES",88,68,70,82,30,64),
    _p("gir-20","Abel Ruiz","DC","DEL",74,25,"ES",72,74,64,66,34,72),
    _p("gir-21","Portu","ED","DEL",74,32,"ES",82,68,66,76,32,66),
  ],
  leganes:[ // Levante UD
    _p("lev-1","Mathew Ryan","POR","POR",76,33,"AU",56,18,58,36,14,76),
    _p("lev-2","Pablo Campos","POR","POR",68,24,"ES",54,14,52,34,12,68),
    _p("lev-3","Alan Matturro","DFC","DEF",72,22,"UY",64,34,60,48,74,74),
    _p("lev-4","Víctor García","DFC","DEF",70,24,"ES",62,32,60,46,72,72),
    _p("lev-5","Jeremy Toljan","LD","DEF",73,30,"DE",76,46,64,62,70,66),
    _p("lev-6","Manu Sánchez","LI","DEF",74,26,"ES",74,46,66,62,70,66),
    _p("lev-7","Matías Moreno","DFC","DEF",71,25,"CL",62,34,60,46,72,72),
    _p("lev-8","Unai Elgezabal","DFC","DEF",69,22,"ES",60,32,58,44,70,70),
    _p("lev-9","Unai Vencedor","MCD","MED",75,25,"ES",68,58,72,62,70,70),
    _p("lev-10","Kervin Arriaga","MC","MED",73,24,"HN",72,60,68,66,52,68),
    _p("lev-11","Carlos Álvarez","MC","MED",70,24,"ES",68,58,66,60,52,64),
    _p("lev-12","Ugo Raghouber","MC","MED",71,25,"FR",70,60,68,64,52,66),
    _p("lev-13","Pablo Martínez","MCD","MED",71,23,"ES",68,56,68,60,64,66),
    _p("lev-14","Iker Losada","MC","MED",72,25,"ES",70,62,70,66,48,62),
    _p("lev-15","Iván Romero","EI","DEL",74,27,"ES",80,68,64,74,28,64),
    _p("lev-16","José Luis Morales","EI","DEL",74,37,"ES",78,68,64,72,30,62),
    _p("lev-17","Roger Brugué","DC","DEL",70,24,"ES",70,68,58,60,30,68),
    _p("lev-18","Paco Cortés","DC","DEL",68,23,"ES",68,66,56,58,28,66),
    _p("lev-19","Karl Etta Eyong","ED","DEL",70,23,"CM",80,64,60,72,26,64),
  ],
  mallorca:[
    _p("mal-1","Leo Román","POR","POR",74,22,"ES",56,16,56,36,14,74),
    _p("mal-2","Lucas Bergström","POR","POR",72,23,"SE",55,16,54,36,14,72),
    _p("mal-3","Toni Lato","LI","DEF",74,29,"ES",74,46,66,60,72,68),
    _p("mal-4","Pablo Maffeo","LD","DEF",76,27,"ES",80,50,68,66,74,70),
    _p("mal-5","Antonio Raíllo","DFC","DEF",77,33,"ES",60,38,66,54,78,78),
    _p("mal-6","Martin Valjent","DFC","DEF",76,30,"SK",62,38,66,52,78,76),
    _p("mal-7","Johan Mojica","LI","DEF",75,32,"CO",76,46,66,64,72,70),
    _p("mal-8","Marash Kumbulla","DFC","DEF",74,26,"AL",64,38,64,52,76,74),
    _p("mal-9","Mateu Morey","LD","DEF",72,25,"ES",76,46,64,62,70,66),
    _p("mal-10","Omar Mascarell","MCD","MED",74,32,"ES",62,56,72,60,72,68),
    _p("mal-11","Sergi Darder","MC","MED",78,29,"ES",72,68,78,72,58,68),
    _p("mal-12","Samú Costa","MCD","MED",74,24,"PT",70,58,70,64,68,70),
    _p("mal-13","Antonio Sánchez","MC","MED",72,24,"ES",68,58,68,62,60,66),
    _p("mal-14","Pablo Torre","MCO","MED",74,22,"ES",72,66,74,72,44,64),
    _p("mal-15","Manu Morlanes","MC","MED",72,28,"ES",68,58,70,62,60,66),
    _p("mal-16","Vedat Muriqi","DC","DEL",79,31,"XK",72,80,60,64,36,82),
    _p("mal-17","Abdón Prats","DC","DEL",74,32,"ES",68,74,60,62,32,72),
    _p("mal-18","Takuma Asano","ED","DEL",74,30,"JP",86,68,62,76,28,66),
    _p("mal-19","Zito Luvumbo","EI","DEL",74,23,"AO",86,66,62,76,28,66),
    _p("mal-20","Mateo Joseph","DC","DEL",70,22,"EN",74,68,60,64,30,68),
  ],
  rayo:[
    _p("ray-1","Dani Cárdenas","POR","POR",76,27,"ES",58,18,58,38,14,76),
    _p("ray-2","Augusto Batalla","POR","POR",72,26,"AR",54,16,54,36,14,72),
    _p("ray-3","Andrei Ratiu","LD","DEF",75,26,"RO",78,48,66,64,72,68),
    _p("ray-4","Pep Chavarría","DFC","DEF",72,26,"ES",62,36,62,50,74,74),
    _p("ray-5","Alfonso Espino","LI","DEF",74,29,"ES",74,46,66,60,72,68),
    _p("ray-6","Abdul Mumin","DFC","DEF",74,27,"GH",66,38,62,52,76,78),
    _p("ray-7","Florian Lejeune","DFC","DEF",74,34,"FR",62,38,66,52,76,74),
    _p("ray-8","Luiz Felipe","DFC","DEF",76,28,"BR",66,40,68,56,78,76),
    _p("ray-9","Iván Balliu","LD","DEF",72,32,"AL",76,44,62,60,70,66),
    _p("ray-10","Óscar Trejo","MCO","MED",76,34,"AR",70,68,76,72,50,64),
    _p("ray-11","Randy Nteka","MC","MED",73,26,"CG",74,62,70,68,54,70),
    _p("ray-12","Pathé Ciss","MCD","MED",74,31,"SN",70,56,68,62,72,72),
    _p("ray-13","Óscar Valentín","MC","MED",72,26,"ES",70,60,70,64,56,68),
    _p("ray-14","Unai López","MC","MED",74,28,"ES",72,64,74,70,56,68),
    _p("ray-15","Pedro Díaz","MCD","MED",74,26,"ES",70,58,72,64,70,70),
    _p("ray-16","Isi Palazón","ED","DEL",78,31,"ES",84,72,70,80,32,66),
    _p("ray-17","Álvaro García","EI","DEL",76,31,"ES",82,70,68,76,32,66),
    _p("ray-18","Jorge de Frutos","EI","DEL",74,28,"ES",80,66,66,76,30,64),
    _p("ray-19","Sergio Camello","DC","DEL",74,23,"ES",74,74,60,66,30,72),
    _p("ray-20","Ilias Akhomach","EI","DEL",74,21,"ES",86,66,64,78,28,62),
    _p("ray-21","Alemão","DC","DEL",72,27,"BR",74,72,58,64,30,72),
  ],
  espanyol:[
    _p("esp-1","Marko Dmitrovic","POR","POR",79,32,"RS",58,18,58,38,14,79),
    _p("esp-2","Ángel Fortuño","POR","POR",68,23,"ES",54,16,52,36,14,68),
    _p("esp-3","Rubén Sánchez","LD","DEF",73,28,"ES",74,46,64,62,72,68),
    _p("esp-4","Fernando Calero","DFC","DEF",75,29,"ES",62,36,64,52,76,76),
    _p("esp-5","Leandro Cabrera","DFC","DEF",75,33,"UY",62,36,64,52,76,78),
    _p("esp-6","Miguel Rubio","DFC","DEF",72,24,"ES",62,36,62,50,74,74),
    _p("esp-7","Carlos Romero","LI","DEF",72,24,"ES",72,44,62,58,70,66),
    _p("esp-8","Clemens Riedel","LD","DEF",71,24,"DE",74,44,62,60,68,66),
    _p("esp-9","Omar El Hilali","LI","DEF",70,22,"MA",72,42,60,58,68,64),
    _p("esp-10","Pol Lozano","MCD","MED",74,25,"ES",68,58,72,64,70,68),
    _p("esp-11","Edu Expósito","MC","MED",75,28,"ES",70,64,74,68,58,68),
    _p("esp-12","Ramón Terrats","MC","MED",74,27,"ES",70,62,74,68,56,66),
    _p("esp-13","Charles Pickel","MCD","MED",74,28,"CH",68,58,70,62,70,72),
    _p("esp-14","U. G. de Zárate","MC","MED",70,22,"ES",68,58,68,62,54,64),
    _p("esp-15","Javi Puado","ED","DEL",76,26,"ES",82,72,66,76,32,66),
    _p("esp-16","Pere Milla","EI","DEL",73,29,"ES",80,68,62,74,30,64),
    _p("esp-17","Kike García","DC","DEL",74,32,"ES",70,74,60,62,32,74),
    _p("esp-18","Cyril Ngonge","EI","DEL",75,24,"BE",86,70,64,78,28,66),
    _p("esp-19","Tyrhys Dolan","ED","DEL",72,24,"EN",84,66,62,74,28,62),
    _p("esp-20","Jofre Carreras","DC","DEL",70,21,"ES",72,68,58,62,30,68),
  ],
  betis:[
    _p("bet-1","Pau López","POR","POR",77,30,"ES",58,18,58,38,14,77),
    _p("bet-2","Álvaro Valles","POR","POR",76,27,"ES",58,18,60,38,14,76),
    _p("bet-3","Adrián","POR","POR",76,38,"ES",56,18,58,38,14,76),
    _p("bet-4","Héctor Bellerín","LD","DEF",76,30,"ES",80,52,70,68,72,68),
    _p("bet-5","Marc Bartra","DFC","DEF",76,34,"ES",64,40,72,58,76,72),
    _p("bet-6","Diego Llorente","DFC","DEF",77,31,"ES",64,40,70,56,78,74),
    _p("bet-7","Ricardo Rodríguez","LI","DEF",75,32,"CH",74,46,70,62,74,68),
    _p("bet-8","Natan","DFC","DEF",74,23,"BR",66,38,64,54,76,76),
    _p("bet-9","Junior Firpo","LI","DEF",75,28,"DO",78,48,68,66,72,70),
    _p("bet-10","Valentín Gómez","DFC","DEF",73,22,"AR",64,36,62,50,74,76),
    _p("bet-11","Pablo Fornals","MC","MED",80,29,"ES",76,70,80,78,52,68),
    _p("bet-12","Isco","MCO","MED",83,33,"ES",70,76,86,86,48,66),
    _p("bet-13","Marc Roca","MCD","MED",78,28,"ES",68,60,76,64,72,72),
    _p("bet-14","Giovani Lo Celso","MCO","MED",82,29,"AR",76,74,82,82,52,70),
    _p("bet-15","Nelson Deossa","MC","MED",76,24,"CO",76,66,76,76,52,70),
    _p("bet-16","Sofyan Amrabat","MCD","MED",78,29,"MA",70,58,74,64,76,78),
    _p("bet-17","Sergi Altimira","MCD","MED",74,25,"ES",68,58,72,64,68,68),
    _p("bet-18","Álvaro Fidalgo","MC","MED",74,27,"ES",70,64,74,68,54,66),
    _p("bet-19","Abde Ezzalzouli","EI","DEL",80,23,"MA",90,72,70,84,30,66),
    _p("bet-20","Cucho Hernández","DC","DEL",80,26,"CO",82,78,66,76,34,78),
    _p("bet-21","Rodrigo Riquelme","EI","DEL",78,24,"ES",84,72,72,80,32,66),
    _p("bet-22","Chimy Ávila","DC","DEL",77,32,"AR",80,76,62,72,34,76),
    _p("bet-23","Antony","ED","DEL",76,25,"BR",86,70,66,82,30,64),
    _p("bet-24","Aitor Ruibal","ED","DEL",75,28,"ES",82,68,66,76,32,66),
  ],
  celta:[
    _p("cel-1","Iván Villar","POR","POR",76,27,"ES",58,18,58,38,14,76),
    _p("cel-2","Ionuț Radu","POR","POR",73,28,"RO",56,16,54,36,14,73),
    _p("cel-3","Carl Starfelt","DFC","DEF",77,30,"SE",64,38,66,54,78,76),
    _p("cel-4","Óscar Mingueza","LD","DEF",76,25,"ES",78,50,70,66,74,68),
    _p("cel-5","Mihailo Ristic","LI","DEF",74,27,"RS",76,46,66,62,72,68),
    _p("cel-6","Marcos Alonso","LI","DEF",76,34,"ES",72,50,70,62,74,70),
    _p("cel-7","Joseph Aidoo","DFC","DEF",76,29,"GH",68,38,62,54,78,80),
    _p("cel-8","Sergio Carreira","LD","DEF",71,22,"ES",76,44,62,60,68,64),
    _p("cel-9","Javi Rueda","DFC","DEF",70,23,"ES",62,32,60,46,72,72),
    _p("cel-10","Hugo Sotelo","MC","MED",73,24,"ES",72,62,72,68,54,66),
    _p("cel-11","Ilaix Moriba","MC","MED",76,22,"GN",76,64,72,72,58,74),
    _p("cel-12","Matías Vecino","MCD","MED",77,33,"UY",68,62,72,62,70,76),
    _p("cel-13","Iago Aspas","SD","DEL",83,37,"ES",76,84,82,84,44,70),
    _p("cel-14","Franco Cervi","EI","DEL",74,30,"AR",84,68,66,78,30,64),
    _p("cel-15","Williot Swedberg","ED","DEL",74,22,"SE",82,68,66,76,30,66),
    _p("cel-16","Ferran Jutglà","DC","DEL",76,26,"ES",76,76,64,70,32,70),
    _p("cel-17","Borja Iglesias","DC","DEL",78,32,"ES",72,78,62,68,34,74),
    _p("cel-18","Hugo Álvarez","MC","MED",71,21,"ES",70,62,70,66,52,64),
  ],
  realmadrid:[
    _p("rma-1","Thibaut Courtois","POR","POR",90,33,"BE",58,22,66,42,18,90),
    _p("rma-2","Andriy Lunin","POR","POR",82,26,"UA",58,18,60,40,16,82),
    _p("rma-3","Dani Carvajal","LD","DEF",84,33,"ES",82,60,76,72,82,76),
    _p("rma-4","Éder Militão","DFC","DEF",85,27,"BR",72,48,70,62,86,82),
    _p("rma-5","David Alaba","DFC","DEF",83,33,"AT",70,52,78,68,84,76),
    _p("rma-6","Fran García","LI","DEF",78,25,"ES",80,50,70,68,74,70),
    _p("rma-7","Antonio Rüdiger","DFC","DEF",84,32,"DE",70,46,68,58,86,84),
    _p("rma-8","Ferland Mendy","LI","DEF",82,30,"FR",82,52,70,70,80,76),
    _p("rma-9","Trent Alexander-Arnold","LD","DEF",86,27,"EN",84,64,84,78,80,74),
    _p("rma-10","Dean Huijsen","DFC","DEF",78,20,"NL",68,42,68,56,80,76),
    _p("rma-11","Raúl Asencio","DFC","DEF",76,22,"ES",66,40,64,54,78,76),
    _p("rma-12","Álvaro Carreras","LI","DEF",76,23,"ES",78,48,68,66,72,68),
    _p("rma-13","Jude Bellingham","MC","MED",91,22,"EN",84,84,86,88,70,82),
    _p("rma-14","Eduardo Camavinga","MC","MED",85,22,"FR",82,72,80,82,68,78),
    _p("rma-15","Fede Valverde","MC","MED",87,27,"UY",84,78,82,82,68,82),
    _p("rma-16","Aurélien Tchouaméni","MCD","MED",85,25,"FR",76,66,78,72,78,80),
    _p("rma-17","Dani Ceballos","MC","MED",78,29,"ES",74,66,80,76,58,68),
    _p("rma-18","Brahim Díaz","MCO","MED",82,26,"ES",84,76,78,84,42,66),
    _p("rma-19","Arda Güler","MCO","MED",82,20,"TR",76,78,82,84,44,64),
    _p("rma-20","Franco Mastantuono","MC","MED",76,18,"AR",76,68,76,78,46,66),
    _p("rma-21","Vinícius Júnior","EI","DEL",92,25,"BR",96,84,78,94,36,76),
    _p("rma-22","Rodrygo","EI","DEL",87,24,"BR",88,82,78,88,38,72),
    _p("rma-23","Kylian Mbappé","DC","DEL",93,27,"FR",97,90,82,90,40,80),
    _p("rma-24","Arda Güler","MCO","MED",82,20,"TR",76,78,82,84,44,64),
  ],
  realsociedad:[
    _p("rso-1","Álex Remiro","POR","POR",82,30,"ES",58,18,62,40,16,82),
    _p("rso-2","Unai Marrero","POR","POR",68,22,"ES",55,16,54,36,14,68),
    _p("rso-3","Álvaro Odriozola","LD","DEF",76,29,"ES",80,52,70,68,72,68),
    _p("rso-4","Aihen Muñoz","LI","DEF",74,27,"ES",76,46,66,62,70,66),
    _p("rso-5","Igor Zubeldia","DFC","DEF",78,27,"ES",64,40,70,58,80,76),
    _p("rso-6","Aritz Elustondo","DFC","DEF",75,32,"ES",62,36,66,52,76,74),
    _p("rso-7","Duje Caleta-Car","DFC","DEF",77,29,"HR",64,40,68,56,78,78),
    _p("rso-8","Jon Aramburu","LD","DEF",73,25,"ES",76,46,64,62,70,66),
    _p("rso-9","Sergio Gómez","LI","DEF",76,24,"ES",78,50,72,68,72,66),
    _p("rso-10","Arsen Zakharyan","MC","MED",78,22,"RU",78,70,78,78,54,68),
    _p("rso-11","Takefusa Kubo","ED","DEL",83,23,"JP",86,76,80,86,44,66),
    _p("rso-12","Beñat Turrientes","MCD","MED",76,23,"ES",70,58,74,66,70,70),
    _p("rso-13","Brais Méndez","MC","MED",80,28,"ES",78,72,78,76,54,70),
    _p("rso-14","Luka Sucic","MC","MED",78,23,"HR",76,68,78,76,52,68),
    _p("rso-15","Yangel Herrera","MC","MED",78,27,"VE",72,64,74,68,62,72),
    _p("rso-16","Carlos Soler","MC","MED",79,28,"ES",74,72,80,76,56,70),
    _p("rso-17","Jon Gorrotxategi","MCD","MED",71,22,"ES",68,56,68,62,64,66),
    _p("rso-18","Ander Barrenetxea","EI","DEL",78,23,"ES",86,70,72,80,32,66),
    _p("rso-19","Mikel Oyarzabal","DC","DEL",84,28,"ES",78,82,80,82,44,72),
    _p("rso-20","Gonçalo Guedes","EI","DEL",78,28,"PT",84,72,70,80,34,68),
    _p("rso-21","Orri Óskarsson","DC","DEL",74,22,"IS",76,74,64,68,32,72),
    _p("rso-22","Jon Karrikaburu","DC","DEL",72,22,"ES",74,70,62,66,30,68),
  ],
  sevilla:[
    _p("sev-1","Ørjan Nyland","POR","POR",78,34,"NO",56,18,58,36,14,78),
    _p("sev-2","Odysseas Vlachodimos","POR","POR",76,30,"GR",56,18,56,36,14,76),
    _p("sev-3","Kike Salas","DFC","DEF",75,24,"ES",64,38,64,52,76,74),
    _p("sev-4","Tanguy Nianzou","DFC","DEF",77,23,"FR",70,40,64,56,78,78),
    _p("sev-5","Marcão","DFC","DEF",76,28,"BR",64,38,62,52,78,80),
    _p("sev-6","César Azpilicueta","LD","DEF",76,36,"ES",72,48,72,62,76,68),
    _p("sev-7","Juanlu Sánchez","LD","DEF",74,23,"ES",76,48,66,62,70,66),
    _p("sev-8","Gabriel Suazo","LI","DEF",73,28,"CL",74,44,64,60,70,66),
    _p("sev-9","Federico Gattoni","DFC","DEF",73,26,"AR",62,36,62,50,74,76),
    _p("sev-10","Fábio Cardoso","DFC","DEF",72,30,"PT",60,34,62,48,74,74),
    _p("sev-11","Nemanja Gudelj","MCD","MED",76,33,"RS",62,56,70,58,72,72),
    _p("sev-12","Djibril Sow","MCD","MED",77,28,"CH",70,60,72,64,72,74),
    _p("sev-13","Joan Jordán","MC","MED",76,30,"ES",70,62,74,66,62,68),
    _p("sev-14","Lucien Agoumé","MC","MED",74,23,"FR",70,60,72,66,60,70),
    _p("sev-15","Batista Mendy","MC","MED",73,24,"SN",72,60,70,66,58,68),
    _p("sev-16","Manu Bueno","MC","MED",72,24,"ES",68,60,70,64,54,66),
    _p("sev-17","Isaac Romero","DC","DEL",77,24,"ES",72,78,62,66,34,76),
    _p("sev-18","Alexis Sánchez","EI","DEL",78,37,"CL",80,76,74,80,36,66),
    _p("sev-19","Chidera Ejuke","EI","DEL",74,27,"NG",88,66,62,78,28,64),
    _p("sev-20","Rubén Vargas","EI","DEL",75,26,"CH",84,68,66,76,30,66),
    _p("sev-21","Neal Maupay","DC","DEL",74,29,"FR",74,74,60,66,30,70),
    _p("sev-22","Adnan Januzaj","EI","DEL",72,31,"BE",78,68,68,76,30,62),
  ],
  valencia:[
    _p("val-1","Giorgi Mamardashvili","POR","POR",83,24,"GE",58,18,60,40,16,83),
    _p("val-2","Stole Dimitrievski","POR","POR",76,31,"MK",56,18,56,36,14,76),
    _p("val-3","Cristian Rivero","POR","POR",68,23,"ES",54,16,52,34,12,68),
    _p("val-4","Mouctar Diakhaby","DFC","DEF",76,28,"FR",68,38,62,54,78,80),
    _p("val-5","José Gayà","LI","DEF",80,30,"ES",78,52,74,70,76,70),
    _p("val-6","Cenk Özkacar","DFC","DEF",74,24,"TR",64,36,62,50,76,76),
    _p("val-7","Jesús Vázquez","LI","DEF",72,22,"ES",74,44,62,60,68,64),
    _p("val-8","Tárrega","DFC","DEF",72,22,"ES",62,34,60,48,74,72),
    _p("val-9","André Almeida","LD","DEF",74,26,"PT",76,48,66,62,72,68),
    _p("val-10","Javi Guerra","MC","MED",76,23,"ES",72,64,74,68,56,68),
    _p("val-11","Pepelu","MC","MED",77,26,"ES",70,64,76,68,60,68),
    _p("val-12","Dani Wass","MC","MED",73,35,"DK",68,60,70,62,60,68),
    _p("val-13","Rioja","EI","DEL",74,28,"ES",82,68,64,76,30,64),
    _p("val-14","Danjuma","EI","DEL",76,28,"NL",86,72,66,80,30,66),
    _p("val-15","Hugo Duro","DC","DEL",76,24,"ES",74,76,62,66,34,74),
    _p("val-16","Diego López","DC","DEL",74,22,"ES",74,74,60,64,32,70),
    _p("val-17","Rafa Mir","DC","DEL",75,27,"ES",70,74,60,62,32,74),
    _p("val-18","Fran Pérez","EI","DEL",70,22,"ES",80,62,60,70,28,60),
    _p("val-19","Luis Rioja","ED","DEL",73,29,"ES",80,66,62,72,28,62),
  ],
  valladolid:[ // Real Oviedo
    _p("ovi-1","Aarón Escandell","POR","POR",74,26,"ES",56,16,56,36,12,74),
    _p("ovi-2","Horațiu Moldovan","POR","POR",75,28,"RO",56,18,58,36,14,75),
    _p("ovi-3","David Costas","DFC","DEF",73,29,"ES",62,36,64,50,74,74),
    _p("ovi-4","Dani Calvo","DFC","DEF",72,34,"ES",60,34,62,48,72,72),
    _p("ovi-5","Eric Bailly","DFC","DEF",73,31,"CI",66,34,60,48,74,74),
    _p("ovi-6","Álvaro Lemos","LD","DEF",72,25,"ES",74,42,62,58,68,64),
    _p("ovi-7","Nacho Vidal","LD","DEF",72,30,"ES",74,44,62,60,70,64),
    _p("ovi-8","Lucas Ahijado","LI","DEF",70,23,"ES",72,40,60,56,68,62),
    _p("ovi-9","Javi López","LD","DEF",70,28,"ES",72,42,60,58,66,62),
    _p("ovi-10","Santi Cazorla","MC","MED",72,40,"ES",60,64,78,70,44,54),
    _p("ovi-11","Leander Dendoncker","MCD","MED",75,30,"BE",68,58,68,60,70,74),
    _p("ovi-12","Nicolás Fonseca","MCD","MED",74,25,"UY",68,56,68,60,66,68),
    _p("ovi-13","Luka Ilic","MC","MED",72,22,"RS",70,62,72,66,50,62),
    _p("ovi-14","Kwasi Sibo","MC","MED",70,24,"GH",70,58,68,64,52,66),
    _p("ovi-15","Alberto Reina","MC","MED",70,25,"ES",68,58,66,62,50,64),
    _p("ovi-16","Haissem Hassan","EI","DEL",73,25,"ES",82,66,62,72,28,62),
    _p("ovi-17","Ilyas Chaira","EI","DEL",72,25,"ES",80,66,62,72,28,60),
    _p("ovi-18","Álex Forés","DC","DEL",70,25,"ES",70,68,58,60,28,66),
    _p("ovi-19","Thiago Fernández","DC","DEL",70,22,"ES",70,68,56,60,28,66),
    _p("ovi-20","Ovie Ejaria","MC","MED",72,28,"EN",74,64,70,68,46,64),
  ],
  villarreal:[
    _p("vil-1","Diego Conde","POR","POR",78,25,"ES",58,18,60,38,14,78),
    _p("vil-2","Filip Jörgensen","POR","POR",76,22,"SE",56,18,58,36,14,76),
    _p("vil-3","Alfonso Pedraza","LI","DEF",78,28,"ES",80,52,72,68,74,68),
    _p("vil-4","Juan Foyth","LD","DEF",80,27,"AR",80,52,70,68,78,72),
    _p("vil-5","Pau Torres","DFC","DEF",84,28,"ES",68,46,76,62,84,78),
    _p("vil-6","Raúl Albiol","DFC","DEF",78,39,"ES",56,38,72,54,80,70),
    _p("vil-7","Eric Bailly","DFC","DEF",74,31,"CI",68,36,60,50,76,76),
    _p("vil-8","Serge Aurier","LD","DEF",74,32,"CI",78,48,66,62,72,70),
    _p("vil-9","Dani Parejo","MC","MED",81,36,"ES",64,70,86,78,56,66),
    _p("vil-10","Étienne Capoue","MCD","MED",76,37,"FR",62,58,70,60,72,72),
    _p("vil-11","Santi Comesaña","MCD","MED",76,27,"ES",68,58,72,62,72,70),
    _p("vil-12","Francis Coquelin","MCD","MED",75,34,"FR",66,54,68,60,72,72),
    _p("vil-13","Nico Paz","MC","MED",78,20,"AR",76,70,78,78,50,66),
    _p("vil-14","Álex Baena","MCO","MED",83,24,"ES",84,76,80,84,44,70),
    _p("vil-15","Yeremy Pino","ED","DEL",82,23,"ES",88,76,74,84,36,68),
    _p("vil-16","Samuel Chukwueze","ED","DEL",78,26,"NG",90,72,66,82,28,66),
    _p("vil-17","Gerard Moreno","DC","DEL",82,33,"ES",76,84,76,78,38,72),
    _p("vil-18","Thierno Barry","DC","DEL",74,23,"FR",78,74,62,68,30,74),
    _p("vil-19","Ilias Akhomach","EI","DEL",74,21,"ES",86,66,64,78,28,62),
    _p("vil-20","Jose Luis Morales","EI","DEL",73,36,"ES",78,68,64,72,30,62),
  ],
};

const TEAM_REAL_AVG = {
  athletic:79, atletico:85, osasuna:74, alaves:72,
  laspalmas:73, barcelona:88, getafe:73, girona:77,
  leganes:72, rayo:74, espanyol:74, betis:78,
  celta:75, mallorca:74, realmadrid:90, realsociedad:79,
  sevilla:76, valencia:75, valladolid:72, villarreal:79,
};

function generatePlayers(teamId) {
  return REAL_SQUADS[teamId] || REAL_SQUADS.athletic;
}

function getScoutingPool(game) {
  const owned=new Set((game?.players??[]).map(player=>player.id));
  const bought=new Set((game?.transfers??[]).filter(item=>item.type==="buy").map(item=>item.player?.id));
  const freeAgentIds=new Set((game?.freeAgents??[]).map(player=>player.id));
  const season=game?.season??"2025", matchday=game?.matchday??1;
  const external=TEAMS.filter(team=>team.id!==game?.teamId).flatMap(team=>(REAL_SQUADS[team.id]??[]).filter(player=>!owned.has(player.id)&&!bought.has(player.id)&&!freeAgentIds.has(player.id)).map(player=>({...enrichPlayerProfile(ensurePlayerLifecycle(player,season,matchday),season),_teamId:team.id,_teamName:team.name,_teamColor:team.color})));
  const migratedFreeAgents=(game?.freeAgents??[]).filter(player=>!owned.has(player.id)).map(player=>({...enrichPlayerProfile(ensurePlayerLifecycle(player,season,matchday),season),_teamId:"agente_libre",_teamName:"Agente libre",_teamColor:"#6b7280"}));
  const soldFreeAgents=(game?.transfers??[]).filter(item=>item.type==="sell"&&!owned.has(item.player?.id)).map(item=>({...enrichPlayerProfile(ensurePlayerLifecycle(item.player,season,matchday),season),_teamId:"agente_libre",_teamName:"Agente libre",_teamColor:"#6b7280"}));
  const freeAgents=[...migratedFreeAgents,...soldFreeAgents];
  const unique=[...external,...freeAgents].filter((player,index,array)=>array.findIndex(item=>item.id===player.id)===index);
  if(game?.teamId!=="athletic")return unique;
  const basqueDevelopmentClubs=new Set(["realsociedad","osasuna","alaves"]);
  return unique.filter(player=>typeof player.athleticEligible==="boolean"?player.athleticEligible:player._teamId==="agente_libre"||(basqueDevelopmentClubs.has(player._teamId)&&player.nat==="ES"));
}

function generateFixtures() {
  const teamIds = TEAMS.map(t => t.id);
  const n = teamIds.length; // 20
  const fixtures = [];
  let id = 1;

  // Circle (round-robin) algorithm — fixes the fixed team at position 0
  // Each team plays home once and away once vs every other team across 38 jornadas
  const rotating = [...teamIds.slice(1)]; // teams 1..19 rotate
  const fixed    = teamIds[0];            // team 0 is fixed

  const rounds = []; // 19 rounds × 10 pairs

  for (let r = 0; r < n - 1; r++) {
    const circle = [fixed, ...rotating];
    const pairs  = [];
    for (let i = 0; i < n / 2; i++) {
      // Alternate which side is home to ensure balance across rounds
      if ((r + i) % 2 === 0) {
        pairs.push([circle[i], circle[n - 1 - i]]);
      } else {
        pairs.push([circle[n - 1 - i], circle[i]]);
      }
    }
    rounds.push(pairs);
    // Rotate: last element of rotating goes to front
    rotating.unshift(rotating.pop());
  }

  // Primera vuelta (J1–J19)
  rounds.forEach((pairs, r) => {
    pairs.forEach(([h, a]) => {
      fixtures.push({
        id: id++, matchday: r + 1,
        homeTeamId: h, awayTeamId: a,
        played: false, homeGoals: null, awayGoals: null, events: []
      });
    });
  });

  // Segunda vuelta (J20–J38): invertir local/visitante de la primera
  rounds.forEach((pairs, r) => {
    pairs.forEach(([h, a]) => {
      fixtures.push({
        id: id++, matchday: r + 20,
        homeTeamId: a, awayTeamId: h,
        played: false, homeGoals: null, awayGoals: null, events: []
      });
    });
  });

  // Shuffle fixture order within each matchday so the sequence feels varied
  // (keeps matchday grouping intact)
  const byMatchday = {};
  fixtures.forEach(f => {
    if (!byMatchday[f.matchday]) byMatchday[f.matchday] = [];
    byMatchday[f.matchday].push(f);
  });
  const shuffled = [];
  Object.keys(byMatchday).sort((a,b)=>+a-+b).forEach(md => {
    const arr = byMatchday[md];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    shuffled.push(...arr);
  });

  return shuffled;
}

function initStandings() {
  return TEAMS.map(t => ({ teamId: t.id, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }));
}

// ─── TÁCTICAS ─────────────────────────────────────────────────────────────────

const DEFAULT_TACTICS = {
  mentalidad: "equilibrada",  // defensiva | equilibrada | ofensiva
  presion:    "media",        // baja | media | alta
  ritmo:      "normal",       // lento | normal | rapido
  estilo:     "posesion",     // directo | posesion | bandas | contraataque
  riesgo:     "normal",       // conservador | normal | agresivo
};

// Modificadores tácticos sobre la fuerza de ataque/defensa y cansancio
function tacticModifiers(tactics) {
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

// ─── MOTOR DE PARTIDO ────────────────────────────────────────────────────────

function calcTeamStrength(players, isHome, tactics = DEFAULT_TACTICS) {
  const available = players.filter(p => !p.injured && !p.suspended);
  const starters = available.slice(0, 11);
  if (starters.length === 0) return 60;

  const gkList   = starters.filter(p => p.group === "POR");
  const defList  = starters.filter(p => p.group === "DEF");
  const medList  = starters.filter(p => p.group === "MED");
  const delList  = starters.filter(p => p.group === "DEL");

  const avg    = starters.reduce((s, p) => s + p.overall, 0) / starters.length;
  const gkStr  = gkList.length  ? gkList.reduce((s,p)=>s+p.attrs.porteria,0)/gkList.length  : 65;
  const defStr = defList.length ? defList.reduce((s,p)=>s+p.attrs.defensa,0)/defList.length : 65;
  const medStr = medList.length ? medList.reduce((s,p)=>s+p.attrs.pase,0)/medList.length    : 65;
  const delStr = delList.length ? delList.reduce((s,p)=>s+p.attrs.tiro,0)/delList.length    : 65;

  const moraleAvg  = starters.reduce((s,p)=>s+p.morale,0)  / starters.length;
  const fatigueAvg = starters.reduce((s,p)=>s+p.fatigue,0) / starters.length;
  const tacticalSharpness = starters.reduce((s,p)=>s+(p.tacticalSharpness??0),0) / starters.length;

  const moraleBonus   = (moraleAvg - 70) * 0.12;
  const fatiguePenalty = fatigueAvg * 0.09;
  const homeBon        = isHome ? 3 : 0;

  const mod = tacticModifiers(tactics);

  const lineStrength =
    avg        * 0.40 +
    delStr     * 0.15 +
    medStr     * 0.15 +
    defStr     * 0.15 +
    gkStr      * 0.10 +
    moraleBonus * 0.05;

  return Math.max(35, lineStrength - fatiguePenalty + homeBon + mod.atkBonus * 0.5 + tacticalSharpness * .6);
}

function calcDefStrength(players, tactics = DEFAULT_TACTICS) {
  const available = players.filter(p => !p.injured && !p.suspended).slice(0, 11);
  if (!available.length) return 60;
  const defList = available.filter(p => p.group === "DEF");
  const gkList  = available.filter(p => p.group === "POR");
  const defAvg  = defList.length ? defList.reduce((s,p)=>s+p.attrs.defensa,0)/defList.length : 65;
  const gkAvg   = gkList.length  ? gkList.reduce((s,p)=>s+p.attrs.porteria,0)/gkList.length  : 65;
  const mod     = tacticModifiers(tactics);
  return Math.max(40, defAvg * 0.6 + gkAvg * 0.4 + mod.defBonus);
}

function simAIGame(homeTeam, awayTeam) {
  const hAvg = homeTeam.avg ?? TEAM_REAL_AVG[homeTeam.id];
  const aAvg = awayTeam.avg ?? TEAM_REAL_AVG[awayTeam.id];
  const hStr = hAvg + 3 + (Math.random() * 10 - 5);
  const aStr = aAvg +     (Math.random() * 10 - 5);
  const diff = hStr - aStr;
  const hGoals = Math.min(6, Math.max(0, Math.round(Math.random() * 2.5 + diff * 0.04)));
  const aGoals = Math.min(6, Math.max(0, Math.round(Math.random() * 2.2 - diff * 0.04)));

  // Generar eventos de gol con goleadores reales para que aparezcan en la clasificación de goleadores
  const events = [];
  const homeSquad = REAL_SQUADS[homeTeam.id] ?? [];
  const awaySquad = REAL_SQUADS[awayTeam.id] ?? [];
  const scorerWeight = p => p.group === "DEL" ? (p.attrs?.tiro??65)*1.2 : p.group === "MED" ? (p.attrs?.tiro??55)*.58 : p.group === "DEF" ? (p.attrs?.tiro??35)*.13 : 0;
  const weightedPick = (squad,counts={}) => {
    const candidates=squad.filter(p=>p.group!=="POR");
    const weighted=candidates.map(player=>({player,weight:scorerWeight(player)/(1+(counts[player.id]??0)*.7)}));
    let roll=Math.random()*weighted.reduce((sum,item)=>sum+item.weight,0);
    return weighted.find(item=>(roll-=item.weight)<=0)?.player??candidates[0]??null;
  };
  const homeCounts={},awayCounts={};

  for (let i = 0; i < hGoals; i++) {
    const scorer = weightedPick(homeSquad,homeCounts);if(scorer)homeCounts[scorer.id]=(homeCounts[scorer.id]??0)+1;
    const assistant = pick(homeSquad.filter(p => p.id !== scorer?.id && p.group !== "POR"));
    events.push({ minute: 1 + Math.floor(Math.random()*89), type: "GOAL", team: "home", playerId: scorer?.id, assistId: assistant?.id,
      description: `Gol de ${scorer?.name ?? homeTeam.name}.` });
  }
  for (let i = 0; i < aGoals; i++) {
    const scorer = weightedPick(awaySquad,awayCounts);if(scorer)awayCounts[scorer.id]=(awayCounts[scorer.id]??0)+1;
    const assistant = pick(awaySquad.filter(p => p.id !== scorer?.id && p.group !== "POR"));
    events.push({ minute: 1 + Math.floor(Math.random()*89), type: "GOAL", team: "away", playerId: scorer?.id, assistId: assistant?.id,
      description: `Gol de ${scorer?.name ?? awayTeam.name}.` });
  }

  return { homeGoals: hGoals, awayGoals: aGoals, events };
}

// Descripciones contextuales por estilo táctico
function goalDesc(scorer, tactics, team) {
  const name = scorer?.name ?? (team === "home" ? "El local" : "El visitante");
  const byStyle = {
    directo:      [`${name} remata de cabeza un balón largo.`, `Pase en profundidad y ${name} define sin dudar.`],
    posesion:     [`Tras una elaborada jugada de toque, ${name} marca.`, `${name} culmina una jugada de combinación de lujo.`],
    bandas:       [`Centro desde la banda y ${name} aparece en el segundo palo.`, `${name} recoge el rechace tras un centro al área.`],
    contraataque: [`Robo en el centro del campo y ${name} sentencia a la contra.`, `Transición rápida, ${name} se planta solo ante el portero.`],
  };
  const opts = byStyle[tactics?.estilo] ?? [`${name} marca un golazo.`];
  return opts[Math.floor(Math.random() * opts.length)];
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateSegmentEvents(segment, players, userStr, oppStr, score, tactics = DEFAULT_TACTICS, userIsHome = true, oppSquad = [], medicalContext = {}) {
  const events = [];
  const mod    = tacticModifiers(tactics);
  const diff   = userStr - oppStr;
  const minuteStart=Math.max(segment*15+1,medicalContext.minuteStart??segment*15+1);
  const minuteEnd=Math.min((segment+1)*15,medicalContext.minuteEnd??(segment+1)*15);
  const intervalMinutes=Math.max(1,minuteEnd-minuteStart+1);

  // Probabilidades base ajustadas por tácticas y diferencia de fuerza
  const hChanceProb = Math.min(0.75, Math.max(0.08, 0.24 + diff * 0.008 + mod.chancesRate));
  const aChanceProb = Math.min(0.65, Math.max(0.06, 0.18 - diff * 0.008));

  // Defensa rival reduce conversión de gol del usuario
  const oppDefStr   = calcDefStrength(oppSquad);
  const userDefStr  = calcDefStrength(players,tactics);
  const hGoalConv   = Math.min(0.78, Math.max(0.30, 0.52 + mod.goalConvRate - (oppDefStr - 65) * 0.003));
  const aGoalConv   = Math.min(0.65, Math.max(0.25, 0.42 - (userDefStr - 65) * 0.004));

  const attackers = players.filter(p => p.group === "DEL" && !p.injured && !p.suspended);
  const mids      = players.filter(p => p.group === "MED" && !p.injured && !p.suspended);
  const defs      = players.filter(p => p.group === "DEF" && !p.injured && !p.suspended);
  const gk        = players.find(p => p.group === "POR" && !p.injured && !p.suspended);
  const allField  = players.filter(p => p.group !== "POR" && !p.injured && !p.suspended);
  const min = () => minuteStart + Math.floor(Math.random() * Math.max(1,minuteEnd-minuteStart+1));

  // Jugadores del rival disponibles para marcar (atacantes y mediocentros del equipo contrario)
  const oppAttackers = oppSquad.filter(p => p.group === "DEL");
  const oppMids      = oppSquad.filter(p => p.group === "MED");
  const oppGk        = oppSquad.find(p => p.group === "POR");
  const oppScorerPool = oppAttackers.length ? oppAttackers : (oppMids.length ? oppMids : oppSquad);
  const pickOppScorer = () => oppScorerPool.length ? pick(oppScorerPool) : null;

  // ── ATAQUE LOCAL ──
  if (Math.random() < intervalProbability(hChanceProb,intervalMinutes)) {
    const scorer = pick(attackers.length ? attackers : allField);
    if (Math.random() < hGoalConv) {
      const isPenalty = Math.random() < 0.09;
      const assistant = isPenalty ? null : pick([...mids, ...attackers].filter(p => p?.id !== scorer?.id));
      events.push({
        minute: min(), type: isPenalty ? "PENALTY" : "GOAL", team: "user", playerId: scorer?.id, assistId: assistant?.id,
        description: isPenalty
          ? `¡PENALTI! ${scorer?.name ?? "Delantero"} transforma desde los once metros. ⚽`
          : `⚽ GOL — ${goalDesc(scorer, tactics, "home")}`,
      });
    } else {
      const creator = pick([...mids, ...attackers].filter(Boolean));
      const saved=Boolean(oppGk)&&Math.random()<.68;
      events.push({
        minute: min(), type: saved?"SAVE":"BIG_CHANCE", team: saved?"opp":"user", playerId:saved?oppGk.id:undefined,
        description: saved?`🧤 Gran parada de ${oppGk.name} ante ${scorer?.name??"el atacante"}.`:pick([
          `Ocasión clara de ${scorer?.name ?? "local"}. El disparo se va rozando el palo.`,
          `${creator?.name ?? "El centrocampista"} mete un pase de gol pero el portero adivina la esquina.`,
          `Remate al larguero de ${scorer?.name ?? "local"}. ¡Qué cerca estuvo!`,
        ]),
      });
    }
  }

  // ── ATAQUE VISITANTE ──
  if (Math.random() < intervalProbability(aChanceProb,intervalMinutes)) {
    if (Math.random() < aGoalConv) {
      const oppScorer = pickOppScorer();
      const isPenalty = Math.random() < 0.09;
      const assistant = isPenalty ? null : pick(oppSquad.filter(p => p.id !== oppScorer?.id && p.group !== "POR"));
      events.push({
        minute: min(), type: isPenalty ? "PENALTY" : "GOAL", team: "opp", playerId: oppScorer?.id, assistId: assistant?.id,
        description: isPenalty
          ? `¡PENALTI! ${oppScorer?.name ?? "El rival"} no falla desde los once metros.`
          : pick([
              `⚽ GOL — ${oppScorer?.name ?? "El rival"} sorprende con un disparo lejano inapelable.`,
              `⚽ GOL — Contragolpe letal, ${oppScorer?.name ?? "el delantero rival"} marca.`,
              `⚽ GOL — ${oppScorer?.name ?? "El rival"} remata a placer una jugada ensayada a balón parado.`,
            ]),
      });
    } else {
      const oppScorer = pickOppScorer();
      events.push({
        minute: min(), type: "BIG_CHANCE", team: "opp",
        description: pick([
          `${oppScorer?.name ?? "El visitante"} falla una ocasión clarísima ante el portero.`,
          gk ? `¡Paradón de ${gk.name}! Mantiene el resultado vivo.` : `El portero lo para in extremis.`,
          `Remate de ${oppScorer?.name ?? "el rival"} que se va alto por muy poco.`,
        ]),
      });
    }
  }

  // ── PARADA DESTACADA ──
  if (Math.random() < intervalProbability(0.12 + (tactics.mentalidad === "defensiva" ? 0.06 : 0),intervalMinutes) && gk) {
    events.push({
      minute: min(), type: "SAVE", team: "user",
      playerId:gk.id,
      description: pick([
        `🧤 Gran parada de ${gk.name}. El equipo le debe los tres puntos.`,
        `🧤 ${gk.name} vuela a su derecha y despeja el peligro.`,
        `🧤 Mano providencial de ${gk.name} bajo los palos.`,
      ]),
    });
  }

  // ── ACCIÓN DEFENSIVA DESTACADA ──
  if(Math.random()<intervalProbability(.18,intervalMinutes)){
    const userAction=Math.random()<.5;const defender=userAction?pick(defs.length?defs:allField):pick(oppSquad.filter(player=>player.group==="DEF"));
    if(defender)events.push({minute:min(),type:"DEFENSIVE_ACTION",team:userAction?"user":"opp",playerId:defender.id,description:userAction?`🛡️ ${defender.name} corta una ocasión peligrosa con una intervención decisiva.`:`🛡️ ${defender.name} frena el ataque con una gran acción defensiva.`});
  }

  // ── TARJETA AMARILLA LOCAL ──
  const yellowBaseHome = 0.16 + mod.yellowRisk + (tactics.presion === "alta" ? 0.05 : 0);
  if (Math.random() < intervalProbability(yellowBaseHome,intervalMinutes) && allField.length) {
    const carded = pick(tactics.presion === "alta" ? (defs.length ? defs : allField) : allField);
    const yellow={
      minute: min(), type: "YELLOW", team: "user", playerId: carded?.id,
      playerName:carded?.name,
      description: pick([
        `🟡 Tarjeta amarilla para ${carded?.name ?? "el jugador local"} por una entrada imprudente.`,
        `🟡 ${carded?.name ?? "El jugador"} llega tarde y ve la amarilla.`,
        `🟡 Amonestación para ${carded?.name ?? "el local"} por protestar al árbitro.`,
      ]),
    };
    events.push(promoteSecondYellow(yellow,medicalContext.yellowCounts?.user?.[carded?.id]??0));
  }

  // ── TARJETA AMARILLA VISITANTE ──
  const oppFieldPlayers = oppSquad.filter(p => p.group !== "POR");
  if (Math.random() < intervalProbability(0.14,intervalMinutes)) {
    const oppCarded = oppFieldPlayers.length ? pick(oppFieldPlayers) : null;
    const yellow={
      minute: min(), type: "YELLOW", team: "opp", playerId: oppCarded?.id,
      playerName:oppCarded?.name,
      description: pick([
        `🟡 Tarjeta amarilla para ${oppCarded?.name ?? "el centrocampista visitante"} por una falta táctica.`,
        `🟡 ${oppCarded?.name ?? "El defensa visitante"} corta un contragolpe y ve la amarilla.`,
        `🟡 Amonestación para ${oppCarded?.name ?? "el capitán visitante"} por protestar.`,
      ]),
    };
    events.push(promoteSecondYellow(yellow,medicalContext.yellowCounts?.opp?.[oppCarded?.id]??0));
  }

  // ── TARJETA ROJA ──
  if (Math.random() < intervalProbability(0.03,intervalMinutes)) {
    const side = Math.random() < 0.4 ? "home" : "away";
    if (side === "home" && allField.length) {
      const sent = pick(allField);
      events.push({
        minute: min(), type: "RED", team: "user", playerId: sent?.id,
        description: `🟥 ¡ROJA para ${sent?.name ?? "el local"}! El equipo se queda con diez.`,
      });
    } else {
      const oppSent = oppFieldPlayers.length ? pick(oppFieldPlayers) : null;
      events.push({
        minute: min(), type: "RED", team: "opp", playerId: oppSent?.id,
        description: `🟥 ¡ROJA para ${oppSent?.name ?? "el visitante"}! Entrada temeraria y el árbitro no duda.`,
      });
    }
  }

  // ── LESIÓN CONTEXTUAL ──
  // El riesgo combina cansancio, edad, minutos, partidos consecutivos y exigencia táctica.
  const injuryResult = Math.random()<intervalMinutes/15?rollContextualInjury(allField, { ...medicalContext, tactics, currentMatchMinutes:minuteEnd }):null;
  const injuryEvent = createInjuryEvent(injuryResult, min());
  if (injuryEvent) events.push(injuryEvent);

  return events.sort((a, b) => a.minute - b.minute);
}

// Cansancio extra por tramo según tácticas
function fatigueDeltaPerSegment(tactics) {
  let base = 3;
  if (tactics.presion === "alta")  base += 2;
  if (tactics.presion === "baja")  base -= 1;
  if (tactics.ritmo   === "rapido") base += 1.5;
  if (tactics.ritmo   === "lento")  base -= 1;
  return base;
}

// ─── UTILIDADES VISUALES ──────────────────────────────────────────────────────

function calculateBudgetSnapshot(game, team) {
  const players = game.players ?? [];
  const weeklyWages = players.reduce((sum, player) => sum + (player.salary ?? 0), 0);
  const matchday = game.matchday ?? 1;
  const matchdaysPlayed = Math.max(0, matchday - 1);
  const remainingMatchdays = Math.max(0, 38 - matchdaysPlayed);
  const baseBudget = (team?.budget ?? 50) * 1000;
  const totalWageSpent = matchdaysPlayed * weeklyWages;
  const clubCash = Math.max(0, Math.round(baseBudget - totalWageSpent + (game.budgetAdjustment ?? 0)));
  const pendingSalaries = Math.round(weeklyWages * remainingMatchdays);
  const pendingOperating = Math.round((4500 + (team?.fanbase ?? 2) * 650) * Math.max(.25, remainingMatchdays / 38));
  const incomeLog = game.incomeLog ?? [];
  const totalIncome = incomeLog.reduce((sum, item) => sum + (item.total ?? 0), 0);
  const netBalance = totalIncome - totalWageSpent;
  const securityRate = netBalance >= 15000 ? .10 : netBalance >= 0 ? .12 : .16;
  const salaryReserve = Math.round(pendingSalaries * .42);
  const operatingReserve = Math.round(pendingOperating * .50);
  const bonusReserve = Math.round(Math.max(500, clubCash * .02));
  const securityFund = Math.round(clubCash * securityRate);
  const reserved = Math.min(clubCash, Math.max(0, salaryReserve + operatingReserve + bonusReserve + securityFund));
  return {
    baseBudget,
    weeklyWages,
    totalWageSpent,
    clubCash,
    pendingSalaries,
    pendingOperating,
    pendingExpenses: pendingSalaries + pendingOperating,
    salaryReserve,
    operatingReserve,
    bonusReserve,
    securityFund,
    reserved,
    transferBudget: Math.max(0, clubCash - reserved),
    reservedPct: clubCash > 0 ? Math.round((reserved / clubCash) * 100) : 0,
  };
}

const RARITY_ACCENT = { BRONZE: "#cd853f", SILVER: "#9aa0b4", GOLD: "#c9a84c", SPECIAL: "#c4b5fd" };
const RARITY_BG = { BRONZE: "#2a1a0a", SILVER: "#14161a", GOLD: "#1a1700", SPECIAL: "#180e2a" };
const RARITY_LABEL = { BRONZE: "Bronce", SILVER: "Plata", GOLD: "Oro", SPECIAL: "Especial" };
const NAT_FLAG = { ES: "🇪🇸", FR: "🇫🇷", GH: "🇬🇭", BR: "🇧🇷", AR: "🇦🇷", PT: "🇵🇹", DE: "🇩🇪" };

function Initials({ name, size = 44, rarity = "GOLD", borderRadius = 8 }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const acc = RARITY_ACCENT[rarity];
  return (
    <div style={{ width: size, height: size, borderRadius, background: `${acc}22`, border: `1.5px solid ${acc}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 700, color: acc, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function StatBar({ label, value, accent }) {
  const color = value >= 80 ? "#22c55e" : value >= 65 ? "#c9a84c" : "#9aa0b4";
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 5 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".4px", color: accent, width: 30 }}>{label}</span>
      <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,.1)", borderRadius: 2, margin: "0 8px" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#e8eaf0", minWidth: 20, textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ─── CARTA DE JUGADOR ─────────────────────────────────────────────────────────

function PlayerCard({ player, onSelect, selected }) {
  const [flipped, setFlipped] = useState(false);
  const acc = RARITY_ACCENT[player.rarity];
  const bg = RARITY_BG[player.rarity];
  const moraleColor = player.morale >= 75 ? "#22c55e" : player.morale >= 50 ? "#f59e0b" : "#ef4444";
  const fatColor = player.fatigue <= 30 ? "#22c55e" : player.fatigue <= 60 ? "#f59e0b" : "#ef4444";
  const statKeys = ["ritmo", "tiro", "pase", "regate", "defensa", "fisico", "porteria"];
  const statLabels = { ritmo: "RIT", tiro: "TIR", pase: "PAS", regate: "REG", defensa: "DEF", fisico: "FIS", porteria: "POR" };

  const handleClick = (e) => {
    e.stopPropagation();
    if (onSelect) { onSelect(player); return; }
    setFlipped(f => !f);
  };

  const borderStyle = selected ? `2px solid ${acc}` : `1px solid ${acc}44`;

  return (
    <div onClick={handleClick} style={{ width: "100%", aspectRatio: "3/4.2", perspective: 800, cursor: "pointer" }}>
      <div className={player.rarity === "SPECIAL" ? "rarity-special-glow" : player.rarity === "GOLD" ? "rarity-gold-glow" : ""}
        style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d", transition: "transform .45s cubic-bezier(.4,0,.2,1)", transform: flipped ? "rotateY(180deg)" : "none", borderRadius:12 }}>

        {/* ANVERSO */}
        <div style={{ position: "absolute", width: "100%", height: "100%", backfaceVisibility: "hidden", borderRadius: 12, overflow: "hidden", background: bg, border: borderStyle }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: acc }} />
          {/* Foto del jugador — carga desde /players/{id}.png, fallback a avatar */}
          <div style={{ width: "100%", height: "100%", position: "relative", background: `linear-gradient(180deg, ${bg} 0%, #0d0f14 100%)` }}>
            <img
              src={player.imageUrl || `/players/${player.id}.png`}
              alt={player.name}
              onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex"; }}
              onLoad={e => { e.currentTarget.style.display = "block"; e.currentTarget.nextSibling.style.display = "none"; }}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block", position: "absolute", inset: 0 }}
            />
            {/* Fallback avatar si no hay foto */}
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", position: "absolute", inset: 0 }}>
              <div style={{ fontSize: 80, opacity: 0.18, paddingBottom: 60 }}>👤</div>
            </div>
          </div>
          {/* Media y posición arriba izquierda */}
          <div style={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: acc }}>{player.overall}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".5px", color: acc, marginTop: 1 }}>{player.pos}</span>
          </div>
          {/* Overlay inferior */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 10px 12px", background: "linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.5) 60%, transparent 100%)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{player.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 2 }}>{NAT_FLAG[player.nat] || "🌍"} · {player.age} años</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,.45)", fontWeight: 600 }}>MOR</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: moraleColor }}>{player.morale}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,.45)", fontWeight: 600 }}>CAN</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: fatColor }}>{player.fatigue}</div>
              </div>
              {player.injured && <span style={{ background: "#ef444430", color: "#ef4444", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>LESIÓN</span>}
              {player.suspended && <span style={{ background: "#f59e0b30", color: "#f59e0b", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>SANCIÓN</span>}
            </div>
          </div>
        </div>

        {/* REVERSO */}
        <div style={{ position: "absolute", width: "100%", height: "100%", backfaceVisibility: "hidden", borderRadius: 12, overflow: "hidden", background: bg, border: `1px solid ${acc}44`, transform: "rotateY(180deg)", display: "flex", flexDirection: "column", padding: 12 }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: acc }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,.1)", marginTop: 4 }}>
            <Initials name={player.name} size={40} rarity={player.rarity} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</div>
              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>{player.pos} · {player.age}a · {NAT_FLAG[player.nat] || "🌍"}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: acc, lineHeight: 1, marginTop: 2 }}>{player.overall}</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            {statKeys.map(k => <StatBar key={k} label={statLabels[k]} value={player.attrs[k]} accent={acc} />)}
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
            <span style={{ background: `${acc}22`, color: acc, fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 4 }}>{RARITY_LABEL[player.rarity]}</span>
            {player.injured && <span style={{ background: "#ef444422", color: "#ef4444", fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 4 }}>Lesionado</span>}
            {player.suspended && <span style={{ background: "#f59e0b22", color: "#f59e0b", fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 4 }}>Sancionado</span>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.08)" }}>
            {[["MORAL", player.morale, moraleColor], ["CAN", player.fatigue, fatColor], ["🟡", player.yellowCards, "#f59e0b"]].map(([l, v, c]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#6b7280", fontWeight: 600 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NAVEGACIÓN INFERIOR ──────────────────────────────────────────────────────

// ─── PANTALLA DE FINANZAS ─────────────────────────────────────────────────────

function FinancesScreen({ game }) {
  const team    = TEAMS.find(t => t.id === game.teamId);
  const players = game.players;
  const matchday = game.matchday;
  const budgetTotal = team.budget;
  const weeklyWages = players.reduce((s, p) => s + (p.salary ?? 0), 0);
  const monthlyWages = weeklyWages * 4;
  const seasonWages  = weeklyWages * 38;
  const matchdaysPlayed = Math.max(0, matchday - 1);
  const totalWageSpent  = matchdaysPlayed * weeklyWages;

  // ── Ingresos reales acumulados de cada jornada jugada ──
  const incomeLog = game.incomeLog ?? [];
  const totalGate    = incomeLog.reduce((s,e) => s + (e.gateRevenue ?? 0), 0);
  const totalMembers = incomeLog.reduce((s,e) => s + (e.memberIncomePerHomeMatch ?? 0), 0);
  const totalShop    = incomeLog.reduce((s,e) => s + (e.shopIncome ?? 0), 0);
  const totalAds     = incomeLog.reduce((s,e) => s + (e.adIncome ?? 0), 0);
  const totalIncome  = totalGate + totalMembers + totalShop + totalAds;
  const homeMatchesPlayed = incomeLog.filter(e => e.isHome).length;
  const avgAttendance = homeMatchesPlayed > 0
    ? Math.round(incomeLog.filter(e=>e.isHome).reduce((s,e)=>s+(e.matchAttendance??0),0) / homeMatchesPlayed)
    : 0;
  const avgOccupancy = homeMatchesPlayed > 0
    ? Math.round(incomeLog.filter(e=>e.isHome).reduce((s,e)=>s+(e.occupancy??0),0) / homeMatchesPlayed * 100)
    : 0;
  const lastIncome = incomeLog[incomeLog.length - 1];

  const balance = totalIncome - totalWageSpent;
  const balanceColor = balance >= 0 ? "#22c55e" : "#ef4444";
  const budgetK       = budgetTotal * 1000;
  const budgetAdjustment = game.budgetAdjustment ?? 0; // €K acumulado: ingresos de jornadas + fichajes/ventas
  const budgetSnapshot = calculateBudgetSnapshot(game, team);
  const budgetLeft    = budgetSnapshot.clubCash;
  const budgetPct     = Math.max(0, Math.min(100, Math.round((budgetSnapshot.transferBudget / Math.max(1,budgetLeft)) * 100)));
  const budgetColor   = budgetPct >= 60 ? "#22c55e" : budgetPct >= 30 ? "#f59e0b" : "#ef4444";
  const topEarners = [...players].sort((a,b)=>(b.salary??0)-(a.salary??0)).slice(0,7);
  const groupWages = { POR:0, DEF:0, MED:0, DEL:0 };
  players.forEach(p => { if (groupWages[p.group] !== undefined) groupWages[p.group] += (p.salary??0); });
  const totalGroupWage = Object.values(groupWages).reduce((s,v)=>s+v,0);
  const fmt  = (v) => v >= 1000 ? `€${(v/1000).toFixed(1)}M` : `€${v}K`;
  const fmtW = (v) => `€${v}K/sem`;
  const fanLove = game.fanLove ?? 70;
  const fanLoveColor = fanLove >= 70 ? "#22c55e" : fanLove >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ flex:1, overflowY:"auto", padding:14 }}>
      {game.seasonOpeningStatement&&<div style={{background:"linear-gradient(135deg,rgba(201,168,76,.13),#161a24)",border:"1px solid rgba(201,168,76,.25)",borderRadius:12,padding:14,marginBottom:12}}><div style={{fontSize:11,color:"#c9a84c",fontWeight:800,marginBottom:10}}>CIERRE Y APERTURA DE TEMPORADA</div>{[["Saldo de cierre",game.seasonOpeningStatement.closingBalance],["Derechos TV",game.seasonOpeningStatement.tvRights],["Patrocinios",game.seasonOpeningStatement.sponsorship],["Socios",game.seasonOpeningStatement.members],["Premio clasificación",game.seasonOpeningStatement.positionPrize],["Gastos operativos",-game.seasonOpeningStatement.operatingCosts]].map(([label,value])=><div key={label} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:11,borderBottom:"1px solid rgba(255,255,255,.04)"}}><span style={{color:"#8b92a3"}}>{label}</span><strong style={{color:value>=0?"#22c55e":"#ef4444"}}>{value>=0?"+":"-"}{fmt(Math.abs(value))}</strong></div>)}<div style={{display:"flex",justifyContent:"space-between",paddingTop:9,fontSize:12}}><span style={{color:"#e8eaf0",fontWeight:800}}>Presupuesto inicial</span><strong style={{color:"#c9a84c"}}>{fmt(game.seasonOpeningStatement.openingBalance)}</strong></div></div>}
      <div style={{ background:"#1a1f2e", border:"1px solid rgba(201,168,76,.2)", borderRadius:12, padding:16, marginBottom:14 }}>
        <div style={{ fontSize:11, color:"#c9a84c", fontWeight:600, letterSpacing:".5px", marginBottom:12 }}>BALANCE TEMPORADA</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <div style={{ background:"#0d0f14", borderRadius:8, padding:"10px 12px" }}>
            <div style={{ fontSize:10, color:"#6b7280", marginBottom:4 }}>INGRESOS</div>
            <div style={{ fontSize:20, fontWeight:700, color:"#22c55e" }}>{fmt(totalIncome)}</div>
            <div style={{ fontSize:10, color:"#4b5563", marginTop:2 }}>{incomeLog.length} jornadas con datos</div>
          </div>
          <div style={{ background:"#0d0f14", borderRadius:8, padding:"10px 12px" }}>
            <div style={{ fontSize:10, color:"#6b7280", marginBottom:4 }}>GASTOS</div>
            <div style={{ fontSize:20, fontWeight:700, color:"#ef4444" }}>{fmt(totalWageSpent)}</div>
            <div style={{ fontSize:10, color:"#4b5563", marginTop:2 }}>Masa salarial acum.</div>
          </div>
        </div>
        <div style={{ background:"#0d0f14", borderRadius:8, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:10, color:"#6b7280", marginBottom:3 }}>BALANCE NETO</div>
            <div style={{ fontSize:26, fontWeight:800, color:balanceColor }}>{balance>=0?"+":""}{fmt(balance)}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:10, color:"#6b7280", marginBottom:3 }}>CAJA DEL CLUB</div>
            <div style={{ fontSize:20, fontWeight:700, color:budgetColor }}>{fmt(budgetLeft)}</div>
            <div style={{ fontSize:10, color:"#4b5563", marginTop:2 }}>de {fmt(budgetK)} inicial</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
          <div style={{background:"#0d0f14",borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:10,color:"#6b7280",marginBottom:4}}>GASTOS Y RESERVA</div>
            <div style={{fontSize:18,fontWeight:800,color:"#f59e0b"}}>{fmt(budgetSnapshot.reserved)}</div>
            <div style={{fontSize:9,color:"#4b5563",marginTop:3}}>Cobertura parcial + fondo de seguridad</div>
          </div>
          <div style={{background:"#0d0f14",borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:10,color:"#6b7280",marginBottom:4}}>PRESUPUESTO FICHAJES</div>
            <div style={{fontSize:18,fontWeight:800,color:"#22c55e"}}>{fmt(budgetSnapshot.transferBudget)}</div>
            <div style={{fontSize:9,color:"#4b5563",marginTop:3}}>Disponible real para mercado</div>
          </div>
        </div>
        <div style={{background:"#0d0f14",borderRadius:8,padding:"9px 11px",marginTop:8}}>
          {[["Salarios pendientes",budgetSnapshot.pendingSalaries],["Operativa pendiente",budgetSnapshot.pendingOperating],["Cobertura salarios",budgetSnapshot.salaryReserve],["Cobertura operativa",budgetSnapshot.operatingReserve],["Fondo seguridad",budgetSnapshot.securityFund]].map(([label,value],index)=><div key={label} style={{display:"flex",justifyContent:"space-between",fontSize:9,padding:"3px 0",borderTop:index?"1px solid rgba(255,255,255,.035)":"none"}}><span style={{color:"#6b7280"}}>{label}</span><strong style={{color:index<2?"#8b92a3":"#c9ced8"}}>{fmt(value)}</strong></div>)}
        </div>
        <div style={{ marginTop:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:10, color:"#6b7280" }}>Parte libre para fichajes</span>
            <span style={{ fontSize:10, color:budgetColor, fontWeight:700 }}>{budgetPct}% de caja</span>
          </div>
          <div style={{ height:6, background:"#1e2330", borderRadius:3, overflow:"hidden" }}>
            <div style={{ width:`${budgetPct}%`, height:"100%", background:budgetColor, borderRadius:3 }}/>
          </div>
        </div>
      </div>

      {/* Cariño de la afición */}
      <div style={{ background:"#161a24", borderRadius:10, padding:14, marginBottom:12, display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ fontSize:28 }}>❤️</div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
            <span style={{ fontSize:11, color:"#6b7280", fontWeight:600 }}>CARIÑO DE LA AFICIÓN</span>
            <span style={{ fontSize:12, fontWeight:700, color:fanLoveColor }}>{fanLove}/100</span>
          </div>
          <div style={{ height:5, background:"#1e2330", borderRadius:3, overflow:"hidden" }}>
            <div style={{ width:`${fanLove}%`, height:"100%", background:fanLoveColor, borderRadius:3 }}/>
          </div>
          <div style={{ fontSize:10, color:"#4b5563", marginTop:4 }}>Sube ganando partidos · baja con derrotas y rachas negativas. Afecta la ocupación del estadio.</div>
        </div>
      </div>

      {/* Desglose de ingresos por fuente */}
      <div style={{ background:"#161a24", borderRadius:10, padding:14, marginBottom:12 }}>
        <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:12 }}>FUENTES DE INGRESOS</div>
        {[
          ["🎟️", "Taquilla", totalGate, "#22c55e", `${homeMatchesPlayed} partidos en casa`],
          ["🎫", "Socios y abonados", totalMembers, "#3b82f6", "Cuota prorrateada por jornada"],
          ["🛍️", "Tienda y merchandising", totalShop, "#c9a84c", "Todas las jornadas"],
          ["📺", "Publicidad y patrocinios", totalAds, "#a855f7", `Posición + prestigio del club (${Math.round(game.legacy?.clubPrestige??30)}/100)`],
        ].map(([icon,label,val,color,sub]) => {
          const pct = totalIncome > 0 ? Math.round((val/totalIncome)*100) : 0;
          return (
            <div key={label} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                <span style={{ fontSize:14 }}>{icon}</span>
                <span style={{ fontSize:12, color:"#9aa0b4", flex:1 }}>{label}</span>
                <span style={{ fontSize:13, fontWeight:700, color }}>{fmt(val)}</span>
              </div>
              <div style={{ height:4, background:"#1e2330", borderRadius:2, overflow:"hidden", marginLeft:22 }}>
                <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:2 }}/>
              </div>
              <div style={{ fontSize:9, color:"#4b5563", marginLeft:22, marginTop:2 }}>{sub} · {pct}% del total</div>
            </div>
          );
        })}
        {lastIncome && (
          <div style={{ background:"#0d0f14", borderRadius:8, padding:"10px 12px", marginTop:8 }}>
            <div style={{ fontSize:10, color:"#6b7280", marginBottom:6 }}>ÚLTIMA JORNADA (J{lastIncome.matchday})</div>
            {lastIncome.isHome ? (
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#9aa0b4" }}>
                <span>👥 {lastIncome.matchAttendance?.toLocaleString()} espectadores</span>
                <span>{Math.round((lastIncome.occupancy??0)*100)}% aforo</span>
              </div>
            ) : (
              <div style={{ fontSize:11, color:"#6b7280" }}>Partido a domicilio · sin ingresos de taquilla</div>
            )}
            <div style={{ fontSize:13, fontWeight:700, color:"#22c55e", marginTop:4 }}>+{fmt(lastIncome.total)} esta jornada</div>
          </div>
        )}
        {avgAttendance > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10 }}>
            <div style={{ background:"#0d0f14", borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
              <div style={{ fontSize:9, color:"#6b7280" }}>ASISTENCIA MEDIA</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#e8eaf0" }}>{avgAttendance.toLocaleString()}</div>
            </div>
            <div style={{ background:"#0d0f14", borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
              <div style={{ fontSize:9, color:"#6b7280" }}>OCUPACIÓN MEDIA</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#e8eaf0" }}>{avgOccupancy}%</div>
            </div>
          </div>
        )}
      </div>
      <div style={{ background:"#161a24", borderRadius:10, padding:14, marginBottom:12 }}>
        <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:12 }}>MASA SALARIAL</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
          {[["Semanal", fmtW(weeklyWages)], ["Mensual", fmt(monthlyWages)], ["Temporada", fmt(seasonWages)]].map(([l,v])=>(
            <div key={l} style={{ background:"#0d0f14", borderRadius:8, padding:"10px 8px", textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#6b7280", marginBottom:4 }}>{l.toUpperCase()}</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#e8eaf0" }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, marginBottom:8 }}>DESGLOSE POR LÍNEA</div>
        {Object.entries(groupWages).map(([group, wages]) => {
          const pct = totalGroupWage > 0 ? Math.round((wages/totalGroupWage)*100) : 0;
          const colors = { POR:"#3b82f6", DEF:"#22c55e", MED:"#c9a84c", DEL:"#ef4444" };
          const labels = { POR:"Porteros", DEF:"Defensas", MED:"Centrocampistas", DEL:"Delanteros" };
          return (
            <div key={group} style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontSize:12, color:"#9aa0b4" }}>{labels[group]}</span>
                <span style={{ fontSize:12, fontWeight:600, color:"#e8eaf0" }}>{fmtW(wages)} <span style={{ color:"#4b5563", fontWeight:400 }}>({pct}%)</span></span>
              </div>
              <div style={{ height:4, background:"#1e2330", borderRadius:2, overflow:"hidden" }}>
                <div style={{ width:`${pct}%`, height:"100%", background:colors[group], borderRadius:2 }}/>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ background:"#161a24", borderRadius:10, padding:14, marginBottom:12 }}>
        <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:12 }}>MAYORES SALARIOS</div>
        {topEarners.map((p, i) => {
          const acc = RARITY_ACCENT[p.rarity];
          const pct = topEarners[0]?.salary > 0 ? Math.round(((p.salary??0)/topEarners[0].salary)*100) : 0;
          return (
            <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#4b5563", width:16, textAlign:"center" }}>{i+1}</div>
              <Initials name={p.name} size={32} rarity={p.rarity} borderRadius={6}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:"#e8eaf0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:acc, flexShrink:0, marginLeft:8 }}>{fmtW(p.salary??0)}</span>
                </div>
                <div style={{ height:3, background:"#1e2330", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:acc, borderRadius:2 }}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ background:"#161a24", borderRadius:10, padding:14, marginBottom:4 }}>
        <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:10 }}>RESUMEN DEL CLUB</div>
        {[
          ["Jornadas jugadas",  `${matchdaysPlayed} / 38`],
          ["Plantilla",         `${players.length} jugadores`],
          ["Presupuesto inicial", fmt(budgetK)],
          ["Coste salarial/sem", fmtW(weeklyWages)],
          ["Lesionados",        `${players.filter(p=>p.injured).length} jugadores`],
          ["Sancionados",       `${players.filter(p=>p.suspended).length} jugadores`],
        ].map(([l,v])=>(
          <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
            <span style={{ fontSize:12, color:"#6b7280" }}>{l}</span>
            <span style={{ fontSize:12, fontWeight:600, color:"#e8eaf0" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MERCADO DE FICHAJES ─────────────────────────────────────────────────────

function TransferMarketScreen({ game, onTransfer, onOpenPlayer, onGoScouting, onViewReport, onClubOffer, onAcceptClubCounter, onContractOffer, onAcceptPlayerCounter, onAcceptRoleCounter, onWithdrawOffer, onFinalizeOffer, onUserMarketStatus, onIncomingOffer }) {
  const [tab, setTab]         = useState("comprar"); // comprar | vender | historial
  const [filter, setFilter]   = useState({ pos:"", min:60, max:99, search:"", maxPrice:999999, maxSalary:9999 });
  const [selected, setSelected] = useState(null); // jugador seleccionado para fichar
  const [selling, setSelling]   = useState(null); // jugador propio a vender
  const [confirm, setConfirm]   = useState(null); // {type:"buy"|"sell", player}
  const [clubAmount,setClubAmount]=useState(0);
  const [contractSalary,setContractSalary]=useState(0);
  const [contractYears,setContractYears]=useState(3);
  const [contractRole,setContractRole]=useState("Rotación");
  const [marketMode,setMarketMode]=useState("all");

  const team    = TEAMS.find(t => t.id === game.teamId);
  const players = game.players;
  const matchday = game.matchday;

  // Presupuesto disponible (igual que en finanzas) — los ingresos reales ya están en budgetAdjustment
  const budgetK      = (team.budget ?? 50) * 1000;
  const weeklyWages  = players.reduce((s,p) => s + (p.salary ?? 0), 0);
  const matchPlayed  = Math.max(0, matchday - 1);
  const wages        = matchPlayed * weeklyWages;
  const budgetAdjustment = game.budgetAdjustment ?? 0; // €K acumulado: ingresos de jornadas + fichajes/ventas
  const budgetSnapshot = calculateBudgetSnapshot(game, team);
  const budgetLeft   = budgetSnapshot.transferBudget;
  const fmt          = v => v >= 1000 ? `€${(v/1000).toFixed(1)}M` : `€${v}K`;

  // Valor de mercado = media * 500K aproximado (simplificado)
  const marketValue  = p => {
    const base = p.overall >= 88 ? 80000 : p.overall >= 84 ? 50000 : p.overall >= 80 ? 30000
               : p.overall >= 76 ? 18000 : p.overall >= 72 ? 10000 : p.overall >= 68 ? 5000 : 2000;
    const ageMod = p.age <= 23 ? 1.4 : p.age <= 27 ? 1.2 : p.age <= 30 ? 1.0 : p.age <= 33 ? 0.7 : 0.4;
    return Math.round(base * ageMod);
  };

  // Salario sugerido al fichar
  const suggestedSalary = p => p.salary ?? (
    p.overall >= 88 ? 250 : p.overall >= 84 ? 150 : p.overall >= 80 ? 90
    : p.overall >= 76 ? 55 : p.overall >= 72 ? 30 : 16
  );

  // Jugadores disponibles en el mercado:
  // 1) Plantillas de los otros 19 equipos (datos base, simplificado: no se gestionan sus ventas)
  // 2) Jugadores vendidos por el usuario — vuelven a estar disponibles para refichar
  const soldByUser = (game.transfers ?? [])
    .filter(t => t.type === "sell"&&!t.toTeamId)
    .map(t => ({ ...t.player, _teamId: "agente_libre", _teamName: "Agente libre", _teamColor: "#6b7280" }));
  const migratedFreeAgents = (game.freeAgents ?? [])
    .map(p => ({ ...p, _teamId: "agente_libre", _teamName: "Agente libre", _teamColor: "#6b7280" }));

  // IDs de jugadores que el usuario fichó de otro equipo (para no duplicarlos en su origen)
  const boughtFromOthers = new Set(
    (game.transfers ?? []).filter(t => t.type === "buy" && t.fromTeamId).map(t => t.player.id)
  );
  // IDs de jugadores que el usuario vendió más tarde volvió a fichar (evitar duplicado en agentes libres)
  const reboughtIds = new Set(
    (game.transfers ?? []).filter(t => t.type === "buy").map(t => t.player.id)
  );
  const freeAgentIds = new Set(migratedFreeAgents.map(player => player.id));

  const allOtherPlayers = TEAMS
    .filter(t => t.id !== game.teamId)
    .flatMap(t => (REAL_SQUADS[t.id] ?? [])
      .filter(p => !boughtFromOthers.has(p.id) && !freeAgentIds.has(p.id)) // ya fichado/liberado, no se repite
      .map(p => ({ ...p, _teamId: t.id, _teamName: t.name, _teamColor: t.color })));

  // Agentes libres: vendidos por el usuario que no han vuelto a fichar
  const freeAgents = [...migratedFreeAgents, ...soldByUser].filter(p => !reboughtIds.has(p.id) || true)
    .filter(p => !players.some(owned => owned.id === p.id)); // si ya los tienes, no aparecen

  const allOtherPlayers2 = [...allOtherPlayers, ...freeAgents];
  const listingsByPlayer=new Map((game.transferMarket?.listings??[]).map(listing=>[listing.playerId,listing]));
  const reportsByPlayer = new Map((game.scouting?.reports??[]).map(report=>[report.playerId,report]));
  const knownIds = new Set([...reportsByPlayer.keys(),...freeAgents.map(player=>player.id)]);
  const selectedReport=selected?reportsByPlayer.get(selected.id):null;
  const activeOffer=selected?(game.transferMarket?.offers??[]).find(item=>item.playerId===selected.id&&!['completed','withdrawn'].includes(item.status)):null;
  const selectedOverall=selectedReport&&selectedReport.confidence<88?`${selectedReport.overallRange[0]}-${selectedReport.overallRange[1]}`:selected?.overall;

  const marketPlayers = allOtherPlayers2.filter(p => {
    if (players.some(owned => owned.id === p.id)) return false; // ya es tuyo, no aparece
    const listing=listingsByPlayer.get(p.id);
    if (!knownIds.has(p.id) && !listing) return false;
    if(marketMode==="transfer"&&listing?.type!=="transfer")return false;
    if(marketMode==="loan"&&listing?.type!=="loan")return false;
    if(marketMode==="free"&&p._teamId!=="agente_libre")return false;
    if(marketMode==="contract"&&Number(p.contractEnd??9999)>Number(game.season)+1)return false;
    if(marketMode==="young"&&p.age>23)return false;
    if(marketMode==="opportunity"&&!(listing?.type==="transfer"&&listing.askingPrice<=marketValue(p)))return false;
    if (filter.search && !p.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    if (filter.pos && p.pos !== filter.pos) return false;
    if (p.overall < filter.min || p.overall > filter.max) return false;
    if(marketValue(p)>filter.maxPrice||(p.salary??0)>filter.maxSalary)return false;
    return true;
  }).map(player=>({...player,_listing:listingsByPlayer.get(player.id)})).sort((a,b) => b.overall - a.overall).slice(0, 60);

  // Historial de fichajes
  const history = game.transfers ?? [];

  const clubPrestige = game.legacy?.clubPrestige ?? 30;
  const requiredPrestige = p => p.overall >= 88 ? 65 : p.overall >= 85 ? 45 : 0;
  const canAttract = p => clubPrestige >= requiredPrestige(p);
  const canAfford = p => budgetLeft >= marketValue(p) && canAttract(p);

  const doBuy = (player) => {
    const cost   = marketValue(player);
    const salary = suggestedSalary(player);
    if (budgetLeft < cost || !canAttract(player)) return;
    onTransfer({
      type: "buy",
      player: { ...player, fatigue:15, morale:75, injured:false, injuryGames:0,
                suspended:false, suspGames:0, yellowCards:0, salary },
      cost, salary,
      fromTeamId: player._teamId,
    });
    setConfirm(null); setSelected(null);
  };

  const doSell = (player) => {
    const value = marketValue(player);
    onTransfer({ type:"sell", player, value });
    setConfirm(null); setSelling(null);
  };

  const POSITIONS = ['','POR','DFC','LD','LI','MCD','MC','MCO','ED','EI','DC'];
  const acc = (p) => RARITY_ACCENT[p.rarity] ?? "#9aa0b4";
  const negotiationAlertCount=[...(game.transferMarket?.offers??[]),...(game.transferMarket?.incomingOffers??[])].filter(item=>["clubCounter","clubAccepted","playerCounter","roleCounter","ready","pending"].includes(item.status)).length;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Presupuesto header */}
      <div style={{ background:"#13161f", borderBottom:"1px solid rgba(255,255,255,.07)", padding:"10px 14px", flexShrink:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:10, color:"#6b7280", fontWeight:600, letterSpacing:".4px" }}>PRESUPUESTO FICHAJES</div>
            <div style={{ fontSize:22, fontWeight:800, color: budgetLeft > 0 ? "#22c55e" : "#ef4444", marginTop:2 }}>{fmt(budgetLeft)}</div>
            <div style={{ fontSize:9, color:"#6b7280", marginTop:2 }}>Caja {fmt(budgetSnapshot.clubCash)} · gastos/reserva {fmt(budgetSnapshot.reserved)}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:10, color:"#6b7280" }}>Masa salarial semanal</div>
            <div style={{ fontSize:14, fontWeight:600, color:"#f59e0b" }}>{fmt(weeklyWages)}/sem</div>
          </div>
        </div>
        {/* Barra presupuesto */}
        <div style={{ height:3, background:"#1e2330", borderRadius:2, marginTop:8, overflow:"hidden" }}>
          <div style={{ width:`${Math.max(0,Math.min(100,Math.round((budgetLeft/Math.max(1,budgetSnapshot.clubCash))*100)))}%`, height:"100%",
            background: budgetLeft > budgetSnapshot.clubCash*0.5 ? "#22c55e" : budgetLeft > budgetSnapshot.clubCash*0.2 ? "#f59e0b" : "#ef4444", borderRadius:2 }}/>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:"#161a24", borderBottom:"1px solid rgba(255,255,255,.06)", flexShrink:0 }}>
        {[["comprar","🛒 Mercado"],["negociar",`📬 Ofertas${negotiationAlertCount?` (${negotiationAlertCount})`:""}`],["vender","💰 Salidas"],["historial","📋 Historial"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ flex:1, background:"transparent", border:"none", borderBottom:tab===id?"2px solid #c9a84c":"2px solid transparent",
              color:tab===id?"#c9a84c":"#6b7280", padding:"9px 6px", fontSize:12, fontWeight:tab===id?700:500, cursor:"pointer" }}>
            {label}
          </button>
        ))}
      </div>

      <SwipeTabs tabs={["comprar","negociar","vender","historial"]} activeTab={tab} onChange={setTab} style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} contentStyle={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* COMPRAR */}
      {tab === "comprar" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {/* Filtros */}
          <div style={{ padding:"8px 12px", background:"#13161f", borderBottom:"1px solid rgba(255,255,255,.06)", flexShrink:0 }}>
            <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:7}}>{[["all","Todos"],["transfer","📌 Transferibles"],["loan","🔁 Cedibles"],["free","Libres"],["contract","Último año"],["young","Jóvenes"],["opportunity","Oportunidades"]].map(([id,label])=><button key={id} onClick={()=>setMarketMode(id)} style={{flex:"0 0 auto",background:marketMode===id?"#c9a84c":"#1e2330",color:marketMode===id?"#1a1200":"#8b92a3",border:"none",borderRadius:14,padding:"6px 9px",fontSize:9,fontWeight:800}}>{label}</button>)}</div>
            <div style={{ display:"flex", gap:6 }}>
              <input value={filter.search} onChange={e=>setFilter(f=>({...f,search:e.target.value}))}
                placeholder="🔍 Buscar jugador..."
                style={{ flex:2, background:"#1e2330", border:"1px solid rgba(255,255,255,.1)", color:"#e8eaf0", padding:"6px 9px", borderRadius:6, fontSize:12, fontFamily:"inherit" }}/>
              <select value={filter.pos} onChange={e=>setFilter(f=>({...f,pos:e.target.value}))}
                style={{ background:"#1e2330", border:"1px solid rgba(255,255,255,.1)", color:"#e8eaf0", padding:"6px 8px", borderRadius:6, fontSize:11, fontFamily:"inherit" }}>
                {POSITIONS.map(p=><option key={p} value={p}>{p||"Pos"}</option>)}
              </select>
              <select value={`${filter.min}-${filter.max}`} onChange={e=>{
                const [mn,mx]=e.target.value.split('-').map(Number);
                setFilter(f=>({...f,min:mn,max:mx}));
              }} style={{ background:"#1e2330", border:"1px solid rgba(255,255,255,.1)", color:"#e8eaf0", padding:"6px 8px", borderRadius:6, fontSize:11, fontFamily:"inherit" }}>
                <option value="60-99">Media</option>
                <option value="85-99">85-99 ⭐</option>
                <option value="80-84">80-84</option>
                <option value="75-79">75-79</option>
                <option value="70-74">70-74</option>
                <option value="60-69">&lt;70</option>
              </select>
            </div>
            <div style={{display:"flex",gap:6,marginTop:6}}><select value={filter.maxPrice} onChange={event=>setFilter(current=>({...current,maxPrice:Number(event.target.value)}))} style={{flex:1,background:"#1e2330",border:"1px solid rgba(255,255,255,.1)",color:"#9aa0b4",padding:"6px 8px",borderRadius:6,fontSize:10}}><option value="999999">Cualquier precio</option><option value="5000">Hasta €5M</option><option value="10000">Hasta €10M</option><option value="25000">Hasta €25M</option><option value="50000">Hasta €50M</option></select><select value={filter.maxSalary} onChange={event=>setFilter(current=>({...current,maxSalary:Number(event.target.value)}))} style={{flex:1,background:"#1e2330",border:"1px solid rgba(255,255,255,.1)",color:"#9aa0b4",padding:"6px 8px",borderRadius:6,fontSize:10}}><option value="9999">Cualquier salario</option><option value="30">Hasta €30K/sem</option><option value="60">Hasta €60K/sem</option><option value="100">Hasta €100K/sem</option><option value="200">Hasta €200K/sem</option></select></div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginTop:7,fontSize:9,color:"#6b7280"}}><span>Solo aparecen jugadores con informe.</span><button data-swipe-ignore="true" onClick={onGoScouting} style={{background:"transparent",border:"none",color:"#60a5fa",fontSize:9,fontWeight:800,cursor:"pointer"}}>🔎 Abrir scouting</button></div>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"10px 12px" }}>
            <div style={{ fontSize:10, color:"#6b7280", marginBottom:8, fontWeight:600 }}>{marketPlayers.length} JUGADORES DISPONIBLES</div>
            {marketPlayers.map(p => {
              const val   = marketValue(p);
              const can   = budgetLeft >= val && canAttract(p);
              const alreadyOwned = players.some(pl => pl.id === p.id);
              const report=reportsByPlayer.get(p.id);
              const displayedOverall=report&&report.confidence<88?`${report.overallRange[0]}-${report.overallRange[1]}`:String(p.overall);
              return (
                <div key={p.id} onClick={()=>{if(alreadyOwned)return;setSelected(p);setClubAmount(p._listing?.type==="transfer"?(p._listing.askingPrice??marketValue(p)):p._listing?.type==="loan"?Math.round(marketValue(p)*.06):marketValue(p));setContractSalary(suggestedSalary(p));}}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", marginBottom:6,
                    background: selected?.id===p.id ? "rgba(201,168,76,.1)" : "#161a24",
                    border:`1px solid ${selected?.id===p.id?"#c9a84c44":alreadyOwned?"rgba(34,197,94,.2)":"rgba(255,255,255,.06)"}`,
                    borderRadius:9, cursor: alreadyOwned ? "default" : "pointer", opacity: alreadyOwned ? .6 : 1 }}>
                  {/* Media */}
                  <div style={{ width:36, height:36, borderRadius:8, background:`${acc(p)}22`, display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:displayedOverall.length>2?10:14, fontWeight:800, color:acc(p), flexShrink:0 }}>{displayedOverall}</div>
                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color: alreadyOwned?"#22c55e":"#e8eaf0",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {p.name} {alreadyOwned?"✓":""}
                    </div>
                    <div style={{ fontSize:10, color:"#6b7280", marginTop:1 }}>
                      {p.pos} · {p.age}a · <span style={{ color:p._teamColor }}>{p._teamName}</span>
                    </div>
                    {p._listing&&<div style={{fontSize:8,color:p._listing.type==="loan"?"#60a5fa":"#f59e0b",marginTop:3}}>{p._listing.type==="loan"?`🔁 Cesión · ${p._listing.wageCoverage}% salario · ${p._listing.optionType==="none"?"sin opción":`opción ${fmt(p._listing.optionPrice)}`}`:`📌 ${p._listing.reason} · pide ${fmt(p._listing.askingPrice)}`}</div>}
                  </div>
                  {/* Valor */}
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color: can?"#22c55e":"#ef4444" }}>{fmt(val)}</div>
                    <div style={{ fontSize:9, color:"#4b5563" }}>{fmt(suggestedSalary(p))}/sem</div>
                  </div>
                  <button data-swipe-ignore="true" onClick={event=>{event.stopPropagation();report?onViewReport(report.id):onGoScouting();}} title="Ver informe de scouting" style={{ background:"rgba(201,168,76,.1)", border:"1px solid rgba(201,168,76,.2)", color:"#c9a84c", borderRadius:6, width:28, height:28, cursor:"pointer" }}>👁</button>
                </div>
              );
            })}
          </div>

          {/* Panel de fichar */}
          {selected && (
            <div style={{ background:"#1a1f2e", borderTop:"1px solid rgba(201,168,76,.2)", padding:"12px 14px", flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:40, height:40, borderRadius:9, background:`${acc(selected)}22`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:String(selectedOverall).length>2?11:16, fontWeight:800, color:acc(selected) }}>{selectedOverall}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#e8eaf0" }}>{selected.name}</div>
                  <div style={{ fontSize:11, color:"#6b7280" }}>{selected.pos} · {selected.age}a · {selected._teamName}</div>
                </div>
                <button onClick={()=>setSelected(null)}
                  style={{ background:"rgba(255,255,255,.08)", border:"none", color:"#6b7280", cursor:"pointer", padding:"4px 8px", borderRadius:5, fontSize:12 }}>✕</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                {[["Valor de mercado",fmt(marketValue(selected))],["Salario semanal",fmt(suggestedSalary(selected))+"/sem"],
                  ["Presupuesto disp.",fmt(budgetLeft)],["Tras fichaje",fmt(budgetLeft-marketValue(selected))]
                ].map(([l,v])=>(
                  <div key={l} style={{ background:"#0d0f14", borderRadius:7, padding:"8px 10px" }}>
                    <div style={{ fontSize:9, color:"#6b7280", fontWeight:600 }}>{l.toUpperCase()}</div>
                    <div style={{ fontSize:13, fontWeight:700, color: l==="Tras fichaje"&&budgetLeft<marketValue(selected)?"#ef4444":"#e8eaf0", marginTop:2 }}>{v}</div>
                  </div>
                ))}
              </div>
              {!activeOffer&&<><div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:7,marginBottom:8}}><input type="number" value={clubAmount} onChange={event=>setClubAmount(Number(event.target.value))} style={{background:"#0d0f14",border:"1px solid rgba(255,255,255,.1)",color:"#fff",borderRadius:7,padding:"9px 10px",fontSize:12}}/><span style={{alignSelf:"center",fontSize:9,color:"#6b7280"}}>€K · {selected._listing?.type==="loan"?"coste cesión":"oferta fija"}</span></div><button onClick={()=>canAttract(selected)&&clubAmount<=budgetLeft&&onClubOffer(selected,clubAmount,marketValue(selected),suggestedSalary(selected),selected._listing)} className="btn-gold" style={{width:"100%",padding:12,borderRadius:8,fontSize:13}}>Enviar {selected._listing?.type==="loan"?"propuesta de cesión":"oferta al club"}</button></>}
              {activeOffer&&<div style={{background:"#0d0f14",borderRadius:9,padding:10}}><div style={{fontSize:9,color:"#6b7280",fontWeight:800}}>NEGOCIACIÓN EN CURSO · {activeOffer.dealType==="loan"?"CESIÓN":"FICHAJE"}</div><div style={{fontSize:12,color:"#e8eaf0",margin:"5px 0 9px"}}>{activeOffer.status==='pendingClub'?`El club responderá en ${activeOffer.responseDays??1} días.`:activeOffer.status==='clubCounter'?`Contraoferta del club: ${fmt(activeOffer.counterAmount)}`:activeOffer.status==='rejected'?'El club ha rechazado la oferta.':activeOffer.status==='outbid'?'Otro club ha superado tu oferta y se ha adelantado.':activeOffer.status==='clubAccepted'?'El club acepta. Ahora negocia con el jugador.':activeOffer.status==='pendingPlayer'?'El jugador estudia el contrato.':activeOffer.status==='playerCounter'?`El jugador solicita ${fmt(activeOffer.counterSalary)}/sem.`:activeOffer.status==='roleCounter'?`El jugador exige un rol de ${activeOffer.counterRole}.`:activeOffer.status==='playerRejected'?'El jugador rechaza las condiciones.':activeOffer.status==='ready'?'Acuerdo total alcanzado.':'Operación cerrada.'}</div>{activeOffer.status==='clubCounter'&&<button onClick={()=>onAcceptClubCounter(activeOffer.id)} className="btn-gold" style={{width:"100%",padding:9}}>Aceptar contraoferta</button>}{['clubAccepted','playerRejected'].includes(activeOffer.status)&&<div style={{display:"grid",gridTemplateColumns:"1fr 72px",gap:6}}><input type="number" value={contractSalary} onChange={event=>setContractSalary(Number(event.target.value))} style={{background:"#161a24",border:"1px solid rgba(255,255,255,.1)",color:"#fff",borderRadius:6,padding:8}}/><select value={contractYears} onChange={event=>setContractYears(Number(event.target.value))} style={{background:"#161a24",color:"#fff",border:"1px solid rgba(255,255,255,.1)",borderRadius:6}}>{[1,2,3,4,5].map(year=><option key={year} value={year}>{year} años</option>)}</select><select value={contractRole} onChange={event=>setContractRole(event.target.value)} style={{gridColumn:"1 / -1",background:"#161a24",color:"#fff",border:"1px solid rgba(255,255,255,.1)",borderRadius:6,padding:8}}>{["Estrella","Titular","Rotación","Promesa","Suplente"].map(role=><option key={role}>{role}</option>)}</select><button onClick={()=>onContractOffer(activeOffer.id,contractSalary,contractYears,contractRole)} className="btn-gold" style={{gridColumn:"1 / -1",padding:9}}>Enviar contrato al jugador</button></div>}{activeOffer.status==='playerCounter'&&<button onClick={()=>onAcceptPlayerCounter(activeOffer.id)} className="btn-gold" style={{width:"100%",padding:9}}>Aceptar petición salarial</button>}{activeOffer.status==='roleCounter'&&<button onClick={()=>onAcceptRoleCounter(activeOffer.id)} className="btn-gold" style={{width:"100%",padding:9}}>Aceptar rol solicitado</button>}{activeOffer.status==='ready'&&<button onClick={()=>onFinalizeOffer(activeOffer,selected)} className="btn-gold" style={{width:"100%",padding:10}}>Cerrar {activeOffer.dealType==="loan"?"cesión":"fichaje"}</button>}{activeOffer.status!=="ready"&&<button onClick={()=>onWithdrawOffer(activeOffer.id)} className="btn-ghost" style={{width:"100%",padding:8,marginTop:7}}>Retirarse de la negociación</button>}</div>}
              {activeOffer?.status==="clubCounter"&&<button onClick={()=>onClubOffer(selected,Math.round((activeOffer.amount+activeOffer.counterAmount)/2),marketValue(selected),suggestedSalary(selected),selected._listing)} style={{width:"100%",padding:8,marginTop:6,background:"rgba(96,165,250,.08)",border:"1px solid rgba(96,165,250,.25)",color:"#60a5fa",borderRadius:7,fontSize:10,fontWeight:800}}>Mejorar oferta a {fmt(Math.round((activeOffer.amount+activeOffer.counterAmount)/2))}</button>}
            </div>
          )}
        </div>
      )}

      {tab === "negociar" && (
        <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
          <div style={{fontSize:10,color:"#6b7280",fontWeight:800,marginBottom:9}}>📬 OFERTAS RECIBIDAS</div>
          {(game.transferMarket?.incomingOffers??[]).length===0&&<div style={{background:"#161a24",borderRadius:9,padding:16,color:"#6b7280",fontSize:11,textAlign:"center",marginBottom:15}}>Marca jugadores como transferibles o cedibles para atraer ofertas.</div>}
          {(game.transferMarket?.incomingOffers??[]).map(offer=>{const buyer=TEAMS.find(team=>team.id===offer.toTeamId);const player=players.find(item=>item.id===offer.playerId);return <div key={offer.id} style={{background:"#161a24",border:"1px solid rgba(96,165,250,.18)",borderRadius:10,padding:11,marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:9}}><TeamCrest team={buyer} size={30}/><div style={{flex:1}}><div style={{fontSize:12,color:"#e8eaf0",fontWeight:800}}>{offer.playerName}</div><div style={{fontSize:9,color:"#6b7280",marginTop:2}}>{buyer?.name} · {offer.type==="loan"?"cesión":"traspaso"}</div></div><strong style={{color:"#22c55e",fontSize:13}}>{fmt(offer.amount)}</strong></div>{offer.status==="pending"?<div style={{display:"flex",gap:7,marginTop:9}}><button onClick={()=>onIncomingOffer(offer,"rejected",player)} className="btn-ghost" style={{flex:1,padding:8}}>Rechazar</button><button onClick={()=>onIncomingOffer(offer,"accepted",player)} className="btn-gold" style={{flex:1,padding:8}}>Aceptar</button></div>:<div style={{fontSize:9,color:offer.status==="accepted"?"#22c55e":"#ef4444",marginTop:7,fontWeight:800}}>{offer.status==="accepted"?"✅ ACEPTADA":"❌ RECHAZADA"}</div>}</div>})}
          <div style={{fontSize:10,color:"#6b7280",fontWeight:800,margin:"17px 0 9px"}}>🤝 TUS NEGOCIACIONES</div>
          {(game.transferMarket?.offers??[]).length===0&&<div style={{background:"#161a24",borderRadius:9,padding:16,color:"#6b7280",fontSize:11,textAlign:"center"}}>No hay negociaciones abiertas.</div>}
          {(game.transferMarket?.offers??[]).map(offer=>{const status={pendingClub:["🕒","Pendiente del club","#f59e0b"],clubCounter:["🔄","Contraoferta","#60a5fa"],clubAccepted:["✅","Club acepta","#22c55e"],pendingPlayer:["⏳","Esperando jugador","#f59e0b"],playerCounter:["🔄","Pide más salario","#60a5fa"],roleCounter:["🔄","Pide otro rol","#60a5fa"],ready:["✍️","Acuerdo total","#22c55e"],rejected:["❌","Rechazada","#ef4444"],playerRejected:["❌","Jugador rechaza","#ef4444"],outbid:["⚠️","Otro club se adelanta","#ef4444"],withdrawn:["↩️","Retirada","#6b7280"],completed:["📌","Finalizada","#c9a84c"]}[offer.status]??["•",offer.status,"#6b7280"];return <div key={offer.id} onClick={()=>{const player=allOtherPlayers2.find(item=>item.id===offer.playerId);if(player){setSelected({...player,_listing:listingsByPlayer.get(player.id)});setTab("comprar");}}} style={{background:"#161a24",border:`1px solid ${status[2]}33`,borderRadius:10,padding:11,marginBottom:8,cursor:"pointer"}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><div><div style={{fontSize:12,color:"#e8eaf0",fontWeight:800}}>{offer.playerName}</div><div style={{fontSize:9,color:"#6b7280",marginTop:3}}>Oferta: {fmt(offer.amount)} · {offer.dealType==="loan"?"cesión":"fichaje"}</div></div><div style={{fontSize:9,color:status[2],fontWeight:800,textAlign:"right"}}>{status[0]} {status[1]}</div></div></div>})}
        </div>
      )}

      {/* VENDER */}
      {tab === "vender" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ flex:1, overflowY:"auto", padding:"10px 12px" }}>
            <div style={{ fontSize:10, color:"#6b7280", marginBottom:8, fontWeight:600 }}>TU PLANTILLA — {players.length} JUGADORES</div>
            {[...players].sort((a,b)=>b.overall-a.overall).map(p => {
              const val = marketValue(p);
              return (
                <div key={p.id} onClick={()=>setSelling(selling?.id===p.id?null:p)}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", marginBottom:6,
                    background: selling?.id===p.id?"rgba(239,68,68,.08)":"#161a24",
                    border:`1px solid ${selling?.id===p.id?"#ef444444":"rgba(255,255,255,.06)"}`,
                    borderRadius:9, cursor:"pointer" }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:`${acc(p)}22`,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:acc(p), flexShrink:0 }}>{p.overall}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#e8eaf0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                    <div style={{ fontSize:10, color:"#6b7280", marginTop:1 }}>{p.pos} · {p.age}a · {fmt(p.salary??0)}/sem</div>
                    {p.marketStatus&&<div style={{fontSize:8,color:p.marketStatus==="transfer"?"#f59e0b":"#60a5fa",marginTop:3,fontWeight:800}}>{p.marketStatus==="transfer"?"📌 TRANSFERIBLE":"🔁 CEDIBLE"}</div>}
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#22c55e" }}>{fmt(val)}</div>
                    <div style={{ fontSize:9, color:"#4b5563" }}>Valor</div>
                  </div>
                  <button onClick={event=>{event.stopPropagation();onOpenPlayer(p,game.teamId);}} title="Ver perfil" style={{ background:"rgba(201,168,76,.1)", border:"1px solid rgba(201,168,76,.2)", color:"#c9a84c", borderRadius:6, width:28, height:28, cursor:"pointer" }}>👁</button>
                </div>
              );
            })}
          </div>
          {selling && (
            <div style={{ background:"#1a1f2e", borderTop:"1px solid rgba(239,68,68,.2)", padding:"12px 14px", flexShrink:0 }}>
              <div style={{ fontSize:12, color:"#9aa0b4", marginBottom:8 }}>Situación de <strong style={{color:"#e8eaf0"}}>{selling.name}</strong></div><div style={{fontSize:10,color:"#6b7280",marginBottom:10}}>Valor orientativo {fmt(marketValue(selling))}. Otros clubes podrán presentar ofertas en próximas jornadas.</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}><button onClick={()=>{onUserMarketStatus(selling.id,"transfer");setSelling({...selling,marketStatus:selling.marketStatus==="transfer"?null:"transfer"});}} style={{padding:10,borderRadius:8,border:"1px solid rgba(245,158,11,.25)",background:selling.marketStatus==="transfer"?"#f59e0b":"rgba(245,158,11,.08)",color:selling.marketStatus==="transfer"?"#1a1200":"#f59e0b",fontWeight:800,fontSize:11}}>{selling.marketStatus==="transfer"?"Quitar transferible":"📌 Poner transferible"}</button><button onClick={()=>{onUserMarketStatus(selling.id,"loan");setSelling({...selling,marketStatus:selling.marketStatus==="loan"?null:"loan"});}} style={{padding:10,borderRadius:8,border:"1px solid rgba(96,165,250,.25)",background:selling.marketStatus==="loan"?"#60a5fa":"rgba(96,165,250,.08)",color:selling.marketStatus==="loan"?"#08111f":"#60a5fa",fontWeight:800,fontSize:11}}>{selling.marketStatus==="loan"?"Quitar cedible":"🔁 Poner cedible"}</button></div>
            </div>
          )}
        </div>
      )}

      {/* HISTORIAL */}
      {tab === "historial" && (
        <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
          {history.length === 0 ? (
            <div style={{ textAlign:"center", color:"#4b5563", padding:"40px 0", fontSize:13 }}>
              El mercado todavía no ha registrado movimientos.
            </div>
          ) : (
            history.map((t,i)=>{
              const isBuy = ["buy","loanIn"].includes(t.type);
              const isLeague=["ai","loan","renewal"].includes(t.type);const from=TEAMS.find(team=>team.id===t.fromTeamId);const to=TEAMS.find(team=>team.id===t.toTeamId);
              return (
                <div key={i} style={{ background:"#161a24", border:`1px solid ${isBuy?"rgba(201,168,76,.2)":"rgba(34,197,94,.2)"}`,
                  borderRadius:9, padding:"12px 14px", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:7, background:isBuy?"rgba(201,168,76,.15)":"rgba(34,197,94,.15)",
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                      {t.type==="loanIn"?"🔁":isBuy?"🛒":t.type==="loan"?"🔄":t.type==="renewal"?"📝":isLeague?"🤝":"💰"}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#e8eaf0" }}>{t.player.name}</div>
                      <div style={{ fontSize:10, color:"#6b7280" }}>{isLeague?(t.type==="renewal"?`${from?.short} · renovación`:`${from?.short} → ${to?.short}`):t.player.pos} · J{t.matchday}</div>
                      {["buy","loanIn"].includes(t.type)&&<div style={{fontSize:8,color:"#8b92a3",marginTop:3}}>Oferta club: {fmt(t.cost)} · Contrato: {fmt(t.salary)}/sem · {t.player.contractYears??3} años · Cerrada</div>}
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:isBuy?"#ef4444":isLeague?"#60a5fa":"#22c55e" }}>
                        {isLeague?(t.type==="renewal"?"Renovado":fmt(t.value)):`${isBuy?"-":"+"}${fmt(isBuy?t.cost:t.value)}`}
                      </div>
                      <div style={{ fontSize:9, color:"#4b5563" }}>{isLeague?"Mercado IA":t.type==="loanIn"?"Coste cesión":isBuy?"Coste":"Ingreso"}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      </SwipeTabs>
    </div>
  );
}

function BottomNav({ screen, setScreen, disabled, attentionCount = 0 }) {
  if (disabled) return null;
  const moreActive=screen==="more"||SECONDARY_SCREEN_IDS.has(screen);
  return (
    <div style={{background:"rgba(16,19,28,.97)",backdropFilter:"blur(14px)",borderTop:"1px solid rgba(255,255,255,.08)",padding:"4px 5px env(safe-area-inset-bottom,0px)",flexShrink:0,boxShadow:"0 -8px 24px rgba(0,0,0,.28)"}}>
      <div style={{display:"flex",height:58}}>{PRIMARY_NAV.map(item=>{const active=item.id==="more"?moreActive:screen===item.id;return <button key={item.id} onClick={()=>setScreen(item.id)} className="bottom-nav-btn" style={{position:"relative",flex:1,minWidth:0,background:"transparent",border:"none",color:active?"#c9a84c":"#5f6675",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer",transition:"color .18s,transform .15s"}}>{active&&<span style={{position:"absolute",top:0,width:24,height:2,borderRadius:2,background:"#c9a84c",boxShadow:"0 0 10px rgba(201,168,76,.65)"}}/>}<span style={{position:"relative",fontSize:item.id==="more"?20:19,lineHeight:1,filter:active?"none":"grayscale(.45) opacity(.72)"}}>{item.icon}{item.id==="more"&&attentionCount>0&&<span style={{position:"absolute",top:-7,right:-12,minWidth:17,height:17,padding:"0 4px",borderRadius:10,background:"#c9a84c",color:"#1a1200",fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 0 2px #10131c"}}>{attentionCount}</span>}</span><span style={{fontSize:10,fontWeight:active?800:600,letterSpacing:".1px",whiteSpace:"nowrap"}}>{item.label}</span></button>})}</div>
    </div>
  );
}

// ─── ESTILOS GLOBALES ────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
  @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
  @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
  @keyframes cardFlip { from { transform:rotateY(0deg); } to { transform:rotateY(180deg); } }
  @keyframes goalPop { 0% { transform:scale(1); } 40% { transform:scale(1.15); } 100% { transform:scale(1); } }
  @keyframes bounceIn { 0% { transform:scale(.8); opacity:0; } 60% { transform:scale(1.05); opacity:1; } 100% { transform:scale(1); } }
  @keyframes moreMenuIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes tileIn { from { opacity:0; transform:translateY(7px); } to { opacity:1; transform:translateY(0); } }

  *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

  /* Asegura que todo ocupe el ancho correcto sin desbordar */
  html, body { width: 100%; overflow: hidden; }
  #root { width: 100%; max-width: 540px; }

  /* Scrollbar fino */
  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(201,168,76,.2); border-radius: 2px; }

  input::placeholder { color: #4b5563; }
  input:focus { outline: none; }

  .screen-enter { animation: fadeIn .2s ease both; }

  .btn-gold {
    background: linear-gradient(135deg,#c9a84c,#e8c96a);
    color: #1a1200; border: none; border-radius: 10px;
    font-weight: 800; cursor: pointer; letter-spacing: .3px;
    transition: transform .15s, box-shadow .15s, filter .15s;
    box-shadow: 0 4px 14px rgba(201,168,76,.3);
  }
  .btn-gold:hover  { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201,168,76,.45); }
  .btn-gold:active { transform: translateY(0); }

  .btn-ghost {
    background: rgba(255,255,255,.04); color: #e8eaf0;
    border: 1px solid rgba(255,255,255,.1); border-radius: 10px;
    font-weight: 600; cursor: pointer;
    transition: background .15s;
  }
  .btn-ghost:hover { background: rgba(255,255,255,.08); }

  .card-hover { transition: transform .15s, box-shadow .15s; }
  .card-hover:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.4); }
  .more-menu-enter { animation: moreMenuIn .22s ease both; }
  .nav-tile { animation: tileIn .2s ease both; transition: transform .15s, border-color .15s, background .15s; }
  .nav-tile:hover { transform:translateY(-2px); border-color:rgba(201,168,76,.35)!important; }
  .nav-tile:active, .bottom-nav-btn:active { transform:scale(.96); }
  .quick-action-card { animation:tileIn .2s ease both; transition:transform .15s,filter .15s; }
  .quick-action-card:hover { transform:translateY(-1px); filter:brightness(1.08); }
  .quick-action-card:active { transform:scale(.98); }
  .reduce-motion *, .reduce-motion *::before, .reduce-motion *::after { animation-duration:.001ms!important; animation-iteration-count:1!important; transition-duration:.001ms!important; }

  .goal-event { animation: goalPop .4s ease; }
  .bounce-in  { animation: bounceIn .35s cubic-bezier(.34,1.56,.64,1) both; }

  .rarity-special-glow { box-shadow: 0 0 14px rgba(196,181,253,.3); }
  .rarity-gold-glow    { box-shadow: 0 0 10px rgba(201,168,76,.2); }
`;

function useGlobalStyles() {
  useEffect(() => {
    const id = "legacy-manager-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = GLOBAL_CSS;
      document.head.appendChild(el);
    }
    try { const preferences=JSON.parse(localStorage.getItem("legacy_manager_preferences")??"{}"); document.documentElement.classList.toggle("reduce-motion",preferences.animations===false); } catch (e) {}
    return () => {};
  }, []);
}

// Wrapper con animación de entrada para cada pantalla
function ScreenWrapper({ children, animKey }) {
  return (
    <div key={animKey} className="screen-enter" style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minHeight:0 }}>
      {children}
    </div>
  );
}

function MainMenu({ onNew, onSaves, savesCount }) {
  const [hovNew, setHovNew] = useState(false);
  const [hovCont, setHovCont] = useState(false);

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 50% 30%, #1a2a3a 0%, #0d0f14 70%)", zIndex:0 }}/>
      <div style={{ position:"absolute", inset:0, zIndex:0, opacity:.07 }}>
        <svg width="100%" height="100%" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
          <rect x="40" y="80" width="320" height="440" fill="none" stroke="white" strokeWidth="2"/>
          <line x1="40" y1="300" x2="360" y2="300" stroke="white" strokeWidth="1.5"/>
          <circle cx="200" cy="300" r="60" fill="none" stroke="white" strokeWidth="1.5"/>
          <circle cx="200" cy="300" r="3" fill="white"/>
          <rect x="120" y="80" width="160" height="60" fill="none" stroke="white" strokeWidth="1.5"/>
          <rect x="120" y="460" width="160" height="60" fill="none" stroke="white" strokeWidth="1.5"/>
          <rect x="155" y="80" width="90" height="28" fill="none" stroke="white" strokeWidth="1"/>
          <rect x="155" y="492" width="90" height="28" fill="none" stroke="white" strokeWidth="1"/>
        </svg>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 28px", position:"relative", zIndex:1 }}>
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <div style={{ width:90, height:90, background:"linear-gradient(135deg,#c9a84c,#f5d080)", borderRadius:20, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:44, boxShadow:"0 8px 32px rgba(201,168,76,.35), 0 0 0 1px rgba(201,168,76,.3)" }}>⚽</div>
          <div style={{ fontSize:36, fontWeight:800, letterSpacing:6, color:"#c9a84c", lineHeight:1, textShadow:"0 2px 20px rgba(201,168,76,.4)" }}>LEGACY</div>
          <div style={{ fontSize:36, fontWeight:200, letterSpacing:8, color:"#e8eaf0", lineHeight:1.1 }}>MANAGER</div>
          <div style={{ width:60, height:2, background:"linear-gradient(90deg,transparent,#c9a84c,transparent)", margin:"14px auto 12px" }}/>
          <div style={{ fontSize:12, color:"#4b5563", letterSpacing:2, textTransform:"uppercase" }}>Construye tu club · Forja tu legado</div>
        </div>
        <div style={{ width:"100%", maxWidth:300, display:"flex", flexDirection:"column", gap:10 }}>
          <button onClick={onNew}
            onMouseEnter={()=>setHovNew(true)} onMouseLeave={()=>setHovNew(false)}
            style={{ width:"100%", background: hovNew?"#d4b05c":"linear-gradient(135deg,#c9a84c,#e8c96a)", color:"#1a1200", border:"none", padding:"16px 24px", borderRadius:10, fontWeight:800, fontSize:16, cursor:"pointer", letterSpacing:.5, boxShadow: hovNew?"0 6px 24px rgba(201,168,76,.5)":"0 4px 16px rgba(201,168,76,.3)", transition:"all .2s", transform:hovNew?"translateY(-1px)":"none" }}>
            ▶ Nueva partida
          </button>
          {savesCount > 0 && (
            <button onClick={onSaves}
              onMouseEnter={()=>setHovCont(true)} onMouseLeave={()=>setHovCont(false)}
              style={{ width:"100%", background: hovCont?"rgba(255,255,255,.08)":"rgba(255,255,255,.04)", color:"#e8eaf0", border:"1px solid rgba(255,255,255,.15)", padding:"14px 24px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", transition:"all .2s" }}>
              Continuar partida{savesCount > 1 ? ` (${savesCount})` : ""}
            </button>
          )}
        </div>
        <div style={{ marginTop:40, fontSize:11, color:"#374151", letterSpacing:1.5, textTransform:"uppercase" }}>LaLiga EA Sports · 2025/26</div>
      </div>
    </div>
  );
}

// ─── PANTALLA: LISTA DE PARTIDAS GUARDADAS ────────────────────────────────────
function SavesScreen({ saves, onLoad, onDelete, onNew, onBack }) {
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ background:"#13161f", borderBottom:"1px solid rgba(255,255,255,.07)", padding:"14px 16px", flexShrink:0 }}>
        <div style={{ fontSize:18, fontWeight:800, color:"#c9a84c" }}>Mis partidas</div>
        <div style={{ fontSize:11, color:"#4b5563", marginTop:2 }}>{saves.length} partida{saves.length!==1?"s":""} guardada{saves.length!==1?"s":""}</div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
        {saves.length === 0 && (
          <div style={{ textAlign:"center", color:"#4b5563", padding:"40px 0", fontSize:13 }}>No hay partidas guardadas.</div>
        )}
        {[...saves].sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)).map(s => {
          const team = TEAMS.find(t => t.id === s.teamId);
          return (
            <div key={s.id} style={{ background:"#161a24", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, padding:"14px", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:`${team?.color??'#c9a84c'}22`, border:`2px solid ${team?.color??'#c9a84c'}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:800, color:team?.color??'#c9a84c', flexShrink:0 }}>
                  {team?.short ?? "??"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#e8eaf0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name ?? team?.name ?? "Partida"}</div>
                  <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>J{s.matchday} · Temp. {s.season}/{ parseInt(s.season)+1 }</div>
                  <div style={{ fontSize:10, color:"#374151", marginTop:1 }}>Guardada: {fmtDate(s.updatedAt)}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {confirmDelete === s.id ? (
                  <>
                    <div style={{ flex:1, fontSize:11, color:"#ef4444", display:"flex", alignItems:"center" }}>¿Eliminar esta partida?</div>
                    <button onClick={() => { onDelete(s.id); setConfirmDelete(null); }}
                      style={{ background:"rgba(239,68,68,.15)", border:"1px solid rgba(239,68,68,.3)", color:"#ef4444", padding:"6px 12px", borderRadius:7, fontSize:12, cursor:"pointer" }}>Sí, borrar</button>
                    <button onClick={() => setConfirmDelete(null)}
                      style={{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"#9aa0b4", padding:"6px 12px", borderRadius:7, fontSize:12, cursor:"pointer" }}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => onLoad(s.id)} className="btn-gold"
                      style={{ flex:1, padding:"9px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                      ▶ Continuar
                    </button>
                    <button onClick={() => setConfirmDelete(s.id)}
                      style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.2)", color:"#ef4444", padding:"9px 14px", borderRadius:8, fontSize:13, cursor:"pointer" }}>
                      🗑
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <button onClick={onNew} className="btn-ghost"
          style={{ width:"100%", padding:"12px", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", marginTop:4 }}>
          + Crear nueva partida
        </button>
      </div>
      <div style={{ padding:"10px 14px", borderTop:"1px solid rgba(255,255,255,.06)", flexShrink:0 }}>
        <button onClick={onBack} className="btn-ghost"
          style={{ width:"100%", padding:"10px", borderRadius:8, fontSize:12, cursor:"pointer" }}>
          ← Volver al menú
        </button>
      </div>
    </div>
  );
}

// ─── DATOS DE PAÍSES Y LIGAS ─────────────────────────────────────────────────
const COUNTRIES = [
  { id: "es", name: "España", flag: "🇪🇸", available: true },
  { id: "en", name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", available: false },
  { id: "de", name: "Alemania",   flag: "🇩🇪", available: false },
  { id: "it", name: "Italia",     flag: "🇮🇹", available: false },
  { id: "fr", name: "Francia",    flag: "🇫🇷", available: false },
  { id: "pt", name: "Portugal",   flag: "🇵🇹", available: false },
];

const LEAGUES_BY_COUNTRY = {
  es: [
    { id: "laliga",   name: "LaLiga EA Sports",  division: "1ª División", teams: 20, available: true },
    { id: "laliga2",  name: "LaLiga Hypermotion", division: "2ª División", teams: 22, available: false },
  ],
  en: [
    { id: "premier",  name: "Premier League",     division: "1ª División", teams: 20, available: false },
    { id: "championship", name: "Championship",   division: "2ª División", teams: 24, available: false },
  ],
  de: [
    { id: "bundesliga", name: "Bundesliga",       division: "1ª División", teams: 18, available: false },
  ],
  it: [
    { id: "seriea",   name: "Serie A",            division: "1ª División", teams: 20, available: false },
  ],
  fr: [
    { id: "ligue1",   name: "Ligue 1",            division: "1ª División", teams: 18, available: false },
  ],
  pt: [
    { id: "primeiramain", name: "Primeira Liga",  division: "1ª División", teams: 18, available: false },
  ],
};

// ─── PANTALLA: SELECCIÓN DE PAÍS ─────────────────────────────────────────────
function CountryScreen({ onSelect, onBack }) {
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ background:"#13161f", borderBottom:"1px solid rgba(255,255,255,.07)", padding:"14px 16px", flexShrink:0 }}>
        <div style={{ fontSize:18, fontWeight:800, color:"#e8eaf0" }}>Selecciona un país</div>
        <div style={{ fontSize:11, color:"#4b5563", marginTop:2 }}>Elige el país de la liga que quieres gestionar</div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {COUNTRIES.map(c => (
            <div key={c.id} onClick={() => c.available && onSelect(c)}
              style={{ background: c.available ? "#161a24" : "#0f1118",
                border: `1px solid ${c.available ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.03)"}`,
                borderRadius:10, padding:"16px 12px", cursor: c.available ? "pointer" : "default",
                opacity: c.available ? 1 : .45, textAlign:"center", transition:"background .15s" }}
              onMouseEnter={e => c.available && (e.currentTarget.style.background="#1e2330")}
              onMouseLeave={e => c.available && (e.currentTarget.style.background="#161a24")}>
              <div style={{ fontSize:36, marginBottom:8 }}>{c.flag}</div>
              <div style={{ fontSize:13, fontWeight:700, color: c.available ? "#e8eaf0" : "#4b5563" }}>{c.name}</div>
              {!c.available && <div style={{ fontSize:10, color:"#374151", marginTop:4 }}>Próximamente</div>}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:"10px 14px", borderTop:"1px solid rgba(255,255,255,.06)", flexShrink:0 }}>
        <button onClick={onBack} className="btn-ghost"
          style={{ width:"100%", padding:"10px", borderRadius:8, fontSize:12, cursor:"pointer" }}>
          ← Volver
        </button>
      </div>
    </div>
  );
}

// ─── PANTALLA: SELECCIÓN DE LIGA ─────────────────────────────────────────────
function LeagueScreen({ country, onSelect, onBack }) {
  const leagues = LEAGUES_BY_COUNTRY[country?.id] ?? [];
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ background:"#13161f", borderBottom:"1px solid rgba(255,255,255,.07)", padding:"14px 16px", flexShrink:0 }}>
        <div style={{ fontSize:18, fontWeight:800, color:"#e8eaf0" }}>{country?.flag} {country?.name}</div>
        <div style={{ fontSize:11, color:"#4b5563", marginTop:2 }}>Elige la liga que quieres gestionar</div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
        {leagues.map(l => (
          <div key={l.id} onClick={() => l.available && onSelect(l)}
            style={{ background: l.available ? "#161a24" : "#0f1118",
              border:`1px solid ${l.available ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.03)"}`,
              borderRadius:10, padding:"16px", marginBottom:8, cursor: l.available ? "pointer" : "default",
              opacity: l.available ? 1 : .5, display:"flex", alignItems:"center", gap:14, transition:"background .15s" }}
            onMouseEnter={e => l.available && (e.currentTarget.style.background="#1e2330")}
            onMouseLeave={e => l.available && (e.currentTarget.style.background="#161a24")}>
            <div style={{ width:48, height:48, borderRadius:10, background:"rgba(201,168,76,.1)", border:"1px solid rgba(201,168,76,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🏆</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color: l.available ? "#e8eaf0" : "#4b5563" }}>{l.name}</div>
              <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>{l.division} · {l.teams} equipos</div>
              {!l.available && <div style={{ fontSize:10, color:"#374151", marginTop:3 }}>Próximamente</div>}
            </div>
            {l.available && <div style={{ fontSize:16, color:"#c9a84c" }}>→</div>}
          </div>
        ))}
      </div>
      <div style={{ padding:"10px 14px", borderTop:"1px solid rgba(255,255,255,.06)", flexShrink:0 }}>
        <button onClick={onBack} className="btn-ghost"
          style={{ width:"100%", padding:"10px", borderRadius:8, fontSize:12, cursor:"pointer" }}>
          ← Volver a países
        </button>
      </div>
    </div>
  );
}

// Datos extra por equipo para la ficha de selección
const TEAM_DETAILS = {
  athletic:    { liga: "Primera División", fundacion: 1898, rivalidad: "Real Sociedad", estilo: "Cantera vasca · Físico · Presión alta" },
  atletico:    { liga: "Primera División", fundacion: 1903, rivalidad: "Real Madrid",   estilo: "Defensivo · Intenso · Contraataque" },
  barcelona:   { liga: "Primera División", fundacion: 1899, rivalidad: "Real Madrid",   estilo: "Posesión · Toque corto · Presión alta" },
  betis:       { liga: "Primera División", fundacion: 1907, rivalidad: "Sevilla",        estilo: "Técnico · Juego combinativo · Ofensivo" },
  celta:       { liga: "Primera División", fundacion: 1923, rivalidad: "Deportivo",      estilo: "Ataque · Velocidad · Juego abierto" },
  espanyol:    { liga: "Primera División", fundacion: 1900, rivalidad: "Barcelona",      estilo: "Organizado · Equilibrado · Transiciones" },
  getafe:      { liga: "Primera División", fundacion: 1983, rivalidad: "Leganés",        estilo: "Defensivo · Físico · Directo" },
  girona:      { liga: "Primera División", fundacion: 1930, rivalidad: "Barcelona",      estilo: "Ofensivo · Presión · Posesión" },
  laspalmas:   { liga: "Primera División", fundacion: 1923, rivalidad: "Tenerife",       estilo: "Técnico · Posesión · Juego combinado" },
  leganes:     { liga: "Primera División", fundacion: 1928, rivalidad: "Getafe",         estilo: "Organizado · Compacto · Transiciones" },
  mallorca:    { liga: "Primera División", fundacion: 1916, rivalidad: "Atlético Baleares", estilo: "Físico · Directo · Defensivo" },
  osasuna:     { liga: "Primera División", fundacion: 1920, rivalidad: "Athletic",       estilo: "Intenso · Presión · Físico" },
  rayo:        { liga: "Primera División", fundacion: 1924, rivalidad: "Atlético",       estilo: "Ataque · Velocidad · Directo" },
  realmadrid:  { liga: "Primera División", fundacion: 1902, rivalidad: "Barcelona",      estilo: "Ganador · Contraataque · Calidad individual" },
  realsociedad:{ liga: "Primera División", fundacion: 1909, rivalidad: "Athletic",       estilo: "Técnico · Posesión · Cantera" },
  sevilla:     { liga: "Primera División", fundacion: 1890, rivalidad: "Betis",          estilo: "Organizado · Europa · Intenso" },
  valencia:    { liga: "Primera División", fundacion: 1919, rivalidad: "Villarreal",     estilo: "Histórico · Físico · Equilibrado" },
  valladolid:  { liga: "Primera División", fundacion: 1928, rivalidad: "Salamanca",      estilo: "Compacto · Defensivo · Directo" },
  villarreal:  { liga: "Primera División", fundacion: 1923, rivalidad: "Valencia",       estilo: "Técnico · Europa · Posesión" },
  alaves:      { liga: "Primera División", fundacion: 1921, rivalidad: "Athletic",       estilo: "Compacto · Físico · Contraataque" },
};

function TeamSelection({ onSelect }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState("");

  const filtered = TEAMS.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.city.toLowerCase().includes(search.toLowerCase())
  );

  // Ficha detallada del equipo seleccionado
  if (selected) {
    const squad   = REAL_SQUADS[selected.id] ?? [];
    const details = TEAM_DETAILS[selected.id] ?? {};

    // Jugadores estrella: top 3 por overall
    const stars = [...squad].sort((a,b) => b.overall - a.overall).slice(0, 3);

    // Media real de porteros, defensas, medios, delanteros
    const groupAvg = (group) => {
      const g = squad.filter(p => p.group === group);
      return g.length ? Math.round(g.reduce((s,p)=>s+p.overall,0)/g.length) : 0;
    };
    const gkAvg  = groupAvg("POR");
    const defAvg = groupAvg("DEF");
    const medAvg = groupAvg("MED");
    const delAvg = groupAvg("DEL");
    const totalAvg = squad.length ? Math.round(squad.reduce((s,p)=>s+p.overall,0)/squad.length) : selected.avg;

    const rarityCount = { SPECIAL:0, GOLD:0, SILVER:0, BRONZE:0 };
    squad.forEach(p => rarityCount[p.rarity]++);

    const diffColor = (v) => v >= 80 ? "#22c55e" : v >= 74 ? "#c9a84c" : v >= 68 ? "#f59e0b" : "#ef4444";

    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Header equipo */}
        <div style={{ background:`linear-gradient(135deg, ${selected.color}22, #0d0f14)`, borderBottom:"1px solid rgba(255,255,255,.08)", padding:"16px 16px 14px", flexShrink:0 }}>
          <button onClick={() => setSelected(null)}
            style={{ background:"transparent", border:"none", color:"#9aa0b4", cursor:"pointer", fontSize:13, padding:0, marginBottom:12, display:"flex", alignItems:"center", gap:4 }}>
            ← Volver a la lista
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <TeamCrest team={selected} size={60}/>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:"#e8eaf0" }}>{selected.name}</div>
              <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>📍 {selected.city} · {selected.stadium}</div>
              <div style={{ fontSize:11, color:selected.color, marginTop:3, fontWeight:600 }}>🎯 Objetivo: {selected.obj}</div>
            </div>
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:14 }}>
          {/* Medias por línea */}
          <div style={{ background:"#161a24", borderRadius:10, padding:14, marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:12 }}>NIVEL DE LA PLANTILLA</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:32, fontWeight:800, color:diffColor(totalAvg) }}>{totalAvg}</div>
                <div style={{ fontSize:10, color:"#6b7280", fontWeight:600 }}>MEDIA</div>
              </div>
              <div style={{ display:"flex", gap:16 }}>
                {[["POR", gkAvg], ["DEF", defAvg], ["MED", medAvg], ["DEL", delAvg]].map(([label, val]) => (
                  <div key={label} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:20, fontWeight:700, color:diffColor(val) }}>{val}</div>
                    <div style={{ fontSize:10, color:"#6b7280", fontWeight:600 }}>{label}</div>
                    <div style={{ width:32, height:3, borderRadius:2, background:"#1e2330", marginTop:4, overflow:"hidden" }}>
                      <div style={{ width:`${((val-60)/40)*100}%`, height:"100%", background:diffColor(val), borderRadius:2 }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Rarezas */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {Object.entries(rarityCount).filter(([,v])=>v>0).map(([r,v])=>(
                <div key={r} style={{ background:`${RARITY_ACCENT[r]}18`, border:`1px solid ${RARITY_ACCENT[r]}44`, borderRadius:6, padding:"3px 10px", fontSize:11, color:RARITY_ACCENT[r], fontWeight:700 }}>
                  {v} {RARITY_LABEL[r]}
                </div>
              ))}
            </div>
          </div>

          {/* Jugadores estrella */}
          <div style={{ background:"#161a24", borderRadius:10, padding:14, marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:12 }}>⭐ JUGADORES ESTRELLA</div>
            {stars.map((p, i) => {
              const acc = RARITY_ACCENT[p.rarity];
              return (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom: i < stars.length-1 ? 12 : 0, paddingBottom: i < stars.length-1 ? 12 : 0, borderBottom: i < stars.length-1 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                  <div style={{ width:44, height:44, borderRadius:10, background:`${acc}20`, border:`1.5px solid ${acc}55`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:16, fontWeight:800, color:acc }}>{p.overall}</span>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#e8eaf0" }}>{p.name}</div>
                    <div style={{ fontSize:11, color:"#6b7280", marginTop:1 }}>{p.pos} · {p.age} años · {NAT_FLAG[p.nat]??""}</div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    {Object.entries(p.attrs).filter(([k])=>k!=="porteria"||p.group==="POR").slice(0,3).map(([k,v])=>(
                      <div key={k} style={{ textAlign:"center" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:v>=80?"#22c55e":v>=70?"#c9a84c":"#9aa0b4" }}>{v}</div>
                        <div style={{ fontSize:9, color:"#4b5563" }}>{k.slice(0,3).toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, color:acc, background:`${acc}18`, padding:"2px 7px", borderRadius:4 }}>{RARITY_LABEL[p.rarity]}</span>
                </div>
              );
            })}
          </div>

          {/* Info del club */}
          <div style={{ background:"#161a24", borderRadius:10, padding:14, marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:10 }}>INFO DEL CLUB</div>
            {[
              ["🏟️ Estadio",    selected.stadium],
              ["📅 Fundación",  details.fundacion],
              ["⚔️ Rival",      details.rivalidad],
              ["💶 Presupuesto",`€${selected.budget}M`],
              ["👥 Plantilla",  `${squad.length} jugadores`],
              ["🎮 Estilo",     details.estilo],
            ].map(([label, val]) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                <span style={{ fontSize:12, color:"#6b7280" }}>{label}</span>
                <span style={{ fontSize:12, color:"#e8eaf0", fontWeight:600, textAlign:"right", maxWidth:"60%" }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Dificultad */}
          <div style={{ background:"#161a24", borderRadius:10, padding:14, marginBottom:16 }}>
            <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:8 }}>DIFICULTAD</div>
            {(() => {
              const avg = totalAvg;
              const diff = avg >= 85 ? { label:"Muy difícil", color:"#ef4444", stars:5, desc:"Máxima exigencia. Se esperan títulos." }
                         : avg >= 79 ? { label:"Difícil",     color:"#f97316", stars:4, desc:"Objetivo Champions. Presión alta." }
                         : avg >= 74 ? { label:"Media",       color:"#f59e0b", stars:3, desc:"Competir en la mitad alta de la tabla." }
                         : avg >= 70 ? { label:"Asequible",   color:"#22c55e", stars:2, desc:"Salvar la categoría como prioridad." }
                         :             { label:"Fácil",        color:"#3b82f6", stars:1, desc:"Sin presión. Ideal para aprender." };
              return (
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:diff.color, marginBottom:3 }}>{diff.label}</div>
                    <div style={{ fontSize:11, color:"#6b7280" }}>{diff.desc}</div>
                  </div>
                  <div style={{ display:"flex", gap:3 }}>
                    {[1,2,3,4,5].map(i=>(
                      <div key={i} style={{ width:10, height:10, borderRadius:"50%", background: i<=diff.stars ? diff.color : "#1e2330" }}/>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Botón confirmar */}
          <button onClick={() => onSelect(selected)}
            style={{ width:"100%", background:`linear-gradient(135deg, ${selected.color}, ${selected.color}bb)`, color:"#000", border:"none", padding:"15px", borderRadius:10, fontWeight:800, fontSize:16, cursor:"pointer", letterSpacing:".5px" }}>
            Elegir {selected.name} →
          </button>
        </div>
      </div>
    );
  }

  // Lista de equipos
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Buscador */}
      <div style={{ padding:"10px 14px", borderBottom:"1px solid rgba(255,255,255,.06)", flexShrink:0 }}>
        <div style={{ background:"#161a24", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, padding:"8px 12px", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:"#6b7280", fontSize:14 }}>🔍</span>
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar equipo o ciudad..."
            style={{ background:"transparent", border:"none", outline:"none", color:"#e8eaf0", fontSize:13, flex:1, fontFamily:"inherit" }}
          />
          {search && <button onClick={()=>setSearch("")} style={{ background:"transparent", border:"none", color:"#6b7280", cursor:"pointer", fontSize:14, padding:0 }}>✕</button>}
        </div>
      </div>

      <div style={{ overflowY:"auto", flex:1, padding:12 }}>
        <div style={{ fontSize:11, color:"#6b7280", marginBottom:10, letterSpacing:".5px" }}>
          PRIMERA DIVISIÓN 2025/26 · {filtered.length} equipos
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filtered.map(t => {
            const squad = REAL_SQUADS[t.id] ?? [];
            const avg   = squad.length ? Math.round(squad.reduce((s,p)=>s+p.overall,0)/squad.length) : t.avg;
            const stars = [...squad].sort((a,b)=>b.overall-a.overall).slice(0,2);
            const diffColor = avg>=85?"#ef4444":avg>=79?"#f97316":avg>=74?"#f59e0b":"#22c55e";
            return (
              <div key={t.id} onClick={() => setSelected(t)}
                className="card-hover"
                style={{ background:"#161a24", border:"1px solid rgba(255,255,255,.07)", borderRadius:10, padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=t.color}
                onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,.07)"}>
                {/* Escudo */}
                <TeamCrest team={t} size={44}/>
                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#e8eaf0" }}>{t.name}</div>
                  <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>📍 {t.city} · {t.stadium}</div>
                  {/* Estrellas */}
                  {stars.length > 0 && (
                    <div style={{ fontSize:10, color:"#4b5563", marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      ⭐ {stars.map(p=>p.name.split(" ")[0]).join(" · ")}
                    </div>
                  )}
                </div>
                {/* Media + objetivo */}
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:22, fontWeight:800, color:diffColor }}>{avg}</div>
                  <div style={{ fontSize:10, color:t.color, fontWeight:600, marginTop:1 }}>{t.obj}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ game, onPlay, setScreen, lineup, attentionItems = [] }) {
  const team      = TEAMS.find(t => t.id === game.teamId);
  const standing  = game.standings.find(s => s.teamId === game.teamId);
  const pos       = [...game.standings].sort((a,b) => b.points-a.points || b.goalDifference-a.goalDifference).findIndex(s => s.teamId===game.teamId) + 1;
  const nextFixture = game.fixtures.find(f => !f.played && (f.homeTeamId===game.teamId||f.awayTeamId===game.teamId));
  const lastResults = game.fixtures.filter(f => f.played && (f.homeTeamId===game.teamId||f.awayTeamId===game.teamId)).slice(-5);
  const players   = game.players;
  const avgMorale  = Math.round(players.reduce((s,p) => s + (p.morale  ?? 75), 0) / Math.max(1, players.length));
  const avgFatigue = Math.round(players.reduce((s,p) => s + (p.fatigue ?? 20), 0) / Math.max(1, players.length));
  const injured    = players.filter(p=>p.injured).length;
  const suspended  = players.filter(p=>p.suspended).length;
  const season     = game.season ?? "2025";
  const seasonLabel = `${season}/${String(parseInt(season)+1).slice(-2)}`;

  const availablePlayers = players.filter(p=>!p.injured&&!p.suspended);
  const lineupPlayers    = lineup.filter(id=>id&&availablePlayers.find(p=>p.id===id));
  const lineupValid      = lineupPlayers.length === 11;
  const lineupCount      = lineupPlayers.length;

  // Presupuesto disponible REAL — mismo cálculo que en FinancesScreen, para que ambas pantallas coincidan
  const budgetSnapshot = calculateBudgetSnapshot(game, team);
  const budgetLeft     = budgetSnapshot.transferBudget;
  const fmtBudget = (v) => v >= 1000 ? `€${(v/1000).toFixed(1)}M` : `€${Math.round(v)}K`;

  const getOpponent = (f) => TEAMS.find(t => t.id===(f.homeTeamId===game.teamId?f.awayTeamId:f.homeTeamId));

  // Racha últimos 5
  const racha = [...lastResults].reverse().map(f => {
    const h=f.homeTeamId===game.teamId; const my=h?f.homeGoals:f.awayGoals; const th=h?f.awayGoals:f.homeGoals;
    return my>th?"V":my===th?"E":"D";
  });

  const allPlayed = game.fixtures.every(f=>f.played);
  const latestNews = getDashboardNews(game.news??[],game,3);
  const urgentAttention = attentionItems.filter(item=>item.priority!=="info");
  const topAttention = urgentAttention.slice(0,3);
  const medicalAlerts = players.map(player=>({player,risk:calculateInjuryRisk(player,{fixtures:game.fixtures,teamId:game.teamId}),status:getPhysicalStatus(player)})).filter(item=>item.player.injured||item.risk>50).sort((a,b)=>b.risk-a.risk).slice(0,3);
  const clubPrestigeLevel = getPrestigeLevel(game.legacy?.clubPrestige??30);
  const managerPrestigeLevel = getPrestigeLevel(game.legacy?.manager?.prestige??10,true);

  return (
    <div style={{ flex:1, overflowY:"auto", padding:14 }}>
      {/* Club header */}
      <div style={{ background:"linear-gradient(135deg,#1a1f2e,#161a24)", border:"1px solid rgba(201,168,76,.2)", borderRadius:12, padding:14, marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <TeamCrest team={team} size={50}/>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:16, color:"#e8eaf0" }}>{team.name}</div>
            <div style={{ fontSize:11, color:"#6b7280", marginTop:1 }}>{team.stadium} · T. {seasonLabel}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:28, fontWeight:800, color:"#c9a84c", lineHeight:1 }}>{pos}º</div>
            <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>{standing?.points??0} pts</div>
          </div>
        </div>
        {/* Racha */}
        {racha.length > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:10 }}>
            <span style={{ fontSize:10, color:"#4b5563", fontWeight:600 }}>RACHA:</span>
            <div style={{ display:"flex", gap:4 }}>
              {racha.map((r,i)=>{
                const c=r==="V"?"#22c55e":r==="E"?"#f59e0b":"#ef4444";
                return <div key={i} style={{ width:20,height:20,borderRadius:4,background:`${c}22`,border:`1px solid ${c}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:c }}>{r}</div>;
              })}
            </div>
            <span style={{ fontSize:10, color:"#4b5563", marginLeft:4 }}>J{game.matchday-1>0?game.matchday-1:""}</span>
          </div>
        )}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}><button onClick={()=>setScreen("board")} style={{textAlign:"left",background:"linear-gradient(135deg,rgba(201,168,76,.13),#161a24)",border:"1px solid rgba(201,168,76,.2)",borderRadius:9,padding:11,cursor:"pointer"}}><div style={{fontSize:9,color:"#6b7280",fontWeight:700}}>🏆 PRESTIGIO CLUB</div><div style={{fontSize:21,color:clubPrestigeLevel.color,fontWeight:900,marginTop:3}}>{Math.round(game.legacy?.clubPrestige??30)}<span style={{fontSize:9,color:"#6b7280"}}>/100</span></div><div style={{fontSize:9,color:clubPrestigeLevel.color}}>{clubPrestigeLevel.label}</div></button><button onClick={()=>setScreen("board")} style={{textAlign:"left",background:"linear-gradient(135deg,rgba(167,139,250,.10),#161a24)",border:"1px solid rgba(167,139,250,.18)",borderRadius:9,padding:11,cursor:"pointer"}}><div style={{fontSize:9,color:"#6b7280",fontWeight:700}}>⭐ PRESTIGIO ENTRENADOR</div><div style={{fontSize:21,color:managerPrestigeLevel.color,fontWeight:900,marginTop:3}}>{Math.round(game.legacy?.manager?.prestige??10)}<span style={{fontSize:9,color:"#6b7280"}}>/100</span></div><div style={{fontSize:9,color:managerPrestigeLevel.color}}>{managerPrestigeLevel.label}</div></button></div>

      {/* Temporada terminada */}
      {allPlayed && (
        <div style={{ background:"rgba(201,168,76,.1)", border:"1px solid rgba(201,168,76,.3)", borderRadius:10, padding:14, marginBottom:12, textAlign:"center" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#c9a84c", marginBottom:4 }}>🏁 ¡Temporada {seasonLabel} completada!</div>
          <div style={{ fontSize:12, color:"#9aa0b4" }}>Posición final: {pos}º · {standing?.points} puntos</div>
        </div>
      )}

      {/* Próximo partido */}
      {nextFixture && !allPlayed && (() => {
        const opp     = getOpponent(nextFixture);
        const isHome  = nextFixture.homeTeamId===game.teamId;
        const homeT   = TEAMS.find(t=>t.id===nextFixture.homeTeamId);
        const awayT   = TEAMS.find(t=>t.id===nextFixture.awayTeamId);
        return (
          <div style={{ background:"#1a1f2e", border:"1px solid rgba(255,255,255,.08)", borderRadius:10, padding:14, marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#c9a84c", fontWeight:600, letterSpacing:".5px", marginBottom:10 }}>PRÓXIMO PARTIDO · J{nextFixture.matchday}</div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ textAlign:"center", flex:1 }}>
                <TeamCrest team={homeT} size={38} style={{margin:"0 auto 4px"}}/>
                <div style={{ fontSize:14, fontWeight:700, color: isHome?"#c9a84c":"#e8eaf0" }}>{homeT?.short}</div>
                <div style={{ fontSize:10, color:"#22c55e" }}>🏠 Local{isHome?" ★":""}</div>
              </div>
              <div style={{ background:"#0d0f14", padding:"8px 14px", borderRadius:8, textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:700, color:"#c9a84c" }}>VS</div>
              </div>
              <div style={{ textAlign:"center", flex:1 }}>
                <TeamCrest team={awayT} size={38} style={{margin:"0 auto 4px"}}/>
                <div style={{ fontSize:14, fontWeight:700, color:!isHome?"#c9a84c":"#e8eaf0" }}>{awayT?.short}</div>
                <div style={{ fontSize:10, color:"#6b7280" }}>✈️ Visitante{!isHome?" ★":""}</div>
              </div>
            </div>
            <div style={{ fontSize:11, color:"#6b7280", textAlign:"center", marginTop:6 }}>
              {opp?.name} · Media {opp?.avg??TEAM_REAL_AVG[opp?.id??""]}
            </div>
            <button onClick={()=>lineupValid?onPlay():setScreen("lineup")}
              className={lineupValid?"btn-gold":""}
              style={{ width:"100%", marginTop:12, background:lineupValid?undefined:"#374151", color:lineupValid?undefined:"#9aa0b4", border:lineupValid?undefined:"1px solid rgba(255,255,255,.08)", padding:"13px", borderRadius:9, fontWeight:700, fontSize:14, cursor:"pointer" }}>
              {lineupValid?"▶ Jugar partido":`⚠️ Alineación incompleta (${lineupCount}/11) — Configurar`}
            </button>
          </div>
        );
      })()}

      <div style={{ background:urgentAttention.length?"linear-gradient(145deg,rgba(201,168,76,.12),#161a24 52%)":"linear-gradient(145deg,rgba(34,197,94,.10),#161a24 52%)", border:`1px solid ${urgentAttention.length?"rgba(201,168,76,.25)":"rgba(34,197,94,.22)"}`, borderRadius:12, padding:14, marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, marginBottom:urgentAttention.length?9:0 }}>
          <div>
            <div style={{ fontSize:11, color:urgentAttention.length?"#c9a84c":"#22c55e", fontWeight:900, letterSpacing:".6px" }}>{urgentAttention.length?"⚠ REQUIERE TU ATENCIÓN":"✅ TODO BAJO CONTROL"}</div>
            <div style={{ fontSize:10, color:"#6b7280", marginTop:3 }}>{urgentAttention.length?`${urgentAttention.length} asunto${urgentAttention.length===1?"":"s"} pendiente${urgentAttention.length===1?"":"s"}`:"No hay asuntos urgentes."}</div>
          </div>
          <button onClick={()=>setScreen("attention")} className={urgentAttention.length?"btn-gold":"btn-ghost"} style={{ padding:"8px 10px", borderRadius:8, fontSize:10, whiteSpace:"nowrap" }}>{urgentAttention.length?"Ver asuntos":"Abrir"}</button>
        </div>
        {topAttention.map((item,index)=>(
          <button key={item.id} onClick={()=>setScreen("attention")} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, textAlign:"left", background:"transparent", border:"none", borderTop:index?"1px solid rgba(255,255,255,.05)":"none", padding:index?"8px 0 0":"0", marginTop:index?0:2, cursor:"pointer" }}>
            <span style={{ fontSize:13 }}>{item.priority==="critical"?"🔴":"🟠"}</span>
            <span style={{ flex:1, color:"#dfe3ec", fontSize:11, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.title}</span>
            <span style={{ color:"#c9a84c", fontSize:13 }}>→</span>
          </button>
        ))}
      </div>

      <div style={{fontSize:10,color:"#6b7280",fontWeight:800,letterSpacing:".7px",margin:"2px 0 8px"}}>ACCIONES RÁPIDAS</div>
      <div className="quick-actions-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        {[["📋","Gestionar alineación","lineup","Once y suplentes","#3b82f6"],["💰","Mercado de fichajes","transfers","Altas y bajas","#22c55e"],["🏋","Entrenar plantilla","training","Plan semanal","#f59e0b"],["📰","Ver noticias","news","Centro de prensa","#a78bfa"]].map(([icon,label,target,helper,accent],index)=><button key={target} onClick={()=>setScreen(target)} className="quick-action-card" style={{display:"flex",alignItems:"center",gap:9,textAlign:"left",background:`linear-gradient(145deg,${accent}10,#161a24)`,border:`1px solid ${accent}22`,borderRadius:10,padding:11,minHeight:72,cursor:"pointer",animationDelay:`${index*35}ms`}}><span style={{fontSize:20}}>{icon}</span><span><strong style={{display:"block",fontSize:10,color:"#e8eaf0",lineHeight:1.25}}>{label}</strong><small style={{display:"block",fontSize:8,color:"#6b7280",marginTop:3}}>{helper}</small></span></button>)}
      </div>

      {/* Stats rápidas */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
        {[
          ["Moral",      avgMorale,  avgMorale>=70?"#22c55e":avgMorale>=50?"#f59e0b":"#ef4444"],
          ["Cansancio",  avgFatigue, avgFatigue<=35?"#22c55e":avgFatigue<=60?"#f59e0b":"#ef4444"],
          ["Presupuesto",fmtBudget(budgetLeft), budgetLeft>=0?"#c9a84c":"#ef4444"],
          ["Bajas",      injured+suspended, injured+suspended===0?"#22c55e":"#ef4444"],
        ].map(([label,val,color])=>(
          <div key={label} style={{ background:"#161a24", borderRadius:8, padding:"12px 14px" }}>
            <div style={{ fontSize:11, color:"#6b7280", marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:22, fontWeight:700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Informe médico */}
      <div style={{ background:"#161a24", border:"1px solid rgba(34,197,94,.17)", borderRadius:10, padding:14, marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:medicalAlerts.length?8:0 }}><div style={{ fontSize:11, color:"#22c55e", fontWeight:700, letterSpacing:".5px" }}>👨‍⚕️ INFORME MÉDICO</div><button onClick={()=>setScreen("medical")} style={{ background:"transparent", border:"none", color:"#22c55e", fontSize:10, fontWeight:700, cursor:"pointer" }}>Abrir centro →</button></div>
        {medicalAlerts.length?medicalAlerts.map(({player,risk,status},index)=><div key={player.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderTop:index?"1px solid rgba(255,255,255,.05)":"none" }}><span>{status.icon}</span><div style={{ flex:1, color:"#c9ced8", fontSize:11 }}>{player.name}<div style={{ color:status.color, fontSize:9, marginTop:2 }}>{player.injured?status.label:`Riesgo de lesión ${risk}% · se recomienda descanso`}</div></div></div>):<div style={{ color:"#6b7280", fontSize:11, marginTop:7 }}>La plantilla se encuentra en buenas condiciones.</div>}
      </div>

      {/* Actualidad relevante del club */}
      <div style={{ background:"linear-gradient(145deg,rgba(201,168,76,.08),#161a24 45%)", border:"1px solid rgba(201,168,76,.22)", borderRadius:11, padding:14, marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:latestNews.length?8:0 }}>
          <div style={{ fontSize:11, color:"#c9a84c", fontWeight:800, letterSpacing:".6px" }}>📌 DESTACADO EN TU CLUB</div>
          <button onClick={()=>setScreen("news")} style={{ background:"transparent", border:"none", color:"#c9a84c", fontSize:10, fontWeight:700, cursor:"pointer" }}>Ver todas →</button>
        </div>
        {latestNews.length ? latestNews.map((item,index)=>(
          <button key={item.id} onClick={()=>setScreen("news")} style={{ width:"100%", display:"flex", alignItems:"flex-start", gap:9, textAlign:"left", background:item.featured?"rgba(239,68,68,.06)":"transparent", border:item.featured?"1px solid rgba(239,68,68,.14)":"none", borderTop:!item.featured&&index?"1px solid rgba(255,255,255,.05)":item.featured?"1px solid rgba(239,68,68,.14)":"none", borderRadius:item.featured?8:0, padding:item.featured?10:"8px 0", marginBottom:item.featured?5:0, cursor:"pointer" }}>
            <span style={{ color:item.importance==="critical"?"#ef4444":item.importance==="high"?"#f97316":"#c9a84c", fontSize:item.featured?15:12 }}>{item.featured?"🔥":"●"}</span>
            <span style={{flex:1}}><strong style={{display:"block",color:"#dfe3ec",fontSize:item.featured?12:11,lineHeight:1.4}}>{item.title}</strong>{item.featured&&item.summary&&<small style={{display:"block",color:"#72798a",fontSize:9,lineHeight:1.45,marginTop:3}}>{item.summary}</small>}</span>
          </button>
        )) : <div style={{ color:"#6b7280", fontSize:11, lineHeight:1.5, marginTop:7 }}>Todavía no hay novedades relevantes en tu club.</div>}
      </div>

      {/* Últimos resultados */}
      {lastResults.length > 0 && (
        <div style={{ background:"#161a24", borderRadius:8, padding:14, marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#6b7280", marginBottom:10, letterSpacing:".5px" }}>ÚLTIMOS RESULTADOS</div>
          {[...lastResults].reverse().map(f=>{
            const opp=getOpponent(f); const isHome=f.homeTeamId===game.teamId;
            const my=isHome?f.homeGoals:f.awayGoals; const th=isHome?f.awayGoals:f.homeGoals;
            const win=my>th; const draw=my===th;
            const col=win?"#22c55e":draw?"#f59e0b":"#ef4444";
            return (
              <div key={f.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                <div style={{ fontSize:12, color:"#9aa0b4" }}>J{f.matchday} {isHome?"vs":"@"} {opp?.short}</div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#e8eaf0" }}>{f.homeGoals}-{f.awayGoals}</div>
                  <div style={{ background:`${col}22`, color:col, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:4 }}>{win?"V":draw?"E":"D"}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Accesos rápidos — ya están en la barra de navegación */}
    </div>
  );
}

function SquadScreen({ game, players, onOpenPlayer }) {
  const [filter, setFilter] = useState("ALL");
  const [statsSeason,setStatsSeason]=useState(String(game.season));
  const filters = [["ALL", "Todos"], ["POR", "Porteros"], ["DEF", "Defensas"], ["MED", "Medios"], ["DEL", "Delanteros"]];
  const shown = filter === "ALL" ? players : players.filter(p => p.group === filter);
  const seasons=[...new Set([String(game.season),...players.flatMap(player=>(player.careerHistory??[]).map(entry=>String(entry.season)))])].sort((a,b)=>Number(b)-Number(a));
  const seasonStats=player=>statsSeason===String(game.season)?getPlayerSeasonStats(player,game,game.teamId):(player.careerHistory??[]).find(entry=>String(entry.season)===statsSeason)??{};
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"9px 14px",background:"#13161f",borderBottom:"1px solid rgba(255,255,255,.06)"}}><div><div style={{fontSize:9,color:"#6b7280",fontWeight:800}}>ESTADÍSTICAS</div><div style={{fontSize:11,color:"#e8eaf0",marginTop:2}}>{statsSeason===String(game.season)?"Temporada actual":"Temporada histórica"}</div></div><select value={statsSeason} onChange={event=>setStatsSeason(event.target.value)} style={{background:"#1e2330",border:"1px solid rgba(201,168,76,.25)",color:"#c9a84c",borderRadius:7,padding:"7px 9px",fontSize:11,fontWeight:700}}>{seasons.map(season=><option key={season} value={season}>{season}/{String(Number(season)+1).slice(-2)}{season===String(game.season)?" · actual":""}</option>)}</select></div>
      <div style={{ display: "flex", gap: 8, padding: "10px 14px", overflowX: "auto", borderBottom: "1px solid rgba(255,255,255,.06)", flexShrink: 0 }}>
        {filters.map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} style={{ background: filter === val ? "#c9a84c" : "#1e2330", color: filter === val ? "#1a1200" : "#9aa0b4", border: "none", padding: "7px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "background .15s, color .15s" }}>
            {label}
          </button>
        ))}
      </div>
      <SwipeTabs tabs={filters.map(([id])=>id)} activeTab={filter} onChange={setFilter} style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} contentStyle={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "12px 10px", boxSizing: "border-box" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, width: "100%" }}>
            {shown.map(p => {const stats=seasonStats(p);return <div key={p.id} style={{minWidth:0}}><PlayerCard player={p} onSelect={onOpenPlayer}/><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:2,background:"#161a24",border:"1px solid rgba(255,255,255,.06)",borderRadius:8,padding:"6px 3px",marginTop:4}}>{[["PJ",stats.appearances??0],["G",stats.goals??0],["A",stats.assists??0],["NOTA",stats.averageRating??"—"]].map(([label,value])=><div key={label} style={{textAlign:"center"}}><div style={{fontSize:11,color:label==="NOTA"?"#c9a84c":"#e8eaf0",fontWeight:800}}>{value}</div><div style={{fontSize:7,color:"#6b7280",fontWeight:700}}>{label}</div></div>)}</div></div>})}
          </div>
        </div>
      </SwipeTabs>
    </div>
  );
}

// ─── Helpers de energía/cansancio (documento UX) ─────────────────────────────
function energyLevel(fatigue) {
  const energy = 100 - (fatigue ?? 0); // energía = inverso del cansancio
  if (energy >= 80) return { energy, color: "#22c55e", emoji: "🟢", label: "Fresco" };
  if (energy >= 70) return { energy, color: "#22c55e", emoji: "🟢", label: "Bien" };
  if (energy >= 60) return { energy, color: "#fbbf24", emoji: "🟡", label: "Cansado" };
  if (energy >= 40) return { energy, color: "#f97316", emoji: "🟠", label: "Muy cansado" };
  return { energy, color: "#ef4444", emoji: "🔴", label: "Agotado" };
}

const slotPositionGroup = position => position === "POR" ? "POR" : ["DFC","LD","LI"].includes(position) ? "DEF" : ["MCD","MC","MCO","MD","MI"].includes(position) ? "MED" : "DEL";

function LineupScreen({ game, players, lineup, setLineup, formation, setFormation, subs, setSubs, savedLineups, onSaveLineups, onOpenPlayer }) {
  const [activeSlot, setActiveSlot] = useState(null); // null | {type:'starter',idx} | {type:'sub',idx}
  // subTarget: cuando pulsas un titular para sustituir rápido → {idx, player}
  const [subTarget, setSubTarget] = useState(null);
  const [sortBy, setSortBy] = useState("role"); // role | energy | overall | pos | age
  const [showFormations, setShowFormations] = useState(false);
  const [showSavedLineups, setShowSavedLineups] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetIcon, setPresetIcon] = useState("🏠");

  const formations = {
    "4-3-3":   ["POR","LD","DFC","DFC","LI","MC","MCD","MC","ED","DC","EI"],
    "4-4-2":   ["POR","LD","DFC","DFC","LI","MD","MC","MC","MI","DC","DC"],
    "4-2-3-1": ["POR","LD","DFC","DFC","LI","MCD","MCD","MCO","ED","EI","DC"],
    "3-5-2":   ["POR","DFC","DFC","DFC","MI","MC","MCD","MC","MD","DC","DC"],
  };

  const pitchLayout = {
    "4-3-3": [
      {slot:0, x:50,y:88},
      {slot:1,x:82,y:70},{slot:2,x:63,y:72},{slot:3,x:37,y:72},{slot:4,x:18,y:70},
      {slot:5,x:74,y:50},{slot:6,x:50,y:52},{slot:7,x:26,y:50},
      {slot:8,x:78,y:25},{slot:9,x:50,y:22},{slot:10,x:22,y:25},
    ],
    "4-4-2": [
      {slot:0,x:50,y:88},
      {slot:1,x:82,y:70},{slot:2,x:63,y:72},{slot:3,x:37,y:72},{slot:4,x:18,y:70},
      {slot:5,x:78,y:50},{slot:6,x:59,y:50},{slot:7,x:41,y:50},{slot:8,x:22,y:50},
      {slot:9,x:65,y:24},{slot:10,x:35,y:24},
    ],
    "4-2-3-1": [
      {slot:0, x:50,y:90},
      {slot:1,x:84,y:73},{slot:2,x:63,y:76},{slot:3,x:37,y:76},{slot:4,x:16,y:73},
      {slot:5,x:63,y:58},{slot:6,x:37,y:58},
      {slot:7,x:80,y:36},{slot:8,x:50,y:38},{slot:9,x:20,y:36},
      {slot:10,x:50,y:14},
    ],
    "3-5-2": [
      {slot:0,x:50,y:88},
      {slot:1,x:70,y:72},{slot:2,x:50,y:74},{slot:3,x:30,y:72},
      {slot:4,x:82,y:52},{slot:5,x:64,y:52},{slot:6,x:50,y:50},{slot:7,x:36,y:52},{slot:8,x:18,y:52},
      {slot:9,x:65,y:24},{slot:10,x:35,y:24},
    ],
  };

  const posLayout = pitchLayout[formation] || pitchLayout["4-3-3"];
  const slotPositions = formations[formation];
  const available = players.filter(p => !p.injured && !p.suspended);
  const unavailable = players.filter(p => p.injured || p.suspended);
  const usedStarterIds = lineup.filter(Boolean);
  const usedSubIds = subs.filter(Boolean);
  const allUsedIds = [...usedStarterIds, ...usedSubIds];
  const notCalled = available.filter(p => !allUsedIds.includes(p.id)); // ⚪ no convocados

  const startersCount = lineup.filter(id => id && available.find(p => p.id === id)).length;
  const lineupValid = startersCount === 11;

  // ── 7. Resumen de estado de plantilla ──
  const fresh = available.filter(p => energyLevel(p.fatigue).energy >= 70).length;
  const tired = available.filter(p => { const e = energyLevel(p.fatigue).energy; return e >= 40 && e < 70; }).length;
  const veryTired = available.filter(p => energyLevel(p.fatigue).energy < 40).length;
  const avgEnergy = available.length ? Math.round(available.reduce((s,p) => s + energyLevel(p.fatigue).energy, 0) / available.length) : 0;

  // ── 10. Jerarquía: titular habitual / rotación / suplente / canterano ──
  const getRole = (p) => {
    if (p.age <= 19) return { icon: "🌱", label: "Canterano" };
    if (p.overall >= 80) return { icon: "⭐", label: "Titular habitual" };
    if (p.overall >= 73) return { icon: "🔄", label: "Rotación" };
    return { icon: "⚪", label: "Suplente" };
  };

  const handlePitchSlot = (idx) => {
    const player = players.find(p => p.id === lineup[idx]);
    if (player) {
      // 4. Sistema de intercambio directo: pulsar titular → menú de sustitución rápida
      setSubTarget({ idx, player });
      setActiveSlot(null);
    } else {
      setActiveSlot(activeSlot?.type === "starter" && activeSlot?.idx === idx ? null : {type:"starter", idx});
      setSubTarget(null);
    }
  };
  const handleSubSlot = (idx) => {
    setActiveSlot(activeSlot?.type === "sub" && activeSlot?.idx === idx ? null : {type:"sub", idx});
    setSubTarget(null);
  };

  const assignPlayer = (player) => {
    if (!activeSlot) return;
    if (activeSlot.type === "starter") {
      const newLineup = [...lineup];
      const prevSlot = newLineup.indexOf(player.id);
      if (prevSlot !== -1) newLineup[prevSlot] = null;
      const newSubs = [...subs];
      const prevSub = newSubs.indexOf(player.id);
      if (prevSub !== -1) newSubs[prevSub] = null;
      newLineup[activeSlot.idx] = player.id;
      setLineup(newLineup);
      setSubs(newSubs);
    } else {
      const newSubs = [...subs];
      const prevSub = newSubs.indexOf(player.id);
      if (prevSub !== -1) newSubs[prevSub] = null;
      const newLineup = [...lineup];
      const prevSlot = newLineup.indexOf(player.id);
      if (prevSlot !== -1) newLineup[prevSlot] = null;
      newSubs[activeSlot.idx] = player.id;
      setSubs(newSubs);
      setLineup(newLineup);
    }
    setActiveSlot(null);
  };

  // ── 4 + 5. Intercambio automático + menú de sustitución rápida ──
  // Sustituto entra al once, titular sale directo al banquillo (sin huecos)
  const swapWithSub = (incomingPlayer) => {
    if (!subTarget) return;
    const { idx, player: outgoing } = subTarget;
    const newLineup = [...lineup];
    newLineup[idx] = incomingPlayer.id;
    setLineup(newLineup);

    const newSubs = [...subs];
    // Si el que entra estaba en el banquillo, su hueco lo ocupa quien sale
    const benchIdx = newSubs.indexOf(incomingPlayer.id);
    if (benchIdx !== -1) {
      newSubs[benchIdx] = outgoing.id;
    } else {
      // Si no estaba en banquillo (era no convocado), buscar primer hueco libre
      const emptyIdx = newSubs.indexOf(null);
      if (emptyIdx !== -1) newSubs[emptyIdx] = outgoing.id;
    }
    setSubs(newSubs);
    setSubTarget(null);
  };

  // Candidatos de sustitución ordenados: misma posición → mejor energía → mejor media
  const getSubCandidates = () => {
    if (!subTarget) return [];
    const posLabel = slotPositions[subTarget.idx];
    const pool = [...subs.filter(Boolean).map(id => players.find(p => p.id === id)), ...notCalled].filter(Boolean);
    return pool
      .filter(p => !p.injured && !p.suspended)
      .sort((a, b) => {
        const aSamePos = a.pos === posLabel ? 1 : 0;
        const bSamePos = b.pos === posLabel ? 1 : 0;
        if (aSamePos !== bSamePos) return bSamePos - aSamePos;
        const aEnergy = energyLevel(a.fatigue).energy;
        const bEnergy = energyLevel(b.fatigue).energy;
        if (Math.abs(aEnergy - bEnergy) > 10) return bEnergy - aEnergy;
        return b.overall - a.overall;
      });
  };

  // ── 6. Recomendaciones de descanso ──
  const restRisk = (p) => {
    const risk = calculateInjuryRisk(p,{fixtures:game.fixtures,teamId:game.teamId});
    const level = getRiskLevel(risk);
    if (risk > 75) return { level:"high", label:`🔴 Riesgo crítico ${risk}%`, risk, color:level.color };
    if (risk > 50) return { level:"high", label:`🟠 Riesgo alto ${risk}%`, risk, color:level.color };
    if (risk > 20) return { level:"mid", label:`🟡 Riesgo moderado ${risk}%`, risk, color:level.color };
    return null;
  };

  // ── 8. Rotación recomendada ──
  // ── 8. Rotación recomendada — genera una PROPUESTA, no aplica directo ──
  const computeRecommendedRotation = () => {
    const newLineup = [...lineup];
    const newSubs = [...subs];
    const changes = []; // {idx, outPlayer, inPlayer}
    lineup.forEach((starterId, idx) => {
      if (!starterId) return;
      const starter = players.find(p => p.id === starterId);
      if (!starter) return;
      const risk = restRisk(starter);
      const starterEnergy = energyLevel(starter.fatigue).energy;
      if ((!risk || risk.risk < 51) && starterEnergy >= 45) return; // solo rota con motivo fÃ­sico claro
      const posLabel = slotPositions[idx];
      const candidates = [...newSubs.filter(Boolean).map(id => players.find(p => p.id === id)), ...notCalled]
        .filter(Boolean)
        .filter(p => {
          if (p.injured || p.suspended) return false;
          const naturalFit = p.pos === posLabel || p.group === slotPositionGroup(posLabel);
          const energyGain = energyLevel(p.fatigue).energy - starterEnergy;
          const qualityGap = (starter.overall ?? 70) - (p.overall ?? 70);
          const critical = (risk?.risk ?? 0) >= 76 || starterEnergy < 35;
          return naturalFit && energyGain >= (critical ? 10 : 18) && qualityGap <= (critical ? 10 : 6);
        })
        .sort((a,b) => {
          const aSame = a.pos === posLabel ? 1 : 0, bSame = b.pos === posLabel ? 1 : 0;
          if (aSame !== bSame) return bSame - aSame;
          const aGap = Math.abs((starter.overall ?? 70) - (a.overall ?? 70));
          const bGap = Math.abs((starter.overall ?? 70) - (b.overall ?? 70));
          if (aGap !== bGap) return aGap - bGap;
          return energyLevel(b.fatigue).energy - energyLevel(a.fatigue).energy;
        });
      const replacement = candidates[0];
      if (replacement) {
        newLineup[idx] = replacement.id;
        const benchIdx = newSubs.indexOf(replacement.id);
        if (benchIdx !== -1) newSubs[benchIdx] = starter.id;
        changes.push({ idx, outPlayer: starter, inPlayer: replacement });
      }
    });
    return { newLineup, newSubs, changes };
  };

  // ── 9. Mejor once disponible — también como PROPUESTA ──
  const computeBestXI = () => {
    const isCriticalPhysical = (p) => p.injured || p.suspended || calculateInjuryRisk(p,{fixtures:game.fixtures,teamId:game.teamId}) >= 76 || energyLevel(p.fatigue).energy < 25;
    const score = (p, posLabel) => (p.overall ?? 70) + (p.pos === posLabel ? 9 : p.group === slotPositionGroup(posLabel) ? 3 : -8);
    const newLineup = emptyLineup();
    const claimed = new Set();
    slotPositions.forEach((posLabel, idx) => {
      const candidates = available
        .filter(p => !claimed.has(p.id))
        .filter(p => !isCriticalPhysical(p))
        .sort((a,b) => {
          const aScore = score(a, posLabel);
          const bScore = score(b, posLabel);
          if (aScore !== bScore) return bScore - aScore;
          return (b.overall ?? 0) - (a.overall ?? 0);
        });
      const best = candidates[0];
      if (best) { newLineup[idx] = best.id; claimed.add(best.id); }
    });
    const restPool = available.filter(p => !claimed.has(p.id)).sort((a,b) => (b.overall ?? 0) - (a.overall ?? 0));
    const newSubs = emptyBench();
    restPool.slice(0, BENCH_SLOTS).forEach((p, i) => { newSubs[i] = p.id; claimed.add(p.id); });

    // Calcular qué cambia respecto al once actual, para mostrarlo igual que la rotación
    const changes = [];
    newLineup.forEach((newId, idx) => {
      if (newId !== lineup[idx]) {
        const outPlayer = players.find(p => p.id === lineup[idx]);
        const inPlayer = players.find(p => p.id === newId);
        if (inPlayer) changes.push({ idx, outPlayer: outPlayer ?? null, inPlayer });
      }
    });
    return { newLineup, newSubs, changes };
  };

  // proposal: null | { type:'rotation'|'bestxi', newLineup, newSubs, changes }
  const [proposal, setProposal] = useState(null);

  const openRotationProposal = () => {
    const result = computeRecommendedRotation();
    setProposal({ type: "rotation", ...result });
  };
  const openBestXIProposal = () => {
    const result = computeBestXI();
    setProposal({ type: "bestxi", ...result });
  };
  const acceptProposal = () => {
    if (!proposal) return;
    setLineup(proposal.newLineup);
    setSubs(proposal.newSubs);
    setProposal(null);
  };
  const discardProposal = () => setProposal(null);

  // ── 12. Alineaciones guardadas ──
  const PRESET_ICONS = ["🏠","✈️","🔄","🏆","⚽","🛡️","⚡"];

  const saveCurrentAsPreset = () => {
    if (!presetName.trim()) return;
    const newPreset = {
      id: `lineup_${Date.now()}`,
      name: presetName.trim(),
      icon: presetIcon,
      formation,
      lineup: [...lineup],
      subs: [...subs],
    };
    onSaveLineups([...(savedLineups ?? []), newPreset]);
    setSavingPreset(false);
    setPresetName("");
    setPresetIcon("🏠");
  };

  const loadPreset = (preset) => {
    // Solo asignar jugadores del preset que sigan disponibles (no vendidos/lesionados/sancionados)
    const validIds = new Set(available.map(p => p.id));
    const restoredLineup = preset.lineup.map(id => (id && validIds.has(id)) ? id : null);
    const restoredSubs = normalizeSlots(preset.subs ?? [], BENCH_SLOTS).map(id => (id && validIds.has(id)) ? id : null);
    setFormation(preset.formation);
    setLineup(restoredLineup);
    setSubs(restoredSubs);
    setShowSavedLineups(false);
  };

  const deletePreset = (presetId) => {
    onSaveLineups((savedLineups ?? []).filter(p => p.id !== presetId));
  };

  const getStarter = (idx) => players.find(p => p.id === lineup[idx]);
  const getSub = (idx) => players.find(p => p.id === subs[idx]);
  const isActiveStarter = (idx) => activeSlot?.type === "starter" && activeSlot?.idx === idx;
  const isActiveSub = (idx) => activeSlot?.type === "sub" && activeSlot?.idx === idx;

  // ── 11. Ordenación de "no convocados" ──
  const sortedNotCalled = [...notCalled].sort((a, b) => {
    if (sortBy === "energy") return energyLevel(b.fatigue).energy - energyLevel(a.fatigue).energy;
    if (sortBy === "overall") return b.overall - a.overall;
    if (sortBy === "pos") return a.pos.localeCompare(b.pos);
    if (sortBy === "age") return a.age - b.age;
    return b.overall - a.overall; // role (default): por calidad
  });

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* ── 7. Tarjeta resumen de plantilla ── */}
      <div style={{ background:"#13161f", borderBottom:"1px solid rgba(255,255,255,.07)", padding:"10px 14px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
          <span style={{ fontSize:10, color:"#6b7280", fontWeight:700, letterSpacing:".5px" }}>ESTADO DE PLANTILLA</span>
          <span style={{ fontSize:13, fontWeight:800, color: avgEnergy>=70?"#22c55e":avgEnergy>=50?"#fbbf24":"#ef4444" }}>⚡ {avgEnergy}%</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:5, background:"#161a24", borderRadius:7, padding:"5px 8px" }}>
            <span>🟢</span><span style={{ fontSize:12, fontWeight:700, color:"#22c55e" }}>{fresh}</span><span style={{ fontSize:10, color:"#6b7280" }}>frescos</span>
          </div>
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:5, background:"#161a24", borderRadius:7, padding:"5px 8px" }}>
            <span>🟡</span><span style={{ fontSize:12, fontWeight:700, color:"#fbbf24" }}>{tired}</span><span style={{ fontSize:10, color:"#6b7280" }}>cansados</span>
          </div>
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:5, background:"#161a24", borderRadius:7, padding:"5px 8px" }}>
            <span>🔴</span><span style={{ fontSize:12, fontWeight:700, color:"#ef4444" }}>{veryTired}</span><span style={{ fontSize:10, color:"#6b7280" }}>muy cansados</span>
          </div>
        </div>
      </div>

      {/* ── Formaciones (colapsable) + acciones rápidas (8 y 9) ── */}
      <div style={{ borderBottom:"1px solid rgba(255,255,255,.06)", flexShrink:0 }}>
        <div style={{ display:"flex", gap:6, padding:"8px 12px", alignItems:"center" }}>
          <button onClick={() => setShowFormations(s => !s)}
            style={{ background:"#1e2330", border:"none", color:"#e8eaf0", padding:"7px 12px", borderRadius:6, fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
            {formation} ▾
          </button>
          <button onClick={openRotationProposal}
            style={{ flex:1, background:"rgba(251,191,36,.12)", border:"1px solid rgba(251,191,36,.3)", color:"#fbbf24", padding:"7px 8px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
            🔄 Rotación recomendada
          </button>
          <button onClick={openBestXIProposal}
            style={{ flex:1, background:"rgba(201,168,76,.12)", border:"1px solid rgba(201,168,76,.3)", color:"#c9a84c", padding:"7px 8px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
            ⭐ Mejor once
          </button>
          <div style={{ fontSize:11, fontWeight:700, color: lineupValid ? "#22c55e" : "#f59e0b", background: lineupValid ? "#22c55e18" : "#f59e0b18", padding:"6px 9px", borderRadius:6, whiteSpace:"nowrap", flexShrink:0 }}>
            {lineupValid ? "✓" : `${startersCount}/11`}
          </div>
        </div>
        {showFormations && (
          <div style={{ display:"flex", gap:8, padding:"0 12px 10px", overflowX:"auto" }}>
            {Object.keys(formations).map(f => (
              <button key={f} onClick={() => { setFormation(f); setLineup(emptyLineup()); setShowFormations(false); }}
                style={{ background:formation===f?"#c9a84c":"#1e2330", color:formation===f?"#1a1200":"#9aa0b4", border:"none", padding:"7px 16px", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
                {f}
              </button>
            ))}
          </div>
        )}

        {/* ── Panel de propuesta: Rotación recomendada / Mejor once — el usuario decide ── */}
        {proposal && (
          <div style={{ padding:"0 12px 10px" }}>
            <div style={{ background:"#161a24", border:`1px solid ${proposal.type==="rotation"?"rgba(251,191,36,.35)":"rgba(201,168,76,.35)"}`, borderRadius:9, padding:12 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <div style={{ fontSize:12, fontWeight:700, color: proposal.type==="rotation"?"#fbbf24":"#c9a84c" }}>
                  {proposal.type==="rotation" ? "🔄 Propuesta de rotación" : "⭐ Propuesta de mejor once"}
                </div>
                <button onClick={discardProposal} style={{ background:"rgba(255,255,255,.08)", border:"none", color:"#9aa0b4", padding:"4px 9px", borderRadius:6, fontSize:11, cursor:"pointer" }}>✕</button>
              </div>

              {proposal.changes.length === 0 ? (
                <div style={{ fontSize:12, color:"#6b7280", textAlign:"center", padding:"10px 0" }}>
                  {proposal.type==="rotation"
                    ? "No hay jugadores con fatiga suficiente como para recomendar un cambio. Tu plantilla está bien de energía. 👍"
                    : "Tu once actual ya es el mejor disponible según media y energía. 👍"}
                </div>
              ) : (
                <>
                  <div style={{ fontSize:10, color:"#6b7280", marginBottom:8 }}>{proposal.changes.length} cambio{proposal.changes.length!==1?"s":""} propuesto{proposal.changes.length!==1?"s":""}:</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:"30vh", overflowY:"auto" }}>
                    {proposal.changes.map((c, i) => {
                      const outEng = c.outPlayer ? energyLevel(c.outPlayer.fatigue) : null;
                      const inEng = energyLevel(c.inPlayer.fatigue);
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:6, background:"#0d0f14", borderRadius:7, padding:"7px 9px", flexShrink:0 }}>
                          <div style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:5 }}>
                            <span style={{ fontSize:10, color:"#ef4444" }}>↓</span>
                            <span style={{ fontSize:11, color:"#9aa0b4", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.outPlayer?.name ?? "Vacío"}</span>
                            {outEng && <span style={{ fontSize:10, fontWeight:700, color:outEng.color, flexShrink:0 }}>{outEng.emoji}{outEng.energy}</span>}
                          </div>
                          <div style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:5 }}>
                            <span style={{ fontSize:10, color:"#22c55e" }}>↑</span>
                            <span style={{ fontSize:11, fontWeight:600, color:"#e8eaf0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.inPlayer.name}</span>
                            <span style={{ fontSize:10, fontWeight:700, color:inEng.color, flexShrink:0 }}>{inEng.emoji}{inEng.energy}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {proposal.changes.length > 0 && (
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <button onClick={discardProposal} className="btn-ghost"
                    style={{ flex:1, padding:9, borderRadius:7, fontSize:12, cursor:"pointer" }}>
                    Descartar
                  </button>
                  <button onClick={acceptProposal} className="btn-gold"
                    style={{ flex:1, padding:9, borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                    ✓ Aplicar cambios
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 12. Alineaciones guardadas ── */}
        <div style={{ display:"flex", gap:6, padding:"0 12px 8px" }}>
          <button onClick={() => setShowSavedLineups(s => !s)}
            style={{ flex:1, background:"rgba(59,130,246,.1)", border:"1px solid rgba(59,130,246,.25)", color:"#60a5fa", padding:"7px 8px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>
            📋 Alineaciones guardadas {savedLineups?.length ? `(${savedLineups.length})` : ""} {showSavedLineups ? "▴" : "▾"}
          </button>
          <button onClick={() => setSavingPreset(true)}
            style={{ background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.25)", color:"#22c55e", padding:"7px 10px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
            💾 Guardar actual
          </button>
        </div>

        {showSavedLineups && (
          <div style={{ padding:"0 12px 10px", display:"flex", flexDirection:"column", gap:6 }}>
            {(!savedLineups || savedLineups.length === 0) && (
              <div style={{ fontSize:11, color:"#4b5563", textAlign:"center", padding:"10px 0" }}>
                Aún no tienes alineaciones guardadas. Configura un once y pulsa "Guardar actual".
              </div>
            )}
            {(savedLineups ?? []).map(preset => (
              <div key={preset.id} style={{ display:"flex", alignItems:"center", gap:8, background:"#161a24", border:"1px solid rgba(255,255,255,.07)", borderRadius:7, padding:"8px 10px" }}>
                <span style={{ fontSize:18 }}>{preset.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#e8eaf0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{preset.name}</div>
                  <div style={{ fontSize:10, color:"#6b7280" }}>{preset.formation} · {preset.lineup.filter(Boolean).length}/11 titulares</div>
                </div>
                <button onClick={() => loadPreset(preset)} className="btn-gold"
                  style={{ padding:"6px 12px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                  Cargar
                </button>
                <button onClick={() => deletePreset(preset.id)}
                  style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.2)", color:"#ef4444", padding:"6px 9px", borderRadius:6, fontSize:11, cursor:"pointer" }}>
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modal: guardar alineación actual con nombre e icono */}
        {savingPreset && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
            onClick={() => setSavingPreset(false)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:"#161a24", border:"1px solid rgba(201,168,76,.3)", borderRadius:12, padding:18, width:"100%", maxWidth:320 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#c9a84c", marginBottom:12 }}>Guardar alineación actual</div>
              <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Nombre (ej. Liga, Visitante...)"
                autoFocus
                style={{ width:"100%", background:"#1e2330", border:"1px solid rgba(255,255,255,.1)", color:"#e8eaf0", padding:"9px 11px", borderRadius:7, fontSize:13, marginBottom:12, fontFamily:"inherit" }}/>
              <div style={{ fontSize:10, color:"#6b7280", fontWeight:600, marginBottom:6 }}>ICONO</div>
              <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
                {PRESET_ICONS.map(icon => (
                  <button key={icon} onClick={() => setPresetIcon(icon)}
                    style={{ width:36, height:36, borderRadius:7, fontSize:17, cursor:"pointer",
                      background: presetIcon===icon ? "rgba(201,168,76,.2)" : "#1e2330",
                      border:`1.5px solid ${presetIcon===icon ? "#c9a84c" : "rgba(255,255,255,.08)"}` }}>
                    {icon}
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => { setSavingPreset(false); setPresetName(""); }} className="btn-ghost"
                  style={{ flex:1, padding:10, borderRadius:8, fontSize:12, cursor:"pointer" }}>Cancelar</button>
                <button onClick={saveCurrentAsPreset} disabled={!presetName.trim()} className="btn-gold"
                  style={{ flex:1, padding:10, borderRadius:8, fontSize:12, fontWeight:700, cursor: presetName.trim()?"pointer":"not-allowed", opacity: presetName.trim()?1:.5 }}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* ── 3. Campo con media + energía visible por jugador ── */}
          <div style={{ height:240, flexShrink:0, position:"relative", background:"#061206", borderBottom:"1px solid rgba(255,255,255,.06)", overflow:"hidden" }}>
            <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} viewBox="0 0 100 100" preserveAspectRatio="none">
              <rect x="5" y="2" width="90" height="96" fill="none" stroke="rgba(255,255,255,.09)" strokeWidth=".8"/>
              <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,.09)" strokeWidth=".8"/>
              <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,.09)" strokeWidth=".8"/>
              <rect x="30" y="2" width="40" height="14" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth=".6"/>
              <rect x="30" y="84" width="40" height="14" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth=".6"/>
              <rect x="38" y="2" width="24" height="7" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth=".5"/>
              <rect x="38" y="91" width="24" height="7" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth=".5"/>
            </svg>
            {posLayout.map(({slot, x, y}) => {
              const player = getStarter(slot);
              const posLabel = slotPositions[slot];
              const unavail = player && (player.injured || player.suspended);
              const nearSuspension = player && !unavail && (player.yellowCards ?? 0) >= 4;
              const eng = player ? energyLevel(player.fatigue) : null;
              const acc = unavail ? "#ef4444" : player ? RARITY_ACCENT[player.rarity] : "rgba(255,255,255,.3)";
              const active = isActiveStarter(slot) || (subTarget?.idx === slot);
              return (
                <div key={slot} onClick={() => handlePitchSlot(slot)}
                  style={{ position:"absolute", left:`${x}%`, top:`${y}%`, transform:"translate(-50%,-50%)", cursor:"pointer", textAlign:"center", zIndex:2 }}>
                  <div style={{ width:34, height:34, borderRadius:"50%", position:"relative",
                    background: unavail?"rgba(239,68,68,.18)":player?`${acc}30`:active?"rgba(201,168,76,.25)":"rgba(255,255,255,.06)",
                    border:`2px solid ${active?"#c9a84c":unavail?acc:nearSuspension?"#fbbf24":player?acc:"rgba(255,255,255,.2)"}`,
                    display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto", transition:"all .15s",
                    boxShadow: active?"0 0 8px #c9a84c66":unavail?"0 0 8px #ef444466":nearSuspension?"0 0 6px #fbbf2466":"none" }}>
                    {player
                      ? <span style={{ fontSize:11, fontWeight:700, color:acc }}>{player.overall}</span>
                      : <span style={{ fontSize:8, color:"rgba(255,255,255,.35)" }}>{posLabel}</span>}
                    {unavail && (
                      <span style={{ position:"absolute", top:-4, right:-4, fontSize:11, background:"#ef4444", borderRadius:"50%", width:14, height:14, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {player.injured ? "🚑" : "🟥"}
                      </span>
                    )}
                    {nearSuspension && !unavail && (
                      <span style={{ position:"absolute", top:-4, right:-4, fontSize:9, background:"#fbbf24", borderRadius:"50%", width:14, height:14, display:"flex", alignItems:"center", justifyContent:"center" }} title="4 amarillas, a una de sanción">🟨</span>
                    )}
                  </div>
                  {player && (
                    <>
                      <div style={{ fontSize:7, fontWeight:800, color: eng.color, marginTop:1, textShadow:"0 1px 2px #000" }}>{eng.emoji}{eng.energy}</div>
                      <div style={{ fontSize:8, color: unavail?"#ef4444":nearSuspension?"#fbbf24":"#e8eaf0", maxWidth:44, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textShadow:"0 1px 3px #000" }}>{player.name.split(" ")[0]}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── 5. Menú de sustitución rápida (al pulsar titular) ── */}
          {subTarget && (
            <div style={{ background:"#1a1f2e", borderBottom:"1px solid rgba(201,168,76,.25)", padding:"10px 12px", flexShrink:0, display:"flex", flexDirection:"column", maxHeight:"40vh" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, flexShrink:0 }}>
                <div style={{ fontSize:11, color:"#9aa0b4" }}>
                  Sustituir a <strong style={{ color:"#e8eaf0" }}>{subTarget.player.name}</strong>
                  <span style={{ marginLeft:6, fontWeight:700, color: energyLevel(subTarget.player.fatigue).color }}>
                    {energyLevel(subTarget.player.fatigue).emoji}{energyLevel(subTarget.player.fatigue).energy}
                  </span>
                </div>
                <button onClick={() => setSubTarget(null)} style={{ background:"rgba(255,255,255,.08)", border:"none", color:"#9aa0b4", padding:"4px 9px", borderRadius:6, fontSize:11, cursor:"pointer" }}>✕</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5, overflowY:"auto", paddingRight:2 }}>
                {getSubCandidates().length === 0 && (
                  <div style={{ fontSize:11, color:"#4b5563", textAlign:"center", padding:"8px 0" }}>No hay sustitutos disponibles</div>
                )}
                {getSubCandidates().map(p => {
                  const eng = energyLevel(p.fatigue);
                  const samePos = p.pos === slotPositions[subTarget.idx];
                  return (
                    <div key={p.id} onClick={() => swapWithSub(p)}
                      style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 9px", background:"#161a24", border:"1px solid rgba(255,255,255,.07)", borderRadius:7, cursor:"pointer", flexShrink:0 }}>
                      <Initials name={p.name} size={26} rarity={p.rarity} borderRadius={5}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:"#e8eaf0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                        <div style={{ fontSize:9, color:"#6b7280" }}>{p.pos}{samePos?" · misma posición":""}</div>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color:eng.color }}>{eng.emoji}{eng.energy}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:RARITY_ACCENT[p.rarity] }}>{p.overall}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 1 + 2. Bloques: Titulares / Banquillo / No convocados, con energía visible ── */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", borderTop:"1px solid rgba(255,255,255,.05)" }}>
            {activeSlot && (
              <div style={{ background:"#c9a84c22", borderBottom:"1px solid #c9a84c44", padding:"7px 12px", flexShrink:0 }}>
                <div style={{ fontSize:11, color:"#c9a84c", fontWeight:700 }}>
                  {activeSlot.type==="starter"
                    ? `Slot ${activeSlot.idx+1} · ${slotPositions[activeSlot.idx]} · elige titular`
                    : `Suplente ${activeSlot.idx+1} · elige reserva`}
                </div>
              </div>
            )}

            <div style={{ flex:1, overflowY:"auto", padding:"8px 10px" }}>

              {/* 🟢 TITULARES */}
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6, marginTop:2 }}>
                <span style={{ fontSize:11 }}>🟢</span>
                <span style={{ fontSize:10, fontWeight:700, color:"#22c55e", letterSpacing:".4px" }}>TITULARES ({startersCount}/11)</span>
              </div>
              {lineup.map((id, idx) => {
                const p = players.find(pl => pl.id === id);
                if (!p) return null;
                const eng = energyLevel(p.fatigue);
                const risk = restRisk(p);
                const role = getRole(p);
                return (
                  <div key={id} onClick={() => handlePitchSlot(idx)}
                    style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 8px", borderRadius:7, marginBottom:4,
                      background: subTarget?.idx===idx ? "rgba(201,168,76,.15)" : "#161a24",
                      border:`1px solid ${subTarget?.idx===idx?"#c9a84c55":"rgba(34,197,94,.15)"}`, cursor:"pointer" }}>
                    <Initials name={p.name} size={30} rarity={p.rarity} borderRadius={6}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:"#e8eaf0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:4 }}>
                        <span title={role.label}>{role.icon}</span>{p.name}
                        {(p.yellowCards ?? 0) > 0 && <span style={{ fontSize:9, color:"#fbbf24" }}>🟨{p.yellowCards}</span>}
                      </div>
                      <div style={{ fontSize:9, color: risk?.level==="high"?"#ef4444":risk?.level==="mid"?"#f97316":"#6b7280" }}>
                        {p.pos} · {slotPositions[idx]}{risk ? ` · ${risk.label}` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:14, fontWeight:700, color:RARITY_ACCENT[p.rarity] }}>{p.overall}</div>
                      <div style={{ fontSize:11, fontWeight:800, color:eng.color }}>{eng.emoji}{eng.energy}</div>
                    </div>
                    <button onClick={event=>{event.stopPropagation();onOpenPlayer(p);}} title="Ver perfil" style={{ background:"transparent", border:"none", color:"#c9a84c", cursor:"pointer", padding:4 }}>ⓘ</button>
                  </div>
                );
              })}

              {/* 🟡 BANQUILLO */}
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6, marginTop:14 }}>
                <span style={{ fontSize:11 }}>🟡</span>
                <span style={{ fontSize:10, fontWeight:700, color:"#fbbf24", letterSpacing:".4px" }}>BANQUILLO ({usedSubIds.length}/{BENCH_SLOTS}) · {STARTERS_SLOTS + usedSubIds.length}/{CALLED_UP_SLOTS} convocados</span>
              </div>
              {subs.map((id, idx) => {
                const p = players.find(pl => pl.id === id);
                const active = isActiveSub(idx);
                if (!p) {
                  return (
                    <div key={idx} onClick={() => handleSubSlot(idx)}
                      style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 8px", borderRadius:7, marginBottom:4,
                        background: active?"rgba(201,168,76,.12)":"#13161d", border:`1px dashed ${active?"#c9a84c":"rgba(255,255,255,.1)"}`, cursor:"pointer" }}>
                      <div style={{ width:30, height:30, borderRadius:6, background:"rgba(255,255,255,.04)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"rgba(255,255,255,.25)" }}>+</div>
                      <div style={{ fontSize:11, color:"#4b5563" }}>Hueco libre {idx+1}</div>
                    </div>
                  );
                }
                const eng = energyLevel(p.fatigue);
                const role = getRole(p);
                return (
                  <div key={idx} onClick={() => handleSubSlot(idx)}
                    style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 8px", borderRadius:7, marginBottom:4,
                      background: active ? "rgba(201,168,76,.15)" : "#161a24",
                      border:`1px solid ${active?"#c9a84c55":"rgba(59,130,246,.15)"}`, cursor:"pointer" }}>
                    <Initials name={p.name} size={30} rarity={p.rarity} borderRadius={6}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:"#e8eaf0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:4 }}>
                        <span title={role.label}>{role.icon}</span>{p.name}
                      </div>
                      <div style={{ fontSize:9, color:"#6b7280" }}>{p.pos}</div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:14, fontWeight:700, color:RARITY_ACCENT[p.rarity] }}>{p.overall}</div>
                      <div style={{ fontSize:11, fontWeight:800, color:eng.color }}>{eng.emoji}{eng.energy}</div>
                    </div>
                    <button onClick={event=>{event.stopPropagation();onOpenPlayer(p);}} title="Ver perfil" style={{ background:"transparent", border:"none", color:"#c9a84c", cursor:"pointer", padding:4 }}>ⓘ</button>
                  </div>
                );
              })}

              {/* ⚪ NO CONVOCADOS */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:14, marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:11 }}>⚪</span>
                  <span style={{ fontSize:10, fontWeight:700, color:"#9aa0b4", letterSpacing:".4px" }}>NO CONVOCADOS ({sortedNotCalled.length})</span>
                </div>
                {/* 11. Ordenación */}
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  style={{ background:"#1e2330", border:"1px solid rgba(255,255,255,.1)", color:"#9aa0b4", fontSize:9, borderRadius:5, padding:"3px 5px" }}>
                  <option value="role">Calidad</option>
                  <option value="energy">Energía</option>
                  <option value="overall">Media</option>
                  <option value="pos">Posición</option>
                  <option value="age">Edad</option>
                </select>
              </div>
              {sortedNotCalled.map(p => {
                const eng = energyLevel(p.fatigue);
                const role = getRole(p);
                return (
                  <div key={p.id} onClick={() => activeSlot && assignPlayer(p)}
                    style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 8px", borderRadius:7, marginBottom:4,
                      background:"#13161d", border:"1px solid rgba(255,255,255,.05)", cursor:activeSlot?"pointer":"default", opacity:.85 }}>
                    <Initials name={p.name} size={26} rarity={p.rarity} borderRadius={5}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:"#c9ccd4", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:4 }}>
                        <span title={role.label}>{role.icon}</span>{p.name}
                      </div>
                      <div style={{ fontSize:9, color:"#6b7280" }}>{p.pos} · {p.age}a</div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:12, fontWeight:700, color:RARITY_ACCENT[p.rarity] }}>{p.overall}</div>
                      <div style={{ fontSize:10, fontWeight:700, color:eng.color }}>{eng.emoji}{eng.energy}</div>
                    </div>
                    <button onClick={event=>{event.stopPropagation();onOpenPlayer(p);}} title="Ver perfil" style={{ background:"transparent", border:"none", color:"#c9a84c", cursor:"pointer", padding:4 }}>ⓘ</button>
                  </div>
                );
              })}

              {unavailable.length > 0 && (
                <div style={{ marginTop:14, paddingTop:8, borderTop:"1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ fontSize:10, color:"#4b5563", marginBottom:6, fontWeight:600 }}>NO DISPONIBLES</div>
                  {unavailable.map(p => (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", gap:7, padding:"5px 8px", borderRadius:7, marginBottom:4, background:"#161a24", border:"1px solid rgba(255,255,255,.04)", opacity:.5 }}>
                      <Initials name={p.name} size={26} rarity={p.rarity} borderRadius={5}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11, color:"#6b7280", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                      </div>
                      {p.injured && <span style={{ fontSize:9, color:"#ef4444", fontWeight:700 }}>LESIÓN{p.injuryGames?` ${p.injuryGames}J`:""}</span>}
                      {p.suspended && <span style={{ fontSize:9, color:"#f59e0b", fontWeight:700 }}>SANCIÓN{p.yellowCards>=5?" (5 amarillas)":""}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarScreen({ fixtures, teamId, onPlay, lineup, players }) {
  const teamFixtures   = fixtures.filter(f => f.homeTeamId === teamId || f.awayTeamId === teamId);
  const nextUnplayed   = teamFixtures.find(f => !f.played);
  const [matchday, setMatchday] = useState(nextUnplayed?.matchday ?? 1);
  const [tab, setTab]           = useState("todos");

  const getTeam = (id) => TEAMS.find(t => t.id === id);
  const available    = players ? players.filter(p => !p.injured && !p.suspended) : [];
  const lineupValid  = lineup.filter(id => id && available.find(p => p.id === id)).length === 11;

  const allDayFixtures = fixtures.filter(f => f.matchday === matchday)
    .sort((a,b) => {
      const aUser = a.homeTeamId===teamId||a.awayTeamId===teamId ? 1 : 0;
      const bUser = b.homeTeamId===teamId||b.awayTeamId===teamId ? 1 : 0;
      return bUser - aUser;
    });
  const myFixture      = allDayFixtures.find(f => f.homeTeamId===teamId||f.awayTeamId===teamId);
  const isNextMatchday = myFixture?.id === nextUnplayed?.id;
  const myResults      = teamFixtures.filter(f => f.played).reverse();
  const myPlayed       = myResults.length;
  const myWon    = myResults.filter(f => { const h=f.homeTeamId===teamId; return h?f.homeGoals>f.awayGoals:f.awayGoals>f.homeGoals; }).length;
  const myDrawn  = myResults.filter(f => f.homeGoals===f.awayGoals).length;
  const myLost   = myPlayed - myWon - myDrawn;
  const myGF     = myResults.reduce((s,f)=>s+(f.homeTeamId===teamId?f.homeGoals:f.awayGoals),0);
  const myGA     = myResults.reduce((s,f)=>s+(f.homeTeamId===teamId?f.awayGoals:f.homeGoals),0);
  const totalMD  = 38;
  const mdOptions = Array.from({length:totalMD},(_,i)=>i+1);

  const resultColor = (f) => {
    if (!f.played) return "#6b7280";
    const h=f.homeTeamId===teamId; const my=h?f.homeGoals:f.awayGoals; const th=h?f.awayGoals:f.homeGoals;
    return my>th?"#22c55e":my===th?"#f59e0b":"#ef4444";
  };
  const resultLabel = (f) => {
    if (!f.played) return "";
    const h=f.homeTeamId===teamId; const my=h?f.homeGoals:f.awayGoals; const th=h?f.awayGoals:f.homeGoals;
    return my>th?"V":my===th?"E":"D";
  };

  const shownFixtures = tab==="mi_equipo"
    ? allDayFixtures.filter(f=>f.homeTeamId===teamId||f.awayTeamId===teamId)
    : allDayFixtures;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Stats temporada */}
      <div style={{ background:"#13161f", borderBottom:"1px solid rgba(255,255,255,.06)", padding:"10px 14px", flexShrink:0 }}>
        <div style={{ display:"flex", gap:14, justifyContent:"center", alignItems:"center" }}>
          {[["PJ",myPlayed,"#e8eaf0"],["V",myWon,"#22c55e"],["E",myDrawn,"#f59e0b"],["D",myLost,"#ef4444"],["GF",myGF,"#c9a84c"],["GC",myGA,"#9aa0b4"]].map(([l,v,c])=>(
            <div key={l} style={{ textAlign:"center" }}>
              <div style={{ fontSize:17, fontWeight:700, color:c, lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:9, color:"#4b5563", fontWeight:600, letterSpacing:".5px", marginTop:2 }}>{l}</div>
            </div>
          ))}
          <div style={{ display:"flex", gap:3, marginLeft:2 }}>
            {myResults.slice(0,5).map((f,i)=>{ const col=resultColor(f); const lbl=resultLabel(f);
              return <div key={i} style={{ width:18,height:18,borderRadius:4,background:`${col}22`,border:`1px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:col }}>{lbl}</div>; })}
          </div>
        </div>
      </div>

      {/* Selector jornada */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,.06)", flexShrink:0 }}>
        <button onClick={()=>setMatchday(m=>Math.max(1,m-1))}
          style={{ background:"#1e2330", color:"#e8eaf0", border:"1px solid rgba(255,255,255,.08)", padding:"7px 12px", borderRadius:7, cursor:"pointer", fontSize:14, fontWeight:600 }}>←</button>
        <select value={matchday} onChange={e=>setMatchday(Number(e.target.value))}
          style={{ flex:1, background:"#1e2330", color:"#c9a84c", border:"1px solid rgba(255,255,255,.1)", borderRadius:7, padding:"7px 10px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          {mdOptions.map(md=>(
            <option key={md} value={md}>Jornada {md}{md===nextUnplayed?.matchday?" ← siguiente":""}</option>
          ))}
        </select>
        <button onClick={()=>setMatchday(m=>Math.min(38,m+1))}
          style={{ background:"#1e2330", color:"#e8eaf0", border:"1px solid rgba(255,255,255,.08)", padding:"7px 12px", borderRadius:7, cursor:"pointer", fontSize:14, fontWeight:600 }}>→</button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:"#161a24", borderBottom:"1px solid rgba(255,255,255,.06)", flexShrink:0 }}>
        {[["todos","🗓️ Todos"],["mi_equipo","⚽ Mi partido"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ flex:1, background:"transparent", border:"none", borderBottom:tab===id?"2px solid #c9a84c":"2px solid transparent", color:tab===id?"#c9a84c":"#6b7280", padding:"9px 8px", fontSize:12, fontWeight:tab===id?700:500, cursor:"pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Partidos */}
      <SwipeTabs tabs={["todos","mi_equipo"]} activeTab={tab} onChange={setTab} style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} contentStyle={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
        {tab==="todos" && myFixture && !myFixture.played && isNextMatchday && (
          <button onClick={lineupValid?onPlay:undefined} className={lineupValid?"btn-gold":""}
            style={{ width:"100%", marginBottom:12, padding:"12px", borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer",
              ...(!lineupValid?{background:"#374151",color:"#9aa0b4",border:"1px solid rgba(255,255,255,.08)"}:{}) }}>
            {lineupValid ? `▶ Jugar Jornada ${matchday}` : `⚠️ Alineación incompleta (${lineup.filter(Boolean).length}/11)`}
          </button>
        )}

        {shownFixtures.map(f => {
          const home=getTeam(f.homeTeamId); const away=getTeam(f.awayTeamId);
          const isUserGame=f.homeTeamId===teamId||f.awayTeamId===teamId;
          const isNext=f.id===nextUnplayed?.id;
          const isH=f.homeTeamId===teamId;
          const rCol=isUserGame?resultColor(f):null;
          const rLbl=isUserGame?resultLabel(f):null;
          return (
            <div key={f.id} style={{ background:isNext?"#1a1f2e":isUserGame?"#161e2a":"#14161f",
              border:`1px solid ${isNext?"rgba(201,168,76,.35)":isUserGame?"rgba(255,255,255,.1)":"rgba(255,255,255,.05)"}`,
              borderRadius:10, padding:"11px 12px", marginBottom:7 }}>
              {isUserGame && (
                <div style={{ fontSize:9, color:isNext?"#c9a84c":"#6b7280", fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:5 }}>
                  {isNext?"▶ Tu próximo partido":"Tu partido"}
                </div>
              )}
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ flex:1, display:"flex", alignItems:"center", gap:6, justifyContent:"flex-end" }}>
                  <div style={{ fontSize:isUserGame?13:11, fontWeight:f.homeTeamId===teamId?700:400, color:f.homeTeamId===teamId?"#c9a84c":"#e8eaf0", textAlign:"right", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{home?.name}</div>
                  <TeamCrest team={home} size={24}/>
                </div>
                <div style={{ background:"#0d0f14", borderRadius:7, padding:"5px 10px", minWidth:52, textAlign:"center", flexShrink:0 }}>
                  {f.played
                    ? <><div style={{ fontSize:15, fontWeight:800, color:"#e8eaf0", letterSpacing:2 }}>{f.homeGoals}-{f.awayGoals}</div>
                        {isUserGame&&<div style={{ fontSize:9,fontWeight:700,color:rCol,marginTop:1 }}>{rLbl}</div>}</>
                    : <div style={{ fontSize:11, color:"#4b5563" }}>VS</div>}
                </div>
                <div style={{ flex:1, display:"flex", alignItems:"center", gap:6 }}>
                  <TeamCrest team={away} size={24}/>
                  <div style={{ fontSize:isUserGame?13:11, fontWeight:f.awayTeamId===teamId?700:400, color:f.awayTeamId===teamId?"#c9a84c":"#e8eaf0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{away?.name}</div>
                </div>
              </div>
              {isNext&&!f.played&&tab==="mi_equipo"&&(
                <button onClick={lineupValid?onPlay:undefined} className={lineupValid?"btn-gold":""}
                  style={{ width:"100%", marginTop:9, padding:9, borderRadius:7, fontSize:13, fontWeight:700, cursor:"pointer",
                    ...(!lineupValid?{background:"#374151",color:"#9aa0b4",border:"1px solid rgba(255,255,255,.08)"}:{}) }}>
                  {lineupValid?"▶ Jugar este partido":"⚠️ Configura tu alineación primero"}
                </button>
              )}
            </div>
          );
        })}

        {tab==="mi_equipo" && myResults.length>0 && (
          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:8 }}>HISTORIAL</div>
            {myResults.slice(0,10).map(f=>{
              const opp=getTeam(f.homeTeamId===teamId?f.awayTeamId:f.homeTeamId);
              const isH=f.homeTeamId===teamId; const col=resultColor(f); const lbl=resultLabel(f);
              return (
                <div key={f.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ width:20,height:20,borderRadius:4,background:`${col}22`,border:`1px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:col,flexShrink:0 }}>{lbl}</div>
                  <div style={{ fontSize:11, color:"#6b7280", width:16, flexShrink:0 }}>J{f.matchday}</div>
                  <div style={{ fontSize:12, color:"#9aa0b4", flex:1 }}>{isH?"vs":"@"} {opp?.name}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#e8eaf0" }}>{f.homeGoals}-{f.awayGoals}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </SwipeTabs>
    </div>
  );
}
function StandingsScreen({ standings, teamId, fixtures, players, movement={}, onOpenPlayer }) {
  const [tab, setTab] = useState("tabla"); // tabla | goleadores | stats

  const sorted   = [...standings].sort((a,b) => b.points-a.points || b.goalDifference-a.goalDifference || b.goalsFor-a.goalsFor);
  const getTeam  = (id) => TEAMS.find(t => t.id === id);
  const nextFixture=fixtures.find(f=>!f.played&&(f.homeTeamId===teamId||f.awayTeamId===teamId));
  const nextOpponentId=nextFixture?(nextFixture.homeTeamId===teamId?nextFixture.awayTeamId:nextFixture.homeTeamId):null;
  const lastResultFor=clubId=>[...fixtures].filter(f=>f.played&&(f.homeTeamId===clubId||f.awayTeamId===clubId)).sort((a,b)=>(b.matchday??0)-(a.matchday??0))[0];

  // ── Goleadores: extraer de todos los eventos de fixtures jugados ──
  // Función para resolver el EQUIPO ACTUAL de un jugador (puede haber cambiado por fichaje)
  const resolveCurrentTeamId = (playerId, fallbackTeamId) => {
    if (players?.some(p => p.id === playerId)) return teamId; // está en la plantilla del usuario ahora
    // Buscar en qué REAL_SQUADS está actualmente (si fue fichado por otro club de la IA, no lo gestionamos, así que se queda en el fallback)
    for (const tId of Object.keys(REAL_SQUADS)) {
      if (REAL_SQUADS[tId]?.some(p => p.id === playerId)) return tId;
    }
    return fallbackTeamId; // ya no está en ninguna plantilla conocida (caso raro), usar el de cuando marcó
  };

  const scorerMap = {};  // playerId → { goals, name, teamId, overall, rarity, pos }
  fixtures.filter(f => f.played && f.events?.length).forEach(f => {
    f.events.filter(e => (e.type==="GOAL"||e.type==="PENALTY") && e.playerId).forEach(e => {
      // team:"home" → fixture.homeTeamId, team:"away" → fixture.awayTeamId (equipo en el momento del gol)
      const scoringTeamIdAtTime = e.team === "home" ? f.homeTeamId : f.awayTeamId;
      if (!scorerMap[e.playerId]) {
        // Nombre: buscar primero en la plantilla del usuario (datos en vivo), luego en la plantilla de cuando marcó
        const pl = players?.find(p => p.id===e.playerId)
          ?? (REAL_SQUADS[scoringTeamIdAtTime] ?? []).find(p => p.id === e.playerId);
        // Equipo a mostrar: el ACTUAL del jugador (puede haber cambiado de equipo desde que marcó este gol)
        const currentTeamId = resolveCurrentTeamId(e.playerId, scoringTeamIdAtTime);
        scorerMap[e.playerId] = { id:e.playerId, player:pl, goals:0, name: pl?.name ?? "Jugador desconocido", teamId: currentTeamId, overall: pl?.overall??75, rarity: pl?.rarity??"GOLD", pos: pl?.pos??"DC", isUser: currentTeamId===teamId };
      }
      scorerMap[e.playerId].goals++;
    });
  });
  const scorerList = Object.values(scorerMap).sort((a,b)=>b.goals-a.goals).slice(0,20);

  // ── Stats de equipos: ofensiva/defensiva ──
  const teamStats = sorted.map(s => ({
    ...s,
    avgGoalsFor:  s.played > 0 ? (s.goalsFor/s.played).toFixed(1)  : "0.0",
    avgGoalsAgainst: s.played > 0 ? (s.goalsAgainst/s.played).toFixed(1) : "0.0",
  }));

  const tabs = [["tabla","📊 Tabla"],["goleadores","⚽ Goleadores"],["stats","📈 Stats"]];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Tabs */}
      <div style={{ display:"flex", background:"#161a24", borderBottom:"1px solid rgba(255,255,255,.06)", flexShrink:0 }}>
        {tabs.map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ flex:1, background:"transparent", border:"none", borderBottom:tab===id?"2px solid #c9a84c":"2px solid transparent",
              color:tab===id?"#c9a84c":"#6b7280", padding:"10px 6px", fontSize:11, fontWeight:tab===id?700:500, cursor:"pointer", transition:"all .15s" }}>
            {label}
          </button>
        ))}
      </div>

      <SwipeTabs tabs={tabs.map(([id])=>id)} activeTab={tab} onChange={setTab} style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} contentStyle={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{ flex:1, overflowY:"auto" }}>

        {/* ── TABLA CLASIFICACIÓN ── */}
        {tab==="tabla" && (
          <div style={{ padding:12 }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid rgba(255,255,255,.08)" }}>
                    {["#","Equipo","PJ","G","E","P","GF","GC","DG","Pts"].map((h,i)=>(
                      <th key={h} style={{ padding:"8px 4px", textAlign:i===1?"left":"center", color:h==="Pts"?"#c9a84c":"#4b5563", fontWeight:600, fontSize:10, letterSpacing:".3px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s,i)=>{
                    const t=getTeam(s.teamId);
                    const isUser=s.teamId===teamId;const isNext=s.teamId===nextOpponentId;const move=movement[s.teamId]??0;const last=lastResultFor(s.teamId);
                    const posColor=i<4?"#c9a84c":i<6?"#22c55e":i<7?"#3b82f6":i>16?"#ef4444":"#6b7280";
                    const zoneBorder=i===3?"border-bottom:2px solid #c9a84c44":i===6?"border-bottom:1px dashed #22c55e33":i===16?"border-bottom:2px solid #ef444433":"";
                    return (
                      <tr key={s.teamId} style={{ borderBottom:i===3?"2px solid rgba(201,168,76,.2)":i===6?"1px dashed rgba(34,197,94,.15)":i===16?"2px solid rgba(239,68,68,.2)":"1px solid rgba(255,255,255,.03)", background:isUser?"rgba(201,168,76,.09)":isNext?"rgba(96,165,250,.08)":"transparent", transition:"background .1s" }}>
                        <td style={{ padding:"7px 4px", textAlign:"center", fontWeight:700, color:posColor, fontSize:11 }}>{i+1}<span style={{display:"block",fontSize:8,color:move>0?"#22c55e":move<0?"#ef4444":"#4b5563"}}>{move>0?`▲${move}`:move<0?`▼${Math.abs(move)}`:"—"}</span></td>
                        <td style={{ padding:"7px 4px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <TeamCrest team={t} size={20}/>
                            <span style={{ color:isUser?"#c9a84c":"#e8eaf0", fontWeight:isUser?700:400, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:85, fontSize:12 }}>{t?.name}</span>
                            {isUser && <span style={{ fontSize:8, color:"#c9a84c" }}>★</span>}
                            {isNext&&<span style={{fontSize:7,color:"#60a5fa",fontWeight:900}}>PRÓX.</span>}
                          </div>
                          {last&&<div style={{fontSize:8,color:"#5f6675",marginTop:2}}>{getTeam(last.homeTeamId)?.short} {last.homeGoals}-{last.awayGoals} {getTeam(last.awayTeamId)?.short}</div>}
                        </td>
                        {[s.played,s.won,s.drawn,s.lost,s.goalsFor,s.goalsAgainst,s.goalDifference].map((v,j)=>(
                          <td key={j} style={{ padding:"7px 4px", textAlign:"center", color: j===6&&v>0?"#22c55e":j===6&&v<0?"#ef4444":"#6b7280", fontWeight:j===6?600:400 }}>{j===6&&v>0?`+${v}`:v}</td>
                        ))}
                        <td style={{ padding:"7px 4px", textAlign:"center", fontWeight:800, fontSize:13, color:isUser?"#c9a84c":"#e8eaf0" }}>{s.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Leyenda */}
            <div style={{ marginTop:14, display:"flex", flexWrap:"wrap", gap:10 }}>
              {[["#c9a84c","Champions (1-4)"],["#22c55e","Europa (5-6)"],["#3b82f6","Conference (7)"],["#ef4444","Descenso (18-20)"]].map(([c,l])=>(
                <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:c }}/>
                  <span style={{ fontSize:10, color:"#4b5563" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GOLEADORES ── */}
        {tab==="goleadores" && (
          <div style={{ padding:14 }}>
            {scorerList.length === 0 ? (
              <div style={{ textAlign:"center", color:"#4b5563", fontSize:13, marginTop:40 }}>
                Aún no hay goles registrados.<br/>Juega tu primer partido para ver los goleadores.
              </div>
            ) : (
              <>
                <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:12 }}>CLASIFICACIÓN DE GOLEADORES</div>
                {scorerList.map((s,i)=>{
                  const acc = RARITY_ACCENT[s.rarity] ?? "#c9a84c";
                  const team = getTeam(s.teamId);
                  const isUser = s.isUser;
                  const maxGoals = scorerList[0]?.goals ?? 1;
                  const pct = Math.round((s.goals/maxGoals)*100);
                  const podium = i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
                  return (
                    <div key={s.name+i} onClick={()=>s.player&&onOpenPlayer(s.player,s.teamId)} style={{ background: isUser?"rgba(201,168,76,.08)":"#161a24", border:`1px solid ${isUser?"rgba(201,168,76,.2)":"rgba(255,255,255,.05)"}`, borderRadius:10, padding:"11px 13px", marginBottom:8, cursor:s.player?"pointer":"default" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        {/* Posición */}
                        <div style={{ fontSize:14, minWidth:24, textAlign:"center" }}>
                          {podium ?? <span style={{ fontSize:12, fontWeight:700, color:"#4b5563" }}>{i+1}</span>}
                        </div>
                        {/* Avatar */}
                        <Initials name={s.name} size={36} rarity={s.rarity} borderRadius={8}/>
                        {/* Info */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight: isUser?700:600, color: isUser?"#c9a84c":"#e8eaf0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {s.name} {isUser?"★":""}
                          </div>
                          <div style={{ fontSize:10, color:"#6b7280", marginTop:2, display:"flex", alignItems:"center", gap:6 }}>
                            <span>{s.pos}</span>
                            {team && <><span>·</span><span style={{ color:team.color }}>{team.short}</span></>}
                          </div>
                          {/* Barra */}
                          <div style={{ marginTop:5, height:3, background:"#1e2330", borderRadius:2, overflow:"hidden" }}>
                            <div style={{ width:`${pct}%`, height:"100%", background:acc, borderRadius:2 }}/>
                          </div>
                        </div>
                        {/* Goles */}
                        <div style={{ textAlign:"center", flexShrink:0 }}>
                          <div style={{ fontSize:24, fontWeight:800, color:acc, lineHeight:1 }}>{s.goals}</div>
                          <div style={{ fontSize:9, color:"#4b5563", fontWeight:600, letterSpacing:".5px" }}>GOLES</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ── STATS DE EQUIPOS ── */}
        {tab==="stats" && (
          <div style={{ padding:14 }}>
            {/* Top atacantes */}
            <div style={{ background:"#161a24", borderRadius:10, padding:13, marginBottom:12 }}>
              <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:10 }}>EQUIPOS MÁS GOLEADORES</div>
              {[...teamStats].sort((a,b)=>b.goalsFor-a.goalsFor).slice(0,5).map((s,i)=>{
                const t=getTeam(s.teamId); const isUser=s.teamId===teamId;
                const max=[...teamStats].sort((a,b)=>b.goalsFor-a.goalsFor)[0]?.goalsFor||1;
                return (
                  <div key={s.teamId} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:11, color:"#4b5563", width:14, textAlign:"center" }}>{i+1}</span>
                    <TeamCrest team={t} size={20}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:isUser?700:400, color:isUser?"#c9a84c":"#e8eaf0", marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t?.name}</div>
                      <div style={{ height:3, background:"#1e2330", borderRadius:2, overflow:"hidden" }}>
                        <div style={{ width:`${Math.round((s.goalsFor/max)*100)}%`, height:"100%", background:"#22c55e", borderRadius:2 }}/>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                      <div style={{ textAlign:"center" }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"#22c55e" }}>{s.goalsFor}</div>
                        <div style={{ fontSize:9, color:"#4b5563" }}>GF</div>
                      </div>
                      <div style={{ textAlign:"center" }}>
                        <div style={{ fontSize:11, color:"#9aa0b4" }}>{s.avgGoalsFor}/p</div>
                        <div style={{ fontSize:9, color:"#4b5563" }}>media</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Menos goles encajados */}
            <div style={{ background:"#161a24", borderRadius:10, padding:13, marginBottom:12 }}>
              <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:10 }}>DEFENSAS MÁS SÓLIDAS</div>
              {[...teamStats].filter(s=>s.played>0).sort((a,b)=>a.goalsAgainst-b.goalsAgainst).slice(0,5).map((s,i)=>{
                const t=getTeam(s.teamId); const isUser=s.teamId===teamId;
                const max=[...teamStats].sort((a,b)=>b.goalsAgainst-a.goalsAgainst)[0]?.goalsAgainst||1;
                return (
                  <div key={s.teamId} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:11, color:"#4b5563", width:14, textAlign:"center" }}>{i+1}</span>
                    <TeamCrest team={t} size={20}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:isUser?700:400, color:isUser?"#c9a84c":"#e8eaf0", marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t?.name}</div>
                      <div style={{ height:3, background:"#1e2330", borderRadius:2, overflow:"hidden" }}>
                        <div style={{ width:`${100-Math.round((s.goalsAgainst/max)*100)}%`, height:"100%", background:"#3b82f6", borderRadius:2 }}/>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                      <div style={{ textAlign:"center" }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"#3b82f6" }}>{s.goalsAgainst}</div>
                        <div style={{ fontSize:9, color:"#4b5563" }}>GC</div>
                      </div>
                      <div style={{ textAlign:"center" }}>
                        <div style={{ fontSize:11, color:"#9aa0b4" }}>{s.avgGoalsAgainst}/p</div>
                        <div style={{ fontSize:9, color:"#4b5563" }}>media</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Racha actual del equipo del usuario */}
            {(() => {
              const myFixtures = fixtures.filter(f=>(f.homeTeamId===teamId||f.awayTeamId===teamId)&&f.played).reverse();
              if (!myFixtures.length) return null;
              const getRes = (f) => {
                const h=f.homeTeamId===teamId;
                const my=h?f.homeGoals:f.awayGoals; const th=h?f.awayGoals:f.homeGoals;
                return my>th?"V":my===th?"E":"D";
              };
              const results = myFixtures.map(getRes);
              const myTeam  = getTeam(teamId);
              const totalGF = myFixtures.reduce((s,f)=>s+(f.homeTeamId===teamId?f.homeGoals:f.awayGoals),0);
              const totalGA = myFixtures.reduce((s,f)=>s+(f.homeTeamId===teamId?f.awayGoals:f.homeGoals),0);
              const won=results.filter(r=>r==="V").length;
              const drawn=results.filter(r=>r==="E").length;
              const lost=results.filter(r=>r==="D").length;
              return (
                <div style={{ background:"linear-gradient(135deg,#1a1700,#1a2010)", border:"1px solid rgba(201,168,76,.2)", borderRadius:10, padding:13 }}>
                  <div style={{ fontSize:11, color:"#c9a84c", fontWeight:600, letterSpacing:".5px", marginBottom:12 }}>
                    ⭐ {myTeam?.name?.toUpperCase()} — TEMPORADA
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:12 }}>
                    {[["V",won,"#22c55e"],["E",drawn,"#f59e0b"],["D",lost,"#ef4444"],["GF-GC",`${totalGF}-${totalGA}`,"#c9a84c"]].map(([l,v,c])=>(
                      <div key={l} style={{ background:"#0d0f14", borderRadius:8, padding:"8px 4px", textAlign:"center" }}>
                        <div style={{ fontSize:18, fontWeight:800, color:c }}>{v}</div>
                        <div style={{ fontSize:9, color:"#4b5563", fontWeight:600 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:10, color:"#6b7280", marginBottom:6, fontWeight:600 }}>RACHA (últimos {Math.min(results.length,10)})</div>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {results.slice(0,10).map((r,i)=>{
                      const col=r==="V"?"#22c55e":r==="E"?"#f59e0b":"#ef4444";
                      return <div key={i} style={{ width:22,height:22,borderRadius:5,background:`${col}22`,border:`1px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:col }}>{r}</div>;
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
      </SwipeTabs>
    </div>
  );
}

// ─── PANTALLA DE TÁCTICAS ─────────────────────────────────────────────────────

function TacticsScreen({ tactics, setTactics }) {
  const S = { background: "#161a24", borderRadius: 10, padding: 14, marginBottom: 12 };
  const labelStyle = { fontSize: 11, color: "#6b7280", fontWeight: 600, letterSpacing: ".5px", marginBottom: 10 };

  function OptionGroup({ label, field, options, descriptions }) {
    return (
      <div style={S}>
        <div style={labelStyle}>{label.toUpperCase()}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {options.map(([val, display]) => {
            const active = tactics[field] === val;
            return (
              <button key={val} onClick={() => setTactics(t => ({ ...t, [field]: val }))}
                style={{ background: active ? "#c9a84c" : "#1e2330", color: active ? "#1a1200" : "#9aa0b4", border: `1px solid ${active ? "#c9a84c" : "rgba(255,255,255,.08)"}`, padding: "8px 14px", borderRadius: 7, fontSize: 13, fontWeight: active ? 700 : 400, cursor: "pointer", transition: "all .15s" }}>
                {display}
              </button>
            );
          })}
        </div>
        {descriptions && (
          <div style={{ fontSize: 11, color: "#4b5563", marginTop: 8 }}>{descriptions[tactics[field]]}</div>
        )}
      </div>
    );
  }

  const impacts = {
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

  // Calcular fuerza táctica estimada
  const mod = tacticModifiers(tactics);
  const atkNet = mod.atkBonus + mod.chancesRate * 20;
  const defNet = mod.defBonus;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
      {/* Resumen de impacto */}
      <div style={{ background: "#1a1f2e", border: "1px solid rgba(201,168,76,.2)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#c9a84c", fontWeight: 600, letterSpacing: ".5px", marginBottom: 10 }}>IMPACTO TÁCTICO ACTUAL</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            ["Ataque", atkNet, "#22c55e", "#ef4444"],
            ["Defensa", defNet, "#22c55e", "#ef4444"],
            ["Cansancio", mod.fatigueExtra, "#ef4444", "#22c55e"],
          ].map(([label, val, posCol, negCol]) => (
            <div key={label} style={{ background: "#0d0f14", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: val > 0 ? posCol : val < 0 ? negCol : "#6b7280" }}>
                {val > 0 ? "+" : ""}{Math.round(val * 10) / 10}
              </div>
            </div>
          ))}
        </div>
      </div>

      <OptionGroup label="Mentalidad" field="mentalidad"
        options={[["defensiva","Defensiva"],["equilibrada","Equilibrada"],["ofensiva","Ofensiva"]]}
        descriptions={impacts.mentalidad} />
      <OptionGroup label="Presión" field="presion"
        options={[["baja","Baja"],["media","Media"],["alta","Alta"]]}
        descriptions={impacts.presion} />
      <OptionGroup label="Ritmo" field="ritmo"
        options={[["lento","Lento"],["normal","Normal"],["rapido","Rápido"]]}
        descriptions={impacts.ritmo} />
      <OptionGroup label="Estilo de ataque" field="estilo"
        options={[["directo","Directo"],["posesion","Posesión"],["bandas","Bandas"],["contraataque","Contra"]]}
        descriptions={impacts.estilo} />
      <OptionGroup label="Riesgo" field="riesgo"
        options={[["conservador","Conservador"],["normal","Normal"],["agresivo","Agresivo"]]}
        descriptions={impacts.riesgo} />
    </div>
  );
}

function LiveLineupPanel({team,formation,playerIds,players,events,sentOffIds=[],side,eventTeam,currentMinute=0}){
  const relatedEvents=events.filter(event=>event.team===side||event.team===eventTeam);
  const participantIds=[...new Set([...playerIds,...relatedEvents.flatMap(event=>[event.playerId,event.outPlayerId]).filter(Boolean)])];
  const rank={POR:0,LD:1,DFC:2,LI:3,MCD:4,MC:5,MCO:6,MD:7,MI:8,ED:9,EI:10,DC:11};
  const lineupPlayers=participantIds.map(id=>players.find(player=>player.id===id)).filter(Boolean).sort((a,b)=>(rank[a.pos]??20)-(rank[b.pos]??20));
  const injuredIds=new Set(relatedEvents.filter(event=>event.type==="INJURY").map(event=>event.playerId));
  const active=lineupPlayers.filter(player=>playerIds.includes(player.id)&&!sentOffIds.includes(player.id)&&!injuredIds.has(player.id));
  const average=active.length?Math.round(active.reduce((sum,player)=>sum+player.overall,0)/active.length):0;
  const keyPlayer=[...active].sort((a,b)=>b.overall-a.overall)[0];
  const changes=relatedEvents.filter(event=>event.type==="SUBSTITUTION");
  const playerData = player => {
    const own = relatedEvents.filter(event => event.playerId === player.id || event.assistId === player.id || event.outPlayerId === player.id);
    const goals = own.filter(event => ["GOAL","PENALTY"].includes(event.type) && event.playerId === player.id).length;
    const assists = own.filter(event => event.assistId === player.id).length;
    const yellows = own.filter(event => event.type === "YELLOW" && event.playerId === player.id).length;
    const red = sentOffIds.includes(player.id);
    const saves = own.filter(event => event.type === "SAVE" && event.playerId === player.id).length;
    const defensiveActions = own.filter(event => event.type === "DEFENSIVE_ACTION" && event.playerId === player.id).length;
    const subIn = relatedEvents.find(event => event.type === "SUBSTITUTION" && event.playerId === player.id);
    const subOut = relatedEvents.find(event => event.type === "SUBSTITUTION" && event.outPlayerId === player.id);
    const hasPlayed = playerIds.includes(player.id) || subIn || own.length;
    const minutes = hasPlayed ? Math.max(0, Math.min(currentMinute || 0, subOut?.minute ?? (currentMinute || 0)) - (subIn?.minute ?? 0)) : 0;
    const hasRating = minutes > 0 || goals || assists || saves || defensiveActions || yellows || red;
    const rating = hasRating ? Math.max(4, Math.min(10, 6 + Math.min(90, minutes) / 360 + goals * 1.25 + assists * .7 + saves * .18 + defensiveActions * .14 - yellows * .2 - (red ? 1.5 : 0))) : null;
    return { goals, assists, yellows, red, saves, defensiveActions, minutes, rating: rating ? rating.toFixed(1) : "—" };
  };
  return <div style={{background:"#161a24",border:`1px solid ${team?.color??"#6b7280"}28`,borderRadius:11,padding:12,marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><TeamCrest team={team} size={38}/><div style={{flex:1}}><div style={{fontSize:12,color:"#fff",fontWeight:850}}>{team?.name}</div><div style={{fontSize:9,color:team?.color??"#9aa0b4",marginTop:2}}>{formation} · {active.length} jugadores activos</div></div><div style={{textAlign:"center"}}><div style={{fontSize:20,color:"#c9a84c",fontWeight:900}}>{average}</div><div style={{fontSize:7,color:"#6b7280"}}>MEDIA ONCE</div></div></div><div style={{display:"flex",flexDirection:"column",gap:5}}>{lineupPlayers.map(player=>{const data=playerData(player);const red=data.red;const injured=injuredIds.has(player.id);const subOut=relatedEvents.find(event=>event.type==="SUBSTITUTION"&&event.outPlayerId===player.id);const subIn=relatedEvents.find(event=>event.type==="SUBSTITUTION"&&event.playerId===player.id);return <div key={player.id} style={{background:red?"rgba(239,68,68,.07)":injured?"rgba(249,115,22,.07)":"#11141c",borderRadius:7,padding:"7px 9px",opacity:red||subOut?.7:1}}><div style={{display:"flex",alignItems:"center",gap:7}}><span style={{width:29,color:"#6b7280",fontSize:9,fontWeight:800}}>{player.pos}</span><span style={{flex:1,color:red?"#ef4444":injured?"#f97316":"#dfe3ec",fontSize:10,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{player.name}</span>{data.goals>0&&<span>⚽{data.goals}</span>}{data.assists>0&&<span style={{fontSize:8,color:"#60a5fa"}}>A{data.assists}</span>}{data.yellows>0&&<span>🟨</span>}{red&&<span>🟥</span>}{injured&&<span>🏥</span>}<strong style={{fontSize:11,color:Number(data.rating)>=7?"#22c55e":"#c9a84c"}}>{data.rating}</strong></div><div style={{display:"flex",gap:7,marginTop:3,paddingLeft:36,fontSize:8,color:"#697083"}}>{player.fatigue!=null&&<span>⚡ {Math.max(0,100-player.fatigue)}%</span>}{subIn&&<span style={{color:"#22c55e"}}>ENTRA {subIn.minute}'</span>}{subOut&&<span style={{color:"#a855f7"}}>SALE {subOut.minute}'</span>}</div></div>})}</div>{keyPlayer&&<div style={{marginTop:9,paddingTop:8,borderTop:"1px solid rgba(255,255,255,.05)",fontSize:9,color:"#6b7280"}}>⭐ Jugador clave: <strong style={{color:team?.color??"#c9a84c"}}>{keyPlayer.name}</strong> · {keyPlayer.overall}</div>}{changes.length>0&&<div style={{marginTop:6,fontSize:8,color:"#a855f7"}}>🔄 {changes.length} cambio{changes.length===1?"":"s"}</div>}</div>;
}

function MatchScreen({ game, tactics: baseTactics, setTactics: setBaseTactics, lineup: baseLineup, setLineup: setBaseLineup, subs: baseSubs, setSubs: setBaseSubs, formation:baseFormation="4-3-3", onMatchEnd }) {
  const initialFixture=game.fixtures.find(f=>!f.played&&(f.homeTeamId===game.teamId||f.awayTeamId===game.teamId));
  const initialOppId=initialFixture?(initialFixture.homeTeamId===game.teamId?initialFixture.awayTeamId:initialFixture.homeTeamId):null;
  const initialOppFormation=chooseOpponentFormation(initialOppId??"");
  const initialOppPlayers=REAL_SQUADS[initialOppId]??[];
  const [segment, setSegment]   = useState(0);
  const [events, setEvents]     = useState([]);
  const [score, setScore]       = useState({ home: 0, away: 0 });
  const [finished, setFinished] = useState(false);
  const [tab, setTab]           = useState("eventos"); // eventos | tacticas | cambios
  const [livePlayer, setLivePlayers] = useState(game.players);
  const [liveOppPlayers, setLiveOppPlayers] = useState(()=>initialOppPlayers.map(player=>({...player,fatigue:player.fatigue??18})));
  const [subsUsed, setSubsUsed] = useState(0);
  const MAX_SUBS = MAX_MATCH_SUBS;
  // Lesión pendiente de sustitución forzada: { playerId, name }
  const [pendingInjury, setPendingInjury] = useState(null);
  // Slot del titular que se quiere sustituir manualmente: index en lineup, o null
  const [subbingSlot, setSubbingSlot] = useState(null);
  // Banner de evento clave del último tramo (gol, tarjeta) — se autodescarta
  const [keyEventBanner, setKeyEventBanner] = useState(null);
  // Posesión del balón (% del equipo del usuario) — se actualiza tras cada tramo
  const [possession, setPossession] = useState(50);
  // IDs de jugadores expulsados durante ESTE partido — quedan fuera del campo el resto del encuentro
  const [sentOffIds, setSentOffIds] = useState([]);
  const [oppSentOffIds, setOppSentOffIds] = useState([]);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [pauseEvent, setPauseEvent] = useState(null);
  const [playing, setPlaying] = useState(false);
  // IDs de jugadores ya sustituidos (salieron del campo) — no pueden volver a jugar este partido
  const [subbedOutIds, setSubbedOutIds] = useState([]);
  const [oppCallup] = useState(()=>buildMatchdaySquad(initialOppPlayers,initialOppFormation,BENCH_SLOTS));
  const [oppLineup, setOppLineup] = useState(()=>oppCallup.lineup);
  const [oppSubs, setOppSubs] = useState(()=>oppCallup.bench);
  const [oppSubsUsed, setOppSubsUsed] = useState(0);
  const [oppSubbedOutIds, setOppSubbedOutIds] = useState([]);

  // Copias LOCALES de alineación, banco y táctica — los cambios durante el partido
  // son solo para este partido y nunca tocan el estado persistente de App.
  // Al terminar el partido se descartan automáticamente (no se sincronizan de vuelta).
  const [lineup, setLineup] = useState(normalizeSlots(baseLineup, STARTERS_SLOTS));
  const [subs, setSubs]     = useState(normalizeSlots(baseSubs, BENCH_SLOTS));
  const [tactics, setTactics] = useState(baseTactics);

  const teamId  = game.teamId;
  const fixture = game.fixtures.find(f => !f.played && (f.homeTeamId === teamId || f.awayTeamId === teamId));
  if (!fixture) return <div style={{ padding: 20, color: "#9aa0b4" }}>No hay partido disponible.</div>;

  const isHome     = fixture.homeTeamId === teamId;
  const userTeam   = TEAMS.find(t => t.id === teamId);
  const oppTeamId  = isHome ? fixture.awayTeamId : fixture.homeTeamId;
  const oppTeam    = TEAMS.find(t => t.id === oppTeamId);
  const homeName   = isHome ? userTeam?.short : oppTeam?.short;
  const awayName   = isHome ? oppTeam?.short  : userTeam?.short;
  const homeScore  = isHome ? score.home : score.away;
  const awayScore  = isHome ? score.away : score.home;
  const segments   = [15, 30, 45, 60, 75, 90];

  // Realizar una sustitución: sale outId, entra inId (debe estar en el banco)
  const doSubstitution = (outId, inId) => {
    if (subsUsed >= MAX_SUBS) return;
    if (subbedOutIds.includes(outId)) return; // ya estaba fuera, no debería poder "salir" otra vez
    if (subbedOutIds.includes(inId) || sentOffIds.includes(inId)) return; // no se puede hacer entrar a alguien que ya salió o fue expulsado
    const slotIdx = lineup.findIndex(id => id === outId);
    if (slotIdx === -1) return;
    const newLineup = [...lineup];
    newLineup[slotIdx] = inId;
    setLineup(newLineup);
    // El jugador que entra desaparece del banco. El que sale NO vuelve al banco —
    // queda registrado en subbedOutIds para impedir que se le pueda alinear de nuevo este partido.
    const benchIdx = subs.findIndex(id => id === inId);
    if (benchIdx !== -1) {
      const newSubs = [...subs];
      newSubs[benchIdx] = null;
      setSubs(newSubs);
    }
    setSubbedOutIds(prev => [...prev, outId]);
    setSubsUsed(n => n + 1);
    const outP = livePlayer.find(p => p.id === outId);
    const inP  = livePlayer.find(p => p.id === inId);
    setEvents(ev => [...ev, {
      minute: currentMinute, type: "SUBSTITUTION", team: "user", playerId: inId, outPlayerId: outId,
      description: `🔄 Cambio: entra ${inP?.name ?? "jugador"} por ${outP?.name ?? "jugador"}.`,
    }]);
    setSubbingSlot(null);
    setPendingInjury(null);
  };

  const doOpponentSubstitution = (outId, inId, minute, reason = "") => {
    if (oppSubsUsed >= MAX_MATCH_SUBS) return null;
    if (!outId || !inId || oppSubbedOutIds.includes(outId) || oppSubbedOutIds.includes(inId) || oppSentOffIds.includes(inId)) return null;
    const slotIdx = oppLineup.findIndex(id => id === outId);
    if (slotIdx === -1) return null;
    const benchIdx = oppSubs.findIndex(id => id === inId);
    if (benchIdx === -1) return null;
    const fullOppSquad = liveOppPlayers;
    const outP = fullOppSquad.find(player => player.id === outId);
    const inP = fullOppSquad.find(player => player.id === inId);
    setOppLineup(current => current.map((id,index)=>index===slotIdx?inId:id));
    setOppSubs(current => current.map((id,index)=>index===benchIdx?null:id));
    setOppSubbedOutIds(current => [...current, outId]);
    setOppSubsUsed(current => current + 1);
    return {
      minute, type:"SUBSTITUTION", team:"opp", playerId:inId, outPlayerId:outId,
      description:`🔄 Cambio rival: entra ${inP?.name ?? "jugador"} por ${outP?.name ?? "jugador"}${reason ? ` · ${reason}` : ""}.`,
    };
  };

  const maybeOpponentAutoSub = (minute) => {
    if (minute < 55 || oppSubsUsed >= MAX_MATCH_SUBS) return null;
    if (![60,75,85].some(mark => currentMinute < mark && minute >= mark)) return null;
    const fullOppSquad = liveOppPlayers;
    const oppGoalsNow = isHome ? score.away : score.home;
    const userGoalsNow = isHome ? score.home : score.away;
    const oppLosing = oppGoalsNow < userGoalsNow;
    const oppWinning = oppGoalsNow > userGoalsNow;
    const yellowMap = {};
    events.filter(event=>event.team==="opp"&&event.type==="YELLOW"&&event.playerId).forEach(event=>yellowMap[event.playerId]=(yellowMap[event.playerId]??0)+1);
    const activeIds = oppLineup.filter(id => id && !oppSentOffIds.includes(id) && !oppSubbedOutIds.includes(id));
    const outCandidates = activeIds
      .map(id => fullOppSquad.find(player => player.id === id))
      .filter(player => player && player.group !== "POR")
      .sort((a,b)=>{
        const scoreOut = player => ((player.fatigue??18)*1.4)+(yellowMap[player.id]?22:0)+(player.injured?100:0)-(player.overall??70)*.15;
        return scoreOut(b)-scoreOut(a);
      });
    const outP = outCandidates[0];
    if (!outP) return null;
    const inCandidates = oppSubs
      .map(id => fullOppSquad.find(player => player.id === id))
      .filter(player => player && !player.injured && !player.suspended && !oppSubbedOutIds.includes(player.id))
      .sort((a,b)=>{
        const desiredGroup = oppLosing ? "DEL" : oppWinning ? (outP.group==="DEL"?"MED":"DEF") : outP.group;
        const aDesired=a.group===desiredGroup?1:0,bDesired=b.group===desiredGroup?1:0;
        if(aDesired!==bDesired)return bDesired-aDesired;
        const aSame=a.group===outP.group?1:0,bSame=b.group===outP.group?1:0;
        if(aSame!==bSame)return bSame-aSame;
        return ((b.overall??0)-(b.fatigue??18)*.12)-((a.overall??0)-(a.fatigue??18)*.12);
      });
    const inP = inCandidates[0];
    if (!inP) return null;
    const reason = oppLosing ? "busca más ataque" : oppWinning ? "protege el resultado" : (yellowMap[outP.id] ? "evita una segunda amarilla" : "refresca piernas");
    return doOpponentSubstitution(outP.id, inP.id, minute, reason);
  };

  const simNext = () => {
    if (finished || segment >= 6) return;
    const intervalEnd=segments[segment];
    if(pauseEvent){setPauseEvent(null);setKeyEventBanner(null);if(pauseEvent.type==="INJURY")setPendingInjury(null);}
    if(currentMinute>=intervalEnd){
      setPauseEvent(null);setKeyEventBanner(null);
      const next=segment+1;setSegment(next);if(next>=6){setFinished(true);setPlaying(false);}return;
    }
    const starterIds = lineup.filter(Boolean);
    const starterPlayers = (starterIds.length > 0
      ? livePlayer.filter(p => starterIds.includes(p.id))
      : livePlayer.filter(p => !p.injured && !p.suspended)
    ).filter(p => !sentOffIds.includes(p.id)&&!p.injured); // expulsados y lesionados no participan
    const fullOppSquad = liveOppPlayers;
    const oppSquad=oppLineup.map(id=>fullOppSquad.find(player=>player.id===id)).filter(player=>player&&!oppSentOffIds.includes(player.id));
    const userStr=strengthWithPlayerCount(calcTeamStrength(starterPlayers,isHome,tactics),starterPlayers.length);
    const oppCount=Math.max(7,oppSquad.length);
    const oppStr=strengthWithPlayerCount(calcTeamStrength(oppSquad,!isHome,DEFAULT_TACTICS)+(Math.random()*4-2),oppCount);
    const yellowCounts={user:{},opp:{}};
    events.filter(event=>event.type==="YELLOW").forEach(event=>{const side=event.team==="user"||event.team==="opp"?event.team:null;if(side&&event.playerId)yellowCounts[side][event.playerId]=(yellowCounts[side][event.playerId]??0)+1;});
    const generated=generateSegmentEvents(segment,starterPlayers,userStr,oppStr,score,tactics,isHome,oppSquad,{
      fixtures:game.fixtures,teamId:game.teamId,matchday:fixture.matchday,
      minuteStart:Math.max(segment*15+1,currentMinute+1),minuteEnd:intervalEnd,yellowCounts,
    });
    const flow=eventsUntilExtraordinary(generated);
    const newEvs=flow.events;

    // Calcular posesión del tramo según fuerza relativa, estilo táctico y algo de variación
    const strDiff = userStr - oppStr;
    let basePoss = 50 + strDiff * 1.1;
    if (tactics.estilo === "posesion") basePoss += 8;
    if (tactics.estilo === "directo" || tactics.estilo === "contraataque") basePoss -= 6;
    const segmentPoss = Math.max(28, Math.min(78, Math.round(basePoss + (Math.random() * 10 - 5))));
    setPossession(segmentPoss);

    let hDelta = 0, aDelta = 0;
    newEvs.forEach(e => {
      if (e.type === "GOAL" || e.type === "PENALTY") {
        // e.team:"user" = user scored, e.team:"opp" = opponent scored
        // Convert to home/away for score tracking
        const scoringHome = (e.team === "user") === isHome;
        if (scoringHome) hDelta++; else aDelta++;
        // Normalize team for event storage
        e.team = scoringHome ? "home" : "away";
      }
    });

    // Expulsiones: abandonan el campo y dejan un hueco real en la alineación activa.
    const newReds = newEvs.filter(e => e.type === "RED" && e.team === "user" && e.playerId).map(e => e.playerId);
    const newOppReds = newEvs.filter(e => e.type === "RED" && e.team === "opp" && e.playerId).map(e => e.playerId);
    if (newReds.length)setSentOffIds(prev=>[...new Set([...prev,...newReds])]);
    if (newOppReds.length)setOppSentOffIds(prev=>[...new Set([...prev,...newOppReds])]);

    // Cansancio proporcional a los minutos realmente simulados antes de la pausa.
    const reachedMinute=flow.pauseEvent?.minute??intervalEnd;
    const autoOppSub=maybeOpponentAutoSub(reachedMinute);
    if(autoOppSub)newEvs.push(autoOppSub);
    const elapsedMinutes=Math.max(1,reachedMinute-currentMinute);
    const fatDelta = fatigueDeltaPerSegment(tactics)*(elapsedMinutes/15);
    const onFieldIds = new Set(starterPlayers.map(p => p.id));
    setLivePlayers(prev => prev.map(p => {
      const onField = onFieldIds.has(p.id);
      const isGK = p.group === "POR";
      const ageFactor = p.age >= 32 ? 1.18 : p.age <= 22 ? .92 : 1;
      const updated = {
        ...p,
        // Solo los jugadores en el campo se cansan; los porteros apenas se cansan; los que no juegan descansan
        fatigue: p.injured ? p.fatigue
          : onField
            ? Math.min(100, Math.round(p.fatigue + ((isGK ? fatDelta * 0.25 : fatDelta) * ageFactor) + Math.random() * (isGK ? 0.5 : 2)))
            : Math.max(0, Math.round(p.fatigue - 1)),
      };
      const injuryEvent = newEvs.find(e => e.type === "INJURY" && e.playerId === p.id);
      return injuryEvent ? applyInjury(updated, injuryEvent, game.season ?? "2025", fixture.matchday) : updated;
    }));
    const oppOnFieldIds = new Set(oppSquad.map(player=>player.id));
    const oppFatDelta = fatigueDeltaPerSegment(DEFAULT_TACTICS)*(elapsedMinutes/15);
    setLiveOppPlayers(prev => prev.map(player => {
      const onField = oppOnFieldIds.has(player.id);
      const isGK = player.group === "POR";
      const ageFactor = player.age >= 32 ? 1.18 : player.age <= 22 ? .92 : 1;
      const injuryEvent = newEvs.find(event => event.type === "INJURY" && event.team === "opp" && event.playerId === player.id);
      const updated = {
        ...player,
        fatigue: player.injured ? player.fatigue
          : onField
            ? Math.min(100, Math.round((player.fatigue ?? 18) + ((isGK ? oppFatDelta * .25 : oppFatDelta) * ageFactor) + Math.random() * (isGK ? .5 : 2)))
            : Math.max(0, Math.round((player.fatigue ?? 18) - 1)),
      };
      return injuryEvent ? applyInjury(updated, injuryEvent, game.season ?? "2025", fixture.matchday) : updated;
    }));

    setScore(s => ({ home: s.home + hDelta, away: s.away + aDelta }));
    setEvents(ev => [...ev, ...newEvs]);

    // Un evento extraordinario permanece visible hasta que el usuario decide continuar.
    const keyEv = flow.pauseEvent??newEvs.find(e => e.type==="YELLOW");
    if (keyEv) {
      setKeyEventBanner(keyEv);
      if(!flow.pauseEvent)setTimeout(() => setKeyEventBanner(b => b === keyEv ? null : b), 4000);
    }

    // Si alguno de los nuestros se ha lesionado, ofrecer sustitución forzada inmediata
    const newInjury = newEvs.find(e => e.type === "INJURY" && e.playerId && onFieldIds.has(e.playerId));
    if (newInjury) {
      const injuredP = livePlayer.find(p => p.id === newInjury.playerId);
      setPendingInjury({ playerId: newInjury.playerId, name: injuredP?.name ?? "Jugador", type:newInjury.injuryType, days:newInjury.injuryDays });
      setTab("cambios");
    }

    setCurrentMinute(reachedMinute);
    if(flow.pauseEvent){
      setPlaying(false);
      setPauseEvent(flow.pauseEvent);
      if(flow.pauseEvent.type==="INJURY")setTab("cambios");else setTab("eventos");
    }else{
      setPauseEvent(null);
      const next=segment+1;setSegment(next);if(next>=6){setFinished(true);setPlaying(false);}
    }
  };

  useEffect(() => {
    if (!playing || finished || pauseEvent || pendingInjury) return;
    const timer = setTimeout(() => simNext(), 1000);
    return () => clearTimeout(timer);
  }, [playing, finished, pauseEvent, pendingInjury, currentMinute, segment]);

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (pendingInjury) return;
    if (pauseEvent) {
      setPauseEvent(null);
      setKeyEventBanner(null);
    }
    setPlaying(true);
  };

  const manualAdvance = () => {
    setPlaying(false);
    simNext();
  };

  const endMatch = () => onMatchEnd(fixture.id, score.home, score.away, events, livePlayer, {
    teamId: game.teamId,
    starters: baseLineup.filter(Boolean),
    finishers: lineup.filter(id=>id&&!sentOffIds.includes(id)&&!livePlayer.find(player=>player.id===id)?.injured),
    userFormation:baseFormation,
    opponentFormation:initialOppFormation,
    opponentStarters:oppCallup.lineup.filter(Boolean),
    opponentBench:oppCallup.bench.filter(Boolean),
    opponentFinishers:oppLineup.filter(id=>id&&!oppSentOffIds.includes(id)),
    opponentPlayers:liveOppPlayers,
  });

  const eventColors  = { GOAL:"#22c55e",PENALTY:"#22c55e",BIG_CHANCE:"#f59e0b",YELLOW:"#fbbf24",RED:"#ef4444",SAVE:"#3b82f6",DEFENSIVE_ACTION:"#60a5fa",INJURY:"#f97316",SUBSTITUTION:"#a855f7" };
  const eventLabels  = { GOAL:"GOL",PENALTY:"PENALTI",BIG_CHANCE:"OCASIÓN",YELLOW:"AMARILLA",RED:"ROJA",SAVE:"PARADA",DEFENSIVE_ACTION:"DEFENSA",INJURY:"LESIÓN",SUBSTITUTION:"CAMBIO" };

  const avgFatigue = Math.round(livePlayer.filter(p=>!p.injured).reduce((s,p)=>s+p.fatigue,0) / Math.max(1,livePlayer.filter(p=>!p.injured).length));
  const fatColor   = avgFatigue <= 40 ? "#22c55e" : avgFatigue <= 65 ? "#f59e0b" : "#ef4444";
  const activeUserCount=lineup.filter(id=>id&&!sentOffIds.includes(id)&&!livePlayer.find(player=>player.id===id)?.injured).length;

  // El equipo LOCAL siempre a la IZQUIERDA, VISITANTE a la DERECHA
  // score.home = goles del equipo que juega en casa (fixture.homeTeamId)
  const homeTeam   = TEAMS.find(t => t.id === fixture.homeTeamId);
  const awayTeam   = TEAMS.find(t => t.id === fixture.awayTeamId);
  const leftTeam   = homeTeam;   // izquierda = local
  const rightTeam  = awayTeam;   // derecha = visitante
  const leftGoals  = score.home;
  const rightGoals = score.away;
  const leftIsUser  = isHome;    // usuario es local → resaltado a la izquierda
  const rightIsUser = !isHome;   // usuario es visitante → resaltado a la derecha

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Marcador */}
      <div style={{ background: "#1a1f2e", padding: "14px 16px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,.06)", flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: "#c9a84c", fontWeight: 600, letterSpacing: ".5px", marginBottom: 6 }}>
          J{fixture.matchday} · {finished ? "FINALIZADO" : currentMinute===0 ? "INICIO" : currentMinute===45&&!pauseEvent ? "DESCANSO" : `MIN ${currentMinute}'${pauseEvent?" · PARTIDO DETENIDO":""}`}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{ flex: 1, textAlign: "right" }}>
            <TeamCrest team={leftTeam} size={34} style={{marginLeft:"auto",marginBottom:3}}/>
            <div style={{ fontSize: 13, fontWeight: 700, color: leftIsUser ? "#c9a84c" : "#e8eaf0" }}>{leftTeam?.short}</div>
            <div style={{ fontSize: 10, color: "#6b7280" }}>🏠 Local{leftIsUser ? " ★" : ""}</div>
          </div>
          <div style={{ background: "#0d0f14", padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(201,168,76,.25)" }}>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, color: "#e8eaf0" }}>{leftGoals} - {rightGoals}</div>
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <TeamCrest team={rightTeam} size={34} style={{marginRight:"auto",marginBottom:3}}/>
            <div style={{ fontSize: 13, fontWeight: 700, color: rightIsUser ? "#c9a84c" : "#e8eaf0" }}>{rightTeam?.short}</div>
            <div style={{ fontSize: 10, color: "#6b7280" }}>✈️ Visitante{rightIsUser ? " ★" : ""}</div>
          </div>
        </div>
        {/* Barra de tramos + stats rápidas */}
        <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 10 }}>
          {segments.map((_, i) => <div key={i} style={{ height: 3, width: 38, borderRadius: 2, background: i < segment ? "#c9a84c" : "#1e2330" }} />)}
        </div>

        {/* Posesión del balón */}
        {segment > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: leftIsUser ? "#c9a84c" : "#6b7280", fontWeight: 700 }}>
                {isHome ? possession : 100 - possession}%
              </span>
              <span style={{ fontSize: 9, color: "#4b5563", fontWeight: 600 }}>⚽ POSESIÓN</span>
              <span style={{ fontSize: 10, color: rightIsUser ? "#c9a84c" : "#6b7280", fontWeight: 700 }}>
                {isHome ? 100 - possession : possession}%
              </span>
            </div>
            <div style={{ height: 6, background: "#1e2330", borderRadius: 3, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${isHome ? possession : 100 - possession}%`, height: "100%",
                background: leftIsUser ? "linear-gradient(90deg,#8a7330,#c9a84c)" : "linear-gradient(90deg,#4b5563,#6b7280)",
                transition: "width .5s ease" }}/>
              <div style={{ width: `${isHome ? 100 - possession : possession}%`, height: "100%",
                background: rightIsUser ? "linear-gradient(90deg,#c9a84c,#8a7330)" : "linear-gradient(90deg,#6b7280,#4b5563)",
                transition: "width .5s ease" }}/>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            🏃 Cansancio: <span style={{ color: fatColor, fontWeight: 700 }}>{avgFatigue}</span>
          </div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            🎯 <span style={{ color: tactics.mentalidad==="ofensiva"?"#ef4444":tactics.mentalidad==="defensiva"?"#3b82f6":"#c9a84c", fontWeight: 700 }}>{tactics.mentalidad.toUpperCase()}</span>
            {" · "}{tactics.presion} presión{" · "}{tactics.estilo}
          </div>
          <div style={{fontSize:11,color:activeUserCount<11?"#ef4444":oppSentOffIds.length?"#22c55e":"#6b7280",fontWeight:700}}>👥 {activeUserCount} vs {oppLineup.filter(id=>id&&!oppSentOffIds.includes(id)).length}</div>
        </div>
      </div>

      {/* Aviso de evento clave (gol/tarjeta) del último tramo */}
      {keyEventBanner && !pendingInjury && (
        <div className="bounce-in" style={{
          background: keyEventBanner.type==="RED" ? "#ef444422" : keyEventBanner.type==="YELLOW" ? "#fbbf2422" : "#22c55e22",
          borderBottom: `1px solid ${keyEventBanner.type==="RED"?"#ef444455":keyEventBanner.type==="YELLOW"?"#fbbf2455":"#22c55e55"}`,
          padding: "10px 14px", flexShrink: 0, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize: 18 }}>{keyEventBanner.type==="RED"?"🟥":keyEventBanner.type==="YELLOW"?"🟨":"⚽"}</span>
          <div style={{ flex: 1, fontSize: 12, color: "#e8eaf0", lineHeight: 1.4 }}>{keyEventBanner.description}</div>
          <button onClick={() => setKeyEventBanner(null)}
            style={{ background: "rgba(255,255,255,.08)", border: "none", color: "#9aa0b4", padding: "5px 9px", borderRadius: 6, fontSize: 11, cursor:"pointer" }}>✕</button>
        </div>
      )}

      {/* Aviso de lesión — sustitución forzada */}
      {pendingInjury && (
        <div style={{ background: "#f9731622", borderBottom: "1px solid #f9731655", padding: "10px 14px", flexShrink: 0, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize: 18 }}>🚑</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f97316" }}>{pendingInjury.name} se ha lesionado</div>
            <div style={{ fontSize: 11, color: "#9aa0b4" }}>{pendingInjury.type ?? "Lesión muscular"}{pendingInjury.days?` · ${pendingInjury.days} días estimados`:""} · Haz un cambio</div>
          </div>
          <button onClick={() => { setSubbingSlot(lineup.findIndex(id=>id===pendingInjury.playerId)); setTab("cambios"); }}
            className="btn-gold" style={{ padding: "7px 14px", borderRadius: 7, fontSize: 12 }}>Cambiar</button>
          <button onClick={() => setPendingInjury(null)}
            style={{ background: "rgba(255,255,255,.08)", border: "none", color: "#9aa0b4", padding: "7px 10px", borderRadius: 7, fontSize: 12, cursor:"pointer" }}>✕</button>
        </div>
      )}

      {/* Tabs eventos / cambios / tácticas */}
      <div style={{ display: "flex", overflowX:"auto", background: "#161a24", borderBottom: "1px solid rgba(255,255,255,.06)", flexShrink: 0 }}>
        {[["eventos","📋 Eventos"],["alineaciones","👥 Alineaciones"],["cambios",`🔄 Cambios (${subsUsed}/${MAX_SUBS})`],["tacticas","⚙️ Tácticas"]].map(([id,label]) => (
          <button data-swipe-ignore="true" key={id} onClick={() => setTab(id)}
            style={{ flex:"1 0 105px", whiteSpace:"nowrap", background: "transparent", border: "none", borderBottom: tab === id ? "2px solid #c9a84c" : "2px solid transparent", color: tab === id ? "#c9a84c" : "#6b7280", padding: "10px 6px", fontSize: 11, fontWeight: tab === id ? 700 : 400, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Contenido tab */}
      <SwipeTabs tabs={["eventos","alineaciones","cambios","tacticas"]} activeTab={tab} onChange={setTab} style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} contentStyle={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "eventos" && (
          <div style={{ padding: 12 }}>
            {events.length === 0 && !finished && (
              <div style={{ textAlign: "center", color: "#6b7280", fontSize: 13, marginTop: 40, lineHeight: 1.7 }}>
                Configura tus tácticas y pulsa<br />"Play" para comenzar
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[...events].reverse().map((e, i) => {
                const color = eventColors[e.type] ?? "#6b7280";
                const isGoal = e.type === "GOAL" || e.type === "PENALTY";
                return (
                  <div key={i} className={isGoal ? "goal-event" : ""}
                    style={{ background:"#161a24", borderRadius:8, padding:"9px 12px", display:"flex", alignItems:"center", gap:10, borderLeft:`3px solid ${color}` }}>
                    <div style={{ fontSize: 12, color: "#6b7280", minWidth: 26, fontWeight: 700 }}>{e.minute}'</div>
                    <div style={{ background: `${color}22`, color, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, minWidth: 60, textAlign: "center" }}>{e.secondYellow?"DOBLE 🟨":eventLabels[e.type] ?? e.type}</div>
                    <div style={{ fontSize: 12, color: "#e8eaf0", flex: 1, lineHeight: 1.4 }}>{e.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {tab === "cambios" && (
          <div style={{ padding: 12 }}>
            <div style={{ fontSize: 11, color: "#9aa0b4", background: "#1e2330", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
              Te quedan <strong style={{ color: subsUsed>=MAX_SUBS?"#ef4444":"#22c55e" }}>{MAX_SUBS - subsUsed}</strong> cambios disponibles.
            </div>
            {subsUsed >= MAX_SUBS ? (
              <div style={{ textAlign: "center", color: "#6b7280", fontSize: 13, marginTop: 20 }}>Has usado todos tus cambios.</div>
            ) : !subbingSlot && subbingSlot !== 0 ? (
              <>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 8 }}>SELECCIONA QUIÉN SALE</div>
                {lineup.map((pid, idx) => {
                  if (!pid) return null;
                  const p = livePlayer.find(pl => pl.id === pid);
                  if (!p) return null;
                  const hurt = p.injured;
                  // Tarjetas/lesión recibidas durante ESTE partido (eventos en vivo)
                  const yellowsInMatch = events.filter(e => e.type === "YELLOW" && e.playerId === pid).length;
                  const redInMatch     = sentOffIds.includes(pid);
                  const injuredInMatch = events.some(e => e.type === "INJURY" && e.playerId === pid);
                  if (redInMatch) {
                    // Un jugador expulsado no puede ser "sustituido": ya está fuera del campo definitivamente
                    return (
                      <div key={idx} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", marginBottom:6,
                        background:"rgba(239,68,68,.06)", border:"1px solid rgba(239,68,68,.2)", borderRadius:8, opacity:.6 }}>
                        <Initials name={p.name} size={30} rarity={p.rarity} borderRadius={6}/>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:"#ef4444", display:"flex", alignItems:"center", gap:5 }}>
                            {p.name} <span title="Expulsado">🟥</span>
                          </div>
                          <div style={{ fontSize:10, color:"#6b7280" }}>Expulsado · el equipo juega con uno menos</div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={idx} onClick={() => setSubbingSlot(idx)}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", marginBottom:6,
                        background: hurt ? "rgba(239,68,68,.08)" : "#161a24",
                        border: hurt ? "1px solid rgba(239,68,68,.3)" : "1px solid rgba(255,255,255,.06)",
                        borderRadius:8, cursor:"pointer" }}>
                      <Initials name={p.name} size={30} rarity={p.rarity} borderRadius={6}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:600, color: hurt?"#ef4444":"#e8eaf0", display:"flex", alignItems:"center", gap:5 }}>
                          {p.name}
                          {injuredInMatch && <span title="Lesionado">🚑</span>}
                          {yellowsInMatch > 0 && Array(yellowsInMatch).fill(0).map((_,k) => <span key={k} title="Tarjeta amarilla">🟨</span>)}
                        </div>
                        <div style={{ fontSize:10, color:"#6b7280" }}>{p.pos} · Cansancio {p.fatigue}</div>
                      </div>
                      <span style={{ fontSize:11, color:"#c9a84c" }}>Sacar →</span>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>
                    SALE: {livePlayer.find(p=>p.id===lineup[subbingSlot])?.name}
                  </div>
                  <button onClick={() => setSubbingSlot(null)} style={{ background:"transparent", border:"none", color:"#6b7280", fontSize:11, cursor:"pointer" }}>← Cambiar</button>
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 8 }}>SELECCIONA QUIÉN ENTRA</div>
                {subs.filter(Boolean).length === 0 && (
                  <div style={{ textAlign:"center", color:"#6b7280", fontSize:13, marginTop:16 }}>No tienes suplentes disponibles en el banco.</div>
                )}
                {subs.map((pid, idx) => {
                  if (!pid) return null;
                  if (subbedOutIds.includes(pid) || sentOffIds.includes(pid)) return null; // seguridad extra
                  const p = livePlayer.find(pl => pl.id === pid);
                  if (!p || p.injured || p.suspended) return null;
                  return (
                    <div key={idx} onClick={() => doSubstitution(lineup[subbingSlot], pid)}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", marginBottom:6,
                        background:"#161a24", border:"1px solid rgba(34,197,94,.25)", borderRadius:8, cursor:"pointer" }}>
                      <Initials name={p.name} size={30} rarity={p.rarity} borderRadius={6}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"#e8eaf0" }}>{p.name}</div>
                        <div style={{ fontSize:10, color:"#6b7280" }}>{p.pos} · Cansancio {p.fatigue}</div>
                      </div>
                      <span style={{ fontSize:11, color:"#22c55e" }}>← Entra</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
        {tab === "alineaciones" && (
          <div style={{padding:12}}>
            <LiveLineupPanel team={userTeam} formation={baseFormation} playerIds={lineup.filter(Boolean)} players={livePlayer} events={events} sentOffIds={sentOffIds} side="user" eventTeam={isHome?"home":"away"} currentMinute={currentMinute}/>
            <LiveLineupPanel team={oppTeam} formation={initialOppFormation} playerIds={oppLineup.filter(Boolean)} players={liveOppPlayers} events={events} sentOffIds={oppSentOffIds} side="opp" eventTeam={isHome?"away":"home"} currentMinute={currentMinute}/>
          </div>
        )}
        {tab === "tacticas" && (
          <div style={{ padding: 12 }}>
            <div style={{ fontSize: 11, color: "#f59e0b", background: "#f59e0b11", border: "1px solid #f59e0b33", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
              Los cambios se aplican al siguiente tramo simulado.
            </div>
            <TacticsInMatch tactics={tactics} setTactics={setTactics} />
          </div>
        )}
      </div>
      </SwipeTabs>

      {/* Controles */}
      <div style={{ padding: 12, background: "#161a24", borderTop: "1px solid rgba(255,255,255,.08)", flexShrink: 0 }}>
        {!finished ? (
          <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <button onClick={togglePlay} className={playing?"btn-ghost":"btn-gold"} disabled={!!pendingInjury} style={{padding:14,borderRadius:9,fontSize:14,opacity:pendingInjury?.65:1}}>{playing?"Pausa":"Play"}</button>
            <button onClick={manualAdvance} className="btn-ghost" style={{padding:14,borderRadius:9,fontSize:14}}>Avance manual</button>
          </div>
          <div style={{fontSize:9,color:pauseEvent?"#c9a84c":"#6b7280",textAlign:"center",lineHeight:1.4,marginTop:7}}>{pauseEvent?`Partido detenido en el ${currentMinute}'. Pulsa Play para reanudar o Avance manual para continuar paso a paso.`:"1 segundo real = 1 minuto de partido. Se detiene en goles, penaltis, tarjetas, lesiones y decisiones."}</div>
          </>
        ) : (
          <>
            <div style={{ background: "#1a1f2e", borderRadius: 8, padding: 12, marginBottom: 10, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#c9a84c", fontWeight: 600, marginBottom: 4 }}>PARTIDO FINALIZADO</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#e8eaf0" }}>{leftGoals} - {rightGoals}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                {(isHome ? score.home > score.away : score.away > score.home)
                  ? <span style={{ color: "#22c55e" }}>🏆 Victoria</span>
                  : score.home === score.away
                    ? <span style={{ color: "#f59e0b" }}>🤝 Empate</span>
                    : <span style={{ color: "#ef4444" }}>❌ Derrota</span>}
              </div>
            </div>
            <button onClick={endMatch} style={{ width: "100%", background: "#c9a84c", color: "#1a1200", border: "none", padding: 13, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Continuar a la siguiente jornada →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Mini vista de tácticas dentro del partido (sin setTactics — sólo lectura)
function TacticsInMatch({ tactics, setTactics }) {
  const fields = [
    ["mentalidad", "Mentalidad", [["defensiva","Defensiva"],["equilibrada","Equilibrada"],["ofensiva","Ofensiva"]]],
    ["presion",    "Presión",    [["baja","Baja"],["media","Media"],["alta","Alta"]]],
    ["ritmo",      "Ritmo",      [["lento","Lento"],["normal","Normal"],["rapido","Rápido"]]],
    ["estilo",     "Estilo",     [["directo","Directo"],["posesion","Posesión"],["bandas","Bandas"],["contraataque","Contraataque"]]],
    ["riesgo",     "Riesgo",     [["conservador","Conservador"],["normal","Normal"],["agresivo","Agresivo"]]],
  ];
  const mod = tacticModifiers(tactics);
  return (
    <div>
      {fields.map(([field, label, options]) => (
        <div key={field} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 6 }}>{label.toUpperCase()}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {options.map(([val, disp]) => {
              const active = tactics[field] === val;
              return (
                <button key={val} onClick={() => setTactics(t => ({ ...t, [field]: val }))}
                  style={{ background: active ? "#c9a84c" : "#1e2330", color: active ? "#1a1200" : "#9aa0b4",
                    border: `1px solid ${active ? "#c9a84c" : "rgba(255,255,255,.08)"}`, padding: "7px 12px",
                    borderRadius: 7, fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer" }}>
                  {disp}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        {[["Ataque", mod.atkBonus,"#22c55e","#ef4444"],["Defensa",mod.defBonus,"#22c55e","#ef4444"],["Cansancio/tr",mod.fatigueExtra,"#ef4444","#22c55e"]].map(([l,v,pc,nc])=>(
          <div key={l} style={{ flex:1, background:"#0d0f14", borderRadius:8, padding:"8px 6px", textAlign:"center" }}>
            <div style={{ fontSize:10, color:"#6b7280" }}>{l}</div>
            <div style={{ fontSize:16, fontWeight:700, color: v>0?pc:v<0?nc:"#6b7280" }}>{v>0?"+":""}{Math.round(v*10)/10}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RESUMEN POST-PARTIDO ────────────────────────────────────────────────────

function MatchSummaryScreen({ summary, onContinue }) {
  const { userTeam, oppTeam, isHome, userGoals, oppGoals, matchday,
          events, players, opponentPlayers=[], participation={}, jornadaResults, newStandings, teamId, income } = summary;

  const won  = userGoals > oppGoals;
  const drew = userGoals === oppGoals;
  const lost = userGoals < oppGoals;

  const resultColor = won ? "#22c55e" : drew ? "#f59e0b" : "#ef4444";
  const resultText  = won ? "VICTORIA" : drew ? "EMPATE" : "DERROTA";
  const resultEmoji = won ? "🏆" : drew ? "🤝" : "❌";

  // Goleadores del equipo del usuario
  const userEventTeam=isHome?"home":"away";
  const opponentEventTeam=isHome?"away":"home";
  const goalEvents = events.filter(e => (e.type === "GOAL" || e.type === "PENALTY") && e.team === userEventTeam);
  const scorerIds  = goalEvents.map(e => e.playerId).filter(Boolean);
  const scorerMap  = {};
  scorerIds.forEach(id => { scorerMap[id] = (scorerMap[id] || 0) + 1; });
  const scorers = Object.entries(scorerMap).map(([id, goals]) => ({
    player: players.find(p => p.id === id),
    goals,
    events: goalEvents.filter(e => e.playerId === id),
  })).filter(s => s.player);

  // Goles del rival — extraer nombre del jugador desde playerId (si lo tenemos) o de la descripción
  const oppGoalEvents = events.filter(e => (e.type === "GOAL" || e.type === "PENALTY") && e.team === opponentEventTeam);
  const extractOppName = (e) => {
    // Buscar en el roster real del rival si tenemos playerId
    if (e.playerId) {
      const oppSquad = REAL_SQUADS[oppTeam?.id] ?? [];
      const found = oppSquad.find(p => p.id === e.playerId);
      if (found) return found.name;
    }
    // Fallback: extraer nombre de la descripción (texto entre "GOL — " y el verbo)
    const m = e.description?.match(/GOL\s*(?:VISITANTE)?\s*[—-]\s*([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ'.]*(?:\s[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ'.]*){0,2})/);
    return m ? m[1] : "Jugador rival";
  };
  const oppScorerMap = {};
  oppGoalEvents.forEach(e => {
    const name = extractOppName(e);
    if (!oppScorerMap[name]) oppScorerMap[name] = { name, goals: 0, mins: [] };
    oppScorerMap[name].goals++;
    oppScorerMap[name].mins.push(e.minute + "'");
  });
  const oppScorers = Object.values(oppScorerMap);

  // Tarjetas del equipo del usuario
  const yellows  = events.filter(e => e.type === "YELLOW" && e.team === "user");
  const reds     = events.filter(e => e.type === "RED"    && e.team === "user");
  const injuries = events.filter(e => e.type === "INJURY" && e.team === "user");

  // MVP global: evalúa a todos los participantes de ambos equipos con la misma escala.
  const userStarterIds=participation.starters??[];
  const opponentStarterIds=participation.opponentStarters?.length?participation.opponentStarters:buildStartingEleven(opponentPlayers,participation.opponentFormation??"4-3-3");
  const userKnown=new Set(players.map(player=>player.id));const opponentKnown=new Set(opponentPlayers.map(player=>player.id));
  const userParticipantIds=[...new Set([...userStarterIds,...(participation.finishers??[]),...events.flatMap(event=>[event.playerId,event.outPlayerId]).filter(id=>userKnown.has(id))])];
  const opponentParticipantIds=[...new Set([...opponentStarterIds,...(participation.opponentFinishers??[]),...events.flatMap(event=>[event.playerId,event.outPlayerId]).filter(id=>opponentKnown.has(id))])];
  const matchRatings=calculateMatchRatings({events,teams:[
    {teamId:userTeam?.id,teamName:userTeam?.name,players,starterIds:userStarterIds,participantIds:userParticipantIds,goalsFor:userGoals,goalsAgainst:oppGoals},
    {teamId:oppTeam?.id,teamName:oppTeam?.name,players:opponentPlayers,starterIds:opponentStarterIds,participantIds:opponentParticipantIds,goalsFor:oppGoals,goalsAgainst:userGoals},
  ]});
  const mvp=matchRatings[0]??null;

  // Clasificación nueva: posición del equipo
  const sorted   = [...newStandings].sort((a,b) => b.points - a.points || b.goalDifference - a.goalDifference);
  const userPos  = sorted.findIndex(s => s.teamId === teamId) + 1;
  const userSt   = newStandings.find(s => s.teamId === teamId);

  // Jugadores con aviso para próximo partido
  const nextWarnings = players.filter(p => p.suspended || (p.injured && p.injuryGames > 0) || p.yellowCards >= 4);

  // Resultados de la jornada (todos los partidos)
  const getTeam = (id) => TEAMS.find(t => t.id === id);

  return (
    <div style={{ flex:1, overflowY:"auto", padding:14 }}>

      {/* Cabecera resultado */}
      <div style={{ background:`${resultColor}18`, border:`1px solid ${resultColor}44`, borderRadius:12, padding:18, marginBottom:14, textAlign:"center" }}>
        <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:6 }}>
          JORNADA {matchday} · {isHome ? "LOCAL" : "VISITANTE"}
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:16, marginBottom:10 }}>
          <div style={{ flex:1, textAlign:"right" }}>
            <TeamCrest team={isHome?userTeam:oppTeam} size={38} style={{marginLeft:"auto",marginBottom:3}}/>
            <div style={{ fontSize:15, fontWeight:700, color: isHome ? "#c9a84c" : "#e8eaf0" }}>{isHome ? userTeam?.short : oppTeam?.short}</div>
          </div>
          <div style={{ background:"#0d0f14", padding:"10px 20px", borderRadius:10, border:`1px solid ${resultColor}55` }}>
            <div style={{ fontSize:32, fontWeight:700, letterSpacing:5, color:"#e8eaf0" }}>
              {isHome ? userGoals : oppGoals} - {isHome ? oppGoals : userGoals}
            </div>
          </div>
          <div style={{ flex:1, textAlign:"left" }}>
            <TeamCrest team={!isHome?userTeam:oppTeam} size={38} style={{marginRight:"auto",marginBottom:3}}/>
            <div style={{ fontSize:15, fontWeight:700, color: !isHome ? "#c9a84c" : "#e8eaf0" }}>{!isHome ? userTeam?.short : oppTeam?.short}</div>
          </div>
        </div>
        <div style={{ fontSize:22, fontWeight:800, color:resultColor, letterSpacing:2 }}>
          {resultEmoji} {resultText}
        </div>
        {/* Posición en liga */}
        <div style={{ marginTop:10, display:"inline-flex", alignItems:"center", gap:10, background:"rgba(0,0,0,.3)", borderRadius:8, padding:"6px 14px" }}>
          <span style={{ fontSize:12, color:"#6b7280" }}>Posición en liga:</span>
          <span style={{ fontSize:18, fontWeight:700, color:"#c9a84c" }}>{userPos}º</span>
          <span style={{ fontSize:11, color:"#6b7280" }}>{userSt?.points} pts</span>
        </div>
      </div>

      {/* Ingresos de la jornada */}
      {income && (
        <div style={{ background:"#161a24", border:"1px solid rgba(34,197,94,.2)", borderRadius:10, padding:14, marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px" }}>💰 INGRESOS DE LA JORNADA</div>
            <div style={{ fontSize:18, fontWeight:800, color:"#22c55e" }}>+€{income.total}K</div>
          </div>
          {income.isHome ? (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#9aa0b4", marginBottom:8 }}>
                <span>👥 {income.matchAttendance?.toLocaleString()} espectadores</span>
                <span>{Math.round((income.occupancy??0)*100)}% del aforo</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {[["🎟️ Taquilla", income.gateRevenue], ["🎫 Socios", income.memberIncomePerHomeMatch],
                  ["🛍️ Tienda", income.shopIncome], ["📺 Publicidad", income.adIncome]].map(([l,v])=>(
                  <div key={l} style={{ background:"#0d0f14", borderRadius:6, padding:"6px 8px", display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:10, color:"#6b7280" }}>{l}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:"#e8eaf0" }}>€{v}K</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              <div style={{ background:"#0d0f14", borderRadius:6, padding:"6px 8px", display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:10, color:"#6b7280" }}>🛍️ Tienda</span>
                <span style={{ fontSize:11, fontWeight:700, color:"#e8eaf0" }}>€{income.shopIncome}K</span>
              </div>
              <div style={{ background:"#0d0f14", borderRadius:6, padding:"6px 8px", display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:10, color:"#6b7280" }}>📺 Publicidad</span>
                <span style={{ fontSize:11, fontWeight:700, color:"#e8eaf0" }}>€{income.adIncome}K</span>
              </div>
              <div style={{ fontSize:10, color:"#4b5563", gridColumn:"1 / -1", marginTop:2 }}>Sin taquilla ni socios — partido a domicilio.</div>
            </div>
          )}
        </div>
      )}

      {/* Goleadores */}
      {(scorers.length > 0 || oppGoalEvents.length > 0) && (
        <div style={{ background:"#161a24", borderRadius:10, padding:14, marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:10 }}>GOLES DEL PARTIDO</div>
          {scorers.map(({player, goals, events: gEvs}) => (
            <div key={player.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <Initials name={player.name} size={32} rarity={player.rarity} borderRadius={6}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#e8eaf0" }}>{player.name}</div>
                <div style={{ fontSize:11, color:"#6b7280" }}>{gEvs.map(e=>e.minute+"'").join(", ")}</div>
              </div>
              <div style={{ display:"flex", gap:3 }}>
                {Array(goals).fill(0).map((_,i) => <span key={i} style={{ fontSize:16 }}>⚽</span>)}
              </div>
            </div>
          ))}
          {oppScorers.map(({name, goals, mins}, i) => (
            <div key={name+i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, opacity:.8 }}>
              <div style={{ width:32, height:32, borderRadius:6, background:"rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>👤</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color:"#e8eaf0", fontWeight:600 }}>{name}</div>
                <div style={{ fontSize:11, color:"#6b7280" }}>{oppTeam?.name} · {mins.join(", ")}</div>
              </div>
              <div style={{ display:"flex", gap:3 }}>
                {Array(goals).fill(0).map((_,j) => <span key={j} style={{ fontSize:16 }}>⚽</span>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MVP */}
      {mvp && (
        <div style={{ background:"linear-gradient(135deg,#1a1700,#2a2200)", border:"1px solid #c9a84c44", borderRadius:10, padding:14, marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#c9a84c", fontWeight:600, letterSpacing:".5px", marginBottom:10 }}>⭐ MEJOR JUGADOR DEL PARTIDO</div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <Initials name={mvp.name} size={48} rarity={mvp.rarity} borderRadius={10}/>
            <div style={{flex:1}}>
              <div style={{ fontSize:15, fontWeight:700, color:"#e8eaf0" }}>{mvp.name}</div>
              <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>{mvp.pos} · {mvp.teamName} · {mvp.minutes} min</div>
              <div style={{ fontSize:11, color:"#c9a84c", marginTop:4, fontWeight:600 }}>
                {mvp.contributions.length?mvp.contributions.join(" · "):"Rendimiento más completo del encuentro"}
              </div>
            </div>
            <div style={{textAlign:"center",background:"rgba(201,168,76,.12)",borderRadius:9,padding:"7px 10px"}}><div style={{fontSize:22,color:"#c9a84c",fontWeight:900}}>{mvp.rating}</div><div style={{fontSize:7,color:"#8a7a49"}}>NOTA</div></div>
          </div>
        </div>
      )}

      {/* Incidencias */}
      {(yellows.length > 0 || reds.length > 0 || injuries.length > 0) && (
        <div style={{ background:"#161a24", borderRadius:10, padding:14, marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:10 }}>INCIDENCIAS</div>
          {yellows.map((e,i) => {
            const pl = players.find(p=>p.id===e.playerId);
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:16 }}>🟡</span>
                <span style={{ fontSize:12, color:"#e8eaf0" }}>{pl?.name ?? "Jugador"}</span>
                <span style={{ fontSize:11, color:"#6b7280", marginLeft:"auto" }}>min {e.minute}'</span>
              </div>
            );
          })}
          {reds.map((e,i) => {
            const pl = players.find(p=>p.id===e.playerId);
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:16 }}>🟥</span>
                <span style={{ fontSize:12, color:"#ef4444", fontWeight:600 }}>{pl?.name ?? "Jugador"} — Expulsado</span>
                <span style={{ fontSize:11, color:"#6b7280", marginLeft:"auto" }}>min {e.minute}'</span>
              </div>
            );
          })}
          {injuries.map((e,i) => {
            const pl = players.find(p=>p.id===e.playerId);
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:16 }}>🚑</span>
                <span style={{ fontSize:12, color:"#f97316" }}>{pl?.name ?? "Jugador"} — Lesionado</span>
                <span style={{ fontSize:11, color:"#6b7280", marginLeft:"auto" }}>min {e.minute}'</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Avisos próximo partido */}
      {nextWarnings.length > 0 && (
        <div style={{ background:"#1a1500", border:"1px solid #f59e0b33", borderRadius:10, padding:14, marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#f59e0b", fontWeight:600, letterSpacing:".5px", marginBottom:10 }}>⚠️ AVISOS PARA EL PRÓXIMO PARTIDO</div>
          {nextWarnings.map(p => (
            <div key={p.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <Initials name={p.name} size={28} rarity={p.rarity} borderRadius={5}/>
              <span style={{ fontSize:12, color:"#e8eaf0", flex:1 }}>{p.name}</span>
              {p.suspended && <span style={{ fontSize:10, color:"#f59e0b", fontWeight:700, background:"#f59e0b22", padding:"2px 6px", borderRadius:4 }}>SANCIONADO</span>}
              {p.injured   && <span style={{ fontSize:10, color:"#ef4444", fontWeight:700, background:"#ef444422", padding:"2px 6px", borderRadius:4 }}>LESIÓN {p.injuryGames}J</span>}
              {!p.suspended && !p.injured && p.yellowCards >= 4 && <span style={{ fontSize:10, color:"#fbbf24", fontWeight:700, background:"#fbbf2422", padding:"2px 6px", borderRadius:4 }}>4 AMARILLAS</span>}
            </div>
          ))}
        </div>
      )}

      {/* Resultados de la jornada */}
      <div style={{ background:"#161a24", borderRadius:10, padding:14, marginBottom:14 }}>
        <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:10 }}>
          RESULTADOS JORNADA {matchday}
        </div>
        {jornadaResults.map((f, i) => {
          const ht = getTeam(f.homeTeamId);
          const at = getTeam(f.awayTeamId);
          const isUserMatch = f.homeTeamId === teamId || f.awayTeamId === teamId;
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,.04)", background: isUserMatch?"rgba(201,168,76,.06)":"transparent" }}>
              <div style={{ flex:1, textAlign:"right", fontSize:12, fontWeight: f.homeTeamId===teamId?700:400, color: f.homeTeamId===teamId?"#c9a84c":"#e8eaf0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {ht?.short}
              </div>
              <div style={{ background:"#0d0f14", padding:"3px 10px", borderRadius:6, fontSize:13, fontWeight:700, color:"#e8eaf0", minWidth:52, textAlign:"center" }}>
                {f.homeGoals} - {f.awayGoals}
              </div>
              <div style={{ flex:1, fontSize:12, fontWeight: f.awayTeamId===teamId?700:400, color: f.awayTeamId===teamId?"#c9a84c":"#e8eaf0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {at?.short}
              </div>
            </div>
          );
        })}
      </div>

      {/* Botón continuar */}
      <button onClick={onContinue} className="btn-gold"
        style={{ width:"100%", padding:14, borderRadius:9, fontSize:15, marginBottom:4 }}>
        {matchday >= 38 ? "Ver resumen de temporada →" : `Continuar a Jornada ${matchday + 1} →`}
      </button>
    </div>
  );
}

// ─── FIN DE TEMPORADA ────────────────────────────────────────────────────────

function SeasonEndScreen({ seasonSummary, onNewSeason }) {
  const { standings, teamId, season, history, players, legacy } = seasonSummary;

  const sorted = [...standings].sort((a,b) => b.points-a.points || b.goalDifference-a.goalDifference || b.goalsFor-a.goalsFor);
  const userPos  = sorted.findIndex(s => s.teamId === teamId) + 1;
  const userSt   = standings.find(s => s.teamId === teamId);
  const getTeam  = (id) => TEAMS.find(t => t.id === id);
  const userTeam = getTeam(teamId);

  // Clasificación final con zonas
  const champion  = sorted[0];
  const relegated = sorted.slice(17);
  const promoted  = []; // para futuro
  const isChampion  = champion.teamId === teamId;
  const isRelegated = relegated.some(s => s.teamId === teamId);
  const isEurope    = userPos <= 6 && userPos > 4;
  const isChampions = userPos <= 4 && !isChampion;

  const resultBanner = isChampion
    ? { text:"¡CAMPEÓN DE LIGA!", color:"#c9a84c", bg:"rgba(201,168,76,.15)", emoji:"🏆" }
    : isEurope
    ? { text:"Clasificado para Europa", color:"#22c55e", bg:"rgba(34,197,94,.12)", emoji:"🌍" }
    : isChampions
    ? { text:"Clasificado para Champions", color:"#c9a84c", bg:"rgba(201,168,76,.1)", emoji:"⭐" }
    : isRelegated
    ? { text:"Descenso a Segunda División", color:"#ef4444", bg:"rgba(239,68,68,.12)", emoji:"📉" }
    : { text:"Temporada completada", color:"#e8eaf0", bg:"rgba(255,255,255,.05)", emoji:"✅" };

  // Top jugadores por morale final
  const topPlayers = [...players].sort((a,b)=>b.morale-a.morale).slice(0,3);

  return (
    <div style={{ flex:1, overflowY:"auto", padding:16 }}>

      {/* Banner resultado */}
      <div style={{ background:resultBanner.bg, border:`1px solid ${resultBanner.color}44`, borderRadius:14, padding:20, marginBottom:16, textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:8 }}>{resultBanner.emoji}</div>
        <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>
          TEMPORADA {season} — FINALIZADA
        </div>
        <div style={{ fontSize:22, fontWeight:800, color:resultBanner.color, marginBottom:10 }}>
          {resultBanner.text}
        </div>
        <div style={{ display:"inline-flex", alignItems:"center", gap:16, background:"rgba(0,0,0,.3)", borderRadius:10, padding:"10px 20px" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:28, fontWeight:800, color:resultBanner.color }}>{userPos}º</div>
            <div style={{ fontSize:10, color:"#6b7280" }}>POSICIÓN</div>
          </div>
          <div style={{ width:1, height:32, background:"rgba(255,255,255,.1)" }}/>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:28, fontWeight:800, color:"#e8eaf0" }}>{userSt?.points}</div>
            <div style={{ fontSize:10, color:"#6b7280" }}>PUNTOS</div>
          </div>
          <div style={{ width:1, height:32, background:"rgba(255,255,255,.1)" }}/>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:800, color:"#22c55e" }}>{userSt?.goalsFor}</div>
            <div style={{ fontSize:10, color:"#6b7280" }}>GF</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:800, color:"#ef4444" }}>{userSt?.goalsAgainst}</div>
            <div style={{ fontSize:10, color:"#6b7280" }}>GC</div>
          </div>
        </div>
      </div>

      {legacy&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}><div style={{background:"#161a24",border:"1px solid rgba(201,168,76,.2)",borderRadius:9,padding:12}}><div style={{fontSize:9,color:"#6b7280"}}>🏆 PRESTIGIO DEL CLUB</div><div style={{fontSize:24,color:getPrestigeLevel(legacy.clubPrestige).color,fontWeight:900,marginTop:4}}>{Math.round(legacy.clubPrestige)}<span style={{fontSize:9,color:"#6b7280"}}>/100</span></div><div style={{fontSize:9,color:getPrestigeLevel(legacy.clubPrestige).color}}>{getPrestigeLevel(legacy.clubPrestige).label}</div></div><div style={{background:"#161a24",border:"1px solid rgba(167,139,250,.2)",borderRadius:9,padding:12}}><div style={{fontSize:9,color:"#6b7280"}}>⭐ PRESTIGIO ENTRENADOR</div><div style={{fontSize:24,color:getPrestigeLevel(legacy.manager.prestige,true).color,fontWeight:900,marginTop:4}}>{Math.round(legacy.manager.prestige)}<span style={{fontSize:9,color:"#6b7280"}}>/100</span></div><div style={{fontSize:9,color:getPrestigeLevel(legacy.manager.prestige,true).color}}>{getPrestigeLevel(legacy.manager.prestige,true).label}</div></div></div>}

      {/* Clasificación final top 5 + posición usuario */}
      <div style={{ background:"#161a24", borderRadius:10, padding:14, marginBottom:12 }}>
        <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:10 }}>CLASIFICACIÓN FINAL</div>
        {sorted.slice(0,5).map((s,i)=>{
          const t=getTeam(s.teamId); const isUser=s.teamId===teamId;
          const posColor=i===0?"#c9a84c":i<4?"#e8c96a":i<6?"#22c55e":"#6b7280";
          return (
            <div key={s.teamId} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,.04)", background:isUser?"rgba(201,168,76,.06)":"transparent" }}>
              <span style={{ fontSize:13, fontWeight:700, color:posColor, width:20, textAlign:"center" }}>{i+1}</span>
              <div style={{ width:22,height:22,borderRadius:"50%",background:`${t?.color}22`,border:`1px solid ${t?.color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:t?.color }}>
                {t?.short?.slice(0,3)}
              </div>
              <div style={{ flex:1, fontSize:12, fontWeight:isUser?700:400, color:isUser?"#c9a84c":"#e8eaf0" }}>{t?.name}</div>
              <div style={{ fontSize:13, fontWeight:700, color:"#e8eaf0" }}>{s.points} pts</div>
              {i===0 && <span style={{ fontSize:14 }}>🏆</span>}
            </div>
          );
        })}
        {userPos > 5 && (
          <>
            <div style={{ textAlign:"center", padding:"4px 0", color:"#4b5563", fontSize:11 }}>···</div>
            {sorted.filter(s=>s.teamId===teamId).map(s=>{
              const t=getTeam(s.teamId);
              return (
                <div key={s.teamId} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", background:"rgba(201,168,76,.06)" }}>
                  <span style={{ fontSize:13, fontWeight:700, color:resultBanner.color, width:20, textAlign:"center" }}>{userPos}</span>
                  <div style={{ width:22,height:22,borderRadius:"50%",background:`${t?.color}22`,border:`1px solid ${t?.color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:t?.color }}>
                    {t?.short?.slice(0,3)}
                  </div>
                  <div style={{ flex:1, fontSize:12, fontWeight:700, color:"#c9a84c" }}>{t?.name} ★</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#e8eaf0" }}>{s.points} pts</div>
                </div>
              );
            })}
          </>
        )}
        {/* Descensos */}
        {relegated.length > 0 && (
          <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid rgba(239,68,68,.2)" }}>
            <div style={{ fontSize:10, color:"#ef4444", fontWeight:600, marginBottom:6 }}>📉 DESCIENDEN</div>
            {relegated.map(s=>{
              const t=getTeam(s.teamId); const isUser=s.teamId===teamId;
              return (
                <div key={s.teamId} style={{ display:"flex", gap:8, alignItems:"center", padding:"4px 0" }}>
                  <div style={{ width:16,height:16,borderRadius:"50%",background:`${t?.color}22`,border:`1px solid ${t?.color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700,color:t?.color }}>
                    {t?.short?.slice(0,3)}
                  </div>
                  <span style={{ fontSize:11, color:isUser?"#ef4444":"#6b7280", fontWeight:isUser?700:400 }}>{t?.name}</span>
                  <span style={{ fontSize:11, color:"#4b5563", marginLeft:"auto" }}>{s.points} pts</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de temporadas */}
      {history && history.length > 0 && (
        <div style={{ background:"#161a24", borderRadius:10, padding:14, marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:10 }}>HISTORIAL DEL CLUB</div>
          {history.map((h,i)=>{
            const col = h.pos<=4?"#c9a84c":h.pos<=6?"#22c55e":h.pos>=18?"#ef4444":"#9aa0b4";
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                <div style={{ fontSize:11, color:"#4b5563", width:60 }}>T. {h.season}</div>
                <div style={{ flex:1, fontSize:12, color:"#9aa0b4" }}>{h.pts} pts · {h.gf}-{h.ga}</div>
                <div style={{ fontSize:13, fontWeight:700, color:col }}>{h.pos}º</div>
                {h.pos===1&&<span style={{ fontSize:12 }}>🏆</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Mejores jugadores de la temporada */}
      <div style={{ background:"#161a24", borderRadius:10, padding:14, marginBottom:16 }}>
        <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:".5px", marginBottom:10 }}>PLANTILLA — ESTADO FINAL</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[
            ["Jugadores disponibles", players.filter(p=>!p.injured&&!p.suspended).length, "#22c55e"],
            ["Lesionados", players.filter(p=>p.injured).length, "#ef4444"],
            ["Sancionados", players.filter(p=>p.suspended).length, "#f59e0b"],
            ["Moral media", Math.round(players.reduce((s,p)=>s+p.morale,0)/players.length), "#c9a84c"],
          ].map(([l,v,c])=>(
            <div key={l} style={{ background:"#0d0f14", borderRadius:8, padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:"#6b7280", marginBottom:3 }}>{l}</div>
              <div style={{ fontSize:20, fontWeight:700, color:c }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onNewSeason} className="btn-gold"
        style={{ width:"100%", padding:15, borderRadius:10, fontSize:16, marginBottom:4 }}>
        🚀 Iniciar Temporada {parseInt(season)+1}/{parseInt(season)+2}
      </button>
    </div>
  );
}

const SAVE_INDEX_KEY = "legacy_manager_saves_index"; // lista de partidas: [{id, name, teamId, matchday, season, updatedAt}]
const saveSlotKey = (id) => `legacy_manager_save_${id}`;
const DATA_VERSION = "1.0.4";

function getSavesIndex() {
  try {
    const raw = localStorage.getItem(SAVE_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function setSavesIndex(list) {
  try { localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(list)); } catch (e) {}
}

function collectDataPlayers() {
  return TEAMS.flatMap(team => (REAL_SQUADS[team.id] ?? []).map(player => ({ player, team })));
}

const BUILT_IN_DATA_PLAYER_IDS = new Set(collectDataPlayers().map(({ player }) => player?.id).filter(Boolean));

function collectSavePlayerIds(game) {
  const ids = new Set();
  (game.players ?? []).forEach(player => player?.id && ids.add(player.id));
  (game.freeAgents ?? []).forEach(player => player?.id && ids.add(player.id));
  (game.youth?.players ?? []).forEach(player => player?.id && ids.add(player.id));
  (game.transfers ?? []).forEach(item => item.player?.id && ids.add(item.player.id));
  (game.transferMarket?.offers ?? []).forEach(item => item.playerId && ids.add(item.playerId));
  (game.transferMarket?.incomingOffers ?? []).forEach(item => item.playerId && ids.add(item.playerId));
  return ids;
}

function normalizeFreeAgentFromData(player, team, game) {
  const season = game?.season ?? "2025";
  const matchday = game?.matchday ?? 1;
  return normalizeMedicalPlayer(enrichPlayerProfile(ensurePlayerLifecycle({
    ...player,
    originalTeamId: team?.id ?? player.originalTeamId ?? null,
    originalTeamName: team?.name ?? player.originalTeamName ?? null,
    marketStatus: null,
    fatigue: Math.max(0, Math.min(15, player.fatigue ?? 8)),
    morale: Math.max(55, player.morale ?? 70),
    injured: false,
    injuryGames: 0,
    suspended: false,
    suspGames: 0,
    yellowCards: 0,
    addedAsFreeAgent: true,
  }, season, matchday), season));
}

function migrateNewDataPlayersToSave(game, dataVersion = DATA_VERSION) {
  const previousVersion = game.saveDataVersion ?? "1.0.0";
  const currentDataRows = collectDataPlayers();
  const currentDataIds = currentDataRows.map(({ player }) => player?.id).filter(Boolean);
  const knownIds = collectSavePlayerIds(game);
  const previousDataIds = Array.isArray(game.dataPlayerIds) ? new Set(game.dataPlayerIds ?? []) : BUILT_IN_DATA_PLAYER_IDS;
  const alreadyLogged = new Set((game.dataMigrations ?? []).flatMap(log => (log.addedPlayers ?? []).map(player => player.id)));
  const hasBaselineMigration = (game.dataMigrations ?? []).some(log => log.type === "baseline");
  const additions = [];
  currentDataRows.forEach(({ player, team }) => {
    if (!player?.id || knownIds.has(player.id) || alreadyLogged.has(player.id)) return;
    const isNewSinceSnapshot = !previousDataIds.has(player.id);
    const repairsBadBaseline = hasBaselineMigration && !BUILT_IN_DATA_PLAYER_IDS.has(player.id);
    if (!isNewSinceSnapshot && !repairsBadBaseline) return;
    additions.push(normalizeFreeAgentFromData(player, team, game));
    knownIds.add(player.id);
  });
  const uniqueFreeAgents = [...(game.freeAgents ?? []), ...additions]
    .filter((player, index, array) => player?.id && array.findIndex(item => item.id === player.id) === index);
  const migrationLog = additions.length ? {
    id: `data-migration-${dataVersion}-${Date.now()}`,
    type: "new-free-agents",
    fromVersion: previousVersion,
    toVersion: dataVersion,
    date: new Date().toISOString(),
    addedPlayers: additions.map(player => ({ id: player.id, name: player.name, originalTeamId: player.originalTeamId ?? null })),
    count: additions.length,
  } : null;
  const baselineLog = !Array.isArray(game.dataPlayerIds) ? {
    id: `data-baseline-${dataVersion}-${Date.now()}`,
    type: "baseline",
    fromVersion: previousVersion,
    toVersion: dataVersion,
    date: new Date().toISOString(),
    count: previousDataIds.size,
    addedPlayers: [],
  } : null;
  const migrationNews = additions.length ? [{
    id: `news-data-migration-${dataVersion}-${Date.now()}`,
    type: "transfer",
    importance: "medium",
    title: "Nuevos jugadores se incorporan al mercado",
    summary: `Se han añadido ${additions.length} jugador${additions.length===1?"":"es"} como agente${additions.length===1?"":"s"} libre${additions.length===1?"":"s"} en esta partida.`,
    season: String(game.season ?? "2025"),
    matchday: game.matchday ?? 1,
    createdAt: Date.now(),
    fingerprint: `data-migration:${dataVersion}:${additions.map(player=>player.id).join(",")}`,
    metadata: { userClub: true, migration: true },
  }] : [];
  return {
    ...game,
    dataVersion,
    saveDataVersion: dataVersion,
    dataPlayerIds: currentDataIds,
    freeAgents: uniqueFreeAgents,
    dataMigrations: [migrationLog, baselineLog, ...(game.dataMigrations ?? [])].filter(Boolean),
    news: migrationNews.length ? mergeNews(game.news ?? [], migrationNews) : (game.news ?? []),
  };
}

function detachFreeAgentsFromRealSquads(game) {
  const freeAgentIds = new Set((game.freeAgents ?? []).map(player => player.id));
  if (!freeAgentIds.size) return;
  Object.keys(REAL_SQUADS).forEach(teamId => {
    REAL_SQUADS[teamId] = (REAL_SQUADS[teamId] ?? []).filter(player => !freeAgentIds.has(player.id));
  });
}

export default function App({ externalData }) {
  useGlobalStyles();
  const currentDataVersion = externalData?.dataVersion ?? DATA_VERSION;
  if (externalData?.players) Object.assign(REAL_SQUADS, externalData.players);
  if (externalData?.teams) {
    externalData.teams.forEach(et => {
      const idx = TEAMS.findIndex(t => t.id === et.id);
      if (idx !== -1) Object.assign(TEAMS[idx], et);
    });
  }
  const [screen, setScreen]       = useState("menu");
  const [game, setGame]           = useState(null);
  const [activeSaveId, setActiveSaveId] = useState(null); // id de la partida actualmente cargada
  const [lineup, setLineup]       = useState(emptyLineup());
  const [subs, setSubs]           = useState(emptyBench());
  const [formation, setFormation] = useState("4-3-3");
  const [tactics, setTactics]     = useState(DEFAULT_TACTICS);
  const [savesIndex, setSavesIndexState] = useState([]);
  const [pendingCountry, setPendingCountry] = useState(null); // país elegido en "Nueva partida"
  const [pendingLeague, setPendingLeague]   = useState(null); // liga elegida en "Nueva partida"
  const [matchSummary, setMatchSummary]     = useState(null);
  const [seasonSummary, setSeasonSummary]   = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedPlayerTeamId, setSelectedPlayerTeamId] = useState(null);
  const [profileReturnScreen, setProfileReturnScreen] = useState("dashboard");
  const [scoutingFocusId, setScoutingFocusId] = useState(null);

  useEffect(() => {
    setSavesIndexState(getSavesIndex());
  }, []);

  // Auto-guardar alineación, suplentes y formación cuando cambian
  useEffect(() => {
    if (!game || !activeSaveId) return;
    saveGame(game, lineup, formation, subs);
  }, [lineup, formation, subs]);

  const saveGame = useCallback((g, lineupToSave, formationToSave, subsToSave, saveIdOverride) => {
    const targetId = saveIdOverride ?? activeSaveId;
    if (!targetId) return;
    try {
      const toSave = {
        ...g,
        id: targetId,
        updatedAt: new Date().toISOString(),
        _lineup: normalizeSlots(lineupToSave !== undefined ? lineupToSave : lineup, STARTERS_SLOTS),
        _formation: formationToSave !== undefined ? formationToSave : formation,
        _subs: normalizeSlots(subsToSave !== undefined ? subsToSave : subs, BENCH_SLOTS),
      };
      localStorage.setItem(saveSlotKey(targetId), JSON.stringify(toSave));
      // Actualizar el índice con metadatos rápidos para la lista de partidas
      const idx = getSavesIndex();
      const teamData = TEAMS.find(t => t.id === g.teamId);
      const i = idx.findIndex(s => s.id === targetId);
      const entry = {
        id: targetId,
        name: g.name ?? teamData?.name ?? "Partida",
        teamId: g.teamId,
        matchday: g.matchday,
        season: g.season ?? "2025",
        updatedAt: new Date().toISOString(),
        createdAt: i !== -1 ? idx[i].createdAt : new Date().toISOString(),
      };
      if (i !== -1) idx[i] = entry; else idx.push(entry);
      setSavesIndex(idx);
      setSavesIndexState(idx);
    } catch (e) {}
  }, [lineup, formation, subs, activeSaveId]);

  const loadGame = (saveId) => {
    try {
      const saved = localStorage.getItem(saveSlotKey(saveId));
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.players = (parsed.players ?? []).map(player => normalizeMedicalPlayer(enrichPlayerProfile(ensurePlayerLifecycle(player, parsed.season ?? "2025", parsed.matchday ?? 1), parsed.season ?? "2025")));
        parsed.trainingPlan = normalizeTrainingPlan(parsed.trainingPlan);
        let loadedLineup = emptyLineup();
        let loadedFormation = "4-3-3";
        let loadedSubs = emptyBench();
        if (parsed._lineup) {
          loadedLineup = normalizeSlots(parsed._lineup, STARTERS_SLOTS);
          setLineup(loadedLineup);
          delete parsed._lineup;
        }
        if (parsed._formation) {
          loadedFormation = parsed._formation;
          setFormation(loadedFormation);
          delete parsed._formation;
        }
        if (parsed._subs) {
          loadedSubs = normalizeSlots(parsed._subs, BENCH_SLOTS);
          setSubs(loadedSubs);
          delete parsed._subs;
        }
        // Reaplicar fichajes pasados: quitar de REAL_SQUADS los jugadores ya comprados
        // de su equipo de origen (REAL_SQUADS es estático y se resetea al recargar la página)
        (parsed.transfers ?? []).forEach(t => {
          if ((t.type === "buy"||(t.type==="loanIn"&&String(t.season)===String(parsed.season))) && t.fromTeamId && t.fromTeamId !== "agente_libre" && REAL_SQUADS[t.fromTeamId]) {
            REAL_SQUADS[t.fromTeamId] = REAL_SQUADS[t.fromTeamId].filter(p => p.id !== t.player.id);
          }
          if((t.type==="sell"||(t.type==="loanOut"&&String(t.season)===String(parsed.season)))&&t.toTeamId&&REAL_SQUADS[t.toTeamId]&&!REAL_SQUADS[t.toTeamId].some(player=>player.id===t.player.id))REAL_SQUADS[t.toTeamId]=[...REAL_SQUADS[t.toTeamId],t.player];
          if((t.type==="ai"||(t.type==="loan"&&String(t.season)===String(parsed.season)))&&t.fromTeamId&&t.toTeamId&&REAL_SQUADS[t.fromTeamId]&&REAL_SQUADS[t.toTeamId]){REAL_SQUADS[t.fromTeamId]=REAL_SQUADS[t.fromTeamId].filter(player=>player.id!==t.player.id);if(!REAL_SQUADS[t.toTeamId].some(player=>player.id===t.player.id))REAL_SQUADS[t.toTeamId]=[...REAL_SQUADS[t.toTeamId],t.player];}
        });
        setActiveSaveId(saveId);
        const loadedTeam=TEAMS.find(team=>team.id===parsed.teamId);
        let migrated=ensureContractState(ensureScoutingState(ensureYouthState(ensureLegacyState(parsed,loadedTeam),loadedTeam)));
        migrated.youth={...migrated.youth,players:migrated.youth.players.map(player=>normalizeMedicalPlayer(enrichPlayerProfile(ensurePlayerLifecycle(player,parsed.season??"2025",parsed.matchday??1),parsed.season??"2025")))};
        migrated=migrateNewDataPlayersToSave(migrated,currentDataVersion);
        detachFreeAgentsFromRealSquads(migrated);
        migrated=refreshTransferListings(ensureTransferState(bootstrapScouting(migrated,getScoutingPool(migrated))),TEAMS,REAL_SQUADS);
        saveGame(migrated, loadedLineup, loadedFormation, loadedSubs, saveId);
        setGame(migrated);
        if(migrated.seasonTransition==="seasonEnd"){setSeasonSummary({standings:migrated.standings,teamId:migrated.teamId,season:migrated.season,history:migrated.history??[],players:migrated.players,legacy:migrated.legacy,game:migrated});setScreen("seasonEnd");}
        else setScreen(migrated.seasonTransition==="preseason"?"preseason":"dashboard");
      }
    } catch (e) {}
  };

  const deleteSave = (saveId) => {
    try {
      localStorage.removeItem(saveSlotKey(saveId));
      const idx = getSavesIndex().filter(s => s.id !== saveId);
      setSavesIndex(idx);
      setSavesIndexState(idx);
      if (activeSaveId === saveId) {
        setActiveSaveId(null);
        setGame(null);
      }
    } catch (e) {}
  };

  const startNewGame = (team) => {
    const players  = generatePlayers(team.id).map(player => normalizeMedicalPlayer(enrichPlayerProfile(ensurePlayerLifecycle(player, "2025", 1), "2025")));
    const fixtures = generateFixtures();
    const standings = initStandings();
    const newId = `save_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const seeded = ensureYouthState(ensureLegacyState({ id: newId, name: team.name, teamId: team.id, matchday: 1, players, fixtures, standings, season: "2025", dataVersion:currentDataVersion, saveDataVersion:currentDataVersion, dataPlayerIds:collectDataPlayers().map(({player})=>player.id).filter(Boolean), freeAgents:[], dataMigrations:[], history: [], news: [], trainingPlan:normalizeTrainingPlan(DEFAULT_TRAINING_PLAN),
      country: pendingCountry?.id, league: pendingLeague?.id },team),team);
    let g={...seeded,youth:{...seeded.youth,players:seeded.youth.players.map(player=>normalizeMedicalPlayer(enrichPlayerProfile(ensurePlayerLifecycle(player,"2025",1),"2025")))}};
    g=ensureContractState(refreshTransferListings(ensureTransferState(bootstrapScouting(g,getScoutingPool(g))),TEAMS,REAL_SQUADS));
    const firstProspect=[...g.youth.players].sort((a,b)=>b.potential-a.potential)[0];
    if(firstProspect)g.news=generateYouthNews({items:[{title:"La cantera presenta una nueva generación",summary:`${firstProspect.name} encabeza la hornada con un potencial estimado de ${firstProspect.potential}.`,importance:firstProspect.potential>=86?"high":"medium",playerId:firstProspect.id,fingerprint:`academy-intake:2025`}],season:"2025",matchday:1,userTeamId:team.id});
    setActiveSaveId(newId);
    setLineup(emptyLineup());
    setSubs(emptyBench());
    setFormation("4-3-3");
    setTactics(DEFAULT_TACTICS);
    setGame(g);
    saveGame(g, emptyLineup(), "4-3-3", emptyBench(), newId);
    setScreen("dashboard");
  };

// ─── SISTEMA DE INGRESOS DEL CLUB ───────────────────────────────────────────
// Calcula los ingresos generados en una jornada concreta:
// - Taquilla (solo si el partido es en casa): aforo × ocupación × precio entrada
// - Socios: cuota de abonado prorrateada por jornada (solo si es partido en casa)
// - Tienda/merchandising: ligado a fanbase y racha de resultados
// - Publicidad/patrocinio: ingreso fijo prorrateado, sube con la posición en liga
function calculateMatchdayIncome(team, isHome, won, drew, leaguePos, fanLove, clubPrestige = 50) {
  const cap = team.capacity ?? 30000;
  const fan = team.fanbase ?? 3; // 1-5

  // ── Taquilla (solo en casa) ──
  // Ocupación base según tamaño de afición + moral/cariño de la afición (fanLove 0-100) + si ganó el partido anterior
  const baseOccupancy = 0.45 + fan * 0.07; // 0.52 - 0.80
  const formBonus = won ? 0.08 : drew ? 0.02 : -0.05;
  const loveBonus = ((fanLove ?? 70) - 70) * 0.002; // ±0.06 aprox
  const occupancy = Math.max(0.25, Math.min(0.99, baseOccupancy + formBonus + loveBonus));
  const ticketPrice = 18 + fan * 7; // €25-53 aprox según el tamaño del club
  const matchAttendance = isHome ? Math.round(cap * occupancy) : 0;
  const gateRevenue = isHome ? Math.round((matchAttendance * ticketPrice) / 1000) : 0; // en €K

  // ── Socios (abonados) — solo ingresan en partidos de casa, prorrateado ──
  // Se asume que el 55% del aforo son abonados con cuota anual ya pagada
  const seasonMembers = Math.round(cap * 0.55);
  const memberFeeSeason = 180 + fan * 60; // € por socio y temporada
  const memberIncomePerHomeMatch = isHome ? Math.round((seasonMembers * memberFeeSeason) / 19 / 1000) : 0; // 19 partidos en casa, en €K

  // ── Tienda / merchandising — todas las jornadas, sube con fanbase y resultados ──
  const shopBase = 8 + fan * 6; // €K por jornada
  const shopBonus = won ? 1.3 : drew ? 1.0 : 0.8;
  const shopIncome = Math.round(shopBase * shopBonus);

  // ── Publicidad y patrocinios — ingreso fijo por jornada, sube si vas arriba en la tabla ──
  const prestigeSponsorMultiplier = Math.max(.75,Math.min(1.3,1+(clubPrestige-50)*.006));
  const adBase = (10 + fan * 5) * prestigeSponsorMultiplier;
  const posBonus = leaguePos ? Math.max(0, (21 - leaguePos) * 0.4) : 0; // más arriba, más visibilidad
  const adIncome = Math.round(adBase + posBonus);

  const total = gateRevenue + memberIncomePerHomeMatch + shopIncome + adIncome;

  return {
    gateRevenue, memberIncomePerHomeMatch, shopIncome, adIncome, total,
    matchAttendance, occupancy, ticketPrice, isHome,
  };
}

  const handleMatchEnd = (fixtureId, homeGoals, awayGoals, events, livePlayer, participation) => {
    let summaryData = null;
    setGame(prev => {
      const newFixtures = prev.fixtures.map(f =>
        f.id === fixtureId ? { ...f, played: true, homeGoals, awayGoals, events, participation } : f
      );
      const fixture  = prev.fixtures.find(f => f.id === fixtureId);
      const matchday = fixture.matchday;
      const finalFixtures = newFixtures.map(f => {
        if (f.matchday === matchday && !f.played) {
          const ht = TEAMS.find(t => t.id === f.homeTeamId);
          const at = TEAMS.find(t => t.id === f.awayTeamId);
          const res = simAIGame(ht, at);
          return { ...f, played: true, homeGoals: res.homeGoals, awayGoals: res.awayGoals, events: res.events ?? [] };
        }
        return f;
      });
      const newStandings = prev.standings.map(s => ({ ...s }));
      const previousPositions=Object.fromEntries([...prev.standings].sort((a,b)=>b.points-a.points||b.goalDifference-a.goalDifference||b.goalsFor-a.goalsFor).map((row,index)=>[row.teamId,index+1]));
      const alreadyCounted = new Set(prev.fixtures.filter(f => f.played && f.matchday === matchday).map(f => f.id));
      finalFixtures.filter(f => f.matchday === matchday && f.played && !alreadyCounted.has(f.id)).forEach(f => {
        const hi = newStandings.findIndex(s => s.teamId === f.homeTeamId);
        const ai = newStandings.findIndex(s => s.teamId === f.awayTeamId);
        if (hi === -1 || ai === -1) return;
        const hg = f.homeGoals, ag = f.awayGoals;
        newStandings[hi].played++; newStandings[ai].played++;
        newStandings[hi].goalsFor  += hg; newStandings[hi].goalsAgainst += ag;
        newStandings[ai].goalsFor  += ag; newStandings[ai].goalsAgainst += hg;
        newStandings[hi].goalDifference = newStandings[hi].goalsFor - newStandings[hi].goalsAgainst;
        newStandings[ai].goalDifference = newStandings[ai].goalsFor - newStandings[ai].goalsAgainst;
        if (hg > ag)      { newStandings[hi].won++;  newStandings[hi].points += 3; newStandings[ai].lost++; }
        else if (hg < ag) { newStandings[ai].won++;  newStandings[ai].points += 3; newStandings[hi].lost++; }
        else              { newStandings[hi].drawn++; newStandings[ai].drawn++; newStandings[hi].points++; newStandings[ai].points++; }
      });
      const isHome    = fixture.homeTeamId === prev.teamId;
      const currentPositions=Object.fromEntries([...newStandings].sort((a,b)=>b.points-a.points||b.goalDifference-a.goalDifference||b.goalsFor-a.goalsFor).map((row,index)=>[row.teamId,index+1]));
      const standingsMovement=Object.fromEntries(newStandings.map(row=>[row.teamId,(previousPositions[row.teamId]??currentPositions[row.teamId])-currentPositions[row.teamId]]));
      const userGoals = isHome ? homeGoals : awayGoals;
      const oppGoals  = isHome ? awayGoals : homeGoals;
      const won = userGoals > oppGoals; const drew = userGoals === oppGoals;
      const moraleDelta = won ? 7 : drew ? 1 : -6;

      // ── Calcular ingresos de esta jornada ──
      const userTeamData = TEAMS.find(t => t.id === prev.teamId);
      const userStPrev = newStandings.find(s => s.teamId === prev.teamId);
      const sortedForPos = [...newStandings].sort((a,b)=>b.points-a.points||b.goalDifference-a.goalDifference);
      const leaguePos = sortedForPos.findIndex(s => s.teamId === prev.teamId) + 1;
      const fanLove = prev.fanLove ?? 70; // cariño de la afición, 0-100
      const incomeResult = calculateMatchdayIncome(userTeamData, isHome, won, drew, leaguePos, fanLove, prev.legacy?.clubPrestige ?? 50);
      const newFanLove = Math.max(0, Math.min(100, fanLove + (won?3:drew?0:-4)));

      // Las tarjetas usan team:"user"/"opp" (no se normalizan a home/away como los goles)
      const yellowsInMatch = events.filter(e => e.type === "YELLOW" && e.team === "user").map(e => e.playerId);
      const redsInMatch    = events.filter(e => e.type === "RED"    && e.team === "user").map(e => e.playerId);
      const injuryEventsInMatch = events.filter(e => e.type === "INJURY" && e.team === "user");
      const newlyInjuredIds = new Set(injuryEventsInMatch.map(e => e.playerId));
      const playersSource  = livePlayer ?? prev.players;
      const nextUserFixture = finalFixtures.find(item => !item.played && (item.homeTeamId === prev.teamId || item.awayTeamId === prev.teamId));
      const restDays = nextUserFixture ? Math.max(3, Math.min(14, (nextUserFixture.matchday - matchday) * 7)) : 10;
      const trainingLoadPenalty = ({low:0,medium:2,high:5,veryHigh:8}[prev.trainingPlan?.load] ?? 2);
      const recoveredPlayers = playersSource.map(p => {
        const wasSuspended = p.suspended && p.suspGames > 0; // venía sancionado de antes (ya cumplió este partido)
        const extraYellows = yellowsInMatch.filter(id => id === p.id).length;
        const gotRed       = redsInMatch.includes(p.id);
        const newYellowCount = p.yellowCards + extraYellows;

        // Sanción NUEVA originada en este partido (roja o 5ª amarilla)
        const redSeverityRoll = Math.random();
        const newRedSusp  = gotRed ? (redSeverityRoll < 0.70 ? 1 : redSeverityRoll < 0.92 ? 2 : 3) : 0;
        const newAccSusp  = (newYellowCount >= 5 && p.yellowCards < 5) ? 1 : 0;
        const newSuspensionGames = newRedSusp + newAccSusp; // partidos de sanción que arrancan a partir del SIGUIENTE partido

        // Si venía sancionado, esos partidos pendientes ya se cumplieron jugando este partido (estaba fuera del once)
        const remainingFromBefore = wasSuspended ? Math.max(0, p.suspGames - 1) : (p.suspended ? p.suspGames : 0);
        const finalSuspGames = remainingFromBefore + newSuspensionGames;

        const medicalPlayer = newlyInjuredIds.has(p.id) ? p : advanceMedicalRecovery(normalizeMedicalPlayer(p), 7);
        const resistance = medicalPlayer.attrs?.fisico ?? 70;
        const agePenalty = medicalPlayer.age >= 34 ? 5 : medicalPlayer.age >= 31 ? 3 : medicalPlayer.age <= 22 ? -2 : 0;
        const resistanceBonus = Math.round((resistance - 70) / 8);
        const fatigueRecovery = medicalPlayer.injured || p.suspended
          ? 25
          : Math.max(14, Math.min(44, Math.round(restDays * 5.2 + resistanceBonus - agePenalty - trainingLoadPenalty)));
        return {
          ...medicalPlayer,
          fatigue:     Math.max(0, Math.round(medicalPlayer.fatigue - fatigueRecovery + Math.floor(Math.random() * 3))),
          morale:      Math.max(10, Math.min(100, p.morale + moraleDelta + Math.floor(Math.random()*4)-2)),
          yellowCards: gotRed ? 0 : newYellowCount % 5,
          suspended:   finalSuspGames > 0,
          suspGames:   finalSuspGames,
        };
      });
      const trainingResult = applyWeeklyTraining(recoveredPlayers, { ...prev, fixtures:finalFixtures, players:recoveredPlayers, matchday }, prev.trainingPlan ?? DEFAULT_TRAINING_PLAN);
      const academyParticipants=new Set([...(participation?.starters??[]),...(participation?.finishers??[])]);
      const youthStoryItems=[];
      let newPlayers = trainingResult.players.map(player=>{
        if(!player.academyData||!academyParticipants.has(player.id))return player;
        const goals=events.filter(event=>(event.type==="GOAL"||event.type==="PENALTY")&&event.playerId===player.id).length;
        const firstAppearance=!player.academyData.debutSeason;
        const firstGoal=goals>0&&!player.academyData.firstGoalMatchday;
        if(firstAppearance)youthStoryItems.push({title:`Debut oficial de ${player.name}`,summary:`El canterano formado en ${player.academyData.region} disputa su primer partido con el primer equipo.`,importance:"high",playerId:player.id,fingerprint:`academy-debut:${player.id}`});
        if(firstGoal)youthStoryItems.push({title:`${player.name} marca su primer gol como profesional`,summary:"El joven canterano abre su cuenta goleadora con el primer equipo.",importance:"high",playerId:player.id,fingerprint:`academy-first-goal:${player.id}`});
        return{...player,academyData:{...player.academyData,debutSeason:player.academyData.debutSeason??String(prev.season),debutMatchday:player.academyData.debutMatchday??matchday,firstGoalMatchday:firstGoal?matchday:player.academyData.firstGoalMatchday},academyStats:{...(player.academyStats??{}),appearances:(player.academyStats?.appearances??0)+1,goals:(player.academyStats?.goals??0)+goals}};
      });
      const youthTrainingResult=applyWeeklyTraining(prev.youth?.players??[],{...prev,fixtures:finalFixtures,players:prev.youth?.players??[],matchday},prev.trainingPlan??DEFAULT_TRAINING_PLAN);
      const oppTeamId = isHome ? fixture.awayTeamId : fixture.homeTeamId;
      summaryData = {
        userTeam:       TEAMS.find(t => t.id === prev.teamId),
        oppTeam:        TEAMS.find(t => t.id === oppTeamId),
        isHome, userGoals, oppGoals, matchday, events,
        players:        newPlayers,
        opponentPlayers:participation?.opponentPlayers??REAL_SQUADS[oppTeamId]??[],
        participation,
        jornadaResults: finalFixtures.filter(f => f.matchday === matchday),
        newStandings,
        teamId:         prev.teamId,
        income:         incomeResult,
      };
      const newIncomeLog = [...(prev.incomeLog ?? []), { matchday, ...incomeResult }];
      const playerLookup = buildPlayerLookup(TEAMS, REAL_SQUADS, newPlayers, prev.teamId);
      const matchdayNews = generateMatchdayNews({
        beforeFixtures: prev.fixtures,
        afterFixtures: finalFixtures,
        beforeStandings: prev.standings,
        afterStandings: newStandings,
        matchday,
        season: prev.season ?? "2025",
        teams: TEAMS,
        userTeamId: prev.teamId,
        playerLookup,
      });
      const medicalNews = generateMedicalNews({
        injuryEvents:injuryEventsInMatch,
        beforePlayers:(prev.players ?? []).map(normalizeMedicalPlayer),
        afterPlayers:newPlayers,
        season:prev.season ?? "2025", matchday,
        userTeamId:prev.teamId, userTeamName:userTeamData?.name ?? prev.name,
      });
      const youthNews=generateYouthNews({items:youthStoryItems,season:prev.season??"2025",matchday,userTeamId:prev.teamId});
      const developmentNews=generateDevelopmentNews({report:trainingResult.report,players:newPlayers,season:prev.season??"2025",matchday,userTeamId:prev.teamId});
      const nextBudgetAdjustment = (prev.budgetAdjustment ?? 0) + incomeResult.total;
      const combinedTrainingReport={...trainingResult.report,improved:[...(trainingResult.report.improved??[]),...(youthTrainingResult.report.improved??[])]};
      const legacyEvaluation = evaluateLegacyMatchday({ ...prev, fixtures:finalFixtures, standings:newStandings, players:newPlayers, budgetAdjustment:nextBudgetAdjustment }, {
        team:userTeamData,result:won?"win":drew?"draw":"loss",income:incomeResult,trainingReport:combinedTrainingReport,matchday,
      });
      const boardNews = generateBoardNews({items:legacyEvaluation.news,season:prev.season??"2025",matchday,userTeamId:prev.teamId});
      const updatedNews = mergeNews(prev.news ?? [], [...matchdayNews, ...medicalNews, ...youthNews, ...developmentNews, ...boardNews]);
      let newGame = { ...prev, fixtures: finalFixtures, standings: newStandings, players: newPlayers,
        matchday: matchday + 1, season: prev.season ?? "2025", history: prev.history ?? [],
        budgetAdjustment: nextBudgetAdjustment,
        incomeLog: newIncomeLog,
        fanLove: newFanLove,
        news: updatedNews,
        trainingPlan:normalizeTrainingPlan(prev.trainingPlan),
        lastTrainingReport:trainingResult.report,
        lastYouthTrainingReport:youthTrainingResult.report,
        trainingTacticalBonus:trainingResult.tacticalBonus,
        legacy:legacyEvaluation.legacy,
        youth:{...(prev.youth??{}),players:youthTrainingResult.players},standingsMovement };
      const scoutingProgress=advanceScouting(newGame,getScoutingPool(newGame),matchday+1);
      const scoutingNews=generateScoutingNews({items:scoutingProgress.news,season:prev.season??"2025",matchday,userTeamId:prev.teamId});
      newGame={...scoutingProgress.game,news:mergeNews(scoutingProgress.game.news??[],scoutingNews)};
      const offerStatusBefore=Object.fromEntries((newGame.transferMarket?.offers??[]).map(offer=>[offer.id,offer.status]));
      newGame=advanceTransferNegotiations(newGame);
      const responseNews=(newGame.transferMarket?.offers??[]).filter(offer=>offerStatusBefore[offer.id]&&offerStatusBefore[offer.id]!==offer.status).map(offer=>{const club=TEAMS.find(team=>team.id===offer.fromTeamId);const message=offer.status==="clubAccepted"?[`${club?.name} acepta tu oferta por ${offer.playerName}`,"Ya puedes iniciar la negociación contractual con el jugador."]:offer.status==="clubCounter"?[`${club?.name} envía una contraoferta por ${offer.playerName}`,`El club solicita €${(offer.counterAmount/1000).toFixed(1)}M.`]:offer.status==="rejected"?[`${club?.name} rechaza la oferta por ${offer.playerName}`,"La propuesta no alcanza sus expectativas."]:offer.status==="playerCounter"?[`${offer.playerName} pide un salario más alto`,"El jugador ha respondido con nuevas condiciones."]:offer.status==="roleCounter"?[`${offer.playerName} pide más protagonismo`,`Quiere asumir el rol de ${offer.counterRole}.`]:offer.status==="ready"?[`${offer.playerName} acepta el contrato`,"La operación está lista para cerrarse."]:[`Otro club entra en la puja por ${offer.playerName}`,"La operación ya no está bajo tu control."];return{id:`news-response-${offer.id}-${offer.status}`,type:"transfer",importance:["ready","clubAccepted"].includes(offer.status)?"high":"medium",title:`📬 ${message[0]}`,summary:message[1],season:String(newGame.season),matchday,createdAt:Date.now(),fingerprint:`response:${offer.id}:${offer.status}`,metadata:{userClub:true}};});
      if(responseNews.length)newGame={...newGame,news:mergeNews(newGame.news??[],responseNews),transferMarket:{...newGame.transferMarket,notifications:[...responseNews.map(item=>({id:item.id,title:item.title,status:"unread",matchday})),...(newGame.transferMarket?.notifications??[])]}};
      newGame=ensureContractState(newGame);
      const renewalStatusBefore=Object.fromEntries((newGame.contracts?.renewals??[]).map(offer=>[offer.id,offer.status]));
      newGame=advanceRenewals(newGame);
      const renewalNews=(newGame.contracts?.renewals??[]).filter(offer=>renewalStatusBefore[offer.id]&&renewalStatusBefore[offer.id]!==offer.status).map(offer=>{const messages={accepted:[`${offer.playerName} acepta renovar`,"La propuesta contractual ha sido aceptada y queda lista para la firma."],rejected:[`${offer.playerName} rechaza la renovación`,"El jugador no considera suficiente la propuesta."],salaryCounter:[`${offer.playerName} pide más salario`,`Solicita €${offer.counterSalary}K/semana para renovar.`],yearsCounter:[`${offer.playerName} pide más años`,`Quiere ampliar la duración hasta ${offer.counterYears} años.`],roleCounter:[`${offer.playerName} pide más protagonismo`,`Quiere renovar como ${offer.counterRole}.`]};const message=messages[offer.status]??[`${offer.playerName} responde a la renovación`,"La negociación contractual ha cambiado de estado."];return{id:`news-renewal-${offer.id}-${offer.status}`,type:"contract",importance:["accepted","rejected"].includes(offer.status)?"high":"medium",title:`📄 ${message[0]}`,summary:message[1],season:String(newGame.season),matchday,createdAt:Date.now(),fingerprint:`renewal:${offer.id}:${offer.status}`,playerIds:[offer.playerId],teamIds:[newGame.teamId],metadata:{userClub:true,contract:true}};});
      if(renewalNews.length)newGame={...newGame,news:mergeNews(newGame.news??[],renewalNews),contracts:{...newGame.contracts,notifications:[...renewalNews.map(item=>({id:item.id,title:item.title,status:"unread",matchday})),...(newGame.contracts?.notifications??[])]}};
      const birthdayProgress=processBirthdays(newGame);
      newGame=birthdayProgress.news.length?{...birthdayProgress.game,news:mergeNews(birthdayProgress.game.news??[],birthdayProgress.news)}:birthdayProgress.game;
      const incomingBefore=newGame.transferMarket?.incomingOffers?.length??0;
      newGame=maybeCreateIncomingOffer(newGame,TEAMS);
      if((newGame.transferMarket?.incomingOffers?.length??0)>incomingBefore){const offer=newGame.transferMarket.incomingOffers[0];const buyer=TEAMS.find(team=>team.id===offer.toTeamId);const item={id:`news-${offer.id}`,type:"transfer",importance:"high",title:`📬 Oferta del ${buyer?.name} por ${offer.playerName}`,summary:`El club ofrece €${(offer.amount/1000).toFixed(1)}M por ${offer.type==="loan"?"su cesión":"el traspaso"}.`,season:String(newGame.season),matchday,createdAt:Date.now(),fingerprint:offer.id,metadata:{userClub:true}};newGame={...newGame,news:mergeNews(newGame.news??[],[item]),transferMarket:{...newGame.transferMarket,notifications:[{id:item.id,title:item.title,status:"unread",matchday},...(newGame.transferMarket.notifications??[])]}};}
      const aiCountBefore=newGame.transferMarket?.aiTransfers?.length??0;
      newGame=maybeCreateAITransfer(newGame,TEAMS,REAL_SQUADS);
      if((newGame.transferMarket?.aiTransfers?.length??0)>aiCountBefore){const move=newGame.transferMarket.aiTransfers[0];const from=TEAMS.find(team=>team.id===move.fromTeamId);const to=TEAMS.find(team=>team.id===move.toTeamId);const renewal=move.type==="renewal",loan=move.type==="loan",young=move.type==="youth";newGame={...newGame,news:mergeNews(newGame.news??[],[{id:`news-${move.id}`,type:"transfer",importance:young?"high":"medium",title:renewal?`${move.player.name} renueva con ${from?.name}`:loan?`${move.player.name}, cedido al ${to?.name}`:young?`${to?.name} apuesta por el joven ${move.player.name}`:`${move.player.name} ficha por ${to?.name}`,summary:renewal?`${from?.name} asegura la continuidad del jugador.`:loan?`${from?.name} busca minutos para el futbolista.`:`${from?.name} y ${to?.name} cierran la operación por €${(move.value/1000).toFixed(1)}M.${move.reason?` ${move.reason}.`:""}`,season:String(newGame.season),matchday,createdAt:Date.now(),fingerprint:move.id}])};newGame=refreshTransferListings(newGame,TEAMS,REAL_SQUADS,true);}
      saveGame(newGame);

      // Detectar fin de temporada (última jornada jugada)
      const allPlayed = finalFixtures.every(f => f.played);
      if (allPlayed || matchday >= 38) {
        const userSt = newStandings.find(s => s.teamId === prev.teamId);
        const sorted = [...newStandings].sort((a,b)=>b.points-a.points||b.goalDifference-a.goalDifference);
        const userPos = sorted.findIndex(s=>s.teamId===prev.teamId)+1;
        summaryData = { ...summaryData, _seasonEnd: true };
        const seasonEntry = { season: prev.season ?? "2025", pos: userPos, pts: userSt?.points??0, gf: userSt?.goalsFor??0, ga: userSt?.goalsAgainst??0 };
        const newHistory = [...(prev.history??[]), seasonEntry];
        const legacyFinal = finalizeLegacySeason(newGame,{team:userTeamData,position:userPos});
        const youthAnnualReport=createYouthAnnualReport(newGame);
        const finalPlayers=newPlayers.map(player=>player.academyData?{...player,academyStats:{...(player.academyStats??{}),seasons:(player.academyStats?.seasons??0)+1,titles:(player.academyStats?.titles??0)+(userPos===1?1:0)}}:player);
        const seasonBoardNews = generateBoardNews({items:[{title:userPos===1?`${userTeamData.name} conquista la Liga`:`${userTeamData.name} cierra la temporada en la ${userPos}.ª posición`,summary:`El prestigio del club cambia ${legacyFinal.prestigeDelta>=0?"+":""}${Math.round(legacyFinal.prestigeDelta)} puntos.`,importance:userPos===1?"critical":"high",fingerprint:`season-end:${prev.season}:${userPos}`}],season:prev.season??"2025",matchday,userTeamId:prev.teamId});
        const academyReportNews=generateYouthNews({items:[{title:"La cantera presenta su informe anual",summary:`${youthAnnualReport.promoted} promocionados · valor generado ${youthAnnualReport.generatedValue>=1000?`€${(youthAnnualReport.generatedValue/1000).toFixed(1)}M`:`€${youthAnnualReport.generatedValue}K`}.`,importance:youthAnnualReport.promoted>0?"high":"medium",fingerprint:`academy-annual:${prev.season}`}],season:prev.season??"2025",matchday,userTeamId:prev.teamId});
        const finalSeasonGame={...newGame,players:finalPlayers,history:newHistory,legacy:legacyFinal.legacy,budgetAdjustment:newGame.budgetAdjustment+legacyFinal.budgetReward,youth:{...newGame.youth,annualReports:[youthAnnualReport,...(newGame.youth?.annualReports??[])]},news:mergeNews(newGame.news,[...seasonBoardNews,...academyReportNews]),seasonTransition:"seasonEnd"};
        const endData = { standings: newStandings, teamId: prev.teamId, season: prev.season??"2025", history: newHistory, players: finalPlayers, legacy:legacyFinal.legacy,game:finalSeasonGame };
        setTimeout(() => { setSeasonSummary(endData); setScreen("seasonEnd"); }, 0);
        saveGame(finalSeasonGame);
        return finalSeasonGame;
      }

      return newGame;
    });
    setTimeout(() => {
      if (summaryData?._seasonEnd) return; // season end handled separately
      if (summaryData) setMatchSummary(summaryData);
      setScreen("summary");
    }, 0);
  };

  const handleNewSeason = () => {
    if (!seasonSummary) return;
    setGame(prev => {
      const newSeason = String(parseInt(prev.season ?? "2025") + 1);
      (prev.transfers??[]).filter(item=>item.type==="loan"&&String(item.season)===String(prev.season)).forEach(item=>{if(REAL_SQUADS[item.toTeamId]&&REAL_SQUADS[item.fromTeamId]){REAL_SQUADS[item.toTeamId]=REAL_SQUADS[item.toTeamId].filter(player=>player.id!==item.player.id);if(!REAL_SQUADS[item.fromTeamId].some(player=>player.id===item.player.id))REAL_SQUADS[item.fromTeamId]=[...REAL_SQUADS[item.fromTeamId],item.player];}});
      const newFixtures  = generateFixtures();
      const newStandings = initStandings();
      // Recuperar jugadores: reset fatiga, reducir lesiones, mantener moral parcialmente
      const teamData = TEAMS.find(team => team.id === prev.teamId);
      const baseBudget=(teamData?.budget??50)*1000;
      const weeklyWages=prev.players.reduce((sum,player)=>sum+(player.salary??0),0);
      const closingBalance=Math.round(baseBudget-Math.max(0,(prev.matchday??1)-1)*weeklyWages+(prev.budgetAdjustment??0));
      const finalPosition=[...prev.standings].sort((a,b)=>b.points-a.points||b.goalDifference-a.goalDifference).findIndex(row=>row.teamId===prev.teamId)+1;
      const tvRights=Math.round(16000+(21-finalPosition)*350+(teamData?.fanbase??2)*700);
      const sponsorship=Math.round(3500+(prev.legacy?.clubPrestige??30)*55);
      const members=Math.round(2500+(teamData?.fanbase??2)*750);
      const positionPrize=finalPosition===1?12000:finalPosition<=4?8000:finalPosition<=6?5000:finalPosition<=10?2500:1000;
      const operatingCosts=Math.round(13500+(teamData?.fanbase??2)*900);
      const annualNet=tvRights+sponsorship+members+positionPrize-operatingCosts;
      const openingBalance=closingBalance+annualNet;
      const seasonOpeningStatement={previousSeason:String(prev.season),closingBalance,tvRights,sponsorship,members,positionPrize,operatingCosts,annualNet,openingBalance};
      const expiredLoanIns=prev.players.filter(player=>player.loanData?.untilSeason===String(prev.season));
      expiredLoanIns.forEach(player=>{const origin=player.loanData?.fromTeamId;if(origin&&REAL_SQUADS[origin]&&!REAL_SQUADS[origin].some(item=>item.id===player.id))REAL_SQUADS[origin]=[...REAL_SQUADS[origin],{...player,loanData:null}];});
      const expiredLoanOutTransfers=(prev.transfers??[]).filter(item=>item.type==="loanOut"&&String(item.season)===String(prev.season));expiredLoanOutTransfers.forEach(item=>{if(item.toTeamId&&REAL_SQUADS[item.toTeamId])REAL_SQUADS[item.toTeamId]=REAL_SQUADS[item.toTeamId].filter(player=>player.id!==item.player.id);});
      const returningLoanOuts=expiredLoanOutTransfers.map(item=>({...item.player,marketStatus:null,morale:Math.max(55,item.player.morale??65)}));
      const seasonPlayers=[...prev.players.filter(player=>player.loanData?.untilSeason!==String(prev.season)),...returningLoanOuts.filter(player=>!prev.players.some(item=>item.id===player.id))];
      const lifecycleResult=advanceSquadLifecycle(seasonPlayers,{previousSeason:prev.season??"2025",newSeason,teamId:prev.teamId,userTeamId:prev.teamId,allowRetirements:true});
      const worldLifecycleEvents=[];
      TEAMS.filter(team=>team.id!==prev.teamId).forEach(team=>{
        const result=advanceSquadLifecycle((REAL_SQUADS[team.id]??[]).map(player=>ensurePlayerLifecycle(player,prev.season??"2025",38)),{previousSeason:prev.season??"2025",newSeason,teamId:team.id,userTeamId:prev.teamId,allowRetirements:true});
        REAL_SQUADS[team.id]=result.players;
        worldLifecycleEvents.push(...result.events);
      });
      const lifecycleEvents=[...lifecycleResult.events,...worldLifecycleEvents];
      const newPlayers = lifecycleResult.players.map(p => {
        const historyEntry = createSeasonHistoryEntry(p, prev, prev.teamId, teamData?.name ?? prev.name);
        const evolved = {
          ...p,
          fatigue: Math.max(0, Math.round(Math.random() * 3)),
          morale: Math.max(50, Math.min(90, p.morale + Math.floor(Math.random()*10)-3)),
          yellowCards: 0, suspended: false, suspGames: 0, injured: false, injuryGames: 0,
          medical:{ ...(p.medical ?? {}), phase:"available", remainingDays:0, recovery:100 },
          overall:p.overall,
          careerHistory: [...(p.careerHistory ?? []).filter(entry => entry.season !== String(prev.season)), historyEntry],
          developmentHistory:[...(p.developmentHistory ?? []).filter(entry=>entry.season!==String(prev.season)),{season:String(prev.season),startOverall:p.seasonStartOverall??p.overall,endOverall:p.overall,startValue:p.seasonStartValue??getMarketValue(p),endValue:getMarketValue(p)}],
        };
        return { ...evolved, seasonStartOverall: evolved.overall, seasonStartValue: getMarketValue(evolved) };
      });
      const agedYouth=advanceSquadLifecycle(prev.youth?.players??[],{previousSeason:prev.season??"2025",newSeason,teamId:prev.teamId,userTeamId:prev.teamId,allowRetirements:false}).players.map(player=>({...player,seasonStartOverall:player.overall,seasonStartValue:getMarketValue(player)}));
      const carriedMissions=(prev.scouting?.missions??[]).map(item=>item.status!=="active"?item:{...item,startedMatchday:1,completeMatchday:1+Math.max(1,Math.ceil((item.durationDays*(1-(item.progress??0)/100))/7))});
      let g = { ...prev, season: newSeason, matchday: 1, fixtures: newFixtures, standings: newStandings, standingsMovement:{}, players: newPlayers, budgetAdjustment:openingBalance-baseBudget,incomeLog:[],seasonOpeningStatement,transfers:(prev.transfers??[]).map(item=>item.season?item:{...item,season:String(prev.season)}), legacy:startNextLegacySeason(prev.legacy,teamData,newSeason),scouting:{...(prev.scouting??{}),missions:carriedMissions,lastProcessedMatchday:1},youth:{...prev.youth,players:agedYouth},seasonTransition:"preseason" };
      const retirementNews=lifecycleNews(lifecycleEvents,{season:newSeason,matchday:1,userTeamId:prev.teamId});
      g={...g,legacy:applyRetirementsToLegacy(g.legacy,lifecycleEvents,newSeason),news:mergeNews(g.news??[],retirementNews)};
      g=ensureYouthState(g,teamData);
      g={...g,youth:{...g.youth,players:g.youth.players.map(player=>normalizeMedicalPlayer(enrichPlayerProfile(ensurePlayerLifecycle(player,newSeason,1),newSeason)))}};
      g=refreshScoutingRecommendations(g,getScoutingPool(g));
      g=refreshTransferListings(g,TEAMS,REAL_SQUADS,true);
      const intakePlayers=g.youth.players.filter(player=>(g.youth.lastIntake??[]).includes(player.id));
      const topIntake=[...intakePlayers].sort((a,b)=>b.potential-a.potential)[0];
      if(topIntake){const intakeNews=generateYouthNews({items:[{title:"Nueva generación en la cantera",summary:`${topIntake.name} destaca entre ${intakePlayers.length} incorporaciones con potencial ${topIntake.potential}.`,importance:topIntake.potential>=86?"high":"medium",playerId:topIntake.id,fingerprint:`academy-intake:${newSeason}`}],season:newSeason,matchday:1,userTeamId:prev.teamId});g={...g,news:mergeNews(g.news??[],intakeNews)};}
      saveGame(g);
      return g;
    });
    setLineup(emptyLineup());
    setSubs(emptyBench());
    setScreen("preseason");
  };

  const handleTransfer = ({ type, player, cost, salary, value, fromTeamId, toTeamId, offerId }) => {
    setGame(prev => {
      let newPlayers = [...prev.players];
      const prevAdjustment = prev.budgetAdjustment ?? 0; // en €K, acumulado de fichajes/ventas

      if (type === "buy" || type === "loanIn") {
        const newPlayer = normalizeMedicalPlayer(enrichPlayerProfile({ ...player, salary, fatigue:15, morale:75,
          injured:false, injuryGames:0, suspended:false, suspGames:0, yellowCards:0 }, prev.season ?? "2025"));
        newPlayers = [...newPlayers, newPlayer];
        // IMPORTANTE: quitar al jugador de la plantilla real de su equipo de origen,
        // para que deje de aparecer marcando goles o disponible para esa IA.
        if (fromTeamId && fromTeamId !== "agente_libre" && REAL_SQUADS[fromTeamId]) {
          REAL_SQUADS[fromTeamId] = REAL_SQUADS[fromTeamId].filter(p => p.id !== player.id);
        }
      } else if (type === "sell" || type === "loanOut") {
        newPlayers = newPlayers.filter(p => p.id !== player.id);
        if(toTeamId&&REAL_SQUADS[toTeamId]&&!REAL_SQUADS[toTeamId].some(item=>item.id===player.id))REAL_SQUADS[toTeamId]=[...REAL_SQUADS[toTeamId],player];
      }

      // Ajuste acumulado: comprar resta, vender suma (en €K)
      const newAdjustment = ["buy","loanIn"].includes(type) ? prevAdjustment - cost
                           : ["sell","loanOut"].includes(type) ? prevAdjustment + value
                           : prevAdjustment;

      const newTransfer = { type, player, cost, salary, value, fromTeamId, toTeamId, season:String(prev.season),
        matchday: prev.matchday };
      const userTeam = TEAMS.find(team => team.id === prev.teamId);
      const transferNews = generateTransferNews({
        transfer: newTransfer,
        season: prev.season ?? "2025",
        matchday: prev.matchday,
        userTeamId: prev.teamId,
        userTeamName: userTeam?.name ?? prev.name ?? "El club",
      });
      const academySale = type==="sell"&&player.academyData?{playerId:player.id,name:player.name,season:String(prev.season),matchday:prev.matchday,value,overall:player.overall,potential:player.potential}:null;
      const nextYouth=academySale?{...prev.youth,sales:[academySale,...(prev.youth?.sales??[])],historical:[{...player,academyStatus:"sold",saleValue:value},...(prev.youth?.historical??[])]}:prev.youth;
      let newGame = { ...prev, players: newPlayers,
        budgetAdjustment: newAdjustment,
        transfers: [...(prev.transfers ?? []), newTransfer],
        news: mergeNews(prev.news ?? [], transferNews),youth:nextYouth };
      if(type==="buy")newGame=registerScoutingSigning(newGame,player.id);
      if(offerId)newGame=completeOffer(newGame,offerId);
      saveGame(newGame, lineup);
      return newGame;
    });
  };

  const updateTransferMarket=updater=>setGame(prev=>{const updated=updater(prev);saveGame(updated,lineup,formation,subs);return updated;});
  const updateContracts=updater=>setGame(prev=>{const updated=updater(ensureContractState(prev));saveGame(updated,lineup,formation,subs);return updated;});
  const handleClubOffer=(player,amount,marketValue,expectedSalary,listing)=>updateTransferMarket(prev=>createClubOffer(prev,{player:{...player,marketValue,expectedSalary},fromTeamId:player._teamId,amount,dealType:listing?.type??"transfer",listingId:listing?.id}));
  const handleAcceptClubCounter=offerId=>updateTransferMarket(prev=>acceptClubCounter(prev,offerId));
  const handleContractOffer=(offerId,salary,years,role)=>updateTransferMarket(prev=>createContractOffer(prev,{offerId,salary,years,role}));
  const handleAcceptPlayerCounter=offerId=>updateTransferMarket(prev=>acceptPlayerCounter(prev,offerId));
  const handleAcceptRoleCounter=offerId=>updateTransferMarket(prev=>acceptRoleCounter(prev,offerId));
  const handleWithdrawOffer=offerId=>updateTransferMarket(prev=>withdrawOffer(prev,offerId));
  const handleFinalizeOffer=(offer,player)=>handleTransfer({type:offer.dealType==="loan"?"loanIn":"buy",player:{...player,contractYears:offer.years,squadRole:offer.role,loanData:offer.dealType==="loan"?{fromTeamId:offer.fromTeamId,untilSeason:String(game.season)}:null},cost:offer.amount,salary:offer.salary,fromTeamId:offer.fromTeamId,offerId:offer.id});
  const handleUserMarketStatus=(playerId,status)=>{updateTransferMarket(prev=>setUserMarketStatus(prev,playerId,status));setSelectedPlayer(current=>current?.id===playerId?{...current,marketStatus:current.marketStatus===status?null:status,morale:Math.max(20,(current.morale??70)-(current.marketStatus===status?0:status==="transfer"?4:2))}:current);};
  const handleIncomingOffer=(offer,decision,player)=>{if(decision==="accepted"&&player)handleTransfer({type:offer.type==="loan"?"loanOut":"sell",player,value:offer.amount,fromTeamId:game.teamId,toTeamId:offer.toTeamId});updateTransferMarket(prev=>resolveIncomingOffer(prev,offer.id,decision));};
  const handleCreateRenewal=(playerId,salary,years,role)=>updateContracts(prev=>createRenewalOffer(prev,{playerId,salary,years,role}));
  const handleAcceptRenewalCounter=offerId=>updateContracts(prev=>acceptRenewalCounter(prev,offerId));
  const handleCompleteRenewal=offerId=>updateContracts(prev=>completeRenewal(prev,offerId));
  const handleWithdrawRenewal=offerId=>updateContracts(prev=>withdrawRenewalOffer(prev,offerId));

  const handleTrainingPlanChange = (trainingPlan) => {
    setGame(prev => {
      if (!prev) return prev;
      const updated = { ...prev, trainingPlan:normalizeTrainingPlan(trainingPlan) };
      saveGame(updated, lineup, formation, subs);
      return updated;
    });
  };

  const handleScoutingMission = (mission) => {
    setGame(prev=>{const updated=createScoutingMission(prev,mission);saveGame(updated,lineup,formation,subs);return updated;});
  };

  const handleScoutingWatch = (reportId) => {
    setGame(prev=>{const updated=toggleScoutingWatch(prev,reportId);saveGame(updated,lineup,formation,subs);return updated;});
  };

  const handleScoutingCancel = (missionId) => {
    setGame(prev=>{const updated=cancelScoutingMission(prev,missionId);saveGame(updated,lineup,formation,subs);return updated;});
  };

  const handleYouthPromotion = (playerId) => {
    setGame(prev=>{
      const prospect=prev?.youth?.players?.find(player=>player.id===playerId);
      if(!prospect||prev.players.length>=30)return prev;
      const category=getTalentCategory(prospect.potential);
      const promoted=normalizeMedicalPlayer(enrichPlayerProfile(ensurePlayerLifecycle({...prospect,academyStatus:"firstTeam",isYouth:false,salary:Math.max(4,prospect.salary??2),academyData:{...prospect.academyData,promotedSeason:String(prev.season),promotedMatchday:prev.matchday}},prev.season,prev.matchday),prev.season));
      const promotion={playerId:promoted.id,name:promoted.name,season:String(prev.season),matchday:prev.matchday,potential:promoted.potential};
      const prestigeGain=category.id==="historic"?3:category.id==="elite"?2:1;
      const legacy={...prev.legacy,clubPrestige:Math.min(100,prev.legacy.clubPrestige+prestigeGain),manager:{...prev.legacy.manager,prestige:Math.min(100,prev.legacy.manager.prestige+prestigeGain*.5)}};
      const promotionNews=generateYouthNews({items:[{title:`${promoted.name} asciende al primer equipo`,summary:`El club apuesta por el ${promoted.pos} de ${promoted.age} años y potencial ${promoted.potential}.`,importance:category.id==="historic"||category.id==="elite"?"high":"medium",playerId:promoted.id,fingerprint:`academy-promotion:${promoted.id}`}],season:prev.season,matchday:prev.matchday,userTeamId:prev.teamId});
      const updated={...prev,players:[...prev.players,promoted],youth:{...prev.youth,players:prev.youth.players.filter(player=>player.id!==playerId),promotions:[promotion,...(prev.youth.promotions??[])]},legacy,news:mergeNews(prev.news??[],promotionNews)};
      saveGame(updated,lineup,formation,subs);
      return updated;
    });
  };

  const openPlayerProfile = (player, teamId = game?.teamId) => {
    if (!player || !game) return;
    setSelectedPlayer(enrichPlayerProfile(ensurePlayerLifecycle(player, game.season ?? "2025", game.matchday ?? 1), game.season ?? "2025"));
    setSelectedPlayerTeamId(teamId ?? game.teamId);
    setProfileReturnScreen(screen === "playerProfile" ? profileReturnScreen : screen);
    setScreen("playerProfile");
  };

  const openPlayerProfileById = (playerId) => {
    if (!game) return;
    const ownPlayer = game.players.find(player => player.id === playerId);
    if (ownPlayer) return openPlayerProfile(ownPlayer, game.teamId);
    const academyPlayer=game.youth?.players?.find(player=>player.id===playerId);
    if(academyPlayer)return openPlayerProfile(academyPlayer,game.teamId);
    for (const team of TEAMS) {
      const player = (REAL_SQUADS[team.id] ?? []).find(item => item.id === playerId);
      if (player) return openPlayerProfile(player, team.id);
    }
    const transfer = [...(game.transfers ?? [])].reverse().find(item => item.player?.id === playerId);
    if (transfer?.player) openPlayerProfile(transfer.player, transfer.type === "buy" ? game.teamId : null);
  };

  const attentionItems = game ? getAttentionItems(game, { lineup }) : [];
  const attentionCount = getAttentionCount(attentionItems);

  const updateAttentionStatus = (itemId, status) => {
    setGame(prev => {
      if (!prev) return prev;
      const updated = markAttentionItem(prev, itemId, status);
      saveGame(updated, lineup, formation, subs);
      return updated;
    });
  };

  const handleAttentionOpen = (item) => {
    updateAttentionStatus(item.id, "seen");
    const target = item.action?.screen ?? "dashboard";
    if (target === "playerProfile" && item.playerId) {
      openPlayerProfileById(item.playerId);
      return;
    }
    setScreen(target);
  };

  const handleAttentionDismiss = (item) => {
    updateAttentionStatus(item.id, "dismissed");
  };

  const headerTitle = {
    menu: null, saves: null, country: "Nueva partida", league: "Selecciona liga",
    teams: "Elige tu equipo", dashboard: "Mi Club",
    squad: "Plantilla", lineup: "Alineación", tactics: "Tácticas",
    calendar: "Calendario", standings: "Clasificación", match: "Partido",
    summary: "Resumen del partido", finances: "Finanzas",
    seasonEnd: "Gala de Fin de Temporada", preseason:"Pretemporada", transfers: "Mercado de Fichajes", contracts:"Contratos", scouting:"Scouting", news: "Noticias", medical:"Centro Médico", training:"Centro de Entrenamiento", youth:"Cantera", board:"Directiva y Legacy", legacyMuseum:"Legacy del Club", attention:"Centro de Atención", more:"Más", settings:"Configuración",
    playerProfile: selectedPlayer?.name ?? "Perfil de jugador",
  };
  const showNav = !["menu","saves","country","league","teams","match","summary","seasonEnd","preseason","playerProfile"].includes(screen);
  const inGame  = !["menu","teams"].includes(screen);
  const edgeSwipe=useEdgeSwipeBack(()=>setScreen(screen==="playerProfile"?profileReturnScreen:"dashboard"),{enabled:screen!=="dashboard"&&(showNav||screen==="playerProfile")});

  return (
    <div {...edgeSwipe.handlers} style={{ background:"#0d0f14", color:"#e8eaf0", fontFamily:"system-ui,-apple-system,sans-serif", minHeight:"100dvh", width:"100%", maxWidth:540, margin:"0 auto", display:"flex", flexDirection:"column", touchAction:"pan-y" }}>
      {edgeSwipe.indicator}
      {screen !== "menu" && (
        <div style={{ background:"#13161f", borderBottom:"1px solid rgba(255,255,255,.07)", padding:"11px 14px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          {(inGame && screen !== "dashboard") && (
            <button onClick={() => setScreen(screen === "playerProfile" ? profileReturnScreen : "dashboard")}
              style={{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"#9aa0b4", cursor:"pointer", fontSize:12, padding:"5px 10px", borderRadius:7, fontWeight:600, transition:"background .15s" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.1)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"}>
              ← {screen === "playerProfile" ? "Volver" : "Inicio"}
            </button>
          )}
          {screen === "teams" && (
            <button onClick={() => setScreen("league")}
              style={{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"#9aa0b4", cursor:"pointer", fontSize:12, padding:"5px 10px", borderRadius:7, fontWeight:600 }}>
              ← Volver
            </button>
          )}
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:15, color:"#e8eaf0" }}>{headerTitle[screen]}</div>
            {screen === "dashboard" && game && (
              <div style={{ fontSize:11, color:"#4b5563", marginTop:1 }}>Jornada {game.matchday} · Temporada {game.season ?? "2025"}/{String(parseInt(game.season??2025)+1).slice(-2)}</div>
            )}
          </div>
          <div style={{ width:30, height:30, background:"linear-gradient(135deg,#c9a84c,#e8c96a)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, color:"#1a1200", boxShadow:"0 2px 8px rgba(201,168,76,.3)" }}>L</div>
        </div>
      )}

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <ScreenWrapper animKey={screen}>
          {screen === "menu"      && <MainMenu onNew={() => setScreen("country")} onSaves={() => setScreen("saves")} savesCount={savesIndex.length} />}
          {screen === "saves"     && <SavesScreen saves={savesIndex} onLoad={loadGame} onDelete={deleteSave} onNew={() => setScreen("country")} onBack={() => setScreen("menu")} />}
          {screen === "country"   && <CountryScreen onSelect={c => { setPendingCountry(c); setScreen("league"); }} onBack={() => setScreen("menu")} />}
          {screen === "league"    && <LeagueScreen country={pendingCountry} onSelect={l => { setPendingLeague(l); setScreen("teams"); }} onBack={() => setScreen("country")} />}
          {screen === "teams"     && <TeamSelection onSelect={startNewGame} />}
          {screen === "dashboard" && game && <Dashboard game={game} onPlay={() => setScreen("match")} setScreen={setScreen} lineup={lineup} attentionItems={attentionItems} />}
          {screen === "more"      && game && <MoreMenuScreen game={game} onNavigate={setScreen} attentionCount={attentionCount} />}
          {screen === "attention" && game && <AttentionCenterScreen items={attentionItems} onOpenItem={handleAttentionOpen} onDismissItem={handleAttentionDismiss} />}
          {screen === "squad"     && game && <SquadScreen game={game} players={game.players} onOpenPlayer={player=>openPlayerProfile(player,game.teamId)} />}
          {screen === "lineup"    && game && <LineupScreen game={game} players={game.players} lineup={normalizeSlots(lineup,STARTERS_SLOTS)} setLineup={setLineup} formation={formation} setFormation={setFormation} subs={normalizeSlots(subs,BENCH_SLOTS)} setSubs={setSubs} savedLineups={game.savedLineups ?? []} onOpenPlayer={player=>openPlayerProfile(player,game.teamId)} onSaveLineups={(newSaved) => { const newGame = {...game, savedLineups: newSaved}; setGame(newGame); saveGame(newGame, lineup, formation, subs); }} />}
          {screen === "tactics"   && <TacticsScreen tactics={tactics} setTactics={setTactics} />}
          {screen === "calendar"  && game && <CalendarScreen fixtures={game.fixtures} teamId={game.teamId} onPlay={() => setScreen("match")} lineup={lineup} players={game.players} />}
          {screen === "standings" && game && <StandingsScreen standings={game.standings} teamId={game.teamId} fixtures={game.fixtures} players={game.players} movement={game.standingsMovement} onOpenPlayer={openPlayerProfile} />}
          {screen === "news"      && game && <NewsScreen news={game.news ?? []} currentSeason={game.season ?? "2025"} game={game} onOpenPlayer={openPlayerProfileById} />}
          {screen === "medical"   && game && <MedicalCenterScreen game={game} onOpenPlayer={openPlayerProfile} />}
          {screen === "training"  && game && <TrainingCenterScreen game={game} onPlanChange={handleTrainingPlanChange} onOpenPlayer={openPlayerProfile} />}
          {screen === "youth"     && game && <YouthAcademyScreen game={game} onPromote={handleYouthPromotion} onOpenPlayer={openPlayerProfile} />}
          {screen === "board"     && game && <BoardLegacyScreen game={game} team={TEAMS.find(team=>team.id===game.teamId)} />}
          {screen === "legacyMuseum" && game && <LegacyMuseumScreen game={game} team={TEAMS.find(team=>team.id===game.teamId)} teams={TEAMS} />}
          {screen === "scouting" && game && <ScoutingScreen game={game} candidates={getScoutingPool(game)} focusReportId={scoutingFocusId} onStartMission={handleScoutingMission} onCancelMission={handleScoutingCancel} onToggleWatch={handleScoutingWatch} onOpenPlayer={openPlayerProfile} onGoMarket={()=>setScreen("transfers")} />}
          {screen === "settings"  && game && <SettingsScreen game={game} />}
          {screen === "finances"  && game && <FinancesScreen game={game} />}
          {screen === "contracts" && game && <ContractsScreen game={ensureContractState(game)} onOpenPlayer={player=>openPlayerProfile(player,game.teamId)} onCreateRenewal={handleCreateRenewal} onAcceptCounter={handleAcceptRenewalCounter} onComplete={handleCompleteRenewal} onWithdraw={handleWithdrawRenewal} />}
          {screen === "transfers" && game && <TransferMarketScreen game={game} onTransfer={handleTransfer} onOpenPlayer={openPlayerProfile} onGoScouting={()=>{setScoutingFocusId(null);setScreen("scouting")}} onViewReport={reportId=>{setScoutingFocusId(reportId);setScreen("scouting")}} onClubOffer={handleClubOffer} onAcceptClubCounter={handleAcceptClubCounter} onContractOffer={handleContractOffer} onAcceptPlayerCounter={handleAcceptPlayerCounter} onAcceptRoleCounter={handleAcceptRoleCounter} onWithdrawOffer={handleWithdrawOffer} onFinalizeOffer={handleFinalizeOffer} onUserMarketStatus={handleUserMarketStatus} onIncomingOffer={handleIncomingOffer} />}
          {screen === "playerProfile" && game && selectedPlayer && <PlayerProfileScreen player={selectedPlayer} game={game} team={TEAMS.find(team=>team.id===selectedPlayerTeamId)} onGoLineup={()=>setScreen("lineup")} onGoTraining={()=>setScreen(selectedPlayer.academyStatus==="academy"?"youth":"training")} onMarketStatus={handleUserMarketStatus} onRenewalOffer={handleCreateRenewal} onGoContracts={()=>setScreen("contracts")} />}
          {screen === "match"     && game && <MatchScreen game={game} tactics={tactics} setTactics={setTactics} lineup={normalizeSlots(lineup,STARTERS_SLOTS)} setLineup={setLineup} subs={normalizeSlots(subs,BENCH_SLOTS)} setSubs={setSubs} formation={formation} onMatchEnd={handleMatchEnd} />}
          {screen === "summary"   && matchSummary && <MatchSummaryScreen summary={matchSummary} onContinue={() => setScreen("dashboard")} />}
          {screen === "seasonEnd" && seasonSummary && <SeasonTransitionScreen seasonSummary={seasonSummary} onNewSeason={handleNewSeason} teams={TEAMS} squads={REAL_SQUADS} />}
          {screen === "preseason" && game && <PreseasonScreen game={game} team={TEAMS.find(team=>team.id===game.teamId)} teams={TEAMS} onStart={()=>{setGame(prev=>{const updated={...prev,seasonTransition:null};saveGame(updated,lineup,formation,subs);return updated;});setSeasonSummary(null);setScreen("dashboard");}} />}
        </ScreenWrapper>
      </div>

      <BottomNav screen={screen} setScreen={setScreen} disabled={!showNav} attentionCount={attentionCount} />
    </div>
  );
}
