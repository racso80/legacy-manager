import { useState } from "react";
import { ATTRIBUTE_LABELS, INDIVIDUAL_FOCUSES } from "../../../training/trainingEngine.js";

// Decorativo — INDIVIDUAL_FOCUSES no trae iconos propios (solo ATTRIBUTE_LABELS,
// texto). Set local, no depende de ningún dato real.
const FOCUS_ICONS = { ritmo: "⚡", fisico: "💪", pase: "🎯", regate: "👟", tiro: "🥅", defensa: "🛡️", porteria: "🧤" };

export default function PCIndividualFocusTab({ game, plan, onPlanChange }) {
  const roster = [...game.players, ...(game.youth?.players ?? [])];
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedAttr, setSelectedAttr] = useState("");

  const selectedPlayer = roster.find(player => player.id === selectedPlayerId);
  const availableAttrs = INDIVIDUAL_FOCUSES.filter(key => selectedPlayer?.group === "POR" ? key === "porteria" : key !== "porteria");

  const pickPlayer = playerId => {
    setSelectedPlayerId(playerId);
    setSelectedAttr(plan.individual[playerId] ?? "");
  };

  const assign = () => {
    if (!selectedPlayerId) return;
    onPlanChange({ ...plan, individual: { ...plan.individual, [selectedPlayerId]: selectedAttr || undefined } });
  };

  const activeEntries = Object.entries(plan.individual).filter(([, attr]) => attr).map(([playerId, attr]) => {
    const player = roster.find(item => item.id === playerId);
    const isYouth = player && !game.players.some(item => item.id === playerId);
    return { playerId, attr, name: player?.name ?? playerId, isYouth };
  });

  return (
    <div className="pc-tr-layout">
      <div>
        <div className="pc-tr-section-label">Asignar foco individual</div>
        <div className="pc-tr-side-panel">
          <div className="pc-tr-field-label">Jugador</div>
          <select className="pc-tr-select" value={selectedPlayerId} onChange={event => pickPlayer(event.target.value)}>
            <option value="">Elegí un jugador...</option>
            {game.players.map(player => <option key={player.id} value={player.id}>{player.name} · {player.pos} · {player.overall}/{player.potential}</option>)}
            {(game.youth?.players ?? []).map(player => <option key={player.id} value={player.id}>{player.name} (cantera) · {player.pos} · {player.overall}/{player.potential}</option>)}
          </select>

          <div className="pc-tr-field-label">Atributo a mejorar</div>
          <div className="pc-tr-attr-row">
            <div className={`pc-tr-preset-pill${selectedAttr === "" ? " active" : ""}`} onClick={() => setSelectedAttr("")}>Sin foco</div>
            {availableAttrs.map(key => (
              <div key={key} className={`pc-tr-preset-pill${selectedAttr === key ? " active" : ""}`} onClick={() => setSelectedAttr(key)}>
                {FOCUS_ICONS[key]} {ATTRIBUTE_LABELS[key]}
              </div>
            ))}
          </div>

          <button className="btn-gold pc-tr-assign-btn" disabled={!selectedPlayerId} onClick={assign}>Asignar foco</button>
        </div>
      </div>

      <div>
        <div className="pc-tr-section-label">Focos activos ({activeEntries.length})</div>
        {activeEntries.length ? activeEntries.map(entry => (
          <div key={entry.playerId} className="pc-tr-individual-item">
            <div className="in-name">{entry.name}{entry.isYouth ? " (cantera)" : ""}</div>
            <div className="in-attr">{FOCUS_ICONS[entry.attr]} {ATTRIBUTE_LABELS[entry.attr] ?? entry.attr} · +XP extra cada semana</div>
          </div>
        )) : <div className="pc-tr-empty">No hay focos individuales activos.</div>}
      </div>
    </div>
  );
}
