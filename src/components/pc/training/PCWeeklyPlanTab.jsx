import { WEEKLY_TRAINING_FOCUSES, TRAINING_LOADS, TRAINING_DAYS, TRAINING_TYPES, applyTrainingFocusPreset, previewWeeklyTrainingEffect } from "../../../training/trainingEngine.js";
import PCTrainingStaffImpact from "./PCTrainingStaffImpact.jsx";

const PRESET_LIST = Object.values(WEEKLY_TRAINING_FOCUSES).filter(focus => focus.id !== "custom");

function TradeoffBar({ label, valueLabel, widthPct, tone }) {
  return (
    <div className="pc-tr-tradeoff-row">
      <span className="pc-tr-tradeoff-label">{label}</span>
      <div className="pc-tr-tradeoff-bar"><div className={`pc-tr-tradeoff-fill ${tone}`} style={{ width: `${Math.max(0, Math.min(100, widthPct))}%` }} /></div>
      <span className="pc-tr-tradeoff-value">{valueLabel}</span>
    </div>
  );
}

export default function PCWeeklyPlanTab({ game, teams, plan, onPlanChange }) {
  const setDay = (index, type) => { const days = [...plan.days]; days[index] = type; onPlanChange({ ...plan, days }); };
  const setWeeklyFocus = focusId => onPlanChange(applyTrainingFocusPreset(plan, focusId));
  const setLoad = loadId => onPlanChange({ ...plan, load: loadId });

  const preview = previewWeeklyTrainingEffect(game.players, game, plan);

  return (
    <div className="pc-tr-layout">
      <div>
        <div className="pc-tr-section-label">Enfoque semanal</div>
        <div className="pc-tr-preset-grid">
          {PRESET_LIST.map(focus => (
            <div key={focus.id} className={`pc-tr-preset-pill${plan.weeklyFocus === focus.id ? " active" : ""}`} onClick={() => setWeeklyFocus(focus.id)}>
              {focus.icon} {focus.name}
            </div>
          ))}
        </div>

        <div className="pc-tr-section-label">Carga</div>
        <div className="pc-tr-load-row">
          {Object.values(TRAINING_LOADS).map(load => (
            <div key={load.id} className={`pc-tr-load-pill${plan.load === load.id ? " active" : ""}`} onClick={() => setLoad(load.id)}>
              <span className="dot">{load.icon}</span>{load.name}
            </div>
          ))}
        </div>

        <div className="pc-tr-section-label">Sesiones de la semana</div>
        <div className="pc-tr-week-grid">
          {TRAINING_DAYS.map((day, index) => {
            const session = TRAINING_TYPES[plan.days[index]];
            return (
              <div key={day} className="pc-tr-day-col">
                <div className="pc-tr-day-name">{day.slice(0, 3)}</div>
                <div className="pc-tr-day-type">{session.icon}</div>
                <select className="pc-tr-day-select" value={session.id} onChange={event => setDay(index, event.target.value)}>
                  {Object.values(TRAINING_TYPES).map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </div>
            );
          })}
        </div>

        <div className="pc-tr-section-label">Efecto estimado esta semana</div>
        <div className="pc-tr-tradeoff-box">
          <TradeoffBar label="Velocidad desarrollo" valueLabel={`${preview.developmentMultiplier.toFixed(2)}×`} widthPct={(preview.developmentMultiplier / 2.5) * 100} tone="dev" />
          <TradeoffBar label="Fatiga acumulada" valueLabel={`${preview.loadDelta >= 0 ? "+" : ""}${preview.loadDelta}`} widthPct={(Math.abs(preview.loadDelta) / 15) * 100} tone="fatigue" />
          <TradeoffBar label="Riesgo de lesión" valueLabel={`+${preview.riskDelta}`} widthPct={(preview.riskDelta / 25) * 100} tone="risk" />
        </div>
      </div>

      <div>
        <div className="pc-tr-section-label">Preparador físico</div>
        <PCTrainingStaffImpact game={game} teams={teams} />
      </div>
    </div>
  );
}
