import { getFanMood, getStadiumMood } from "../fans/fanEngine.js";
import { COLORS } from "../utils/tokens.js";

const panel = "#161a24";
const muted = COLORS.textDim;
const gold = "#c9a84c";

function Meter({ value, color = gold }) {
  return <div style={{ height:6, background:"#252a36", borderRadius:5, overflow:"hidden" }}><div style={{ width:`${Math.max(0, Math.min(100, value))}%`, height:"100%", background:color }} /></div>;
}

function Stat({ label, value, color = "#fff" }) {
  return <div style={{ background:"rgba(255,255,255,.035)", borderRadius:10, padding:10, textAlign:"center" }}><div style={{ color, fontSize:17, fontWeight:950 }}>{value}</div><div style={{ color:COLORS.textDim, fontSize:8, fontWeight:850, marginTop:3 }}>{label}</div></div>;
}

export default function FanbaseScreen({ game, team }) {
  const fanbase = game.fanbase ?? {};
  const mood = getFanMood(fanbase.support ?? game.fanLove ?? 65);
  const stadium = getStadiumMood(fanbase.atmosphere ?? fanbase.support ?? 65);
  const coachColor = (fanbase.coachSupport ?? 65) >= 65 ? "#22c55e" : (fanbase.coachSupport ?? 65) >= 42 ? gold : "#ef4444";
  const avgAttendancePct = team?.capacity ? Math.round(((fanbase.averageAttendance ?? 0) / team.capacity) * 100) : 0;
  const trend = [...(fanbase.trend ?? [])].slice(0, 8).reverse();
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 24px" }}>
      <div style={{ background:"radial-gradient(circle at 86% 0%,rgba(201,168,76,.25),transparent 42%),linear-gradient(145deg,#1d1b16,#11141b)", border:"1px solid rgba(201,168,76,.25)", borderRadius:16, padding:16, marginBottom:14 }}>
        <div style={{ color:gold, fontSize:10, fontWeight:950, letterSpacing:"1px" }}>📣 MASA SOCIAL</div>
        <div style={{ color:"#fff", fontSize:22, fontWeight:950, marginTop:5 }}>{mood.icon} Afición {mood.label}</div>
        <div style={{ color:muted, fontSize:11, lineHeight:1.5, marginTop:5 }}>{team?.stadium ?? "El estadio"} · Una afición de {(fanbase.identity?.label ?? "Fidelidad y resultados").toLowerCase()}</div>
        <div style={{ marginTop:13 }}><Meter value={fanbase.support ?? 65} color={mood.color} /></div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:15 }}>
        <Stat label="APOYO" value={`${fanbase.support ?? 65}`} color={mood.color} />
        <Stat label="MÍSTER" value={`${fanbase.coachSupport ?? 65}`} color={coachColor} />
        <Stat label="AMBIENTE" value={`${fanbase.atmosphere ?? 65}`} color={stadium.color} />
        <Stat label="ASIST. MEDIA" value={fanbase.averageAttendance ? fanbase.averageAttendance.toLocaleString("es-ES") : "—"} color="#60a5fa" />
        <Stat label="AFORO MEDIO" value={avgAttendancePct ? `${avgAttendancePct}%` : "—"} color="#a78bfa" />
        <Stat label="RÉCORD" value={fanbase.recordAttendance ? fanbase.recordAttendance.toLocaleString("es-ES") : "—"} color="#f59e0b" />
      </div>

      <section style={{ marginBottom:15 }}>
        <div style={{ color:gold, fontSize:10, fontWeight:900, letterSpacing:".8px", margin:"0 2px 8px" }}>AMBIENTE DEL ESTADIO</div>
        <div style={{ background:panel, border:`1px solid ${stadium.color}22`, borderRadius:12, padding:13 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:`${stadium.color}18`, display:"grid", placeItems:"center", fontSize:24 }}>{stadium.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ color:stadium.color, fontSize:13, fontWeight:900 }}>{stadium.label}</div>
              <div style={{ color:muted, fontSize:10, marginTop:3 }}>El ambiente afecta a ingresos, presión y percepción del equipo.</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom:15 }}>
        <div style={{ color:COLORS.textDim, fontSize:10, fontWeight:900, letterSpacing:".8px", margin:"0 2px 8px" }}>IMPACTO ECONÓMICO DE LA AFICIÓN</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <Stat label="ENTRADAS" value={`€${Math.round((fanbase.ticketRevenue ?? 0) / 100) / 10}M`} color={gold} />
          <Stat label="MERCHANDISING" value={`€${Math.round((fanbase.merchandise ?? 0) / 100) / 10}M`} color="#22c55e" />
        </div>
      </section>

      <section style={{ marginBottom:15 }}>
        <div style={{ color:COLORS.textDim, fontSize:10, fontWeight:900, letterSpacing:".8px", margin:"0 2px 8px" }}>EVOLUCIÓN RECIENTE</div>
        {trend.length ? <div style={{ display:"flex", alignItems:"end", gap:5, height:72, background:panel, borderRadius:12, padding:10 }}>
          {trend.map((item, index) => <div key={`${item.matchday}-${index}`} style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"flex-end", gap:4 }}>
            <div style={{ height:`${Math.max(8, item.support ?? 50)}%`, background:(item.support ?? 50) >= 65 ? "#22c55e" : (item.support ?? 50) >= 42 ? gold : "#ef4444", borderRadius:5 }} />
            <div style={{ color:COLORS.textDim, fontSize:7, textAlign:"center" }}>{item.matchday}</div>
          </div>)}
        </div> : <div style={{ background:panel, borderRadius:11, padding:15, textAlign:"center", color:muted, fontSize:11 }}>La evolución empezará a registrarse tras los partidos.</div>}
      </section>

      <section>
        <div style={{ color:COLORS.textDim, fontSize:10, fontWeight:900, letterSpacing:".8px", margin:"0 2px 8px" }}>ÚLTIMAS REACCIONES</div>
        {(fanbase.reactions ?? []).length ? <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {(fanbase.reactions ?? []).slice(0, 8).map(item => <div key={item.id} style={{ background:panel, border:`1px solid ${item.actionConcern ? "rgba(245,158,11,.28)" : "rgba(255,255,255,.06)"}`, borderRadius:11, padding:11 }}>
            <div style={{ color:"#fff", fontSize:12, fontWeight:850 }}>{item.actionConcern ? "🟠 " : "📣 "}{item.title}</div>
            <div style={{ color:muted, fontSize:10, lineHeight:1.45, marginTop:4 }}>{item.summary}</div>
          </div>)}
        </div> : <div style={{ background:panel, borderRadius:11, padding:15, textAlign:"center", color:muted, fontSize:11 }}>Aún no hay reacciones destacadas.</div>}
      </section>
    </div>
  );
}

