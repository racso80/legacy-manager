import PCNewsRow from "../news/PCNewsRow.jsx";

export default function PCProfileNewsTab({ relatedNews, game, teams, onOpenPlayer }) {
  if (!relatedNews.length) return <div className="pc-pp-empty">Todavía no hay noticias relacionadas con este jugador.</div>;
  return (
    <div className="pc-pp-news-list">
      {relatedNews.map(item => <PCNewsRow key={item.id} item={item} game={game} teams={teams} onOpenPlayer={onOpenPlayer} />)}
    </div>
  );
}
