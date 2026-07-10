import { createPortal } from "react-dom";
import PCConversationAvatar from "./PCConversationAvatar.jsx";

const EFFECT_LABELS = {
  morale: "Moral",
  trust: "Confianza",
  motivation: "Motivación",
  squadMorale: "Moral del equipo",
  squadTrust: "Confianza del equipo",
};

function OptionEffects({ effects = {} }) {
  const entries = Object.entries(effects).filter(([key]) => EFFECT_LABELS[key]);
  if (!entries.length) return null;
  return (
    <div className="pc-lr-option-effects">
      {entries.map(([key, value]) => (
        <span key={key} className={`pc-lr-effect-chip${value < 0 ? " neg" : ""}${key.startsWith("squad") ? " squad" : ""}`}>
          {EFFECT_LABELS[key]} {value > 0 ? "+" : ""}{value}
        </span>
      ))}
    </div>
  );
}

// Portal a document.body — igual que PCRenewalForm.jsx: dentro del PC shell,
// .screen-enter deja un transform en un ancestro que reancla position:fixed,
// así que todas las var(--lr-*) usadas en el CSS de este modal llevan su
// fallback explícito.
export default function PCConversationModal({ conversation, onRespond, onClose }) {
  if (!conversation) return null;
  const isTeamTalk = conversation.actorName === "Capitán";

  return createPortal(
    <div className="pc-lr-modal-overlay" onClick={onClose}>
      <div className="pc-lr-modal" onClick={e => e.stopPropagation()}>
        <div className="pc-lr-modal-head">
          <PCConversationAvatar conversation={conversation} size={52} />
          <div>
            <div className="pc-lr-modal-name">
              {conversation.actorName}
              {isTeamTalk && <span className="pc-lr-team-badge">👥 Charla de equipo</span>}
            </div>
            <div className="pc-lr-modal-role">{conversation.role}</div>
          </div>
        </div>

        <div className="pc-lr-modal-title">{conversation.title}</div>
        <div className="pc-lr-modal-opening">"{conversation.opening}"</div>
        {conversation.motive && <div className="pc-lr-modal-motive">{conversation.motive}</div>}

        <div className="pc-lr-modal-options">
          {conversation.options.map(option => (
            <button key={option.id} className="pc-lr-option-btn" onClick={() => onRespond(option.id)}>
              <span className="pc-lr-option-label">{option.label}</span>
              <OptionEffects effects={option.effects} />
            </button>
          ))}
        </div>

        <button className="btn-ghost pc-lr-modal-close" onClick={onClose}>Cerrar sin responder</button>
      </div>
    </div>,
    document.body
  );
}
