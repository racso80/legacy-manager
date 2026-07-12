import { ATTENTION_PRIORITIES } from "../../../attention/attentionEngine.js";

export default function PCAttentionItemCard({ item, onOpen, onDismiss }) {
  const priority = ATTENTION_PRIORITIES[item.priority] ?? ATTENTION_PRIORITIES.info;
  const fresh = item.status === "new";
  return (
    <div className={`pc-ac-item-card ${item.priority}`}>
      <div className="pc-ac-item-top">
        <span className={`pc-ac-priority-badge ${item.priority}`}>{priority.label}</span>
        {fresh && <span className="pc-ac-new-badge">NUEVO</span>}
      </div>
      {item.staff && <div className="pc-ac-item-staff">{item.staff.icon} {item.staff.role} · {item.staff.name}</div>}
      <div className="pc-ac-item-title">{item.title}</div>
      {item.summary && <div className="pc-ac-item-summary">{item.summary}</div>}
      <div className="pc-ac-item-actions">
        <button className={`pc-ac-btn ${item.priority === "info" ? "pc-ac-btn-ghost" : "pc-ac-btn-gold"}`} onClick={() => onOpen(item)}>
          {item.actionLabel ?? "Revisar"} →
        </button>
        <button className="pc-ac-btn pc-ac-btn-ghost" onClick={() => onDismiss(item)}>Ignorar</button>
      </div>
    </div>
  );
}
