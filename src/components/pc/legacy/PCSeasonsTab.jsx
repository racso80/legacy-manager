import { useState } from "react";
import PlayerAvatar from "../../PlayerAvatar.jsx";

const money = value => `€${Math.abs(value ?? 0) >= 1000 ? `${((value ?? 0) / 1000).toFixed(1)}M` : `${Math.round(value ?? 0)}K`}`;
const seasonLabel = value => `${value}/${String(Number(value) + 1).slice(-2)}`;

function ProtagonistRow({ player, value, label }) {
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

export default function PCSeasonsTab({ archive, teams }) {
  const seasons = archive.seasons ?? [];
  const [selectedId, setSelectedId] = useState(seasons[0]?.id ?? null);
  const selected = seasons.find(item => item.id === selectedId) ?? seasons[0];
  const teamName = id => teams.find(team => team.id === id)?.name ?? id;

  if (!selected) return <div className="pc-lc-empty">Tu primera temporada completa inaugurará el archivo histórico.</div>;

  return (
    <div>
      <div className="pc-lc-season-pills">
        {seasons.map(item => (
          <div key={item.id} className={`pc-lc-season-pill${selected.id === item.id ? " active" : ""}`} onClick={() => setSelectedId(item.id)}>{seasonLabel(item.season)}</div>
        ))}
      </div>

      <div className="pc-lc-season-hero">
        <div>
          <div className="pc-lc-season-hero-label">TEMPORADA {seasonLabel(selected.season)}</div>
          <div className="pc-lc-season-hero-position">{selected.position}.ª posición</div>
        </div>
        {selected.title && <div className="pc-lc-season-hero-trophy">🏆</div>}
      </div>
      <div className="pc-lc-trio-grid pc-lc-four-grid">
        <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{selected.points}</div><div className="pc-lc-stat-label">PTS</div></div>
        <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{selected.goalsFor}</div><div className="pc-lc-stat-label">GF</div></div>
        <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{selected.goalsAgainst}</div><div className="pc-lc-stat-label">GC</div></div>
        <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{selected.prestigeDelta > 0 ? "+" : ""}{selected.prestigeDelta ?? 0}</div><div className="pc-lc-stat-label">PRESTIGIO</div></div>
      </div>

      {!selected.migrated && (
        <>
          <div className="pc-lc-section-label">Protagonistas</div>
          <div className="pc-lc-protagonist-list">
            <ProtagonistRow player={selected.topScorer} value={selected.topScorer?.goals ?? 0} label="Máximo goleador" />
            <ProtagonistRow player={selected.topAssister} value={selected.topAssister?.assists ?? 0} label="Máximo asistente" />
            <ProtagonistRow player={selected.playerOfYear} value={selected.playerOfYear?.averageRating || "—"} label="Jugador de la temporada" />
          </div>

          <div className="pc-lc-section-label">Balance de gestión</div>
          <div className="pc-lc-trio-grid pc-lc-four-grid">
            <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{money(selected.squadValue)}</div><div className="pc-lc-stat-label">VALOR PLANTILLA</div></div>
            <div className="pc-lc-stat-card"><div className="pc-lc-stat-value" style={{ color: (selected.finances?.balance ?? 0) >= 0 ? "#22c55e" : "#ef4444" }}>{money(selected.finances?.balance)}</div><div className="pc-lc-stat-label">BALANCE</div></div>
            <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{selected.promotedYouth ?? 0}</div><div className="pc-lc-stat-label">CANTERANOS</div></div>
            <div className="pc-lc-stat-card"><div className="pc-lc-stat-value">{selected.bestSigning ? `${selected.bestSigning.name?.split(" ").slice(-1)[0] ?? "—"}` : "—"}</div><div className="pc-lc-stat-label">MEJOR FICHAJE</div></div>
          </div>

          <div className="pc-lc-section-label">Clasificación final</div>
          <div className="pc-lc-standings-table">
            {selected.standings?.map(row => (
              <div key={row.teamId} className={`pc-lc-standings-row${row.teamId === selected.clubId ? " own" : ""}`}>
                <span>{row.position}</span>
                <span className="pc-lc-standings-name">{teamName(row.teamId)}</span>
                <span>{row.goalDifference > 0 ? "+" : ""}{row.goalDifference}</span>
                <strong>{row.points}</strong>
              </div>
            ))}
          </div>
        </>
      )}
      {selected.migrated && <div className="pc-lc-empty">Esta temporada procede de una partida anterior. Conservamos posición, puntos y prestigio; los detalles avanzados empezarán a registrarse en el próximo cierre.</div>}
    </div>
  );
}
