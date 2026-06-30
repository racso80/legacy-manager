import { useState } from "react";
import { getJobRisk, getPrestigeLevel } from "../legacy/legacyEngine.js";
import { SwipeTabs } from "./SwipeNavigation.jsx";
import { COLORS } from "../utils/tokens.js";

function Progress({value,color="#c9a84c"}){return <div style={{height:5,background:"#252a36",borderRadius:4,overflow:"hidden"}}><div style={{width:`${Math.max(0,Math.min(100,value))}%`,height:"100%",background:color}}/></div>}

const hashSeed=value=>{let h=0;for(const c of String(value))h=(h*31+c.charCodeAt(0))>>>0;return h;};
const BOARD_VERDICT_MESSAGES={
  high:[
    "La directiva está satisfecha con el rumbo del proyecto.",
    "El informe deja claro que arriba se respalda la dirección actual del club.",
    "La sensación general en la directiva es de tranquilidad y confianza en el proyecto.",
  ],
  mixed:[
    "La directiva sigue la evolución del proyecto con cautela, sin grandes alarmas ni euforia.",
    "El informe pinta un panorama desigual: hay cosas que convencen y otras que conviene vigilar.",
    "Arriba no hay alarma, pero tampoco euforia. Se espera ver más antes de sacar conclusiones.",
  ],
  low:[
    "La directiva no oculta su preocupación por el rumbo reciente del proyecto.",
    "El informe deja un mensaje claro: arriba esperan una reacción pronto.",
    "La paciencia de la directiva empieza a tensarse con los números de este informe.",
  ],
};
function boardVerdict(report){
  if(!report)return null;
  const tier=report.overall>=70?"high":report.overall>=45?"mixed":"low";
  const pool=BOARD_VERDICT_MESSAGES[tier];
  return pool[hashSeed(`${report.season}:${report.matchday}:verdict`)%pool.length];
}

export default function BoardLegacyScreen({game,team}){
  const [tab,setTab]=useState("board");
  const legacy=game.legacy;
  const clubLevel=getPrestigeLevel(legacy.clubPrestige);
  const managerLevel=getPrestigeLevel(legacy.manager.prestige,true);
  const jobRisk=getJobRisk(legacy.confidence);
  const lastReport=legacy.monthlyReports[0];
  const confidenceColor=legacy.confidence>=75?"#22c55e":legacy.confidence>=50?"#eab308":legacy.confidence>=30?"#f97316":"#ef4444";
  return <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
    <div style={{display:"flex",background:"#161a24",borderBottom:"1px solid rgba(255,255,255,.06)"}}>{[["board","🏛 Directiva"],["legacy","⭐ Legacy"],["trophies","🏆 Trofeos"]].map(([id,label])=><button key={id} onClick={()=>setTab(id)} style={{flex:1,background:"transparent",border:"none",borderBottom:tab===id?"2px solid #c9a84c":"2px solid transparent",color:tab===id?"#c9a84c":COLORS.textDim,padding:10,fontSize:11,fontWeight:700,cursor:"pointer"}}>{label}</button>)}</div>
    <SwipeTabs tabs={["board","legacy","trophies"]} activeTab={tab} onChange={setTab} style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} contentStyle={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <div style={{flex:1,overflowY:"auto",padding:14}}>
      {tab==="board"&&<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:15}}><div style={{background:"linear-gradient(135deg,rgba(201,168,76,.16),#161a24)",border:"1px solid rgba(201,168,76,.25)",borderRadius:10,padding:13}}><div style={{fontSize:9,color:COLORS.textDim,fontWeight:700}}>PRESTIGIO DEL CLUB</div><div style={{fontSize:27,color:clubLevel.color,fontWeight:900,marginTop:4}}>{Math.round(legacy.clubPrestige)}<span style={{fontSize:11,color:COLORS.textDim}}>/100</span></div><div style={{fontSize:10,color:clubLevel.color,marginTop:3}}>{clubLevel.label}</div></div><div style={{background:"#161a24",border:`1px solid ${confidenceColor}33`,borderRadius:10,padding:13}}><div style={{fontSize:9,color:COLORS.textDim,fontWeight:700}}>CONFIANZA DIRECTIVA</div><div style={{fontSize:27,color:confidenceColor,fontWeight:900,marginTop:4}}>{Math.round(legacy.confidence)}<span style={{fontSize:11,color:COLORS.textDim}}>/100</span></div><div style={{fontSize:10,color:jobRisk.color,marginTop:3}}>{jobRisk.icon} Riesgo: {jobRisk.label}</div><div style={{fontSize:9,color:COLORS.textDim,marginTop:3,lineHeight:1.35}}>{jobRisk.detail}</div></div></div>
        <div style={{fontSize:10,color:COLORS.textDim,fontWeight:800,letterSpacing:".6px",marginBottom:8}}>OBJETIVOS DE TEMPORADA</div><div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:17}}>{legacy.objectives.map(objective=><div key={objective.id} style={{background:"#161a24",border:"1px solid rgba(255,255,255,.06)",borderRadius:9,padding:11}}><div style={{display:"flex",justifyContent:"space-between",gap:10,marginBottom:7}}><div style={{color:"#e8eaf0",fontSize:11,fontWeight:700}}>{objective.type==="sport"?"⚽":objective.type==="economy"?"💶":"🌱"} {objective.label}</div><div style={{color:objective.progress>=70?"#22c55e":"#c9a84c",fontSize:11,fontWeight:800}}>{Math.round(objective.progress)}%</div></div><Progress value={objective.progress} color={objective.progress>=70?"#22c55e":"#c9a84c"}/><div style={{color:COLORS.textDim,fontSize:9,marginTop:6}}>Recompensa: +{objective.reward.prestige} prestigio · €{objective.reward.budget/1000}M</div></div>)}</div>
        <div style={{fontSize:10,color:COLORS.textDim,fontWeight:800,letterSpacing:".6px",marginBottom:8}}>📋 INFORME DIRECTIVA</div>{lastReport?<div style={{background:"#161a24",borderRadius:10,padding:12}}><div style={{color:COLORS.muted,fontSize:10,marginBottom:10}}>Jornada {lastReport.matchday} · valoración mensual</div><div style={{color:"#c9ced8",fontSize:11,lineHeight:1.5,marginBottom:12}}>{boardVerdict(lastReport)}</div>{[["Objetivo deportivo",lastReport.sport],["Objetivo económico",lastReport.economy],["Desarrollo",lastReport.development],["Valoración global",lastReport.overall]].map(([label,value])=><div key={label} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:4}}><span style={{color:COLORS.muted}}>{label}</span><strong style={{color:value>=70?"#22c55e":value>=45?"#eab308":"#ef4444"}}>{value}%</strong></div><Progress value={value} color={value>=70?"#22c55e":value>=45?"#eab308":"#ef4444"}/></div>)}</div>:<div style={{background:"#161a24",borderRadius:9,padding:18,textAlign:"center",color:COLORS.textDim,fontSize:11}}>El primer informe llegará en la jornada 4.</div>}
      </>}
      {tab==="legacy"&&<>
        <div style={{background:"linear-gradient(135deg,rgba(167,139,250,.14),#161a24)",border:"1px solid rgba(167,139,250,.22)",borderRadius:11,padding:15,marginBottom:15}}><div style={{fontSize:10,color:"#a78bfa",fontWeight:800}}>ENTRENADOR</div><div style={{fontSize:21,color:"#fff",fontWeight:800,marginTop:5}}>{legacy.manager.name}</div><div style={{display:"flex",alignItems:"flex-end",gap:8,marginTop:10}}><div style={{fontSize:31,color:managerLevel.color,fontWeight:900}}>{Math.round(legacy.manager.prestige)}</div><div style={{paddingBottom:4}}><div style={{fontSize:9,color:COLORS.textDim}}>PRESTIGIO</div><div style={{fontSize:11,color:managerLevel.color}}>{managerLevel.label}</div></div></div></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:16}}>{[["TEMPORADAS",legacy.manager.seasons],["VICTORIAS",legacy.manager.wins],["TÍTULOS",legacy.manager.titles]].map(([label,value])=><div key={label} style={{background:"#161a24",borderRadius:8,padding:11,textAlign:"center"}}><div style={{fontSize:20,color:"#c9a84c",fontWeight:800}}>{value}</div><div style={{fontSize:8,color:COLORS.textDim,marginTop:3}}>{label}</div></div>)}</div>
        <div style={{fontSize:10,color:COLORS.textDim,fontWeight:800,letterSpacing:".6px",marginBottom:8}}>HISTORIAL DEL ENTRENADOR</div>{legacy.manager.history.length?<div style={{display:"flex",flexDirection:"column",gap:7}}>{legacy.manager.history.map(item=><div key={`${item.season}-${item.clubId}`} style={{background:"#161a24",borderRadius:8,padding:11,display:"flex",justifyContent:"space-between"}}><div><div style={{color:"#e8eaf0",fontSize:11,fontWeight:700}}>{item.clubName}</div><div style={{color:COLORS.textDim,fontSize:9,marginTop:3}}>T. {item.season}/{String(Number(item.season)+1).slice(-2)}</div></div><div style={{textAlign:"right",color:item.position===1?"#c9a84c":COLORS.muted,fontSize:11,fontWeight:700}}>{item.position}.º{item.title&&<div style={{fontSize:9,marginTop:3}}>🏆 {item.title}</div>}</div></div>)}</div>:<div style={{color:COLORS.textDim,fontSize:11,textAlign:"center",padding:20}}>Tu historia comenzará al cerrar la primera temporada.</div>}
      </>}
      {tab==="trophies"&&<>
        <div style={{textAlign:"center",padding:"12px 0 20px"}}><div style={{fontSize:42}}>🏆</div><div style={{fontSize:18,color:"#c9a84c",fontWeight:900,marginTop:6}}>SALA DE TROFEOS</div><div style={{fontSize:11,color:COLORS.textDim,marginTop:4}}>{team?.name} · Prestigio {Math.round(legacy.clubPrestige)}</div></div>
        {legacy.trophies.length?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>{legacy.trophies.map(trophy=><div key={trophy.id} style={{background:"linear-gradient(135deg,rgba(201,168,76,.15),#161a24)",border:"1px solid rgba(201,168,76,.25)",borderRadius:10,padding:14,textAlign:"center"}}><div style={{fontSize:30}}>{trophy.icon}</div><div style={{color:"#e8eaf0",fontSize:11,fontWeight:800,marginTop:6}}>{trophy.name}</div><div style={{color:COLORS.textDim,fontSize:9,marginTop:3}}>{trophy.season}/{String(Number(trophy.season)+1).slice(-2)}</div></div>)}</div>:<div style={{background:"#161a24",borderRadius:10,padding:28,textAlign:"center",color:COLORS.textDim,fontSize:11}}>Las vitrinas están vacías. El primer título será el comienzo de tu legado.</div>}
        <div style={{fontSize:10,color:COLORS.textDim,fontWeight:800,letterSpacing:".6px",margin:"18px 0 8px"}}>RÉCORDS DEL CLUB</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div style={{background:"#161a24",borderRadius:8,padding:12}}><div style={{fontSize:9,color:COLORS.textDim}}>MEJOR POSICIÓN</div><div style={{fontSize:20,color:"#c9a84c",fontWeight:800,marginTop:3}}>{legacy.records.bestPosition&&legacy.records.bestPosition<99?`${legacy.records.bestPosition}.º`:"—"}</div></div><div style={{background:"#161a24",borderRadius:8,padding:12}}><div style={{fontSize:9,color:COLORS.textDim}}>RÉCORD DE PUNTOS</div><div style={{fontSize:20,color:"#c9a84c",fontWeight:800,marginTop:3}}>{legacy.records.mostPoints??"—"}</div></div></div>
      </>}
    </div>
    </SwipeTabs>
  </div>;
}
