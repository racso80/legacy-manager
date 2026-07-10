import { useMemo, useState } from "react";
import { getFilteredNews, NEWS_FILTERS } from "../../news/newsEngine.js";
import { LEAGUES } from "../../data/leagues.js";
import { resolveNewsLeagueId } from "./news/newsPresentation.js";
import PCFeaturedCard from "./news/PCFeaturedCard.jsx";
import PCNewsRow from "./news/PCNewsRow.jsx";

const PAGE_SIZE = 30;
const MAX_FEATURED = 3;
const FEATURED_IMPORTANCE = new Set(["critical", "high"]);

export default function PCNewsScreen({ game, teams, onOpenPlayer }) {
  const news = game.news ?? [];
  // 3 puntos de origen (tensión de vestuario, oferta entrante, traspaso IA) construyen su
  // noticia a mano sin pasar por createNews() y no fijan clubRelated, aunque sí marcan
  // metadata.userClub — se rellena aquí (solo para filtrar, sin tocar game.news) para que
  // no desaparezcan silenciosamente del filtro "Club".
  const normalized = useMemo(
    () => news.map(item => (item.clubRelated === undefined && item.metadata?.userClub === true ? { ...item, clubRelated: true } : item)),
    [news]
  );

  const [category, setCategory] = useState("club");
  const [leagueFilter, setLeagueFilter] = useState("all");
  const [season, setSeason] = useState(String(game.season));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const seasons = useMemo(() => [...new Set(news.map(item => String(item.season)))].sort((a, b) => Number(b) - Number(a)), [news]);
  const leagueIds = useMemo(() => [...new Set(news.map(item => resolveNewsLeagueId(item, game, teams)))], [news, game, teams]);

  const categoryFiltered = useMemo(() => getFilteredNews(normalized, category, season, { game }), [normalized, category, season, game]);
  const filtered = leagueFilter === "all"
    ? categoryFiltered
    : categoryFiltered.filter(item => resolveNewsLeagueId(item, game, teams) === leagueFilter);

  const featuredItems = filtered.filter(item => FEATURED_IMPORTANCE.has(item.importance)).slice(0, MAX_FEATURED);
  const featuredIds = new Set(featuredItems.map(item => item.id));
  const mainFeed = filtered.filter(item => !featuredIds.has(item.id));
  const visibleFeed = mainFeed.slice(0, visibleCount);
  const hasMore = mainFeed.length > visibleCount;

  const handleCategoryChange = id => { setCategory(id); setVisibleCount(PAGE_SIZE); };
  const handleLeagueChange = id => { setLeagueFilter(id); setVisibleCount(PAGE_SIZE); };
  const handleSeasonChange = value => { setSeason(value); setVisibleCount(PAGE_SIZE); };

  return (
    <div className="pc-ns-root">
      <div className="pc-ns-header">
        <h1>Noticias</h1>
        <select value={season} onChange={event => handleSeasonChange(event.target.value)}>
          <option value="all">Todas las temporadas</option>
          {seasons.map(value => (
            <option key={value} value={value}>
              Temporada {value}/{String(Number(value) + 1).slice(-2)}{value === String(game.season) ? " · actual" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="pc-ns-filter-row">
        {NEWS_FILTERS.map(item => (
          <div key={item.id} className={`pc-ns-pill${category === item.id ? " active" : ""}`} onClick={() => handleCategoryChange(item.id)}>{item.label}</div>
        ))}
      </div>

      {leagueIds.length > 0 && (
        <div className="pc-ns-filter-row pc-ns-league-row">
          <div className={`pc-ns-pill${leagueFilter === "all" ? " active" : ""}`} onClick={() => handleLeagueChange("all")}>Todas las ligas</div>
          {leagueIds.map(id => (
            <div key={id} className={`pc-ns-pill${leagueFilter === id ? " active" : ""}`} onClick={() => handleLeagueChange(id)}>
              {LEAGUES.find(league => league.id === id)?.shortName ?? id}
            </div>
          ))}
        </div>
      )}

      {featuredItems.length > 0 && (
        <>
          <div className="pc-ns-section-label">Destacadas</div>
          <div className="pc-ns-featured-row">
            {featuredItems.map(item => (
              <PCFeaturedCard key={item.id} item={item} game={game} teams={teams} onOpenPlayer={onOpenPlayer} />
            ))}
          </div>
        </>
      )}

      <div className="pc-ns-section-label">Todas las noticias</div>
      {visibleFeed.length > 0 ? (
        <>
          <div className="pc-ns-list">
            {visibleFeed.map(item => (
              <PCNewsRow key={item.id} item={item} game={game} teams={teams} onOpenPlayer={onOpenPlayer} />
            ))}
          </div>
          {hasMore && (
            <div className="pc-ns-load-more">
              <button className="btn-ghost" onClick={() => setVisibleCount(count => count + PAGE_SIZE)}>Cargar más noticias</button>
            </div>
          )}
        </>
      ) : (
        <div className="pc-ns-empty">Todavía no hay noticias en esta sección.</div>
      )}
    </div>
  );
}
