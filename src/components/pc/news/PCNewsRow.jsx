import { NEWS_IMPORTANCE } from "../../../news/newsEngine.js";
import { getLeagueById } from "../../../data/leagues.js";
import { NEWS_TYPE_ICON, NEWS_TYPE_LABEL, isLeagueLinkedNews, resolveNewsLeagueId } from "./newsPresentation.js";

// Noticias ligadas a una competición muestran el nivel de liga ("1ª"/"2ª"); las
// internas al club (cantera, directiva, finanzas) muestran su categoría — igual
// que ya distingue el carrusel del dashboard vía NEWS_TYPE_LABEL.
function tagFor(item, game, teams) {
  if (isLeagueLinkedNews(item)) {
    const league = getLeagueById(resolveNewsLeagueId(item, game, teams));
    return league ? `${league.tier}ª` : "Liga";
  }
  return NEWS_TYPE_LABEL[item.type] ?? "Club";
}

export default function PCNewsRow({ item, game, teams, onOpenPlayer }) {
  const importance = NEWS_IMPORTANCE[item.importance] ?? NEWS_IMPORTANCE.low;
  const clickable = Boolean(item.playerIds?.[0]);

  return (
    <div className="pc-ns-row" onClick={() => clickable && onOpenPlayer?.(item.playerIds[0])} style={{ cursor: clickable ? "pointer" : "default" }}>
      <div className="pc-ns-row-icon">{NEWS_TYPE_ICON[item.type] ?? "📰"}</div>
      <div className="pc-ns-row-body">
        <div className="pc-ns-row-title">{item.title}</div>
        {item.summary && <div className="pc-ns-row-summary">{item.summary}</div>}
      </div>
      <div className="pc-ns-row-meta">
        <span className="pc-ns-league-tag">{tagFor(item, game, teams)}</span>
        <span className="pc-ns-importance-dot" style={{ background: importance.color }} title={importance.label} />
        {item.matchday ? <span className="pc-ns-matchday">J{item.matchday}</span> : null}
      </div>
    </div>
  );
}
