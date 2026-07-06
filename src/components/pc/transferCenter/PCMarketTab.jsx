import { useState } from "react";
import { createPortal } from "react-dom";
import TeamCrest from "../../TeamCrest.jsx";
import PlayerAvatar from "../../PlayerAvatar.jsx";
import { RARITY_ACCENT } from "../../../App.jsx";
import { getStaffMember } from "../../../staff/staffEngine.js";
import { CLUB_ACCEPT_RATIO, CLUB_COUNTER_RATIO, PLAYER_ACCEPT_RATIO, PLAYER_COUNTER_RATIO, getNegotiationBoost } from "../../../transfers/transferEngine.js";

const fmt = v => v >= 1000 ? `€${(v / 1000).toFixed(1)}M` : `€${Math.round(v)}K`;

// Valor de mercado simplificado — misma fórmula que TransferMarketScreen (App.jsx:1753)
// y transferEngine.js:16, para que el valor mostrado coincida con el que usa el motor.
function marketValue(p) {
  const base = p.overall >= 88 ? 80000 : p.overall >= 84 ? 50000 : p.overall >= 80 ? 30000
             : p.overall >= 76 ? 18000 : p.overall >= 72 ? 10000 : p.overall >= 68 ? 5000 : 2000;
  const ageMod = p.age <= 23 ? 1.4 : p.age <= 27 ? 1.2 : p.age <= 30 ? 1.0 : p.age <= 33 ? 0.7 : 0.4;
  return Math.round(base * ageMod);
}
const suggestedSalary = p => p.salary ?? (
  p.overall >= 88 ? 250 : p.overall >= 84 ? 150 : p.overall >= 80 ? 90
  : p.overall >= 76 ? 55 : p.overall >= 72 ? 30 : 16
);
const isFreeAgent = p => p?._teamId === "agente_libre";
const transferCost = p => isFreeAgent(p) ? 0 : marketValue(p);
const acc = p => RARITY_ACCENT[p.rarity] ?? "#9aa0b4";

export const OFFER_STATUS_LABELS = {
  pendingClub: ["🕒", "Pendiente del club", "#f59e0b"],
  clubCounter: ["🔄", "Contraoferta", "#60a5fa"],
  clubAccepted: ["✅", "Club acepta", "#22c55e"],
  pendingPlayer: ["⏳", "Esperando jugador", "#f59e0b"],
  playerCounter: ["🔄", "Pide más salario", "#60a5fa"],
  roleCounter: ["🔄", "Pide otro rol", "#60a5fa"],
  ready: ["✍️", "Acuerdo total", "#22c55e"],
  rejected: ["❌", "Rechazada", "#ef4444"],
  playerRejected: ["❌", "Jugador rechaza", "#ef4444"],
  outbid: ["⚠️", "Otro club se adelanta", "#ef4444"],
  withdrawn: ["↩️", "Retirada", "#6b7280"],
  completed: ["📌", "Finalizada", "#c9a84c"],
};

function pipelineSteps(status) {
  const clubDone = !["pendingClub"].includes(status);
  const clubRejected = ["rejected", "outbid"].includes(status);
  const playerStage = ["clubAccepted", "pendingPlayer", "playerCounter", "roleCounter", "ready", "playerRejected", "completed"].includes(status);
  const playerDone = ["ready", "completed"].includes(status);
  const playerRejected = status === "playerRejected";
  return [
    "done",
    clubRejected ? "rejected" : clubDone ? "done" : "current",
    playerRejected ? "rejected" : playerDone ? "done" : playerStage ? "current" : "",
  ];
}

function clubAdvisorNotes(offer, boost) {
  const ratio = offer.amount / Math.max(1, offer.marketValue) + boost;
  const pct = Math.round(ratio * 100);
  const notes = [];
  if (offer.status === "clubCounter") {
    const diffPct = Math.round((1 - offer.amount / offer.marketValue) * 100);
    notes.push(`Tu oferta de ${fmt(offer.amount)} estaba un ${Math.abs(diffPct)}% ${diffPct >= 0 ? "por debajo" : "por encima"} del valor de mercado — dentro de lo esperable que pidieran más.`);
    const counterRatio = offer.counterAmount / Math.max(1, offer.marketValue) + boost;
    notes.push(`${fmt(offer.counterAmount)} es un ${Math.round(counterRatio * 100)}% del valor de mercado. Es muy probable que acepten si igualás esta cifra.`);
  } else if (offer.status === "pendingClub") {
    notes.push(`Tu oferta de ${fmt(offer.amount)} es un ${pct}% del valor de mercado.`);
    if (ratio >= CLUB_ACCEPT_RATIO) notes.push("Debería ser aceptada sin problema.");
    else if (ratio >= CLUB_COUNTER_RATIO) notes.push("Es probable que el club responda con una contraoferta antes de aceptar.");
    else notes.push("Es probable que el club la rechace directamente — considerá subir la oferta.");
  } else if (offer.status === "rejected") {
    notes.push(`Tu oferta de ${fmt(offer.amount)} fue solo un ${pct}% del valor de mercado — muy por debajo del ${Math.round(CLUB_COUNTER_RATIO * 100)}% mínimo que suelen pedir para negociar.`);
  }
  return notes;
}

function playerAdvisorNotes(offer, boost) {
  const expected = Math.max(8, offer.salary ?? 8);
  const baseline = Math.max(8, offer.expectedSalary ?? expected);
  const ratio = expected / baseline + boost;
  const pct = Math.round(ratio * 100);
  const notes = [];
  if (offer.status === "pendingPlayer") {
    notes.push(`Ofrecés ${fmt(offer.salary)}/sem, un ${pct}% de lo que espera cobrar (${fmt(offer.expectedSalary)}/sem).`);
    if (ratio >= PLAYER_ACCEPT_RATIO) notes.push("Debería aceptar sin pedir nada más, si el rol le convence.");
    else if (ratio >= PLAYER_COUNTER_RATIO) notes.push("Es probable que pida más salario o un rol distinto antes de firmar.");
    else notes.push("Es probable que rechace — está bastante por debajo de lo que espera cobrar.");
  } else if (offer.status === "playerCounter") {
    notes.push(`Tu oferta de ${fmt(offer.salary)}/sem era un ${pct}% de su salario esperado.`);
    const counterRatio = offer.counterSalary / baseline + boost;
    notes.push(`Pide ${fmt(offer.counterSalary)}/sem (${Math.round(counterRatio * 100)}%). Aceptar esta cifra debería cerrar el acuerdo.`);
  } else if (offer.status === "playerRejected") {
    notes.push(`${fmt(offer.salary)}/sem era solo un ${pct}% de lo que espera cobrar — muy por debajo del ${Math.round(PLAYER_COUNTER_RATIO * 100)}% mínimo para que considere negociar.`);
  }
  return notes;
}

function AdvisorBox({ notes, directorName }) {
  if (!notes.length) return null;
  const initials = directorName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="pc-tc-advisor-box">
      <div className="pc-tc-advisor-avatar">{initials}</div>
      <div className="pc-tc-advisor-content">
        <div className="pc-tc-advisor-name">{directorName}</div>
        <div className="pc-tc-advisor-role">Director Deportivo</div>
        {notes.map((note, i) => <div key={i} className={`pc-tc-advisor-note${i > 0 ? " warn" : ""}`}>{note}</div>)}
      </div>
    </div>
  );
}

function ContractForm({ salary, years, role, onSalary, onYears, onRole, onSubmit, label }) {
  return (
    <div className="pc-tc-contract-form">
      <input type="number" value={salary} onChange={e => onSalary(Number(e.target.value))} />
      <select value={years} onChange={e => onYears(Number(e.target.value))}>{[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>{y} años</option>)}</select>
      <select value={role} onChange={e => onRole(e.target.value)} className="pc-tc-contract-role">{["Estrella", "Titular", "Rotación", "Promesa", "Suplente"].map(r => <option key={r}>{r}</option>)}</select>
      <button className="btn-gold pc-tc-contract-submit" onClick={onSubmit}>{label}</button>
    </div>
  );
}

function OfferModal({ player, onClose, onClubOffer, onFreeAgentOffer }) {
  const [amount, setAmount] = useState(isFreeAgent(player) ? suggestedSalary(player) : (player._listing?.type === "transfer" ? (player._listing.askingPrice ?? marketValue(player)) : player._listing?.type === "loan" ? Math.round(marketValue(player) * .06) : marketValue(player)));
  const [salary, setSalary] = useState(suggestedSalary(player));
  const [years, setYears] = useState(3);
  const [role, setRole] = useState("Rotación");
  const free = isFreeAgent(player);
  // Portal a document.body: dentro del PC shell, .screen-enter deja un transform
  // (fadeIn, fill-mode both) en un ancestro, lo que convierte position:fixed en
  // relativo a ese ancestro en vez del viewport — el overlay quedaba encajado
  // dentro de la columna central en vez de cubrir toda la pantalla.
  return createPortal(
    <div className="pc-tc-modal-overlay" onClick={onClose}>
      <div className="pc-tc-modal" onClick={e => e.stopPropagation()}>
        <div className="pc-tc-modal-head">
          <PlayerAvatar player={player} size={44} />
          <div>
            <div className="pc-tc-p-name">{player.name}</div>
            <div className="pc-tc-p-sub">{player.pos} · {player.age} años · {free ? "Agente libre" : player._teamName}</div>
          </div>
        </div>
        {free ? (
          <ContractForm salary={salary} years={years} role={role} onSalary={setSalary} onYears={setYears} onRole={setRole}
            onSubmit={() => { onFreeAgentOffer(player, salary, years, role); onClose(); }} label="Negociar contrato" />
        ) : (
          <div className="pc-tc-club-offer-form">
            <label>Oferta al club ({player._listing?.type === "loan" ? "coste de cesión" : "traspaso"})</label>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
            <button className="btn-gold" onClick={() => { onClubOffer(player, amount, marketValue(player), suggestedSalary(player), player._listing); onClose(); }}>
              Enviar {player._listing?.type === "loan" ? "propuesta de cesión" : "oferta al club"}
            </button>
          </div>
        )}
        <button className="btn-ghost pc-tc-modal-close" onClick={onClose}>Cancelar</button>
      </div>
    </div>,
    document.body
  );
}

export default function PCMarketTab({ game, teams, players, allOtherPlayers, subTab, onSubTabChange, onOpenPlayer, onClubOffer, onFreeAgentOffer, onAcceptClubCounter, onContractOffer, onAcceptPlayerCounter, onAcceptRoleCounter, onWithdrawOffer, onFinalizeOffer, onUserMarketStatus, onIncomingOffer }) {
  const [offerTarget, setOfferTarget] = useState(null);
  const [selectedOfferId, setSelectedOfferId] = useState(null);
  const [selectedIncomingId, setSelectedIncomingId] = useState(null);
  const [confirmSell, setConfirmSell] = useState(null);
  const [contractSalary, setContractSalary] = useState(0);
  const [contractYears, setContractYears] = useState(3);
  const [contractRole, setContractRole] = useState("Rotación");

  const negotiationBoost = getNegotiationBoost(game);
  const directorName = getStaffMember(game, "sportingDirector").name;

  const listingsByPlayer = new Map((game.transferMarket?.listings ?? []).map(l => [l.playerId, l]));
  const reportsByPlayer = new Map((game.scouting?.reports ?? []).map(r => [r.playerId, r]));
  const knownIds = new Set([...reportsByPlayer.keys(), ...allOtherPlayers.filter(p => isFreeAgent(p)).map(p => p.id)]);

  const marketPlayers = allOtherPlayers.filter(p => {
    if (players.some(owned => owned.id === p.id)) return false;
    const listing = listingsByPlayer.get(p.id);
    if (!knownIds.has(p.id) && !listing) return false;
    return true;
  }).map(p => ({ ...p, _listing: listingsByPlayer.get(p.id) })).sort((a, b) => b.overall - a.overall).slice(0, 60);

  const offers = game.transferMarket?.offers ?? [];
  const incomingOffers = game.transferMarket?.incomingOffers ?? [];
  const selectedOffer = offers.find(o => o.id === selectedOfferId) ?? offers[0] ?? null;
  const selectedIncoming = incomingOffers.find(o => o.id === selectedIncomingId) ?? incomingOffers[0] ?? null;

  function playerFor(offer) {
    return allOtherPlayers.find(p => p.id === offer.playerId) ?? players.find(p => p.id === offer.playerId) ?? { id: offer.playerId, name: offer.playerName, pos: "", age: "", _teamName: "" };
  }

  function openContractFormFor(offer) {
    setContractSalary(offer.salary ?? 8);
    setContractYears(offer.years ?? 3);
    setContractRole(offer.role ?? "Rotación");
  }

  function confirmIncomingSell() {
    if (!confirmSell) return;
    onIncomingOffer(confirmSell.offer, "accepted", confirmSell.player);
    setConfirmSell(null);
  }

  return (
    <div className="pc-tc-tab">
      <div className="pc-tc-sub-tabs">
        {[["listados", "Listados"], ["misofertas", `Mis ofertas (${offers.length})`], ["recibidas", `Ofertas recibidas (${incomingOffers.length})`]].map(([id, label]) => (
          <button key={id} className={`pc-tc-sub-tab${subTab === id ? " active" : ""}`} onClick={() => onSubTabChange(id)}>{label}</button>
        ))}
      </div>

      {subTab === "listados" && (
        <div className="pc-tc-listing-grid">
          {marketPlayers.length === 0 && <div className="pc-tc-empty">No hay jugadores en el mercado todavía. Usa Scouting para descubrir candidatos.</div>}
          {marketPlayers.map(p => {
            const free = isFreeAgent(p);
            const dealType = free ? "free" : p._listing?.type === "loan" ? "loan" : "transfer";
            const dealLabel = dealType === "free" ? "AGENTE LIBRE" : dealType === "loan" ? "CEDIBLE" : "TRANSFERIBLE";
            return (
              <div key={p.id} className="pc-tc-listing-card">
                <div className="pc-tc-listing-top">
                  <PlayerAvatar player={p} size={40} />
                  <div>
                    <div className="pc-tc-p-name">{p.name}</div>
                    <div className="pc-tc-p-sub">{free ? "Agente libre" : p._teamName} · {p.pos} · {p.age} años</div>
                  </div>
                </div>
                <div className={`pc-tc-deal-badge ${dealType}`}>{dealLabel}</div>
                {dealType === "loan" && <div className="pc-tc-loan-terms">{p._listing.wageCoverage}% sueldo · {p._listing.optionType === "none" ? "sin opción" : `opción ${fmt(p._listing.optionPrice)}`}</div>}
                <div className="pc-tc-listing-foot">
                  <span className="pc-tc-value-cell">{free ? "—" : fmt(transferCost(p))}</span>
                  <button className="btn-gold pc-tc-btn-sm" onClick={() => setOfferTarget(p)}>{free ? "Negociar" : "Oferta"}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {subTab === "misofertas" && (
        <div className="pc-tc-master-detail">
          <div className="pc-tc-offer-list">
            {offers.length === 0 && <div className="pc-tc-empty">No hay negociaciones abiertas.</div>}
            {offers.map(offer => {
              const status = OFFER_STATUS_LABELS[offer.status] ?? ["•", offer.status, "#6b7280"];
              return (
                <div key={offer.id} className={`pc-tc-offer-list-item${selectedOffer?.id === offer.id ? " selected" : ""}`} onClick={() => setSelectedOfferId(offer.id)}>
                  <div className="ol-name">{offer.playerName}</div>
                  <div className="ol-club">{fmt(offer.amount)} · {offer.dealType === "loan" ? "cesión" : "fichaje"}</div>
                  <span className="ol-status" style={{ background: `${status[2]}22`, color: status[2] }}>{status[0]} {status[1]}</span>
                </div>
              );
            })}
          </div>
          {selectedOffer && (() => {
            const offer = selectedOffer;
            const player = playerFor(offer);
            const steps = pipelineSteps(offer.status);
            const notes = offer.status === "pendingPlayer" || offer.status === "playerCounter" || offer.status === "playerRejected"
              ? playerAdvisorNotes(offer, negotiationBoost)
              : clubAdvisorNotes(offer, negotiationBoost);
            const statusText = {
              pendingClub: `El club responderá en ${offer.responseDays ?? 1} días.`,
              clubCounter: `El club ha hecho una contraoferta: ${fmt(offer.counterAmount)}`,
              rejected: "El club ha rechazado la oferta.",
              outbid: "Otro club ha superado tu oferta y se ha adelantado.",
              clubAccepted: "El club acepta. Ahora negocia con el jugador.",
              pendingPlayer: "El jugador estudia el contrato.",
              playerCounter: `El jugador solicita ${fmt(offer.counterSalary)}/sem.`,
              roleCounter: `El jugador exige un rol de ${offer.counterRole}.`,
              playerRejected: "El jugador rechaza las condiciones.",
              ready: "Acuerdo total alcanzado.",
              withdrawn: "Retirada.",
              completed: "Operación cerrada.",
            }[offer.status] ?? offer.status;
            return (
              <div className="pc-tc-detail-panel">
                <div className="pc-tc-offer-top">
                  <div>
                    <div className="pc-tc-offer-player">{offer.playerName}</div>
                    <div className="pc-tc-offer-club">{player._teamName}</div>
                  </div>
                  <div className="pc-tc-offer-amount">{fmt(offer.amount)}<span className="sub">tu oferta</span></div>
                </div>
                <div className="pc-tc-pipeline">{steps.map((s, i) => <div key={i} className={`pc-tc-step ${s}`} />)}</div>
                <div className="pc-tc-pipeline-labels"><span>Enviada</span><span>Respuesta club</span><span>Términos jugador</span></div>
                <div className="pc-tc-status-line">
                  <span className={`pc-tc-status-dot ${["clubAccepted", "ready", "completed"].includes(offer.status) ? "good" : ["rejected", "outbid", "playerRejected"].includes(offer.status) ? "bad" : "pending"}`} />
                  <span>{statusText}</span>
                </div>
                <AdvisorBox notes={notes} directorName={directorName} />
                <div className="pc-tc-offer-actions">
                  {offer.status === "clubCounter" && <button className="btn-gold" onClick={() => onAcceptClubCounter(offer.id)}>Aceptar {fmt(offer.counterAmount)}</button>}
                  {(offer.status === "clubAccepted" || offer.status === "playerRejected") && (
                    <ContractForm salary={contractSalary || offer.salary} years={contractYears || offer.years} role={contractRole || offer.role}
                      onSalary={setContractSalary} onYears={setContractYears} onRole={setContractRole}
                      onSubmit={() => onContractOffer(offer.id, contractSalary || offer.salary, contractYears || offer.years, contractRole || offer.role)}
                      label="Enviar contrato al jugador" />
                  )}
                  {offer.status === "playerCounter" && <button className="btn-gold" onClick={() => onAcceptPlayerCounter(offer.id)}>Aceptar petición salarial</button>}
                  {offer.status === "roleCounter" && <button className="btn-gold" onClick={() => onAcceptRoleCounter(offer.id)}>Aceptar rol solicitado</button>}
                  {offer.status === "ready" && <button className="btn-gold" onClick={() => onFinalizeOffer(offer, player)}>Cerrar {offer.dealType === "loan" ? "cesión" : "fichaje"}</button>}
                  {offer.status !== "ready" && <button className="btn-ghost" onClick={() => onWithdrawOffer(offer.id)}>Retirar</button>}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {subTab === "recibidas" && (
        <div className="pc-tc-master-detail">
          <div className="pc-tc-offer-list">
            {incomingOffers.length === 0 && <div className="pc-tc-empty">Marca jugadores como transferibles o cedibles para atraer ofertas.</div>}
            {incomingOffers.map(offer => {
              const buyer = teams.find(t => t.id === offer.toTeamId);
              return (
                <div key={offer.id} className={`pc-tc-offer-list-item${selectedIncoming?.id === offer.id ? " selected" : ""}`} onClick={() => setSelectedIncomingId(offer.id)}>
                  <div className="ol-name">{offer.playerName}</div>
                  <div className="ol-club">{buyer?.name} · {fmt(offer.amount)}</div>
                  <span className={`ol-status ${offer.status === "pending" ? "pending" : offer.status === "accepted" ? "good" : "bad"}`}>{offer.status === "pending" ? "Sin responder" : offer.status === "accepted" ? "Aceptada" : "Rechazada"}</span>
                </div>
              );
            })}
          </div>
          {selectedIncoming && (() => {
            const offer = selectedIncoming;
            const buyer = teams.find(t => t.id === offer.toTeamId);
            const player = players.find(p => p.id === offer.playerId);
            return (
              <div className="pc-tc-detail-panel">
                <div className="pc-tc-offer-top">
                  <div className="pc-tc-offer-top-buyer"><TeamCrest team={buyer} size={32} /><div><div className="pc-tc-offer-player">{offer.playerName}</div><div className="pc-tc-offer-club">Oferta de {buyer?.name}</div></div></div>
                  <div className="pc-tc-offer-amount">{fmt(offer.amount)}</div>
                </div>
                {offer.status === "pending" ? (
                  <>
                    <div className="pc-tc-status-line"><span className="pc-tc-status-dot pending" /><span>Pendiente de tu respuesta</span></div>
                    <div className="pc-tc-offer-actions">
                      <button className="btn-ghost" onClick={() => onIncomingOffer(offer, "rejected", player)}>Rechazar</button>
                      <button className="btn-gold" onClick={() => player && setConfirmSell({ player, offer })}>Aceptar</button>
                    </div>
                  </>
                ) : (
                  <div className="pc-tc-status-line"><span className={`pc-tc-status-dot ${offer.status === "accepted" ? "good" : "bad"}`} /><span>{offer.status === "accepted" ? "Aceptada" : "Rechazada"}</span></div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {offerTarget && <OfferModal player={offerTarget} onClose={() => setOfferTarget(null)} onClubOffer={(...args) => { onClubOffer(...args); onSubTabChange("misofertas"); }} onFreeAgentOffer={(...args) => { onFreeAgentOffer(...args); onSubTabChange("misofertas"); }} />}

      {confirmSell && createPortal(
        <div className="pc-tc-modal-overlay" onClick={() => setConfirmSell(null)}>
          <div className="pc-tc-modal" onClick={e => e.stopPropagation()}>
            <div className="pc-tc-p-name" style={{ color: "#ef4444", marginBottom: 8 }}>¿Vender a {confirmSell.player.name}?</div>
            <div className="pc-tc-p-sub" style={{ marginBottom: 16 }}>El club ofrece {fmt(confirmSell.offer.amount)}. Esta operación no se puede deshacer.</div>
            <div className="pc-tc-offer-actions">
              <button className="btn-ghost" onClick={() => setConfirmSell(null)}>Cancelar</button>
              <button className="btn-danger" onClick={confirmIncomingSell}>Confirmar venta</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
