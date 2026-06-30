import { useMemo, useState } from "react";
import { getFilteredNews, NEWS_FILTERS, NEWS_IMPORTANCE } from "../news/newsEngine.js";
import { SwipeTabs } from "./SwipeNavigation.jsx";

const TYPE_ICON = {
  result: "⚽", standings: "📊", streak: "🔥", scorer: "🥇",
  performance: "⭐", transfer: "🔄", finance: "💶", injury: "🚑",
  board: "🤝", youth: "🌱", scouting:"🔎",
};

function NewsItem({ item, featured = false, onOpenPlayer }) {
  const importance = NEWS_IMPORTANCE[item.importance] ?? NEWS_IMPORTANCE.low;
  return (
    <article onClick={()=>item.playerIds?.[0]&&onOpenPlayer?.(item.playerIds[0])} style={{
      background: featured ? "linear-gradient(135deg,rgba(201,168,76,.16),#171b25)" : "#161a24",
      border: featured ? "1px solid rgba(201,168,76,.38)" : "1px solid rgba(255,255,255,.06)",
      borderLeft: `3px solid ${importance.color}`,
      borderRadius: 10, padding: featured ? 16 : 12, cursor:item.playerIds?.length?"pointer":"default",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:7 }}>
        <span style={{ fontSize:featured?20:15 }}>{TYPE_ICON[item.type] ?? "📰"}</span>
        {item.importance!=="critical"&&<span style={{ fontSize:9, color:importance.color, fontWeight:800, textTransform:"uppercase", letterSpacing:".7px" }}>{importance.label}</span>}
        {(item.featured||item.importance==="critical")&&<span style={{fontSize:9,color:"#f97316",fontWeight:900}}>🔥 IMPORTANTE</span>}
        <span style={{ marginLeft:"auto", fontSize:9, color:"#4b5563" }}>Temp. {item.seasonLabel}{item.matchday ? ` · J${item.matchday}` : ""}</span>
      </div>
      <div style={{ fontSize:featured?18:13, lineHeight:1.35, fontWeight:featured?800:700, color:"#e8eaf0" }}>{item.title}</div>
      {item.summary && <div style={{ fontSize:11, color:"#7c8495", lineHeight:1.5, marginTop:6 }}>{item.summary}</div>}
      {item.clubRelated && <div style={{ display:"inline-block", marginTop:8, background:"rgba(201,168,76,.1)", color:"#c9a84c", borderRadius:4, padding:"2px 6px", fontSize:9, fontWeight:700 }}>TU CLUB</div>}
      {item.playerIds?.length>0 && <div style={{ display:"inline-block", marginTop:8, marginLeft:6, color:"#9aa0b4", fontSize:9, fontWeight:700 }}>VER JUGADOR →</div>}
    </article>
  );
}

export default function NewsScreen({ news = [], currentSeason, game, onOpenPlayer }) {
  const [filter, setFilter] = useState("club");
  const [season, setSeason] = useState("all");
  const seasons = useMemo(() => [...new Set(news.map(item => String(item.season)))].sort((a,b)=>Number(b)-Number(a)), [news]);
  const filtered = useMemo(() => getFilteredNews(news, filter, season,{game}), [news, filter, season,game]);
  const featured = filtered.find(item => item.featured || item.importance === "critical" || item.importance === "high") ?? filtered[0];
  const rest = featured ? filtered.filter(item => item.id !== featured.id) : filtered;

  return (
    <div style={{ flex:1, overflowY:"auto", padding:14 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:12 }}>
        <div>
          <div style={{ fontSize:11, color:"#c9a84c", fontWeight:800, letterSpacing:".7px" }}>CENTRO DE PRENSA</div>
          <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>{ { club:"La actualidad que afecta a tu equipo", league:"Resultados y clasificación en la competición", market:"Fichajes y movimientos de mercado", youth:"La cantera y el futuro del club", board:"Directiva, objetivos y economía" }[filter] ?? "Todo lo que se mueve en la competición" }</div>
        </div>
        <select value={season} onChange={event=>setSeason(event.target.value)} style={{ background:"#161a24", border:"1px solid rgba(255,255,255,.1)", color:"#c9a84c", borderRadius:7, padding:"7px 9px", fontSize:11 }}>
          <option value="all">Todas las temporadas</option>
          {seasons.map(value => <option key={value} value={value}>{value}/{String(Number(value)+1).slice(-2)}{value===String(currentSeason)?" · actual":""}</option>)}
        </select>
      </div>

      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8, marginBottom:8 }}>
        {NEWS_FILTERS.map(item => <button key={item.id} onClick={()=>setFilter(item.id)} style={{ flexShrink:0, border:filter===item.id?"1px solid #c9a84c":"1px solid rgba(255,255,255,.08)", background:filter===item.id?"rgba(201,168,76,.12)":"#161a24", color:filter===item.id?"#c9a84c":"#6b7280", borderRadius:20, padding:"7px 11px", fontSize:10, fontWeight:700, cursor:"pointer" }}>{item.label}</button>)}
      </div>

      <SwipeTabs tabs={NEWS_FILTERS.map(item=>item.id)} activeTab={filter} onChange={setFilter}>
      {featured ? (
        <>
          <div style={{ fontSize:10, color:"#6b7280", fontWeight:700, letterSpacing:".6px", marginBottom:8 }}>NOTICIA DESTACADA</div>
          <NewsItem item={featured} featured onOpenPlayer={onOpenPlayer} />
          <div style={{ fontSize:10, color:"#6b7280", fontWeight:700, letterSpacing:".6px", margin:"18px 0 8px" }}>ÚLTIMAS NOTICIAS</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{rest.map(item => <NewsItem key={item.id} item={item} onOpenPlayer={onOpenPlayer} />)}</div>
        </>
      ) : (
        <div style={{ textAlign:"center", padding:"55px 20px", color:"#6b7280" }}>
          <div style={{ fontSize:34, marginBottom:10 }}>🗞️</div>
          <div style={{ fontSize:14, color:"#9aa0b4", fontWeight:700 }}>Todavía no hay noticias en esta sección</div>
          <div style={{ fontSize:11, marginTop:5 }}>Juega jornadas y toma decisiones para escribir la historia.</div>
        </div>
      )}
      </SwipeTabs>
    </div>
  );
}
