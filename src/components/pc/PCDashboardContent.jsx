function formatBudget(value) {
  if (value == null) return "—";
  return value >= 1000 ? `€${(value / 1000).toFixed(1)}M` : `€${Math.round(value)}K`;
}

function statusFor(player) {
  if (player.injured) return { label: "Lesionado", color: "#ef4444" };
  if (player.suspended) return { label: "Sancionado", color: "#f59e0b" };
  return { label: "Disponible", color: "#22c55e" };
}

export default function PCDashboardContent({ game, team, position, budgetLeft, nextFixture, nextOpponent, setScreen, onPlay }) {
  const players = game.players ?? [];
  const record = (game.fixtures ?? [])
    .filter(f => f.played && (f.homeTeamId === game.teamId || f.awayTeamId === game.teamId))
    .reduce((acc, f) => {
      const home = f.homeTeamId === game.teamId;
      const gf = home ? f.homeGoals : f.awayGoals;
      const ga = home ? f.awayGoals : f.homeGoals;
      if (gf > ga) acc.w++; else if (gf === ga) acc.d++; else acc.l++;
      return acc;
    }, { w: 0, d: 0, l: 0 });
  const confidence = Math.round(game.legacy?.confidence ?? 65);

  const statCards = [
    { label: "Posición", value: position ? `${position}º` : "—", color: "#c9a84c" },
    { label: "Récord", value: `${record.w}V ${record.d}E ${record.l}D`, color: "#60a5fa" },
    { label: "Confianza directiva", value: `${confidence}%`, color: confidence >= 60 ? "#22c55e" : confidence >= 40 ? "#f59e0b" : "#ef4444" },
    { label: "Presupuesto", value: formatBudget(budgetLeft), color: (budgetLeft ?? 0) > 0 ? "#22c55e" : "#ef4444" },
  ];

  const topPlayers = [...players].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0)).slice(0, 5);

  return (
    <div className="pc-dashboard">
      <div className="pc-dashboard-stats">
        {statCards.map(card => (
          <div key={card.label} className="pc-stat-card">
            <div className="pc-stat-card-label">{card.label.toUpperCase()}</div>
            <div className="pc-stat-card-value" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="pc-panel-card">
        <div className="pc-panel-title">PRÓXIMO PARTIDO</div>
        {nextFixture ? (
          <div>
            <div className="pc-next-match-opponent">
              {nextFixture.homeTeamId === game.teamId ? "vs" : "@"} {nextOpponent?.name ?? "Rival por confirmar"}
            </div>
            <div className="pc-next-match-meta">
              Jornada {nextFixture.matchday} · {nextOpponent?.stadium ?? team?.stadium ?? "Estadio por confirmar"}
            </div>
            <button className="btn-gold" style={{ marginTop: 10, padding: "9px 16px", borderRadius: 9, fontSize: 12 }} onClick={onPlay}>
              Preparar partido →
            </button>
          </div>
        ) : (
          <div className="pc-right-panel-empty">No hay más partidos programados.</div>
        )}
      </div>

      <div className="pc-panel-card">
        <div className="pc-panel-title">JUGADORES DESTACADOS</div>
        <div className="pc-squad-highlights-list">
          {topPlayers.map(player => {
            const status = statusFor(player);
            return (
              <button key={player.id} className="pc-squad-highlight-row" onClick={() => setScreen("squad")}>
                <span className="pc-squad-highlight-name">{player.name}</span>
                <span className="pc-squad-highlight-overall">{player.overall}</span>
                <span className="pc-squad-highlight-status" style={{ color: status.color }}>{status.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
