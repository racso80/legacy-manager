import { useEffect, useState } from "react";
import { resolveTeamCrest } from "../data/dataLoader.js";
import { COLORS } from "../utils/tokens.js";

export default function TeamCrest({team,size=38,style,className,title}){
  const source=resolveTeamCrest(team);const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[source]);
  const base={width:size,height:size,flexShrink:0,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",...style};
  if(!team)return <div className={className} style={{...base,background:"#1e2330",color:COLORS.textDim}}>—</div>;
  if(failed||!source)return <div className={className} title={title??team.name} style={{...base,background:`${team.color}18`,border:`1px solid ${team.color}66`,color:team.color,fontSize:Math.max(8,Math.round(size*.28)),fontWeight:900}}>{team.short}</div>;
  return <div className={className} title={title??team.name} style={{...base,background:"rgba(255,255,255,.04)"}}><img src={source} alt={`Escudo de ${team.name}`} onError={()=>setFailed(true)} style={{width:"88%",height:"88%",objectFit:"contain",display:"block"}}/></div>;
}
