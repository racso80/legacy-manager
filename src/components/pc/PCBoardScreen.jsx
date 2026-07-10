import { getJobRisk, getPrestigeLevel } from "../../legacy/legacyEngine.js";

const hashSeed = value => { let h = 0; for (const c of String(value)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
// Mismo pool de mensajes que BoardLegacyScreen.jsx (móvil) — texto de sabor, no una
// fórmula real, así que se duplica en vez de importarse desde una pantalla móvil.
const BOARD_VERDICT_MESSAGES = {
  high: [
    "La directiva está satisfecha con el rumbo del proyecto.",
    "El informe deja claro que arriba se respalda la dirección actual del club.",
    "La sensación general en la directiva es de tranquilidad y confianza en el proyecto.",
  ],
  mixed: [
    "La directiva sigue la evolución del proyecto con cautela, sin grandes alarmas ni euforia.",
    "El informe pinta un panorama desigual: hay cosas que convencen y otras que conviene vigilar.",
    "Arriba no hay alarma, pero tampoco euforia. Se espera ver más antes de sacar conclusiones.",
  ],
  low: [
    "La directiva no oculta su preocupación por el rumbo reciente del proyecto.",
    "El informe deja un mensaje claro: arriba esperan una reacción pronto.",
    "La paciencia de la directiva empieza a tensarse con los números de este informe.",
  ],
};
function boardVerdict(report) {
  if (!report) return null;
  const tier = report.overall >= 70 ? "high" : report.overall >= 45 ? "mixed" : "low";
  const pool = BOARD_VERDICT_MESSAGES[tier];
  return pool[hashSeed(`${report.season}:${report.matchday}:verdict`) % pool.length];
}

const OBJECTIVE_ICON = { sport: "⚽", economy: "💶", development: "🌱" };
const REPORT_METRICS = [["sport", "Objetivo deportivo"], ["economy", "Objetivo económico"], ["development", "Desarrollo"], ["overall", "Valoración global"]];

export default function PCBoardScreen({ game, team }) {
  const legacy = game.legacy;
  const clubLevel = getPrestigeLevel(legacy.clubPrestige);
  const jobRisk = getJobRisk(legacy.confidence);
  const lastReport = legacy.monthlyReports?.[0];
  const confidenceColor = legacy.confidence >= 75 ? "#22c55e" : legacy.confidence >= 50 ? "#eab308" : legacy.confidence >= 30 ? "#f97316" : "#ef4444";

  return (
    <div className="pc-bd-root">
      <div className="pc-bd-header">
        <div>
          <h1>Directiva</h1>
          <div className="pc-bd-sub">{team?.name}</div>
        </div>
      </div>

      <div className="pc-bd-summary-row">
        <div className="pc-bd-summary-card">
          <div className="pc-bd-summary-label">Prestigio del club</div>
          <div className="pc-bd-summary-value" style={{ color: clubLevel.color }}>{Math.round(legacy.clubPrestige)}<span className="unit">/100</span></div>
          <div className="pc-bd-summary-sub" style={{ color: clubLevel.color }}>{clubLevel.label}</div>
        </div>
        <div className="pc-bd-summary-card" style={{ borderColor: `${confidenceColor}33` }}>
          <div className="pc-bd-summary-label">Confianza directiva</div>
          <div className="pc-bd-summary-value" style={{ color: confidenceColor }}>{Math.round(legacy.confidence)}<span className="unit">/100</span></div>
          <div className="pc-bd-summary-sub" style={{ color: jobRisk.color }}>{jobRisk.icon} Riesgo: {jobRisk.label}</div>
          <div className="pc-bd-summary-detail">{jobRisk.detail}</div>
        </div>
      </div>

      <div className="pc-bd-layout">
        <div>
          <div className="pc-bd-section-label">Objetivos de temporada</div>
          <div className="pc-bd-objectives">
            {legacy.objectives.map(objective => (
              <div key={objective.id} className="pc-bd-objective-card">
                <div className="pc-bd-objective-top">
                  <div className="pc-bd-objective-label">{OBJECTIVE_ICON[objective.type] ?? "🎯"} {objective.label}</div>
                  <div className="pc-bd-objective-pct" style={{ color: objective.progress >= 70 ? "#22c55e" : "#c9a84c" }}>{Math.round(objective.progress)}%</div>
                </div>
                <div className="pc-bd-progress-track"><div className="pc-bd-progress-fill" style={{ width: `${Math.max(0, Math.min(100, objective.progress))}%`, background: objective.progress >= 70 ? "#22c55e" : "#c9a84c" }} /></div>
                <div className="pc-bd-objective-reward">Recompensa: +{objective.reward.prestige} prestigio · €{objective.reward.budget / 1000}M</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pc-bd-report-panel">
          <div className="pc-bd-section-label">📋 Informe directiva</div>
          {lastReport ? (
            <>
              <div className="pc-bd-report-meta">Jornada {lastReport.matchday} · valoración mensual</div>
              <div className="pc-bd-report-verdict">{boardVerdict(lastReport)}</div>
              {REPORT_METRICS.map(([key, label]) => {
                const value = lastReport[key];
                const color = value >= 70 ? "#22c55e" : value >= 45 ? "#eab308" : "#ef4444";
                return (
                  <div key={key} className="pc-bd-report-metric">
                    <div className="pc-bd-report-metric-top"><span>{label}</span><strong style={{ color }}>{value}%</strong></div>
                    <div className="pc-bd-progress-track"><div className="pc-bd-progress-fill" style={{ width: `${value}%`, background: color }} /></div>
                  </div>
                );
              })}
            </>
          ) : <div className="pc-bd-empty">El primer informe llegará en la jornada 4.</div>}
        </div>
      </div>
    </div>
  );
}
