import { coachPointsPerMatch, coachWinRate, COACH_PHILOSOPHIES, getCoachPrestigeLevel } from "../coach/coachCareerEngine.js";

const panel = "#161a24";
const muted = "#7b8293";
const gold = "#c9a84c";

function Stat({ label, value, color = "#fff" }) {
  return <div style={{ background:"rgba(255,255,255,.035)", borderRadius:10, padding:10, textAlign:"center" }}><div style={{ color, fontSize:18, fontWeight:950 }}>{value}</div><div style={{ color:"#6b7280", fontSize:8, fontWeight:850, marginTop:3 }}>{label}</div></div>;
}

export default function CoachCareerScreen({ game, team }) {
  const coach = game.coachCareer;
  const level = getCoachPrestigeLevel(coach?.prestige ?? 10);
  const philosophy = COACH_PHILOSOPHIES.find(item => item.id === coach?.philosophy) ?? COACH_PHILOSOPHIES[0];
  const trophies = coach?.career?.trophies ?? [];
  const history = coach?.career?.history ?? [];
  const clubs = coach?.career?.clubs ?? [];
  const stats = coach?.stats ?? {};
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 24px" }}>
      <div style={{ background:"radial-gradient(circle at 86% 0%,rgba(201,168,76,.25),transparent 42%),linear-gradient(145deg,#1d1b16,#11141b)", border:"1px solid rgba(201,168,76,.25)", borderRadius:16, padding:16, marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:13 }}>
          <div style={{ width:62, height:62, borderRadius:18, background:`${level.color}18`, display:"grid", placeItems:"center", fontSize:34 }}>{coach?.avatar ?? "🧑‍💼"}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:"#fff", fontSize:22, fontWeight:950, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{coach?.name}</div>
            <div style={{ color:level.color, fontSize:11, fontWeight:850, marginTop:4 }}>{level.label} · Prestigio {Math.round(coach?.prestige ?? 10)}/100</div>
            <div style={{ color:muted, fontSize:10, marginTop:4 }}>{coach?.nationality} · {team?.name ?? coach?.currentClubName} · {philosophy.icon} {philosophy.label}</div>
          </div>
        </div>
        <div style={{ marginTop:13 }}>
          <div style={{ height:7, background:"#252a36", borderRadius:5, overflow:"hidden" }}><div style={{ width:`${Math.max(0,Math.min(100,coach?.prestige??10))}%`, height:"100%", background:level.color }} /></div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:15 }}>
        <Stat label="PARTIDOS" value={stats.matches ?? 0} color={gold} />
        <Stat label="% VICTORIAS" value={`${coachWinRate(coach)}%`} color="#22c55e" />
        <Stat label="PTS/PARTIDO" value={coachPointsPerMatch(coach)} color="#60a5fa" />
        <Stat label="TEMPORADAS" value={stats.seasons ?? 0} />
        <Stat label="TÍTULOS" value={stats.titles ?? 0} color="#f59e0b" />
        <Stat label="RACHA VICT." value={stats.bestWinStreak ?? 0} color="#a78bfa" />
      </div>

      <section style={{ marginBottom:15 }}>
        <div style={{ color:gold, fontSize:10, fontWeight:900, letterSpacing:".8px", margin:"0 2px 8px" }}>PALMARÉS PERSONAL</div>
        {trophies.length ? <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{trophies.map(item => (
          <div key={item.id} style={{ background:panel, border:"1px solid rgba(201,168,76,.16)", borderRadius:11, padding:11, display:"flex", justifyContent:"space-between", gap:10 }}>
            <div><div style={{ color:"#fff", fontSize:12, fontWeight:850 }}>🏆 {item.name}</div><div style={{ color:muted, fontSize:9, marginTop:3 }}>{item.clubName}</div></div>
            <div style={{ color:gold, fontSize:11, fontWeight:900 }}>{item.season}</div>
          </div>
        ))}</div> : <div style={{ background:panel, borderRadius:11, padding:15, textAlign:"center", color:muted, fontSize:11 }}>Todavía no hay títulos en tu palmarés personal.</div>}
      </section>

      <section style={{ marginBottom:15 }}>
        <div style={{ color:"#4b5563", fontSize:10, fontWeight:900, letterSpacing:".8px", margin:"0 2px 8px" }}>CLUBES ENTRENADOS</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{clubs.map(item => (
          <div key={`${item.clubId}-${item.fromSeason}`} style={{ background:panel, borderRadius:11, padding:11 }}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}><div style={{ color:"#fff", fontSize:12, fontWeight:850 }}>{item.clubName}</div><div style={{ color:item.toSeason ? muted : "#22c55e", fontSize:9, fontWeight:850 }}>{item.toSeason ? `${item.fromSeason}-${item.toSeason}` : `Desde ${item.fromSeason}`}</div></div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginTop:9 }}>
              <Stat label="TEMP." value={item.seasons ?? 0} color={gold} />
              <Stat label="PJ" value={item.matches ?? 0} />
              <Stat label="VICT." value={item.wins ?? 0} color="#22c55e" />
              <Stat label="TÍT." value={item.titles ?? 0} color="#f59e0b" />
            </div>
          </div>
        ))}</div>
      </section>

      <section>
        <div style={{ color:"#4b5563", fontSize:10, fontWeight:900, letterSpacing:".8px", margin:"0 2px 8px" }}>HISTORIAL DE TEMPORADAS</div>
        {history.length ? <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{history.map(item => (
          <div key={item.id} style={{ background:panel, borderRadius:11, padding:11 }}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}><div style={{ color:"#fff", fontSize:12, fontWeight:850 }}>{item.season} · {item.clubName}</div><div style={{ color:gold, fontSize:11, fontWeight:900 }}>{item.position}.º</div></div>
            <div style={{ color:muted, fontSize:9, marginTop:4 }}>{item.matches} PJ · {item.wins}V {item.draws}E {item.losses}D · {item.points} pts{item.title ? ` · 🏆 ${item.title}` : ""}</div>
          </div>
        ))}</div> : <div style={{ background:panel, borderRadius:11, padding:15, textAlign:"center", color:muted, fontSize:11 }}>El historial se completará al cerrar temporadas.</div>}
      </section>
    </div>
  );
}

