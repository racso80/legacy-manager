import { useState } from "react";
import { getAcademyGraduates, getAcademyMetrics, getChiefScoutReport } from "../../youth/youthEngine.js";
import PCProspectCard from "./youth/PCProspectCard.jsx";
import PCAcademyStaffPanel from "./youth/PCAcademyStaffPanel.jsx";
import PCAcademyHistoryTab from "./youth/PCAcademyHistoryTab.jsx";

const TABS = [["current", "🌱 Juveniles"], ["history", "🏛 Históricos"]];
const fmt = value => value >= 1000 ? `€${(value / 1000).toFixed(1)}M` : `€${value}K`;

export default function PCYouthAcademyScreen({ game, teams, onPromote, onOpenPlayer }) {
  const [tab, setTab] = useState("current");
  const [feedback, setFeedback] = useState(null);
  const youth = game.youth ?? { players: [], promotions: [] };
  const intakeIds = new Set(youth.lastIntake ?? []);
  const canPromote = game.players.length < 30;
  const graduates = getAcademyGraduates(game);
  const sortedProspects = [...youth.players].sort((a, b) => b.potential - a.potential);
  const metrics = getAcademyMetrics(game);
  const chiefReportText = getChiefScoutReport(game);
  const annualReport = youth.annualReports?.[0];
  const youthChanges = Object.fromEntries((game.lastYouthTrainingReport?.changes ?? []).map(item => [item.playerId, item]));

  const avgPotential = youth.players.length
    ? Math.round(youth.players.reduce((sum, player) => sum + (player.potential ?? player.overall), 0) / youth.players.length)
    : null;

  const promotePlayer = (player) => {
    const result = onPromote?.(player.id);
    setFeedback(result ?? { ok: false, message: "No se ha podido promocionar al canterano." });
  };

  return (
    <div className="pc-yt-root">
      <div className="pc-yt-header"><h1>Cantera</h1></div>

      <div className="pc-yt-chief-report">
        <div className="pc-yt-chief-title">📋 Informe del jefe de cantera</div>
        <div className="pc-yt-chief-body">{chiefReportText}</div>
      </div>

      <div className="pc-yt-summary-row">
        <div className="pc-yt-summary-card">
          <div className="pc-yt-summary-label">Prospectos</div>
          <div className="pc-yt-summary-value">{youth.players.length}</div>
          {intakeIds.size > 0 && <div className="pc-yt-summary-sub">{intakeIds.size} nuevo{intakeIds.size === 1 ? "" : "s"} esta temporada</div>}
        </div>
        <div className="pc-yt-summary-card">
          <div className="pc-yt-summary-label">Media potencial</div>
          <div className="pc-yt-summary-value">{avgPotential ?? "—"}</div>
        </div>
        <div className="pc-yt-summary-card">
          <div className="pc-yt-summary-label">Promovidos (histórico)</div>
          <div className="pc-yt-summary-value good">{youth.promotions?.length ?? 0}</div>
        </div>
        <div className="pc-yt-summary-card">
          <div className="pc-yt-summary-label">Plantilla primer equipo</div>
          <div className={`pc-yt-summary-value${canPromote ? "" : " warn"}`}>{game.players.length}<span className="unit">/30</span></div>
        </div>
        <div className="pc-yt-summary-card">
          <div className="pc-yt-summary-label">Valor generado</div>
          <div className="pc-yt-summary-value good">{fmt(metrics.totalGeneratedValue)}</div>
        </div>
        <div className="pc-yt-summary-card">
          <div className="pc-yt-summary-label">Vendidos</div>
          <div className="pc-yt-summary-value">{metrics.sold}</div>
        </div>
      </div>

      <div className="pc-yt-tabs">
        {TABS.map(([id, label]) => (
          <div key={id} className={`pc-yt-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>
            {label} <span className="count">({id === "current" ? youth.players.length : graduates.length})</span>
          </div>
        ))}
      </div>

      {tab === "current" && (
        <>
          {feedback && (
            <div className={`pc-yt-feedback${feedback.ok ? " ok" : " warn"}`}>{feedback.message}</div>
          )}
          <div className="pc-yt-layout">
            {youth.players.length ? (
              <div className="pc-yt-prospect-grid">
                {sortedProspects.map(player => (
                  <PCProspectCard
                    key={player.id}
                    player={player}
                    isNew={intakeIds.has(player.id)}
                    canPromote={canPromote}
                    progress={youthChanges[player.id]}
                    onOpenPlayer={p => onOpenPlayer(p, sortedProspects)}
                    onPromote={promotePlayer}
                  />
                ))}
              </div>
            ) : <div className="pc-yt-empty">No hay juveniles disponibles actualmente.</div>}

            <div className="pc-yt-side-stack">
              {annualReport && (
                <div className="pc-yt-annual-card">
                  <div className="pc-yt-annual-title">Informe anual {annualReport.season}/{String(Number(annualReport.season) + 1).slice(-2)}</div>
                  <div className="pc-yt-annual-body">
                    {annualReport.promoted} jugadores promocionados · {annualReport.sold} vendidos<br />
                    Valor generado: <strong>{fmt(annualReport.generatedValue)}</strong>
                    {annualReport.standout && (
                      <><br />Promesa destacada: <strong className="good">{annualReport.standout.name} ({annualReport.standout.potential})</strong></>
                    )}
                  </div>
                </div>
              )}
              <PCAcademyStaffPanel game={game} teams={teams} />
            </div>
          </div>
        </>
      )}

      {tab === "history" && <PCAcademyHistoryTab graduates={graduates} onOpenPlayer={p => onOpenPlayer(p, graduates)} />}
    </div>
  );
}
