import { getMarketValue, getPotential } from "../players/playerProfile.js";

const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,value));
const hash=value=>{let result=0;for(const char of String(value))result=(Math.imul(result,31)+char.charCodeAt(0))|0;return Math.abs(result)};

export const SCOUT_SPECIALTIES={
  youth:{icon:"🌱",label:"Jóvenes talentos"},established:{icon:"⭐",label:"Jugadores consolidados"},value:{icon:"💰",label:"Oportunidades"},physical:{icon:"🏃",label:"Jugadores físicos"},technical:{icon:"🎯",label:"Jugadores técnicos"},
};

const SCOUT_NAMES=["Álex Valdés","Martín Urrutia","Sergio Leiva","Hugo Santamaría","Leo Campos"];

function createScouts(prestige){
  const count=prestige>=70?4:prestige>=45?3:2;
  return Array.from({length:count},(_,index)=>({id:`scout_${index+1}`,name:SCOUT_NAMES[index],level:clamp(2+Math.floor(prestige/25)+(index===0?1:0),1,5),specialty:["youth","established","value","technical"][index],experience:clamp(35+Math.round(prestige*.45)+index*7,20,96)}));
}

export function ensureScoutingState(game){
  const current=game.scouting??{};
  return{...game,scouting:{scouts:current.scouts?.length?current.scouts:createScouts(game.legacy?.clubPrestige??30),missions:current.missions??[],reports:current.reports??[],watchlist:current.watchlist??[],history:current.history??[],recommendations:current.recommendations??[],lastProcessedMatchday:current.lastProcessedMatchday??game.matchday??1}};
}

export function getSquadNeeds(game){
  const groups={POR:2,DEF:8,MED:7,DEL:5};
  const labels={POR:"Portería",DEF:"Defensa",MED:"Centro del campo",DEL:"Delantera"};
  return Object.entries(groups).map(([group,target])=>{
    const players=(game.players??[]).filter(item=>(item.group??(item.pos==="POR"?"POR":["DFC","LD","LI"].includes(item.pos)?"DEF":["MCD","MC","MCO"].includes(item.pos)?"MED":"DEL"))===group);
    const quality=players.length?players.reduce((sum,item)=>sum+item.overall,0)/players.length:0;
    const urgency=clamp((target-players.length)*22+(74-quality)*3,0,100);
    return{group,label:labels[group],count:players.length,target,quality:Math.round(quality),urgency,level:urgency>=60?"Alta":urgency>=30?"Media":"Baja"};
  }).sort((a,b)=>b.urgency-a.urgency);
}

function matchesMission(player,mission){
  if(mission.group&&player.group!==mission.group)return false;
  if(mission.position&&player.pos!==mission.position)return false;
  if(mission.maxAge&&player.age>mission.maxAge)return false;
  if(mission.minOverall&&player.overall<mission.minOverall)return false;
  if(mission.maxValue&&getMarketValue(player)>mission.maxValue)return false;
  return true;
}

function reportFor(player,mission,scout,season,matchday,source="mission"){
  const duration=mission.durationDays??7;
  const specialtyBonus=(scout?.specialty==="youth"&&player.age<=21)||(scout?.specialty==="value"&&getMarketValue(player)<=12000)?7:0;
  const confidence=clamp(38+duration*1.7+(scout?.level??2)*5+specialtyBonus+(hash(`${player.id}:${mission.id}`)%7),42,96);
  const width=Math.max(1,Math.ceil((100-confidence)/12));
  const potential=getPotential(player);const value=getMarketValue(player);
  const opportunity=player.contractEnd&&Number(player.contractEnd)<=Number(season)+1?"Contrato próximo a finalizar":value<=8000&&player.overall>=72?"Valor atractivo":player._teamId==="agente_libre"?"Agente libre":null;
  const talent=potential>=90?{icon:"💎",label:"Futuro crack",color:"#a78bfa"}:potential>=84?{icon:"🌱",label:"Talento emergente",color:"#22c55e"}:potential-player.overall>=5?{icon:"⭐",label:"Promesa",color:"#c9a84c"}:null;
  return{id:`report_${player.id}_${season}_${matchday}`,playerId:player.id,teamId:player._teamId,teamName:player._teamName,player:{...player,potential},season:String(season),matchday,scoutId:scout?.id??null,scoutName:scout?.name??"Director deportivo",source,confidence,overallRange:[Math.max(40,player.overall-width),Math.min(99,player.overall+width)],potentialRange:[Math.max(player.overall,potential-width),Math.min(99,potential+width)],marketValueRange:[Math.round(value*(1-width*.045)),Math.round(value*(1+width*.045))],talent,opportunity,status:"active",createdAt:new Date().toISOString()};
}

function pickCandidates(candidates,mission,count=4){
  return candidates.filter(player=>matchesMission(player,mission)).sort((a,b)=>{
    const aScore=getPotential(a)+(a.age<=21?7:0)+(getMarketValue(a)<=12000?3:0)+(a.group===mission.priorityGroup?6:0)+(hash(`${mission.id}:${a.id}`)%8);
    const bScore=getPotential(b)+(b.age<=21?7:0)+(getMarketValue(b)<=12000?3:0)+(b.group===mission.priorityGroup?6:0)+(hash(`${mission.id}:${b.id}`)%8);
    return bScore-aScore;
  }).slice(0,count);
}

export function bootstrapScouting(game,candidates){
  const seeded=ensureScoutingState(game);if(seeded.scouting.reports.length||!candidates.length)return seeded;
  return refreshScoutingRecommendations(seeded,candidates);
}

export function refreshScoutingRecommendations(game,candidates){
  const seeded=ensureScoutingState(game);if(!candidates.length)return seeded;
  const needs=getSquadNeeds(seeded);const mission={id:`recommend_${seeded.season}`,group:null,priorityGroup:needs[0]?.group,durationDays:3};
  const fresh=pickCandidates(candidates,mission,5).map(player=>reportFor(player,mission,seeded.scouting.scouts[0],seeded.season,seeded.matchday,"recommendation"));
  const reports=[...seeded.scouting.reports];const recommendationIds=[];
  fresh.forEach(report=>{const index=reports.findIndex(item=>item.playerId===report.playerId);if(index>=0){if(report.confidence>reports[index].confidence)reports[index]=report;recommendationIds.push(reports[index].id);}else{reports.unshift(report);recommendationIds.push(report.id);}});
  return{...seeded,scouting:{...seeded.scouting,reports,recommendations:recommendationIds}};
}

export function createScoutingMission(game,data){
  const seeded=ensureScoutingState(game);const scout=seeded.scouting.scouts.find(item=>item.id===data.scoutId)??seeded.scouting.scouts[0];
  if(!scout||seeded.scouting.missions.some(item=>item.status==="active"&&item.scoutId===scout.id))return seeded;
  const durationDays=Number(data.durationDays)||7;
  const mission={id:`mission_${seeded.season}_${seeded.matchday}_${hash(JSON.stringify(data))}`,label:data.label||`Buscar talento para ${data.group||data.position||"la plantilla"}`,group:data.group||null,position:data.position||null,maxAge:data.maxAge?Number(data.maxAge):null,minOverall:data.minOverall?Number(data.minOverall):null,maxValue:data.maxValue?Number(data.maxValue):null,region:data.region||"España",scoutId:scout.id,scoutName:scout.name,durationDays,startedMatchday:seeded.matchday,completeMatchday:seeded.matchday+Math.max(1,Math.ceil(durationDays/7)),status:"active",progress:0};
  return{...seeded,scouting:{...seeded.scouting,missions:[mission,...seeded.scouting.missions]}};
}

export function advanceScouting(game,candidates,nextMatchday){
  const seeded=ensureScoutingState(game);const scouting=seeded.scouting;if(nextMatchday<=scouting.lastProcessedMatchday)return{game:seeded,news:[]};
  const completed=[];const reports=[...scouting.reports];
  const missions=scouting.missions.map(mission=>{
    if(mission.status!=="active")return mission;
    const elapsed=Math.max(0,nextMatchday-mission.startedMatchday);const required=Math.max(1,mission.completeMatchday-mission.startedMatchday);
    const progress=clamp(Math.round(elapsed/required*100));
    if(nextMatchday<mission.completeMatchday)return{...mission,progress};
    const scout=scouting.scouts.find(item=>item.id===mission.scoutId);const found=pickCandidates(candidates,mission,4);
    found.forEach(player=>{const fresh=reportFor(player,mission,scout,seeded.season,nextMatchday);const index=reports.findIndex(item=>item.playerId===player.id);if(index>=0){if(fresh.confidence>reports[index].confidence)reports[index]=fresh;}else reports.unshift(fresh);});
    completed.push({mission,found});return{...mission,status:"completed",progress:100,completedMatchday:nextMatchday,results:found.map(item=>item.id)};
  });
  const news=completed.map(({mission,found})=>({title:`El scouting completa la misión “${mission.label}”`,summary:`${found.length} jugadores interesantes encontrados${found.filter(item=>getPotential(item)>=85).length?` · ${found.filter(item=>getPotential(item)>=85).length} grandes promesas`:""}.`,importance:found.some(item=>getPotential(item)>=90)?"high":"medium",fingerprint:`scouting-complete:${mission.id}`}));
  return{game:{...seeded,scouting:{...scouting,missions,reports,lastProcessedMatchday:nextMatchday}},news};
}

export function toggleScoutingWatch(game,reportId){
  const seeded=ensureScoutingState(game);const watched=seeded.scouting.watchlist.includes(reportId);return{...seeded,scouting:{...seeded.scouting,watchlist:watched?seeded.scouting.watchlist.filter(id=>id!==reportId):[reportId,...seeded.scouting.watchlist]}};
}

export function registerScoutingSigning(game,playerId){
  const seeded=ensureScoutingState(game);const report=seeded.scouting.reports.find(item=>item.playerId===playerId);if(!report)return seeded;
  const entry={id:`scout_signing_${playerId}_${seeded.season}`,playerId,name:report.player.name,season:String(seeded.season),reportConfidence:report.confidence,estimatedPotential:report.potentialRange,signedMatchday:seeded.matchday,source:report.source};
  return{...seeded,scouting:{...seeded.scouting,history:[entry,...seeded.scouting.history.filter(item=>item.id!==entry.id)],reports:seeded.scouting.reports.map(item=>item.playerId===playerId?{...item,status:"signed"}:item)}};
}
