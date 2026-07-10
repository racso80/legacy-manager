import { ensureStaffState, STAFF_ROLES } from "../../staff/staffEngine.js";
import PCStaffCard from "./staff/PCStaffCard.jsx";

const ROLE_ORDER = Object.keys(STAFF_ROLES);

export default function PCStaffScreen({ game, teams }) {
  const ensured = ensureStaffState(game, teams ?? []);

  return (
    <div className="pc-sf-root">
      <div className="pc-sf-header">
        <div>
          <h1>Staff Técnico</h1>
          <div className="pc-sf-sub">Responsables e informes</div>
        </div>
      </div>

      <div className="pc-sf-legend">
        <span><span className="pc-sf-dot-real" /> Atributo con efecto real en el juego</span>
        <span><span className="pc-sf-dot-inert" /> Atributo decorativo (sin efecto aún)</span>
      </div>

      <div className="pc-sf-grid">
        {ROLE_ORDER.map(roleId => (
          <PCStaffCard key={roleId} roleId={roleId} game={ensured} />
        ))}
      </div>
    </div>
  );
}
