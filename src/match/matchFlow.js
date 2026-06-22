export const EXTRAORDINARY_EVENT_TYPES=new Set(["GOAL","PENALTY","YELLOW","RED","INJURY"]);

export function intervalProbability(baseProbability,minutes){
  const fraction=Math.max(0,Math.min(1,minutes/15));
  return 1-Math.pow(1-Math.max(0,Math.min(.99,baseProbability)),fraction);
}

export function promoteSecondYellow(event,previousYellows=0){
  if(event?.type!=="YELLOW"||previousYellows<1)return event;
  const name=event.playerName??"El jugador";
  return{...event,type:"RED",secondYellow:true,yellowCard:true,description:`🟥 ${name} es expulsado por doble amarilla. El equipo se queda con diez.`};
}

export function eventsUntilExtraordinary(events=[]){
  const sorted=[...events].sort((a,b)=>a.minute-b.minute);
  const pauseIndex=sorted.findIndex(event=>EXTRAORDINARY_EVENT_TYPES.has(event.type));
  if(pauseIndex<0)return{events:sorted,pauseEvent:null,remaining:[]};
  return{events:sorted.slice(0,pauseIndex+1),pauseEvent:sorted[pauseIndex],remaining:sorted.slice(pauseIndex+1)};
}

export function strengthWithPlayerCount(baseStrength,playerCount){
  const missing=Math.max(0,11-playerCount);
  return Math.max(35,baseStrength-missing*5.5);
}

export const MATCH_FORMATIONS={
  "4-3-3":["POR","LD","DFC","DFC","LI","MCD","MC","MCO","ED","DC","EI"],
  "4-4-2":["POR","LD","DFC","DFC","LI","MD","MC","MC","MI","DC","DC"],
  "4-2-3-1":["POR","LD","DFC","DFC","LI","MCD","MCD","MCO","ED","EI","DC"],
};

const positionGroup=position=>position==="POR"?"POR":["DFC","LD","LI"].includes(position)?"DEF":["MCD","MC","MCO","MD","MI"].includes(position)?"MED":"DEL";

export function chooseOpponentFormation(teamId=""){
  const formations=Object.keys(MATCH_FORMATIONS);let hash=0;for(const char of teamId)hash+=char.charCodeAt(0);
  return formations[hash%formations.length];
}

export function buildStartingEleven(players=[],formation="4-3-3"){
  const available=players.filter(player=>!player.injured&&!player.suspended);const used=new Set();
  return (MATCH_FORMATIONS[formation]??MATCH_FORMATIONS["4-3-3"]).map(position=>{
    const exact=available.filter(player=>!used.has(player.id)&&player.pos===position);
    const sameGroup=available.filter(player=>!used.has(player.id)&&player.group===positionGroup(position));
    const fallback=available.filter(player=>!used.has(player.id));
    const pool=exact.length?exact:sameGroup.length?sameGroup:fallback;
    const selected=[...pool].sort((a,b)=>(b.overall??0)-(a.overall??0))[0];
    if(selected)used.add(selected.id);return selected?.id??null;
  });
}

function minutesPlayed(playerId,starterIds,events){
  const subIn=events.find(event=>event.type==="SUBSTITUTION"&&event.playerId===playerId)?.minute;
  const subOut=events.find(event=>event.type==="SUBSTITUTION"&&event.outPlayerId===playerId)?.minute;
  const red=events.find(event=>event.type==="RED"&&event.playerId===playerId)?.minute;
  const start=starterIds.includes(playerId)?0:(subIn??90);const end=Math.min(subOut??90,red??90);
  return Math.max(0,end-start);
}

export function calculateMatchRatings({events=[],teams=[]}){
  const ratings=[];
  teams.forEach(team=>{
    const playerById=Object.fromEntries((team.players??[]).map(player=>[player.id,player]));
    const participantIds=[...new Set([...(team.participantIds??[]),...(team.starterIds??[])])];
    participantIds.forEach(playerId=>{
      const player=playerById[playerId];if(!player)return;
      const minutes=minutesPlayed(playerId,team.starterIds??[],events);
      const goals=events.filter(event=>["GOAL","PENALTY"].includes(event.type)&&event.playerId===playerId).length;
      const assists=events.filter(event=>event.assistId===playerId).length;
      const saves=events.filter(event=>event.type==="SAVE"&&event.playerId===playerId).length;
      const defensiveActions=events.filter(event=>event.type==="DEFENSIVE_ACTION"&&event.playerId===playerId).length;
      const yellows=events.filter(event=>event.type==="YELLOW"&&event.playerId===playerId).length;
      const red=events.some(event=>event.type==="RED"&&event.playerId===playerId);
      const cleanSheet=(team.goalsAgainst??0)===0;const won=(team.goalsFor??0)>(team.goalsAgainst??0);
      let rating=6+Math.min(90,minutes)/360+((player.overall??72)-75)*.025+goals*1.25+assists*.7+saves*.18+defensiveActions*.14+(won?.2:0)-yellows*.2-(red?1.5:0);
      if(cleanSheet&&player.group==="POR")rating+=.8;
      if(cleanSheet&&player.group==="DEF")rating+=.45;
      if(!cleanSheet&&player.group==="POR")rating-=Math.max(0,(team.goalsAgainst??0)-1)*.12;
      if(!cleanSheet&&player.group==="DEF")rating-=Math.max(0,(team.goalsAgainst??0)-1)*.07;
      rating=Math.max(4,Math.min(10,rating));
      const contributions=[];if(goals)contributions.push(`${goals} gol${goals===1?"":"es"}`);if(assists)contributions.push(`${assists} asistencia${assists===1?"":"s"}`);if(saves)contributions.push(`${saves} parada${saves===1?"":"s"}`);if(defensiveActions)contributions.push(`${defensiveActions} acción${defensiveActions===1?"":"es"} defensiva${defensiveActions===1?"":"s"}`);if(cleanSheet&&["POR","DEF"].includes(player.group))contributions.push("portería a cero");if(red)contributions.push("expulsado");
      ratings.push({...player,teamId:team.teamId,teamName:team.teamName,minutes,goals,assists,saves,defensiveActions,yellows,red,rating:Number(rating.toFixed(1)),contributions});
    });
  });
  return ratings.sort((a,b)=>b.rating-a.rating||b.goals-a.goals||b.assists-a.assists||b.overall-a.overall);
}
