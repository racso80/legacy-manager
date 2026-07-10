import { getFanMood, getStadiumMood } from "../../fans/fanEngine.js";
import PCFanAtmosphereEconomy from "./fans/PCFanAtmosphereEconomy.jsx";
import PCFanEvolutionChart from "./fans/PCFanEvolutionChart.jsx";
import PCFanReactionsList from "./fans/PCFanReactionsList.jsx";

const formatCompact = value => {
  if (!value) return "—";
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : `${value}`;
};

export default function PCFanbaseScreen({ game, team }) {
  const fanbase = game.fanbase ?? {};
  // Mismo campo que el móvil: el header (estrellas/etiqueta) lo dirige
  // `support`, no `atmosphere` — son dos números distintos en fanEngine.js.
  const mood = getFanMood(fanbase.support ?? game.fanLove ?? 65);
  const stadium = getStadiumMood(fanbase.atmosphere ?? fanbase.support ?? 65);
  const coachSupport = fanbase.coachSupport ?? 65;
  const coachColor = coachSupport >= 65 ? "#22c55e" : coachSupport >= 42 ? "#c9a84c" : "#ef4444";
  const avgAttendancePct = team?.capacity ? Math.round(((fanbase.averageAttendance ?? 0) / team.capacity) * 100) : 0;

  return (
    <div className="pc-fb-root">
      <div className="pc-fb-social-header">
        <div className="pc-fb-sh-label">🔥 Masa Social</div>
        <div className="pc-fb-sh-title"><span className="pc-fb-stars">{"★".repeat(mood.stars)}</span>Afición {mood.label}</div>
        <div className="pc-fb-sh-sub">{team?.stadium ?? "El estadio"} · Una afición de {(fanbase.identity?.label ?? "Fidelidad y resultados").toLowerCase()}</div>
        <div className="pc-fb-sh-bar"><div className="pc-fb-sh-bar-fill" style={{ width: `${Math.max(0, Math.min(100, fanbase.support ?? 65))}%` }} /></div>
      </div>

      <div className="pc-fb-stats-row">
        <div className="pc-fb-stat-card"><div className="pc-fb-stat-value" style={{ color: mood.color }}>{fanbase.support ?? 65}</div><div className="pc-fb-stat-label">Apoyo</div></div>
        <div className="pc-fb-stat-card"><div className="pc-fb-stat-value" style={{ color: coachColor }}>{coachSupport}</div><div className="pc-fb-stat-label">Míster</div></div>
        <div className="pc-fb-stat-card"><div className="pc-fb-stat-value" style={{ color: stadium.color }}>{fanbase.atmosphere ?? 65}</div><div className="pc-fb-stat-label">Ambiente</div></div>
      </div>

      <div className="pc-fb-mini-stats-row">
        <div className="pc-fb-mini-stat"><div className="pc-fb-mini-value">{formatCompact(fanbase.averageAttendance)}</div><div className="pc-fb-mini-label">Asist. media</div></div>
        <div className="pc-fb-mini-stat"><div className="pc-fb-mini-value">{avgAttendancePct ? `${avgAttendancePct}%` : "—"}</div><div className="pc-fb-mini-label">Aforo medio</div></div>
        <div className="pc-fb-mini-stat"><div className="pc-fb-mini-value">{formatCompact(fanbase.recordAttendance)}</div><div className="pc-fb-mini-label">Récord</div></div>
      </div>

      <div className="pc-fb-layout">
        <PCFanAtmosphereEconomy fanbase={fanbase} stadium={stadium} />
        <PCFanEvolutionChart trend={fanbase.trend ?? []} />
      </div>

      <div className="pc-fb-section-label" style={{ marginTop: 6 }}>Últimas reacciones</div>
      <PCFanReactionsList reactions={fanbase.reactions ?? []} />
    </div>
  );
}
