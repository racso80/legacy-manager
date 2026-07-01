import { useState } from "react";
import FeedbackBanner from "../ui/FeedbackBanner.jsx";
import { useFeedback } from "../../utils/feedback.js";
import { calculateInjuryRisk, getRiskLevel } from "../../medical/medicalEngine.js";
import { sanitizeLineupSelection } from "../../state/gameStateSelectors.js";
import {
  BENCH_SLOTS,
  CALLED_UP_SLOTS,
  Initials,
  LINEUP_FORMATIONS,
  LINEUP_PITCH_LAYOUT,
  RARITY_ACCENT,
  STARTERS_SLOTS,
  emptyBench,
  emptyLineup,
  energyLevel,
  slotPositionGroup,
} from "../../App.jsx";

const PRESET_ICONS = ["🏠", "✈️", "🔄", "🏆", "⚽", "🛡️", "⚡"];

const getRole = (p) => {
  if (p.age <= 19) return { icon: "🌱", label: "Canterano" };
  if (p.overall >= 80) return { icon: "⭐", label: "Titular habitual" };
  if (p.overall >= 73) return { icon: "🔄", label: "Rotación" };
  return { icon: "⚪", label: "Suplente" };
};

export default function PCLineupScreen({ game, players, lineup, setLineup, formation, setFormation, subs, setSubs, savedLineups, onSaveLineups, onOpenPlayer, onPlay }) {
  const [activeSlot, setActiveSlot] = useState(null); // null | {type:'starter',idx} | {type:'sub',idx}
  const [subTarget, setSubTarget] = useState(null); // {idx, player}
  const [sortBy, setSortBy] = useState("role");
  const [showSavedLineups, setShowSavedLineups] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetIcon, setPresetIcon] = useState("🏠");
  const [lineupNotice, setLineupNotice] = useState(null);
  const [confirmDeletePresetId, setConfirmDeletePresetId] = useState(null);
  const [playWarning, setPlayWarning] = useState(null);
  const [proposal, setProposal] = useState(null); // {type:'rotation'|'bestxi', newLineup, newSubs, changes}
  const { feedback, showFeedback } = useFeedback();

  const formations = LINEUP_FORMATIONS;
  const pitchLayout = LINEUP_PITCH_LAYOUT;
  const posLayout = pitchLayout[formation] || pitchLayout["4-3-3"];
  const slotPositions = formations[formation];

  const available = players.filter(p => !p.injured && !p.suspended);
  const unavailable = players.filter(p => p.injured || p.suspended);
  const usedStarterIds = lineup.filter(Boolean);
  const usedSubIds = subs.filter(Boolean);
  const allUsedIds = [...usedStarterIds, ...usedSubIds];
  const notCalled = available.filter(p => !allUsedIds.includes(p.id));

  const startersCount = lineup.filter(id => id && available.find(p => p.id === id)).length;
  const lineupValid = startersCount === 11;

  const fresh = available.filter(p => energyLevel(p.fatigue).energy >= 70).length;
  const tired = available.filter(p => { const e = energyLevel(p.fatigue).energy; return e >= 40 && e < 70; }).length;
  const veryTired = available.filter(p => energyLevel(p.fatigue).energy < 40).length;
  const avgEnergy = available.length ? Math.round(available.reduce((s, p) => s + energyLevel(p.fatigue).energy, 0) / available.length) : 0;

  const getStarter = (idx) => players.find(p => p.id === lineup[idx]);
  const isActiveStarter = (idx) => activeSlot?.type === "starter" && activeSlot?.idx === idx;
  const isActiveSub = (idx) => activeSlot?.type === "sub" && activeSlot?.idx === idx;

  const handlePitchSlot = (idx) => {
    const player = players.find(p => p.id === lineup[idx]);
    setProposal(null);
    if (player) {
      setSubTarget({ idx, player });
      setActiveSlot(null);
    } else {
      setActiveSlot(activeSlot?.type === "starter" && activeSlot?.idx === idx ? null : { type: "starter", idx });
      setSubTarget(null);
    }
  };
  const handleSubSlot = (idx) => {
    const player = players.find(p => p.id === subs[idx]);
    if (player && activeSlot) {
      assignPlayer(player);
      return;
    }
    setProposal(null);
    setActiveSlot(activeSlot?.type === "sub" && activeSlot?.idx === idx ? null : { type: "sub", idx });
    setSubTarget(null);
  };

  const assignPlayer = (player) => {
    if (!activeSlot) return;
    if (activeSlot.type === "starter") {
      const newLineup = [...lineup];
      const prevSlot = newLineup.indexOf(player.id);
      if (prevSlot !== -1) newLineup[prevSlot] = null;
      const newSubs = [...subs];
      const prevSub = newSubs.indexOf(player.id);
      if (prevSub !== -1) newSubs[prevSub] = null;
      newLineup[activeSlot.idx] = player.id;
      setLineup(newLineup);
      setSubs(newSubs);
    } else {
      const newSubs = [...subs];
      const prevSub = newSubs.indexOf(player.id);
      if (prevSub !== -1) newSubs[prevSub] = null;
      const newLineup = [...lineup];
      const prevSlot = newLineup.indexOf(player.id);
      if (prevSlot !== -1) newLineup[prevSlot] = null;
      newSubs[activeSlot.idx] = player.id;
      setSubs(newSubs);
      setLineup(newLineup);
    }
    setActiveSlot(null);
  };

  const swapWithSub = (incomingPlayer) => {
    if (!subTarget) return;
    const { idx, player: outgoing } = subTarget;
    const newLineup = [...lineup];
    newLineup[idx] = incomingPlayer.id;
    setLineup(newLineup);

    const newSubs = [...subs];
    const benchIdx = newSubs.indexOf(incomingPlayer.id);
    if (benchIdx !== -1) {
      newSubs[benchIdx] = outgoing.id;
    } else {
      const emptyIdx = newSubs.indexOf(null);
      if (emptyIdx !== -1) newSubs[emptyIdx] = outgoing.id;
    }
    setSubs(newSubs);
    setSubTarget(null);
  };

  const getSubCandidates = () => {
    if (!subTarget) return [];
    const posLabel = slotPositions[subTarget.idx];
    const pool = [...subs.filter(Boolean).map(id => players.find(p => p.id === id)), ...notCalled].filter(Boolean);
    return pool
      .filter(p => !p.injured && !p.suspended)
      .sort((a, b) => {
        const aSamePos = a.pos === posLabel ? 1 : 0;
        const bSamePos = b.pos === posLabel ? 1 : 0;
        if (aSamePos !== bSamePos) return bSamePos - aSamePos;
        const aEnergy = energyLevel(a.fatigue).energy;
        const bEnergy = energyLevel(b.fatigue).energy;
        if (Math.abs(aEnergy - bEnergy) > 10) return bEnergy - aEnergy;
        return b.overall - a.overall;
      });
  };

  const restRisk = (p) => {
    const risk = calculateInjuryRisk(p, { fixtures: game.fixtures, teamId: game.teamId, game });
    const level = getRiskLevel(risk);
    if (risk > 75) return { level: "high", label: `🔴 Riesgo crítico ${risk}%`, risk, color: level.color };
    if (risk > 50) return { level: "high", label: `🟠 Riesgo alto ${risk}%`, risk, color: level.color };
    if (risk > 20) return { level: "mid", label: `🟡 Riesgo moderado ${risk}%`, risk, color: level.color };
    return null;
  };

  const computeRecommendedRotation = () => {
    const newLineup = [...lineup];
    const newSubs = [...subs];
    const changes = [];
    lineup.forEach((starterId, idx) => {
      if (!starterId) return;
      const starter = players.find(p => p.id === starterId);
      if (!starter) return;
      const risk = restRisk(starter);
      const starterEnergy = energyLevel(starter.fatigue).energy;
      const accumulated = starter.accumulatedFatigue ?? starter.medical?.accumulatedFatigue ?? 0;
      if ((!risk || risk.risk < 51) && starterEnergy >= 45 && accumulated < 55) return;
      const posLabel = slotPositions[idx];
      const candidates = [...newSubs.filter(Boolean).map(id => players.find(p => p.id === id)), ...notCalled]
        .filter(Boolean)
        .filter(p => {
          if (p.injured || p.suspended) return false;
          const naturalFit = p.pos === posLabel || p.group === slotPositionGroup(posLabel);
          const energyGain = energyLevel(p.fatigue).energy - starterEnergy;
          const qualityGap = (starter.overall ?? 70) - (p.overall ?? 70);
          const critical = (risk?.risk ?? 0) >= 76 || starterEnergy < 35 || accumulated >= 75;
          return naturalFit && energyGain >= (critical ? 10 : 18) && qualityGap <= (critical ? 10 : 6);
        })
        .sort((a, b) => {
          const aSame = a.pos === posLabel ? 1 : 0, bSame = b.pos === posLabel ? 1 : 0;
          if (aSame !== bSame) return bSame - aSame;
          const aGap = Math.abs((starter.overall ?? 70) - (a.overall ?? 70));
          const bGap = Math.abs((starter.overall ?? 70) - (b.overall ?? 70));
          if (aGap !== bGap) return aGap - bGap;
          return energyLevel(b.fatigue).energy - energyLevel(a.fatigue).energy;
        });
      const replacement = candidates[0];
      if (replacement) {
        newLineup[idx] = replacement.id;
        const benchIdx = newSubs.indexOf(replacement.id);
        if (benchIdx !== -1) newSubs[benchIdx] = starter.id;
        changes.push({ idx, outPlayer: starter, inPlayer: replacement });
      }
    });
    return { newLineup, newSubs, changes };
  };

  const computeBestXI = () => {
    const isUnavailable = (p) => p.injured || p.suspended;
    const score = (p, posLabel) => (p.overall ?? 70) + (p.pos === posLabel ? 9 : p.group === slotPositionGroup(posLabel) ? 3 : -8);
    const newLineup = emptyLineup();
    const claimed = new Set();
    slotPositions.forEach((posLabel, idx) => {
      const candidates = available
        .filter(p => !claimed.has(p.id))
        .filter(p => !isUnavailable(p))
        .sort((a, b) => {
          const aScore = score(a, posLabel);
          const bScore = score(b, posLabel);
          if (aScore !== bScore) return bScore - aScore;
          return (b.overall ?? 0) - (a.overall ?? 0);
        });
      const best = candidates[0];
      if (best) { newLineup[idx] = best.id; claimed.add(best.id); }
    });
    const restPool = available.filter(p => !claimed.has(p.id)).sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
    const newSubs = emptyBench();
    restPool.slice(0, BENCH_SLOTS).forEach((p, i) => { newSubs[i] = p.id; claimed.add(p.id); });

    const changes = [];
    newLineup.forEach((newId, idx) => {
      if (newId !== lineup[idx]) {
        const outPlayer = players.find(p => p.id === lineup[idx]);
        const inPlayer = players.find(p => p.id === newId);
        if (inPlayer) changes.push({ idx, outPlayer: outPlayer ?? null, inPlayer });
      }
    });
    return { newLineup, newSubs, changes };
  };

  const openRotationProposal = () => {
    setSubTarget(null);
    setActiveSlot(null);
    setProposal({ type: "rotation", ...computeRecommendedRotation() });
  };
  const openBestXIProposal = () => {
    setSubTarget(null);
    setActiveSlot(null);
    setProposal({ type: "bestxi", ...computeBestXI() });
  };
  const acceptProposal = () => {
    if (!proposal) return;
    setLineup(proposal.newLineup);
    setSubs(proposal.newSubs);
    setProposal(null);
  };
  const discardProposal = () => setProposal(null);

  const saveCurrentAsPreset = () => {
    if (!presetName.trim()) return;
    const newPreset = {
      id: `lineup_${Date.now()}`,
      name: presetName.trim(),
      icon: presetIcon,
      formation,
      lineup: [...lineup],
      subs: [...subs],
    };
    onSaveLineups([...(savedLineups ?? []), newPreset]);
    setSavingPreset(false);
    showFeedback(`Alineación guardada como "${newPreset.name}".`, "success");
    setPresetName("");
    setPresetIcon("🏠");
  };

  const loadPreset = (preset) => {
    const restored = sanitizeLineupSelection(preset.lineup ?? [], preset.subs ?? [], players, { starters: STARTERS_SLOTS, bench: BENCH_SLOTS });
    setFormation(preset.formation);
    setLineup(restored.lineup);
    setSubs(restored.subs);
    setLineupNotice(restored.removed.length ? {
      title: "Alineación cargada con huecos",
      detail: `No se han cargado: ${restored.removed.slice(0, 4).map(item => `${item.name} (${item.reason})`).join(", ")}${restored.removed.length > 4 ? ` y ${restored.removed.length - 4} más` : ""}.`,
    } : null);
    setShowSavedLineups(false);
  };

  const deletePreset = (presetId) => {
    onSaveLineups((savedLineups ?? []).filter(p => p.id !== presetId));
  };

  const handlePlayClick = () => {
    if (lineupValid) { onPlay?.(); return; }
    setPlayWarning(`Completa la alineación (${startersCount}/11 titulares) antes de jugar.`);
  };

  const sortedNotCalled = [...notCalled].sort((a, b) => {
    if (sortBy === "energy") return energyLevel(b.fatigue).energy - energyLevel(a.fatigue).energy;
    if (sortBy === "overall") return b.overall - a.overall;
    if (sortBy === "pos") return a.pos.localeCompare(b.pos);
    if (sortBy === "age") return a.age - b.age;
    return b.overall - a.overall;
  });

  const rowActions = (p) => (
    <button onClick={event => { event.stopPropagation(); onOpenPlayer(p); }} title="Ver perfil" style={{ background: "transparent", border: "none", color: "#c9a84c", cursor: "pointer", padding: 4 }}>ⓘ</button>
  );

  return (
    <div className="pc-lineup-layout">
      {/* ── LEFT: formación + pizarra + estado + CTA ── */}
      <div className="pc-lineup-left">
        <div className="pc-lineup-formation-row">
          {Object.keys(formations).map(f => (
            <button key={f} className="pc-lineup-formation-btn" data-active={formation === f}
              onClick={() => { setFormation(f); setLineup(emptyLineup()); setActiveSlot(null); setSubTarget(null); setProposal(null); }}>
              {f}
            </button>
          ))}
        </div>

        <div className="pc-lineup-action-row">
          <button className="pc-lineup-action-btn" style={{ background: "rgba(251,191,36,.12)", borderColor: "rgba(251,191,36,.3)", color: "#fbbf24" }} onClick={openRotationProposal}>
            🔄 Rotación recomendada
          </button>
          <button className="pc-lineup-action-btn" style={{ background: "rgba(201,168,76,.12)", borderColor: "rgba(201,168,76,.3)", color: "#c9a84c" }} onClick={openBestXIProposal}>
            ⭐ Mejor once
          </button>
        </div>

        <div className="pc-lineup-pitch">
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 100" preserveAspectRatio="none">
            <rect x="5" y="2" width="90" height="96" fill="none" stroke="rgba(255,255,255,.09)" strokeWidth=".8" />
            <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,.09)" strokeWidth=".8" />
            <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,.09)" strokeWidth=".8" />
            <rect x="30" y="2" width="40" height="14" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth=".6" />
            <rect x="30" y="84" width="40" height="14" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth=".6" />
            <rect x="38" y="2" width="24" height="7" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth=".5" />
            <rect x="38" y="91" width="24" height="7" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth=".5" />
          </svg>
          {posLayout.map(({ slot, x, y }) => {
            const player = getStarter(slot);
            const posLabel = slotPositions[slot];
            const unavail = player && (player.injured || player.suspended);
            const nearSuspension = player && !unavail && (player.yellowCards ?? 0) >= 4;
            const eng = player ? energyLevel(player.fatigue) : null;
            const acc = unavail ? "#ef4444" : player ? RARITY_ACCENT[player.rarity] : "rgba(255,255,255,.3)";
            const active = isActiveStarter(slot) || (subTarget?.idx === slot);
            return (
              <div key={slot} className="pc-lineup-pitch-dot" style={{ left: `${x}%`, top: `${y}%` }} onClick={() => handlePitchSlot(slot)}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", position: "relative",
                  background: unavail ? "rgba(239,68,68,.18)" : player ? `${acc}30` : active ? "rgba(201,168,76,.25)" : "rgba(255,255,255,.06)",
                  border: `2.5px solid ${active ? "#c9a84c" : unavail ? acc : nearSuspension ? "#fbbf24" : player ? acc : "rgba(255,255,255,.2)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", transition: "all .15s",
                  boxShadow: active ? "0 0 10px #c9a84c66" : unavail ? "0 0 10px #ef444466" : nearSuspension ? "0 0 8px #fbbf2466" : "none",
                }}>
                  {player
                    ? <span style={{ fontSize: 14, fontWeight: 700, color: acc }}>{player.overall}</span>
                    : <span style={{ fontSize: 10, color: "rgba(255,255,255,.35)" }}>{posLabel}</span>}
                  {unavail && (
                    <span style={{ position: "absolute", top: -5, right: -5, fontSize: 13, background: "#ef4444", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {player.injured ? "🚑" : "🟥"}
                    </span>
                  )}
                  {nearSuspension && !unavail && (
                    <span style={{ position: "absolute", top: -5, right: -5, fontSize: 11, background: "#fbbf24", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }} title="4 amarillas, a una de sanción">🟨</span>
                  )}
                </div>
                {player && (
                  <>
                    <div style={{ fontSize: 9, fontWeight: 800, color: eng.color, marginTop: 2, textShadow: "0 1px 2px #000" }}>{eng.emoji}{eng.energy}</div>
                    <div style={{ fontSize: 10, color: unavail ? "#ef4444" : nearSuspension ? "#fbbf24" : "#e8eaf0", maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 1px 3px #000" }}>{player.name.split(" ")[0]}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="pc-lineup-energy-bar">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, letterSpacing: ".5px" }}>ESTADO DE PLANTILLA</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: avgEnergy >= 70 ? "#22c55e" : avgEnergy >= 50 ? "#fbbf24" : "#ef4444" }}>⚡ {avgEnergy}%</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 5, background: "#161a24", borderRadius: 7, padding: "5px 8px" }}>
              <span>🟢</span><span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>{fresh}</span><span style={{ fontSize: 10, color: "#6b7280" }}>frescos</span>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 5, background: "#161a24", borderRadius: 7, padding: "5px 8px" }}>
              <span>🟡</span><span style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24" }}>{tired}</span><span style={{ fontSize: 10, color: "#6b7280" }}>cansados</span>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 5, background: "#161a24", borderRadius: 7, padding: "5px 8px" }}>
              <span>🔴</span><span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>{veryTired}</span><span style={{ fontSize: 10, color: "#6b7280" }}>muy cansados</span>
            </div>
          </div>
        </div>

        {!lineupValid && playWarning && (
          <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#fca5a5", fontSize: 11, fontWeight: 700, borderRadius: 8, padding: "8px 10px", flexShrink: 0 }}>
            ⚠️ {playWarning}
          </div>
        )}
        <button className="pc-lineup-cta" onClick={handlePlayClick}
          style={lineupValid
            ? { background: "linear-gradient(135deg,#c9a84c,#e8c96a)", color: "#1a1200", border: "none" }
            : { background: "#374151", color: "#9aa0b4", border: "1px solid rgba(255,255,255,.08)" }}>
          {lineupValid ? "▶ Jugar partido" : `⚠️ Alineación incompleta (${startersCount}/11)`}
        </button>
      </div>

      {/* ── CENTER: presets + lista de plantilla ── */}
      <div className="pc-lineup-center">
        <div className="pc-lineup-presets-card">
          <button className="pc-lineup-presets-toggle" onClick={() => setShowSavedLineups(s => !s)}>
            📋 Alineaciones guardadas {savedLineups?.length ? `(${savedLineups.length})` : ""} {showSavedLineups ? "▴" : "▾"}
          </button>
          {showSavedLineups && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {(!savedLineups || savedLineups.length === 0) && (
                <div style={{ fontSize: 11, color: "#4b5563", textAlign: "center", padding: "10px 0" }}>
                  Aún no tienes alineaciones guardadas. Configura un once y guárdalo desde el panel derecho.
                </div>
              )}
              {(savedLineups ?? []).map(preset => (
                <div key={preset.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#161a24", border: "1px solid rgba(255,255,255,.07)", borderRadius: 7, padding: "8px 10px" }}>
                  {confirmDeletePresetId === preset.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <div style={{ flex: 1, fontSize: 11, color: "#ef4444", lineHeight: 1.3 }}>¿Eliminar esta alineación guardada?</div>
                      <button onClick={() => { deletePreset(preset.id); setConfirmDeletePresetId(null); }}
                        style={{ background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.3)", color: "#ef4444", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        Confirmar
                      </button>
                      <button onClick={() => setConfirmDeletePresetId(null)}
                        style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#9aa0b4", padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: 18 }}>{preset.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{preset.name}</div>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>{preset.formation} · {preset.lineup.filter(Boolean).length}/11 titulares</div>
                      </div>
                      <button onClick={() => loadPreset(preset)} className="btn-gold" style={{ padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        Cargar
                      </button>
                      <button onClick={() => setConfirmDeletePresetId(preset.id)}
                        style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", color: "#ef4444", padding: "6px 9px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                        🗑
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {lineupNotice && (
            <div style={{ marginTop: 8, background: "rgba(249,115,22,.10)", border: "1px solid rgba(249,115,22,.24)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ color: "#fed7aa", fontSize: 11, fontWeight: 900 }}>{lineupNotice.title}</div>
              <div style={{ color: "#c9ced8", fontSize: 10, lineHeight: 1.4, marginTop: 3 }}>{lineupNotice.detail}</div>
            </div>
          )}
        </div>

        <div className="pc-lineup-list-scroll">
          {activeSlot && (
            <div style={{ background: "#c9a84c22", border: "1px solid #c9a84c44", borderRadius: 7, padding: "7px 10px", marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#c9a84c", fontWeight: 700 }}>
                {activeSlot.type === "starter"
                  ? `Slot ${activeSlot.idx + 1} · ${slotPositions[activeSlot.idx]} · elige titular de la lista`
                  : `Suplente ${activeSlot.idx + 1} · elige reserva de "No convocados"`}
              </div>
            </div>
          )}

          <div className="pc-lineup-section-label" style={{ color: "#22c55e" }}>🟢 TITULARES ({startersCount}/11)</div>
          {lineup.map((id, idx) => {
            const p = players.find(pl => pl.id === id);
            if (!p) return null;
            const eng = energyLevel(p.fatigue);
            const risk = restRisk(p);
            const role = getRole(p);
            return (
              <div key={id} className="pc-lineup-row" onClick={() => handlePitchSlot(idx)}
                style={{ background: subTarget?.idx === idx ? "rgba(201,168,76,.15)" : "#161a24", border: `1px solid ${subTarget?.idx === idx ? "#c9a84c55" : "rgba(34,197,94,.15)"}` }}>
                <Initials name={p.name} size={28} rarity={p.rarity} borderRadius={6} />
                <div className="pc-lineup-row-name">
                  <span title={role.label}>{role.icon}</span> {p.name}
                  {(p.yellowCards ?? 0) > 0 && <span style={{ fontSize: 9, color: "#fbbf24", marginLeft: 4 }}>🟨{p.yellowCards}</span>}
                </div>
                <div className="pc-lineup-row-meta" style={{ color: risk?.level === "high" ? "#ef4444" : risk?.level === "mid" ? "#f97316" : "#6b7280", width: 130, flexShrink: 0 }}>
                  {p.pos} · {slotPositions[idx]}{risk ? ` · ${risk.label}` : ""}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: RARITY_ACCENT[p.rarity], width: 26, textAlign: "center" }}>{p.overall}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: eng.color, width: 34, textAlign: "center" }}>{eng.emoji}{eng.energy}</div>
                {rowActions(p)}
              </div>
            );
          })}

          <div className="pc-lineup-section-label" style={{ color: "#fbbf24" }}>🟡 BANQUILLO ({usedSubIds.length}/{BENCH_SLOTS}) · {STARTERS_SLOTS + usedSubIds.length}/{CALLED_UP_SLOTS} convocados</div>
          {subs.map((id, idx) => {
            const p = players.find(pl => pl.id === id);
            const active = isActiveSub(idx);
            if (!p) {
              return (
                <div key={idx} className="pc-lineup-row" onClick={() => handleSubSlot(idx)}
                  style={{ background: active ? "rgba(201,168,76,.12)" : "#13161d", border: `1px dashed ${active ? "#c9a84c" : "rgba(255,255,255,.1)"}` }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "rgba(255,255,255,.25)" }}>+</div>
                  <div style={{ fontSize: 11, color: "#4b5563" }}>Hueco libre {idx + 1}</div>
                </div>
              );
            }
            const eng = energyLevel(p.fatigue);
            const role = getRole(p);
            return (
              <div key={idx} className="pc-lineup-row" onClick={() => handleSubSlot(idx)}
                style={{ background: active ? "rgba(201,168,76,.15)" : "#161a24", border: `1px solid ${active ? "#c9a84c55" : "rgba(59,130,246,.15)"}` }}>
                <Initials name={p.name} size={28} rarity={p.rarity} borderRadius={6} />
                <div className="pc-lineup-row-name"><span title={role.label}>{role.icon}</span> {p.name}</div>
                <div className="pc-lineup-row-meta" style={{ width: 130, flexShrink: 0 }}>{p.pos}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: RARITY_ACCENT[p.rarity], width: 26, textAlign: "center" }}>{p.overall}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: eng.color, width: 34, textAlign: "center" }}>{eng.emoji}{eng.energy}</div>
                {rowActions(p)}
              </div>
            );
          })}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0 6px" }}>
            <span className="pc-lineup-section-label" style={{ color: "#9aa0b4", margin: 0 }}>⚪ NO CONVOCADOS ({sortedNotCalled.length})</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ background: "#1e2330", border: "1px solid rgba(255,255,255,.1)", color: "#9aa0b4", fontSize: 10, borderRadius: 5, padding: "3px 6px" }}>
              <option value="role">Calidad</option>
              <option value="energy">Energía</option>
              <option value="overall">Media</option>
              <option value="pos">Posición</option>
              <option value="age">Edad</option>
            </select>
          </div>
          {sortedNotCalled.map(p => {
            const eng = energyLevel(p.fatigue);
            const role = getRole(p);
            return (
              <div key={p.id} className="pc-lineup-row" onClick={() => activeSlot && assignPlayer(p)}
                style={{ background: "#13161d", border: "1px solid rgba(255,255,255,.05)", cursor: activeSlot ? "pointer" : "default", opacity: .85 }}>
                <Initials name={p.name} size={26} rarity={p.rarity} borderRadius={5} />
                <div className="pc-lineup-row-name" style={{ color: "#c9ccd4" }}><span title={role.label}>{role.icon}</span> {p.name}</div>
                <div className="pc-lineup-row-meta" style={{ width: 130, flexShrink: 0 }}>{p.pos} · {p.age}a</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: RARITY_ACCENT[p.rarity], width: 26, textAlign: "center" }}>{p.overall}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: eng.color, width: 34, textAlign: "center" }}>{eng.emoji}{eng.energy}</div>
                {rowActions(p)}
              </div>
            );
          })}

          {unavailable.length > 0 && (
            <>
              <div className="pc-lineup-section-label" style={{ color: "#4b5563" }}>NO DISPONIBLES ({unavailable.length})</div>
              {unavailable.map(p => (
                <div key={p.id} className="pc-lineup-row" style={{ background: "#161a24", border: "1px solid rgba(255,255,255,.04)", opacity: .5, cursor: "default" }}>
                  <Initials name={p.name} size={26} rarity={p.rarity} borderRadius={5} />
                  <div className="pc-lineup-row-name" style={{ color: "#6b7280" }}>{p.name}</div>
                  {p.injured && <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 700 }}>LESIÓN{p.injuryGames ? ` ${p.injuryGames}J` : ""}</span>}
                  {p.suspended && <span style={{ fontSize: 9, color: "#f59e0b", fontWeight: 700 }}>SANCIÓN{p.yellowCards >= 5 ? " (5 amarillas)" : ""}</span>}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT: sustitución rápida / propuesta / estado + guardar preset ── */}
      <div className="pc-lineup-right">
        <div className="pc-lineup-right-scroll">
          {proposal ? (
            <div className="pc-panel-card" style={{ border: `1px solid ${proposal.type === "rotation" ? "rgba(251,191,36,.35)" : "rgba(201,168,76,.35)"}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: proposal.type === "rotation" ? "#fbbf24" : "#c9a84c" }}>
                  {proposal.type === "rotation" ? "🔄 Propuesta de rotación" : "⭐ Propuesta de mejor once"}
                </div>
                <button onClick={discardProposal} style={{ background: "rgba(255,255,255,.08)", border: "none", color: "#9aa0b4", padding: "4px 9px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>✕</button>
              </div>
              {proposal.changes.length === 0 ? (
                <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center", padding: "10px 0" }}>
                  {proposal.type === "rotation"
                    ? "No hay jugadores con fatiga suficiente como para recomendar un cambio. 👍"
                    : "Tu once actual ya es el mejor disponible. 👍"}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {proposal.changes.map((c, i) => {
                    const outEng = c.outPlayer ? energyLevel(c.outPlayer.fatigue) : null;
                    const inEng = energyLevel(c.inPlayer.fatigue);
                    return (
                      <div key={i} style={{ background: "#0d0f14", borderRadius: 7, padding: "7px 9px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ fontSize: 10, color: "#ef4444" }}>↓</span>
                          <span style={{ fontSize: 11, color: "#9aa0b4", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.outPlayer?.name ?? "Vacío"}</span>
                          {outEng && <span style={{ fontSize: 10, fontWeight: 700, color: outEng.color }}>{outEng.emoji}{outEng.energy}</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                          <span style={{ fontSize: 10, color: "#22c55e" }}>↑</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#e8eaf0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.inPlayer.name}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: inEng.color }}>{inEng.emoji}{inEng.energy}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {proposal.changes.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={discardProposal} className="btn-ghost" style={{ flex: 1, padding: 9, borderRadius: 7, fontSize: 12, cursor: "pointer" }}>Descartar</button>
                  <button onClick={acceptProposal} className="btn-gold" style={{ flex: 1, padding: 9, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓ Aplicar</button>
                </div>
              )}
            </div>
          ) : subTarget ? (
            <div className="pc-panel-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: "#9aa0b4" }}>
                  Sustituir a <strong style={{ color: "#e8eaf0" }}>{subTarget.player.name}</strong>
                  <span style={{ marginLeft: 6, fontWeight: 700, color: energyLevel(subTarget.player.fatigue).color }}>
                    {energyLevel(subTarget.player.fatigue).emoji}{energyLevel(subTarget.player.fatigue).energy}
                  </span>
                </div>
                <button onClick={() => setSubTarget(null)} style={{ background: "rgba(255,255,255,.08)", border: "none", color: "#9aa0b4", padding: "4px 9px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {getSubCandidates().length === 0 && (
                  <div style={{ fontSize: 11, color: "#4b5563", textAlign: "center", padding: "8px 0" }}>No hay sustitutos disponibles</div>
                )}
                {getSubCandidates().map(p => {
                  const eng = energyLevel(p.fatigue);
                  const samePos = p.pos === slotPositions[subTarget.idx];
                  return (
                    <div key={p.id} onClick={() => swapWithSub(p)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", background: "#161a24", border: "1px solid rgba(255,255,255,.07)", borderRadius: 7, cursor: "pointer" }}>
                      <Initials name={p.name} size={26} rarity={p.rarity} borderRadius={5} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                        <div style={{ fontSize: 9, color: "#6b7280" }}>{p.pos}{samePos ? " · misma posición" : ""}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: eng.color }}>{eng.emoji}{eng.energy}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: RARITY_ACCENT[p.rarity] }}>{p.overall}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeSlot ? (
            <div className="pc-panel-card">
              <div style={{ fontSize: 12, fontWeight: 700, color: "#c9a84c", marginBottom: 6 }}>
                {activeSlot.type === "starter" ? `Elegir titular · ${slotPositions[activeSlot.idx]}` : "Elegir reserva"}
              </div>
              <div style={{ fontSize: 11, color: "#9aa0b4", lineHeight: 1.5 }}>
                Selecciona un jugador de la columna central (banquillo o no convocados) para asignarlo a este puesto.
              </div>
              <button onClick={() => setActiveSlot(null)} className="btn-ghost" style={{ width: "100%", marginTop: 10, padding: 8, borderRadius: 7, fontSize: 11, cursor: "pointer" }}>Cancelar</button>
            </div>
          ) : (
            <div className="pc-panel-card">
              <div className="pc-panel-title">ESTADO DE LA ALINEACIÓN</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#9aa0b4" }}>Formación</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#c9a84c" }}>{formation}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#9aa0b4" }}>Titulares</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: lineupValid ? "#22c55e" : "#f59e0b" }}>{startersCount}/11</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#9aa0b4" }}>Banquillo</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#e8eaf0" }}>{usedSubIds.length}/{BENCH_SLOTS}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#9aa0b4" }}>Convocados</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#e8eaf0" }}>{STARTERS_SLOTS + usedSubIds.length}/{CALLED_UP_SLOTS}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                  <span style={{ fontSize: 11, color: "#9aa0b4" }}>Validez</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: lineupValid ? "#22c55e" : "#f59e0b" }}>{lineupValid ? "✓ Lista para jugar" : "⚠ Incompleta"}</span>
                </div>
              </div>
              <div style={{ fontSize: 10, color: "#6b7280", lineHeight: 1.5, marginTop: 14 }}>
                Toca un jugador en la pizarra o en la lista de titulares para sustituirlo. Toca un hueco vacío para asignar un jugador.
              </div>
            </div>
          )}
        </div>

        {feedback && <FeedbackBanner feedback={feedback} style={{ marginBottom: 0 }} />}
        <button className="btn-gold" style={{ width: "100%", padding: 11, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }} onClick={() => setSavingPreset(true)}>
          💾 Guardar como preset
        </button>
      </div>

      {savingPreset && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setSavingPreset(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#161a24", border: "1px solid rgba(201,168,76,.3)", borderRadius: 12, padding: 18, width: "100%", maxWidth: 320 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#c9a84c", marginBottom: 12 }}>Guardar alineación actual</div>
            <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Nombre (ej. Liga, Visitante...)"
              autoFocus
              style={{ width: "100%", background: "#1e2330", border: "1px solid rgba(255,255,255,.1)", color: "#e8eaf0", padding: "9px 11px", borderRadius: 7, fontSize: 13, marginBottom: 12, fontFamily: "inherit" }} />
            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, marginBottom: 6 }}>ICONO</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {PRESET_ICONS.map(icon => (
                <button key={icon} onClick={() => setPresetIcon(icon)}
                  style={{
                    width: 36, height: 36, borderRadius: 7, fontSize: 17, cursor: "pointer",
                    background: presetIcon === icon ? "rgba(201,168,76,.2)" : "#1e2330",
                    border: `1.5px solid ${presetIcon === icon ? "#c9a84c" : "rgba(255,255,255,.08)"}`,
                  }}>
                  {icon}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setSavingPreset(false); setPresetName(""); }} className="btn-ghost" style={{ flex: 1, padding: 10, borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Cancelar</button>
              <button onClick={saveCurrentAsPreset} disabled={!presetName.trim()} className="btn-gold"
                style={{ flex: 1, padding: 10, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: presetName.trim() ? "pointer" : "not-allowed", opacity: presetName.trim() ? 1 : .5 }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
