import { staffModifier } from "../staff/staffEngine.js";

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function ensureTransferState(game){
  return {...game,transferMarket:{offers:[],incomingOffers:[],listings:[],notifications:[],aiTransfers:[],lastAiMatchday:0,marketPulse:[],...(game.transferMarket??{})}};
}

const listingReasons=["No cuenta para el entrenador","Quiere salir","Último año de contrato","Problemas salariales","Exceso de jugadores en su posición"];
const groups=["POR","DEF","MED","DEL"];
const groupMin={POR:2,DEF:7,MED:6,DEL:5};
const groupMax={POR:3,DEF:9,MED:9,DEL:7};
const groupLabel={POR:"portería",DEF:"defensa",MED:"centro del campo",DEL:"ataque"};

function marketValue(player){
  const base=player.overall>=88?80000:player.overall>=84?50000:player.overall>=80?30000:player.overall>=76?18000:player.overall>=72?10000:player.overall>=68?5000:2000;
  const ageMod = player.age <= 23 ? 1.35 : player.age <= 27 ? 1.15 : player.age <= 30 ? 1 : (player.age <= 33 ? .72 : .42);
  return Math.max(500,Math.round(base*ageMod));
}

function squadBalance(squad=[]){
  const counts=Object.fromEntries(groups.map(group=>[group,squad.filter(player=>player.group===group).length]));
  return{counts,needs:groups.filter(group=>counts[group]<(groupMin[group]??0)),surplus:groups.filter(group=>counts[group]>(groupMax[group]??99))};
}

function chooseWeighted(items,weightFn){
  if(!items.length)return null;
  const weighted=items.map(item=>({item,weight:Math.max(.01,weightFn(item))}));
  const total=weighted.reduce((sum,row)=>sum+row.weight,0);
  let roll=Math.random()*total;
  return (weighted.find(row=>(roll-=row.weight)<=0)??weighted[weighted.length-1]).item;
}

function stableSort(players,seed){return[...players].sort((a,b)=>String(a.id+seed).localeCompare(String(b.id+seed)));}
function isCorePlayer(player,team){return(player.overall??0)>=Math.max(80,(team?.avg??76)+3)||player.squadRole==="Estrella";}

function renewalCandidate(squad,season,team){
  return chooseWeighted(squad.filter(player=>Number(player.contractEnd??9999)<=Number(season)+1&&isCorePlayer(player,team)&&player.age<34),player=>(player.overall??70)+(player.age<=24?8:0));
}

function saleCandidate(squad,season,team){
  const balance=squadBalance(squad);
  const candidates=squad.filter(player=>{
    if(player.group==="POR"&&balance.counts.POR<=2)return false;
    if((balance.counts[player.group]??0)<=groupMin[player.group])return false;
    if(isCorePlayer(player,team)&&Number(player.contractEnd??9999)>Number(season)+1)return false;
    return player.overall<=84&&(player.age>=30||Number(player.contractEnd??9999)<=Number(season)+1||balance.surplus.includes(player.group)||player.marketStatus==="transfer");
  });
  return chooseWeighted(candidates,player=>(player.age>=31?18:4)+(Number(player.contractEnd??9999)<=Number(season)+1?15:0)+(balance.surplus.includes(player.group)?12:0)+(85-(player.overall??70)));
}

function loanCandidate(squad){
  const balance=squadBalance(squad);
  return chooseWeighted(squad.filter(player=>player.age<=24&&player.overall<=79&&player.group!=="POR"&&(balance.counts[player.group]??0)>groupMin[player.group]),player=>(player.potential??player.overall+4)-(player.overall??65)+6);
}

function targetForNeed(buyer,buyerSquad,teams,squads,game){
  const balance=squadBalance(buyerSquad);
  const wantedGroup=balance.needs[0]??groups.find(group=>buyerSquad.filter(player=>player.group===group).length<groupMin[group]+1)??groups[Math.floor(Math.random()*groups.length)];
  const maxValue=(buyer.budget??40)*850;
  const candidates=teams.filter(team=>team.id!==buyer.id&&team.id!==game.teamId).flatMap(team=>(squads[team.id]??[]).filter(player=>{
    if(player.group!==wantedGroup)return false;
    if(player.overall>(buyer.avg??76)+8)return false;
    if(marketValue(player)>maxValue)return false;
    const sellerBalance=squadBalance(squads[team.id]??[]);
    if((sellerBalance.counts[player.group]??0)<=groupMin[player.group])return false;
    const sellable=Number(player.contractEnd??9999)<=Number(game.season)+1||sellerBalance.surplus.includes(player.group)||player.age>=30||player.overall<=(team.avg??76)-2||player.marketStatus==="transfer";
    return sellable&&!isCorePlayer(player,team);
  }).map(player=>({player,fromTeam:team,score:(player.overall??70)+(player.age<=24?8:0)+(Number(player.contractEnd??9999)<=Number(game.season)+1?5:0)})));
  return chooseWeighted(candidates,item=>item.score);
}

export function refreshTransferListings(game,teams,squads,force=false){
  const current=ensureTransferState(game);if(!force&&(current.transferMarket.listings??[]).length)return current;
  const listings=[];
  teams.filter(team=>team.id!==game.teamId).forEach((team,teamIndex)=>{
    const squad=squads[team.id]??[];
    const balance=squadBalance(squad);
    const safeFallback=stableSort(squad.filter(player=>player.overall<=84&&player.group!=="POR"&&(balance.counts[player.group]??0)>groupMin[player.group]&&!isCorePlayer(player,team)),team.id)[0];
    const sale=saleCandidate(squad,game.season,team)??safeFallback;
    const loan=loanCandidate(squad.filter(player=>player.id!==sale?.id));
    const expiring=stableSort(squad.filter(player=>Number(player.contractEnd??9999)<=Number(game.season)+1&&player.id!==sale?.id&&player.id!==loan?.id),`${team.id}:expiring`)[0];
    if(sale){const value=marketValue(sale);listings.push({id:`listing-sale-${game.season}-${sale.id}`,type:"transfer",playerId:sale.id,teamId:team.id,askingPrice:Math.round(value*(.88+(teamIndex%5)*.06)),reason:sale.marketStatus==="transfer"?"Transferible":Number(sale.contractEnd??9999)<=Number(game.season)+1?"Último año de contrato":listingReasons[teamIndex%listingReasons.length],season:String(game.season)});}
    if(loan)listings.push({id:`listing-loan-${game.season}-${loan.id}`,type:"loan",playerId:loan.id,teamId:team.id,wageCoverage:[40,50,60,75,100][teamIndex%5],duration:1,optionType:teamIndex%3===0?"purchase":teamIndex%7===0?"obligation":"none",optionPrice:Math.round(marketValue(loan)*1.05),season:String(game.season)});
    if(expiring)listings.push({id:`listing-contract-${game.season}-${expiring.id}`,type:"transfer",playerId:expiring.id,teamId:team.id,askingPrice:Math.round(marketValue(expiring)*.72),reason:"Último año de contrato",season:String(game.season),opportunity:true});
  });
  return {...current,transferMarket:{...current.transferMarket,listings}};
}

export function setUserMarketStatus(game,playerId,status){
  const current=ensureTransferState(game);return {...current,players:current.players.map(player=>player.id===playerId?{...player,marketStatus:player.marketStatus===status?null:status,morale:Math.max(20,(player.morale??70)-(player.marketStatus===status?0:status==="transfer"?4:2))}:player)};
}

export function createClubOffer(game,{player,fromTeamId,amount,dealType="transfer",listingId=null}){
  const current=ensureTransferState(game);const offers=current.transferMarket.offers??[];
  const previous=offers.find(item=>item.playerId===player.id&&!["completed","withdrawn","rejected"].includes(item.status));
  const offer={
    id:previous?.id??`offer-${Date.now()}-${player.id}`,playerId:player.id,playerName:player.name,
    fromTeamId,amount:Math.max(1,Math.round(amount)),marketValue:Math.max(1,Math.round(player.marketValue??amount)),dealType,listingId,
    status:"pendingClub",createdMatchday:game.matchday,resolveMatchday:game.matchday+1,
    salary:previous?.salary??player.salary,expectedSalary:player.expectedSalary??player.salary,years:previous?.years??3,role:previous?.role??"Rotación",responseDays:1+Math.floor(Math.random()*3),counterAmount:null,counterSalary:null,
  };
  return {...current,transferMarket:{...current.transferMarket,offers:[offer,...offers.filter(item=>item.id!==offer.id)]}};
}

export function createFreeAgentOffer(game,{player,salary,years,role}){
  const current=ensureTransferState(game);const offers=current.transferMarket.offers??[];
  const previous=offers.find(item=>item.playerId===player.id&&!["completed","withdrawn","rejected","playerRejected"].includes(item.status));
  const offer={
    id:previous?.id??`offer-free-${Date.now()}-${player.id}`,playerId:player.id,playerName:player.name,
    fromTeamId:"agente_libre",amount:0,marketValue:Math.max(0,Math.round(player.marketValue??0)),dealType:"free",listingId:null,
    status:"pendingPlayer",createdMatchday:game.matchday,resolveMatchday:game.matchday+1,
    salary:Math.max(1,Math.round(salary)),expectedSalary:player.expectedSalary??player.salary??salary,years:clamp(Math.round(years),1,5),role:role??"Rotación",responseDays:1+Math.floor(Math.random()*5),counterAmount:null,counterSalary:null,
  };
  return {...current,transferMarket:{...current.transferMarket,offers:[offer,...offers.filter(item=>item.id!==offer.id)]}};
}

export function acceptClubCounter(game,offerId){
  const current=ensureTransferState(game);return {...current,transferMarket:{...current.transferMarket,offers:current.transferMarket.offers.map(item=>item.id===offerId?{...item,amount:item.counterAmount,status:"clubAccepted",counterAmount:null}:item)}};
}

export function createContractOffer(game,{offerId,salary,years,role}){
  const current=ensureTransferState(game);return {...current,transferMarket:{...current.transferMarket,offers:current.transferMarket.offers.map(item=>item.id===offerId?{...item,salary:Math.max(1,Math.round(salary)),years:clamp(Math.round(years),1,5),role:role??"Rotación",status:"pendingPlayer",resolveMatchday:game.matchday+1}:item)}};
}

export function acceptPlayerCounter(game,offerId){
  const current=ensureTransferState(game);return {...current,transferMarket:{...current.transferMarket,offers:current.transferMarket.offers.map(item=>item.id===offerId?{...item,salary:item.counterSalary,status:"ready",counterSalary:null}:item)}};
}

export function withdrawOffer(game,offerId){
  const current=ensureTransferState(game);return {...current,transferMarket:{...current.transferMarket,offers:current.transferMarket.offers.map(item=>item.id===offerId?{...item,status:"withdrawn"}:item)}};
}

export function completeOffer(game,offerId){
  const current=ensureTransferState(game);return {...current,transferMarket:{...current.transferMarket,offers:current.transferMarket.offers.map(item=>item.id===offerId?{...item,status:"completed"}:item)}};
}

export function advanceTransferNegotiations(game){
  const current=ensureTransferState(game);const matchday=current.matchday??1;
  const negotiationBoost=Math.max(0,staffModifier(current,"sportingDirector","negotiation",.08));
  const offers=current.transferMarket.offers.map(item=>{
    if(item.resolveMatchday>matchday)return item;
    if(item.status==="pendingClub"){
      const competitionChance = clamp(.07 + (item.marketValue >= 30000 ? .08 : 0) + (item.marketValue >= 50000 ? .08 : 0) + (item.dealType === "loan" ? .03 : 0), .05, .28);
      if(Math.random()<competitionChance)return {...item,status:"outbid",outbidAmount:Math.round(item.amount*(1.05+Math.random()*.16))};
      const ratio=item.amount/Math.max(1,item.marketValue)+negotiationBoost;
      if(item.dealType==="loan"&&ratio>=.05)return {...item,status:"clubAccepted"};
      if(ratio>=.98)return {...item,status:"clubAccepted"};
      if(ratio>=.78)return {...item,status:"clubCounter",counterAmount:Math.round(item.marketValue*(1.02+Math.random()*.1))};
      return {...item,status:"rejected"};
    }
    if(item.status==="pendingPlayer"){
      const expected=Math.max(8,item.salary??8);const baseline=Math.max(8,item.expectedSalary??expected);
      const ratio=expected/baseline+negotiationBoost;
      if(ratio>=.96&&["Estrella","Titular","Rotación"].includes(item.role))return {...item,status:"ready"};
      if(ratio>=.78)return Math.random()<.35?{...item,status:"roleCounter",counterRole:item.role==="Promesa"?"Rotación":"Titular"}:{...item,status:"playerCounter",counterSalary:Math.round(baseline*(1+Math.random()*.08))};
      return {...item,status:"playerRejected"};
    }
    return item;
  });
  return {...current,transferMarket:{...current.transferMarket,offers}};
}

export function acceptRoleCounter(game,offerId){const current=ensureTransferState(game);return{...current,transferMarket:{...current.transferMarket,offers:current.transferMarket.offers.map(item=>item.id===offerId?{...item,role:item.counterRole,status:"ready",counterRole:null}:item)}};}

export function resolveIncomingOffer(game,offerId,decision){const current=ensureTransferState(game);return{...current,transferMarket:{...current.transferMarket,incomingOffers:current.transferMarket.incomingOffers.map(item=>item.id===offerId?{...item,status:decision}:item)}};}

export function maybeCreateIncomingOffer(game,teams){
  const current=ensureTransferState(game);const candidates=current.players.filter(player=>player.marketStatus&&!current.transferMarket.incomingOffers.some(item=>item.playerId===player.id&&item.status==="pending"));
  if(!candidates.length||Math.random()>.42)return current;const player=candidates[Math.floor(Math.random()*candidates.length)];const buyers=teams.filter(team=>team.id!==game.teamId);const buyer=buyers[Math.floor(Math.random()*buyers.length)];
  const value=marketValue(player);
  const offer={id:`incoming-${game.season}-${game.matchday}-${player.id}`,playerId:player.id,playerName:player.name,fromTeamId:game.teamId,toTeamId:buyer.id,type:player.marketStatus==="loan"?"loan":"transfer",amount:player.marketStatus==="loan"?Math.round(value*.06):Math.round(value*(.88+Math.random()*.25)),status:"pending",createdMatchday:game.matchday};
  return{...current,transferMarket:{...current.transferMarket,incomingOffers:[offer,...current.transferMarket.incomingOffers]}};
}

export function maybeCreateAITransfer(game,teams,squads){
  const current=ensureTransferState(game);const market=current.transferMarket;const matchday=current.matchday??1;
  const isWindow=matchday<=8||matchday>=31;
  if(matchday<2||matchday-(market.lastAiMatchday??0)<(isWindow?1:3)||Math.random()>(isWindow ? .82 : .46))return current;
  const clubs=teams.filter(team=>team.id!==game.teamId&&(squads[team.id]??[]).length>16);
  if(clubs.length<2)return current;
  const needy=clubs.map(team=>({team,balance:squadBalance(squads[team.id]??[])})).filter(row=>row.balance.needs.length).map(row=>row.team);
  const buyer=(needy.length&&Math.random()<.62)?needy[Math.floor(Math.random()*needy.length)]:clubs[Math.floor(Math.random()*clubs.length)];
  const buyerSquad=squads[buyer.id]??[];
  const renewal=renewalCandidate(buyerSquad,game.season,buyer);
  if(renewal&&Math.random()<.28){
    const years=renewal.age>=31?2:renewal.age<=23?4:3;
    const updated={...renewal,contractEnd:String(Number(game.season)+years),salary:Math.round((renewal.salary??20)*(1.08+Math.random()*.16)),squadRole:renewal.overall>=84?"Estrella":renewal.overall>=78?"Titular":renewal.squadRole??"Rotación"};
    squads[buyer.id]=buyerSquad.map(player=>player.id===renewal.id?updated:player);
    const transfer={id:`ai-renewal-${game.season}-${matchday}-${renewal.id}`,type:"renewal",player:updated,fromTeamId:buyer.id,toTeamId:buyer.id,value:0,season:String(game.season),matchday,reason:"Renovación estratégica"};
    return {...current,transfers:[...(current.transfers??[]),transfer],transferMarket:{...market,lastAiMatchday:matchday,aiTransfers:[transfer,...(market.aiTransfers??[])],marketPulse:[transfer,...(market.marketPulse??[])]}};
  }
  const target=targetForNeed(buyer,buyerSquad,clubs,squads,game);
  if(target&&Math.random()<.64){
    const {player,fromTeam}=target;const value=marketValue(player);const fee=Math.round(value*(Number(player.contractEnd??9999)<=Number(game.season)+1 ? .72 : .95+Math.random()*.2));
    squads[fromTeam.id]=(squads[fromTeam.id]??[]).filter(item=>item.id!==player.id);
    squads[buyer.id]=[...buyerSquad,{...player,contractEnd:String(Number(game.season)+(player.age>=31?2:3)),marketStatus:null}];
    const transfer={id:`ai-buy-${game.season}-${matchday}-${player.id}`,type:player.age<=23?"youth":"ai",player,fromTeamId:fromTeam.id,toTeamId:buyer.id,value:fee,season:String(game.season),matchday,reason:`Refuerzo para ${groupLabel[player.group]??"plantilla"}`};
    return {...current,transfers:[...(current.transfers??[]),transfer],transferMarket:{...market,lastAiMatchday:matchday,aiTransfers:[transfer,...(market.aiTransfers??[])],marketPulse:[transfer,...(market.marketPulse??[])]}};
  }
  const from=clubs[Math.floor(Math.random()*clubs.length)];
  const destinations=clubs.filter(team=>team.id!==from.id);const to=destinations[Math.floor(Math.random()*destinations.length)];
  const loan=loanCandidate(squads[from.id]??[]);
  if(loan&&Math.random()<.36){
    const value=marketValue(loan);squads[from.id]=(squads[from.id]??[]).filter(item=>item.id!==loan.id);squads[to.id]=[...(squads[to.id]??[]),{...loan,loanData:{fromTeamId:from.id,untilSeason:String(game.season)}}];
    const transfer={id:`ai-loan-${game.season}-${matchday}-${loan.id}`,type:"loan",player:loan,fromTeamId:from.id,toTeamId:to.id,value:Math.round(value*.07),season:String(game.season),matchday,reason:"Busca minutos"};
    return {...current,transfers:[...(current.transfers??[]),transfer],transferMarket:{...market,lastAiMatchday:matchday,aiTransfers:[transfer,...(market.aiTransfers??[])],marketPulse:[transfer,...(market.marketPulse??[])]}};
  }
  const sale=saleCandidate(squads[from.id]??[],game.season,from);
  if(!sale)return current;
  const value=marketValue(sale);
  squads[from.id]=(squads[from.id]??[]).filter(item=>item.id!==sale.id);squads[to.id]=[...(squads[to.id]??[]),{...sale,marketStatus:null}];
  const transfer={id:`ai-${game.season}-${matchday}-${sale.id}`,type:"ai",player:sale,fromTeamId:from.id,toTeamId:to.id,value:Math.round(value*(.85+Math.random()*.18)),season:String(game.season),matchday,reason:Number(sale.contractEnd??9999)<=Number(game.season)+1?"Evita que salga libre":"Ajuste de plantilla"};
  return {...current,transfers:[...(current.transfers??[]),transfer],transferMarket:{...market,lastAiMatchday:matchday,aiTransfers:[transfer,...(market.aiTransfers??[])],marketPulse:[transfer,...(market.marketPulse??[])]}};
}
