export default function MatchEventsPanel({ events = [], eventColors = {}, eventLabels = {}, finished = false }) {
  return (
    <div className="pc-match-v2-panel">
      <div className="pc-match-v2-panel-head">
        <span className="pc-match-v2-panel-title">Eventos del partido</span>
      </div>
      <div className="pc-match-v2-panel-body">
        <div className="pc-match-v2-events-list">
          {events.length === 0 ? (
            <div className="pc-match-v2-empty">{finished ? "Sin eventos registrados." : "Aún no hay eventos"}</div>
          ) : (
            [...events].reverse().map((e, i) => {
              const color = eventColors[e.type] ?? "#7c88a3";
              return (
                <div key={i} className="pc-match-v2-event-row" style={{ borderLeftColor: color }}>
                  <span className="pc-match-v2-event-min">{e.minute}'</span>
                  <span className="pc-match-v2-event-tag" style={{ background: `${color}22`, color }}>
                    {e.secondYellow ? "DOBLE 🟨" : eventLabels[e.type] ?? e.type}
                  </span>
                  <span className="pc-match-v2-event-txt">{e.description}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
