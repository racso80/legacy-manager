import { useState } from "react";
import { ATTENTION_CATEGORIES, CATEGORY_ORDER, getAttentionCount, groupAttentionItems } from "../../attention/attentionEngine.js";
import PCAttentionCategorySection from "./attention/PCAttentionCategorySection.jsx";

export default function PCAttentionCenterScreen({ items = [], onOpenItem, onDismissItem }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const urgentCount = getAttentionCount(items);
  const critical = items.filter(item => item.priority === "critical").length;
  const filteredItems = activeCategory === "all" ? items : items.filter(item => item.category === activeCategory);
  const groups = groupAttentionItems(filteredItems);

  return (
    <div className="pc-ac-root">
      <div className="pc-ac-header">
        <h1>Centro de Atención</h1>
        <div className="pc-ac-sub">Tu bandeja prioritaria: lesiones, ofertas, contratos, directiva y decisiones que conviene atender.</div>
      </div>

      <div className="pc-ac-summary-row">
        <div className="pc-ac-summary-card">
          <div className="pc-ac-summary-value">{items.length}</div>
          <div className="pc-ac-summary-label">Total</div>
        </div>
        <div className="pc-ac-summary-card">
          <div className="pc-ac-summary-value" style={{ color: urgentCount ? "var(--ac-orange, #f59e0b)" : "var(--ac-green, #22c55e)" }}>{urgentCount}</div>
          <div className="pc-ac-summary-label">Urgentes</div>
        </div>
        <div className="pc-ac-summary-card">
          <div className="pc-ac-summary-value" style={{ color: critical ? "var(--ac-red, #ef4444)" : "var(--ac-green, #22c55e)" }}>{critical}</div>
          <div className="pc-ac-summary-label">Críticos</div>
        </div>
      </div>

      <div className="pc-ac-filter-row">
        <div className={`pc-ac-filter-pill${activeCategory === "all" ? " active" : ""}`} onClick={() => setActiveCategory("all")}>Todos</div>
        {CATEGORY_ORDER.map(category => {
          const meta = ATTENTION_CATEGORIES[category];
          return (
            <div key={category} className={`pc-ac-filter-pill${activeCategory === category ? " active" : ""}`} onClick={() => setActiveCategory(category)}>
              {meta.icon} {meta.label}
            </div>
          );
        })}
      </div>

      {!items.length ? (
        <div className="pc-ac-empty-state">
          <div className="pc-ac-empty-icon">✅</div>
          <div className="pc-ac-empty-title">Todo bajo control</div>
          <div className="pc-ac-empty-desc">No hay asuntos urgentes ni decisiones pendientes ahora mismo.</div>
        </div>
      ) : groups.length ? (
        groups.map(group => (
          <PCAttentionCategorySection key={group.category} meta={group.meta} items={group.items} onOpen={onOpenItem} onDismiss={onDismissItem} />
        ))
      ) : (
        <div className="pc-ac-empty-state">
          <div className="pc-ac-empty-desc">Sin elementos en esta categoría.</div>
        </div>
      )}
    </div>
  );
}
