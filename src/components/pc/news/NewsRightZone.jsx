import TeamCrest from "../../TeamCrest.jsx";
import { Initials } from "../../../App.jsx";
import { NEWS_TYPE_ICON } from "./newsPresentation.js";

// Zona visual de una noticia: avatar del jugador si la noticia lo menciona (con el
// escudo del club debajo), o el escudo del equipo en grande si es una noticia de club,
// o el icono del tipo como último recurso. Solo renderiza el contenido interno — el
// tamaño/layout del contenedor lo decide quien lo use (ver PCDashboardContent.jsx y
// PCFeaturedCard.jsx).
export default function NewsRightZone({ item, game, teams }) {
  const player = item.playerIds?.[0] ? (game.players ?? []).find(p => p.id === item.playerIds[0]) : null;
  const team = item.teamIds?.[0] ? teams.find(t => t.id === item.teamIds[0]) : (player ? teams.find(t => t.id === game.teamId) : null);
  if (player) {
    return (
      <>
        <Initials name={player.name} size={64} rarity={player.rarity} borderRadius={999} />
        <div className="pc-dash-v2-news-right-label">{player.name.split(" ").slice(-1)[0]}</div>
        {team && <TeamCrest team={team} size={26} />}
      </>
    );
  }
  if (team) {
    return (
      <>
        <TeamCrest team={team} size={52} />
        <div className="pc-dash-v2-news-right-label">{team.name}</div>
      </>
    );
  }
  return <span style={{ fontSize: 36 }}>{NEWS_TYPE_ICON[item.type] ?? "📌"}</span>;
}
