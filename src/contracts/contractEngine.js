import { staffModifier } from "../staff/staffEngine.js";

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export const CONTRACT_ROLES=["Estrella","Titular","Rotación","Promesa","Suplente"];
const ROLE_RANK={Suplente:0,Promesa:1,Rotación:2,Titular:3,Estrella:4};

export function ensureContractState(game){
  return {...game,contracts:{renewals:[],notifications:[],...(game.contracts??{})}};
}

export function suggestedRenewalSalary(player, game = null){
  const current=player.salary??16;
  const base=player.overall>=88?260:player.overall>=84?170:player.overall>=80?105:player.overall>=76?65:player.overall>=72?38:player.overall>=68?20:10;
  const ageMod=player.age<=22?1.08:player.age>=32?.78:1;
  const roleMod={Estrella:1.28,Titular:1.08,Rotación:.92,Promesa:.72,Suplente:.62}[player.squadRole??"Rotación"]??1;
  const moodMod=((player.happiness??70)<45||(player.managerTrust??70)<45)?1.12:((player.morale??70)>=80?.96:1);
  const negotiationMod=Math.max(.94,1-Math.max(0,staffModifier(game,"sportingDirector","negotiation",.08)));
  return Math.max(current,Math.round(base*ageMod*roleMod*moodMod*negotiationMod));
}

export function getActiveRenewal(game,playerId){
  return (game.contracts?.renewals??[]).find(item=>item.playerId===playerId&&!["withdrawn","completed"].includes(item.status));
}

export function createRenewalOffer(game,{playerId,salary,years,role}){
  const current=ensureContractState(game);
  const player=current.players.find(item=>item.id===playerId);
  if(!player)return current;
  const previous=getActiveRenewal(current,playerId);
  const offer={
    id:previous?.id??`renewal-${Date.now()}-${playerId}`,
    playerId,playerName:player.name,
    salary:Math.max(1,Math.round(salary)),
    years:clamp(Math.round(years),1,5),
    role:role??player.squadRole??"Rotación",
    currentSalary:player.salary??0,
    currentContractEnd:player.contractEnd,
    createdMatchday:current.matchday,
    resolveMatchday:(current.matchday??1)+1+Math.floor(Math.random()*5),
    status:"pending",
    counterSalary:null,counterYears:null,counterRole:null,
  };
  return {...current,contracts:{...current.contracts,renewals:[offer,...(current.contracts.renewals??[]).filter(item=>item.id!==offer.id)]}};
}

export function withdrawRenewalOffer(game,offerId){
  const current=ensureContractState(game);
  return {...current,contracts:{...current.contracts,renewals:current.contracts.renewals.map(item=>item.id===offerId?{...item,status:"withdrawn"}:item)}};
}

export function acceptRenewalCounter(game,offerId){
  const current=ensureContractState(game);
  return {...current,contracts:{...current.contracts,renewals:current.contracts.renewals.map(item=>item.id===offerId?{...item,salary:item.counterSalary??item.salary,years:item.counterYears??item.years,role:item.counterRole??item.role,status:"accepted",counterSalary:null,counterYears:null,counterRole:null}:item)}};  
}

export function completeRenewal(game,offerId){
  const current=ensureContractState(game);
  const offer=(current.contracts.renewals??[]).find(item=>item.id===offerId);
  if(!offer||offer.status!=="accepted")return current;
  const newEnd=String(Number(current.season??2025)+Number(offer.years??3));
  return {
    ...current,
    players:current.players.map(player=>player.id===offer.playerId?{...player,salary:offer.salary,contractYears:offer.years,contractEnd:newEnd,squadRole:offer.role,releaseClause:Math.round((player.marketValue??player.overall*500)*1.9)}:player),
    transfers:[...(current.transfers??[]),{id:`renewal-${offer.id}`,type:"renewal",player:{id:offer.playerId,name:offer.playerName},fromTeamId:current.teamId,toTeamId:current.teamId,value:0,season:String(current.season),matchday:current.matchday}],
    contracts:{...current.contracts,renewals:current.contracts.renewals.map(item=>item.id===offerId?{...item,status:"completed",completedMatchday:current.matchday}:item)}
  };
}

export function advanceRenewals(game){
  const current=ensureContractState(game);
  const matchday=current.matchday??1;
  const renewals=(current.contracts.renewals??[]).map(item=>{
    if(item.status!=="pending"||item.resolveMatchday>matchday)return item;
    const player=current.players.find(p=>p.id===item.playerId);
    if(!player)return {...item,status:"rejected"};
    const expected= suggestedRenewalSalary(player,current);
    const negotiationBoost=Math.max(0,staffModifier(current,"sportingDirector","negotiation",.08));
    const salaryRatio=((item.salary??0)/Math.max(1,expected))+negotiationBoost;
    const yearsWanted=player.age>=31?2:player.age<=23?4:3;
    const roleRank=ROLE_RANK[item.role]??2;
    const desiredRole=player.overall>=84?"Estrella":player.overall>=78?"Titular":player.age<=21?"Promesa":"Rotación";
    const moodPenalty=((player.happiness??70)<40||(player.managerTrust??70)<38)?.06:0;
    if(salaryRatio>=.98+moodPenalty&&item.years>=Math.min(yearsWanted,3)&&roleRank>=(ROLE_RANK[desiredRole]??2))return {...item,status:"accepted"};
    if(salaryRatio<.78)return {...item,status:"rejected"};
    if(salaryRatio<.96)return {...item,status:"salaryCounter",counterSalary:Math.round(expected*(1+Math.random()*.08))};
    if(item.years<yearsWanted&&player.age<30)return {...item,status:"yearsCounter",counterYears:yearsWanted};
    if(roleRank<(ROLE_RANK[desiredRole]??2))return {...item,status:"roleCounter",counterRole:desiredRole};
    return Math.random()<.85?{...item,status:"accepted"}:{...item,status:"rejected"};
  });
  return {...current,contracts:{...current.contracts,renewals}};
}
