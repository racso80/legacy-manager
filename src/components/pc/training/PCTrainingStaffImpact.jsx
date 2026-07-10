import { ensureStaffState } from "../../../staff/staffEngine.js";
import { getStaffCardEffects } from "../staff/staffEffectSummary.js";

// Solo el subconjunto "training" — fitnessCoach también tiene efectos reales sobre
// prevención/recuperación médica (ver PCStaffImpact.jsx), pero no son relevantes aquí.
const TRAINING_LABELS = { fitness: "Desarrollo", loadManagement: "Gestión de carga", recovery: "Recuperación" };

export default function PCTrainingStaffImpact({ game, teams }) {
  const ensured = ensureStaffState(game, teams ?? []);
  const { member, effects } = getStaffCardEffects(ensured, "fitnessCoach");
  const trainingEffects = effects.filter(effect => effect.context === "training");

  if (!member) {
    return (
      <div className="pc-tr-side-panel">
        <div className="pc-tr-staff-name">Preparador físico — sin cubrir</div>
        <div className="pc-tr-staff-empty">No hay nadie en este puesto. Sin efecto sobre desarrollo, carga ni recuperación.</div>
      </div>
    );
  }

  return (
    <div className="pc-tr-side-panel">
      <div className="pc-tr-staff-name">{member.name}</div>
      {trainingEffects.map(effect => (
        <div key={effect.key} className="pc-tr-staff-row">
          <span>{TRAINING_LABELS[effect.key] ?? effect.key}</span>
          <span className={`val${effect.negative ? " neg" : ""}`}>{effect.formatted}</span>
        </div>
      ))}
    </div>
  );
}
