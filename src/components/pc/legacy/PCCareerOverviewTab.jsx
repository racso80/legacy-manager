import { COACH_PHILOSOPHIES, getCoachPrestigeLevel } from "../../../coach/coachCareerEngine.js";

const money = value => {
  if (value == null) return null;
  const sign = value < 0 ? "-" : "+";
  const abs = Math.abs(value);
  return `${sign}€${abs >= 1000 ? `${(abs / 1000).toFixed(1)}M` : `${Math.round(abs)}K`}`;
};
const seasonLabel = value => `${value}/${String(Number(value) + 1).slice(-2)}`;

export default function PCCareerOverviewTab({ team, legacy, archive, coach }) {
  const level = getCoachPrestigeLevel(coach?.prestige ?? 10);
  const philosophy = COACH_PHILOSOPHIES.find(item => item.id === coach?.philosophy) ?? COACH_PHILOSOPHIES[0];
  const stats = coach?.stats ?? {};

  const highlights = [
    stats.biggestWin && { label: "Mayor victoria", value: `${stats.biggestWin.goalsFor}-${stats.biggestWin.goalsAgainst} (T. ${seasonLabel(stats.biggestWin.season)})` },
    stats.bestSeason && { label: "Mejor temporada", value: `${stats.bestSeason.position}.º · ${stats.bestSeason.points} pts (T. ${seasonLabel(stats.bestSeason.season)})` },
    (stats.bestWinStreak ?? 0) > 0 && { label: "Mejor racha", value: `${stats.bestWinStreak} victorias seguidas` },
    (stats.promotedYouth ?? 0) > 0 && { label: "Jóvenes promocionados", value: `${stats.promotedYouth}` },
    stats.transferProfit ? { label: "Balance de fichajes", value: money(stats.transferProfit) } : null,
  ].filter(Boolean);

  const seasons = archive.seasons ?? [];
  const totals = seasons.reduce((sum, item) => ({ matches: sum.matches + (item.results?.fixtures?.length ?? 0), goals: sum.goals + (item.goalsFor ?? 0) }), { matches: 0, goals: 0 });

  const points = [...(archive.prestigeHistory ?? [])].reverse();
  const max = Math.max(100, ...points.map(item => item.managerPrestige ?? 0));
  const path = points.map((item, index) => `${points.length === 1 ? 50 : (index / (points.length - 1)) * 100},${100 - (item.managerPrestige ?? 0) / max * 100}`).join(" ");

  return (
    <div className="pc-lc-career-layout">
      <div>
        <div className="pc-lc-identity-card">
          <div className="pc-lc-identity-top">
            <div className="pc-lc-avatar" style={{ background: `${level.color}18` }}>{coach?.avatar ?? "🧑‍💼"}</div>
            <div>
              <div className="pc-lc-identity-name">{coach?.name}</div>
              <div className="pc-lc-identity-level" style={{ color: level.color }}>{level.label} · Prestigio {Math.round(coach?.prestige ?? 10)}/100</div>
              <div className="pc-lc-identity-meta">{coach?.nationality} · {team?.name ?? coach?.currentClubName} · {philosophy.icon} {philosophy.label}</div>
            </div>
          </div>
          <div className="pc-lc-progress-track"><div className="pc-lc-progress-fill" style={{ width: `${Math.max(0, Math.min(100, coach?.prestige ?? 10))}%`, background: level.color }} /></div>
        </div>

        <div className="pc-lc-section-label">Hitos destacados</div>
        {highlights.length ? (
          <div className="pc-lc-highlights-grid">
            {highlights.map(item => (
              <div key={item.label} className="pc-lc-stat-card">
                <div className="pc-lc-stat-value">{item.value}</div>
                <div className="pc-lc-stat-label">{item.label}</div>
              </div>
            ))}
          </div>
        ) : <div className="pc-lc-empty">Los hitos aparecerán a medida que avance tu carrera.</div>}

        <div className="pc-lc-section-label">Nuevos hitos históricos</div>
        {(archive.milestones ?? []).length ? (
          <div className="pc-lc-milestone-list">
            {archive.milestones.slice(0, 6).map(item => (
              <div key={item.id} className="pc-lc-milestone-item">
                <div className="pc-lc-milestone-icon">{item.icon}</div>
                <div>
                  <div className="pc-lc-milestone-title">{item.title}</div>
                  <div className="pc-lc-milestone-summary">{seasonLabel(item.season)} · {item.summary}</div>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="pc-lc-empty">Los grandes hitos aparecerán al cerrar temporadas, conquistar títulos y romper récords.</div>}
      </div>

      <div className="pc-lc-side-panel">
        <div className="pc-lc-section-label">Temporadas en el cargo</div>
        <div className="pc-lc-trio-grid">
          <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{coach?.stats?.seasons ?? 0}</div><div className="pc-lc-stat-label">Temporadas</div></div>
          <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{coach?.stats?.wins ?? 0}</div><div className="pc-lc-stat-label">Victorias</div></div>
          <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{coach?.stats?.titles ?? 0}</div><div className="pc-lc-stat-label">Títulos</div></div>
        </div>

        <div className="pc-lc-section-label">Legado global</div>
        <div className="pc-lc-trio-grid">
          <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{seasons.length}</div><div className="pc-lc-stat-label">Archivadas</div></div>
          <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{legacy.trophies?.length ?? 0}</div><div className="pc-lc-stat-label">Trofeos</div></div>
          <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{totals.goals}</div><div className="pc-lc-stat-label">Goles</div></div>
        </div>

        <div className="pc-lc-section-label">Evolución del prestigio</div>
        {points.length ? (
          <div className="pc-lc-chart-card">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pc-lc-chart-svg">
              <defs>
                <linearGradient id="pcLegacyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#c9a84c" stopOpacity=".35" />
                  <stop offset="1" stopColor="#c9a84c" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline points={`0,100 ${path} 100,100`} fill="url(#pcLegacyFill)" />
              <polyline points={path} fill="none" stroke="#c9a84c" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="pc-lc-chart-axis">{points.map(item => <span key={item.season}>{item.season}</span>)}</div>
          </div>
        ) : <div className="pc-lc-empty">La curva de prestigio comenzará al cerrar la primera temporada.</div>}
      </div>
    </div>
  );
}
