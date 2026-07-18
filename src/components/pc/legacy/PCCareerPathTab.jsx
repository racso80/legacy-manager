const seasonLabel = value => `${value}/${String(Number(value) + 1).slice(-2)}`;

const EXIT_REASON_LABEL = { sacked: "Destituido", resigned: "Dimisión" };

export default function PCCareerPathTab({ coach }) {
  const clubs = coach?.career?.clubs ?? [];
  const history = coach?.career?.history ?? [];

  return (
    <div>
      <div className="pc-lc-section-label">Etapas como entrenador</div>
      {clubs.length ? (
        <div className="pc-lc-club-spell-list">
          {clubs.map((spell, index) => (
            <div key={`${spell.clubId}-${spell.fromSeason}`} className="pc-lc-club-spell-card">
              <div className="pc-lc-club-spell-top">
                <div>
                  <div className="pc-lc-club-spell-name">{spell.clubName}</div>
                  <div className="pc-lc-club-spell-range">T. {seasonLabel(spell.fromSeason)} — {spell.toSeason ? seasonLabel(spell.toSeason) : "actualidad"}</div>
                </div>
                {spell.exitReason && <span className="pc-lc-exit-badge">{EXIT_REASON_LABEL[spell.exitReason] ?? spell.exitReason}</span>}
              </div>
              <div className="pc-lc-trio-grid pc-lc-four-grid">
                <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{spell.seasons ?? 0}</div><div className="pc-lc-stat-label">TEMPORADAS</div></div>
                <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{spell.titles ?? 0}</div><div className="pc-lc-stat-label">TÍTULOS</div></div>
                <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{spell.matches ?? 0}</div><div className="pc-lc-stat-label">PARTIDOS</div></div>
                <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{spell.wins ?? 0}-{spell.draws ?? 0}-{spell.losses ?? 0}</div><div className="pc-lc-stat-label">V-E-D</div></div>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="pc-lc-empty">Tu trayectoria se escribirá club a club, temporada a temporada.</div>}

      <div className="pc-lc-section-label">Trayectoria por temporada</div>
      {history.length ? (
        <div className="pc-lc-history-list">
          {history.map(item => (
            <div key={`${item.season}-${item.clubId}`} className="pc-lc-history-row">
              <div>
                <div className="pc-lc-history-club">{item.clubName}</div>
                <div className="pc-lc-history-season">{seasonLabel(item.season)}</div>
                <div className="pc-lc-history-record">{item.matches} PJ · {item.wins}V {item.draws}E {item.losses}D · {item.points} pts</div>
              </div>
              <div className="pc-lc-history-result">
                {item.position}.º
                {item.title && <div className="pc-lc-history-title">🏆 {item.title}</div>}
              </div>
            </div>
          ))}
        </div>
      ) : <div className="pc-lc-empty">La trayectoria se escribirá temporada a temporada.</div>}
    </div>
  );
}
