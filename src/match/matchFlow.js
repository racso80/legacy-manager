import { getAccumulatedLoad } from "../medical/medicalEngine.js";

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
  "4-5-1":["POR","LD","DFC","DFC","LI","MD","MC","MCD","MC","MI","DC"],
  "5-3-2":["POR","LD","DFC","DFC","DFC","LI","MC","MCD","MC","DC","DC"],
  "5-4-1":["POR","LD","DFC","DFC","DFC","LI","MD","MC","MC","MI","DC"],
  "3-5-2":["POR","DFC","DFC","DFC","MD","MC","MCD","MC","MI","DC","DC"],
};

const positionGroup=position=>position==="POR"?"POR":["DFC","LD","LI"].includes(position)?"DEF":["MCD","MC","MCO","MD","MI"].includes(position)?"MED":"DEL";

export function chooseOpponentFormation(teamId=""){
  const formations=Object.keys(MATCH_FORMATIONS);let hash=0;for(const char of teamId)hash+=char.charCodeAt(0);
  return formations[hash%formations.length];
}

export function buildStartingEleven(players=[],formation="4-3-3"){
  const available=players.filter(player=>!player.injured&&!player.suspended);const used=new Set();
  const physicalScore=player=>(player.overall??0)-Math.max(0,(player.fatigue??0)-35)*.08-Math.max(0,getAccumulatedLoad(player)-55)*.07;
  return (MATCH_FORMATIONS[formation]??MATCH_FORMATIONS["4-3-3"]).map(position=>{
    const exact=available.filter(player=>!used.has(player.id)&&player.pos===position);
    const sameGroup=available.filter(player=>!used.has(player.id)&&player.group===positionGroup(position));
    const fallback=available.filter(player=>!used.has(player.id));
    const pool=exact.length?exact:sameGroup.length?sameGroup:fallback;
    const selected=[...pool].sort((a,b)=>physicalScore(b)-physicalScore(a))[0];
    if(selected)used.add(selected.id);return selected?.id??null;
  });
}

export function buildMatchdaySquad(players=[],formation="4-3-3",benchSlots=12){
  const starterIds=buildStartingEleven(players,formation);
  const used=new Set(starterIds.filter(Boolean));
  const bench=[...players]
    .filter(player=>player&&!player.injured&&!player.suspended&&!used.has(player.id))
    .sort((a,b)=>{
      const aG=a.group==="POR"?1:0,bG=b.group==="POR"?1:0;
      if(aG!==bG)return bG-aG;
      return (b.overall??0)-(a.overall??0);
    })
    .slice(0,benchSlots)
    .map(player=>player.id);
  return{lineup:starterIds,bench,calledUp:[...starterIds.filter(Boolean),...bench]};
}

// matchEndMinute acota "sigue en el campo" (sin evento de salida/expulsión todavía):
// 90 para el cálculo final post-partido, currentMinute para las vistas en vivo, para que
// un titular que aún no ha salido no compute como si hubiera jugado el partido completo.
// starterIds es opcional — si no se pasa (vistas en vivo, que no siempre lo tienen a mano),
// se infiere "empezó de titular" por la ausencia de un evento de entrada (subIn), que es
// equivalente porque todo participante no-titular llega vía SUBSTITUTION.
function minutesPlayed(playerId,events,matchEndMinute=90,starterIds=null){
  const subIn=events.find(event=>event.type==="SUBSTITUTION"&&event.playerId===playerId)?.minute;
  const subOut=events.find(event=>event.type==="SUBSTITUTION"&&event.outPlayerId===playerId)?.minute;
  const red=events.find(event=>event.type==="RED"&&event.playerId===playerId)?.minute;
  const isStarter=starterIds?starterIds.includes(playerId):subIn==null;
  const start=isStarter?0:(subIn??matchEndMinute);
  const end=Math.min(subOut??matchEndMinute,red??matchEndMinute,matchEndMinute);
  return Math.max(0,end-start);
}

// Núcleo de rating compartido por el cálculo final post-partido (calculateMatchRatings,
// usado en el Resumen/MVP) y por las vistas en vivo (LiveLineupPanel móvil, FormationPanel/
// TopPerformersPanel/StartingXIBar PC) — antes cada vista en vivo reimplementaba su propia
// versión parcial de esta fórmula, lo que producía notas distintas para el mismo jugador
// según dónde se mirara. Todos los términos (bonus de calidad por overall, bonus de victoria,
// portería a cero) se pueden calcular en cualquier punto del partido con el marcador y los
// eventos conocidos hasta ese momento: "victoria"/"portería a cero" son sobre el resultado
// PARCIAL (teamGoalsFor/teamGoalsAgainst tal cual van en ese instante), así que la nota en
// vivo converge exactamente a la nota final en el pitido final (no es una aproximación que
// se quede corta — simplemente aún puede cambiar si el marcador cambia después).
export function computePlayerRating(player,{events=[],currentMinute=90,starterIds=null,teamGoalsFor=0,teamGoalsAgainst=0}={}){
  const playerId=player.id;
  const minutes=minutesPlayed(playerId,events,currentMinute,starterIds);
  const goals=events.filter(event=>["GOAL","PENALTY"].includes(event.type)&&event.playerId===playerId).length;
  const assists=events.filter(event=>event.assistId===playerId).length;
  const saves=events.filter(event=>event.type==="SAVE"&&event.playerId===playerId).length;
  const defensiveActions=events.filter(event=>event.type==="DEFENSIVE_ACTION"&&event.playerId===playerId).length;
  const yellows=events.filter(event=>event.type==="YELLOW"&&event.playerId===playerId).length;
  const red=events.some(event=>event.type==="RED"&&event.playerId===playerId);
  const cleanSheet=teamGoalsAgainst===0;const won=teamGoalsFor>teamGoalsAgainst;
  let rating=6+Math.min(90,minutes)/360+((player.overall??72)-75)*.025+goals*1.25+assists*.7+saves*.18+defensiveActions*.14+(won?.2:0)-yellows*.2-(red?1.5:0);
  if(cleanSheet&&player.group==="POR")rating+=.8;
  if(cleanSheet&&player.group==="DEF")rating+=.45;
  if(!cleanSheet&&player.group==="POR")rating-=Math.max(0,teamGoalsAgainst-1)*.12;
  if(!cleanSheet&&player.group==="DEF")rating-=Math.max(0,teamGoalsAgainst-1)*.07;
  rating=Math.max(4,Math.min(10,rating));
  return{minutes,goals,assists,saves,defensiveActions,yellows,red,rating:Number(rating.toFixed(1))};
}

export function calculateMatchRatings({events=[],teams=[]}){
  const ratings=[];
  teams.forEach(team=>{
    const playerById=Object.fromEntries((team.players??[]).map(player=>[player.id,player]));
    const participantIds=[...new Set([...(team.participantIds??[]),...(team.starterIds??[])])];
    const cleanSheet=(team.goalsAgainst??0)===0;
    participantIds.forEach(playerId=>{
      const player=playerById[playerId];if(!player)return;
      const{minutes,goals,assists,saves,defensiveActions,yellows,red,rating}=computePlayerRating(player,{events,starterIds:team.starterIds??[],teamGoalsFor:team.goalsFor??0,teamGoalsAgainst:team.goalsAgainst??0});
      const contributions=[];if(goals)contributions.push(`${goals} gol${goals===1?"":"es"}`);if(assists)contributions.push(`${assists} asistencia${assists===1?"":"s"}`);if(saves)contributions.push(`${saves} parada${saves===1?"":"s"}`);if(defensiveActions)contributions.push(`${defensiveActions} acción${defensiveActions===1?"":"es"} defensiva${defensiveActions===1?"":"s"}`);if(cleanSheet&&["POR","DEF"].includes(player.group))contributions.push("portería a cero");if(red)contributions.push("expulsado");
      ratings.push({...player,teamId:team.teamId,teamName:team.teamName,minutes,goals,assists,saves,defensiveActions,yellows,red,rating,contributions});
    });
  });
  return ratings.sort((a,b)=>b.rating-a.rating||b.goals-a.goals||b.assists-a.assists||b.overall-a.overall);
}
