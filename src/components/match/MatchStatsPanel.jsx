// Barras comparativas local/visitante. rows: [{ label, home, away }]
export default function MatchStatsPanel({ rows = [] }) {
  return (
    <div className="pc-match-v2-panel">
      <div className="pc-match-v2-panel-head">
        <span className="pc-match-v2-panel-title">Estadísticas del partido</span>
      </div>
      <div className="pc-match-v2-panel-body">
        {rows.map(({ label, home, away }) => {
          const total = (Number(home) || 0) + (Number(away) || 0);
          const hp = total > 0 ? (Number(home) / total) * 100 : 50;
          const ap = 100 - hp;
          return (
            <div key={label} className="pc-match-v2-stat-row">
              <div className="pc-match-v2-stat-labels">
                <span className="h">{home}</span>
                <span className="a">{away}</span>
              </div>
              <div className="pc-match-v2-stat-name">{label}</div>
              <div className="pc-match-v2-bar-track">
                <div className="pc-match-v2-bar-h" style={{ width: `${hp / 2}%` }} />
                <div style={{ flex: 1 }} />
                <div className="pc-match-v2-bar-a" style={{ width: `${ap / 2}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
