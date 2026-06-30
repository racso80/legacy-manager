import { useState } from "react";
import { COLORS } from "../utils/tokens.js";

const KEY = "legacy_manager_preferences";
const readPreferences = () => { try { return { animations:true, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return { animations:true }; } };

function Stat({ label, value }) {
  return (
    <div style={{ background:"rgba(0,0,0,.22)", borderRadius:9, padding:10, textAlign:"center" }}>
      <div style={{ color:COLORS.text, fontSize:13, fontWeight:850, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{value}</div>
      <div style={{ color:COLORS.textDim, fontSize:8, fontWeight:800, marginTop:3 }}>{label}</div>
    </div>
  );
}

export default function SettingsScreen({ game }) {
  const [preferences, setPreferences] = useState(readPreferences);
  const setAnimations = value => {
    const next = { ...preferences, animations:value };
    setPreferences(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    document.documentElement.classList.toggle("reduce-motion", !value);
  };

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 24px" }}>
      <div style={{ background:"radial-gradient(circle at 90% 0%,rgba(201,168,76,.22),transparent 42%),linear-gradient(145deg,#1b1a16,#11141b)", border:"1px solid rgba(201,168,76,.25)", borderRadius:15, padding:16, marginBottom:14 }}>
        <div style={{ color:COLORS.gold, fontSize:10, fontWeight:950, letterSpacing:"1px" }}>⚙ CONFIGURACIÓN</div>
        <div style={{ color:COLORS.text, fontSize:22, fontWeight:950, marginTop:5 }}>Preferencias</div>
        <div style={{ color:COLORS.textDim, fontSize:11, lineHeight:1.5, marginTop:5 }}>Ajustes visuales de Legacy Manager y resumen de tu partida actual.</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:7, marginTop:13 }}>
          <Stat label="CLUB" value={game.name} />
          <Stat label="TEMPORADA" value={`${game.season}/${String(Number(game.season) + 1).slice(-2)}`} />
          <Stat label="JORNADA" value={game.matchday} />
          <Stat label="GUARDADO" value="Automático" />
        </div>
      </div>

      <div style={{ color:COLORS.textDim, fontSize:10, fontWeight:800, letterSpacing:".7px", margin:"0 2px 8px" }}>INTERFAZ</div>
      <div style={{ background:COLORS.bg, border:"1px solid rgba(255,255,255,.06)", borderRadius:10, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:11, padding:13 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:"rgba(201,168,76,.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>✨</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, color:COLORS.text, fontWeight:700 }}>Animaciones suaves</div>
            <div style={{ fontSize:9, color:COLORS.textDim, marginTop:3 }}>Transiciones y feedback visual</div>
          </div>
          <button onClick={() => setAnimations(!preferences.animations)} aria-label="Alternar animaciones"
            style={{ width:45, height:25, borderRadius:14, border:"none", background:preferences.animations ? COLORS.gold : "#374151", padding:3, cursor:"pointer", transition:"background .2s" }}>
            <span style={{ display:"block", width:19, height:19, borderRadius:"50%", background:preferences.animations ? "#1a1200" : "#9ca3af", transform:`translateX(${preferences.animations ? 20 : 0}px)`, transition:"transform .2s" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
