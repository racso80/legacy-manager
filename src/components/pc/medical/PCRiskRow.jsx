import { getInjuryRiskBreakdown, getRiskLevel } from "../../../medical/medicalEngine.js";

// Traduce cada clave de factor (medicalEngine.js:getInjuryRiskBreakdown) a una
// etiqueta corta en español. tacticalRisk/inMatchRisk casi nunca aparecen aquí
// en la práctica (solo son != 0 durante un partido en vivo, y esta pantalla no
// pasa tactics/currentMatchMinutes), pero se traducen igual por si acaso.
const FACTOR_LABELS = {
  fatigueRisk: () => "Fatiga alta",
  accumulatedRisk: () => "Carga acumulada",
  ageRisk: meta => `Edad (${meta.age})`,
  streakRisk: meta => `${meta.consecutiveStarts} titularidad${meta.consecutiveStarts === 1 ? "" : "es"} seguida${meta.consecutiveStarts === 1 ? "" : "s"}`,
  minutesRisk: () => "Minutos temporada",
  inMatchRisk: () => "Minutos en el partido",
  historyRisk: meta => `Historial: ${meta.seriousInjuryCount} lesión${meta.seriousInjuryCount === 1 ? "" : "es"} grave${meta.seriousInjuryCount === 1 ? "" : "s"}`,
  limitationRisk: () => "Apto con limitaciones",
  trainingRisk: () => "Carga de entrenamiento",
  tacticalRisk: () => "Exigencia táctica",
};

// Muestra hasta 3 factores no despreciables, de mayor a menor. "hot" marca el
// factor dominante y cualquier otro que esté a menos del 40% de distancia de
// él (así casos con dos causas comparablemente grandes, no solo una, se ven
// ambas resaltadas — un único umbral fijo no lo capturaba bien).
function topFactors(factors, meta) {
  const entries = Object.entries(factors).filter(([, value]) => value > .5).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return [];
  const topValue = entries[0][1];
  return entries.slice(0, 3).map(([key, value]) => ({
    key,
    label: (FACTOR_LABELS[key] ?? (() => key))(meta),
    hot: value >= topValue * .6,
  }));
}

export default function PCRiskRow({ item, game, onOpenPlayer }) {
  const { player } = item;
  const breakdown = getInjuryRiskBreakdown(player, { fixtures: game.fixtures ?? [], teamId: game.teamId, game });
  const level = getRiskLevel(breakdown.total);
  const chips = topFactors(breakdown.factors, breakdown.meta);

  return (
    <div className="pc-md-risk-row" onClick={() => onOpenPlayer(player, game.teamId)}>
      <div className="pc-md-risk-name-block">
        <div className="pc-md-risk-name">{player.name}</div>
        <div className="pc-md-risk-role">{player.pos} · {player.age} años</div>
      </div>
      <div className="pc-md-risk-score-block">
        <div className="pc-md-risk-score" style={{ color: level.color }}>{breakdown.total}</div>
        <div className="pc-md-risk-level-label">{level.label}</div>
      </div>
      <div className="pc-md-risk-factors">
        {chips.map(chip => <span key={chip.key} className={`pc-md-factor-chip${chip.hot ? " hot" : ""}`}>{chip.label}</span>)}
      </div>
    </div>
  );
}
