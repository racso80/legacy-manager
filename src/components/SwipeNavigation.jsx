import { useEffect, useRef, useState } from "react";
import { detectGestureAxis, resolveSwipeDecision } from "../navigation/gestureUtils.js";

const EDGE_WIDTH=24;
const SWIPE_THRESHOLD=52;

export function SwipeTabs({ tabs, activeTab, onChange, children, style, contentStyle, showIndicator=true }) {
  const start=useRef(null);
  const axis=useRef(null);
  const width=useRef(320);
  const timer=useRef(null);
  const suppressClickUntil=useRef(0);
  const [offset,setOffset]=useState(0);
  const [transitioning,setTransitioning]=useState(false);
  const [locked,setLocked]=useState(false);
  const ids=tabs.map(tab=>typeof tab==="string"?tab:tab.id);
  const activeIndex=Math.max(0,ids.indexOf(activeTab));

  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);

  const beginAt=(event,x,y,capturePointer=false)=>{
    if(locked)return;
    if(event.target.closest?.("input,select,textarea,[data-swipe-ignore='true']"))return;
    const rect=event.currentTarget.getBoundingClientRect();
    const localX=x-rect.left;
    if(localX<=EDGE_WIDTH)return;
    if(timer.current)clearTimeout(timer.current);
    if(capturePointer)try{event.currentTarget.setPointerCapture(event.pointerId);}catch{}
    width.current=rect.width||320;
    start.current={x,y,time:performance.now()};axis.current=null;setTransitioning(false);
  };
  const moveAt=(event,x,y)=>{
    if(!start.current||locked)return;
    const dx=x-start.current.x,dy=y-start.current.y;
    if(!axis.current)axis.current=detectGestureAxis(dx,dy);
    if(axis.current!=="x")return;
    if(Math.abs(dx)>12)suppressClickUntil.current=Date.now()+350;
    const atStart=activeIndex===0&&dx>0,atEnd=activeIndex===ids.length-1&&dx<0;
    setOffset((atStart||atEnd)?dx*.22:dx);
  };
  const finishAt=(x,y)=>{
    if(!start.current)return;
    const dx=x-start.current.x;
    const dy=y-start.current.y;
    const elapsed=Math.max(1,performance.now()-start.current.time);
    const decision=resolveSwipeDecision({dx,dy,elapsed,axis:axis.current,index:activeIndex,count:ids.length,threshold:SWIPE_THRESHOLD});
    start.current=null;axis.current=null;
    const {direction,nextIndex,shouldChange}=decision;
    if(!shouldChange){setTransitioning(true);setOffset(0);timer.current=setTimeout(()=>setTransitioning(false),170);return;}
    setLocked(true);setTransitioning(true);setOffset(direction>0?-width.current:width.current);
    timer.current=setTimeout(()=>{
      onChange(ids[nextIndex]);
      setTransitioning(false);setOffset(direction>0?Math.min(70,width.current*.18):-Math.min(70,width.current*.18));
      requestAnimationFrame(()=>requestAnimationFrame(()=>{setTransitioning(true);setOffset(0);timer.current=setTimeout(()=>{setLocked(false);setTransitioning(false);},170);}));
    },110);
  };
  const cancel=()=>{start.current=null;axis.current=null;setTransitioning(true);setOffset(0);setTimeout(()=>setTransitioning(false),170);};
  const pointerHandlers={
    onPointerDownCapture:event=>{if(event.pointerType!=="touch"&&(event.pointerType!=="mouse"||event.button===0))beginAt(event,event.clientX,event.clientY,true);},
    onPointerMoveCapture:event=>{if(event.pointerType!=="touch")moveAt(event,event.clientX,event.clientY);},
    onPointerUpCapture:event=>{if(event.pointerType!=="touch")finishAt(event.clientX,event.clientY);},
    onPointerCancelCapture:event=>{if(event.pointerType!=="touch")cancel();},
  };
  const touchHandlers={
    onTouchStartCapture:event=>{const touch=event.touches[0];if(touch)beginAt(event,touch.clientX,touch.clientY);},
    onTouchMoveCapture:event=>{const touch=event.touches[0];if(touch)moveAt(event,touch.clientX,touch.clientY);},
    onTouchEndCapture:event=>{const touch=event.changedTouches[0];if(touch)finishAt(touch.clientX,touch.clientY);else cancel();},
    onTouchCancelCapture:cancel,
  };
  const suppressAccidentalClick=event=>{if(Date.now()<suppressClickUntil.current){event.preventDefault();event.stopPropagation();}};

  return <div {...pointerHandlers} {...touchHandlers} onClickCapture={suppressAccidentalClick} style={{minWidth:0,overflow:"hidden",touchAction:"pan-y",...style}}>
    {showIndicator&&ids.length>1&&<div aria-hidden="true" style={{height:16,display:"flex",alignItems:"center",justifyContent:"center",gap:5,flexShrink:0}}>{ids.map((id,index)=><span key={id} style={{width:index===activeIndex?16:5,height:3,borderRadius:3,background:index===activeIndex?"#c9a84c":"#343a48",transition:"width .2s,background .2s"}}/>)}</div>}
    <div style={{minWidth:0,transform:`translate3d(${offset}px,0,0)`,opacity:Math.max(.55,1-Math.abs(offset)/Math.max(1,width.current)*.35),transition:transitioning?"transform 170ms cubic-bezier(.2,.75,.25,1),opacity 170ms ease":"none",willChange:offset?"transform,opacity":"auto",...contentStyle}}>{children}</div>
  </div>;
}

export function useEdgeSwipeBack(onBack,{enabled=true}={}){
  const start=useRef(null);
  const axis=useRef(null);
  const [progress,setProgress]=useState(0);
  const begin=event=>{
    if(!enabled||event.clientX>EDGE_WIDTH||event.target.closest?.("input,select,textarea"))return;
    start.current={x:event.clientX,y:event.clientY,time:performance.now()};axis.current=null;
  };
  const move=event=>{
    if(!start.current)return;
    const dx=event.clientX-start.current.x,dy=event.clientY-start.current.y;
    if(!axis.current&&Math.max(Math.abs(dx),Math.abs(dy))>8)axis.current=dx>0&&Math.abs(dx)>Math.abs(dy)*1.3?"x":"y";
    if(axis.current==="x")setProgress(Math.max(0,Math.min(1,dx/110)));
  };
  const finish=event=>{
    if(!start.current)return;
    const dx=event.clientX-start.current.x,elapsed=Math.max(1,performance.now()-start.current.time);
    const trigger=axis.current==="x"&&(dx>72||dx/elapsed>.65);
    start.current=null;axis.current=null;setProgress(0);if(trigger)onBack();
  };
  const cancel=()=>{start.current=null;axis.current=null;setProgress(0);};
  return{handlers:{onPointerDownCapture:begin,onPointerMoveCapture:move,onPointerUpCapture:finish,onPointerCancelCapture:cancel},indicator:enabled&&progress>0?<div aria-hidden="true" style={{position:"fixed",left:0,top:"50%",zIndex:100,width:34,height:54,borderRadius:"0 28px 28px 0",background:"rgba(201,168,76,.92)",color:"#1a1200",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,fontWeight:900,transform:`translateX(${progress*8-18}px) translateY(-50%)`,opacity:progress,boxShadow:"0 4px 18px rgba(0,0,0,.35)",pointerEvents:"none"}}>‹</div>:null};
}
