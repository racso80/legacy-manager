import { useState } from "react";
import { getAcademyMetrics, getTalentCategory, getYouthProjection } from "../youth/youthEngine.js";
import Button from "./ui/Button.jsx";
import { SwipeTabs } from "./SwipeNavigation.jsx";

const fmt = value => value >= 1000 ? `€${(value / 1000).toFixed(1)}M` : `€${value}K`;
const trendMeta = {
  rising:{ icon:"📈", label:"Subiendo", color:"#22c55e" },
  stalled:{ icon:"⚠️", label:"Estancado", color:"#f59e0b" },
  stable:{ icon:"➖", label:"Estable", color:"#8b92a3" },
};

export default function YouthAcademyScreen({ game, onPromote, onOpenPlayer }) {
  const [tab, setTab] = useState("current");
  const [feedback, setFeedback] = useState(null);
  const youth = game.youth;
  const metrics = getAcademyMetrics(game);
  const report = youth.annualReports?.[0];
  const intakeIds = new Set(youth.lastIntake ?? []);
  const standout = [...youth.players].sort((a, b) => b.potential - a.potential || a.age - b.age)[0];
  const historical = [
    ...game.players.filter(player => player.academyData),
    ...(youth.historical ?? []),
  ].sort((a, b) => (b.academyStats?.appearances ?? 0) - (a.academyStats?.appearances ?? 0) || b.overall - a.overall);
  const promotePlayer = (player) => {
    const result = onPromote?.(player.id);
    setFeedback(result ?? { ok:false, message:"No se ha podido promocionar al canterano." });
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ display:"flex", background:"#161a24", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
        {[
          ["current", "🌱 Juveniles"],
          ["history", "🏛 Históricos"],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex:1, background:"transparent", border:"none", borderBottom:tab === id ? "2px solid #c9a84c" : "2px solid transparent", color:tab === id ? "#c9a84c" : "#9aa0b4", padding:10, fontSize:11, fontWeight:800, cursor:"pointer" }}>
            {label}
          </button>
        ))}
      </div>

      <SwipeTabs tabs={["current", "history"]} activeTab={tab} onChange={setTab} style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }} contentStyle={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        <div style={{ flex:1, overflowY:"auto", padding:14 }}>
          {tab === "current" && (
            <>
              <div style={{ background:"linear-gradient(135deg,rgba(34,197,94,.13),#161a24)", border:"1px solid rgba(34,197,94,.22)", borderRadius:11, padding:14, marginBottom:14 }}>
                <div style={{ fontSize:11, color:"#22c55e", fontWeight:800, letterSpacing:".5px" }}>📋 INFORME DEL JEFE DE CANTERA</div>
                <div style={{ fontSize:12, color:"#c9ced8", lineHeight:1.55, marginTop:7 }}>
                  {standout ? `La hornada cuenta con ${youth.players.length} juveniles. ${standout.name}, ${standout.pos} de ${standout.age} años, destaca con un potencial estimado de ${standout.potential}.` : "No hay juveniles disponibles actualmente."}
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7, marginBottom:16 }}>
                {[
                  ["PRIMER EQUIPO", metrics.firstTeam],
                  ["VALOR GENERADO", fmt(metrics.totalGeneratedValue)],
                  ["VENDIDOS", metrics.sold],
                ].map(([label, value]) => (
                  <div key={label} style={{ background:"#161a24", borderRadius:8, padding:10, textAlign:"center" }}>
                    <div style={{ fontSize:16, color:"#c9a84c", fontWeight:800 }}>{value}</div>
                    <div style={{ fontSize:8, color:"#8b92a3", marginTop:3 }}>{label}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize:10, color:"#8b92a3", fontWeight:800, letterSpacing:".6px", marginBottom:8 }}>JUVENILES ACTUALES</div>
              {feedback && (
                <div style={{ background:feedback.ok ? "rgba(34,197,94,.12)" : "rgba(245,158,11,.12)", border:`1px solid ${feedback.ok ? "rgba(34,197,94,.3)" : "rgba(245,158,11,.3)"}`, color:feedback.ok ? "#22c55e" : "#f59e0b", borderRadius:9, padding:"9px 11px", fontSize:11, fontWeight:800, lineHeight:1.4, marginBottom:10 }}>
                  {feedback.message}
                </div>
              )}
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[...youth.players].sort((a, b) => b.potential - a.potential).map(player => {
                  const category = getTalentCategory(player.potential);
                  const projection = getYouthProjection(player);
                  const trend = trendMeta[player.academyData?.trend ?? "stable"] ?? trendMeta.stable;
                  const latestNotes = player.academyData?.developmentNotes ?? [];
                  const initialOverall = player.academyData?.initialOverall ?? player.overall;
                  const initialPotential = player.academyData?.initialPotential ?? player.potential;
                  const progress = game.lastYouthTrainingReport?.changes?.find(item => item.playerId === player.id);
                  const canPromote = game.players.length < 30;
                  return (
                    <div key={player.id} style={{ background:"#161a24", border:`1px solid ${category.color}22`, borderLeft:`3px solid ${category.color}`, borderRadius:10, padding:11 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <button onClick={() => onOpenPlayer(player, game.teamId)} style={{ width:42, height:42, borderRadius:9, background:`${category.color}18`, border:"none", color:category.color, fontSize:16, fontWeight:900, cursor:"pointer" }}>
                          {player.overall}
                        </button>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <span style={{ color:"#e8eaf0", fontSize:12, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{player.name}</span>
                            {intakeIds.has(player.id) && <span style={{ fontSize:8, color:"#22c55e", background:"rgba(34,197,94,.1)", padding:"2px 5px", borderRadius:4 }}>NUEVO</span>}
                          </div>
                          <div style={{ color:"#8b92a3", fontSize:9, marginTop:3 }}>{player.pos} · {player.age} años · {player.nat} · {player.academyData?.region}</div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:5 }}>
                            <span style={{ color:projection.color, background:`${projection.color}14`, border:`1px solid ${projection.color}22`, borderRadius:999, padding:"3px 6px", fontSize:8, fontWeight:850 }}>{projection.icon} {projection.label}</span>
                            <span style={{ color:trend.color, background:`${trend.color}12`, border:`1px solid ${trend.color}22`, borderRadius:999, padding:"3px 6px", fontSize:8, fontWeight:850 }}>{trend.icon} {trend.label}</span>
                          </div>
                        </div>
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontSize:9, color:"#8b92a3" }}>POTENCIAL</div>
                          <div style={{ fontSize:22, color:category.color, fontWeight:900 }}>{player.potential}</div>
                        </div>
                      </div>

                      {progress && (
                        <div style={{ marginTop:8, color:progress.changes.length ? "#22c55e" : "#8b92a3", fontSize:9 }}>
                          {progress.changes.length ? `📈 ${progress.changes.map(change => `${change.label} +${change.delta}`).join(" · ")}` : progress.progress?.[0] ? `${progress.progress[0].label}: ${progress.progress[0].value}% hacia la mejora` : "Desarrollo estable"}
                        </div>
                      )}

                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginTop:9 }}>
                        {[["LLEGÓ", initialOverall], ["HOY", player.overall], ["TECHO", `${initialPotential}→${player.potential}`]].map(([label, value]) => (
                          <div key={label} style={{ background:"rgba(0,0,0,.18)", borderRadius:7, padding:7, textAlign:"center" }}>
                            <div style={{ color:"#e8eaf0", fontSize:12, fontWeight:900 }}>{value}</div>
                            <div style={{ color:"#6b7280", fontSize:7, fontWeight:850, marginTop:2 }}>{label}</div>
                          </div>
                        ))}
                      </div>

                      {latestNotes.length > 0 && (
                        <div style={{ marginTop:8, background:"rgba(255,255,255,.035)", borderRadius:8, padding:8 }}>
                          <div style={{ color:"#8b92a3", fontSize:8, fontWeight:850, marginBottom:4 }}>SEGUIMIENTO</div>
                          {latestNotes.slice(0, 2).map((note, index) => (
                            <div key={`${note.kind}-${note.matchday}-${index}`} style={{ color:"#c9ced8", fontSize:9, lineHeight:1.45, marginTop:index ? 4 : 0 }}>
                              J{note.matchday}: {note.text}
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display:"flex", gap:7, marginTop:9 }}>
                        <Button data-swipe-ignore="true" variant="secondary" onClick={() => onOpenPlayer(player, game.teamId)} style={{ flex:1, minHeight:38, padding:8, fontSize:10 }}>
                          Ver perfil
                        </Button>
                        <Button data-swipe-ignore="true" variant={canPromote ? "primary" : "secondary"} onClick={() => promotePlayer(player)} style={{ flex:1, minHeight:38, padding:8, fontSize:10 }}>
                          {canPromote ? "⬆ Promocionar" : "Plantilla llena"}
                        </Button>
                      </div>
                      {!canPromote && (
                        <div style={{ marginTop:7, color:"#f59e0b", fontSize:9, lineHeight:1.35 }}>
                          No se puede promocionar: la plantilla del primer equipo tiene el maximo de 30 jugadores.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {report && (
                <>
                  <div style={{ fontSize:10, color:"#8b92a3", fontWeight:800, letterSpacing:".6px", margin:"18px 0 8px" }}>INFORME ANUAL {report.season}/{String(Number(report.season) + 1).slice(-2)}</div>
                  <div style={{ background:"#161a24", borderRadius:9, padding:12, fontSize:11, color:"#9aa0b4", lineHeight:1.7 }}>
                    {report.promoted} jugadores promocionados · {report.sold} vendidos<br />
                    Valor generado: <strong style={{ color:"#c9a84c" }}>{fmt(report.generatedValue)}</strong>
                    {report.standout && (
                      <>
                        <br />Promesa destacada: <strong style={{ color:"#22c55e" }}>{report.standout.name} ({report.standout.potential})</strong>
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {tab === "history" && (
            <>
              {historical.length ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {historical.map(player => {
                    const stats = player.academyStats ?? {};
                    return (
                      <button key={player.id} onClick={() => onOpenPlayer(player, game.teamId)} style={{ display:"flex", alignItems:"center", gap:10, textAlign:"left", background:"#161a24", border:"1px solid rgba(255,255,255,.06)", borderRadius:9, padding:11, cursor:"pointer" }}>
                        <div style={{ width:36, height:36, borderRadius:8, background:"rgba(201,168,76,.1)", color:"#c9a84c", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800 }}>{player.overall}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ color:"#e8eaf0", fontSize:12, fontWeight:700 }}>{player.name}</div>
                          <div style={{ color:"#8b92a3", fontSize:9, marginTop:3 }}>Ingreso T. {player.academyData?.joinedSeason} · Debut {player.academyData?.debutSeason ? `T. ${player.academyData.debutSeason}` : "pendiente"}</div>
                        </div>
                        <div style={{ textAlign:"right", fontSize:9, color:"#c9ced8" }}>PJ {stats.appearances ?? 0}<br />G {stats.goals ?? 0}</div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign:"center", color:"#8b92a3", padding:30, fontSize:11 }}>Promociona juveniles para empezar a construir la historia de tu cantera.</div>
              )}
            </>
          )}
        </div>
      </SwipeTabs>
    </div>
  );
}
