import PlayerAvatar from "../../PlayerAvatar.jsx";

export default function PCLeadersPanel({ summary, onOpenPlayer }) {
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
    </div>
  );
}
