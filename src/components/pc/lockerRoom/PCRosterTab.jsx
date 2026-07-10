import { useState } from "react";
import PlayerAvatar from "../../PlayerAvatar.jsx";
import { getMoraleLevel } from "../../../morale/moraleEngine.js";

const FILTERS = [["all", "Todos"], ["concerns", "Preocupados"], ["leaders", "Líderes"], ["young", "Jóvenes"]];
const ROLE_COLOR = { Estrella: "#c9a84c", Titular: "#22c55e", "Rotación": "#60a5fa", Promesa: "#84cc16", Suplente: "#9ca3af", Emergencia: "#6b7280" };
const isConcern = player => (player.morale ?? 70) < 45 || (player.happiness ?? 70) < 45 || (player.managerTrust ?? 70) < 45;

export default function PCRosterTab({ players, conversations, leaderIds, onOpenPlayer, onOpenConversation }) {
  const [filter, setFilter] = useState("all");
  const filtered = players
    .filter(player => {
      if (filter === "leaders") return leaderIds.has(player.id);
      if (filter === "concerns") return isConcern(player);
      if (filter === "young") return (player.age ?? 25) <= 23;
      return true;
    })
    .sort((a, b) => (a.morale ?? 70) - (b.morale ?? 70));

  return (
    <>
      <div className="pc-lr-filter-row">
        {FILTERS.map(([id, label]) => (
          <div key={id} className={`pc-lr-filter-pill${filter === id ? " active" : ""}`} onClick={() => setFilter(id)}>{label}</div>
        ))}
      </div>

      <div className="pc-lr-roster-grid">
        {filtered.map(player => {
          const morale = getMoraleLevel(player.morale);
          const pendingConversation = conversations.find(item => item.actorId === player.id);
          return (
            <div key={player.id} className={`pc-lr-roster-card${isConcern(player) ? " concern" : ""}`}>
              <div className="pc-lr-roster-top" onClick={() => onOpenPlayer(player)}>
                <PlayerAvatar player={player} size={38} />
                <div className="pc-lr-roster-info">
                  <div className="pc-lr-roster-name">{player.name}</div>
                  <div className="pc-lr-roster-sub">{player.personality?.profileLabel} · <span style={{ color: ROLE_COLOR[player.squadRole] ?? "#9ca3af" }}>{player.squadRole}</span></div>
                </div>
              </div>
              <div className="pc-lr-roster-stats">
                <div><span className="lbl">Moral</span><span className="val" style={{ color: morale.color }}>{player.morale}</span></div>
                <div><span className="lbl">Felicidad</span><span className="val">{player.happiness}</span></div>
                <div><span className="lbl">Confianza</span><span className="val">{player.managerTrust}</span></div>
              </div>
              {pendingConversation
                ? <button className="btn-gold pc-lr-roster-btn" onClick={() => onOpenConversation(pendingConversation.id)}>💬 Hablar</button>
                : <button className="btn-ghost pc-lr-roster-btn" onClick={() => onOpenPlayer(player)}>Ver perfil</button>}
            </div>
          );
        })}
        {!filtered.length && <div className="pc-lr-empty">No hay jugadores en esta vista.</div>}
      </div>
    </>
  );
}
