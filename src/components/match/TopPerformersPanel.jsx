import { computePlayerRating, ratingClass, initialsOf } from "./matchUiUtils.js";

// Ranking combinado (mi equipo + rival) por rating en vivo. El color distingue "mío" (home,
// dorado) de "rival" (away, rojo) — no representa local/visitante del fixture.
export default function TopPerformersPanel({
  userPlayers = [], oppPlayers = [], userLineup = [], oppLineup = [],
  sentOffIds = [], oppSentOffIds = [], events = [], currentMinute = 0, userTeam, oppTeam,
}) {
  const build = (lineup, players, side, teamSentOff) => lineup.filter(Boolean).map(pid => {
    const player = players.find(p => p.id === pid);
    if (!player) return null;
    const rating = computePlayerRating(pid, { events, sentOffIds: teamSentOff, currentMinute });
    return rating == null ? null : { player, side, rating };
  }).filter(Boolean);

  const top3 = [
    ...build(userLineup, userPlayers, "user", sentOffIds),
    ...build(oppLineup, oppPlayers, "opp", oppSentOffIds),
  ].sort((a, b) => b.rating - a.rating).slice(0, 3);

  return (
    <div className="pc-match-v2-panel">
      <div className="pc-match-v2-panel-head">
        <span className="pc-match-v2-panel-title">Mejores del partido</span>
      </div>
      <div className="pc-match-v2-panel-body">
        <div className="pc-match-v2-top3-list">
          {top3.length === 0 ? (
            <div className="pc-match-v2-empty">Aún no hay datos suficientes.</div>
          ) : (
            top3.map(({ player, side, rating }, i) => {
              const colorClass = side === "user" ? "home" : "away";
              return (
                <div key={player.id} className="pc-match-v2-top3-card">
                  <span className="pc-match-v2-top3-rank">{i + 1}</span>
                  <div className={`pc-match-v2-top3-photo ${colorClass}`}>{initialsOf(player.name)}</div>
                  <div className="pc-match-v2-top3-info">
                    <div className="pc-match-v2-top3-name">{player.name}</div>
                    <div className="pc-match-v2-top3-meta">
                      <span className={`pc-match-v2-side-dot ${colorClass}`} />
                      {(side === "user" ? userTeam : oppTeam)?.short ?? ""} · {player.pos}
                    </div>
                  </div>
                  <div className={`pc-match-v2-top3-rating ${ratingClass(rating)}`}>{rating.toFixed(1)}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
