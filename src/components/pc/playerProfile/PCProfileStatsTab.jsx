import { useState } from "react";

export default function PCProfileStatsTab({ player, game, stats, history }) {
  const [statsSeason, setStatsSeason] = useState(String(game.season));
  const statsSeasons = [String(game.season), ...history.map(entry => String(entry.season)).filter((season, index, array) => array.indexOf(season) === index && season !== String(game.season))];
  const displayed = statsSeason === String(game.season) ? stats : history.find(entry => String(entry.season) === statsSeason) ?? {};
  const isGoalkeeper = player.group === "POR" || player.pos === "POR";

  const rows = [
    ["Partidos", displayed.appearances ?? 0],
    ["Titularidades", displayed.starts ?? "—"],
    ["Minutos", displayed.minutes ?? "—"],
    ["Goles", displayed.goals ?? 0],
    ["Asistencias", displayed.assists ?? 0],
    [isGoalkeeper ? "Porterías a cero" : "Tarjetas", isGoalkeeper ? (displayed.cleanSheets ?? "—") : `${displayed.yellows ?? 0} 🟨 · ${displayed.reds ?? 0} 🟥`],
    ["Nota media", displayed.averageRating ?? displayed.overall ?? "—"],
  ];

  return (
    <div>
      <div className="pc-pp-stats-header">
        <div className="pc-pp-info-card-title">Temporada</div>
        <select value={statsSeason} onChange={event => setStatsSeason(event.target.value)}>
          {statsSeasons.map(season => (
            <option key={season} value={season}>{season}/{String(Number(season) + 1).slice(-2)}{season === String(game.season) ? " · actual" : ""}</option>
          ))}
        </select>
      </div>
      <div className="pc-pp-stats-grid">
        {rows.map(([label, value]) => (
          <div key={label} className="pc-pp-info-card">
            <div className="pc-pp-info-card-title">{label}</div>
            <div className="pc-pp-stat-value">{value}</div>
          </div>
        ))}
      </div>
      <div className="pc-pp-stats-note">Los minutos y titularidades son exactos para los partidos registrados con el nuevo sistema. En temporadas antiguas pueden mostrarse estimaciones.</div>
    </div>
  );
}
