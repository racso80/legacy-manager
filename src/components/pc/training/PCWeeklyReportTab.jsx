import { TRAINING_LOADS } from "../../../training/trainingEngine.js";

// Mismo umbral que declineXP en applyWeeklyTraining (trainingEngine.js:~200) —
// a partir de 33 años empieza a acumularse presión de declive, así que "sin
// cambios" a esa edad no es lo mismo que "sin cambios" en un jugador joven con
// margen de progreso; se distingue en vez de mostrar el mismo chip neutro.
const DECLINE_AGE = 33;

function reportChipsFor(player, item) {
  const actual = item?.changes ?? [];
  if (actual.length) return actual.map(change => ({ type: "gain", label: `${change.label} ${change.delta > 0 ? "+" : ""}${change.delta}` }));
  if (player.age >= DECLINE_AGE) return [{ type: "decline", label: `Sin cambios · edad ${player.age}` }];
  const progress = item?.progress?.[0];
  if (progress) return [{ type: "neutral", label: `${progress.label}: ${progress.value}% hacia +1` }];
  return [{ type: "neutral", label: "Sin progreso significativo" }];
}

export default function PCWeeklyReportTab({ game, onOpenPlayer }) {
  const report = game.lastTrainingReport;

  if (!report) {
    return <div className="pc-tr-empty">El primer informe llegará después de jugar una jornada.</div>;
  }

  const changesByPlayer = Object.fromEntries((report.changes ?? []).map(item => [item.playerId, item]));
  const sorted = [...game.players].sort((a, b) => {
    const ac = changesByPlayer[a.id]?.changes?.length ?? 0;
    const bc = changesByPlayer[b.id]?.changes?.length ?? 0;
    return bc - ac || ((b.potential ?? b.overall) - b.overall) - ((a.potential ?? a.overall) - a.overall);
  });

  return (
    <div>
      <div className="pc-tr-section-label">
        Cambios de esta semana · Jornada {report.matchday} · Carga {TRAINING_LOADS[report.load]?.name ?? report.load} · Preset {report.weeklyFocusName}
      </div>
      <div className="pc-tr-report-list">
        {sorted.map(player => {
          const item = changesByPlayer[player.id];
          const isProspect = player.age <= 23 && (player.potential ?? player.overall) - player.overall >= 3;
          return (
            <div key={player.id} className="pc-tr-report-row" onClick={() => onOpenPlayer(player, game.teamId)}>
              <div className="pc-tr-report-name-block">
                <div className="pc-tr-report-name">{player.name}</div>
                {isProspect && <div className="pc-tr-prospect-badge">🌱 Promesa</div>}
              </div>
              <div className="pc-tr-report-deltas">
                {reportChipsFor(player, item).map((chip, index) => (
                  <span key={index} className={`pc-tr-delta-chip ${chip.type}`}>{chip.label}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
