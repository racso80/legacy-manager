import { NEWS_IMPORTANCE } from "../../../news/newsEngine.js";
import { NEWS_TYPE_LABEL } from "./newsPresentation.js";
import NewsRightZone from "./NewsRightZone.jsx";

const IMPORTANCE_TAG = {
  critical: "🔴 Crítico",
  high: "🟠 Importante",
};

export default function PCFeaturedCard({ item, game, teams, onOpenPlayer }) {
  const importance = NEWS_IMPORTANCE[item.importance] ?? NEWS_IMPORTANCE.high;
  const categoryLabel = NEWS_TYPE_LABEL[item.type] ?? "Club";

  return (
    <div
      className="pc-ns-featured-card"
      style={{ borderLeftColor: importance.color }}
      onClick={() => item.playerIds?.[0] && onOpenPlayer?.(item.playerIds[0])}
    >
      <div className="pc-ns-featured-body">
        <div className="pc-ns-featured-tag" style={{ color: importance.color }}>{IMPORTANCE_TAG[item.importance] ?? importance.label}</div>
        <div className="pc-ns-featured-title">{item.title}</div>
        {item.summary && <div className="pc-ns-featured-summary">{item.summary}</div>}
        <div className="pc-ns-featured-meta">{item.matchday ? `Jornada ${item.matchday} · ` : ""}{categoryLabel}</div>
      </div>
      <div className="pc-ns-featured-visual">
        <NewsRightZone item={item} game={game} teams={teams} />
      </div>
    </div>
  );
}
