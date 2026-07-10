import { useState } from "react";
import { ensureSquadMorale, getLockerRoomSummary } from "../../morale/moraleEngine.js";
import PCConversationCard from "./lockerRoom/PCConversationCard.jsx";
import PCConversationModal from "./lockerRoom/PCConversationModal.jsx";
import PCLeadersPanel from "./lockerRoom/PCLeadersPanel.jsx";
import PCRosterTab from "./lockerRoom/PCRosterTab.jsx";

const TABS = [["conversations", "🗣️ Conversaciones"], ["roster", "👥 Plantilla"]];

// Vestuario solo muestra conversaciones del propio grupo: charlas 1:1 con
// jugadores y la reunión de equipo del capitán. getActiveConversations()
// también devuelve ofertas de mercado, prensa o riesgo médico — esas
// pertenecen a Mercado/Noticias/Médico, no al vestuario.
const isLockerRoomConversation = conversation => conversation.actorType === "player" || conversation.actorName === "Capitán";

export default function PCLockerRoomScreen({ game, conversations, onRespond, onOpenPlayer }) {
  const [tab, setTab] = useState("conversations");
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  const squad = ensureSquadMorale(game.players ?? [], game.season);
  const summary = getLockerRoomSummary(squad);
  const leaderIds = new Set(summary.leaders.map(player => player.id));

  const lockerConversations = conversations.filter(isLockerRoomConversation);
  const individual = lockerConversations.filter(item => item.actorType === "player");
  const teamTalk = lockerConversations.filter(item => item.actorName === "Capitán");
  const selectedConversation = lockerConversations.find(item => item.id === selectedConversationId) ?? null;

  const atmosphereColor = summary.atmosphere === "positivo" ? "#22c55e" : summary.atmosphere === "tenso" ? "#ef4444" : "#c9a84c";

  const handleRespond = responseId => {
    if (!selectedConversation) return;
    onRespond(selectedConversation.id, responseId);
    setSelectedConversationId(null);
  };

  return (
    <div className="pc-lr-root">
      <div className="pc-lr-header"><h1>Vestuario</h1></div>

      <div className="pc-lr-summary-row">
        <div className="pc-lr-summary-card">
          <div className="pc-lr-summary-label">Ambiente</div>
          <div className="pc-lr-summary-value" style={{ color: atmosphereColor, textTransform: "capitalize" }}>{summary.atmosphere}</div>
        </div>
        <div className="pc-lr-summary-card">
          <div className="pc-lr-summary-label">Moral media</div>
          <div className="pc-lr-summary-value">{summary.avgMorale}</div>
        </div>
        <div className="pc-lr-summary-card">
          <div className="pc-lr-summary-label">Felicidad media</div>
          <div className="pc-lr-summary-value">{summary.avgHappiness}</div>
        </div>
        <div className="pc-lr-summary-card">
          <div className="pc-lr-summary-label">Confianza media</div>
          <div className="pc-lr-summary-value">{summary.avgTrust}</div>
        </div>
      </div>

      <div className="pc-lr-tabs">
        {TABS.map(([id, label]) => (
          <div key={id} className={`pc-lr-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>
            {label}{id === "conversations" && lockerConversations.length > 0 ? ` (${lockerConversations.length})` : ""}
          </div>
        ))}
      </div>

      {tab === "conversations" && (
        <div className="pc-lr-layout">
          <div className="pc-lr-queue">
            {lockerConversations.length === 0 ? (
              <div className="pc-lr-empty">El vestuario está tranquilo. No hay conversaciones pendientes.</div>
            ) : (
              <>
                {teamTalk.length > 0 && (
                  <>
                    <div className="pc-lr-section-label">Charla de equipo</div>
                    <div className="pc-lr-conv-list">
                      {teamTalk.map(conversation => (
                        <PCConversationCard key={conversation.id} conversation={conversation} onClick={() => setSelectedConversationId(conversation.id)} />
                      ))}
                    </div>
                  </>
                )}
                {individual.length > 0 && (
                  <>
                    <div className="pc-lr-section-label">Conversaciones individuales</div>
                    <div className="pc-lr-conv-list">
                      {individual.map(conversation => (
                        <PCConversationCard key={conversation.id} conversation={conversation} onClick={() => setSelectedConversationId(conversation.id)} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <PCLeadersPanel players={squad} summary={summary} onOpenPlayer={p => onOpenPlayer(p, squad)} />
        </div>
      )}

      {tab === "roster" && (
        <PCRosterTab players={squad} conversations={lockerConversations} leaderIds={leaderIds} onOpenPlayer={p => onOpenPlayer(p, squad)} onOpenConversation={setSelectedConversationId} />
      )}

      <PCConversationModal conversation={selectedConversation} onRespond={handleRespond} onClose={() => setSelectedConversationId(null)} />
    </div>
  );
}
