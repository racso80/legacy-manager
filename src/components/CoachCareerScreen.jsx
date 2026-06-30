import { coachPointsPerMatch, coachWinRate, COACH_PHILOSOPHIES, getCoachPrestigeLevel } from "../coach/coachCareerEngine.js";
import { COLORS } from "../utils/tokens.js";

const panel = "#161a24";
const muted = COLORS.textDim;
const gold = "#c9a84c";

function Stat({ label, value, color = "#fff" }) {
  return <div style={{ background:"rgba(255,255,255,.035)", borderRadius:10, padding:10, textAlign:"center" }}><div style={{ color, fontSize:18, fontWeight:950 }}>{value}</div><div style={{ color:COLORS.textDim, fontSize:8, fontWeight:850, marginTop:3 }}>{label}</div></div>;
}

const money = value => {
  if (value == null) return null;
  const sign = value < 0 ? "-" : "+";
  const abs = Math.abs(value);
  return `${sign}€${abs >= 1000 ? `${(abs / 1000).toFixed(1)}M` : `${Math.round(abs)}K`}`;
};

export default function CoachCareerScreen({ game, team, teams = [] }) {
  const coach = game.coachCareer;
  const level = getCoachPrestigeLevel(coach?.prestige ?? 10);
  const philosophy = COACH_PHILOSOPHIES.find(item => item.id === coach?.philosophy) ?? COACH_PHILOSOPHIES[0];
  const trophies = coach?.career?.trophies ?? [];
  const history = coach?.career?.history ?? [];
  const clubs = coach?.career?.clubs ?? [];
  const stats = coach?.stats ?? {};
  const notifications = coach?.notifications ?? [];
  const rivalTeam = teams.find(item => item.id === stats.biggestWin?.rivalId);
  const highlights = [
    stats.biggestWin && { label:"Mayor victoria", value:`${stats.biggestWin.goalsFor}-${stats.biggestWin.goalsAgainst}${rivalTeam ? ` vs ${rivalTeam.name}` : ""} (T. ${stats.biggestWin.season})` },
    stats.bestSeason && { label:"Mejor temporada", value:`${stats.bestSeason.position}.º · ${stats.bestSeason.points} pts (T. ${stats.bestSeason.season})` },
    (stats.bestWinStreak ?? 0) > 0 && { label:"Mejor racha", value:`${stats.bestWinStreak} victorias seguidas` },
    (stats.promotedYouth ?? 0) > 0 && { label:"Jóvenes promocionados", value:`${stats.promotedYouth}` },
    stats.transferProfit ? { label:"Balance de fichajes", value:money(stats.transferProfit) } : null,
  ].filter(Boolean);
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

      {notifications.length > 0 && (
        <section style={{ marginBottom:15 }}>
          <div style={{ color:COLORS.textDim, fontSize:10, fontWeight:900, letterSpacing:".8px", margin:"0 2px 8px" }}>ÚLTIMAS NOVEDADES</div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {notifications.slice(0, 3).map(item => (
              <div key={item.id} style={{ background:panel, border:`1px solid ${item.type === "prestige-drop" ? "rgba(239,68,68,.22)" : "rgba(34,197,94,.2)"}`, borderRadius:9, padding:"9px 11px" }}>
                <div style={{ color:"#e8eaf0", fontSize:11, fontWeight:800 }}>{item.type === "prestige-drop" ? "📉" : "📈"} {item.title}</div>
                <div style={{ color:muted, fontSize:9, marginTop:3 }}>T. {item.season}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:15 }}>
        <Stat label="PARTIDOS" value={stats.matches ?? 0} color={gold} />
        <Stat label="% VICTORIAS" value={`${coachWinRate(coach)}%`} color="#22c55e" />
        <Stat label="PTS/PARTIDO" value={coachPointsPerMatch(coach)} color="#60a5fa" />
        <Stat label="TEMPORADAS" value={stats.seasons ?? 0} />
        <Stat label="TÍTULOS" value={stats.titles ?? 0} color="#f59e0b" />
      </div>

      {highlights.length > 0 && (
        <section style={{ marginBottom:15 }}>
          <div style={{ color:gold, fontSize:10, fontWeight:900, letterSpacing:".8px", margin:"0 2px 8px" }}>DESTACADOS DE LA CARRERA</div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {highlights.map(item => (
              <div key={item.label} style={{ background:panel, borderRadius:9, padding:"9px 11px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
                <span style={{ color:muted, fontSize:10 }}>{item.label}</span>
                <span style={{ color:"#e8eaf0", fontSize:11, fontWeight:800, textAlign:"right" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

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
        <div style={{ color:COLORS.textDim, fontSize:10, fontWeight:900, letterSpacing:".8px", margin:"0 2px 8px" }}>CLUBES ENTRENADOS</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{clubs.map(item => (
          <div key={`${item.clubId}-${item.fromSeason}`} style={{ background:panel, borderRadius:11, padding:11 }}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}><div style={{ color:"#fff", fontSize:12, fontWeight:850 }}>{item.clubName}</div><div style={{ color:item.toSeason ? muted : "#22c55e", fontSize:9, fontWeight:850 }}>{item.toSeason ? `${item.fromSeason}-${item.toSeason}` : `Desde ${item.fromSeason}`}</div></div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginTop:9 }}>
              <Stat label="TEMP" value={item.seasons ?? 0} color={gold} />
              <Stat label="PJ" value={item.matches ?? 0} />
              <Stat label="VICT" value={item.wins ?? 0} color="#22c55e" />
              <Stat label="TÍT" value={item.titles ?? 0} color="#f59e0b" />
            </div>
          </div>
        ))}</div>
      </section>

      <section>
        <div style={{ color:COLORS.textDim, fontSize:10, fontWeight:900, letterSpacing:".8px", margin:"0 2px 8px" }}>HISTORIAL DE TEMPORADAS</div>
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

