import { ensureStaffState } from "../../../staff/staffEngine.js";
import { getStaffCardEffects } from "../staff/staffEffectSummary.js";

const ROLE_META = {
  medicalDirector: { icon: "🩺", title: "Médico" },
  fitnessCoach: { icon: "🏃", title: "Preparador físico" },
};

// Solo el subconjunto "medical" de cada rol — fitnessCoach también tiene efectos reales
// de entrenamiento (ver PCTrainingStaffImpact.jsx), pero no son relevantes aquí.
const MEDICAL_LABELS = { prevention: "Reducción de riesgo", recovery: "Velocidad de recuperación" };

function StaffColumn({ roleId, game }) {
  const { icon, title } = ROLE_META[roleId];
  const { member, effects } = getStaffCardEffects(game, roleId);
  const medicalEffects = effects.filter(effect => effect.context === "medical");
  if (!member) {
    return (
      <div className="pc-md-staff-col">
        <div className="pc-md-staff-col-title">{icon} {title} — sin cubrir</div>
        <div className="pc-md-staff-empty">No hay nadie en este puesto. Sin efecto sobre prevención ni recuperación.</div>
      </div>
    );
  }
  return (
    <div className="pc-md-staff-col">
      <div className="pc-md-staff-col-title">{icon} {title} — {member.name}</div>
      {medicalEffects.map(effect => (
        <div key={effect.key} className="pc-md-staff-row"><span>{MEDICAL_LABELS[effect.key] ?? effect.key}</span><span className={`val${effect.negative ? " bad" : ""}`}>{effect.formatted}</span></div>
      ))}
    </div>
  );
}

export default function PCStaffImpact({ game, teams }) {
  // ensureStaffState siempre rellena cada rol con un fichaje generado si el
  // usuario no ha contratado a nadie (staffEngine.js:169-190) — en la práctica
  // un rol nunca queda "vacío" una vez la partida es jugable, pero StaffColumn
  // conserva igualmente la rama defensiva por si getStaffMember cambiara.
  const ensured = ensureStaffState(game, teams ?? []);
  return (
    <div className="pc-md-staff-impact">
      <StaffColumn roleId="medicalDirector" game={ensured} />
      <StaffColumn roleId="fitnessCoach" game={ensured} />
    </div>
  );
}
