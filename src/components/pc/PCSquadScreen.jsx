import { useState } from "react";
import { NAT_FLAG, RARITY_ACCENT, RARITY_LABEL, StatBar } from "../../App.jsx";
import { getPlayerSeasonStats } from "../../players/playerProfile.js";
import { buildPlayerState } from "../../state/gameStateSelectors.js";

const FILTERS = [["ALL", "Todos"], ["POR", "Porteros"], ["DEF", "Defensas"], ["MED", "Medios"], ["DEL", "Delanteros"]];
const STAT_KEYS = ["ritmo", "tiro", "pase", "regate", "defensa", "fisico", "porteria"];
const STAT_LABELS = { ritmo: "RIT", tiro: "TIR", pase: "PAS", regate: "REG", defensa: "DEF", fisico: "FIS", porteria: "POR" };

function availabilityFor(player, game) {
  const state = buildPlayerState(player, game);
  if (state.isInjured) return { label: "Lesionado", color: "#ef4444" };
  if (state.isSuspended) return { label: "Sancionado", color: "#f59e0b" };
  if (state.isRecovering) return { label: "Recuperación", color: "#60a5fa" };
  return { label: "Disponible", color: "#22c55e" };
}

function SquadPhoto({ player, size = 32 }) {
  return (
    <div className="pc-squad-photo-wrap" style={{ width: size, height: size }}>
      <img
        src={player.imageUrl || `/players/${player.id}.png`}
        alt=""
        className="pc-squad-photo"
        onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex"; }}
      />
      <span className="pc-squad-photo-fallback" style={{ fontSize: size * 0.45 }}>👤</span>
    </div>
  );
}

export default function PCSquadScreen({ game, players, onOpenPlayer, setScreen }) {
  const [filter, setFilter] = useState("ALL");
  const [statsSeason, setStatsSeason] = useState(String(game.season));
  const [selectedId, setSelectedId] = useState(null);

  const shown = filter === "ALL" ? players : players.filter(p => p.group === filter);
  const seasons = [...new Set([String(game.season), ...players.flatMap(player => (player.careerHistory ?? []).map(entry => String(entry.season)))])].sort((a, b) => Number(b) - Number(a));
  const seasonStats = player => statsSeason === String(game.season) ? getPlayerSeasonStats(player, game, game.teamId) : (player.careerHistory ?? []).find(entry => String(entry.season) === statsSeason) ?? {};
  const selectedPlayer = players.find(p => p.id === selectedId) ?? null;
  const selectedStats = selectedPlayer ? seasonStats(selectedPlayer) : null;
  const selectedAvailability = selectedPlayer ? availabilityFor(selectedPlayer, game) : null;
  const selectedAccent = selectedPlayer ? RARITY_ACCENT[selectedPlayer.rarity] : null;

  return (
    <div className="pc-squad-layout">
      <div className="pc-squad-left">
        <div className="pc-squad-toolbar">
          <div className="pc-squad-filters">
            {FILTERS.map(([val, label]) => (
              <button key={val} className="pc-squad-filter-pill" data-active={filter === val} onClick={() => setFilter(val)}>
                {label}
              </button>
            ))}
          </div>
          <select className="pc-squad-season-select" value={statsSeason} onChange={e => setStatsSeason(e.target.value)}>
            {seasons.map(season => (
              <option key={season} value={season}>
                {season}/{String(Number(season) + 1).slice(-2)}{season === String(game.season) ? " · actual" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="pc-squad-table">
          <div className="pc-squad-table-header">
            <span></span>
            <span>#</span>
            <span>Nombre</span>
            <span>Pos</span>
            <span>OVR</span>
            <span>Edad</span>
            <span>Nac</span>
            <span>PJ</span>
            <span>G</span>
            <span>A</span>
            <span>NOTA</span>
            <span>Estado</span>
            <span>MOR</span>
            <span>CAN</span>
          </div>
          <div className="pc-squad-table-body">
            {shown.map((p, idx) => {
              const stats = seasonStats(p);
              const availability = availabilityFor(p, game);
              const moraleColor = (p.morale ?? 70) >= 75 ? "#22c55e" : (p.morale ?? 70) >= 50 ? "#f59e0b" : "#ef4444";
              const fatColor = (p.fatigue ?? 0) <= 30 ? "#22c55e" : (p.fatigue ?? 0) <= 60 ? "#f59e0b" : "#ef4444";
              return (
                <div
                  key={p.id}
                  className="pc-squad-row"
                  data-selected={p.id === selectedId}
                  style={{ background: idx % 2 === 0 ? "#161a24" : "#0f1320" }}
                  onClick={() => setSelectedId(p.id)}
                >
                  <SquadPhoto player={p} />
                  <span className="pc-squad-cell-dim">{idx + 1}</span>
                  <span className="pc-squad-name">{p.name}</span>
                  <span className="pc-squad-pos-badge">{p.pos}</span>
                  <span className="pc-squad-ovr">{p.overall}</span>
                  <span className="pc-squad-cell-dim">{p.age}</span>
                  <span className="pc-squad-cell-dim">{NAT_FLAG[p.nat] || "🌍"}</span>
                  <span className="pc-squad-cell-dim">{stats.appearances ?? 0}</span>
                  <span className="pc-squad-cell-dim">{stats.goals ?? 0}</span>
                  <span className="pc-squad-cell-dim">{stats.assists ?? 0}</span>
                  <span className="pc-squad-cell-dim">{stats.averageRating ?? "—"}</span>
                  <span className="pc-squad-status-pill" style={{ color: availability.color, background: `${availability.color}18`, border: `1px solid ${availability.color}40` }}>
                    {availability.label}
                  </span>
                  <span style={{ color: moraleColor, fontWeight: 800, fontSize: 11, textAlign: "center" }}>{p.morale}</span>
                  <span style={{ color: fatColor, fontWeight: 800, fontSize: 11, textAlign: "center" }}>{p.fatigue}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="pc-squad-detail">
        {selectedPlayer ? (
          <>
            <div className="pc-squad-detail-header">
              <SquadPhoto player={selectedPlayer} size={80} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="pc-squad-detail-name">{selectedPlayer.name}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                  <span className="pc-squad-pos-badge">{selectedPlayer.pos}</span>
                  <span style={{ background: `${selectedAccent}22`, color: selectedAccent, fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 4 }}>
                    {RARITY_LABEL[selectedPlayer.rarity]}
                  </span>
                </div>
                <div className="pc-squad-detail-overall" style={{ color: selectedAccent }}>{selectedPlayer.overall}</div>
              </div>
            </div>

            <div className="pc-squad-detail-meta">
              {NAT_FLAG[selectedPlayer.nat] || "🌍"} {selectedPlayer.nat} · {selectedPlayer.age} años
            </div>

            {(selectedPlayer.injured || selectedPlayer.suspended) && (
              <div className="pc-squad-detail-alert" style={{ color: selectedAvailability.color, background: `${selectedAvailability.color}18`, border: `1px solid ${selectedAvailability.color}40` }}>
                {selectedAvailability.label}
              </div>
            )}

            <div className="pc-squad-detail-section">
              {STAT_KEYS.map(k => (
                <StatBar key={k} label={STAT_LABELS[k]} value={selectedPlayer.attrs[k]} accent={selectedAccent} />
              ))}
            </div>

            <div className="pc-squad-detail-section-title">TEMPORADA {statsSeason}</div>
            <div className="pc-squad-detail-stats-grid">
              {[["PJ", selectedStats.appearances ?? 0], ["G", selectedStats.goals ?? 0], ["A", selectedStats.assists ?? 0], ["NOTA", selectedStats.averageRating ?? "—"]].map(([label, value]) => (
                <div key={label} className="pc-squad-detail-stat">
                  <div className="pc-squad-detail-stat-value">{value}</div>
                  <div className="pc-squad-detail-stat-label">{label}</div>
                </div>
              ))}
            </div>

            <div className="pc-squad-detail-vitals">
              <div className="pc-squad-detail-vital">
                <div className="pc-squad-detail-vital-label">MORAL</div>
                <div className="pc-squad-detail-vital-value" style={{ color: (selectedPlayer.morale ?? 70) >= 75 ? "#22c55e" : (selectedPlayer.morale ?? 70) >= 50 ? "#f59e0b" : "#ef4444" }}>{selectedPlayer.morale}</div>
              </div>
              <div className="pc-squad-detail-vital">
                <div className="pc-squad-detail-vital-label">CANSANCIO</div>
                <div className="pc-squad-detail-vital-value" style={{ color: (selectedPlayer.fatigue ?? 0) <= 30 ? "#22c55e" : (selectedPlayer.fatigue ?? 0) <= 60 ? "#f59e0b" : "#ef4444" }}>{selectedPlayer.fatigue}</div>
              </div>
            </div>

            <div className="pc-squad-detail-actions">
              <button className="btn-gold" style={{ padding: 10, borderRadius: 8, fontSize: 12 }} onClick={() => onOpenPlayer?.(selectedPlayer, shown)}>
                Ver perfil completo →
              </button>
              <button className="btn-ghost" style={{ padding: 10, borderRadius: 8, fontSize: 12 }} onClick={() => setScreen?.("lineup")}>
                Ir a alineación →
              </button>
            </div>
          </>
        ) : (
          <div className="pc-squad-detail-empty">Selecciona un jugador para ver su perfil</div>
        )}
      </aside>
    </div>
  );
}
