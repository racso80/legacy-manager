import PlayerAvatar from "../../PlayerAvatar.jsx";
import { getTalentCategory, getYouthProjection } from "../../../youth/youthEngine.js";

const FULL_TOOLTIP = "No se puede promocionar: la plantilla del primer equipo tiene el máximo de 30 jugadores.";

// Mismo formato que describeWeeklyChanges en YouthAcademyScreen.jsx (móvil), duplicado
// igual que el resto de helpers pequeños PC/móvil de esta sesión.
function describeWeeklyChanges(changes) {
  const parts = changes.map(change => `${change.label} (+${change.delta})`);
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}` : parts[0];
  return `Mejora en ${joined} esta semana.`;
}

export default function PCProspectCard({ player, isNew, canPromote, progress, onOpenPlayer, onPromote }) {
  const category = getTalentCategory(player.potential);
  const projection = getYouthProjection(player);
  const initialPotential = player.academyData?.initialPotential ?? player.potential;

  return (
    <div className="pc-yt-prospect-card" style={{ borderLeftColor: category.color }}>
      <div className="pc-yt-tier-badge" style={{ color: category.color, background: `${category.color}18` }}>{category.icon} {category.label}</div>
      <div className="pc-yt-card-top" onClick={() => onOpenPlayer(player)} style={{ cursor: "pointer" }}>
        <PlayerAvatar player={player} size={42} />
        <div style={{ minWidth: 0 }}>
          <div className="pc-yt-p-name">{player.name}{isNew && <span className="pc-yt-new-badge">NUEVO</span>}</div>
          <div className="pc-yt-p-sub">{player.pos} · {player.age} años · Llegó T. {player.academyData?.joinedSeason}{player.academyData?.region ? ` · ${player.academyData.region}` : ""}</div>
        </div>
      </div>

      <div className="pc-yt-potential-row">
        <div className="pc-yt-ov-block">
          <div className="pc-yt-ov-value">{player.overall}</div>
          <div className="pc-yt-ov-label">ACTUAL</div>
        </div>
        <div className="pc-yt-ov-arrow">→</div>
        <div className="pc-yt-ov-block">
          <div className="pc-yt-ov-value" style={{ color: category.color }}>{player.potential}</div>
          <div className="pc-yt-ov-label">TECHO{initialPotential !== player.potential ? ` (${initialPotential})` : ""}</div>
        </div>
      </div>

      <div className="pc-yt-projection-tag" style={{ color: projection.color, background: `${projection.color}16`, borderColor: `${projection.color}30` }}>
        {projection.icon} {projection.label}
      </div>

      {progress && (
        <div className={`pc-yt-progress-note${progress.changes?.length ? " good" : ""}`}>
          {progress.changes?.length
            ? `📈 ${describeWeeklyChanges(progress.changes)}`
            : progress.progress?.[0]
              ? `Avanza en ${progress.progress[0].label}, ya está al ${progress.progress[0].value}% de su objetivo de mejora.`
              : "Desarrollo estable"}
        </div>
      )}

      <div className="pc-yt-card-foot">
        <button className="btn-ghost pc-yt-btn-sm" onClick={() => onOpenPlayer(player)}>Ver perfil</button>
        <button className="btn-gold pc-yt-btn-sm" disabled={!canPromote} title={canPromote ? undefined : FULL_TOOLTIP} onClick={() => onPromote(player)}>
          {canPromote ? "⬆ Promocionar" : "Plantilla llena"}
        </button>
      </div>
    </div>
  );
}
