import { useEffect, useState } from "react";
import { getCloudSyncSnapshot, isSupabaseConfigured, listCloudSaves } from "../cloud/cloudSaveService.js";
import { COLORS } from "../utils/tokens.js";

const inputStyle = { width:"100%", boxSizing:"border-box", background:"#0d0f14", border:"1px solid rgba(255,255,255,.1)", color:"#fff", borderRadius:9, padding:"10px 11px", fontSize:12 };

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function Freshness({ local, cloud }) {
  const snapshot = getCloudSyncSnapshot(local, cloud);
  const isConflict = snapshot.localHasUnsyncedChanges && snapshot.cloudChangedAfterLastSync;
  const text = isConflict ? "Conflicto posible" : snapshot.localHasUnsyncedChanges ? "Pendiente de sincronizar" : snapshot.cloudChangedAfterLastSync ? "Nube más reciente" : "Sincronizadas";
  const color = isConflict ? "#f59e0b" : snapshot.localHasUnsyncedChanges ? "#f59e0b" : snapshot.cloudChangedAfterLastSync ? "#60a5fa" : "#22c55e";
  return <span style={{ color, fontSize:9, fontWeight:900 }}>{text}</span>;
}

function SkeletonRow() {
  return (
    <div style={{ background:"#161a24", border:"1px solid rgba(255,255,255,.07)", borderRadius:11, padding:12 }}>
      <div className="shimmer" style={{ height:13, width:"55%", borderRadius:6 }} />
      <div className="shimmer" style={{ height:9, width:"70%", borderRadius:5, marginTop:8 }} />
      <div className="shimmer" style={{ height:9, width:"40%", borderRadius:5, marginTop:6 }} />
      <div style={{ display:"flex", gap:7, marginTop:10 }}>
        <div className="shimmer" style={{ height:34, flex:1, borderRadius:8 }} />
        <div className="shimmer" style={{ height:34, width:60, borderRadius:8 }} />
      </div>
    </div>
  );
}
export default function CloudSavesScreen({ session, localSave, status, syncState, conflict, onSignIn, onSignUp, onSignOut, onRefresh, onSaveCloud, onForceSaveCloud, onLoadCloud, onDeleteCloud, onClearConflict }) {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [username,setUsername]=useState("");
  const [mode,setMode]=useState("login");
  const [saves,setSaves]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [confirmDeleteId,setConfirmDeleteId]=useState(null);
  const visibleSyncState = conflict ? "conflict" : syncState?.state ?? "local";
  const syncLabel = visibleSyncState === "saving" ? "Guardando..." : visibleSyncState === "saved" ? "Guardado correctamente" : visibleSyncState === "pending" ? "Pendiente de sincronizar" : visibleSyncState === "conflict" ? "Conflicto de sincronización" : visibleSyncState === "error" ? "Error al guardar" : "Solo local";
  const syncColor = visibleSyncState === "error" ? "#ef4444" : visibleSyncState === "saved" ? "#22c55e" : visibleSyncState === "local" ? COLORS.muted : "#f59e0b";

  const refresh = async () => {
    if (!session) return;
    setLoading(true); setError("");
    try { setSaves(await listCloudSaves()); onRefresh?.(); }
    catch (e) { setError(e.message ?? "No se pudieron cargar las partidas en nube."); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ refresh(); },[session?.user?.id]);

  if (!isSupabaseConfigured) {
    return <div style={{ flex:1, overflowY:"auto", padding:16 }}><div style={{ background:"#161a24", border:"1px solid rgba(245,158,11,.25)", borderRadius:14, padding:16 }}><div style={{ color:"#f59e0b", fontSize:18, fontWeight:900 }}>Supabase no está configurado</div><div style={{ color:COLORS.muted, fontSize:12, lineHeight:1.5, marginTop:8 }}>Crea un archivo `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. El guardado local sigue funcionando.</div></div></div>;
  }

  if (!session) {
    return <div style={{ flex:1, overflowY:"auto", padding:"18px 14px 24px" }}>
      <div style={{ background:"radial-gradient(circle at 86% 0%,rgba(201,168,76,.22),transparent 42%),linear-gradient(145deg,#1b1a16,#11141b)", border:"1px solid rgba(201,168,76,.25)", borderRadius:16, padding:16, marginBottom:14 }}>
        <div style={{ color:COLORS.gold, fontSize:10, fontWeight:950, letterSpacing:"1px" }}>☁️ SUPABASE</div>
        <div style={{ color:"#fff", fontSize:22, fontWeight:950, marginTop:5 }}>Sincronizar partidas</div>
        <div style={{ color:COLORS.muted, fontSize:11, lineHeight:1.5, marginTop:5 }}>Inicia sesión para guardar tu carrera en la nube y continuar desde PC o móvil.</div>
      </div>
      <div style={{ background:"#161a24", borderRadius:14, padding:14, display:"flex", flexDirection:"column", gap:9 }}>
        <div style={{ display:"flex", gap:7 }}>{[["login","Entrar"],["signup","Crear cuenta"]].map(([id,label])=><button key={id} onClick={()=>setMode(id)} style={{ flex:1, border:"none", borderRadius:8, padding:9, background:mode===id?COLORS.gold:"#1e2330", color:mode===id?"#1a1200":COLORS.muted, fontWeight:900 }}>{label}</button>)}</div>
        {mode==="signup" && <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Nombre de usuario" style={inputStyle} />}
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" style={inputStyle} />
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña" type="password" style={inputStyle} />
        {error && <div style={{ color:"#ef4444", fontSize:10 }}>{error}</div>}
        {status && <div style={{ color:"#60a5fa", fontSize:10 }}>{status}</div>}
        <button onClick={async()=>{setError("");try{mode==="signup"?await onSignUp(email,password,username):await onSignIn(email,password);}catch(e){setError(e.message??"Error de autenticación");}}} className="btn-gold" style={{ padding:11, borderRadius:9 }}>
          {mode==="signup" ? "Crear cuenta" : "Iniciar sesión"}
        </button>
      </div>
    </div>;
  }

  return <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 24px" }}>
    <div style={{ background:"linear-gradient(145deg,rgba(201,168,76,.14),#161a24)", border:"1px solid rgba(201,168,76,.24)", borderRadius:14, padding:14, marginBottom:12 }}>
      <div style={{ color:COLORS.gold, fontSize:10, fontWeight:950, letterSpacing:"1px" }}>☁️ MIS PARTIDAS</div>
      <div style={{ color:"#fff", fontSize:18, fontWeight:900, marginTop:4 }}>{session.user.email}</div>
      <div style={{ color:COLORS.textDim, fontSize:10, marginTop:3 }}>El guardado local sigue activo como respaldo.</div>
      <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginTop:9 }}>
        <span style={{ background:`${syncColor}1f`, color:syncColor, borderRadius:999, padding:"4px 8px", fontSize:9, fontWeight:900 }}>
          {syncLabel}
        </span>
        {syncState?.lastSyncAt && <span style={{ color:COLORS.textDim, fontSize:9, alignSelf:"center" }}>Última sync: {fmtDate(syncState.lastSyncAt)}</span>}
      </div>
      <div style={{ display:"flex", gap:8, marginTop:12 }}>
        <button disabled={!localSave} onClick={async()=>{await onSaveCloud(); await refresh();}} className="btn-gold" style={{ flex:1, borderRadius:9, padding:10, opacity:localSave?1:.5 }}>Sincronizar ahora</button>
        <button onClick={refresh} className="btn-ghost" style={{ flex:.65, borderRadius:9, padding:10 }}>{loading ? "..." : "Actualizar"}</button>
        <button onClick={onSignOut} style={{ background:"#1e2330", border:"1px solid rgba(255,255,255,.08)", color:COLORS.muted, borderRadius:9, padding:"0 10px" }}>Salir</button>
      </div>
      {status && <div style={{ color:"#60a5fa", fontSize:10, marginTop:8 }}>{status}</div>}
      {error && <div style={{ color:"#ef4444", fontSize:10, marginTop:8 }}>{error}</div>}
    </div>

    {conflict && <div style={{ background:"rgba(245,158,11,.1)", border:"1px solid rgba(245,158,11,.28)", borderRadius:12, padding:12, marginBottom:12 }}>
      <div style={{ color:"#f59e0b", fontSize:12, fontWeight:950 }}>Conflicto de sincronización</div>
      <div style={{ color:"#cfd4df", fontSize:10, lineHeight:1.45, marginTop:5 }}>La partida en la nube es más reciente que la copia local. No se ha sobrescrito nada automáticamente.</div>
      <div style={{ color:COLORS.textDim, fontSize:9, marginTop:6 }}>Nube: {fmtDate(conflict.cloudUpdatedAt)} · Local conocido: {fmtDate(conflict.localKnownCloudUpdatedAt)}</div>
      <div style={{ display:"flex", gap:7, marginTop:10 }}>
        <button onClick={()=>onLoadCloud(conflict.cloudSaveId)} className="btn-gold" style={{ flex:1, borderRadius:8, padding:8 }}>Usar nube</button>
        <button onClick={onForceSaveCloud} style={{ flex:1, background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", color:"#ef4444", borderRadius:8, padding:8, fontWeight:850 }}>Sobrescribir nube</button>
        <button onClick={onClearConflict} className="btn-ghost" style={{ flex:.7, borderRadius:8, padding:8 }}>Decidir luego</button>
      </div>
    </div>}

    {localSave && <div style={{ background:"#10131a", border:"1px solid rgba(201,168,76,.16)", borderRadius:11, padding:11, marginBottom:12 }}>
      <div style={{ color:"#c9a84c", fontSize:10, fontWeight:900 }}>PARTIDA LOCAL ACTIVA</div>
      <div style={{ color:"#e8eaf0", fontSize:12, fontWeight:850, marginTop:4 }}>{localSave.name}</div>
      <div style={{ color:COLORS.textDim, fontSize:9, marginTop:3 }}>J{localSave.matchday} · Temp. {localSave.season} · {fmtDate(localSave.updatedAt)}</div>
    </div>}

    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {loading ? [0, 1, 2].map(index => <SkeletonRow key={index} />) : <>
      {saves.map(save => <div key={save.id} style={{ background:"#161a24", border:"1px solid rgba(255,255,255,.07)", borderRadius:11, padding:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:"#fff", fontSize:13, fontWeight:850, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{save.name}</div>
            <div style={{ color:COLORS.textDim, fontSize:9, marginTop:3 }}>{save.coach_name ?? "Entrenador"} · {save.club_id ?? "club"} · Temp. {save.season}</div>
            <div style={{ color:COLORS.textDim, fontSize:9, marginTop:3 }}>Nube: {fmtDate(save.updated_at)}</div>
            {localSave?.cloudSaveId === save.id && <Freshness local={localSave} cloud={save.updated_at} />}
          </div>
        </div>
        <div style={{ display:"flex", gap:7, marginTop:10 }}>
          {confirmDeleteId === save.id ? (
            <div className="slide-up" style={{ display:"flex", gap:7, flex:1 }}>
              <div style={{ flex:1, fontSize:10, color:"#ef4444", lineHeight:1.35, display:"flex", alignItems:"center" }}>¿Eliminar "{save.name}" ({fmtDate(save.updated_at)}) de la nube? No se puede deshacer.</div>
              <button onClick={async()=>{setConfirmDeleteId(null); await onDeleteCloud(save.id); await refresh();}} style={{ background:"rgba(239,68,68,.18)", border:"1px solid rgba(239,68,68,.35)", color:"#ef4444", borderRadius:8, padding:"0 12px", fontWeight:850, cursor:"pointer" }}>Sí, borrar</button>
              <button onClick={()=>setConfirmDeleteId(null)} className="btn-ghost" style={{ borderRadius:8, padding:"0 12px" }}>Cancelar</button>
            </div>
          ) : (
            <>
              <button onClick={()=>onLoadCloud(save.id)} className="btn-gold" style={{ flex:1, padding:9, borderRadius:8 }}>Cargar desde la nube</button>
              <button onClick={()=>setConfirmDeleteId(save.id)} style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.22)", color:"#ef4444", borderRadius:8, padding:"0 12px" }}>Borrar</button>
            </>
          )}
        </div>
      </div>)}
      {!saves.length && <div style={{ background:"#161a24", borderRadius:11, padding:18, color:COLORS.textDim, fontSize:11, textAlign:"center" }}>No hay partidas guardadas en la nube todavía.</div>}
      </>}
    </div>
  </div>;
}
