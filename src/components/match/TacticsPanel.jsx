import { MATCH_FORMATIONS } from "../../match/matchFlow.js";

const TACTIC_FIELDS = [
  ["mentalidad", "Mentalidad", [["defensiva", "Defensiva"], ["equilibrada", "Equilibrada"], ["ofensiva", "Ofensiva"]]],
  ["presion", "Presión", [["baja", "Baja"], ["media", "Media"], ["alta", "Alta"]]],
  ["ritmo", "Ritmo", [["lento", "Lento"], ["normal", "Normal"], ["rapido", "Rápido"]]],
  ["estilo", "Estilo", [["directo", "Directo"], ["posesion", "Posesión"], ["bandas", "Bandas"], ["contraataque", "Contraataque"]]],
  ["riesgo", "Riesgo", [["conservador", "Conservador"], ["normal", "Normal"], ["agresivo", "Agresivo"]]],
];

// 6 tarjetas: Formación + los 5 campos tácticos existentes. onTacticChange recibe
// (campo, valor, etiquetaCampo, etiquetaValor) para que el llamador pueda componer un aviso.
export default function TacticsPanel({ tactics = {}, onTacticChange, formation, onFormationChange }) {
  const formationOptions = Object.keys(MATCH_FORMATIONS);
  return (
    <div className="pc-match-v2-panel">
      <div className="pc-match-v2-panel-head">
        <span className="pc-match-v2-panel-title">Opciones tácticas</span>
      </div>
      <div className="pc-match-v2-panel-body">
        <div className="pc-match-v2-tactics-grid">
          <div className="pc-match-v2-tactic-card">
            <div className="pc-match-v2-tactic-head">
              <span className="pc-match-v2-tactic-label">Formación</span>
              <span className="pc-match-v2-tactic-value">{formation}</span>
            </div>
            <div className="pc-match-v2-chip-row">
              {formationOptions.map(opt => (
                <button
                  key={opt}
                  className={`pc-match-v2-chip ${formation === opt ? "active" : ""}`}
                  onClick={() => onFormationChange(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          {TACTIC_FIELDS.map(([field, label, options]) => (
            <div className="pc-match-v2-tactic-card" key={field}>
              <div className="pc-match-v2-tactic-head">
                <span className="pc-match-v2-tactic-label">{label}</span>
                <span className="pc-match-v2-tactic-value">{options.find(([val]) => val === tactics[field])?.[1] ?? ""}</span>
              </div>
              <div className="pc-match-v2-chip-row">
                {options.map(([val, disp]) => (
                  <button
                    key={val}
                    className={`pc-match-v2-chip ${tactics[field] === val ? "active" : ""}`}
                    onClick={() => onTacticChange(field, val, label, disp)}
                  >
                    {disp}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
