import { buildStaffRecommendations, getStaffLevel, STAFF_ROLES } from "../staff/staffEngine.js";

const panel = "#161a24";
const gold = "#c9a84c";
const muted = "#7b8293";

function Meter({ value, color = gold }) {
  return <div style={{ height:5, background:"#252a36", borderRadius:4, overflow:"hidden" }}><div style={{ width:`${Math.max(0, Math.min(100, value))}%`, height:"100%", background:color }} /></div>;
}

function StaffCard({ member }) {
  const role = STAFF_ROLES[member.roleId];
  const level = getStaffLevel(member.overall);
  const attrs = Object.entries(member.attributes ?? {});
  return (
    <div style={{ background:panel, border:`1px solid ${level.color}22`, borderRadius:13, padding:13 }}>
      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
        <div style={{ width:50, height:50, borderRadius:14, background:`${level.color}18`, display:"grid", placeItems:"center", fontSize:27 }}>{member.avatar ?? member.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ color:"#fff", fontSize:14, fontWeight:900 }}>{member.name}</div>
          <div style={{ color:level.color, fontSize:10, fontWeight:800, marginTop:3 }}>{member.icon} {member.roleTitle} · {level.label}</div>
          <div style={{ color:muted, fontSize:9, marginTop:3 }}>{member.age} años · {member.nationality} · contrato hasta {member.contractEnd}</div>
          <div style={{ color:"#9aa0b4", fontSize:9, marginTop:3 }}>{member.personality?.label ?? "Profesional"} · {member.personality?.style ?? "ordenado"}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ color:level.color, fontSize:22, fontWeight:950 }}>{member.overall}</div>
          <div style={{ color:"#4b5563", fontSize:8, fontWeight:800 }}>MEDIA</div>
        </div>
      </div>

      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:11 }}>
        {(member.specialties ?? []).map(item => <span key={item} style={{ border:`1px solid ${level.color}22`, background:`${level.color}10`, color:"#cfd4df", borderRadius:999, padding:"4px 7px", fontSize:9, fontWeight:750 }}>{item}</span>)}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:12 }}>
        {attrs.map(([key, value]) => (
          <div key={key} style={{ background:"rgba(255,255,255,.035)", borderRadius:9, padding:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:8, fontSize:8, color:"#6b7280", fontWeight:850, marginBottom:5 }}>
              <span>{role?.labels?.[key] ?? key}</span><span style={{ color:level.color }}>{value}</span>
            </div>
            <Meter value={value} color={level.color} />
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10 }}>
        <div style={{ background:"rgba(0,0,0,.16)", borderRadius:9, padding:8 }}>
          <div style={{ color:"#4b5563", fontSize:8, fontWeight:850 }}>SALARIO</div>
          <div style={{ color:"#e8eaf0", fontSize:11, fontWeight:850, marginTop:2 }}>€{member.salary}K/sem.</div>
        </div>
        <div style={{ background:"rgba(0,0,0,.16)", borderRadius:9, padding:8 }}>
          <div style={{ color:"#4b5563", fontSize:8, fontWeight:850 }}>ÁREA</div>
          <div style={{ color:"#e8eaf0", fontSize:11, fontWeight:850, marginTop:2 }}>{role?.area}</div>
        </div>
        <div style={{ background:"rgba(0,0,0,.16)", borderRadius:9, padding:8 }}>
          <div style={{ color:"#4b5563", fontSize:8, fontWeight:850 }}>CONFIANZA</div>
          <div style={{ color:"#22c55e", fontSize:11, fontWeight:850, marginTop:2 }}>{member.trust ?? 60}/100</div>
        </div>
        <div style={{ background:"rgba(0,0,0,.16)", borderRadius:9, padding:8 }}>
          <div style={{ color:"#4b5563", fontSize:8, fontWeight:850 }}>INICIATIVA</div>
          <div style={{ color:"#60a5fa", fontSize:11, fontWeight:850, marginTop:2 }}>{member.initiative ?? 60}/100</div>
        </div>
      </div>
    </div>
  );
}

export default function StaffScreen({ game, onNavigate }) {
  const members = game.staff?.members ?? [];
  const avg = members.length ? Math.round(members.reduce((sum, item) => sum + (item.overall ?? 70), 0) / members.length) : 0;
  const best = [...members].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))[0];
  const weak = [...members].sort((a, b) => (a.overall ?? 0) - (b.overall ?? 0))[0];
  const recs = buildStaffRecommendations(game).slice(0, 4);
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 24px" }}>
      <div style={{ background:"radial-gradient(circle at 90% 0%,rgba(201,168,76,.22),transparent 42%),linear-gradient(145deg,#1b1a16,#11141b)", border:"1px solid rgba(201,168,76,.25)", borderRadius:15, padding:16, marginBottom:14 }}>
        <div style={{ color:gold, fontSize:10, fontWeight:950, letterSpacing:"1px" }}>🏢 ESTRUCTURA DEL CLUB</div>
        <div style={{ color:"#fff", fontSize:22, fontWeight:950, marginTop:5 }}>Staff Técnico</div>
        <div style={{ color:muted, fontSize:11, lineHeight:1.5, marginTop:5 }}>Tu cuerpo técnico convierte datos en recomendaciones: médico, carga física, táctica, contratos y scouting.</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7, marginTop:13 }}>
          {[["MEDIA", avg || "-", gold], ["FORTALEZA", best?.roleTitle ?? "-", "#22c55e"], ["A REFORZAR", weak?.roleTitle ?? "-", "#f59e0b"]].map(([label, value, color]) => (
            <div key={label} style={{ background:"rgba(0,0,0,.22)", borderRadius:9, padding:9, textAlign:"center" }}>
              <div style={{ color, fontSize:typeof value === "number" ? 18 : 10, fontWeight:950, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{value}</div>
              <div style={{ color:"#6b7280", fontSize:8, fontWeight:850, marginTop:3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <section style={{ marginBottom:15 }}>
        <div style={{ color:gold, fontSize:10, fontWeight:900, letterSpacing:".8px", margin:"0 2px 8px" }}>RECOMENDACIONES RECIENTES</div>
        {recs.length ? <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {recs.map(item => <button key={item.id} onClick={()=>onNavigate?.(item.action?.screen ?? "dashboard")} style={{ textAlign:"left", background:panel, border:"1px solid rgba(201,168,76,.14)", borderRadius:11, padding:11, cursor:"pointer" }}>
            <div style={{ display:"flex", gap:9, alignItems:"flex-start" }}>
              <span style={{ fontSize:20 }}>{item.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ color:"#e8eaf0", fontSize:12, fontWeight:850 }}>{item.title}</div>
                <div style={{ color:muted, fontSize:10, lineHeight:1.45, marginTop:4 }}>"{item.quote}"</div>
              </div>
            </div>
          </button>)}
        </div> : <div style={{ background:panel, borderRadius:11, padding:15, color:muted, fontSize:11, textAlign:"center" }}>El staff no tiene recomendaciones urgentes ahora mismo.</div>}
      </section>

      <section>
        <div style={{ color:"#4b5563", fontSize:10, fontWeight:900, letterSpacing:".8px", margin:"0 2px 8px" }}>MIEMBROS DEL STAFF</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {members.map(member => <StaffCard key={member.id} member={member} />)}
        </div>
      </section>
    </div>
  );
}
