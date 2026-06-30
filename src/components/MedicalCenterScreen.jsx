import { useState } from "react";
import { getLoadLevel, getRiskLevel } from "../medical/medicalEngine.js";
import { getMedicalAlerts } from "../state/gameStateSelectors.js";
import { SwipeTabs } from "./SwipeNavigation.jsx";

function RiskBar({ risk }) {
  const level = getRiskLevel(risk);
  return <div><div style={{ display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:4 }}><span style={{ color:level.color, fontWeight:700 }}>{level.icon} Riesgo {level.label}</span><strong style={{ color:level.color }}>{risk}%</strong></div><div style={{ height:4, background:"#252a36", borderRadius:3, overflow:"hidden" }}><div style={{ width:`${risk}%`, height:"100%", background:level.color }}/></div></div>;
}

export default function MedicalCenterScreen({ game, onOpenPlayer }) {
  const [tab,setTab]=useState("patients");
  const assessed = getMedicalAlerts(game, { riskThreshold:35, loadThreshold:55 }).map(item => ({
    ...item,
    loadLevel:getLoadLevel(item.load),
    energy:item.state.energy,
  }));
  const patients = assessed.filter(item => item.state.isInjured || item.state.isRecovering);
  const warnings = assessed.filter(item => !(item.state.isInjured || item.state.isRecovering)).slice(0,5);

  const tabs=[["patients",`🏥 Pacientes (${patients.length})`],["prevention",`🛡 Prevención (${warnings.length})`]];
  return <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
    <div style={{display:"flex",background:"#161a24",borderBottom:"1px solid rgba(255,255,255,.06)"}}>{tabs.map(([id,label])=><button key={id} onClick={()=>setTab(id)} style={{flex:1,background:"transparent",border:"none",borderBottom:tab===id?"2px solid #c9a84c":"2px solid transparent",color:tab===id?"#c9a84c":"#6b7280",padding:10,fontSize:11,fontWeight:700,cursor:"pointer"}}>{label}</button>)}</div>
    <SwipeTabs tabs={tabs.map(([id])=>id)} activeTab={tab} onChange={setTab} style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} contentStyle={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
    <div style={{flex:1,overflowY:"auto",padding:14}}>
    <div style={{ background:"linear-gradient(135deg,rgba(34,197,94,.12),#161a24)", border:"1px solid rgba(34,197,94,.22)", borderRadius:11, padding:14, marginBottom:14 }}><div style={{ display:"flex", alignItems:"center", gap:10 }}><span style={{ fontSize:28 }}>👨‍⚕️</span><div><div style={{ color:"#22c55e", fontSize:12, fontWeight:800, letterSpacing:".5px" }}>INFORME DEL CUERPO MÉDICO</div><div style={{ color:"#9aa0b4", fontSize:11, marginTop:3 }}>{tab==="patients"?(patients.length ? `${patients.length} jugador${patients.length===1?"":"es"} en seguimiento médico esta semana.` : "Toda la plantilla está disponible, sin problemas que reportar."):(warnings.length?`${warnings.length} jugador${warnings.length===1?"":"es"} conviene vigilar de cerca para evitar lesiones.`:"Nadie en riesgo elevado por ahora.")}</div></div></div></div>
    {tab==="patients"&&<><div style={{ fontSize:10, color:"#6b7280", fontWeight:800, letterSpacing:".6px", marginBottom:8 }}>JUGADORES LESIONADOS</div>
    {patients.length ? <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:18 }}>{patients.map(({player,status})=>{
      const medical=player.medical??{};
      return <button key={player.id} onClick={()=>onOpenPlayer(player,game.teamId)} style={{ width:"100%", textAlign:"left", background:"#161a24", border:"1px solid rgba(239,68,68,.16)", borderRadius:10, padding:12, cursor:"pointer" }}><div style={{ display:"flex", alignItems:"center", gap:10 }}><div style={{ width:38,height:38,borderRadius:8,background:`${status.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>🏥</div><div style={{ flex:1 }}><div style={{ color:"#e8eaf0", fontSize:13, fontWeight:700 }}>{player.name}</div><div style={{ color:status.color, fontSize:10, marginTop:2 }}>{status.label} · {medical.type??"Lesión muscular"}</div></div><div style={{ textAlign:"right" }}><div style={{ color:"#fff", fontWeight:800, fontSize:14 }}>{medical.remainingDays??0} días</div><div style={{ color:"#4b5563", fontSize:9 }}>restantes</div></div></div><div style={{ marginTop:10 }}><div style={{ display:"flex", justifyContent:"space-between", color:"#6b7280", fontSize:9, marginBottom:4 }}><span>RECUPERACIÓN</span><span>{medical.recovery??0}%</span></div><div style={{ height:5, background:"#252a36", borderRadius:3, overflow:"hidden" }}><div style={{ width:`${medical.recovery??0}%`, height:"100%", background:status.color }}/></div></div></button>;
    })}</div>:<div style={{ background:"#161a24", borderRadius:9, padding:18, textAlign:"center", color:"#6b7280", fontSize:11, marginBottom:18 }}>🟢 Todos los jugadores están disponibles.</div>}{patients.some(item=>item.player.medical?.remainingDays>0)&&<div style={{ color:"#4b5563", fontSize:9, lineHeight:1.5, marginTop:15 }}>Los plazos son estimados y pueden variar según la evolución del jugador.</div>}</>}
    {tab==="prevention"&&<><div style={{ fontSize:10, color:"#6b7280", fontWeight:800, letterSpacing:".6px", marginBottom:8 }}>RECOMENDACIONES DE DESCANSO</div>
    {warnings.length ? <div style={{ display:"flex", flexDirection:"column", gap:7 }}>{warnings.map(({player,risk,status,load,loadLevel,energy})=><button key={player.id} onClick={()=>onOpenPlayer(player,game.teamId)} style={{ width:"100%", textAlign:"left", background:"#161a24", border:"1px solid rgba(255,255,255,.06)", borderRadius:9, padding:11, cursor:"pointer" }}><div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8 }}><div style={{ flex:1 }}><div style={{ color:"#e8eaf0", fontSize:12, fontWeight:700 }}>{player.name}</div><div style={{ color:status.color, fontSize:9, marginTop:2 }}>{status.label} · Energía: {energy}%</div><div style={{ color:loadLevel.color, fontSize:9, marginTop:2 }}>Carga {loadLevel.label.toLowerCase()}: {load}%</div></div><div style={{ color:"#9aa0b4", fontSize:9, maxWidth:130, textAlign:"right" }}>{loadLevel.id==="critical"?"Necesita parar antes de que el cuerpo lo haga por él.":loadLevel.id==="high"?"Conviene aliviar su carga esta semana.":"Vigilar sin urgencia, dosificar minutos si el calendario aprieta."}</div></div><RiskBar risk={risk}/></button>)}</div>:<div style={{ color:"#6b7280", fontSize:11, textAlign:"center", padding:20 }}>No hay alertas de sobrecarga.</div>}
    </>}
    </div>
    </SwipeTabs>
  </div>;
}
