import { useEffect, useState } from "react";
import { getCloudSyncSnapshot, isSupabaseConfigured, listCloudSaves } from "../../cloud/cloudSaveService.js";

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function Freshness({ local, cloud }) {
  const snapshot = getCloudSyncSnapshot(local, cloud);
  const isConflict = snapshot.localHasUnsyncedChanges && snapshot.cloudChangedAfterLastSync;
  const text = isConflict ? "Conflicto posible" : snapshot.localHasUnsyncedChanges ? "Pendiente de sincronizar" : snapshot.cloudChangedAfterLastSync ? "Nube más reciente" : "Sincronizadas";
  const className = isConflict || snapshot.localHasUnsyncedChanges ? "warn" : snapshot.cloudChangedAfterLastSync ? "info" : "ok";
  return <span className={`pc-pregame-cloud-freshness ${className}`}>{text}</span>;
}

export default function PCCloudSavesScreen({ session, localSave, status, syncState, conflict, teams, onSignIn, onSignUp, onSignOut, onRefresh, onSaveCloud, onForceSaveCloud, onLoadCloud, onDeleteCloud, onClearConflict, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState("login");
  const [saves, setSaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const visibleSyncState = conflict ? "conflict" : syncState?.state ?? "local";
  const syncLabel = visibleSyncState === "saving" ? "Guardando..." : visibleSyncState === "saved" ? "Guardado correctamente" : visibleSyncState === "pending" ? "Pendiente de sincronizar" : visibleSyncState === "conflict" ? "Conflicto de sincronización" : visibleSyncState === "error" ? "Error al guardar" : "Solo local";

  const refresh = async () => {
    if (!session) return;
    setLoading(true); setError("");
    try { setSaves(await listCloudSaves()); onRefresh?.(); }
    catch (e) { setError(e.message ?? "No se pudieron cargar las partidas en nube."); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [session?.user?.id]);

  if (!isSupabaseConfigured) {
    return (
      <div className="pc-pregame pc-pregame-cloud">
        <div className="pc-pregame-saves-header">
          <div><h1>Cargar desde la nube</h1></div>
          <div className="pc-pregame-back-link" onClick={onBack}>← Volver al menú</div>
        </div>
        <div className="pc-pregame-cloud-warn">⚠️ La sincronización en la nube no está configurada para este entorno. Puedes seguir jugando con el guardado local sin problema.</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="pc-pregame pc-pregame-cloud">
        <div className="pc-pregame-saves-header">
          <div><h1>Cargar desde la nube</h1></div>
          <div className="pc-pregame-back-link" onClick={onBack}>← Volver al menú</div>
        </div>
        <div className="pc-pregame-cloud-login-card">
          <h2>{mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}</h2>
          {mode === "signup" && <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Nombre de usuario" />}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" type="password" />
          {error && <div className="pc-pregame-cloud-error">{error}</div>}
          {status && <div className="pc-pregame-cloud-status-msg">{status}</div>}
          <button
            className="pc-pregame-btn pc-pregame-btn-gold"
            style={{ width: "100%", marginTop: 6 }}
            onClick={async () => { setError(""); try { mode === "signup" ? await onSignUp(email, password, username) : await onSignIn(email, password); } catch (e) { setError(e.message ?? "Error de autenticación"); } }}
          >
            {mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}
          </button>
          <div className="pc-pregame-cloud-switch-mode" onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
            {mode === "signup" ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pc-pregame pc-pregame-cloud">
      <div className="pc-pregame-saves-header">
        <div><h1>Cargar desde la nube</h1></div>
        <div className="pc-pregame-back-link" onClick={onBack}>← Volver al menú</div>
      </div>

      <div className="pc-pregame-cloud-account">
        <div className="pc-pregame-cloud-email">{session.user.email}</div>
        <div className="pc-pregame-cloud-status-line">{syncLabel} · El guardado local sigue activo como respaldo.</div>
        {syncState?.lastSyncAt && <div className="pc-pregame-cloud-status-line">Última sync: {fmtDate(syncState.lastSyncAt)}</div>}
        <div className="pc-pregame-cloud-actions-row">
          <button className="pc-pregame-btn pc-pregame-btn-gold" disabled={!localSave} style={{ opacity: localSave ? 1 : .5 }} onClick={async () => { await onSaveCloud(); await refresh(); }}>Sincronizar ahora</button>
          <button className="pc-pregame-btn pc-pregame-btn-ghost" onClick={refresh}>{loading ? "..." : "Actualizar"}</button>
          <button className="pc-pregame-btn pc-pregame-btn-ghost" onClick={onSignOut}>Salir</button>
        </div>
        {status && <div className="pc-pregame-cloud-status-msg">{status}</div>}
        {error && <div className="pc-pregame-cloud-error">{error}</div>}
      </div>

      {conflict && (
        <div className="pc-pregame-cloud-conflict">
          <div className="pc-pregame-cloud-conflict-title">Conflicto de sincronización</div>
          <div className="pc-pregame-cloud-conflict-desc">La partida en la nube es más reciente que la copia local. No se ha sobrescrito nada automáticamente.</div>
          <div className="pc-pregame-cloud-conflict-meta">Nube: {fmtDate(conflict.cloudUpdatedAt)} · Local conocido: {fmtDate(conflict.localKnownCloudUpdatedAt)}</div>
          <div className="pc-pregame-cloud-actions-row">
            <button className="pc-pregame-btn pc-pregame-btn-gold" onClick={() => onLoadCloud(conflict.cloudSaveId)}>Usar nube</button>
            <button className="pc-pregame-btn pc-pregame-btn-danger-solid" onClick={onForceSaveCloud}>Sobrescribir nube</button>
            <button className="pc-pregame-btn pc-pregame-btn-ghost" onClick={onClearConflict}>Decidir luego</button>
          </div>
        </div>
      )}

      {localSave && (
        <div className="pc-pregame-cloud-local-box">
          <div className="pc-pregame-cloud-local-label">PARTIDA LOCAL ACTIVA</div>
          <div className="pc-pregame-cloud-local-name">{localSave.name}</div>
          <div className="pc-pregame-cloud-local-meta">J{localSave.matchday} · Temp. {localSave.season} · {fmtDate(localSave.updatedAt)}</div>
        </div>
      )}

      {loading ? (
        <div className="pc-pregame-saves-empty">Cargando partidas en la nube…</div>
      ) : (
        <div className="pc-pregame-saves-grid">
          {saves.map(save => {
            const team = teams.find(t => t.id === save.club_id);
            return (
              <div key={save.id} className="pc-pregame-save-card">
                <div className="pc-pregame-save-top">
                  <div className="pc-pregame-badge" style={{ background: `${team?.color ?? "#c9a84c"}22`, border: `2px solid ${team?.color ?? "#c9a84c"}55`, color: team?.color ?? "#c9a84c" }}>
                    {team?.short ?? save.club_id ?? "LM"}
                  </div>
                  <div>
                    <div className="pc-pregame-save-name">{save.name}</div>
                    <div className="pc-pregame-save-meta">{save.coach_name ?? "Entrenador"} · Temp. {save.season}</div>
                    <div className="pc-pregame-save-date">Nube: {fmtDate(save.updated_at)}</div>
                    {localSave?.cloudSaveId === save.id && <Freshness local={localSave} cloud={save.updated_at} />}
                  </div>
                </div>
                {confirmDeleteId === save.id ? (
                  <div className="pc-pregame-save-confirm">
                    <div className="pc-pregame-save-confirm-text">¿Eliminar "{save.name}" de la nube? No se puede deshacer.</div>
                    <button className="pc-pregame-btn pc-pregame-btn-danger-solid" onClick={async () => { setConfirmDeleteId(null); await onDeleteCloud(save.id); await refresh(); }}>Sí, borrar</button>
                    <button className="pc-pregame-btn pc-pregame-btn-ghost" onClick={() => setConfirmDeleteId(null)}>Cancelar</button>
                  </div>
                ) : (
                  <div className="pc-pregame-save-actions">
                    <button className="pc-pregame-btn pc-pregame-btn-gold" onClick={() => onLoadCloud(save.id)}>Cargar desde la nube</button>
                    <button className="pc-pregame-btn pc-pregame-btn-danger" onClick={() => setConfirmDeleteId(save.id)}>🗑</button>
                  </div>
                )}
              </div>
            );
          })}
          {!saves.length && <div className="pc-pregame-saves-empty">No hay partidas guardadas en la nube todavía.</div>}
        </div>
      )}
    </div>
  );
}
