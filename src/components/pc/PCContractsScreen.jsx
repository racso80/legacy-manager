import { useState } from "react";
import { getMarketValue } from "../../players/playerProfile.js";
import PCContractCard from "./contracts/PCContractCard.jsx";
import PCRenewalForm from "./contracts/PCRenewalForm.jsx";
import PCRenewalsPanel from "./contracts/PCRenewalsPanel.jsx";

const fmt = value => value >= 1000 ? `€${(value / 1000).toFixed(1)}M` : `€${Math.round(value)}K`;

const FILTERS = [
  ["all", "Todos"],
  ["urgent", "Esta temporada"],
  ["soon", "Próxima temporada"],
  ["safe", "2+ temporadas"],
];

// contractEnd solo tiene precisión de año (confirmado: no existe dato a nivel
// de jornada), así que los cubos son año-a-año, no las bandas finas de FM.
function bucketOf(player, season) {
  const end = Number(player.contractEnd ?? 9999);
  const cur = Number(season);
  if (end <= cur) return "urgent";
  if (end === cur + 1) return "soon";
  return "safe";
}

// Indicador informativo "podría ser objetivo de otro club" — Estrella/Titular
// con cláusula en el tercio inferior de la banda 1.5x-1.9x que usa
// getReleaseClauseValue() (playerProfile.js), es decir barata en relación a
// su propio valor de mercado, no en relación a la plantilla.
function isVulnerableClause(player) {
  if (!["Estrella", "Titular"].includes(player.squadRole)) return false;
  const marketValue = getMarketValue(player);
  if (!marketValue || !player.releaseClause) return false;
  return player.releaseClause / marketValue <= 1.65;
}

export default function PCContractsScreen({ game, onOpenPlayer, onCreateRenewal, onAcceptCounter, onComplete, onWithdraw }) {
  const [filter, setFilter] = useState("all");
  const [renewTarget, setRenewTarget] = useState(null);
  const [selectedRenewalId, setSelectedRenewalId] = useState(null);

  const players = [...game.players].sort((a, b) => Number(a.contractEnd ?? 9999) - Number(b.contractEnd ?? 9999) || (b.overall - a.overall));
  const renewals = game.contracts?.renewals ?? [];
  const activeRenewals = renewals.filter(item => !["completed", "withdrawn", "rejected"].includes(item.status));
  const activeByPlayer = new Map(activeRenewals.map(item => [item.playerId, item]));

  const bucketed = players.map(player => ({ player, bucket: bucketOf(player, game.season) }));
  const counts = {
    all: bucketed.length,
    urgent: bucketed.filter(item => item.bucket === "urgent").length,
    soon: bucketed.filter(item => item.bucket === "soon").length,
    safe: bucketed.filter(item => item.bucket === "safe").length,
  };
  const shown = filter === "all" ? bucketed : bucketed.filter(item => item.bucket === filter);
  const totalSalary = players.reduce((sum, player) => sum + (player.salary ?? 0), 0);

  return (
    <div className="pc-ct-root">
      <div className="pc-ct-header"><h1>Contratos</h1></div>

      <div className="pc-ct-summary-row">
        <div className="pc-ct-summary-card">
          <div className="pc-ct-summary-label">Masa salarial</div>
          <div className="pc-ct-summary-value">{fmt(totalSalary)}<span className="unit">/sem</span></div>
          <div className="pc-ct-summary-sub">{players.length} jugadores contratados</div>
        </div>
        <div className="pc-ct-summary-card">
          <div className="pc-ct-summary-label">Vencen esta temporada</div>
          <div className="pc-ct-summary-value warn">{counts.urgent}</div>
          <div className="pc-ct-summary-sub">Riesgo de perderlos gratis</div>
        </div>
        <div className="pc-ct-summary-card">
          <div className="pc-ct-summary-label">Vencen próxima temporada</div>
          <div className="pc-ct-summary-value">{counts.soon}</div>
        </div>
        <div className="pc-ct-summary-card">
          <div className="pc-ct-summary-label">Renovaciones activas</div>
          <div className="pc-ct-summary-value">{activeRenewals.length}</div>
          <div className="pc-ct-summary-sub">En negociación</div>
        </div>
      </div>

      <div className="pc-ct-filter-row">
        {FILTERS.map(([id, label]) => (
          <div key={id} className={`pc-ct-filter-pill${filter === id ? " active" : ""}`} onClick={() => setFilter(id)}>
            {label} <span className="count">{counts[id]}</span>
          </div>
        ))}
      </div>

      <div className="pc-ct-layout">
        <div className="pc-ct-player-grid">
          {shown.map(({ player, bucket }) => (
            <PCContractCard
              key={player.id}
              player={player}
              bucket={bucket}
              activeRenewal={activeByPlayer.get(player.id)}
              vulnerable={isVulnerableClause(player)}
              onOpenPlayer={onOpenPlayer}
              onRenew={() => setRenewTarget(player)}
              onViewRenewal={id => setSelectedRenewalId(id)}
            />
          ))}
          {!shown.length && <div className="pc-ct-empty">No hay jugadores en esta vista.</div>}
        </div>

        <PCRenewalsPanel
          renewals={activeRenewals}
          selectedId={selectedRenewalId}
          onSelect={setSelectedRenewalId}
          onAcceptCounter={onAcceptCounter}
          onComplete={onComplete}
          onWithdraw={onWithdraw}
        />
      </div>

      {renewTarget && (
        <PCRenewalForm
          player={renewTarget}
          onClose={() => setRenewTarget(null)}
          onSubmit={(salary, years, role) => { onCreateRenewal(renewTarget.id, salary, years, role); setRenewTarget(null); }}
        />
      )}
    </div>
  );
}
