export const EXTRAORDINARY_EVENT_TYPES=new Set(["GOAL","PENALTY","RED","INJURY"]);

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
