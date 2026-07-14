// Momento dramático del despido (v0.98) — pantalla única y estática, no multi-fase como
// SeasonTransitionScreen (decidido así: hay mucho menos contenido que mostrar que en una
// gala de fin de temporada, solo el veredicto + el resumen de la etapa que termina).
export default function PCDespidoReveal({ game, teams, onContinue }) {
  const oldTeam = teams.find(t => t.id === game.teamId);
  const spell = (game.coachCareer?.career?.clubs ?? []).find(item => item.clubId === game.teamId && !item.toSeason);
  const confidence = Math.round(game.legacy?.confidence ?? 0);

  return (
    <div className="pc-despido-root">
      <div className="pc-despido-card">
        <div className="pc-despido-label">⚠ DIRECTIVA</div>
        <div className="pc-despido-title">La directiva pone fin a tu etapa en {oldTeam?.name ?? game.name}</div>
        <div className="pc-despido-desc">
          La confianza cayó a {confidence}/100 y el proyecto no continúa contigo la próxima temporada.
          Tu etapa en el club queda cerrada, pero tu carrera sigue — toca buscar un nuevo destino.
        </div>

        <div className="pc-despido-summary-title">TU ETAPA EN {oldTeam?.name?.toUpperCase() ?? ""}</div>
        <div className="pc-despido-stats">
          <div className="pc-despido-stat">
            <div className="pc-despido-stat-value">{spell?.seasons ?? 0}</div>
            <div className="pc-despido-stat-label">TEMPORADAS</div>
          </div>
          <div className="pc-despido-stat">
            <div className="pc-despido-stat-value">{spell?.titles ?? 0}</div>
            <div className="pc-despido-stat-label">TÍTULOS</div>
          </div>
          <div className="pc-despido-stat">
            <div className="pc-despido-stat-value">{spell?.matches ?? 0}</div>
            <div className="pc-despido-stat-label">PARTIDOS</div>
          </div>
          <div className="pc-despido-stat">
            <div className="pc-despido-stat-value pc-despido-record">{spell?.wins ?? 0}-{spell?.draws ?? 0}-{spell?.losses ?? 0}</div>
            <div className="pc-despido-stat-label">G-E-P</div>
          </div>
        </div>

        <button className="pc-despido-btn" onClick={onContinue}>Buscar nuevo club →</button>
      </div>
    </div>
  );
}
