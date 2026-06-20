export function detectGestureAxis(dx,dy,ratio=1.25){
  if(Math.max(Math.abs(dx),Math.abs(dy))<=8)return null;
  return Math.abs(dx)>Math.abs(dy)*ratio?"x":"y";
}

export function resolveSwipeDecision({dx,dy,elapsed,axis,index,count,threshold=52,velocity=.55}){
  const horizontal=axis==="x"||(!axis&&Math.abs(dx)>Math.abs(dy)*1.25);
  const direction=dx<0?1:-1;
  const nextIndex=index+direction;
  const enoughMotion=Math.abs(dx)>=threshold||Math.abs(dx)/Math.max(1,elapsed)>velocity;
  return{horizontal,direction,nextIndex,shouldChange:horizontal&&nextIndex>=0&&nextIndex<count&&enoughMotion};
}
