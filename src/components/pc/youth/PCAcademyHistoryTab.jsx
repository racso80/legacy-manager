const fmt = value => value >= 1000 ? `€${(value / 1000).toFixed(1)}M` : `€${Math.round(value ?? 0)}K`;

export default function PCAcademyHistoryTab({ graduates, onOpenPlayer }) {
  if (!graduates.length) {
    return <div className="pc-yt-empty">Promociona juveniles para empezar a construir la historia de tu cantera.</div>;
  }

  return (
    <div className="pc-yt-history-table">
      <div className="pc-yt-history-row pc-yt-history-head">
        <div>Jugador</div>
        <div>Estado actual</div>
        <div>Promovido</div>
        <div>Part.</div>
        <div>Goles</div>
        <div>Temp.</div>
        <div>Títulos</div>
      </div>
      {graduates.map(player => {
        const stats = player.academyStats ?? {};
        const sold = player.academyStatus === "sold";
        return (
          <div key={player.id} className="pc-yt-history-row" onClick={() => onOpenPlayer(player)}>
            <div className="pc-yt-hist-name">{player.name}</div>
            <div className={`pc-yt-hist-status${sold ? " sold" : " active"}`}>
              <span className="dot" />{sold ? `Vendido${player.saleValue != null ? ` (${fmt(player.saleValue)})` : ""}` : "En plantilla"}
            </div>
            <div>{player.academyData?.promotedSeason ?? "—"}</div>
            <div>{stats.appearances ?? 0}</div>
            <div>{stats.goals ?? 0}</div>
            <div>{stats.seasons ?? 0}</div>
            <div>{stats.titles ?? 0}</div>
          </div>
        );
      })}
    </div>
  );
}
