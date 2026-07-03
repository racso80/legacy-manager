import { MATCH_FORMATIONS } from "../../match/matchFlow.js";
import { computePlayerRating, ratingClass, energyClass, initialsOf } from "./matchUiUtils.js";

const ENERGY_RING_SIZE = 28;
const ENERGY_RING_STROKE = 2.5;
const ENERGY_RING_RADIUS = (ENERGY_RING_SIZE - ENERGY_RING_STROKE) / 2;
const ENERGY_RING_CIRCUMFERENCE = 2 * Math.PI * ENERGY_RING_RADIUS;

// Anillo de energía (100 - fatiga): círculo completo = 100%, se vacía en sentido horario
// a medida que sube la fatiga. El número en el centro es la energía redondeada.
function EnergyRing({ energy }) {
  const pct = Math.max(0, Math.min(100, energy));
  const offset = ENERGY_RING_CIRCUMFERENCE * (1 - pct / 100);
  const cls = energyClass(pct);
  const center = ENERGY_RING_SIZE / 2;
  return (
    <svg width={ENERGY_RING_SIZE} height={ENERGY_RING_SIZE} viewBox={`0 0 ${ENERGY_RING_SIZE} ${ENERGY_RING_SIZE}`} className="pc-match-v2-energy-ring">
      <circle cx={center} cy={center} r={ENERGY_RING_RADIUS} fill="none" stroke="var(--border-strong)" strokeWidth={ENERGY_RING_STROKE} />
      <circle
        cx={center} cy={center} r={ENERGY_RING_RADIUS} fill="none" strokeLinecap="round"
        strokeWidth={ENERGY_RING_STROKE} strokeDasharray={ENERGY_RING_CIRCUMFERENCE} strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        className={`pc-match-v2-energy-ring-fg ${cls}`}
      />
      <text x="50%" y="51%" textAnchor="middle" dominantBaseline="middle" className={`pc-match-v2-energy-ring-text ${cls}`}>
        {Math.round(pct)}
      </text>
    </svg>
  );
}

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
        const energy = Math.max(0, Math.min(100, 100 - (player.fatigue ?? 0)));
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
            <EnergyRing energy={energy} />
          </div>
        );
      })}
    </div>
  );
}
