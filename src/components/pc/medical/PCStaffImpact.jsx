import { ensureStaffState, getStaffMember, staffModifier } from "../../../staff/staffEngine.js";

// Efecto real de cada rol — misma fórmula que calculateInjuryRisk (prevención,
// medicalEngine.js:73) y advanceMedicalRecovery (recuperación, :138), pero
// mostrada por persona en vez de ya combinada/recortada en 0, para que se vea
// honestamente si un fichaje concreto está por debajo de la media (contribución
// negativa) en vez de disimularlo dentro del máximo combinado del equipo.
const STAFF_EFFECTS = {
  medicalDirector: { icon: "🩺", title: "Médico", prevention: .1, recovery: .12 },
  fitnessCoach: { icon: "🏃", title: "Preparador físico", prevention: .08, recovery: .08 },
};

function StaffColumn({ roleId, game }) {
  const { icon, title, prevention, recovery } = STAFF_EFFECTS[roleId];
  const member = getStaffMember(game, roleId);
  if (!member) {
    return (
      <div className="pc-md-staff-col">
        <div className="pc-md-staff-col-title">{icon} {title} — sin cubrir</div>
        <div className="pc-md-staff-empty">No hay nadie en este puesto. Sin efecto sobre prevención ni recuperación.</div>
      </div>
    );
  }
  const preventionEffect = staffModifier(game, roleId, "prevention", prevention);
  const recoveryEffect = staffModifier(game, roleId, "recovery", recovery);
  const preventionPct = Math.round(preventionEffect * 100);
  const recoveryPct = Math.round(recoveryEffect * 100);
  // Reducción de riesgo: un valor de prevención positivo BAJA el riesgo (se
  // muestra en negativo); un miembro por debajo de la media lo sube (positivo).
  const riskLabel = preventionPct === 0 ? "0%" : preventionPct > 0 ? `-${preventionPct}%` : `+${Math.abs(preventionPct)}%`;
  const recoveryLabel = recoveryPct === 0 ? "0%" : recoveryPct > 0 ? `+${recoveryPct}%` : `${recoveryPct}%`;

  return (
    <div className="pc-md-staff-col">
      <div className="pc-md-staff-col-title">{icon} {title} — {member.name}</div>
      <div className="pc-md-staff-row"><span>Reducción de riesgo</span><span className={`val${preventionPct < 0 ? " bad" : ""}`}>{riskLabel}</span></div>
      <div className="pc-md-staff-row"><span>Velocidad de recuperación</span><span className={`val${recoveryPct < 0 ? " bad" : ""}`}>{recoveryLabel}</span></div>
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
