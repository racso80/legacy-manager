const RESULT_LABEL = { win: "Victoria", draw: "Empate", loss: "Derrota" };

function contextFor(item) {
  if (item.transferType) return "Traspaso";
  if (item.result) return RESULT_LABEL[item.result] ?? null;
  if (item.playerId) return "Cantera";
  return null;
}

function iconFor(item) {
  if (item.actionConcern) return "😟";
  if (item.result === "win") return "🎉";
  if (item.playerId && !item.transferType) return "📈";
  return "📣";
}

export default function PCFanReactionsList({ reactions }) {
  if (!reactions.length) {
    return <div className="pc-fb-reactions-empty">Aún no hay reacciones destacadas.</div>;
  }
  return (
    <div>
      {reactions.slice(0, 8).map(item => {
        const context = contextFor(item);
        return (
          <div key={item.id} className={`pc-fb-reaction-item${item.actionConcern ? " concern" : ""}`}>
            <div className="pc-fb-reaction-title">{iconFor(item)} {item.title}</div>
            <div className="pc-fb-reaction-summary">{item.summary}</div>
            <div className="pc-fb-reaction-meta">Jornada {item.matchday}{context ? ` · ${context}` : ""}</div>
          </div>
        );
      })}
    </div>
  );
}
