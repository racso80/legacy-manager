import PlayerAvatar from "../../PlayerAvatar.jsx";

const fmt = value => value >= 1000 ? `€${(value / 1000).toFixed(1)}M` : `€${Math.round(value)}K`;

const VULNERABLE_TOOLTIP = "Cláusula relativamente baja para su nivel. Hoy ningún club puede pagarla y llevárselo sin negociar contigo — es solo una señal a vigilar si eso cambia más adelante.";

export default function PCContractCard({ player, bucket, activeRenewal, vulnerable, onOpenPlayer, onRenew, onViewRenewal }) {
  const endLabel = bucket === "urgent" ? `${player.contractEnd ?? "—"} (esta temp.)` : bucket === "soon" ? `${player.contractEnd ?? "—"} (próx. temp.)` : String(player.contractEnd ?? "—");
  const endClass = bucket === "urgent" ? " expiry-urgent" : bucket === "soon" ? " expiry-soon" : "";
  const cardClass = bucket === "urgent" ? " urgent" : bucket === "soon" ? " soon" : "";

  return (
    <div className={`pc-ct-player-card${cardClass}`}>
      <div className="pc-ct-card-top" onClick={() => onOpenPlayer(player)} style={{ cursor: "pointer" }}>
        <PlayerAvatar player={player} size={38} />
        <div>
          <div className="pc-ct-p-name">{player.name}</div>
          <div className="pc-ct-role-badge">{player.squadRole ?? "Rotación"}</div>
        </div>
      </div>
      <div className="pc-ct-stats">
        <div>
          <div className="pc-ct-stat-label">Vence</div>
          <div className={`pc-ct-stat-value${endClass}`}>{endLabel}</div>
        </div>
        <div>
          <div className="pc-ct-stat-label">Salario</div>
          <div className="pc-ct-stat-value">{fmt(player.salary ?? 0)}/sem</div>
        </div>
        <div>
          <div className="pc-ct-stat-label">Cláusula</div>
          <div className="pc-ct-stat-value pc-ct-clause-row">
            {fmt(player.releaseClause ?? 0)}
            {vulnerable && <span className="pc-ct-shield-badge" title={VULNERABLE_TOOLTIP}>🛡️</span>}
          </div>
        </div>
        <div>
          <div className="pc-ct-stat-label">Media</div>
          <div className="pc-ct-stat-value">{player.overall}</div>
        </div>
      </div>
      <div className="pc-ct-card-foot">
        {activeRenewal
          ? <button className="btn-ghost pc-ct-btn-sm" onClick={() => onViewRenewal(activeRenewal.id)}>Ver negociación</button>
          : <button className="btn-gold pc-ct-btn-sm" onClick={onRenew}>Renovar</button>}
      </div>
    </div>
  );
}
