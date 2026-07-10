import PCConversationAvatar from "./PCConversationAvatar.jsx";

const PRIORITY_META = {
  urgent: { label: "Urgente", color: "#ef4444" },
  important: { label: "Importante", color: "#f59e0b" },
  info: { label: "Info", color: "#22c55e" },
};

export default function PCConversationCard({ conversation, onClick }) {
  const priority = PRIORITY_META[conversation.priority] ?? PRIORITY_META.important;
  const isTeamTalk = conversation.actorName === "Capitán";

  return (
    <button className="pc-lr-conv-card" onClick={onClick}>
      <PCConversationAvatar conversation={conversation} />
      <div className="pc-lr-conv-body">
        <div className="pc-lr-conv-top">
          <span className="pc-lr-conv-name">{conversation.actorName}</span>
          {isTeamTalk && <span className="pc-lr-team-badge">👥 Equipo</span>}
          <span className="pc-lr-priority-dot" style={{ background: priority.color }} title={priority.label} />
        </div>
        <div className="pc-lr-conv-title">{conversation.title}</div>
        <div className="pc-lr-conv-opening">{conversation.opening}</div>
      </div>
    </button>
  );
}
