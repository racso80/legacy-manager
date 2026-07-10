import { useState } from "react";
import { getMedicalAlerts } from "../../state/gameStateSelectors.js";
import PCPatientCard from "./medical/PCPatientCard.jsx";
import PCRiskRow from "./medical/PCRiskRow.jsx";
import PCStaffImpact from "./medical/PCStaffImpact.jsx";

const TABS = [["patients", "🏥 Pacientes"], ["prevention", "🛡 Prevención"]];

export default function PCMedicalScreen({ game, teams, onOpenPlayer }) {
  const [tab, setTab] = useState("patients");

  // Mismo selector y mismos umbrales que MedicalCenterScreen.jsx (móvil) — no
  // se reimplementa el filtrado, solo se presenta distinto.
  const assessed = getMedicalAlerts(game, { riskThreshold: 35, loadThreshold: 55 });
  const patients = assessed.filter(item => item.state.isInjured || item.state.isRecovering);
  const warnings = assessed.filter(item => !(item.state.isInjured || item.state.isRecovering));

  const injuredCount = patients.filter(item => item.state.isInjured).length;
  const recoveringCount = patients.filter(item => item.state.isRecovering).length;
  const severeCount = patients.filter(item => item.state.isInjured && (item.player.medical?.totalDays ?? 0) >= 60).length;
  const highRiskCount = warnings.filter(item => ["high", "critical"].includes(item.state.riskLevel?.id)).length;
  const totalPlayers = game.players.length;
  const availableCount = totalPlayers - patients.length;

  return (
    <div className="pc-md-root">
      <div className="pc-md-header"><h1>Centro Médico</h1></div>

      <div className="pc-md-summary-row">
        <div className="pc-md-summary-card">
          <div className="pc-md-summary-label">Lesionados</div>
          <div className="pc-md-summary-value danger">{injuredCount}</div>
          {severeCount > 0 && <div className="pc-md-summary-sub">{severeCount} grave{severeCount === 1 ? "" : "s"} (60+ días)</div>}
        </div>
        <div className="pc-md-summary-card">
          <div className="pc-md-summary-label">En recuperación</div>
          <div className="pc-md-summary-value warn">{recoveringCount}</div>
        </div>
        <div className="pc-md-summary-card">
          <div className="pc-md-summary-label">Riesgo alto/crítico</div>
          <div className="pc-md-summary-value warn">{highRiskCount}</div>
          <div className="pc-md-summary-sub">Sanos, pero vigilar</div>
        </div>
        <div className="pc-md-summary-card">
          <div className="pc-md-summary-label">Disponibles</div>
          <div className="pc-md-summary-value good">{availableCount}</div>
          <div className="pc-md-summary-sub">de {totalPlayers} jugadores</div>
        </div>
      </div>

      <div className="pc-md-tabs">
        {TABS.map(([id, label]) => (
          <div key={id} className={`pc-md-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>
            {label} <span className="count">({id === "patients" ? patients.length : warnings.length})</span>
          </div>
        ))}
      </div>

      {tab === "patients" && (
        <>
          <div className="pc-md-section-label">Lesionados y en recuperación</div>
          {patients.length ? (
            <div className="pc-md-patient-grid">
              {patients.map(({ player }) => (
                <PCPatientCard key={player.id} player={player} teamId={game.teamId} onOpenPlayer={p => onOpenPlayer(p, game.teamId, patients.map(item => item.player))} />
              ))}
            </div>
          ) : <div className="pc-md-empty">🟢 Todos los jugadores están disponibles.</div>}
        </>
      )}

      {tab === "prevention" && (
        <>
          <div className="pc-md-section-label">Jugadores sanos con riesgo elevado</div>
          {warnings.length ? (
            <div className="pc-md-risk-list">
              {warnings.map(item => (
                <PCRiskRow key={item.player.id} item={item} game={game} onOpenPlayer={p => onOpenPlayer(p, game.teamId, warnings.map(w => w.player))} />
              ))}
            </div>
          ) : <div className="pc-md-empty">No hay alertas de sobrecarga.</div>}
        </>
      )}

      <PCStaffImpact game={game} teams={teams} />
    </div>
  );
}
