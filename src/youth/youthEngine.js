import { getMarketValue } from "../players/playerProfile.js";

const BASQUE_FIRST=["Iker","Unai","Aitor","Oier","Beñat","Mikel","Ander","Jon","Asier","Peru","Eneko","Ibai"];
const BASQUE_LAST=["Etxebarria","Aguirre","Aramburu","Goikoetxea","Zubiaurre","Elizondo","Irazabal","Lertxundi","Garmendia","Urrutia"];
const SPANISH_FIRST=["Álex","Hugo","Pablo","Diego","Mario","Adrián","Sergio","Iván","Álvaro","Daniel","Marco","Lucas"];
const SPANISH_LAST=["García","Martín","Navarro","Romero","Torres","Serrano","Vega","Molina","Cortés","Ramos","Herrera","Vidal"];
const INTL_NAMES={PT:[["João","Tiago","Diogo","Gonçalo"],["Silva","Costa","Ferreira","Pereira"]],FR:[["Lucas","Hugo","Mathis","Enzo"],["Martin","Bernard","Dubois","Leroy"]],AR:[["Mateo","Tomás","Santino","Benjamín"],["Fernández","Acosta","Pereyra","Rojas"]],MA:[["Youssef","Amine","Ilyas","Adam"],["El Amrani","Benali","Alaoui","Idrissi"]]};
const POSITIONS=[['POR','POR'],['DFC','DEF'],['LD','DEF'],['LI','DEF'],['MCD','MED'],['MC','MED'],['MCO','MED'],['ED','DEL'],['EI','DEL'],['DC','DEL']];
const GROUP_LABEL={DEL:"delantero",MED:"centrocampista",DEF:"defensa",POR:"portero"};

function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let state=hash(seed);return()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const pick=(random,list)=>list[Math.floor(random()*list.length)];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const pickVariant=(seed,list)=>list[seed%list.length];

export function getTalentCategory(potential){
  if(potential>=92)return{id:"historic",icon:"👑",label:"Talento generacional",color:"#f59e0b"};
  if(potential>=86)return{id:"elite",icon:"💎",label:"Gran promesa",color:"#a78bfa"};
  if(potential>=78)return{id:"prospect",icon:"⭐",label:"Proyecto interesante",color:"#c9a84c"};
  return{id:"project",icon:"🌱",label:"Aún por definir",color:"#22c55e"};
}

export function getYouthProjection(player){
  const room=(player.potential??player.overall)-player.overall;
  const age=player.age??17;
  const trend=player.academyData?.trend??"stable";
  if((player.potential??0)>=92)return{id:"generational",icon:"👑",label:"Talento generacional",color:"#f59e0b"};
  if((player.potential??0)>=86&&room>=10)return{id:"big_promise",icon:"💎",label:"Gran promesa",color:"#a78bfa"};
  if(age<=17&&room>=12)return{id:"needs_time",icon:"⏳",label:"Necesita tiempo",color:"#60a5fa"};
  if(age>=18&&room>=8&&player.overall<68)return{id:"loan",icon:"🧳",label:"Debe salir cedido",color:"#38bdf8"};
  if(room<=2&&player.overall<66)return{id:"no_future",icon:"⚪",label:"Sin futuro claro",color:"#8b92a3"};
  if(trend==="rising")return{id:"rising",icon:"📈",label:"En crecimiento",color:"#22c55e"};
  if(trend==="stalled")return{id:"stalled",icon:"⚠️",label:"Estancado",color:"#f59e0b"};
  return{id:"project",icon:"🌱",label:"Proyecto interesante",color:"#c9a84c"};
}

function youthNote(kind, text, season, matchday){
  return { kind, text, season:String(season??"2025"), matchday:matchday??1, createdAt:Date.now() };
}

export function normalizeYouthProspect(player, game = {}){
  const joinedSeason=String(player.academyData?.joinedSeason??game.season??"2025");
  const joinedMatchday=player.academyData?.joinedMatchday??game.matchday??1;
  const initialOverall=player.academyData?.initialOverall??player.overall;
  const initialPotential=player.academyData?.initialPotential??player.potential;
  const projection=getYouthProjection(player);
  const category=getTalentCategory(player.potential);
  const history=player.academyData?.developmentHistory?.length ? player.academyData.developmentHistory : [{
    season:joinedSeason,
    matchday:joinedMatchday,
    overall:player.overall,
    potential:player.potential,
    note:"Llegó a la cantera.",
  }];
  return {
    ...player,
    academyData:{
      ...(player.academyData??{}),
      joinedSeason,
      joinedMatchday,
      initialOverall,
      initialPotential,
      category:category.id,
      projection:projection.id,
      projectionLabel:projection.label,
      trend:player.academyData?.trend??"stable",
      developmentNotes:player.academyData?.developmentNotes??[],
      developmentHistory:history,
      loanPlan:player.academyData?.loanPlan??null,
      mentorPlan:player.academyData?.mentorPlan??null,
    },
  };
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
    return normalizeYouthProspect({id,...identityData,pos,group,age,overall,potential,rarity:overall>=65?"SILVER":"BRONZE",fatigue:8+Math.floor(random()*15),morale:68+Math.floor(random()*23),salary:2,injured:false,injuryGames:0,suspended:false,suspGames:0,yellowCards:0,attrs:attributes(overall,pos,group,random),academyStatus:"academy",isYouth:true,academyData:{joinedSeason:String(season),joinedMatchday:1,category:category.id,region:identityData.region,discoveredBy:"Jefe de cantera",debutSeason:null,debutMatchday:null,firstGoalMatchday:null,initialOverall:overall,initialPotential:potential}}, {season, matchday:1});
  });
  const best=[...players].sort((a,b)=>b.potential-a.potential)[0];
  if(best&&best.potential<80){
    best.potential=80+(hash(`${team?.id}:${season}:standout`)%5);
    best.academyData={...best.academyData,initialPotential:best.potential,category:getTalentCategory(best.potential).id,developmentHistory:[{season:String(season),matchday:1,overall:best.overall,potential:best.potential,note:"Llegó a la cantera."}]};
  }
  return players;
}

export function ensureYouthState(game,team){
  const youth=game.youth??{players:[],promotions:[],sales:[],annualReports:[],historical:[],generatedSeasons:[]};
  const normalizedYouth={...youth,players:(youth.players??[]).map(player=>normalizeYouthProspect(player,game))};
  if(normalizedYouth.generatedSeasons.includes(String(game.season)))return{...game,youth:normalizedYouth};
  const intake=generateYouthIntake(team,game.season,game.legacy?.clubPrestige??30);
  return{...game,youth:{...normalizedYouth,players:[...normalizedYouth.players,...intake],generatedSeasons:[...normalizedYouth.generatedSeasons,String(game.season)],lastIntake:intake.map(player=>player.id)}};
}

export function applyYouthDevelopmentCycle(players = [], game = {}, report = {}){
  const season=String(game.season??"2025");
  const matchday=game.matchday??1;
  const changesByPlayer=Object.fromEntries((report.changes??[]).map(item=>[item.playerId,item]));
  const stories=[];
  const evolved=players.map(original=>{
    const player=normalizeYouthProspect(original,game);
    const change=changesByPlayer[player.id];
    const progress=(change?.progress??[])[0]?.value??0;
    const improved=Boolean(change?.changes?.some(item=>item.delta>0));
    const seed=hash(`${player.id}:${season}:${matchday}:youth-evolution`);
    const room=(player.potential??player.overall)-player.overall;
    const morale=player.morale??70;
    const fatigue=player.fatigue??15;
    const personalityId=change?.personalityId??player.personality?.profileId??player.personality?.id;
    let score=0;
    if(improved)score+=4;
    if(progress>=65)score+=2;
    if((game.trainingPlan?.weeklyFocus??"")==="youth")score+=2;
    if(["professional","hardWorker","insecureYoung"].includes(personalityId))score+=1;
    if(morale>=75)score+=1;
    if(fatigue>=55||player.injured||["injured","recovery"].includes(player.medical?.phase))score-=3;
    if(progress<18&&!improved)score-=2;
    if(player.age>=18&&room>=8&&player.overall<68)score-=1;

    let potentialDelta=0;
    if(score>=6 && seed%100<42)potentialDelta=1;
    if(score<=-3 && seed%100<38)potentialDelta=-1;
    const nextPotential=clamp((player.potential??player.overall)+potentialDelta,player.overall,96);
    const trend=potentialDelta>0||improved?"rising":score<=-3?"stalled":"stable";
    const groupLabel=GROUP_LABEL[player.group]??"jugador";
    const notes=[...(player.academyData?.developmentNotes??[])];
    if(potentialDelta>0)notes.unshift(youthNote("potential_up",pickVariant(seed,[
      "El cuerpo técnico cree que su techo puede ser más alto de lo previsto.",
      "El informe interno revisa al alza su proyección: rinde por encima de lo esperado.",
      `Los técnicos de la cantera elevan su valoración: como ${groupLabel}, da más de lo que marcaban los informes iniciales.`,
      `A sus ${player.age} años ya apunta más alto de lo que se pensaba cuando llegó.`,
    ]),season,matchday));
    if(potentialDelta<0)notes.unshift(youthNote("potential_down",pickVariant(seed,[
      "Su evolución se ha frenado y el potencial estimado se ajusta a la baja.",
      "El cuerpo técnico revisa a la baja las expectativas: el margen de mejora es menor de lo previsto.",
      `Los informes de seguimiento moderan el entusiasmo inicial sobre su futuro como ${groupLabel}.`,
      "El crecimiento no acompaña a la edad: el club ajusta su proyección con más cautela.",
    ]),season,matchday));
    if(improved)notes.unshift(youthNote("training",pickVariant(seed,[
      "Ha respondido bien al trabajo semanal y suma una mejora visible.",
      "El trabajo de la última semana se nota: progresa con paso firme.",
      `Los entrenadores destacan su evolución como ${groupLabel} esta semana.`,
      "Suma una semana más de progreso constante en la academia.",
    ]),season,matchday));
    if(score<=-3&&!potentialDelta)notes.unshift(youthNote("stalled",pickVariant(seed,[
      "Necesita competir o cambiar estímulos para no quedarse parado.",
      "El cuerpo técnico avisa: sin más minutos de competición, su progreso corre el riesgo de frenarse.",
      `A sus ${player.age} años necesita un nuevo reto para no estancarse.`,
      "La rutina actual ya no le exige lo suficiente: toca buscar un estímulo distinto.",
    ]),season,matchday));
    const history=[...(player.academyData?.developmentHistory??[])];
    const last=history[history.length-1];
    if(!last||last.overall!==player.overall||last.potential!==nextPotential||potentialDelta!==0||improved){
      history.push({season,matchday,overall:player.overall,potential:nextPotential,note:potentialDelta>0?"Potencial al alza":potentialDelta<0?"Potencial revisado":improved?"Mejora de entrenamiento":"Seguimiento"});
    }
    const updated=normalizeYouthProspect({...player,potential:nextPotential,academyData:{...player.academyData,trend,developmentNotes:notes.slice(0,8),developmentHistory:history.slice(-12)}},game);
    if(potentialDelta>0&&nextPotential>=86)stories.push({title:`${updated.name} ilusiona a la cantera`,summary:`El Jefe de Cantera eleva su informe: ${updated.name} ya aparece como ${updated.academyData.projectionLabel}.`,importance:nextPotential>=92?"high":"medium",playerId:updated.id,fingerprint:`academy-rise:${updated.id}:${season}:${matchday}`});
    if(trend==="stalled"&&room>=5)stories.push({title:`${updated.name} necesita un nuevo impulso`,summary:"El informe interno apunta a estancamiento. Una cesión o un plan específico puede ayudarle.",importance:"medium",playerId:updated.id,fingerprint:`academy-stalled:${updated.id}:${season}:${matchday}`});
    return updated;
  });
  return { players:evolved, stories };
}

export function buildYouthDirectorRecommendations(game = {}){
  const players=(game.youth?.players??[]).map(player=>normalizeYouthProspect(player,game));
  const items=[];
  players.forEach(player=>{
    const projection=getYouthProjection(player);
    const room=(player.potential??player.overall)-player.overall;
    const groupLabel=GROUP_LABEL[player.group]??"jugador";
    const seed=hash(`${player.id}:${game.season}:${game.matchday}:recommendation`);
    if(["generational","big_promise"].includes(projection.id)){
      items.push({id:`academy_high:${player.id}`,player,projection,priority:projection.id==="generational"?"critical":"important",title:`${player.name} puede marcar una época`,summary:`${player.pos} de ${player.age} años. El informe lo sitúa como ${projection.label}. Conviene definir un plan.`});
    } else if(projection.id==="loan"){
      items.push({id:`academy_loan:${player.id}`,player,projection,priority:"normal",title:`${player.name} necesita competir`,summary:pickVariant(seed,[
        "Su evolución pide minutos reales. Una cesión con objetivos podría acelerar su desarrollo.",
        `A sus ${player.age} años necesita competir de verdad: una cesión bien planteada le daría los minutos que la cantera no puede ofrecerle.`,
        `El Jefe de Cantera insiste: como ${groupLabel}, le falta ritmo de competición. Una cesión con objetivos claros ayudaría.`,
      ])});
    } else if(projection.id==="stalled"){
      items.push({id:`academy_stalled:${player.id}`,player,projection,priority:"important",title:`${player.name} se está estancando`,summary:pickVariant(seed,[
        "El progreso se ha frenado. El Jefe de Cantera recomienda revisar su plan individual.",
        "Los informes llevan semanas sin novedades. Toca cambiar de estímulos antes de que se acomode.",
        `Su evolución como ${groupLabel} se ha estancado. El cuerpo técnico pide un plan distinto para reactivarlo.`,
      ])});
    } else if(player.overall>=70&&room>=5){
      items.push({id:`academy_ready:${player.id}`,player,projection,priority:"important",title:`${player.name} llama a la puerta`,summary:pickVariant(seed,[
        "No es solo una cuestión de nivel: llega en buen momento y puede cubrir una necesidad real del primer equipo.",
        `Su nivel ya compite con la plantilla. A sus ${player.age} años, está preparado para dar el salto.`,
        `El Jefe de Cantera lo tiene claro: como ${groupLabel}, ya rinde a la altura del primer equipo.`,
      ])});
    }
  });
  return items.sort((a,b)=>({critical:3,important:2,normal:1}[b.priority]??0)-({critical:3,important:2,normal:1}[a.priority]??0)).slice(0,4);
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
