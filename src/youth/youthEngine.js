import { getMarketValue } from "../players/playerProfile.js";

const BASQUE_FIRST=["Iker","Unai","Aitor","Oier","Beñat","Mikel","Ander","Jon","Asier","Peru","Eneko","Ibai"];
const BASQUE_LAST=["Etxebarria","Aguirre","Aramburu","Goikoetxea","Zubiaurre","Elizondo","Irazabal","Lertxundi","Garmendia","Urrutia"];
const SPANISH_FIRST=["Álex","Hugo","Pablo","Diego","Mario","Adrián","Sergio","Iván","Álvaro","Daniel","Marco","Lucas"];
const SPANISH_LAST=["García","Martín","Navarro","Romero","Torres","Serrano","Vega","Molina","Cortés","Ramos","Herrera","Vidal"];
const INTL_NAMES={PT:[["João","Tiago","Diogo","Gonçalo"],["Silva","Costa","Ferreira","Pereira"]],FR:[["Lucas","Hugo","Mathis","Enzo"],["Martin","Bernard","Dubois","Leroy"]],AR:[["Mateo","Tomás","Santino","Benjamín"],["Fernández","Acosta","Pereyra","Rojas"]],MA:[["Youssef","Amine","Ilyas","Adam"],["El Amrani","Benali","Alaoui","Idrissi"]]};
const POSITIONS=[['POR','POR'],['DFC','DEF'],['LD','DEF'],['LI','DEF'],['MCD','MED'],['MC','MED'],['MCO','MED'],['ED','DEL'],['EI','DEL'],['DC','DEL']];

function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let state=hash(seed);return()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const pick=(random,list)=>list[Math.floor(random()*list.length)];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function getTalentCategory(potential){
  if(potential>=92)return{id:"historic",icon:"👑",label:"Generación histórica",color:"#f59e0b"};
  if(potential>=86)return{id:"elite",icon:"💎",label:"Gran talento",color:"#a78bfa"};
  if(potential>=78)return{id:"prospect",icon:"⭐",label:"Promesa",color:"#c9a84c"};
  return{id:"project",icon:"🌱",label:"Proyecto",color:"#22c55e"};
}

function identity(random,team){
  const isAthletic=team?.id==="athletic";
  const regionalChance=isAthletic ? .88 : .68;
  if(random()<regionalChance){
    const first=isAthletic?BASQUE_FIRST:SPANISH_FIRST;
    const last=isAthletic?BASQUE_LAST:SPANISH_LAST;
    return{name:`${pick(random,first)} ${pick(random,last)}`,nat:"ES",region:isAthletic?"Euskadi":team?.city??"España"};
  }
  const nat=pick(random,Object.keys(INTL_NAMES));const [first,last]=INTL_NAMES[nat];
  return{name:`${pick(random,first)} ${pick(random,last)}`,nat,region:"Captación internacional"};
}

function attributes(overall,pos,group,random){
  const value=(bonus=0)=>clamp(Math.round(overall-4+random()*9+bonus),35,82);
  return{ritmo:value(group==="DEL"?5:0),tiro:value(group==="DEL"?5:-3),pase:value(group==="MED"?5:0),regate:value(group==="DEL"||group==="MED"?4:0),defensa:value(group==="DEF"?7:group==="MED"?1:-7),fisico:value(group==="DEF"?5:0),porteria:group==="POR"?value(12):Math.round(5+random()*9)};
}

export function generateYouthIntake(team,season,clubPrestige=30){
  const random=rng(`${team?.id}:${season}:academy`);
  const count=3+Math.floor(random()*3);
  const players=Array.from({length:count},(_,index)=>{
    const identityData=identity(random,team);
    const [pos,group]=pick(random,POSITIONS);
    const age=15+Math.floor(random()*4);
    const prestigeBoost=Math.round((clubPrestige-40)/25);
    const overall=clamp(52+Math.floor(random()*14)+prestigeBoost,49,68);
    const rareRoll=random();
    const potentialBoost=rareRoll>.985?28:rareRoll>.90?22:rareRoll>.55?16:10;
    const potential=clamp(overall+potentialBoost+Math.floor(random()*7),overall+7,95);
    const category=getTalentCategory(potential);
    const id=`youth_${team?.id}_${season}_${index}_${hash(identityData.name).toString(36).slice(0,4)}`;
    return{id,...identityData,pos,group,age,overall,potential,rarity:overall>=65?"SILVER":"BRONZE",fatigue:8+Math.floor(random()*15),morale:68+Math.floor(random()*23),salary:2,injured:false,injuryGames:0,suspended:false,suspGames:0,yellowCards:0,attrs:attributes(overall,pos,group,random),academyStatus:"academy",isYouth:true,academyData:{joinedSeason:String(season),joinedMatchday:1,category:category.id,region:identityData.region,discoveredBy:"Jefe de cantera",debutSeason:null,debutMatchday:null,firstGoalMatchday:null}};
  });
  const best=[...players].sort((a,b)=>b.potential-a.potential)[0];
  if(best&&best.potential<80){best.potential=80+(hash(`${team?.id}:${season}:standout`)%5);best.academyData={...best.academyData,category:getTalentCategory(best.potential).id};}
  return players;
}

export function ensureYouthState(game,team){
  const youth=game.youth??{players:[],promotions:[],sales:[],annualReports:[],historical:[],generatedSeasons:[]};
  if(youth.generatedSeasons.includes(String(game.season)))return{...game,youth};
  const intake=generateYouthIntake(team,game.season,game.legacy?.clubPrestige??30);
  return{...game,youth:{...youth,players:[...youth.players,...intake],generatedSeasons:[...youth.generatedSeasons,String(game.season)],lastIntake:intake.map(player=>player.id)}};
}

export function createYouthAnnualReport(game){
  const youth=game.youth;
  const promotions=(youth?.promotions??[]).filter(item=>item.season===String(game.season));
  const sales=(youth?.sales??[]).filter(item=>item.season===String(game.season));
  const candidates=[...(youth?.players??[]),...game.players.filter(player=>player.academyData)];
  const standout=[...candidates].sort((a,b)=>(b.potential-b.overall)-(a.potential-a.overall)||b.potential-a.potential)[0];
  const generatedValue=game.players.filter(player=>player.academyData).reduce((sum,player)=>sum+getMarketValue(player),0)+sales.reduce((sum,item)=>sum+(item.value??0),0);
  return{id:`academy_report_${game.season}`,season:String(game.season),promoted:promotions.length,sold:sales.length,generatedValue,standout:standout?{id:standout.id,name:standout.name,potential:standout.potential}:null,createdAt:new Date().toISOString()};
}

export function getAcademyMetrics(game){
  const firstTeam=game.players.filter(player=>player.academyData);
  const sold=game.youth?.sales??[];
  return{firstTeam:firstTeam.length,totalGeneratedValue:firstTeam.reduce((sum,player)=>sum+getMarketValue(player),0)+sold.reduce((sum,item)=>sum+(item.value??0),0),sold:sold.length};
}
