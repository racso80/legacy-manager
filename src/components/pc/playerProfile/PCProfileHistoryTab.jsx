export default function PCProfileHistoryTab({ history, medicalHistory }) {
  return (
    <div>
      <div className="pc-pp-section-label">Historial de temporadas</div>
      {history.length ? (
        <div className="pc-pp-history-list">
          {history.map(entry => (
            <div key={`${entry.season}-${entry.clubId}`} className="pc-pp-history-card">
              <div className="pc-pp-history-season">{entry.season}/{String(Number(entry.season) + 1).slice(-2)}</div>
              <div className="pc-pp-history-club">{entry.clubName}</div>
              <div className="pc-pp-history-stats"><span>PJ: {entry.appearances}</span><span>G: {entry.goals}</span><span>A: {entry.assists}</span><span>Media: {entry.overall}</span></div>
            </div>
          ))}
        </div>
      ) : <div className="pc-pp-empty">El historial se completará al terminar la primera temporada.</div>}

      <div className="pc-pp-section-label" style={{ marginTop: 20 }}>Historial médico</div>
      {medicalHistory.length ? (
        <div className="pc-pp-medical-list">
          {[...medicalHistory].reverse().map(item => (
            <div key={item.id} className="pc-pp-medical-card">
              <div className="pc-pp-medical-type">{item.type}</div>
              <div className="pc-pp-medical-meta">T. {item.season}/{String(Number(item.season) + 1).slice(-2)} · J{item.matchday} · {item.totalDays} días</div>
            </div>
          ))}
        </div>
      ) : <div className="pc-pp-empty">No constan lesiones en su historial.</div>}
    </div>
  );
}
