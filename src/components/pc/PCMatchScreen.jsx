import { useState } from "react";
import TeamCrest from "../TeamCrest.jsx";
import { Initials, TacticalBoardOverlay, LIVE_PITCH_LAYOUTS, RARITY_ACCENT } from "../../App.jsx";
import { MATCH_FORMATIONS } from "../../match/matchFlow.js";

// Tablero horizontal: el eje X representa profundidad (defensa -> ataque), el eje Y representa el ancho del campo.
const DEPTH_TIER = { POR: "gk", LD: "def", LI: "def", DFC: "def", MCD: "mid", MC: "mid", MCO: "mid", MD: "mid", MI: "mid", ED: "fwd", EI: "fwd", DC: "fwd" };
const USER_DEPTH_X = { gk: 8, def: 25, mid: 55, fwd: 76 };
const depthXFor = (position, isUserSide) => {
  const base = USER_DEPTH_X[DEPTH_TIER[position] ?? "mid"];
  return isUserSide ? base : 160 - base;
};
const pctX = (svgX) => (svgX / 160) * 100;

const TACTIC_FIELDS = [
  ["mentalidad", "Mentalidad", [["defensiva", "Defensiva"], ["equilibrada", "Equilibrada"], ["ofensiva", "Ofensiva"]]],
  ["presion", "Presión", [["baja", "Baja"], ["media", "Media"], ["alta", "Alta"]]],
  ["ritmo", "Ritmo", [["lento", "Lento"], ["normal", "Normal"], ["rapido", "Rápido"]]],
  ["estilo", "Estilo", [["directo", "Directo"], ["posesion", "Posesión"], ["bandas", "Bandas"], ["contraataque", "Contraataque"]]],
  ["riesgo", "Riesgo", [["conservador", "Conservador"], ["normal", "Normal"], ["agresivo", "Agresivo"]]],
];

export default function PCMatchScreen({
  fixture, finished, currentMinute, displayMinute, matchPhase, pauseEvent, segment, segments,
  halfLabel, addedTime, possession, isHome, leftTeam, rightTeam, leftGoals, rightGoals,
  leftIsUser, rightIsUser, avgFatigue, fatColor, tactics, setTactics, activeUserCount, oppLineup,
  oppSentOffIds, matchAutosaveAt, events, eventColors, eventLabels, liveStats, visibleLiveSignals,
  keyEventBanner, pendingInjury, setPendingInjury, liveDecision, setLiveDecision, acknowledgeLiveDecision,
  openTacticalBoard, matchFormation, applyMatchFormation, lineup, subs, livePlayer, selectedFormationSlot,
  setSelectedFormationSlot, swapFormationSlots, doSubstitution, subsUsed, maxSubs, subbingSlot, setSubbingSlot,
  sentOffIds, subbedOutIds, playing, setPlaying, togglePlay, manualAdvance, abandonMatch, endMatch,
  tacticalBoardOpen, closeTacticalBoard, oppFormation, liveOppPlayers,
}) {
  const [activeOverlay, setActiveOverlay] = useState(null); // null | "cambios" | "tacticas" | "pitchSub"
  const [cambiosMessage, setCambiosMessage] = useState(null);

  const formationOptions = Object.keys(MATCH_FORMATIONS);
  const userPositions = MATCH_FORMATIONS[matchFormation] ?? MATCH_FORMATIONS["4-3-3"];
  const userLayout = LIVE_PITCH_LAYOUTS[matchFormation] ?? LIVE_PITCH_LAYOUTS["4-3-3"];
  const oppPositions = MATCH_FORMATIONS[oppFormation] ?? MATCH_FORMATIONS["4-3-3"];
  const oppLayout = LIVE_PITCH_LAYOUTS[oppFormation] ?? LIVE_PITCH_LAYOUTS["4-3-3"];

  const computeRating = (playerId) => {
    if (currentMinute <= 0) return null;
    const own = events.filter(e => e.playerId === playerId || e.assistId === playerId);
    const goals = own.filter(e => (e.type === "GOAL" || e.type === "PENALTY") && e.playerId === playerId).length;
    const assists = own.filter(e => e.assistId === playerId).length;
    const yellows = own.filter(e => e.type === "YELLOW" && e.playerId === playerId).length;
    const isRed = sentOffIds.includes(playerId);
    const saves = own.filter(e => e.type === "SAVE" && e.playerId === playerId).length;
    const defActions = own.filter(e => e.type === "DEFENSIVE_ACTION" && e.playerId === playerId).length;
    const rating = Math.max(4, Math.min(10, 6 + goals * 1.25 + assists * .7 + saves * .18 + defActions * .14 - yellows * .2 - (isRed ? 1.5 : 0)));
    return rating.toFixed(1);
  };

  const closeOverlay = () => {
    setActiveOverlay(null);
    setSubbingSlot(null);
    setSelectedFormationSlot(null);
    setCambiosMessage(null);
  };

  const openCambiosOverlay = () => {
    setPlaying(false);
    setSubbingSlot(null);
    setSelectedFormationSlot(null);
    setCambiosMessage("El míster pide parar el juego.");
    setActiveOverlay("cambios");
  };

  const openTacticasOverlay = () => setActiveOverlay(v => v === "tacticas" ? null : "tacticas");

  const confirmSubstitution = (outId, inId) => {
    doSubstitution(outId, inId);
    closeOverlay();
  };

  const handlePitchDotClick = (slot) => {
    if (finished || pendingInjury || liveDecision || activeOverlay === "cambios" || activeOverlay === "tacticas") return;
    if (selectedFormationSlot != null && selectedFormationSlot !== slot) {
      // Segundo titular tocado: intercambia posiciones en el campo, no pausa ni gasta un cambio.
      swapFormationSlots(selectedFormationSlot, slot);
      closeOverlay();
      return;
    }
    if (selectedFormationSlot === slot) { closeOverlay(); return; }
    setSelectedFormationSlot(slot);
    setSubbingSlot(slot);
    setCambiosMessage(null);
    setActiveOverlay("pitchSub");
  };

  // Derivación de estadísticas visuales a partir de los eventos ya generados por el motor.
  const countByTeam = (type) => ({
    user: events.filter(e => e.type === type && e.team === "user").length,
    opp: events.filter(e => e.type === type && e.team === "opp").length,
  });
  const fouls = countByTeam("DANGEROUS_FOUL");
  const offsides = countByTeam("OFFSIDE");
  const corners = countByTeam("CORNER");
  const defActionsTotals = countByTeam("DEFENSIVE_ACTION");
  // El motor solo registra una acción defensiva genérica; se reparte 60/40 solo para dar variedad visual (no son dos métricas reales independientes).
  const recoveries = { user: Math.round(defActionsTotals.user * .6), opp: Math.round(defActionsTotals.opp * .6) };
  const interceptions = { user: Math.max(0, defActionsTotals.user - recoveries.user), opp: Math.max(0, defActionsTotals.opp - recoveries.opp) };
  // El motor no registra pases individuales; estimación visual a partir de la posesión y el estilo táctico.
  const passAccUser = Math.max(60, Math.min(95, Math.round(78 + (possession - 50) * .3 + (tactics.estilo === "posesion" ? 4 : tactics.estilo === "directo" ? -4 : 0))));
  const passAccOpp = Math.max(60, Math.min(95, Math.round(78 + ((100 - possession) - 50) * .3)));

  const homeVal = (userVal, oppVal) => isHome ? userVal : oppVal;
  const awayVal = (userVal, oppVal) => isHome ? oppVal : userVal;

  const statsRows = [
    ["Tiros", homeVal(liveStats.userShots, liveStats.opponentShots), awayVal(liveStats.userShots, liveStats.opponentShots)],
    ["Tiros a puerta", homeVal(liveStats.userShotsOnTarget, liveStats.opponentShotsOnTarget), awayVal(liveStats.userShotsOnTarget, liveStats.opponentShotsOnTarget)],
    ["Precisión pase", `${homeVal(passAccUser, passAccOpp)}%`, `${awayVal(passAccUser, passAccOpp)}%`],
    ["Faltas", homeVal(fouls.user, fouls.opp), awayVal(fouls.user, fouls.opp)],
    ["Recuperaciones", homeVal(recoveries.user, recoveries.opp), awayVal(recoveries.user, recoveries.opp)],
    ["Intercepciones", homeVal(interceptions.user, interceptions.opp), awayVal(interceptions.user, interceptions.opp)],
    ["F. juego", homeVal(offsides.user, offsides.opp), awayVal(offsides.user, offsides.opp)],
    ["Córners", homeVal(corners.user, corners.opp), awayVal(corners.user, corners.opp)],
    ["Posesión", `${homeVal(possession, 100 - possession)}%`, `${awayVal(possession, 100 - possession)}%`],
  ];

  return (
    <div className="pc-match-root">
      {/* ── TOP BAR ── */}
      <div className="pc-match-topbar">
        <div className="pc-match-topbar-main">
          <div className="pc-match-topbar-team">
            <TeamCrest team={leftTeam} size={34} />
            <span className="pc-match-topbar-teamdot" style={{ background: leftTeam?.color ?? "#6b7280" }} />
            <span className="pc-match-topbar-teamname" style={{ color: leftIsUser ? "#c9a84c" : "#e8eaf0" }}>{leftTeam?.short}</span>
          </div>
          <div className="pc-match-topbar-score">{leftGoals} - {rightGoals}</div>
          <div className="pc-match-topbar-team" style={{ flexDirection: "row-reverse", textAlign: "right" }}>
            <TeamCrest team={rightTeam} size={34} />
            <span className="pc-match-topbar-teamdot" style={{ background: rightTeam?.color ?? "#6b7280" }} />
            <span className="pc-match-topbar-teamname" style={{ color: rightIsUser ? "#c9a84c" : "#e8eaf0" }}>{rightTeam?.short}</span>
          </div>
          <div className="pc-match-topbar-clock">
            <div className="pc-match-topbar-minute">{finished ? "FIN" : currentMinute === 0 ? "INICIO" : matchPhase === "halftime" ? "DESCANSO" : `${displayMinute}'`}</div>
            <div className="pc-match-topbar-phase">
              J{fixture.matchday} · {matchPhase.startsWith("first") || matchPhase === "halftime" ? "1ª parte" : "2ª parte"}
              {matchPhase.includes("Added") ? ` · +${halfLabel === "first" ? addedTime.first ?? 0 : addedTime.second ?? 0}` : ""}
              {pauseEvent ? " · DETENIDO" : ""}
            </div>
          </div>
          <div className="pc-match-topbar-controls">
            <button onClick={togglePlay} className={playing ? "btn-ghost" : "btn-gold"} disabled={!!pendingInjury}
              style={{ padding: "9px 14px", borderRadius: 8, fontSize: 13, cursor: pendingInjury ? "not-allowed" : "pointer", opacity: pendingInjury ? .6 : 1 }}>
              {playing ? "⏸ Pausa" : "▶ Play"}
            </button>
            <button onClick={manualAdvance} className="btn-ghost" style={{ padding: "9px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>⏭ Avance manual</button>
            <div className="pc-match-topbar-subs">Cambios: {subsUsed}/{maxSubs}</div>
          </div>
        </div>
        <div className="pc-match-topbar-meta">
          <div className="pc-match-segment-bar">
            {segments.map((_, i) => <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i < segment ? "#c9a84c" : "#1e2330" }} />)}
          </div>
          <div className="pc-match-topbar-tags">
            <span>💪 <strong style={{ color: fatColor }}>{avgFatigue}</strong></span>
            <span>🎯 <strong style={{ color: tactics.mentalidad === "ofensiva" ? "#ef4444" : tactics.mentalidad === "defensiva" ? "#3b82f6" : "#c9a84c" }}>{tactics.mentalidad.toUpperCase()}</strong></span>
            <span style={{ color: activeUserCount < 11 ? "#ef4444" : "#6b7280" }}>👥 {activeUserCount}/11</span>
            <span style={{ color: "#22c55e" }}>💾 {matchAutosaveAt ? new Date(matchAutosaveAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
          </div>
        </div>
      </div>

      {/* ── POSESIÓN ── */}
      <div className="pc-match-possession-row">
        <div className="pc-match-possession-fill" style={{ width: `${homeVal(possession, 100 - possession)}%`, background: leftIsUser ? "linear-gradient(90deg,#8a7330,#c9a84c)" : "linear-gradient(90deg,#4b5563,#6b7280)" }}>
          {homeVal(possession, 100 - possession)}%
        </div>
        <div className="pc-match-possession-fill" style={{ width: `${awayVal(possession, 100 - possession)}%`, background: rightIsUser ? "linear-gradient(90deg,#c9a84c,#8a7330)" : "linear-gradient(90deg,#6b7280,#4b5563)" }}>
          {awayVal(possession, 100 - possession)}%
        </div>
      </div>

      {/* ── ESTADÍSTICAS ── */}
      <div className="pc-match-stats-table">
        {statsRows.map(([label, home, away]) => (
          <div key={label} className="pc-match-stats-row">
            <span className="pc-match-stats-value" style={{ color: leftIsUser ? "#c9a84c" : "#e8eaf0" }}>{home}</span>
            <span className="pc-match-stats-label">{label}</span>
            <span className="pc-match-stats-value" style={{ color: rightIsUser ? "#c9a84c" : "#e8eaf0", textAlign: "right" }}>{away}</span>
          </div>
        ))}
      </div>

      {/* ── TRES COLUMNAS ── */}
      <div className="pc-match-body">
        {/* LEFT: MI EQUIPO + SEÑALES */}
        <div className="pc-match-left">
          <div className="pc-match-col-header">MI EQUIPO</div>
          <div className="pc-match-left-scroll">
            {lineup.map((pid, idx) => {
              if (!pid) return null;
              const p = livePlayer.find(pl => pl.id === pid);
              if (!p) return null;
              const energy = Math.max(0, Math.round(100 - (p.fatigue ?? 0)));
              const energyColor = energy > 70 ? "#22c55e" : energy >= 40 ? "#f59e0b" : "#ef4444";
              const rating = computeRating(pid);
              const yellows = events.filter(e => e.type === "YELLOW" && e.playerId === pid).length;
              const isRed = sentOffIds.includes(pid);
              const isInjured = p.injured || events.some(e => e.type === "INJURY" && e.playerId === pid);
              return (
                <div key={pid} className="pc-match-player-row" style={{ background: isRed ? "rgba(239,68,68,.08)" : "transparent", opacity: isRed ? .6 : 1 }}>
                  <div className="pc-match-player-num">{idx + 1}</div>
                  <div className="pc-match-player-info">
                    <div className="pc-match-player-name">
                      {p.name}{isRed && " 🟥"}{isInjured && " 🚑"}{yellows > 0 && ` 🟨${yellows > 1 ? `x${yellows}` : ""}`}
                    </div>
                    <div className="pc-match-player-meta">
                      <span className="pc-match-pos-badge">{p.pos}</span>
                      <div className="pc-match-energy-bar"><div style={{ width: `${energy}%`, background: energyColor }} /></div>
                    </div>
                  </div>
                  {rating && <div className="pc-match-rating" style={{ color: Number(rating) >= 7 ? "#22c55e" : Number(rating) >= 5.5 ? "#c9a84c" : "#ef4444" }}>{rating}</div>}
                </div>
              );
            })}

            <div className="pc-match-col-subheader">SEÑALES DEL CUERPO TÉCNICO</div>
            {visibleLiveSignals.length === 0 ? (
              <div style={{ fontSize: 10, color: "#4b5563", lineHeight: 1.5 }}>Sin avisos por ahora.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {visibleLiveSignals.map(signal => (
                  <button key={signal.key} onClick={() => { setPlaying(false); setLiveDecision(signal); }}
                    style={{ display: "block", width: "100%", textAlign: "left", background: signal.severity === "urgent" ? "rgba(239,68,68,.12)" : "rgba(96,165,250,.1)", border: `1px solid ${signal.severity === "urgent" ? "rgba(239,68,68,.3)" : "rgba(96,165,250,.25)"}`, borderRadius: 8, padding: "8px 9px", cursor: "pointer" }}>
                    <div style={{ fontSize: 9, color: signal.severity === "urgent" ? "#ef4444" : "#60a5fa", fontWeight: 900 }}>{signal.source === "doctor" ? "Médico" : "Segundo entrenador"} · {signal.action}</div>
                    <div style={{ fontSize: 10, color: "#e8eaf0", marginTop: 2 }}>{signal.title}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER: pizarra horizontal + overlays */}
        <div className="pc-match-center">
          <div className="pc-match-pitch-wrap">
            {keyEventBanner && !pendingInjury && !liveDecision && (
              <div className="pc-match-flash bounce-in" style={{
                background: keyEventBanner.type === "RED" ? "#ef444422" : keyEventBanner.type === "YELLOW" ? "#fbbf2422" : "#22c55e22",
                border: `1px solid ${keyEventBanner.type === "RED" ? "#ef444455" : keyEventBanner.type === "YELLOW" ? "#fbbf2455" : "#22c55e55"}` }}>
                <span style={{ fontSize: 16 }}>{keyEventBanner.type === "RED" ? "🟥" : keyEventBanner.type === "YELLOW" ? "🟨" : "⚽"}</span>
                <span>{keyEventBanner.description}</span>
              </div>
            )}

            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 160 100" preserveAspectRatio="none">
              <rect x="2" y="2" width="156" height="96" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth=".6" />
              <line x1="80" y1="2" x2="80" y2="98" stroke="rgba(255,255,255,.12)" strokeWidth=".6" />
              <circle cx="80" cy="50" r="9" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth=".6" />
              <rect x="2" y="30" width="13" height="40" fill="none" stroke="rgba(255,255,255,.09)" strokeWidth=".5" />
              <rect x="145" y="30" width="13" height="40" fill="none" stroke="rgba(255,255,255,.09)" strokeWidth=".5" />
              <rect x="2" y="38" width="6" height="24" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth=".4" />
              <rect x="152" y="38" width="6" height="24" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth=".4" />
            </svg>

            {userLayout.map(({ slot, x }) => {
              const pid = lineup[slot];
              const player = livePlayer.find(pl => pl.id === pid);
              if (!player) return null;
              const posLabel = userPositions[slot];
              const px = depthXFor(posLabel, true);
              const isOut = sentOffIds.includes(pid);
              const accent = isOut ? "#ef4444" : (RARITY_ACCENT[player.rarity] ?? "#c9a84c");
              const rating = computeRating(pid);
              const selected = selectedFormationSlot === slot;
              return (
                <div key={`u${slot}`} className="pc-match-pitch-dot" style={{ left: `${pctX(px)}%`, top: `${x}%` }}>
                  <div onClick={() => handlePitchDotClick(slot)} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${accent}33`, border: `2px solid ${selected ? "#ffffff" : accent}`, display: "flex", alignItems: "center", justifyContent: "center", opacity: isOut ? .5 : 1, boxShadow: selected ? "0 0 10px rgba(255,255,255,.6)" : "none" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: accent }}>{slot + 1}</span>
                    </div>
                    {rating && <div style={{ fontSize: 9, fontWeight: 900, color: Number(rating) >= 7 ? "#22c55e" : Number(rating) >= 5.5 ? "#c9a84c" : "#ef4444", background: "rgba(13,15,20,.8)", borderRadius: 4, padding: "1px 4px" }}>{rating}</div>}
                  </div>
                  <div style={{ fontSize: 8, color: "#e8eaf0", marginTop: 2, maxWidth: 62, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 1px 2px #000" }}>{player.name.split(" ")[0]}</div>
                </div>
              );
            })}

            {oppLayout.map(({ slot, x }) => {
              const pid = oppLineup[slot];
              const player = liveOppPlayers.find(pl => pl.id === pid);
              if (!player) return null;
              const posLabel = oppPositions[slot];
              const px = depthXFor(posLabel, false);
              const isOut = oppSentOffIds.includes(pid);
              return (
                <div key={`o${slot}`} className="pc-match-pitch-dot" style={{ left: `${pctX(px)}%`, top: `${x}%` }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: isOut ? "rgba(239,68,68,.25)" : "rgba(100,116,139,.35)", border: `2px solid ${isOut ? "#ef4444" : "#94a3b8"}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", opacity: isOut ? .5 : 1 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#e2e8f0" }}>{slot + 1}</span>
                  </div>
                  <div style={{ fontSize: 8, color: "#cbd5e1", marginTop: 2, maxWidth: 58, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 1px 2px #000" }}>{player.name.split(" ")[0]}</div>
                </div>
              );
            })}

            {/* Panel rápido de sustitución al tocar un titular — no pausa el partido */}
            {activeOverlay === "pitchSub" && subbingSlot != null && (
              <div className="pc-match-quickpanel">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#e8eaf0" }}>Sustituir a {livePlayer.find(p => p.id === lineup[subbingSlot])?.name}</div>
                  <button onClick={closeOverlay} style={{ background: "rgba(255,255,255,.08)", border: "none", color: "#9aa0b4", padding: "4px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>✕</button>
                </div>
                <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 8, flexShrink: 0 }}>Cambios: {subsUsed}/{maxSubs} · toca otro titular en el campo para intercambiar posiciones</div>
                <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
                  {subsUsed >= maxSubs ? (
                    <div style={{ fontSize: 11, color: "#6b7280", textAlign: "center", padding: "10px 0" }}>Sin cambios disponibles.</div>
                  ) : subs.filter(Boolean).length === 0 ? (
                    <div style={{ fontSize: 11, color: "#6b7280", textAlign: "center", padding: "10px 0" }}>No hay suplentes disponibles.</div>
                  ) : subs.map((pid, idx) => {
                    if (!pid) return null;
                    const p = livePlayer.find(pl => pl.id === pid);
                    if (!p || p.injured || p.suspended) return null;
                    return (
                      <div key={idx} onClick={() => confirmSubstitution(lineup[subbingSlot], pid)}
                        style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 8px", background: "#161a24", border: "1px solid rgba(34,197,94,.25)", borderRadius: 7, cursor: "pointer" }}>
                        <Initials name={p.name} size={22} rarity={p.rarity} borderRadius={5} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                          <div style={{ fontSize: 8, color: "#6b7280" }}>{p.pos} · Cansancio {p.fatigue}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Overlays bloqueantes / grandes — cubren toda la columna central */}
            {!finished && pendingInjury && (
              <div className="pc-match-overlay">
                <div className="pc-match-overlay-header">
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#f97316" }}>🚑 Lesión</div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#e8eaf0" }}>{pendingInjury.name} se ha lesionado</div>
                  <div style={{ fontSize: 12, color: "#9aa0b4" }}>{pendingInjury.type ?? "Lesión muscular"}{pendingInjury.days ? ` · ${pendingInjury.days} días estimados` : ""}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button onClick={() => { setSubbingSlot(lineup.findIndex(id => id === pendingInjury.playerId)); setSelectedFormationSlot(null); setCambiosMessage(null); setActiveOverlay("cambios"); }} className="btn-gold" style={{ padding: "10px 18px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Hacer el cambio</button>
                    <button onClick={() => setPendingInjury(null)} className="btn-ghost" style={{ padding: "10px 18px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Ignorar por ahora</button>
                  </div>
                </div>
              </div>
            )}

            {!finished && !pendingInjury && liveDecision && (
              <div className="pc-match-overlay">
                <div className="pc-match-overlay-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#e8eaf0", fontWeight: 900 }}>{liveDecision.source === "doctor" ? "MD" : "2E"}</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#e8eaf0" }}>{liveDecision.title}</div>
                  </div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 14, maxWidth: 420, margin: "0 auto" }}>
                  <div style={{ fontSize: 13, color: "#cfd4df", lineHeight: 1.5 }}>{liveDecision.message}</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { if (liveDecision.targetTab === "tacticas") { openTacticalBoard(); setActiveOverlay(null); } else { acknowledgeLiveDecision(); } }} className="btn-gold" style={{ padding: "10px 18px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>{liveDecision.action}</button>
                    <button onClick={() => acknowledgeLiveDecision()} className="btn-ghost" style={{ padding: "10px 18px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Continuar igual</button>
                  </div>
                </div>
              </div>
            )}

            {!finished && !pendingInjury && !liveDecision && activeOverlay === "cambios" && (
              <div className="pc-match-overlay">
                <div className="pc-match-overlay-header">
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#c9a84c" }}>🔄 Cambios ({subsUsed}/{maxSubs})</div>
                    {cambiosMessage && <div style={{ fontSize: 10, color: "#9aa0b4", marginTop: 3 }}>{cambiosMessage}</div>}
                  </div>
                  <button onClick={closeOverlay} style={{ background: "rgba(255,255,255,.08)", border: "none", color: "#9aa0b4", padding: "5px 10px", borderRadius: 7, fontSize: 12, cursor: "pointer" }}>✕</button>
                </div>
                {subsUsed >= maxSubs ? (
                  <div style={{ textAlign: "center", color: "#6b7280", fontSize: 13, marginTop: 30 }}>Has usado todos tus cambios.</div>
                ) : !subbingSlot && subbingSlot !== 0 ? (
                  <>
                    <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, marginBottom: 8, flexShrink: 0 }}>SELECCIONA QUIÉN SALE</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
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
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexShrink: 0 }}>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700 }}>SALE: {livePlayer.find(p => p.id === lineup[subbingSlot])?.name}</div>
                      <button onClick={() => setSubbingSlot(null)} style={{ background: "transparent", border: "none", color: "#6b7280", fontSize: 10, cursor: "pointer" }}>← Cambiar</button>
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, marginBottom: 8, flexShrink: 0 }}>SELECCIONA QUIÉN ENTRA</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
                      {subs.filter(Boolean).length === 0 && (
                        <div style={{ textAlign: "center", color: "#6b7280", fontSize: 12, padding: "8px 0" }}>No tienes suplentes disponibles en el banco.</div>
                      )}
                      {subs.map((pid, idx) => {
                        if (!pid) return null;
                        if (subbedOutIds.includes(pid) || sentOffIds.includes(pid)) return null;
                        const p = livePlayer.find(pl => pl.id === pid);
                        if (!p || p.injured || p.suspended) return null;
                        return (
                          <div key={idx} onClick={() => confirmSubstitution(lineup[subbingSlot], pid)}
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
            )}

            {!finished && !pendingInjury && !liveDecision && activeOverlay === "tacticas" && (
              <div className="pc-match-overlay">
                <div className="pc-match-overlay-header">
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#c9a84c" }}>⚙️ Táctica</div>
                  <button onClick={closeOverlay} style={{ background: "rgba(255,255,255,.08)", border: "none", color: "#9aa0b4", padding: "5px 10px", borderRadius: 7, fontSize: 12, cursor: "pointer" }}>✕</button>
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>FORMACIÓN EN DIRECTO</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {formationOptions.map(option => {
                        const active = matchFormation === option;
                        return (
                          <button key={option} onClick={() => applyMatchFormation(option)}
                            style={{ background: active ? "#c9a84c" : "#1e2330", color: active ? "#1a1200" : "#e8eaf0", border: `1px solid ${active ? "#c9a84c" : "rgba(255,255,255,.1)"}`, padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            {option}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 10, color: "#9aa0b4" }}>Al cambiar, el once se recoloca automáticamente. Para mover jugadores, tócalos directamente en el campo.</div>
                  </div>
                  {TACTIC_FIELDS.map(([field, label, options]) => (
                    <div key={field} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>{label.toUpperCase()}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {options.map(([val, disp]) => {
                          const active = tactics[field] === val;
                          return (
                            <button key={val} onClick={() => setTactics(t => ({ ...t, [field]: val }))}
                              style={{ background: active ? "#c9a84c" : "#1e2330", color: active ? "#1a1200" : "#9aa0b4", border: `1px solid ${active ? "#c9a84c" : "rgba(255,255,255,.08)"}`, padding: "7px 12px", borderRadius: 7, fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer" }}>
                              {disp}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => { openTacticalBoard(); setActiveOverlay(null); }} className="btn-gold" style={{ width: "100%", padding: 11, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 6 }}>
                    Abrir pizarra táctica
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: eventos en vivo */}
        <div className="pc-match-right">
          <div className="pc-match-col-header">EVENTOS EN VIVO</div>
          <div className="pc-match-events-scroll">
            {visibleLiveSignals.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: "#60a5fa", letterSpacing: ".5px", marginBottom: 6 }}>SEÑALES DEL CUERPO TÉCNICO</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {visibleLiveSignals.map(signal => (
                    <button key={signal.key} onClick={() => { setPlaying(false); setLiveDecision(signal); }}
                      style={{ display: "block", width: "100%", textAlign: "left", background: signal.severity === "urgent" ? "rgba(239,68,68,.12)" : "rgba(96,165,250,.1)", border: `1px solid ${signal.severity === "urgent" ? "rgba(239,68,68,.3)" : "rgba(96,165,250,.25)"}`, borderRadius: 8, padding: "8px 9px", cursor: "pointer" }}>
                      <div style={{ fontSize: 9, color: signal.severity === "urgent" ? "#ef4444" : "#60a5fa", fontWeight: 900 }}>{signal.source === "doctor" ? "Médico" : "Segundo entrenador"} · {signal.action}</div>
                      <div style={{ fontSize: 10, color: "#e8eaf0", marginTop: 2 }}>{signal.title}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {events.length === 0 && !finished && (
                <div style={{ textAlign: "center", color: "#6b7280", fontSize: 12, marginTop: 10, lineHeight: 1.6 }}>
                  Configura tus tácticas y pulsa "Play" para comenzar
                </div>
              )}
              {[...events].reverse().map((e, i) => {
                const color = eventColors[e.type] ?? "#6b7280";
                const isGoal = e.type === "GOAL" || e.type === "PENALTY";
                return (
                  <div key={i} className={isGoal ? "goal-event" : ""}
                    style={{ background: "#0d0f14", borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, borderLeft: `3px solid ${color}` }}>
                    <div style={{ fontSize: 11, color: "#6b7280", minWidth: 24, fontWeight: 700 }}>{e.minute}'</div>
                    <div style={{ background: `${color}22`, color, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, minWidth: 54, textAlign: "center" }}>{e.secondYellow ? "DOBLE 🟨" : eventLabels[e.type] ?? e.type}</div>
                    <div style={{ fontSize: 11, color: "#e8eaf0", flex: 1, lineHeight: 1.35 }}>{e.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR ── */}
      <div className="pc-match-bottombar">
        {finished ? (
          <button onClick={endMatch} className="btn-gold" style={{ flex: 1, padding: 13, borderRadius: 9, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
            Continuar →
          </button>
        ) : (
          <>
            <button onClick={openCambiosOverlay} className={activeOverlay === "cambios" ? "btn-gold" : "btn-ghost"} style={{ padding: "10px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              ⏸ Cambios
            </button>
            <button onClick={openTacticasOverlay} className={activeOverlay === "tacticas" ? "btn-gold" : "btn-ghost"} style={{ padding: "10px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              ⚙️ Táctica
            </button>
            <div style={{ flex: 1, textAlign: "center", fontSize: 9, color: pauseEvent ? "#c9a84c" : "#6b7280" }}>
              {pauseEvent ? `Partido detenido en el ${currentMinute}'.` : "Toca a un titular en el campo para cambiarlo o intercambiar su posición sin pausar."}
            </div>
            <button onClick={abandonMatch} style={{ background: "none", border: "none", color: "rgba(239,68,68,.75)", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "6px 8px", flexShrink: 0 }}>
              🟥 Abandonar
            </button>
          </>
        )}
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
