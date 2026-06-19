import { useMemo, useState } from "react";
import { getKeyAttributes, getMarketValue, getPlayerSeasonStats, getPlayerTags, getPotential, getRecentForm } from "../players/playerProfile.js";
import { calculateInjuryRisk, formatMedicalDuration, getPhysicalStatus, getRiskLevel } from "../medical/medicalEngine.js";

const COUNTRY_NAMES = { ES:"España", FR:"Francia", GH:"Ghana", BR:"Brasil", AR:"Argentina", PT:"Portugal", DE:"Alemania", ENG:"Inglaterra", UY:"Uruguay", HR:"Croacia", MA:"Marruecos", SN:"Senegal", BE:"Bélgica", IT:"Italia", NL:"Países Bajos" };
const FLAGS = { ES:"🇪🇸", FR:"🇫🇷", GH:"🇬🇭", BR:"🇧🇷", AR:"🇦🇷", PT:"🇵🇹", DE:"🇩🇪", ENG:"🏴", UY:"🇺🇾", HR:"🇭🇷", MA:"🇲🇦", SN:"🇸🇳", BE:"🇧🇪", IT:"🇮🇹", NL:"🇳🇱" };
const fmtMoney = value => value >= 1000 ? `€${(value/1000).toFixed(value%1000===0?0:1)}M` : `€${value}K`;

function Metric({ label, value, color="#e8eaf0", helper }) {
  return <div style={{ background:"#161a24", border:"1px solid rgba(255,255,255,.06)", borderRadius:9, padding:11 }}><div style={{ fontSize:9, color:"#6b7280", fontWeight:700, letterSpacing:".4px" }}>{label}</div><div style={{ fontSize:19, color, fontWeight:800, marginTop:3 }}>{value}</div>{helper&&<div style={{ fontSize:9, color:"#4b5563", marginTop:2 }}>{helper}</div>}</div>;
}

function StatBar({ label, value }) {
  const color = value >= 85 ? "#c9a84c" : value >= 75 ? "#22c55e" : value >= 65 ? "#f59e0b" : "#ef4444";
  return <div style={{ marginBottom:12 }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:5 }}><span style={{ color:"#9aa0b4" }}>{label}</span><strong style={{ color }}>{value}</strong></div><div style={{ height:5, background:"#252a36", borderRadius:4, overflow:"hidden" }}><div style={{ width:`${value}%`, height:"100%", background:color }}/></div></div>;
}

export default function PlayerProfileScreen({ player, game, team, onGoLineup }) {
  const [tab, setTab] = useState("general");
  const stats = useMemo(() => getPlayerSeasonStats(player, game, team?.id), [player, game, team?.id]);
  const form = useMemo(() => getRecentForm(player, game, team?.id), [player, game, team?.id]);
  const potential = getPotential(player);
  const marketValue = getMarketValue(player);
  const tags = getPlayerTags(player, stats, form, game.season);
  const attributes = getKeyAttributes(player);
  const relatedNews = (game.news ?? []).filter(item => item.playerIds?.includes(player.id));
  const history = player.careerHistory ?? [];
  const energy = Math.max(0, 100 - (player.fatigue ?? 0));
  const physicalStatus = getPhysicalStatus(player);
  const injuryRisk = calculateInjuryRisk(player,{fixtures:game.fixtures,teamId:team?.id});
  const injuryRiskLevel = getRiskLevel(injuryRisk);
  const isOwnPlayer = game.players.some(item => item.id === player.id);
  const tabs = [["general","General"],["stats","Estadísticas"],["contract","Contrato"],["history","Historial"],["news","Noticias"]];

  return <div style={{ flex:1, overflowY:"auto", background:"#0d0f14" }}>
    <section style={{ position:"relative", minHeight:218, overflow:"hidden", background:`linear-gradient(135deg,${team?.color ?? "#c9a84c"}33,#151925 55%,#0d0f14)` }}>
      <img src={player.imageUrl || `/players/${player.id}.png`} alt={player.name} onError={event=>event.currentTarget.style.display="none"} style={{ position:"absolute", right:-5, bottom:0, width:"52%", height:"95%", objectFit:"contain", objectPosition:"bottom" }}/>
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,rgba(13,15,20,.98) 0%,rgba(13,15,20,.72) 55%,rgba(13,15,20,.12) 100%)" }}/>
      <div style={{ position:"relative", zIndex:1, padding:"22px 16px", maxWidth:"66%" }}>
        <div style={{ color:team?.color ?? "#c9a84c", fontSize:10, fontWeight:800, letterSpacing:".8px" }}>{team?.name ?? "Agente libre"}</div>
        <h1 style={{ fontSize:25, lineHeight:1.05, margin:"8px 0 9px", color:"#fff" }}>{player.name}</h1>
        <div style={{ fontSize:12, color:"#aab0bd", lineHeight:1.7 }}>{player.pos} · {player.age} años<br/>{FLAGS[player.nat] ?? "🌍"} {COUNTRY_NAMES[player.nat] ?? player.nat ?? "Internacional"}</div>
        <div style={{ display:"flex", gap:9, alignItems:"flex-end", marginTop:13 }}><div><div style={{ fontSize:9, color:"#6b7280", fontWeight:700 }}>MEDIA</div><div style={{ fontSize:34, lineHeight:1, fontWeight:900, color:"#c9a84c" }}>{player.overall}</div></div><div style={{ height:35, width:1, background:"rgba(255,255,255,.12)" }}/><div><div style={{ fontSize:9, color:"#6b7280", fontWeight:700 }}>POTENCIAL</div><div style={{ fontSize:25, lineHeight:1, fontWeight:900, color:"#e8eaf0" }}>{potential}</div></div></div>
      </div>
    </section>

    <nav style={{ display:"flex", overflowX:"auto", background:"#13161f", borderBottom:"1px solid rgba(255,255,255,.07)", position:"sticky", top:0, zIndex:4 }}>
      {tabs.map(([id,label])=><button key={id} onClick={()=>setTab(id)} style={{ flex:"1 0 auto", background:"transparent", border:"none", borderBottom:tab===id?"2px solid #c9a84c":"2px solid transparent", color:tab===id?"#c9a84c":"#6b7280", fontSize:10, fontWeight:700, padding:"11px 9px", cursor:"pointer" }}>{label}</button>)}
    </nav>

    <div style={{ padding:14 }}>
      {tab==="general"&&<>
        {tags.length>0&&<div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>{tags.map(tag=><span key={tag.label} style={{ background:`${tag.color}18`, border:`1px solid ${tag.color}44`, color:tag.color, borderRadius:15, padding:"5px 9px", fontSize:10, fontWeight:700 }}>{tag.icon} {tag.label}</span>)}</div>}
        <div style={{ fontSize:10, color:"#6b7280", fontWeight:800, letterSpacing:".6px", marginBottom:8 }}>ESTADO ACTUAL</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7, marginBottom:16 }}><Metric label="MORAL" value={player.morale ?? 75} color={(player.morale??75)>=70?"#22c55e":"#f59e0b"}/><Metric label="ENERGÍA" value={energy} color={energy>=70?"#22c55e":energy>=45?"#f59e0b":"#ef4444"}/><Metric label="FORMA" value={form.label} color={form.color}/></div>
        <div style={{ fontSize:10, color:"#6b7280", fontWeight:800, letterSpacing:".6px", marginBottom:8 }}>ESTADO MÉDICO</div>
        <div style={{ background:"#161a24", border:`1px solid ${physicalStatus.color}33`, borderRadius:10, padding:12, marginBottom:16 }}><div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}><div><div style={{ color:physicalStatus.color, fontSize:13, fontWeight:800 }}>{physicalStatus.icon} {physicalStatus.label}</div>{player.medical?.type&&player.medical.phase!=="available"&&<div style={{ color:"#9aa0b4", fontSize:10, marginTop:4 }}>{player.medical.type} · {formatMedicalDuration(player.medical.remainingDays??0)} restante</div>}</div><div style={{ textAlign:"right" }}><div style={{ color:injuryRiskLevel.color, fontSize:14, fontWeight:800 }}>{injuryRisk}%</div><div style={{ color:injuryRiskLevel.color, fontSize:9 }}>RIESGO {injuryRiskLevel.label.toUpperCase()}</div></div></div>{player.medical?.phase&&player.medical.phase!=="available"&&<div style={{ marginTop:10 }}><div style={{ height:5, background:"#252a36", borderRadius:3, overflow:"hidden" }}><div style={{ width:`${player.medical.recovery??0}%`, height:"100%", background:physicalStatus.color }}/></div><div style={{ color:"#4b5563", fontSize:9, marginTop:4 }}>Recuperación {player.medical.recovery??0}% · regreso estimado J{player.medical.expectedReturnMatchday??"—"}</div></div>}</div>
        <div style={{ fontSize:10, color:"#6b7280", fontWeight:800, letterSpacing:".6px", marginBottom:8 }}>ATRIBUTOS CLAVE</div>
        <div style={{ background:"#161a24", borderRadius:10, padding:13, marginBottom:16 }}>{attributes.map(([label,value])=><StatBar key={label} label={label} value={value??player.overall}/>)}</div>
        <div style={{ fontSize:10, color:"#6b7280", fontWeight:800, letterSpacing:".6px", marginBottom:8 }}>EVOLUCIÓN DE TEMPORADA</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}><Metric label="MEDIA" value={`${player.seasonStartOverall??player.overall} → ${player.overall}`} color={player.overall>(player.seasonStartOverall??player.overall)?"#22c55e":"#e8eaf0"}/><Metric label="VALOR" value={`${fmtMoney(player.seasonStartValue??marketValue)} → ${fmtMoney(marketValue)}`} color={marketValue>(player.seasonStartValue??marketValue)?"#22c55e":"#e8eaf0"}/><Metric label="GOLES" value={`0 → ${stats.goals}`}/><Metric label="ASISTENCIAS" value={`0 → ${stats.assists}`}/></div>
      </>}

      {tab==="stats"&&<><div style={{ fontSize:10, color:"#6b7280", fontWeight:800, letterSpacing:".6px", marginBottom:9 }}>TEMPORADA {game.season}/{String(Number(game.season)+1).slice(-2)}</div><div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>{[["PARTIDOS",stats.appearances],["TITULARIDADES",stats.starts],["MINUTOS",stats.minutes],["GOLES",stats.goals],["ASISTENCIAS",stats.assists],[(player.group==="POR"||player.pos==="POR")?"PORTERÍAS A CERO":"TARJETAS",(player.group==="POR"||player.pos==="POR")?stats.cleanSheets:`${stats.yellows} 🟨 · ${stats.reds} 🟥`],["NOTA MEDIA",stats.averageRating]].map(([label,value])=><Metric key={label} label={label} value={value}/>)}</div><div style={{ color:"#4b5563", fontSize:9, lineHeight:1.5, marginTop:12 }}>Los minutos y titularidades son exactos para los partidos registrados con el nuevo sistema. En temporadas antiguas pueden mostrarse estimaciones.</div></>}

      {tab==="contract"&&<><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}><Metric label="SALARIO" value={`€${player.salary??16}K`} helper="por semana"/><Metric label="CONTRATO" value={player.contractEnd??"—"} helper="año de finalización"/><Metric label="VALOR DE MERCADO" value={fmtMoney(marketValue)}/><Metric label="CLÁUSULA" value={fmtMoney(player.releaseClause??Math.round(marketValue*1.7))}/></div><div style={{ background:"rgba(201,168,76,.08)", border:"1px solid rgba(201,168,76,.2)", borderRadius:9, padding:12, color:"#9aa0b4", fontSize:11, lineHeight:1.5, marginTop:12 }}>La estructura contractual ya está preparada para futuras renovaciones y negociaciones.</div></>}

      {tab==="history"&&<><div style={{ fontSize:10, color:"#6b7280", fontWeight:800, letterSpacing:".6px", marginBottom:8 }}>HISTORIAL DE TEMPORADAS</div>{history.length?<div style={{ display:"flex", flexDirection:"column", gap:8 }}>{history.map(entry=><div key={`${entry.season}-${entry.clubId}`} style={{ background:"#161a24", borderRadius:9, padding:12 }}><div style={{ color:"#c9a84c", fontWeight:800, fontSize:13 }}>{entry.season}/{String(Number(entry.season)+1).slice(-2)}</div><div style={{ color:"#9aa0b4", fontSize:11, margin:"3px 0 9px" }}>{entry.clubName}</div><div style={{ display:"flex", gap:16, fontSize:11, color:"#e8eaf0" }}><span>PJ: {entry.appearances}</span><span>G: {entry.goals}</span><span>A: {entry.assists}</span><span>Media: {entry.overall}</span></div></div>)}</div>:<div style={{ textAlign:"center", color:"#6b7280", padding:"20px 10px", fontSize:12 }}>El historial se completará al terminar la primera temporada.</div>}<div style={{ fontSize:10, color:"#6b7280", fontWeight:800, letterSpacing:".6px", margin:"20px 0 8px" }}>HISTORIAL MÉDICO</div>{player.medicalHistory?.length?<div style={{ display:"flex", flexDirection:"column", gap:7 }}>{[...player.medicalHistory].reverse().map(item=><div key={item.id} style={{ background:"#161a24", borderLeft:"3px solid #f97316", borderRadius:8, padding:10 }}><div style={{ color:"#e8eaf0", fontSize:12, fontWeight:700 }}>{item.type}</div><div style={{ color:"#6b7280", fontSize:10, marginTop:3 }}>T. {item.season}/{String(Number(item.season)+1).slice(-2)} · J{item.matchday} · {item.totalDays} días</div></div>)}</div>:<div style={{ color:"#6b7280", fontSize:11 }}>No constan lesiones en su historial.</div>}</>}

      {tab==="news"&&(relatedNews.length?<div style={{ display:"flex", flexDirection:"column", gap:8 }}>{relatedNews.map(item=><div key={item.id} style={{ background:"#161a24", borderLeft:"3px solid #c9a84c", borderRadius:8, padding:11 }}><div style={{ color:"#e8eaf0", fontSize:12, fontWeight:700, lineHeight:1.4 }}>📰 {item.title}</div><div style={{ color:"#4b5563", fontSize:9, marginTop:5 }}>T. {item.seasonLabel}{item.matchday?` · J${item.matchday}`:""}</div></div>)}</div>:<div style={{ textAlign:"center", color:"#6b7280", padding:"35px 10px", fontSize:12 }}>Todavía no hay noticias relacionadas con este jugador.</div>)}

      <div style={{ fontSize:10, color:"#6b7280", fontWeight:800, letterSpacing:".6px", margin:"20px 0 8px" }}>ACCIONES RÁPIDAS</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}><button onClick={()=>setTab("contract")} className="btn-gold" style={{ padding:10, borderRadius:8, fontSize:11 }}>📋 Ver contrato</button>{isOwnPlayer&&<button onClick={onGoLineup} style={{ background:"#1e2330", border:"1px solid rgba(255,255,255,.1)", color:"#e8eaf0", borderRadius:8, fontSize:11, cursor:"pointer" }}>🔄 Hacer titular</button>}<button disabled style={{ background:"#161a24", border:"1px solid rgba(255,255,255,.06)", color:"#4b5563", borderRadius:8, padding:10, fontSize:11 }}>🏋 Entrenar · Próximamente</button><button disabled style={{ background:"#161a24", border:"1px solid rgba(255,255,255,.06)", color:"#4b5563", borderRadius:8, padding:10, fontSize:11 }}>⭐ Seguimiento · Próximamente</button></div>
    </div>
  </div>;
}
