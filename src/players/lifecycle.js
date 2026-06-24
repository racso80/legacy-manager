const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

const hashNumber=value=>{
  let hash=0;
  for(const char of String(value))hash=(Math.imul(hash,31)+char.charCodeAt(0))|0;
  return Math.abs(hash);
};

function seasonYear(season){return Number.parseInt(season??"2025",10)||2025;}

export function dateForMatchday(season,matchday=1){
  const date=new Date(Date.UTC(seasonYear(season),7,15));
  date.setUTCDate(date.getUTCDate()+Math.max(0,(Number(matchday)||1)-1)*7);
  return date;
}

function isoDate(year,month,day){
  return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

export function deriveBirthDate(player,season="2025"){
  if(player.birthDate)return player.birthDate;
  const seed=hashNumber(player.id??player.name);
  const month=(seed%12)+1;
  const day=(Math.floor(seed/12)%28)+1;
  const currentAge=Number(player.age??24);
  const seasonStart=dateForMatchday(season,1);
  const birthdayThisYear=new Date(Date.UTC(seasonStart.getUTCFullYear(),month-1,day));
  const birthYear=seasonStart.getUTCFullYear()-currentAge-(birthdayThisYear>seasonStart?1:0);
  return isoDate(birthYear,month,day);
}

export function calculateAge(birthDate,season="2025",matchday=1){
  const now=dateForMatchday(season,matchday);
  const birth=new Date(`${birthDate}T00:00:00Z`);
  let age=now.getUTCFullYear()-birth.getUTCFullYear();
  const birthdayThisYear=new Date(Date.UTC(now.getUTCFullYear(),birth.getUTCMonth(),birth.getUTCDate()));
  if(now<birthdayThisYear)age--;
  return Math.max(15,age);
}

export function ensurePlayerLifecycle(player,season="2025",matchday=1){
  const birthDate=deriveBirthDate(player,season);
  return{...player,birthDate,age:calculateAge(birthDate,season,matchday),lifecycle:{status:"active",...(player.lifecycle??{})}};
}

function ageCurveLabel(age){
  if(age<=20)return"desarrollo rápido";
  if(age<=27)return"máxima progresión";
  if(age<=31)return"pico de rendimiento";
  if(age<=35)return"inicio del declive";
  return"declive progresivo";
}

function roleGrowth(player,age){
  const room=Math.max(0,(player.potential??player.overall)-player.overall);
  if(age<=20)return Math.min(2,room>5?2:room>0?1:0);
  if(age<=27)return room>3&&hashNumber(`${player.id}:growth:${age}`)%100<45?1:0;
  if(age<=31)return room>0&&hashNumber(`${player.id}:peak:${age}`)%100<15?1:0;
  return 0;
}

function declineAmount(player,age){
  const resilience=(player.attrs?.fisico??player.overall??70)+(player.morale??70)/3;
  const eliteBuffer=(player.overall??70)>=84?1:0;
  const base=age<=31?0:age<=35?.45:age<=37?1.05:1.75;
  const chance=hashNumber(`${player.id}:decline:${age}`)%100;
  const decline=base+(chance<35?.45:0)-(resilience>100?.3:0)-eliteBuffer*.15;
  return Math.max(0,decline);
}

export function evolvePlayerForNewSeason(player,{previousSeason="2025",newSeason="2026"}={}){
  const withLife=ensurePlayerLifecycle(player,previousSeason,38);
  const age=calculateAge(withLife.birthDate,newSeason,1);
  const attrs={...(withLife.attrs??{})};
  let overall=withLife.overall??70;
  const growth=roleGrowth(withLife,age);
  if(growth>0){
    overall=clamp(overall+growth,50,withLife.potential??99);
    ["ritmo","fisico","pase","regate","tiro","defensa","porteria"].forEach(key=>{if(attrs[key]!=null&&attrs[key]<99)attrs[key]=clamp(attrs[key]+(key==="ritmo"||key==="fisico"?1:growth),1,99);});
  }
  const decline=declineAmount(withLife,age);
  if(decline>0){
    const physicalLoss=Math.round(decline);
    attrs.ritmo=attrs.ritmo!=null?clamp(attrs.ritmo-physicalLoss,35,99):attrs.ritmo;
    attrs.fisico=attrs.fisico!=null?clamp(attrs.fisico-physicalLoss,35,99):attrs.fisico;
    if(age>=34&&decline>=.8)overall=clamp(overall-Math.round(decline),50,99);
  }
  const recoveryModifier=age<=21?.9:age<=31?1:age<=35?1.12:1.28;
  const injuryRiskAgeModifier=age<=22?.92:age<=31?1:age<=35?1.14:1.32;
  const developmentStage=ageCurveLabel(age);
  return{...withLife,age,attrs,overall,rarity:overall>=85?"SPECIAL":overall>=75?"GOLD":overall>=65?"SILVER":"BRONZE",recoveryModifier,injuryRiskAgeModifier,lifecycle:{...(withLife.lifecycle??{}),status:"active",developmentStage,lastAgeUpdateSeason:String(newSeason),annualGrowth:growth,annualDecline:decline}};
}

function retirementProbability(player){
  const age=player.age??24;
  if(age<34)return 0;
  const base=age===34?.03:age===35?.09:age===36?.2:age===37?.36:Math.min(.72,.48+(age-38)*.08);
  const elitePenalty=(player.overall??70)>=84?-.07:0;
  const physicalPenalty=(player.attrs?.fisico??70)>=78?-.04:0;
  return clamp(base+elitePenalty+physicalPenalty,0,.82);
}

export function shouldRetire(player,season){
  const probability=retirementProbability(player);
  if(!probability)return false;
  return (hashNumber(`${player.id}:retire:${season}`)%1000)/1000<probability;
}

export function retirementSignal(player,season){
  if((player.age??0)<34)return null;
  const roll=(hashNumber(`${player.id}:retire-signal:${season}`)%1000)/1000;
  if(roll<.08)return"studying";
  if((player.age??0)>=36&&roll<.22)return"lastSeason";
  return null;
}

export function advanceSquadLifecycle(players,{previousSeason="2025",newSeason="2026",teamId,userTeamId,allowRetirements=true}={}){
  const evolved=players.map(player=>evolvePlayerForNewSeason(player,{previousSeason,newSeason}));
  const events=[];
  const active=[];
  evolved.forEach(player=>{
    const signal=retirementSignal(player,newSeason);
    if(allowRetirements&&shouldRetire(player,newSeason)){
      events.push({type:"retired",player:{...player,lifecycle:{...(player.lifecycle??{}),status:"retired",retiredSeason:String(newSeason),retiredFromTeamId:teamId}},teamId,userClub:teamId===userTeamId});
      return;
    }
    if(signal)events.push({type:signal,player,teamId,userClub:teamId===userTeamId});
    active.push(signal==="lastSeason"?{...player,lifecycle:{...(player.lifecycle??{}),retirementPlan:"lastSeason",retirementPlanSeason:String(newSeason)}}:player);
  });
  return{players:active,events};
}

export function processBirthdays(game){
  const season=String(game.season??"2025"), matchday=game.matchday??1;
  const birthdayNews=[];
  const update=player=>{
    const previousAge=Number(player.age??0);
    const withLife=ensurePlayerLifecycle(player,season,matchday);
    if(withLife.age>previousAge&&withLife.lifecycle?.lastBirthdayKey!==`${season}:${withLife.age}`){
      birthdayNews.push({id:`birthday-${withLife.id}-${season}-${withLife.age}`,type:"player",importance:withLife.overall>=84?"medium":"low",title:`🎂 ${withLife.name} cumple ${withLife.age} años`,summary:`El ${withLife.pos} entra en una etapa de ${ageCurveLabel(withLife.age)}.`,season,matchday,createdAt:Date.now(),fingerprint:`birthday:${withLife.id}:${season}:${withLife.age}`,playerIds:[withLife.id],teamIds:[game.teamId],metadata:{birthday:true,userClub:true}});
      return{...withLife,lifecycle:{...(withLife.lifecycle??{}),lastBirthdayKey:`${season}:${withLife.age}`}};
    }
    return withLife;
  };
  return{game:{...game,players:(game.players??[]).map(update),youth:{...(game.youth??{}),players:(game.youth?.players??[]).map(update)}},news:birthdayNews};
}

export function lifecycleNews(events,{season,matchday,userTeamId}={}){
  return events.filter(event=>event.userClub).map(event=>{
    const title=event.type==="retired"?`${event.player.name} anuncia su retirada`:event.type==="lastSeason"?`${event.player.name} jugará una última temporada`:`${event.player.name} estudia retirarse`;
    const summary=event.type==="retired"?`El ${event.player.pos} cierra su etapa como futbolista profesional a los ${event.player.age} años.`:event.type==="lastSeason"?`El veterano de ${event.player.age} años afronta la temporada como posible despedida.`:`El entorno del jugador reconoce que empieza a valorar su futuro.`;
    return{id:`lifecycle-${event.type}-${event.player.id}-${season}`,type:"legacy",importance:event.type==="retired"?"high":"medium",title:`📰 ${title}`,summary,season:String(season),matchday,createdAt:Date.now(),fingerprint:`lifecycle:${event.type}:${event.player.id}:${season}`,playerIds:[event.player.id],teamIds:[userTeamId],metadata:{retirement:event.type,userClub:true}};
  });
}

export function applyRetirementsToLegacy(legacy,events,season){
  const retired=events.filter(event=>event.type==="retired").map(event=>({playerId:event.player.id,name:event.player.name,pos:event.player.pos,age:event.player.age,overall:event.player.overall,season:String(season),teamId:event.teamId,userClub:event.userClub}));
  if(!retired.length)return legacy;
  return{...legacy,retirements:[...retired,...(legacy?.retirements??[])],archive:{...(legacy?.archive??{}),retiredPlayers:[...retired,...(legacy?.archive?.retiredPlayers??[])]}};
}
