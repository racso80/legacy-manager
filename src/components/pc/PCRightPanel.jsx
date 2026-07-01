import { getDashboardNews } from "../../news/newsEngine.js";
import { STAFF_PERSONAS, PersonAvatar } from "../../App.jsx";

export default function PCRightPanel({ game, directorItems = [], onOpenScene, setScreen, chiefBriefing, medicalAlerts = [], consequences = [] }) {
  const items = directorItems.filter(item => item.priority !== "info").slice(0, 6);
  const recentNews = game ? getDashboardNews(game.news ?? [], game, 3) : [];
  const chiefOfStaff = { ...STAFF_PERSONAS["Jefe de gabinete"], name: "Jefe de gabinete", emotionalState: "neutral" };
  const visibleMedicalAlerts = medicalAlerts.slice(0, 3);

  return (
    <aside className="pc-right-panel">
      {chiefBriefing && (
        <div className="pc-right-panel-section">
          <div className="pc-right-panel-title">BRIEFING DEL DÍA</div>
          <div className="pc-briefing-card">
            <PersonAvatar person={chiefOfStaff} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pc-briefing-title">Jefe de gabinete</div>
              <div className="pc-briefing-text">"{chiefBriefing}"</div>
            </div>
          </div>
        </div>
      )}

      {visibleMedicalAlerts.length > 0 && (
        <div className="pc-right-panel-section">
          <div className="pc-right-panel-title">INFORME MÉDICO</div>
          <button className="pc-medical-alerts" onClick={() => setScreen("medical")}>
            {visibleMedicalAlerts.map(({ player, risk, status }, index) => (
              <div key={player.id} className="pc-medical-alert-row" style={{ borderTop: index ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                <span>{status.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pc-medical-alert-name">{player.name}</div>
                  <div className="pc-medical-alert-detail" style={{ color: status.color }}>{player.injured ? status.label : `Riesgo de lesión ${risk}% · se recomienda descanso`}</div>
                </div>
              </div>
            ))}
          </button>
        </div>
      )}

      {consequences.length > 0 && (
        <div className="pc-right-panel-section">
          <div className="pc-right-panel-title">ÚLTIMAS CONSECUENCIAS</div>
          {consequences.map((item, index) => (
            <div key={index} className="pc-consequence-row">
              <span>{item.icon}</span>
              <span className="pc-consequence-text">{item.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="pc-right-panel-section">
        <div className="pc-right-panel-title">REQUIERE TU ATENCIÓN</div>
        {!items.length && <div className="pc-right-panel-empty">No hay asuntos urgentes ahora mismo.</div>}
        {items.map(item => (
          <button key={item.id} className="pc-attention-item" onClick={() => onOpenScene?.(item)}>
            <span className="pc-attention-item-priority" data-priority={item.priority} />
            <span className="pc-attention-item-text">
              <span className="pc-attention-item-title">{item.issueCard?.title ?? item.title ?? "Asunto pendiente"}</span>
              <span className="pc-attention-item-summary">{item.issueCard?.summary ?? item.summary ?? ""}</span>
            </span>
          </button>
        ))}
        <button className="pc-right-panel-link" onClick={() => setScreen("attention")}>Ver todo en el Centro de Atención →</button>
      </div>

      <div className="pc-right-panel-section">
        <div className="pc-right-panel-title">NOTICIAS RECIENTES</div>
        {!recentNews.length && <div className="pc-right-panel-empty">Sin noticias recientes.</div>}
        {recentNews.map((item, index) => (
          <div key={item.id ?? index} className="pc-news-item">
            <span className="pc-news-item-title">{item.title}</span>
            {item.summary && <span className="pc-news-item-summary">{item.summary}</span>}
          </div>
        ))}
        <button className="pc-right-panel-link" onClick={() => setScreen("news")}>Ver todas las noticias →</button>
      </div>
    </aside>
  );
}
