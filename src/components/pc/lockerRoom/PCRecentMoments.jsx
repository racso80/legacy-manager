// Visible fuera del switch de tabs (Conversaciones/Plantilla) — mismo criterio que móvil,
// que no tiene tabs y muestra esto siempre en la vista única del Vestuario.
export default function PCRecentMoments({ players, onOpenPlayer }) {
  const recentMoments = players
    .flatMap(player => (player.moraleEvents ?? []).map(event => ({ player, event })))
    .sort((a, b) => (b.event.matchday ?? 0) - (a.event.matchday ?? 0))
    .slice(0, 3);

  if (!recentMoments.length) return null;

  return (
    <div className="pc-lr-moments-section">
      <div className="pc-lr-section-label">Momentos recientes</div>
      <div className="pc-lr-moments-grid">
        {recentMoments.map(({ player, event }) => (
          <button key={`${player.id}-${event.id}`} className="pc-lr-moment-card" onClick={() => onOpenPlayer(player)}>
            <div className="pc-lr-moment-name">{player.name}</div>
            <div className="pc-lr-moment-label">{event.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
