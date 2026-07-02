import { useState } from "react";
import TeamCrest from "../TeamCrest.jsx";
import { Initials, LiveLineupPanel, TacticsInMatch, TacticalBoardOverlay } from "../../App.jsx";

export default function PCMatchScreen({
  fixture, finished, currentMinute, displayMinute, matchPhase, pauseEvent, segment, segments,
  periodProgress, halfLabel, addedTime, possession, isHome, leftTeam, rightTeam, leftGoals, rightGoals,
  leftIsUser, rightIsUser, avgFatigue, fatColor, tactics, setTactics, activeUserCount, oppLineup,
  oppSentOffIds, matchAutosaveAt, events, eventColors, eventLabels, liveStats, visibleLiveSignals,
  keyEventBanner, pendingInjury, setPendingInjury, liveDecision, setLiveDecision, acknowledgeLiveDecision,
  openTacticalBoard, matchFormation, applyMatchFormation, lineup, subs, livePlayer, selectedFormationSlot,
  setSelectedFormationSlot, swapFormationSlots, doSubstitution, subsUsed, maxSubs, subbingSlot, setSubbingSlot,
  sentOffIds, subbedOutIds, playing, setPlaying, togglePlay, manualAdvance, abandonMatch, endMatch,
  tacticalBoardOpen, closeTacticalBoard, userTeam, oppTeam, oppFormation, liveOppPlayers,
}) {
  const [oppExpanded, setOppExpanded] = useState(false);

  const userGoals = leftIsUser ? leftGoals : rightGoals;
  const opponentGoals = leftIsUser ? rightGoals : leftGoals;
  const isDraw = userGoals === opponentGoals;
  const userWon = userGoals > opponentGoals;

  const openSignal = (signal) => {
    setPlaying(false);
    setLiveDecision(signal);
  };

  return (
    <div className="pc-match-layout">
      {/* ── LEFT: marcador + estadisticas + eventos ── */}
      <div className="pc-match-left">
        <div className="pc-panel-card">
          <div style={{ fontSize: 11, color: "#c9a84c", fontWeight: 900, letterSpacing: ".5px", marginBottom: 8, textAlign: "center" }}>
            J{fixture.matchday} · {finished ? "FINALIZADO" : currentMinute === 0 ? "INICIO" : matchPhase === "halftime" ? "DESCANSO" : `MIN ${displayMinute}'${pauseEvent ? " · DETENIDO" : ""}`}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <TeamCrest team={leftTeam} size={48} style={{ margin: "0 auto 6px" }} />
              <div style={{ fontSize: 13, fontWeight: 800, color: leftIsUser ? "#c9a84c" : "#e8eaf0" }}>{leftTeam?.short}</div>
              <div style={{ fontSize: 9, color: "#6b7280" }}>🏠 Local{leftIsUser ? " ★" : ""}</div>
            </div>
            <div style={{ background: "#0d0f14", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(201,168,76,.25)" }}>
              <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 3, color: "#e8eaf0" }}>{leftGoals} - {rightGoals}</div>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <TeamCrest team={rightTeam} size={48} style={{ margin: "0 auto 6px" }} />
              <div style={{ fontSize: 13, fontWeight: 800, color: rightIsUser ? "#c9a84c" : "#e8eaf0" }}>{rightTeam?.short}</div>
              <div style={{ fontSize: 9, color: "#6b7280" }}>✈️ Visitante{rightIsUser ? " ★" : ""}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 12 }}>
            {segments.map((_, i) => <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i < segment ? "#c9a84c" : "#1e2330" }} />)}
          </div>

          <div style={{ marginTop: 10, background: "#0d0f14", border: "1px solid rgba(255,255,255,.06)", borderRadius: 9, padding: "8px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, fontWeight: 800, marginBottom: 6 }}>
              <span style={{ color: "#c9a84c" }}>{displayMinute}'</span>
              <span style={{ color: "#6b7280" }}>{matchPhase.startsWith("first") || matchPhase === "halftime" ? "1ª parte" : "2ª parte"}{matchPhase.includes("Added") ? ` · descuento +${halfLabel === "first" ? addedTime.first ?? 0 : addedTime.second ?? 0}` : ""}</span>
            </div>
            <div style={{ height: 7, background: "#1e2330", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${periodProgress}%`, height: "100%", background: "linear-gradient(90deg,#8a7330,#c9a84c)", borderRadius: 999, transition: "width .25s ease" }} />
            </div>
          </div>

          {segment > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: leftIsUser ? "#c9a84c" : "#6b7280", fontWeight: 700 }}>{isHome ? possession : 100 - possession}%</span>
                <span style={{ fontSize: 9, color: "#4b5563", fontWeight: 600 }}>⚽ POSESIÓN</span>
                <span style={{ fontSize: 10, color: rightIsUser ? "#c9a84c" : "#6b7280", fontWeight: 700 }}>{isHome ? 100 - possession : possession}%</span>
              </div>
              <div style={{ height: 6, background: "#1e2330", borderRadius: 3, overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${isHome ? possession : 100 - possession}%`, height: "100%", background: leftIsUser ? "linear-gradient(90deg,#8a7330,#c9a84c)" : "linear-gradient(90deg,#4b5563,#6b7280)", transition: "width .5s ease" }} />
                <div style={{ width: `${isHome ? 100 - possession : possession}%`, height: "100%", background: rightIsUser ? "linear-gradient(90deg,#c9a84c,#8a7330)" : "linear-gradient(90deg,#6b7280,#4b5563)", transition: "width .5s ease" }} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 10 }}>
            <div style={{ fontSize: 10, color: "#6b7280" }}>💪 Cansancio: <span style={{ color: fatColor, fontWeight: 700 }}>{avgFatigue}</span></div>
            <div style={{ fontSize: 10, color: "#6b7280" }}>
              🎯 <span style={{ color: tactics.mentalidad === "ofensiva" ? "#ef4444" : tactics.mentalidad === "defensiva" ? "#3b82f6" : "#c9a84c", fontWeight: 700 }}>{tactics.mentalidad.toUpperCase()}</span>
              {" · "}{tactics.presion} presión{" · "}{tactics.estilo}
            </div>
            <div style={{ fontSize: 10, color: activeUserCount < 11 ? "#ef4444" : oppSentOffIds.length ? "#22c55e" : "#6b7280", fontWeight: 700 }}>👥 {activeUserCount} vs {oppLineup.filter(id => id && !oppSentOffIds.includes(id)).length}</div>
          </div>
          <div style={{ marginTop: 8, fontSize: 9, color: "#22c55e", fontWeight: 700, textAlign: "center" }}>
            Partido guardado{matchAutosaveAt ? ` · ${new Date(matchAutosaveAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </div>
        </div>

        <div className="pc-panel-card" style={{ padding: 11, flexShrink: 0 }}>
          <div className="pc-panel-title" style={{ marginBottom: 9 }}>ESTADÍSTICAS DEL PARTIDO</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
            {[["Tiros", `${liveStats.userShots}-${liveStats.opponentShots}`], ["A puerta", `${liveStats.userShotsOnTarget}-${liveStats.opponentShotsOnTarget}`], ["Ocas.", `${liveStats.userBigChances}-${liveStats.opponentBigChances}`], ["Paradas", `${liveStats.userSaves}-${liveStats.opponentSaves}`], ["Tarj.", `${liveStats.userYellows + liveStats.userReds}-${liveStats.opponentYellows + liveStats.opponentReds}`]].map(([label, value]) => (
              <div key={label} style={{ background: "#0d0f14", borderRadius: 7, padding: "7px 4px", textAlign: "center" }}>
                <div style={{ fontSize: 8, color: "#6b7280", fontWeight: 800 }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: 13, color: "#e8eaf0", fontWeight: 900, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pc-panel-card pc-match-feed-scroll" style={{ flex: 1, minHeight: 0, padding: 11 }}>
          <div className="pc-panel-title" style={{ marginBottom: 8, flexShrink: 0 }}>EVENTOS DEL PARTIDO</div>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {events.length === 0 && !finished && (
              <div style={{ textAlign: "center", color: "#6b7280", fontSize: 12, marginTop: 30, lineHeight: 1.6 }}>
                Configura tus tácticas y pulsa "Play" para comenzar
              </div>
            )}
            {[...events].reverse().map((e, i) => {
              const color = eventColors[e.type] ?? "#6b7280";
              const isGoal = e.type === "GOAL" || e.type === "PENALTY";
              return (
                <div key={i} className={isGoal ? "goal-event" : ""}
                  style={{ background: "#161a24", borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, borderLeft: `3px solid ${color}` }}>
                  <div style={{ fontSize: 11, color: "#6b7280", minWidth: 24, fontWeight: 700 }}>{e.minute}'</div>
                  <div style={{ background: `${color}22`, color, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, minWidth: 54, textAlign: "center" }}>{e.secondYellow ? "DOBLE 🟨" : eventLabels[e.type] ?? e.type}</div>
                  <div style={{ fontSize: 11, color: "#e8eaf0", flex: 1, lineHeight: 1.35 }}>{e.description}</div>
                </div>
              );
            })}
          </div>
          {finished && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.07)", flexShrink: 0 }}>
              <div style={{ textAlign: "center", fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
                <span style={{ color: "#e8eaf0" }}>{leftGoals} - {rightGoals}</span>{" · "}
                {userWon ? <span style={{ color: "#22c55e" }}>🏆 Victoria</span> : isDraw ? <span style={{ color: "#f59e0b" }}>🤝 Empate</span> : <span style={{ color: "#ef4444" }}>❌ Derrota</span>}
              </div>
              <button onClick={endMatch} className="btn-gold" style={{ width: "100%", padding: 11, borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                Continuar →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── CENTER: avisos + tacticas + cambios + controles ── */}
      <div className="pc-match-center">
        {keyEventBanner && !pendingInjury && (
          <div className="bounce-in" style={{
            background: keyEventBanner.type === "RED" ? "#ef444422" : keyEventBanner.type === "YELLOW" ? "#fbbf2422" : "#22c55e22",
            border: `1px solid ${keyEventBanner.type === "RED" ? "#ef444455" : keyEventBanner.type === "YELLOW" ? "#fbbf2455" : "#22c55e55"}`,
            borderRadius: 10, padding: "10px 14px", flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>{keyEventBanner.type === "RED" ? "🟥" : keyEventBanner.type === "YELLOW" ? "🟨" : "⚽"}</span>
            <div style={{ flex: 1, fontSize: 12, color: "#e8eaf0", lineHeight: 1.4 }}>{keyEventBanner.description}</div>
          </div>
        )}

        {pendingInjury && (
          <div style={{ background: "#f9731622", border: "1px solid #f9731655", borderRadius: 10, padding: "10px 14px", flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🚑</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#f97316" }}>{pendingInjury.name} se ha lesionado</div>
              <div style={{ fontSize: 11, color: "#9aa0b4" }}>{pendingInjury.type ?? "Lesión muscular"}{pendingInjury.days ? ` · ${pendingInjury.days} días estimados` : ""} · Haz un cambio</div>
            </div>
            <button onClick={() => setSubbingSlot(lineup.findIndex(id => id === pendingInjury.playerId))}
              className="btn-gold" style={{ padding: "7px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer" }}>Cambiar</button>
            <button onClick={() => setPendingInjury(null)}
              style={{ background: "rgba(255,255,255,.08)", border: "none", color: "#9aa0b4", padding: "7px 10px", borderRadius: 7, fontSize: 12, cursor: "pointer" }}>✕</button>
          </div>
        )}

        {finished ? (
          <div className="pc-panel-card" style={{ textAlign: "center", padding: 28 }}>
            <div style={{ fontSize: 11, color: "#c9a84c", fontWeight: 800, letterSpacing: ".6px", marginBottom: 10 }}>PARTIDO FINALIZADO</div>
            <div style={{ fontSize: 42, fontWeight: 900, color: "#e8eaf0", marginBottom: 12 }}>{leftGoals} - {rightGoals}</div>
            <div style={{ fontSize: 16, marginBottom: 20 }}>
              {userWon ? <span style={{ color: "#22c55e" }}>🏆 Victoria</span> : isDraw ? <span style={{ color: "#f59e0b" }}>🤝 Empate</span> : <span style={{ color: "#ef4444" }}>❌ Derrota</span>}
            </div>
            <button onClick={endMatch} className="btn-gold" style={{ padding: "14px 30px", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
              Continuar a la siguiente jornada →
            </button>
          </div>
        ) : (
          <>
            <div className="pc-panel-card">
              <div className="pc-panel-title">TÁCTICAS EN VIVO</div>
              <div style={{ fontSize: 10, color: "#f59e0b", background: "#f59e0b11", border: "1px solid #f59e0b33", borderRadius: 8, padding: "7px 10px", marginBottom: 12 }}>
                Los cambios se aplican al siguiente tramo simulado. Usa la pizarra para reorganizar el equipo con más espacio.
              </div>
              <button onClick={openTacticalBoard} className="btn-gold" style={{ width: "100%", padding: 11, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
                Abrir pizarra táctica
              </button>
              <TacticsInMatch tactics={tactics} setTactics={setTactics} formation={matchFormation} onFormationChange={applyMatchFormation}
                lineup={lineup} subs={subs} players={livePlayer} selectedSlot={selectedFormationSlot} setSelectedSlot={setSelectedFormationSlot}
                onSwapSlots={swapFormationSlots} onSubstituteSlot={(slot, pid) => doSubstitution(lineup[slot], pid)} />
            </div>

            <div className="pc-panel-card">
              <div className="pc-panel-title">CAMBIOS ({subsUsed}/{maxSubs})</div>
              {subsUsed >= maxSubs ? (
                <div style={{ textAlign: "center", color: "#6b7280", fontSize: 12, padding: "10px 0" }}>Has usado todos tus cambios.</div>
              ) : !subbingSlot && subbingSlot !== 0 ? (
                <>
                  <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, marginBottom: 7 }}>SELECCIONA QUIÉN SALE</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 260, overflowY: "auto" }}>
                    {lineup.map((pid, idx) => {
                      if (!pid) return null;
                      const p = livePlayer.find(pl => pl.id === pid);
                      if (!p) return null;
                      const hurt = p.injured;
                      const yellowsInMatch = events.filter(e => e.type === "YELLOW" && e.playerId === pid).length;
                      const redInMatch = sentOffIds.includes(pid);
                      const injuredInMatch = events.some(e => e.type === "INJURY" && e.playerId === pid);
                      if (redInMatch) {
                        return (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 7, opacity: .6 }}>
                            <Initials name={p.name} size={26} rarity={p.rarity} borderRadius={6} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "#ef4444" }}>{p.name} 🟥</div>
                              <div style={{ fontSize: 9, color: "#6b7280" }}>Expulsado · el equipo juega con uno menos</div>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={idx} onClick={() => setSubbingSlot(idx)}
                          style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", background: hurt ? "rgba(239,68,68,.08)" : "#161a24", border: hurt ? "1px solid rgba(239,68,68,.3)" : "1px solid rgba(255,255,255,.06)", borderRadius: 7, cursor: "pointer" }}>
                          <Initials name={p.name} size={26} rarity={p.rarity} borderRadius={6} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: hurt ? "#ef4444" : "#e8eaf0", display: "flex", alignItems: "center", gap: 4 }}>
                              {p.name}
                              {injuredInMatch && <span title="Lesionado">🚑</span>}
                              {yellowsInMatch > 0 && Array(yellowsInMatch).fill(0).map((_, k) => <span key={k} title="Tarjeta amarilla">🟨</span>)}
                            </div>
                            <div style={{ fontSize: 9, color: "#6b7280" }}>{p.pos} · Cansancio {p.fatigue}</div>
                          </div>
                          <span style={{ fontSize: 10, color: "#c9a84c" }}>Sacar →</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700 }}>SALE: {livePlayer.find(p => p.id === lineup[subbingSlot])?.name}</div>
                    <button onClick={() => setSubbingSlot(null)} style={{ background: "transparent", border: "none", color: "#6b7280", fontSize: 10, cursor: "pointer" }}>← Cambiar</button>
                  </div>
                  <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, marginBottom: 7 }}>SELECCIONA QUIÉN ENTRA</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 260, overflowY: "auto" }}>
                    {subs.filter(Boolean).length === 0 && (
                      <div style={{ textAlign: "center", color: "#6b7280", fontSize: 12, padding: "8px 0" }}>No tienes suplentes disponibles en el banco.</div>
                    )}
                    {subs.map((pid, idx) => {
                      if (!pid) return null;
                      if (subbedOutIds.includes(pid) || sentOffIds.includes(pid)) return null;
                      const p = livePlayer.find(pl => pl.id === pid);
                      if (!p || p.injured || p.suspended) return null;
                      return (
                        <div key={idx} onClick={() => doSubstitution(lineup[subbingSlot], pid)}
                          style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", background: "#161a24", border: "1px solid rgba(34,197,94,.25)", borderRadius: 7, cursor: "pointer" }}>
                          <Initials name={p.name} size={26} rarity={p.rarity} borderRadius={6} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#e8eaf0" }}>{p.name}</div>
                            <div style={{ fontSize: 9, color: "#6b7280" }}>{p.pos} · Cansancio {p.fatigue}</div>
                          </div>
                          <span style={{ fontSize: 10, color: "#22c55e" }}>← Entra</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="pc-panel-card">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <button onClick={togglePlay} className={playing ? "btn-ghost" : "btn-gold"} disabled={!!pendingInjury}
                  style={{ padding: 14, borderRadius: 9, fontSize: 14, cursor: pendingInjury ? "not-allowed" : "pointer", opacity: pendingInjury ? .65 : 1 }}>
                  {playing ? "Pausa" : "Play"}
                </button>
                <button onClick={manualAdvance} className="btn-ghost" style={{ padding: 14, borderRadius: 9, fontSize: 14, cursor: "pointer" }}>Avance manual</button>
              </div>
              <div style={{ fontSize: 9, color: pauseEvent ? "#c9a84c" : "#6b7280", textAlign: "center", lineHeight: 1.4 }}>
                {pauseEvent ? `Partido detenido en el ${currentMinute}'. Pulsa Play para reanudar o Avance manual para continuar paso a paso.` : "1 segundo real = 1 minuto de partido. Se detiene en goles, penaltis, tarjetas, lesiones y decisiones."}
              </div>
              <button onClick={abandonMatch} style={{ display: "block", width: "100%", background: "none", border: "none", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 10, padding: 6 }}>
                Abandonar partido y volver al inicio
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── RIGHT: señales del cuerpo tecnico + alineaciones en vivo ── */}
      <div className="pc-match-right">
        <div className="pc-panel-card">
          <div className="pc-panel-title">SEÑALES DEL CUERPO TÉCNICO</div>
          {liveDecision && (
            <div style={{ background: liveDecision.severity === "urgent" ? "rgba(239,68,68,.12)" : "rgba(96,165,250,.1)", border: `1px solid ${liveDecision.severity === "urgent" ? "rgba(239,68,68,.3)" : "rgba(96,165,250,.3)"}`, borderRadius: 9, padding: 11, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#e8eaf0", fontWeight: 900, flexShrink: 0 }}>
                  {liveDecision.source === "doctor" ? "MD" : "2E"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: "#e8eaf0" }}>{liveDecision.title}</div>
                  <div style={{ fontSize: 10, color: "#cfd4df", lineHeight: 1.4, marginTop: 3 }}>{liveDecision.message}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 9 }}>
                <button onClick={() => liveDecision.targetTab === "tacticas" ? openTacticalBoard() : acknowledgeLiveDecision()} className="btn-gold" style={{ padding: 8, borderRadius: 7, fontSize: 10, cursor: "pointer" }}>
                  {liveDecision.action}
                </button>
                <button onClick={() => acknowledgeLiveDecision()} className="btn-ghost" style={{ padding: 8, borderRadius: 7, fontSize: 10, cursor: "pointer" }}>
                  Continuar igual
                </button>
              </div>
            </div>
          )}
          {visibleLiveSignals.length === 0 && !liveDecision && (
            <div style={{ fontSize: 11, color: "#4b5563", textAlign: "center", padding: "10px 0", lineHeight: 1.5 }}>
              Sin avisos por ahora. El cuerpo técnico avisará si hace falta ajustar algo.
            </div>
          )}
          {visibleLiveSignals.map(signal => (
            <button key={signal.key} onClick={() => openSignal(signal)}
              style={{ display: "block", width: "100%", textAlign: "left", background: signal.severity === "urgent" ? "rgba(239,68,68,.12)" : "rgba(96,165,250,.1)", border: `1px solid ${signal.severity === "urgent" ? "rgba(239,68,68,.3)" : "rgba(96,165,250,.25)"}`, borderRadius: 8, padding: "8px 9px", cursor: "pointer", marginBottom: 6 }}>
              <div style={{ fontSize: 9, color: signal.severity === "urgent" ? "#ef4444" : "#60a5fa", fontWeight: 900 }}>{signal.source === "doctor" ? "Médico" : "Segundo entrenador"} · {signal.action}</div>
              <div style={{ fontSize: 10, color: "#e8eaf0", marginTop: 2 }}>{signal.title}</div>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <LiveLineupPanel team={userTeam} formation={matchFormation} playerIds={lineup.filter(Boolean)} players={livePlayer} events={events} sentOffIds={sentOffIds} side="user" eventTeam={isHome ? "home" : "away"} currentMinute={currentMinute} />
          <button onClick={() => setOppExpanded(v => !v)}
            style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", color: "#9aa0b4", padding: "7px 9px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer", marginBottom: oppExpanded ? 8 : 0 }}>
            {oppExpanded ? "▾" : "▸"} Alineación rival{oppTeam?.short ? ` · ${oppTeam.short}` : ""}
          </button>
          {oppExpanded && (
            <LiveLineupPanel team={oppTeam} formation={oppFormation} playerIds={oppLineup.filter(Boolean)} players={liveOppPlayers} events={events} sentOffIds={oppSentOffIds} side="opp" eventTeam={isHome ? "away" : "home"} currentMinute={currentMinute} />
          )}
        </div>
      </div>

      {tacticalBoardOpen && (
        <TacticalBoardOverlay
          minute={displayMinute}
          formation={matchFormation}
          lineup={lineup}
          subs={subs}
          players={livePlayer}
          events={events}
          sentOffIds={sentOffIds}
          selectedSlot={selectedFormationSlot}
          setSelectedSlot={setSelectedFormationSlot}
          onFormationChange={applyMatchFormation}
          onSwapSlots={swapFormationSlots}
          onSubstituteSlot={(slot, pid) => doSubstitution(lineup[slot], pid)}
          onClose={closeTacticalBoard}
          liveDecision={liveDecision}
          subsLeft={maxSubs - subsUsed}
        />
      )}
    </div>
  );
}
