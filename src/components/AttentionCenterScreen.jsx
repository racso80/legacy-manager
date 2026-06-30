import { ATTENTION_CATEGORIES, ATTENTION_PRIORITIES, getAttentionCount, groupAttentionItems } from "../attention/attentionEngine.js";
import { COLORS } from "../utils/tokens.js";

function EmptyState() {
  return (
    <div style={{ margin:14, background:"linear-gradient(145deg,rgba(34,197,94,.12),#161a24)", border:"1px solid rgba(34,197,94,.22)", borderRadius:14, padding:22, textAlign:"center" }}>
      <div style={{ fontSize:34, marginBottom:8 }}>✅</div>
      <div style={{ color:"#e8eaf0", fontSize:17, fontWeight:900 }}>Todo bajo control</div>
      <div style={{ color:COLORS.textDim, fontSize:11, lineHeight:1.5, marginTop:6 }}>No hay asuntos urgentes ni decisiones pendientes ahora mismo.</div>
    </div>
  );
}

function ItemCard({ item, onOpen, onDismiss }) {
  const priority = ATTENTION_PRIORITIES[item.priority] ?? ATTENTION_PRIORITIES.info;
  const category = ATTENTION_CATEGORIES[item.category] ?? ATTENTION_CATEGORIES.match;
  const fresh = item.status === "new";
  const statusLabel = item.status === "waiting" ? "EN ESPERA" : item.status === "seen" ? "VISTO" : null;
  return (
    <div style={{ background:"#161a24", border:`1px solid ${priority.color}22`, borderLeft:`3px solid ${priority.color}`, borderRadius:11, padding:11, boxShadow:fresh?"0 8px 20px rgba(0,0,0,.18)":"none" }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:9, background:`${category.accent}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{category.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
            <span style={{ color:priority.color, fontSize:9, fontWeight:900 }}>{priority.icon} {priority.label.toUpperCase()}</span>
            {fresh && <span style={{ color:"#1a1200", background:"#c9a84c", borderRadius:99, padding:"2px 6px", fontSize:8, fontWeight:900 }}>NUEVO</span>}
            {statusLabel && <span style={{ color:"#9ca3af", background:"rgba(255,255,255,.06)", borderRadius:99, padding:"2px 6px", fontSize:8, fontWeight:900 }}>{statusLabel}</span>}
          </div>
          {item.staff && <div style={{ color:category.accent, fontSize:9, fontWeight:850, marginBottom:4 }}>{item.staff.icon} {item.staff.role} · {item.staff.name}</div>}
          <div style={{ color:"#e8eaf0", fontSize:12, fontWeight:800, lineHeight:1.35 }}>{item.title}</div>
          {item.summary && <div style={{ color:COLORS.textDim, fontSize:10, lineHeight:1.45, marginTop:4 }}>{item.summary}</div>}
        </div>
      </div>
      <div style={{ display:"flex", gap:7, marginTop:10 }}>
        <button onClick={() => onOpen(item)} className={item.priority === "info" ? "btn-ghost" : "btn-gold"} style={{ flex:1, padding:9, borderRadius:8, fontSize:11 }}>
          {item.actionLabel ?? "Revisar"} →
        </button>
        <button onClick={() => onDismiss(item)} style={{ width:88, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", color:COLORS.muted, borderRadius:8, fontSize:10, fontWeight:700, cursor:"pointer" }}>
          Ignorar
        </button>
      </div>
    </div>
  );
}

export default function AttentionCenterScreen({ items = [], onOpenItem, onDismissItem }) {
  const groups = groupAttentionItems(items);
  const urgentCount = getAttentionCount(items);
  const critical = items.filter(item => item.priority === "critical").length;
  return (
    <div className="attention-enter" style={{ flex:1, overflowY:"auto", padding:"14px 14px 24px" }}>
      <div style={{ background:"radial-gradient(circle at 90% 0%,rgba(201,168,76,.24),transparent 42%),linear-gradient(145deg,#1c1b17,#12151d)", border:"1px solid rgba(201,168,76,.28)", borderRadius:15, padding:16, marginBottom:14 }}>
        <div style={{ fontSize:10, color:"#c9a84c", fontWeight:900, letterSpacing:"1px" }}>📥 CENTRO DE ATENCIÓN</div>
        <div style={{ fontSize:20, color:"#fff", fontWeight:900, marginTop:5 }}>Asuntos pendientes</div>
        <div style={{ color:COLORS.textDim, fontSize:11, lineHeight:1.5, marginTop:5 }}>
          Tu bandeja prioritaria: lesiones, ofertas, contratos, directiva y decisiones que conviene atender.
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7, marginTop:13 }}>
          {[["TOTAL", items.length, "#c9a84c"], ["URGENTES", urgentCount, urgentCount ? "#f59e0b" : "#22c55e"], ["CRÍTICOS", critical, critical ? "#ef4444" : "#22c55e"]].map(([label, value, color]) => (
            <div key={label} style={{ background:"rgba(0,0,0,.22)", borderRadius:9, padding:9, textAlign:"center" }}>
              <div style={{ color, fontSize:18, fontWeight:900 }}>{value}</div>
              <div style={{ color:COLORS.textDim, fontSize:8, fontWeight:800, marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {!items.length && <EmptyState />}

      {groups.map(group => (
        <section key={group.category} style={{ marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, margin:"0 2px 8px" }}>
            <span>{group.meta.icon}</span>
            <span style={{ color:group.meta.accent, fontSize:10, fontWeight:900, letterSpacing:".7px" }}>{group.meta.label.toUpperCase()}</span>
            <span style={{ color:COLORS.textDim, fontSize:10 }}>· {group.items.length}</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {group.items.map(item => <ItemCard key={item.id} item={item} onOpen={onOpenItem} onDismiss={onDismissItem} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
