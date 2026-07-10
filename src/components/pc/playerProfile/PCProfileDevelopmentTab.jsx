import { ATTRIBUTE_LABELS } from "../../../training/trainingEngine.js";

export default function PCProfileDevelopmentTab({ player, potential, trainingReport }) {
  const xpEntries = Object.entries(player.developmentXP ?? {}).filter(([key]) => key !== "tactical").sort((a, b) => b[1] - a[1]).slice(0, 6);
  const history = player.developmentHistory ?? [];

  return (
    <div>
      <div className="pc-pp-info-grid two">
        <div className="pc-pp-info-card">
          <div className="pc-pp-info-card-title">Media / Potencial</div>
          <div className="pc-pp-stat-value gold">{player.overall} / {potential}</div>
        </div>
        <div className="pc-pp-info-card">
          <div className="pc-pp-info-card-title">Objetivo actual</div>
          <div className="pc-pp-stat-value">{player.trainingFocus ? ATTRIBUTE_LABELS[player.trainingFocus] : "General"}</div>
        </div>
      </div>

      <div className="pc-pp-attr-section">
        <div className="pc-pp-info-card-title">Progreso de atributos</div>
        {xpEntries.length ? xpEntries.map(([key, value]) => (
          <div key={key} className="pc-pp-attr-row">
            <span className="pc-pp-attr-label">{ATTRIBUTE_LABELS[key] ?? key}</span>
            <div className="pc-pp-attr-bar"><div className="pc-pp-attr-fill" style={{ width: `${Math.min(100, value)}%` }} /></div>
            <span className="pc-pp-attr-value">{Math.round(value)}%</span>
          </div>
        )) : <div className="pc-pp-empty">El progreso aparecerá tras el primer entrenamiento semanal.</div>}
      </div>

      <div className="pc-pp-section-label">Último entrenamiento</div>
      <div className="pc-pp-report-box">
        {trainingReport?.changes?.length
          ? trainingReport.changes.map(change => `${change.label} ${change.delta > 0 ? "+" : ""}${change.delta}`).join(" · ")
          : trainingReport?.progress?.[0]
            ? `${trainingReport.progress[0].label}: ${trainingReport.progress[0].value}% hacia la siguiente mejora.`
            : "Sin informe disponible todavía."}
      </div>

      <div className="pc-pp-section-label">Historial de desarrollo</div>
      {history.length ? (
        <div className="pc-pp-dev-history">
          {[...history].reverse().map(entry => (
            <div key={entry.season} className="pc-pp-dev-history-row">
              <div>
                <div className="pc-pp-dev-history-season">{entry.season}/{String(Number(entry.season) + 1).slice(-2)}</div>
                <div className="pc-pp-dev-history-value">Valor: €{entry.startValue}K → €{entry.endValue}K</div>
              </div>
              <div className="pc-pp-dev-history-overall" style={{ color: entry.endOverall > entry.startOverall ? "var(--pp-green)" : undefined }}>{entry.startOverall} → {entry.endOverall}</div>
            </div>
          ))}
        </div>
      ) : <div className="pc-pp-empty">El historial se guardará al terminar la temporada.</div>}
    </div>
  );
}
