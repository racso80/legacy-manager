import PCAttentionItemCard from "./PCAttentionItemCard.jsx";

export default function PCAttentionCategorySection({ meta, items, onOpen, onDismiss }) {
  return (
    <div className="pc-ac-category-block">
      <div className="pc-ac-category-head">
        <span>{meta.icon}</span>
        <span style={{ color: meta.accent }}>{meta.label.toUpperCase()}</span>
        <span className="pc-ac-category-count">· {items.length}</span>
      </div>
      <div className="pc-ac-item-grid">
        {items.map(item => <PCAttentionItemCard key={item.id} item={item} onOpen={onOpen} onDismiss={onDismiss} />)}
      </div>
    </div>
  );
}
