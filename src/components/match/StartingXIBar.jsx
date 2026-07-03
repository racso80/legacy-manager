import { MATCH_FORMATIONS } from "../../match/matchFlow.js";
import { computePlayerRating, ratingClass, initialsOf } from "./matchUiUtils.js";

// Franja horizontal con el once titular del usuario. Tocar un jugador dispara el mismo
// selector de slot que los chips del mini-campo (ver PCMatchScreen.handleSlotClick).
export default function StartingXIBar({
  lineup = [], players = [], formation, sentOffIds = [], events = [], currentMinute = 0,
  selectedSlot = null, onSlotClick,
}) {
  const positions = MATCH_FORMATIONS[formation] ?? MATCH_FORMATIONS["4-3-3"];
  return (
    <div className="pc-match-v2-squadbar">
      {lineup.map((pid, slot) => {
        if (!pid) return null;
        const player = players.find(p => p.id === pid);
        if (!player) return null;
        const isOut = sentOffIds.includes(pid);
        const rating = computePlayerRating(pid, { events, sentOffIds, currentMinute });
        const selected = selectedSlot === slot;
        const clickable = !isOut && typeof onSlotClick === "function";
        return (
          <div
            key={slot}
            className="pc-match-v2-squad-slot"
            onClick={clickable ? () => onSlotClick(slot) : undefined}
            style={{
              cursor: clickable ? "pointer" : "default",
              opacity: isOut ? .5 : 1,
              background: selected ? "var(--home-soft)" : undefined,
            }}
          >
            <div className="pc-match-v2-squad-pos">{positions[slot] ?? player.pos}</div>
            <div className="pc-match-v2-squad-shirt">{initialsOf(player.name)}</div>
            <div className="pc-match-v2-squad-name">{player.name.split(" ").slice(-1)[0]}{isOut ? " 🟥" : ""}</div>
            {rating != null && <div className={`pc-match-v2-squad-rating ${ratingClass(rating)}`}>{rating.toFixed(1)}</div>}
          </div>
        );
      })}
    </div>
  );
}
