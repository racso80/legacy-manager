import { getDashboardNews } from "../../news/newsEngine.js";

export default function PCRightPanel({ game, directorItems = [], onOpenScene, setScreen }) {
  const items = directorItems.filter(item => item.priority !== "info").slice(0, 6);
  const recentNews = game ? getDashboardNews(game.news ?? [], game, 3) : [];

  return (
    <aside className="pc-right-panel">
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
