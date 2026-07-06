import { OFFER_STATUS_LABELS } from "./PCMarketTab.jsx";

const fmt = v => v >= 1000 ? `€${(v / 1000).toFixed(1)}M` : `€${Math.round(v)}K`;

export default function PCRecruitmentHub({ game, teams, budgetSnapshot, onGoTo }) {
  const offers = game.transferMarket?.offers ?? [];
  const incomingOffers = game.transferMarket?.incomingOffers ?? [];
  const scouting = game.scouting ?? { scouts: [], missions: [], reports: [], watchlist: [] };
  const activeMissions = scouting.missions.filter(m => m.status === "active");
  const watchReports = scouting.reports.filter(r => scouting.watchlist.includes(r.id));
  const spentThisSeason = (game.transfers ?? []).filter(t => ["buy", "loanIn"].includes(t.type) && String(t.season) === String(game.season)).reduce((s, t) => s + (t.cost ?? 0), 0);
  const transferables = (game.players ?? []).filter(p => p.marketStatus === "transfer").length;
  const loanables = (game.players ?? []).filter(p => p.marketStatus === "loan").length;

  return (
    <div className="pc-tc-hub-grid">
      <div className="pc-tc-hub-card">
        <div className="pc-tc-hub-card-head"><span className="pc-tc-hub-title">Presupuesto de fichajes</span></div>
        <div className="pc-tc-hub-big">{fmt(budgetSnapshot.transferBudget)}</div>
        <div className="pc-tc-hub-sub">de {fmt(budgetSnapshot.baseBudget)} · {fmt(spentThisSeason)} gastados esta temporada</div>
      </div>

      <div className="pc-tc-hub-card">
        <div className="pc-tc-hub-card-head">
          <span className="pc-tc-hub-title">Mis ofertas</span>
          <span className="pc-tc-hub-link" onClick={() => onGoTo("mercado", "misofertas")}>Ver todas →</span>
        </div>
        {offers.length === 0 && <div className="pc-tc-hub-empty">No hay negociaciones abiertas.</div>}
        {offers.slice(0, 3).map(offer => {
          const status = OFFER_STATUS_LABELS[offer.status] ?? ["•", offer.status];
          return (
            <div key={offer.id} className="pc-tc-hub-row">
              <div><div className="r-name">{offer.playerName}</div><div className="r-meta">{status[1]}</div></div>
              <div className="r-value">{fmt(offer.amount)}</div>
            </div>
          );
        })}
      </div>

      <div className="pc-tc-hub-card">
        <div className="pc-tc-hub-card-head">
          <span className="pc-tc-hub-title">Ofertas recibidas</span>
          <span className="pc-tc-hub-link" onClick={() => onGoTo("mercado", "recibidas")}>Ver todas →</span>
        </div>
        {incomingOffers.length === 0 && <div className="pc-tc-hub-empty">Marca jugadores como transferibles o cedibles para atraer ofertas.</div>}
        {incomingOffers.slice(0, 3).map(offer => {
          const buyer = teams.find(t => t.id === offer.toTeamId);
          return (
            <div key={offer.id} className="pc-tc-hub-row">
              <div><div className="r-name">{offer.playerName}</div><div className="r-meta">{buyer?.name} · {offer.status === "pending" ? "sin responder" : offer.status}</div></div>
              <div className="r-value">{fmt(offer.amount)}</div>
            </div>
          );
        })}
      </div>

      <div className="pc-tc-hub-card">
        <div className="pc-tc-hub-card-head">
          <span className="pc-tc-hub-title">Scouting</span>
          <span className="pc-tc-hub-link" onClick={() => onGoTo("scouting", "nueva")}>Ver todo →</span>
        </div>
        <div className="pc-tc-hub-big">{activeMissions.length} <span className="unit">misiones activas</span></div>
        {scouting.scouts.length === 0 && <div className="pc-tc-hub-empty">Sin ojeadores todavía.</div>}
        {scouting.scouts.slice(0, 3).map(s => {
          const mission = scouting.missions.find(m => m.scoutId === s.id && m.status === "active");
          return (
            <div key={s.id} className="pc-tc-hub-row">
              <div><div className="r-name">{s.name}</div><div className="r-meta">{mission ? `En misión · ${mission.progress}% completado` : "Disponible"}</div></div>
            </div>
          );
        })}
      </div>

      <div className="pc-tc-hub-card">
        <div className="pc-tc-hub-card-head">
          <span className="pc-tc-hub-title">Seguimiento</span>
          <span className="pc-tc-hub-link" onClick={() => onGoTo("scouting", "seguimiento")}>Ver todo →</span>
        </div>
        <div className="pc-tc-hub-big">{watchReports.length} <span className="unit">jugadores</span></div>
        <div className="pc-tc-hub-sub">{watchReports.length ? watchReports.map(r => `${r.player.name} (${r.teamName})`).join(" · ") : "Sin jugadores en seguimiento."}</div>
      </div>

      <div className="pc-tc-hub-card">
        <div className="pc-tc-hub-card-head"><span className="pc-tc-hub-title">Tu plantilla en el mercado</span></div>
        <div className="pc-tc-hub-row"><div><div className="r-name">📌 Transferibles</div></div><div className="r-value">{transferables}</div></div>
        <div className="pc-tc-hub-row"><div><div className="r-name">🔁 Cedibles</div></div><div className="r-value">{loanables}</div></div>
        <div className="pc-tc-hub-sub">Marcados desde la Plantilla · pestaña Vender</div>
      </div>
    </div>
  );
}
