import { getMarketValue, getPlayerSeasonStats } from "../players/playerProfile.js";

const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,value));
const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;

function migrateArchive(game,legacy){
  const existing=legacy.archive??{};
  const managerHistory=legacy.manager?.history??[];
  const seasons=existing.seasons?.length?existing.seasons:(game.history??[]).map(item=>{
    const managerSeason=managerHistory.find(entry=>String(entry.season)===String(item.season));
    return{id:`season_${item.season}_${game.teamId}`,season:String(item.season),clubId:managerSeason?.clubId??game.teamId,clubName:managerSeason?.clubName??game.name??"Mi club",position:item.pos??managerSeason?.position??0,points:item.pts??0,goalsFor:item.gf??0,goalsAgainst:item.ga??0,prestigeEnd:managerSeason?.prestige??null,prestigeDelta:0,title:managerSeason?.title??null,migrated:true};
  });
  return{
    seasons,
    playerRecords:existing.playerRecords??{},
    prestigeHistory:existing.prestigeHistory??seasons.map(item=>({season:item.season,clubPrestige:item.prestigeEnd,managerPrestige:null})).filter(item=>item.clubPrestige!=null),
    milestones:existing.milestones??[],
  };
}

export const CLUB_PRESTIGE_LEVELS=[
  {max:20,label:"Club Regional",color:"#9ca3af"},{max:40,label:"Club Nacional",color:"#60a5fa"},{max:60,label:"Club Importante",color:"#c9a84c"},{max:80,label:"Club Europeo",color:"#a78bfa"},{max:100,label:"Élite Mundial",color:"#f59e0b"},
];
export const MANAGER_PRESTIGE_LEVELS=[
  {max:20,label:"Entrenador Local",color:"#9ca3af"},{max:40,label:"Entrenador Nacional",color:"#60a5fa"},{max:60,label:"Entrenador Reconocido",color:"#c9a84c"},{max:80,label:"Entrenador Europeo",color:"#a78bfa"},{max:100,label:"Leyenda del Fútbol",color:"#f59e0b"},
];

export const getPrestigeLevel=(value,manager=false)=>(manager?MANAGER_PRESTIGE_LEVELS:CLUB_PRESTIGE_LEVELS).find(level=>value<=level.max)??(manager?MANAGER_PRESTIGE_LEVELS:CLUB_PRESTIGE_LEVELS)[4];

function initialClubPrestige(team){
  const quality=((team?.avg??74)-70)*3.2;
  const finance=Math.log10(Math.max(10,team?.budget??30))*10;
  const fan=(team?.fanbase??2)*3;
  return clamp(Math.round(quality+finance+fan-3),12,90);
}

function sportingTarget(team){
  if(team?.obj==="Campeón")return 3;
  if(team?.obj==="Top 6")return 6;
  if(team?.obj==="Top 10")return 10;
  if(team?.obj==="Mitad tabla")return 14;
  return 17;
}

export function createSeasonObjectives(team,season){
  const target=sportingTarget(team);
  return [
    {id:"sport",type:"sport",label:target<=3?"Luchar por el título":target<=6?"Clasificarse para Europa":target<=10?"Quedar entre los 10 primeros":target<=14?"Consolidarse en mitad de tabla":"Mantener la categoría",target,reward:{prestige:target<=6?5:3,budget:target<=6?8000:4000}},
    {id:"economy",type:"economy",label:"Mantener un balance económico sostenible",target:60,reward:{prestige:2,budget:5000}},
    {id:"development",type:"development",label:"Potenciar y desarrollar jugadores jóvenes",target:2,reward:{prestige:3,budget:3000}},
  ].map(objective=>({...objective,season:String(season),progress:0,completed:false}));
}

export function ensureLegacyState(game,team){
  const legacy=game.legacy??{};
  const clubPrestige=Number.isFinite(legacy.clubPrestige)?legacy.clubPrestige:initialClubPrestige(team);
  return {...game,legacy:{
    clubPrestige,confidence:Number.isFinite(legacy.confidence)?legacy.confidence:68,
    objectives:legacy.objectives?.length?legacy.objectives:createSeasonObjectives(team,game.season??"2025"),
    monthlyReports:legacy.monthlyReports??[],trophies:legacy.trophies??[],records:legacy.records??{},archive:migrateArchive(game,legacy),
    manager:{name:"Oscar Funes",prestige:10,seasons:0,titles:0,wins:0,draws:0,losses:0,clubs:[team?.id].filter(Boolean),history:[],...(legacy.manager??{})},
    lastEvaluationMatchday:legacy.lastEvaluationMatchday??0,
  }};
}

function sortedStandings(standings=[]){
  return[...standings].sort((a,b)=>b.points-a.points||b.goalDifference-a.goalDifference||b.goalsFor-a.goalsFor);
}

function userResults(game){
  const fixtures=(game.fixtures??[]).filter(item=>item.played&&(item.homeTeamId===game.teamId||item.awayTeamId===game.teamId));
  let wins=0,draws=0,losses=0,biggestWin=null;
  const compact=fixtures.map(item=>{
    const home=item.homeTeamId===game.teamId;
    const own=home?item.homeGoals:item.awayGoals;const rival=home?item.awayGoals:item.homeGoals;
    if(own>rival)wins++;else if(own===rival)draws++;else losses++;
    const margin=own-rival;
    if(margin>0&&(!biggestWin||margin>biggestWin.margin))biggestWin={fixtureId:item.id,matchday:item.matchday,homeTeamId:item.homeTeamId,awayTeamId:item.awayTeamId,homeGoals:item.homeGoals,awayGoals:item.awayGoals,margin};
    return{id:item.id,matchday:item.matchday,homeTeamId:item.homeTeamId,awayTeamId:item.awayTeamId,homeGoals:item.homeGoals,awayGoals:item.awayGoals};
  });
  return{wins,draws,losses,biggestWin,fixtures:compact};
}

function seasonPlayers(game,title){
  const transferred=(game.transfers??[]).filter(item=>String(item.season??game.season)===String(game.season)).map(item=>item.player).filter(Boolean);
  const squad=[...(game.players??[]),...transferred].filter((player,index,array)=>array.findIndex(item=>item.id===player.id)===index);
  return squad.map(player=>{
    const stats=getPlayerSeasonStats(player,game,game.teamId);
    const rating=Number(stats.averageRating)||0;
    return{id:player.id,name:player.name,pos:player.pos,group:player.group,age:player.age,nat:player.nat,overall:player.overall,marketValue:getMarketValue(player),academy:Boolean(player.academyData),academyRegion:player.academyData?.region??null,...stats,averageRating:rating,score:stats.appearances*1.5+stats.goals*5+stats.assists*3+stats.cleanSheets*2+rating*4+(title?8:0)};
  });
}

function bestOf(players,key){return[...players].sort((a,b)=>number(b[key])-number(a[key])||number(b.averageRating)-number(a.averageRating))[0]??null;}

function seasonFinances(game){
  const income=(game.incomeLog??[]).reduce((sum,item)=>sum+number(item.total),0);
  const transfers=(game.transfers??[]).filter(item=>String(item.season??game.season)===String(game.season));
  const transferSpend=transfers.filter(item=>item.type==="buy").reduce((sum,item)=>sum+number(item.cost??item.value),0);
  const transferIncome=transfers.filter(item=>item.type==="sell").reduce((sum,item)=>sum+number(item.cost??item.value),0);
  const wages=(game.players??[]).reduce((sum,item)=>sum+number(item.salary),0)*52;
  return{income,transferSpend,transferIncome,wages,balance:number(game.budgetAdjustment),netTransfers:transferIncome-transferSpend};
}

function mergePlayerRecords(previous,players,season,title){
  const next={...previous};
  players.forEach(player=>{
    const old=next[player.id]??{};
    next[player.id]={...old,id:player.id,name:player.name,pos:player.pos,group:player.group,nat:player.nat,academy:player.academy,academyRegion:player.academyRegion,appearances:number(old.appearances)+player.appearances,starts:number(old.starts)+player.starts,minutes:number(old.minutes)+player.minutes,goals:number(old.goals)+player.goals,assists:number(old.assists)+player.assists,cleanSheets:number(old.cleanSheets)+player.cleanSheets,titles:number(old.titles)+(title?1:0),seasons:Array.from(new Set([...(old.seasons??[]),String(season)])),maxOverall:Math.max(number(old.maxOverall),number(player.overall)),lastOverall:player.overall,lastRating:player.averageRating,legacyScore:number(old.legacyScore)+player.score};
  });
  return next;
}

function uniqueById(items){return items.filter((item,index,array)=>array.findIndex(candidate=>candidate.id===item.id)===index);}

function archiveSeason(game,legacy,{team,position,title,prestigeStart,prestigeDelta}){
  const archive=legacy.archive??migrateArchive(game,legacy);
  if(archive.seasons.some(item=>String(item.season)===String(game.season)&&item.clubId===game.teamId))return archive;
  const table=sortedStandings(game.standings);
  const row=table.find(item=>item.teamId===game.teamId)??{};
  const results=userResults(game);
  const players=seasonPlayers(game,title);
  const topScorer=bestOf(players,"goals");const topAssister=bestOf(players,"assists");const playerOfYear=bestOf(players,"score");
  const seasonTransfers=(game.transfers??[]).filter(item=>String(item.season??game.season)===String(game.season));
  const buys=seasonTransfers.filter(item=>item.type==="buy");
  const sales=seasonTransfers.filter(item=>item.type==="sell");
  const bestSigning=[...buys].sort((a,b)=>number(b.player?.overall)-number(a.player?.overall)||number(b.value??b.cost)-number(a.value??a.cost))[0]??null;
  const biggestSale=[...sales].sort((a,b)=>number(b.value??b.cost)-number(a.value??a.cost))[0]??null;
  const squadValue=(game.players??[]).reduce((sum,item)=>sum+getMarketValue(item),0);
  const promotedYouth=(game.youth?.promotions??[]).filter(item=>String(item.season)===String(game.season)).length;
  const season={id:`season_${game.season}_${game.teamId}`,season:String(game.season),clubId:game.teamId,clubName:team?.name??game.name??"Mi club",position,points:number(row.points),goalsFor:number(row.goalsFor),goalsAgainst:number(row.goalsAgainst),goalDifference:number(row.goalDifference),prestigeStart:Math.round(prestigeStart),prestigeEnd:Math.round(legacy.clubPrestige),prestigeDelta:Math.round(prestigeDelta),confidence:Math.round(legacy.confidence),title:title?.name??null,titleId:title?.id??null,standings:table.map((item,index)=>({position:index+1,teamId:item.teamId,played:item.played,won:item.won,drawn:item.drawn,lost:item.lost,goalsFor:item.goalsFor,goalsAgainst:item.goalsAgainst,goalDifference:item.goalDifference,points:item.points})),results,players,topScorer,topAssister,playerOfYear,bestSigning:bestSigning?{playerId:bestSigning.player?.id,name:bestSigning.player?.name,cost:number(bestSigning.cost??bestSigning.value),overall:bestSigning.player?.overall}:null,biggestSale:biggestSale?{playerId:biggestSale.player?.id,name:biggestSale.player?.name,value:number(biggestSale.value??biggestSale.cost),overall:biggestSale.player?.overall}:null,finances:seasonFinances(game),squadValue,promotedYouth};
  const milestones=[];
  if(title)milestones.push({id:`milestone_title_${game.season}`,type:"title",icon:"🏆",season:String(game.season),title:"Primer gran título" ,summary:`${team?.name??"El club"} conquista ${title.name}.`});
  if(position<=6)milestones.push({id:`milestone_europe_${game.season}`,type:"europe",icon:"🌍",season:String(game.season),title:"Clasificación europea",summary:`El equipo termina en la ${position}.ª posición.`});
  if(results.biggestWin)milestones.push({id:`milestone_win_${game.season}`,type:"result",icon:"⚽",season:String(game.season),title:"Mayor victoria de la temporada",summary:`Triunfo por ${results.biggestWin.margin} goles de diferencia en la jornada ${results.biggestWin.matchday}.`});
  return{seasons:[season,...archive.seasons],playerRecords:mergePlayerRecords(archive.playerRecords,players,game.season,title),prestigeHistory:[{season:String(game.season),clubPrestige:Math.round(legacy.clubPrestige),managerPrestige:Math.round(legacy.manager.prestige)},...(archive.prestigeHistory??[]).filter(item=>String(item.season)!==String(game.season))],milestones:uniqueById([...milestones,...(archive.milestones??[])])};
}

function positionOf(standings,teamId){
  const sorted=[...standings].sort((a,b)=>b.points-a.points||b.goalDifference-a.goalDifference||b.goalsFor-a.goalsFor);
  return sorted.findIndex(row=>row.teamId===teamId)+1;
}

export function evaluateLegacyMatchday(game,{team,result,income,trainingReport,matchday}){
  const seeded=ensureLegacyState(game,team);
  const legacy=seeded.legacy;
  const position=positionOf(game.standings,game.teamId);
  const sportObjective=legacy.objectives.find(item=>item.type==="sport");
  const sportScore=clamp(100-(Math.max(0,position-(sportObjective?.target??10))*11)+(position<(sportObjective?.target??10)?8:0));
  const budgetK=(team?.budget??50)*1000;
  const budgetHealth=clamp(55+((game.budgetAdjustment??0)/Math.max(1,budgetK))*80);
  const improvedPlayers=game.players.filter(player=>player.overall>(player.seasonStartOverall??player.overall)).length;
  const developmentScore=clamp(improvedPlayers*32+(trainingReport?.improved?.length??0)*8+20);
  const overall=Math.round(sportScore*.55+budgetHealth*.25+developmentScore*.20);
  const resultDelta=result==="win"?1.15:result==="draw"?.15:-.85;
  const confidenceDelta=clamp((overall-60)/22,-1.5,1.5)+resultDelta;
  const confidence=clamp(legacy.confidence+confidenceDelta);
  const attendanceBonus=(income?.occupancy??0)>=.9?.08:0;
  const developmentBonus=Math.min(.35,(trainingReport?.improved?.length??0)*.12);
  const clubPrestige=clamp(legacy.clubPrestige+(result==="win"?.12:result==="loss"?-.04:0)+attendanceBonus+developmentBonus);
  const managerPrestige=clamp(legacy.manager.prestige+(result==="win"?.16:result==="draw"?.04:-.03)+developmentBonus*.5);
  const manager={...legacy.manager,prestige:managerPrestige,wins:legacy.manager.wins+(result==="win"?1:0),draws:legacy.manager.draws+(result==="draw"?1:0),losses:legacy.manager.losses+(result==="loss"?1:0)};
  const objectives=legacy.objectives.map(objective=>objective.type==="sport"?{...objective,progress:sportScore}:objective.type==="economy"?{...objective,progress:Math.round(budgetHealth)}:{...objective,progress:Math.min(100,Math.round(improvedPlayers/Math.max(1,objective.target)*100))});
  const report={id:`board_${game.season}_${matchday}`,season:String(game.season),matchday,sport:Math.round(sportScore),economy:Math.round(budgetHealth),development:Math.round(developmentScore),overall,confidence:Math.round(confidence),position,createdAt:new Date().toISOString()};
  const isMonthly=matchday%4===0&&!legacy.monthlyReports.some(item=>item.id===report.id);
  const monthlyReports=isMonthly?[report,...legacy.monthlyReports].slice(0,60):legacy.monthlyReports;
  const news=[];
  if(isMonthly){
    if(overall>=78)news.push({title:"La directiva respalda el rumbo del equipo",summary:`La valoración mensual alcanza el ${overall}%.`,importance:"medium",fingerprint:`support:${game.season}:${matchday}`});
    else if(confidence<35)news.push({title:"La directiva muestra su preocupación por los resultados",summary:`La confianza en el entrenador cae hasta el ${Math.round(confidence)}%.`,importance:"high",fingerprint:`concern:${game.season}:${matchday}`});
    else if(sportScore>=65)news.push({title:"El objetivo deportivo sigue al alcance",summary:`El equipo ocupa la ${position}.ª posición.`,importance:"medium",fingerprint:`objective-alive:${game.season}:${matchday}`});
  }
  return {legacy:{...legacy,clubPrestige,confidence,objectives,monthlyReports,manager,lastEvaluationMatchday:matchday},report:isMonthly?report:null,news};
}

export function getJobRisk(confidence){
  if(confidence>50)return{label:"Normal",color:"#22c55e",icon:"🟢"};
  if(confidence>30)return{label:"Advertencia",color:"#eab308",icon:"🟡"};
  if(confidence>15)return{label:"Ultimátum",color:"#f97316",icon:"🟠"};
  return{label:"Despido",color:"#ef4444",icon:"🔴"};
}

export function finalizeLegacySeason(game,{team,position}){
  const seeded=ensureLegacyState(game,team);let {legacy}=seeded;
  const alreadyArchived=legacy.archive?.seasons?.some(item=>String(item.season)===String(game.season)&&item.clubId===game.teamId);
  if(alreadyArchived)return{legacy,budgetReward:0,prestigeDelta:0,managerDelta:0,title:legacy.trophies.find(item=>String(item.season)===String(game.season))??null,historyEntry:legacy.manager.history.find(item=>String(item.season)===String(game.season))??null};
  const prestigeStart=legacy.clubPrestige;
  let prestigeDelta=position===1?15:position<=4?8:position<=6?5:position<=10?2:position>=18?-15:-3;
  let managerDelta=position===1?10:position<=4?6:position<=6?4:position<=10?1:position>=18?-8:-2;
  const developed=game.players.filter(player=>player.age<=23&&player.overall>(player.seasonStartOverall??player.overall)).length;
  prestigeDelta+=Math.min(6,developed*3);
  if((game.budgetAdjustment??0)>0)prestigeDelta+=2;
  const objectives=legacy.objectives.map(objective=>({...objective,completed:objective.progress>=70}));
  const completed=objectives.filter(objective=>objective.completed);
  const budgetReward=completed.reduce((sum,objective)=>sum+(objective.reward?.budget??0),0);
  prestigeDelta+=completed.reduce((sum,objective)=>sum+(objective.reward?.prestige??0),0);
  const title=position===1?{id:`liga_${game.season}`,type:"Liga",name:"Campeón de Liga",season:String(game.season),icon:"🏆",clubId:game.teamId,clubName:team?.name,managerName:legacy.manager.name}:null;
  const trophies=title?[title,...legacy.trophies]:legacy.trophies;
  const historyEntry={season:String(game.season),clubId:game.teamId,clubName:team?.name,position,prestige:Math.round(clamp(legacy.clubPrestige+prestigeDelta)),confidence:Math.round(legacy.confidence),title:title?.name??null};
  const manager={...legacy.manager,prestige:clamp(legacy.manager.prestige+managerDelta),seasons:legacy.manager.seasons+1,titles:legacy.manager.titles+(title?1:0),history:[historyEntry,...legacy.manager.history]};
  legacy={...legacy,clubPrestige:clamp(legacy.clubPrestige+prestigeDelta),confidence:clamp(legacy.confidence+(position<=(sportingTarget(team))?8:-7)),objectives,trophies,manager,records:{...legacy.records,bestPosition:Math.min(legacy.records.bestPosition??99,position),mostPoints:Math.max(legacy.records.mostPoints??0,game.standings.find(row=>row.teamId===game.teamId)?.points??0)}};
  legacy={...legacy,archive:archiveSeason(game,legacy,{team,position,title,prestigeStart,prestigeDelta})};
  return{legacy,budgetReward,prestigeDelta,managerDelta,title,historyEntry};
}

export function startNextLegacySeason(legacy,team,season){
  return{...legacy,objectives:createSeasonObjectives(team,season),lastEvaluationMatchday:0};
}
