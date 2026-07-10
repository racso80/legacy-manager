import PlayerAvatar from "../../PlayerAvatar.jsx";

const money = value => `€${Math.abs(value ?? 0) >= 1000 ? `${((value ?? 0) / 1000).toFixed(1)}M` : `${Math.round(value ?? 0)}K`}`;
const RECORD_CARDS = [["appearances", "Partidos", "👕"], ["goals", "Goles", "⚽"], ["assists", "Asistencias", "🎯"], ["cleanSheets", "Porterías a cero", "🧤"]];

function LeaderRow({ player, value, label }) {
  return (
    <div className="pc-lc-protagonist-row">
      <PlayerAvatar player={player} size={34} />
      <div className="pc-lc-protagonist-info">
        <div className="pc-lc-protagonist-name">{player?.name ?? "Sin datos"}</div>
        <div className="pc-lc-protagonist-label">{label}</div>
      </div>
      <div className="pc-lc-protagonist-value">{value}</div>
    </div>
  );
}

export default function PCRecordsTab({ archive }) {
  const players = Object.values(archive.playerRecords ?? {});
  const seasons = (archive.seasons ?? []).filter(item => !item.migrated);
  if (!players.length && !seasons.length) return <div className="pc-lc-empty">Los récords se consolidarán al completar una temporada.</div>;

  const bestSeason = [...seasons].sort((a, b) => a.position - b.position || b.points - a.points)[0];
  const biggestSigning = [...seasons].filter(item => item.bestSigning).sort((a, b) => (b.bestSigning.cost ?? 0) - (a.bestSigning.cost ?? 0))[0]?.bestSigning;
  const biggestSale = [...seasons].filter(item => item.biggestSale).sort((a, b) => (b.biggestSale.value ?? 0) - (a.biggestSale.value ?? 0))[0]?.biggestSale;
  const maxValue = [...seasons].sort((a, b) => (b.squadValue ?? 0) - (a.squadValue ?? 0))[0];
  const bestSeasonDetail = bestSeason ? (bestSeason.title ? `🏆 ${bestSeason.title}` : bestSeason.topScorer?.name ? `Máx. goleador: ${bestSeason.topScorer.name.split(" ").slice(-1)[0]}` : undefined) : undefined;

  return (
    <div>
      <div className="pc-lc-section-label">Récords del club</div>
      <div className="pc-lc-trio-grid pc-lc-four-grid">
        <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{bestSeason ? `${bestSeason.position}.º · ${bestSeason.points} pts` : "—"}</div><div className="pc-lc-stat-label">MEJOR TEMPORADA</div>{bestSeasonDetail && <div className="pc-lc-stat-detail">{bestSeasonDetail}</div>}</div>
        <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{maxValue ? money(maxValue.squadValue) : "—"}</div><div className="pc-lc-stat-label">VALOR MÁXIMO</div></div>
        <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{biggestSigning ? money(biggestSigning.cost) : "—"}</div><div className="pc-lc-stat-label">MAYOR FICHAJE</div></div>
        <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{biggestSale ? money(biggestSale.value) : "—"}</div><div className="pc-lc-stat-label">MAYOR VENTA</div></div>
      </div>

      <div className="pc-lc-section-label">Récords individuales</div>
      <div className="pc-lc-protagonist-list">
        {RECORD_CARDS.map(([key, label, icon]) => {
          const leader = [...players].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0))[0];
          return <LeaderRow key={key} player={leader} value={leader?.[key] ?? 0} label={`${icon} Mejor ${label.toLowerCase()}`} />;
        })}
      </div>
    </div>
  );
}
