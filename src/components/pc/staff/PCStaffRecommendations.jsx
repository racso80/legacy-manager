import { buildStaffRecommendations } from "../../../staff/staffEngine.js";

// Mismos campos y misma lógica de enrutado que StaffScreen.jsx (móvil):
// action.screen viene ya resuelto por buildStaffRecommendations, este
// componente no decide a dónde navegar, solo lo aplica.
export default function PCStaffRecommendations({ game, onNavigate }) {
  const recs = buildStaffRecommendations(game).slice(0, 4);

  return (
    <section className="pc-sf-recs">
      <div className="pc-sf-recs-title">Recomendaciones recientes</div>
      {recs.length ? (
        <div className="pc-sf-recs-list">
          {recs.map(item => (
            <button key={item.id} className="pc-sf-rec-card" onClick={() => onNavigate?.(item.action?.screen ?? "dashboard")}>
              <span className="pc-sf-rec-icon">{item.icon}</span>
              <span className="pc-sf-rec-body">
                <span className="pc-sf-rec-heading">{item.title}</span>
                <span className="pc-sf-rec-quote">"{item.quote}"</span>
                <span className="pc-sf-rec-profile">Perfil: {item.staffPersonality ?? "Staff"}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="pc-sf-recs-empty">El staff no tiene recomendaciones urgentes ahora mismo.</div>
      )}
    </section>
  );
}
