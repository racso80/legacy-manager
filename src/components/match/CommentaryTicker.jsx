export default function CommentaryTicker({ latestEvent, matchPhase }) {
  const text = latestEvent?.description
    ?? (matchPhase === "halftime" ? "Descanso. El míster prepara la segunda parte." : "El árbitro pone en marcha el partido.");
  return <div className="pc-match-v2-ticker">{text}</div>;
}
