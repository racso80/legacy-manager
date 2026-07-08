import { ensureStaffState, getStaffMember, staffModifier } from "../../../staff/staffEngine.js";

// Mismas tres fórmulas que trainingEngine.js usa de verdad (fitness :110,
// loadManagement :111, recovery :112) — valores reales por atributo, no
// combinados/recortados, para que se vea honestamente si el preparador físico
// actual está por debajo de la media en algún canal concreto.
const EFFECTS = [
  { key: "fitness", scale: .1, label: "Desarrollo" },
  { key: "loadManagement", scale: .16, label: "Gestión de carga" },
  { key: "recovery", scale: .14, label: "Recuperación" },
];

export default function PCTrainingStaffImpact({ game, teams }) {
  const ensured = ensureStaffState(game, teams ?? []);
  const member = getStaffMember(ensured, "fitnessCoach");

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
      {EFFECTS.map(({ key, scale, label }) => {
        const effect = staffModifier(ensured, "fitnessCoach", key, scale);
        const pct = Math.round(effect * 100);
        const label2 = pct === 0 ? "0%" : pct > 0 ? `+${pct}%` : `${pct}%`;
        return (
          <div key={key} className="pc-tr-staff-row">
            <span>{label}</span>
            <span className={`val${pct < 0 ? " neg" : ""}`}>{label2}</span>
          </div>
        );
      })}
    </div>
  );
}
