import { useEffect, useState } from "react";

// conversation.portrait ya viene resuelto por conversationEngine.js (playerFace()),
// y el actor "staff" (incl. Capitán) nunca trae portrait — solo icono fijo.
const STAFF_ICONS = {
  "Capitán": "❤️",
  "Responsable de prensa": "🎙️",
  "Director deportivo": "👔",
  "Preparador físico": "🏋️",
};

export default function PCConversationAvatar({ conversation, size = 40 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [conversation?.portrait]);
  const icon = conversation.actorType === "player" ? "👤" : STAFF_ICONS[conversation.actorName] ?? "🧑‍💼";
  const style = { width: size, height: size, fontSize: Math.round(size * .5) };

  if (conversation.portrait && !failed) {
    return (
      <div className="pc-lr-avatar" style={style}>
        <img src={conversation.portrait} alt={conversation.actorName} onError={() => setFailed(true)} />
      </div>
    );
  }
  return <div className="pc-lr-avatar pc-lr-avatar-icon" style={style}>{icon}</div>;
}
