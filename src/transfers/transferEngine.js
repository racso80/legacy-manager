const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function ensureTransferState(game){
  return {...game,transferMarket:{offers:[],incomingOffers:[],listings:[],notifications:[],aiTransfers:[],lastAiMatchday:0,...(game.transferMarket??{})}};
}

const listingReasons=['No cuenta para el entrenador','Quiere salir','Último año de contrato','Problemas salariales','Exceso de jugadores en su posición'];
export function refreshTransferListings(game,teams,squads,force=false){
  const current=ensureTransferState(game);if(!force&&(current.transferMarket.listings??[]).length)return current;
  const listings=[];
  teams.filter(team=>team.id!==game.teamId).forEach((team,teamIndex)=>{
    const squad=squads[team.id]??[];
    const saleCandidates=[...squad].filter(player=>player.overall<=84).sort((a,b)=>(b.age-a.age)||a.overall-b.overall);const sale=saleCandidates.length?saleCandidates[teamIndex%saleCandidates.length]:null;
    const loan=[...squad].filter(player=>player.age<=24&&player.overall<=79&&player.id!==sale?.id).sort((a,b)=>(b.potential??b.overall+4)-(a.potential??a.overall+4))[0];
    if(sale){const value=Math.round((sale.overall>=80?30000:sale.overall>=76?18000:sale.overall>=72?10000:5000)*(sale.age<=23?1.25:sale.age>=31?.7:1));listings.push({id:`listing-sale-${game.season}-${sale.id}`,type:'transfer',playerId:sale.id,teamId:team.id,askingPrice:Math.round(value*(.9+(teamIndex%5)*.06)),reason:listingReasons[teamIndex%listingReasons.length],season:String(game.season)});}
    if(loan)listings.push({id:`listing-loan-${game.season}-${loan.id}`,type:'loan',playerId:loan.id,teamId:team.id,wageCoverage:[40,50,60,75,100][teamIndex%5],duration:1,optionType:teamIndex%3===0?'purchase':teamIndex%7===0?'obligation':'none',optionPrice:Math.round((loan.overall>=76?18000:loan.overall>=72?10000:5000)*1.1),season:String(game.season)});
  });
  return {...current,transferMarket:{...current.transferMarket,listings}};
}

export function setUserMarketStatus(game,playerId,status){
  const current=ensureTransferState(game);return {...current,players:current.players.map(player=>player.id===playerId?{...player,marketStatus:player.marketStatus===status?null:status,morale:Math.max(20,(player.morale??70)-(player.marketStatus===status?0:status==='transfer'?4:2))}:player)};
}

export function createClubOffer(game,{player,fromTeamId,amount,dealType='transfer',listingId=null}){
  const current=ensureTransferState(game);const offers=current.transferMarket.offers??[];
  const previous=offers.find(item=>item.playerId===player.id&&!['completed','withdrawn','rejected'].includes(item.status));
  const offer={
    id:previous?.id??`offer-${Date.now()}-${player.id}`,playerId:player.id,playerName:player.name,
    fromTeamId,amount:Math.max(1,Math.round(amount)),marketValue:Math.max(1,Math.round(player.marketValue??amount)),dealType,listingId,
    status:'pendingClub',createdMatchday:game.matchday,resolveMatchday:game.matchday+1,
    salary:previous?.salary??player.salary,expectedSalary:player.expectedSalary??player.salary,years:previous?.years??3,role:previous?.role??'Rotación',responseDays:1+Math.floor(Math.random()*3),counterAmount:null,counterSalary:null,
  };
  return {...current,transferMarket:{...current.transferMarket,offers:[offer,...offers.filter(item=>item.id!==offer.id)]}};
}

export function acceptClubCounter(game,offerId){
  const current=ensureTransferState(game);return {...current,transferMarket:{...current.transferMarket,offers:current.transferMarket.offers.map(item=>item.id===offerId?{...item,amount:item.counterAmount,status:'clubAccepted',counterAmount:null}:item)}};
}

export function createContractOffer(game,{offerId,salary,years,role}){
  const current=ensureTransferState(game);return {...current,transferMarket:{...current.transferMarket,offers:current.transferMarket.offers.map(item=>item.id===offerId?{...item,salary:Math.max(1,Math.round(salary)),years:clamp(Math.round(years),1,5),role:role??'Rotación',status:'pendingPlayer',resolveMatchday:game.matchday+1}:item)}};
}

export function acceptPlayerCounter(game,offerId){
  const current=ensureTransferState(game);return {...current,transferMarket:{...current.transferMarket,offers:current.transferMarket.offers.map(item=>item.id===offerId?{...item,salary:item.counterSalary,status:'ready',counterSalary:null}:item)}};
}

export function withdrawOffer(game,offerId){
  const current=ensureTransferState(game);return {...current,transferMarket:{...current.transferMarket,offers:current.transferMarket.offers.map(item=>item.id===offerId?{...item,status:'withdrawn'}:item)}};
}

export function completeOffer(game,offerId){
  const current=ensureTransferState(game);return {...current,transferMarket:{...current.transferMarket,offers:current.transferMarket.offers.map(item=>item.id===offerId?{...item,status:'completed'}:item)}};
}

export function advanceTransferNegotiations(game){
  const current=ensureTransferState(game);const matchday=current.matchday??1;
  const offers=current.transferMarket.offers.map(item=>{
    if(item.resolveMatchday>matchday)return item;
    if(item.status==='pendingClub'){
      if(Math.random()<.1)return {...item,status:'outbid'};
      const ratio=item.amount/Math.max(1,item.marketValue);
      if(item.dealType==='loan'&&ratio>=.05)return {...item,status:'clubAccepted'};
      if(ratio>=.98)return {...item,status:'clubAccepted'};
      if(ratio>=.78)return {...item,status:'clubCounter',counterAmount:Math.round(item.marketValue*(1.02+Math.random()*.1))};
      return {...item,status:'rejected'};
    }
    if(item.status==='pendingPlayer'){
      const expected=Math.max(8,item.salary??8);const baseline=Math.max(8,item.expectedSalary??expected);
      const ratio=expected/baseline;
      if(ratio>=.96&&['Estrella','Titular','Rotación'].includes(item.role))return {...item,status:'ready'};
      if(ratio>=.78)return Math.random()<.35?{...item,status:'roleCounter',counterRole:item.role==='Promesa'?'Rotación':'Titular'}:{...item,status:'playerCounter',counterSalary:Math.round(baseline*(1+Math.random()*.08))};
      return {...item,status:'playerRejected'};
    }
    return item;
  });
  return {...current,transferMarket:{...current.transferMarket,offers}};
}

export function acceptRoleCounter(game,offerId){const current=ensureTransferState(game);return{...current,transferMarket:{...current.transferMarket,offers:current.transferMarket.offers.map(item=>item.id===offerId?{...item,role:item.counterRole,status:'ready',counterRole:null}:item)}};}

export function resolveIncomingOffer(game,offerId,decision){const current=ensureTransferState(game);return{...current,transferMarket:{...current.transferMarket,incomingOffers:current.transferMarket.incomingOffers.map(item=>item.id===offerId?{...item,status:decision}:item)}};}

export function maybeCreateIncomingOffer(game,teams){
  const current=ensureTransferState(game);const candidates=current.players.filter(player=>player.marketStatus&&!current.transferMarket.incomingOffers.some(item=>item.playerId===player.id&&item.status==='pending'));
  if(!candidates.length||Math.random()>.42)return current;const player=candidates[Math.floor(Math.random()*candidates.length)];const buyers=teams.filter(team=>team.id!==game.teamId);const buyer=buyers[Math.floor(Math.random()*buyers.length)];
  const value=Math.round((player.overall>=80?30000:player.overall>=76?18000:player.overall>=72?10000:5000)*(player.age<=24?1.25:player.age>=31?.7:1));
  const offer={id:`incoming-${game.season}-${game.matchday}-${player.id}`,playerId:player.id,playerName:player.name,fromTeamId:game.teamId,toTeamId:buyer.id,type:player.marketStatus==='loan'?'loan':'transfer',amount:player.marketStatus==='loan'?Math.round(value*.06):Math.round(value*(.88+Math.random()*.25)),status:'pending',createdMatchday:game.matchday};
  return{...current,transferMarket:{...current.transferMarket,incomingOffers:[offer,...current.transferMarket.incomingOffers]}};
}

export function maybeCreateAITransfer(game,teams,squads){
  const current=ensureTransferState(game);const market=current.transferMarket;const matchday=current.matchday??1;
  if(matchday<3||matchday-(market.lastAiMatchday??0)<3||Math.random()>.58)return current;
  const clubs=teams.filter(team=>team.id!==game.teamId&&(squads[team.id]??[]).length>17);
  if(clubs.length<2)return current;
  const from=clubs[Math.floor(Math.random()*clubs.length)];
  const destinations=clubs.filter(team=>team.id!==from.id);const to=destinations[Math.floor(Math.random()*destinations.length)];
  const candidates=(squads[from.id]??[]).filter(player=>player.group!=='POR'&&player.overall<=84);
  if(!candidates.length)return current;
  const player=candidates[Math.floor(Math.random()*candidates.length)];
  const value=Math.round((player.overall>=80?30000:player.overall>=76?18000:player.overall>=72?10000:5000)*(player.age<=24?1.25:player.age>=31?.7:1));
  const roll=Math.random();const type=roll<.17?'renewal':roll<.32?'loan':'ai';
  if(type!=='renewal'){squads[from.id]=squads[from.id].filter(item=>item.id!==player.id);squads[to.id]=[...squads[to.id],player];}
  const transfer={id:`ai-${game.season}-${matchday}-${player.id}`,type,player,fromTeamId:from.id,toTeamId:type==='renewal'?from.id:to.id,value:type==='loan'?Math.round(value*.08):type==='renewal'?0:value,season:String(game.season),matchday};
  return {...current,transfers:[...(current.transfers??[]),transfer],transferMarket:{...market,lastAiMatchday:matchday,aiTransfers:[transfer,...(market.aiTransfers??[])]}};
}
