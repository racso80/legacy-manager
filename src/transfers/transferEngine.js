const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function ensureTransferState(game){
  return {...game,transferMarket:{offers:[],aiTransfers:[],lastAiMatchday:0,...(game.transferMarket??{})}};
}

export function createClubOffer(game,{player,fromTeamId,amount}){
  const current=ensureTransferState(game);const offers=current.transferMarket.offers??[];
  const previous=offers.find(item=>item.playerId===player.id&&!['completed','withdrawn','rejected'].includes(item.status));
  const offer={
    id:previous?.id??`offer-${Date.now()}-${player.id}`,playerId:player.id,playerName:player.name,
    fromTeamId,amount:Math.max(1,Math.round(amount)),marketValue:Math.max(1,Math.round(player.marketValue??amount)),
    status:'pendingClub',createdMatchday:game.matchday,resolveMatchday:game.matchday+1,
    salary:previous?.salary??player.salary,expectedSalary:player.expectedSalary??player.salary,years:previous?.years??3,role:previous?.role??'Rotación',counterAmount:null,counterSalary:null,
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
      if(ratio>=.98)return {...item,status:'clubAccepted'};
      if(ratio>=.78)return {...item,status:'clubCounter',counterAmount:Math.round(item.marketValue*(1.02+Math.random()*.1))};
      return {...item,status:'rejected'};
    }
    if(item.status==='pendingPlayer'){
      const expected=Math.max(8,item.salary??8);const baseline=Math.max(8,item.expectedSalary??expected);
      const ratio=expected/baseline;
      if(ratio>=.96)return {...item,status:'ready'};
      if(ratio>=.78)return {...item,status:'playerCounter',counterSalary:Math.round(baseline*(1+Math.random()*.08))};
      return {...item,status:'playerRejected'};
    }
    return item;
  });
  return {...current,transferMarket:{...current.transferMarket,offers}};
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
