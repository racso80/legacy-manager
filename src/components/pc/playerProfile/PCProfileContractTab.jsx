import { useState } from "react";
import { CONTRACT_ROLES, suggestedRenewalSalary } from "../../../contracts/contractEngine.js";

const fmtMoney = value => value >= 1000 ? `€${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}M` : `€${value}K`;

export default function PCProfileContractTab({ player, game, team, marketValue, activeRenewal, activeTransferOffer, isOwnPlayer, onRenewalOffer, onGoContracts, onPayClause }) {
  const [renewSalary, setRenewSalary] = useState(suggestedRenewalSalary(player));
  const [renewYears, setRenewYears] = useState(player.age >= 31 ? 2 : 3);
  const [renewRole, setRenewRole] = useState(player.squadRole ?? "Rotación");
  const releaseClause = player.releaseClause ?? Math.round(marketValue * 1.7);
  const lastYear = Number(player.contractEnd ?? 9999) <= Number(game.season) + 1;

  return (
    <div>
      <div className="pc-pp-info-grid three">
        <div className="pc-pp-info-card"><div className="pc-pp-info-card-title">Salario</div><div className="pc-pp-stat-value">€{player.salary ?? 16}K<span className="unit">/sem</span></div></div>
        <div className="pc-pp-info-card"><div className="pc-pp-info-card-title">Contrato</div><div className="pc-pp-stat-value">{player.contractEnd ?? "—"}</div></div>
        <div className="pc-pp-info-card"><div className="pc-pp-info-card-title">Rol</div><div className="pc-pp-stat-value">{player.squadRole ?? "Rotación"}</div></div>
        <div className="pc-pp-info-card"><div className="pc-pp-info-card-title">Cláusula</div><div className="pc-pp-stat-value">{fmtMoney(releaseClause)}</div></div>
        <div className="pc-pp-info-card"><div className="pc-pp-info-card-title">Valor de mercado</div><div className="pc-pp-stat-value">{fmtMoney(marketValue)}</div></div>
        <div className="pc-pp-info-card"><div className="pc-pp-info-card-title">Estado</div><div className="pc-pp-stat-value" style={{ color: lastYear ? "var(--pp-orange)" : "var(--pp-green)" }}>{lastYear ? "Último año" : "Estable"}</div></div>
      </div>

      {activeRenewal ? (
        <div className="pc-pp-contract-panel blue">
          <div className="pc-pp-contract-panel-title blue">Negociación activa</div>
          <div className="pc-pp-contract-panel-line">{activeRenewal.status}</div>
          <div className="pc-pp-contract-panel-sub">Oferta: €{activeRenewal.salary}K/sem · {activeRenewal.years} años · {activeRenewal.role}</div>
          <button className="pc-pp-btn gold full" onClick={onGoContracts}>Abrir Contratos</button>
        </div>
      ) : isOwnPlayer ? (
        <div className="pc-pp-contract-panel gold">
          <div className="pc-pp-contract-panel-title gold">Proponer renovación</div>
          <div className="pc-pp-renewal-form">
            <input type="number" value={renewSalary} onChange={event => setRenewSalary(Number(event.target.value))} />
            <select value={renewYears} onChange={event => setRenewYears(Number(event.target.value))}>{[1, 2, 3, 4, 5].map(year => <option key={year} value={year}>{year} años</option>)}</select>
            <select className="full" value={renewRole} onChange={event => setRenewRole(event.target.value)}>{CONTRACT_ROLES.map(role => <option key={role}>{role}</option>)}</select>
            <button className="pc-pp-btn gold full" onClick={() => onRenewalOffer?.(player.id, renewSalary, renewYears, renewRole)}>Enviar propuesta</button>
          </div>
          <div className="pc-pp-contract-hint">El jugador responderá en los próximos días. Puede aceptar, rechazar o pedir mejores condiciones.</div>
        </div>
      ) : (
        <div className="pc-pp-contract-panel muted">
          Solo puedes renovar jugadores de tu plantilla.
          {team?.id && Number.isFinite(player.releaseClause) && player.releaseClause > 0 && (
            <div className="pc-pp-clause-block">
              {activeTransferOffer ? (
                <div className="pc-pp-contract-panel-line blue">Ya hay una negociación en curso por este jugador. Continúa en Mercado.</div>
              ) : (
                <>
                  <div className="pc-pp-contract-panel-title gold">Cláusula de rescisión: {fmtMoney(player.releaseClause)}</div>
                  <div className="pc-pp-contract-hint">Pagarla obliga al club a aceptar de inmediato. Después tendrás que negociar el contrato personal con el jugador en Mercado.</div>
                  <button className="pc-pp-btn gold full" onClick={() => onPayClause?.(player, team.id)}>💰 Pagar cláusula ({fmtMoney(player.releaseClause)})</button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
