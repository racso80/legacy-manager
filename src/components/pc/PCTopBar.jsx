function formatBudget(value) {
  if (value == null) return "—";
  return value >= 1000 ? `€${(value / 1000).toFixed(1)}M` : `€${Math.round(value)}K`;
}

export default function PCTopBar({ team, game, position, budgetLeft }) {
  const season = game?.season ?? "2025";
  const seasonLabel = `${season}/${String(parseInt(season, 10) + 1).slice(-2)}`;
  return (
    <div className="pc-topbar">
      <div className="pc-topbar-left">
        <span className="pc-topbar-logo">L</span>
        <span className="pc-topbar-title">LEGACY MANAGER</span>
      </div>
      <div className="pc-topbar-center">
        {team?.name ?? "—"} · Temporada {seasonLabel} · Jornada {game?.matchday ?? 1} · {position ? `${position}º` : "—"}
      </div>
      <div className="pc-topbar-right">
        <span className="pc-topbar-budget">{formatBudget(budgetLeft)}</span>
      </div>
    </div>
  );
}
