import { Initials } from "../../App.jsx";

// Modal centrado para sustituir al titular del slot indicado por alguien del banco.
export default function SubstitutionPopover({
  slot, lineup = [], players = [], subs = [], subsUsed = 0, maxSubs = 0,
  subbedOutIds = [], sentOffIds = [], onConfirm, onClose,
}) {
  const outId = lineup[slot];
  const outPlayer = players.find(p => p.id === outId);
  const canSub = subsUsed < maxSubs;
  const bench = subs
    .filter(pid => pid && !subbedOutIds.includes(pid) && !sentOffIds.includes(pid))
    .map(pid => players.find(p => p.id === pid))
    .filter(p => p && !p.injured && !p.suspended);

  return (
    <div className="pc-match-v2-modal-backdrop" onClick={onClose}>
      <div className="pc-match-v2-modal" onClick={e => e.stopPropagation()}>
        <div className="pc-match-v2-modal-head">
          <div>Sustituir a {outPlayer?.name ?? "jugador"}</div>
          <button className="pc-match-v2-icon-btn pc-match-v2-icon-btn-sm" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="pc-match-v2-modal-sub">
          Cambios: {subsUsed}/{maxSubs} · toca otro titular en el campo o en la franja inferior para intercambiar posiciones
        </div>
        <div className="pc-match-v2-modal-list">
          {!canSub ? (
            <div className="pc-match-v2-empty">Sin cambios disponibles.</div>
          ) : bench.length === 0 ? (
            <div className="pc-match-v2-empty">No hay suplentes disponibles.</div>
          ) : (
            bench.map(p => (
              <div key={p.id} className="pc-match-v2-modal-bench-row" onClick={() => onConfirm(outId, p.id)}>
                <Initials name={p.name} size={26} rarity={p.rarity} borderRadius={6} />
                <div className="pc-match-v2-modal-bench-info">
                  <div className="pc-match-v2-modal-bench-name">{p.name}</div>
                  <div className="pc-match-v2-modal-bench-meta">{p.pos} · Cansancio {p.fatigue}</div>
                </div>
                <span className="pc-match-v2-modal-bench-cta">← Entra</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
