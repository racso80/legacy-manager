import { useState } from "react";
import { calculateInjuryRisk, getAccumulatedLoad, getLoadLevel, getRiskLevel } from "../medical/medicalEngine.js";
import { ATTRIBUTE_LABELS, DEFAULT_TRAINING_PLAN, INDIVIDUAL_FOCUSES, WEEKLY_TRAINING_FOCUSES, applyTrainingFocusPreset, normalizeTrainingPlan, TRAINING_DAYS, TRAINING_LOADS, TRAINING_TYPES } from "../training/trainingEngine.js";
import { COLORS } from "../utils/tokens.js";

export default function TrainingCenterScreen({ game, onPlanChange, onOpenPlayer }) {
  const plan = normalizeTrainingPlan(game.trainingPlan ?? DEFAULT_TRAINING_PLAN);
  const [selectedPlayerId,setSelectedPlayerId]=useState(game.players[0]?.id??"");
  const report=game.lastTrainingReport;
  const avgEnergy=Math.round(game.players.reduce((sum,p)=>sum+100-(p.fatigue??0),0)/Math.max(1,game.players.length));
  const avgLoad=Math.round(game.players.reduce((sum,p)=>sum+getAccumulatedLoad(p),0)/Math.max(1,game.players.length));
  const avgRisk=Math.round(game.players.reduce((sum,p)=>sum+calculateInjuryRisk(p,{fixtures:game.fixtures,teamId:game.teamId,game}),0)/Math.max(1,game.players.length));
  const loadLevel=getLoadLevel(avgLoad);
  const riskLevel=getRiskLevel(avgRisk);
  const selectedPlayer=game.players.find(p=>p.id===selectedPlayerId);
  const weeklyFocus=WEEKLY_TRAINING_FOCUSES[plan.weeklyFocus] ?? WEEKLY_TRAINING_FOCUSES.balanced;
  const changesByPlayer=Object.fromEntries((report?.changes??[]).map(item=>[item.playerId,item]));
  const improved=(report?.improved??[]).map(id=>game.players.find(p=>p.id===id)).filter(Boolean).slice(0,5);
  const prospects=game.players.filter(p=>p.age<=23&&(p.potential??p.overall)-p.overall>=3).sort((a,b)=>(b.potential-b.overall)-(a.potential-a.overall)).slice(0,5);

  const setDay=(index,type)=>{const days=[...plan.days];days[index]=type;onPlanChange({...plan,days});};
  const setWeeklyFocus=focusId=>onPlanChange(applyTrainingFocusPreset(plan,focusId));
  const setFocus=(playerId,focus)=>onPlanChange({...plan,individual:{...plan.individual,[playerId]:focus||undefined}});

  return <div style={{flex:1,overflowY:"auto",padding:14}}>
    <div style={{background:"linear-gradient(135deg,rgba(201,168,76,.15),#161a24)",border:"1px solid rgba(201,168,76,.25)",borderRadius:11,padding:14,marginBottom:14}}>
      <div style={{fontSize:11,color:"#c9a84c",fontWeight:800,letterSpacing:".6px"}}>👨‍🏫 INFORME TÉCNICO</div>
      <div style={{fontSize:12,color:"#c9ced8",lineHeight:1.55,marginTop:7}}>{improved.length?`${improved[0].name} lidera la progresión de esta semana.`:prospects.length?`${prospects[0].name} tiene margen para crecer hasta ${prospects[0].potential}. Se recomiendan minutos y continuidad.`:"La plantilla trabaja cerca de su techo actual."}</div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:7,marginBottom:16}}>{[["ENFOQUE",weeklyFocus.name,weeklyFocus.icon,"#c9a84c"],["ENERGÍA MEDIA",`${avgEnergy}%`,avgEnergy>=65?"🟢":"🟠",avgEnergy>=65?"#22c55e":"#f97316"],["CARGA ACUM.",`${avgLoad}%`,loadLevel.icon,loadLevel.color],["RIESGO MEDIO",`${avgRisk}%`,riskLevel.icon,riskLevel.color]].map(([label,value,icon,color])=><div key={label} style={{background:"#161a24",border:"1px solid rgba(255,255,255,.06)",borderRadius:9,padding:10}}><div style={{fontSize:8,color:COLORS.textDim,fontWeight:700}}>{label}</div><div style={{fontSize:15,color,fontWeight:800,marginTop:4}}>{icon} {value}</div></div>)}</div>

    <div style={{fontSize:10,color:COLORS.textDim,fontWeight:800,letterSpacing:".6px",marginBottom:8}}>ENFOQUE DE LA SEMANA</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:7,marginBottom:16}}>{Object.values(WEEKLY_TRAINING_FOCUSES).map(focus=><button key={focus.id} onClick={()=>setWeeklyFocus(focus.id)} style={{textAlign:"left",background:plan.weeklyFocus===focus.id?"rgba(201,168,76,.14)":"#161a24",border:plan.weeklyFocus===focus.id?"1px solid #c9a84c":"1px solid rgba(255,255,255,.06)",borderRadius:9,padding:10,cursor:"pointer"}}><div style={{color:plan.weeklyFocus===focus.id?"#c9a84c":"#e8eaf0",fontSize:11,fontWeight:800}}>{focus.icon} {focus.name}</div><div style={{color:COLORS.textDim,fontSize:9,lineHeight:1.35,marginTop:4}}>{focus.description}</div></button>)}</div>

    <div style={{fontSize:10,color:COLORS.textDim,fontWeight:800,letterSpacing:".6px",marginBottom:8}}>CARGA SEMANAL</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:16}}>{Object.values(TRAINING_LOADS).map(load=><button key={load.id} onClick={()=>onPlanChange({...plan,load:load.id})} style={{background:plan.load===load.id?"rgba(201,168,76,.14)":"#161a24",border:plan.load===load.id?"1px solid #c9a84c":"1px solid rgba(255,255,255,.06)",color:plan.load===load.id?"#c9a84c":COLORS.muted,borderRadius:8,padding:"9px 3px",fontSize:9,fontWeight:700,cursor:"pointer"}}>{load.icon}<br/>{load.name}</button>)}</div>

    <div style={{fontSize:10,color:COLORS.textDim,fontWeight:800,letterSpacing:".6px",marginBottom:8}}>PLAN SEMANAL</div>
    <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>{TRAINING_DAYS.map((day,index)=>{const session=TRAINING_TYPES[plan.days[index]];return <div key={day} style={{display:"flex",alignItems:"center",gap:9,background:"#161a24",border:"1px solid rgba(255,255,255,.06)",borderRadius:8,padding:"8px 10px"}}><div style={{width:65,fontSize:10,color:COLORS.muted,fontWeight:700}}>{day}</div><span style={{fontSize:17}}>{session.icon}</span><select value={session.id} onChange={event=>setDay(index,event.target.value)} style={{flex:1,background:"#1e2330",border:"1px solid rgba(255,255,255,.08)",color:"#e8eaf0",borderRadius:6,padding:"7px 8px",fontSize:11}}>{Object.values(TRAINING_TYPES).map(type=><option key={type.id} value={type.id}>{type.name}</option>)}</select></div>})}</div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:16}}>{Object.values(TRAINING_TYPES).map(type=><div key={type.id} style={{background:"#13161f",borderRadius:8,padding:10}}><div style={{color:"#e8eaf0",fontSize:11,fontWeight:700}}>{type.icon} {type.name}</div><div style={{color:COLORS.textDim,fontSize:9,lineHeight:1.45,marginTop:4}}>{type.description}</div></div>)}</div>

    <div style={{fontSize:10,color:COLORS.textDim,fontWeight:800,letterSpacing:".6px",marginBottom:8}}>ESPECIALIZACIÓN INDIVIDUAL</div>
    <div style={{background:"#161a24",borderRadius:9,padding:11,marginBottom:17}}><select value={selectedPlayerId} onChange={event=>setSelectedPlayerId(event.target.value)} style={{width:"100%",background:"#1e2330",border:"1px solid rgba(255,255,255,.08)",color:"#e8eaf0",borderRadius:7,padding:8,fontSize:11,marginBottom:7}}>{game.players.map(player=><option key={player.id} value={player.id}>{player.name} · {player.pos} · {player.overall}/{player.potential}</option>)}</select><select value={plan.individual[selectedPlayerId]??""} onChange={event=>setFocus(selectedPlayerId,event.target.value)} style={{width:"100%",background:"#1e2330",border:"1px solid rgba(255,255,255,.08)",color:"#c9a84c",borderRadius:7,padding:8,fontSize:11}}><option value="">Sin objetivo individual</option>{INDIVIDUAL_FOCUSES.filter(key=>selectedPlayer?.group==="POR"?key==="porteria":key!=="porteria").map(key=><option key={key} value={key}>Mejorar {ATTRIBUTE_LABELS[key]}</option>)}</select></div>

    <div style={{fontSize:10,color:COLORS.textDim,fontWeight:800,letterSpacing:".6px",marginBottom:8}}>INFORME DE PROGRESIÓN</div>
    {report?<div style={{display:"flex",flexDirection:"column",gap:7}}>{[...game.players].sort((a,b)=>{const ac=changesByPlayer[a.id]?.changes?.length??0;const bc=changesByPlayer[b.id]?.changes?.length??0;return bc-ac||(b.potential-b.overall)-(a.potential-a.overall);}).slice(0,8).map(player=>{const item=changesByPlayer[player.id];const actual=item?.changes??[];const progress=item?.progress?.[0];return <button key={player.id} onClick={()=>onOpenPlayer(player,game.teamId)} style={{display:"flex",alignItems:"center",gap:9,textAlign:"left",background:"#161a24",border:"1px solid rgba(255,255,255,.06)",borderRadius:8,padding:10,cursor:"pointer"}}><div style={{width:34,height:34,borderRadius:7,background:"rgba(201,168,76,.1)",color:"#c9a84c",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>{player.overall}</div><div style={{flex:1}}><div style={{color:"#e8eaf0",fontSize:11,fontWeight:700}}>{player.name} {player.age<=23&&player.potential-player.overall>=3?"🌱":""}</div><div style={{color:actual.length?"#22c55e":COLORS.textDim,fontSize:9,marginTop:3}}>{actual.length?actual.map(change=>`${change.label} ${change.delta>0?"+":""}${change.delta}`).join(" · "):progress?`${progress.label}: ${progress.value}% hacia la mejora`:"Sin progreso significativo"}</div></div><div style={{color:COLORS.textDim,fontSize:9}}>POT {player.potential}</div></button>})}<div style={{color:COLORS.textDim,fontSize:9,lineHeight:1.5,marginTop:5}}>El plan se aplica automáticamente después de cada jornada. Una carga mayor acelera el progreso, pero incrementa cansancio y riesgo médico.</div></div>:<div style={{background:"#161a24",borderRadius:9,padding:20,textAlign:"center",color:COLORS.textDim,fontSize:11}}>El primer informe llegará después de jugar una jornada.</div>}
  </div>;
}
