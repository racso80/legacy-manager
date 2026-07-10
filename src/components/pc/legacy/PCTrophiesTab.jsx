const seasonLabel = value => `${value}/${String(Number(value) + 1).slice(-2)}`;

export default function PCTrophiesTab({ legacy }) {
  const trophies = legacy.trophies ?? [];
  if (!trophies.length) return <div className="pc-lc-empty">Las vitrinas esperan el primer título de tu era.</div>;
  return (
    <div className="pc-lc-trophy-grid">
      {trophies.map(trophy => (
        <div key={trophy.id} className="pc-lc-trophy-card">
          <div className="pc-lc-trophy-icon">{trophy.icon || "🏆"}</div>
          <div className="pc-lc-trophy-name">{trophy.name}</div>
          <div className="pc-lc-trophy-season">{seasonLabel(trophy.season)}</div>
          <div className="pc-lc-trophy-meta">{trophy.clubName}<br />{trophy.managerName}</div>
        </div>
      ))}
    </div>
  );
}
