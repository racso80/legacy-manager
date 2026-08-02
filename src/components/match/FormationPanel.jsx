import { MATCH_FORMATIONS } from "../../match/matchFlow.js";
import { positionTier, computePlayerRating, ratingClass, initialsOf, TIER_ORDER_ATTACK_UP, TIER_ORDER_ATTACK_DOWN } from "./matchUiUtils.js";

// Mini-campo vertical: agrupa el once en filas GK/D/DM/AM/ST según la formación activa.
// Si interactive=true, tocar un titular lo selecciona (para intercambiar con otro titular
// tocado a continuación) y abre el popover de sustitución vía onSlotClick.
export default function FormationPanel({
  team, formation, lineup = [], players = [], sentOffIds = [], events = [], currentMinute = 0,
  teamGoalsFor = 0, teamGoalsAgainst = 0,
  sideColorClass = "home", reversed = false, interactive = false, selectedSlot = null, onSlotClick,
}) {
  const positions = MATCH_FORMATIONS[formation] ?? MATCH_FORMATIONS["4-3-3"];
  const tiers = { GK: [], D: [], DM: [], AM: [], ST: [] };
  lineup.forEach((pid, slot) => {
    if (!pid) return;
    const player = players.find(p => p.id === pid);
    if (!player) return;
    const tier = positionTier(positions[slot]);
    (tiers[tier] ?? tiers.AM).push({ slot, player });
  });
  const order = reversed ? TIER_ORDER_ATTACK_DOWN : TIER_ORDER_ATTACK_UP;

  return (
    <div className="pc-match-v2-panel">
      <div className="pc-match-v2-panel-head">
        <span className="pc-match-v2-panel-title">
          <span className={`pc-match-v2-side-dot ${sideColorClass}`} />
          Formación · {team?.short ?? "—"}
        </span>
        <span className="pc-match-v2-formation-tag">{formation}</span>
      </div>
      <div className="pc-match-v2-panel-body">
        <div className="pc-match-v2-mini-pitch">
          {order.map(tier => {
            const row = tiers[tier];
            if (!row || !row.length) return null;
            return (
              <div className="pc-match-v2-p-row" key={tier}>
                {row.map(({ slot, player }) => {
                  const isOut = sentOffIds.includes(player.id);
                  const stats = computePlayerRating(player, { events, currentMinute, teamGoalsFor, teamGoalsAgainst });
                  const hasRating = stats.minutes > 0 || stats.goals || stats.assists || stats.saves || stats.defensiveActions || stats.yellows || stats.red;
                  const yellowCount = stats.yellows;
                  const selected = interactive && selectedSlot === slot;
                  const clickable = interactive && !isOut && typeof onSlotClick === "function";
                  return (
                    <div
                      key={slot}
                      className="pc-match-v2-p-chip"
                      onClick={clickable ? () => onSlotClick(slot) : undefined}
                      style={{ cursor: clickable ? "pointer" : "default", opacity: isOut ? .5 : 1 }}
                    >
                      <div
                        className={`pc-match-v2-p-shirt ${sideColorClass}`}
                        style={selected ? { boxShadow: "0 0 0 2px var(--text-primary)" } : undefined}
                      >
                        {initialsOf(player.name)}
                      </div>
                      <div className="pc-match-v2-p-name">{player.name.split(" ").slice(-1)[0]}</div>
                      {(yellowCount > 0 || isOut) && (
                        <div className="pc-match-v2-p-cards">
                          {yellowCount > 0 && <span className="pc-match-v2-card-icon yellow">🟨{yellowCount > 1 ? `×${yellowCount}` : ""}</span>}
                          {isOut && <span className="pc-match-v2-card-icon red">🟥</span>}
                        </div>
                      )}
                      {hasRating && (
                        <div className={`pc-match-v2-p-rating ${ratingClass(stats.rating)}`}>{stats.rating.toFixed(1)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
