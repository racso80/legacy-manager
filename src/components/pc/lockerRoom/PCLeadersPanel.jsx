import PlayerAvatar from "../../PlayerAvatar.jsx";

export default function PCLeadersPanel({ players, summary, onOpenPlayer }) {
  const recentMoments = players
    .flatMap(player => (player.moraleEvents ?? []).map(event => ({ player, event })))
    .sort((a, b) => (b.event.matchday ?? 0) - (a.event.matchday ?? 0))
    .slice(0, 5);

  return (
    <div className="pc-lr-side-panel">
      <div className="pc-lr-side-title">Líderes del grupo</div>
      <div className="pc-lr-leaders-list">
        {summary.leaders.map(player => (
          <button key={player.id} className="pc-lr-leader-row" onClick={() => onOpenPlayer(player)}>
            <PlayerAvatar player={player} size={34} />
            <div className="pc-lr-leader-info">
              <div className="pc-lr-leader-name">{player.name}</div>
              <div className="pc-lr-leader-sub">{player.personality?.profileLabel} · Liderazgo {player.personality?.traits?.leadership}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="pc-lr-side-title pc-lr-side-title-spaced">Momentos recientes</div>
      {recentMoments.length ? (
        <div className="pc-lr-moments-list">
          {recentMoments.map(({ player, event }) => (
            <button key={`${player.id}-${event.id}`} className="pc-lr-moment-item" onClick={() => onOpenPlayer(player)}>
              <div className="pc-lr-moment-name">{player.name}</div>
              <div className="pc-lr-moment-label">{event.label}</div>
            </button>
          ))}
        </div>
      ) : <div className="pc-lr-side-empty">Sin novedades recientes.</div>}
    </div>
  );
}
