import { useState } from "react";
import { getAcademyGraduates } from "../../youth/youthEngine.js";
import PCProspectCard from "./youth/PCProspectCard.jsx";
import PCAcademyStaffPanel from "./youth/PCAcademyStaffPanel.jsx";
import PCAcademyHistoryTab from "./youth/PCAcademyHistoryTab.jsx";

const TABS = [["current", "🌱 Juveniles"], ["history", "🏛 Históricos"]];

export default function PCYouthAcademyScreen({ game, teams, onPromote, onOpenPlayer }) {
  const [tab, setTab] = useState("current");
  const [feedback, setFeedback] = useState(null);
  const youth = game.youth ?? { players: [], promotions: [] };
  const intakeIds = new Set(youth.lastIntake ?? []);
  const canPromote = game.players.length < 30;
  const graduates = getAcademyGraduates(game);

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
                {[...youth.players].sort((a, b) => b.potential - a.potential).map(player => (
                  <PCProspectCard
                    key={player.id}
                    player={player}
                    isNew={intakeIds.has(player.id)}
                    canPromote={canPromote}
                    onOpenPlayer={onOpenPlayer}
                    onPromote={promotePlayer}
                  />
                ))}
              </div>
            ) : <div className="pc-yt-empty">No hay juveniles disponibles actualmente.</div>}

            <PCAcademyStaffPanel game={game} teams={teams} />
          </div>
        </>
      )}

      {tab === "history" && <PCAcademyHistoryTab graduates={graduates} onOpenPlayer={onOpenPlayer} />}
    </div>
  );
}
