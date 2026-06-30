import { useState } from "react";
import { COACH_PHILOSOPHIES } from "../coach/coachCareerEngine.js";
import { COLORS } from "../utils/tokens.js";

const inputStyle = { width:"100%", boxSizing:"border-box", background:"#0d0f14", border:"1px solid rgba(255,255,255,.1)", color:"#fff", borderRadius:9, padding:"11px 12px", fontSize:13 };

export default function CoachCreateScreen({ team, onCreate, onBack }) {
  const [form, setForm] = useState({ firstName:"Oscar", lastName:"Funes", birthDate:"1988-07-01", nationality:"España", avatar:"🧑‍💼", philosophy:"balanced", prestige:12 });
  const submit = () => onCreate?.(form);
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"18px 14px 24px", background:"linear-gradient(180deg,#0c0e13,#11141b)" }}>
      <div style={{ background:"radial-gradient(circle at 85% 0%,rgba(201,168,76,.22),transparent 40%),linear-gradient(145deg,#1b1a16,#12151d)", border:"1px solid rgba(201,168,76,.25)", borderRadius:16, padding:17, marginBottom:15 }}>
        <div style={{ color:"#c9a84c", fontSize:10, fontWeight:950, letterSpacing:"1px" }}>MODO CARRERA</div>
        <div style={{ color:"#fff", fontSize:23, fontWeight:950, marginTop:5 }}>Crea tu entrenador</div>
        <div style={{ color:COLORS.muted, fontSize:11, lineHeight:1.55, marginTop:6 }}>La partida seguirá tu carrera profesional. El {team?.name} será tu primer club, no necesariamente el último.</div>
      </div>

      <div style={{ background:"#161a24", borderRadius:14, padding:14, display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
          <label style={{ color:COLORS.textDim, fontSize:9, fontWeight:850 }}>NOMBRE<input value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} style={{...inputStyle,marginTop:5}} /></label>
          <label style={{ color:COLORS.textDim, fontSize:9, fontWeight:850 }}>APELLIDOS<input value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} style={{...inputStyle,marginTop:5}} /></label>
        </div>
        <label style={{ color:COLORS.textDim, fontSize:9, fontWeight:850 }}>FECHA DE NACIMIENTO<input type="date" value={form.birthDate} onChange={e=>setForm({...form,birthDate:e.target.value})} style={{...inputStyle,marginTop:5}} /></label>
        <label style={{ color:COLORS.textDim, fontSize:9, fontWeight:850 }}>NACIONALIDAD<input value={form.nationality} onChange={e=>setForm({...form,nationality:e.target.value})} style={{...inputStyle,marginTop:5}} /></label>
        <div style={{ display:"grid", gridTemplateColumns:"76px 1fr", gap:9, alignItems:"end" }}>
          <label style={{ color:COLORS.textDim, fontSize:9, fontWeight:850 }}>AVATAR<input value={form.avatar} maxLength={4} onChange={e=>setForm({...form,avatar:e.target.value})} style={{...inputStyle,marginTop:5,textAlign:"center",fontSize:20}} /></label>
          <label style={{ color:COLORS.textDim, fontSize:9, fontWeight:850 }}>FILOSOFÍA<select value={form.philosophy} onChange={e=>setForm({...form,philosophy:e.target.value})} style={{...inputStyle,marginTop:5}}>
            {COACH_PHILOSOPHIES.map(item=><option key={item.id} value={item.id}>{item.icon} {item.label}</option>)}
          </select></label>
        </div>
        <div style={{ background:"rgba(201,168,76,.08)", border:"1px solid rgba(201,168,76,.16)", borderRadius:10, padding:11, color:"#cfd4df", fontSize:11, lineHeight:1.5 }}>
          Club inicial: <strong style={{ color:"#fff" }}>{team?.name}</strong><br />
          Prestigio inicial estimado: <strong style={{ color:"#c9a84c" }}>{form.prestige}/100</strong>
        </div>
      </div>

      <div style={{ display:"flex", gap:9, marginTop:14 }}>
        <button onClick={onBack} style={{ flex:.55, background:"#1e2330", border:"1px solid rgba(255,255,255,.08)", color:COLORS.muted, borderRadius:10, padding:12, fontWeight:850 }}>Atrás</button>
        <button onClick={submit} className="btn-gold" style={{ flex:1, borderRadius:10, padding:12, fontSize:13 }}>Comenzar carrera →</button>
      </div>
    </div>
  );
}

