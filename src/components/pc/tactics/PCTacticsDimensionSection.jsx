import { TACTICS_FIELD_DESCRIPTIONS } from "../../../tactics/tacticsEngine.js";

export default function PCTacticsDimensionSection({ title, field, options, tactics, setTactics }) {
  const description = TACTICS_FIELD_DESCRIPTIONS[field]?.[tactics[field]];
  return (
    <div className="pc-tt-dim-section">
      <div className="pc-tt-dim-title">{title}</div>
      <div className="pc-tt-dim-pills">
        {options.map(([value, label]) => (
          <button
            key={value}
            className={`pc-tt-dim-pill${tactics[field] === value ? " active" : ""}`}
            onClick={() => setTactics(current => ({ ...current, [field]: value }))}
          >
            {label}
          </button>
        ))}
      </div>
      {description && <div className="pc-tt-dim-desc">{description}</div>}
    </div>
  );
}
