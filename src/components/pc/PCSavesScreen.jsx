import { useState } from "react";

const fmtDate = iso => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function PCSavesScreen({ saves, teams, onLoad, onDelete, onNew, onBack }) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const sorted = [...saves].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return (
    <div className="pc-pregame pc-pregame-saves">
      <div className="pc-pregame-saves-header">
        <div>
          <h1>Mis partidas</h1>
          <div className="pc-pregame-sub">{saves.length} partida{saves.length !== 1 ? "s" : ""} guardada{saves.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="pc-pregame-back-link" onClick={onBack}>← Volver al menú</div>
      </div>

      {saves.length === 0 && <div className="pc-pregame-saves-empty">No hay partidas guardadas.</div>}

      <div className="pc-pregame-saves-grid">
        {sorted.map(s => {
          const team = teams.find(t => t.id === s.teamId);
          return (
            <div key={s.id} className="pc-pregame-save-card">
              <div className="pc-pregame-save-top">
                <div className="pc-pregame-badge" style={{ background: `${team?.color ?? "#c9a84c"}22`, border: `2px solid ${team?.color ?? "#c9a84c"}55`, color: team?.color ?? "#c9a84c" }}>
                  {team?.short ?? "LM"}
                </div>
                <div>
                  <div className="pc-pregame-save-name">{s.name ?? team?.name ?? "Partida"}</div>
                  <div className="pc-pregame-save-meta">J{s.matchday} · Temp. {s.season}/{parseInt(s.season) + 1}</div>
                  <div className="pc-pregame-save-date">Guardada: {fmtDate(s.updatedAt)}</div>
                </div>
              </div>
              {confirmDelete === s.id ? (
                <div className="pc-pregame-save-confirm">
                  <div className="pc-pregame-save-confirm-text">¿Eliminar esta partida?</div>
                  <button className="pc-pregame-btn pc-pregame-btn-danger-solid" onClick={() => { onDelete(s.id); setConfirmDelete(null); }}>Sí, borrar</button>
                  <button className="pc-pregame-btn pc-pregame-btn-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                </div>
              ) : (
                <div className="pc-pregame-save-actions">
                  <button className="pc-pregame-btn pc-pregame-btn-gold" onClick={() => onLoad(s.id)}>▶ Continuar</button>
                  <button className="pc-pregame-btn pc-pregame-btn-danger" onClick={() => setConfirmDelete(s.id)}>🗑</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pc-pregame-new-game-card" onClick={onNew}>+ Crear nueva partida</div>
    </div>
  );
}
