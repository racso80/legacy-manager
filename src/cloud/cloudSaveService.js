import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

export { isSupabaseConfigured };

export const APP_VERSION = "1.0.0";
const CLOUD_LOG_KEY = "legacy_manager_cloud_logs";

export class CloudSaveConflictError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "CloudSaveConflictError";
    this.code = "cloud_conflict";
    this.details = details;
  }
}

export function logCloudEvent(level, message, details = {}) {
  const entry = { id:`cloud-log-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, level, message, details, createdAt:new Date().toISOString() };
  try {
    const previous = JSON.parse(localStorage.getItem(CLOUD_LOG_KEY) ?? "[]");
    localStorage.setItem(CLOUD_LOG_KEY, JSON.stringify([entry, ...previous].slice(0, 80)));
  } catch {}
  if (level === "error") console.error("[Legacy Cloud]", message, details);
  else if (level === "warn") console.warn("[Legacy Cloud]", message, details);
  else console.info("[Legacy Cloud]", message, details);
  return entry;
}

export function getCloudLogs() {
  try { return JSON.parse(localStorage.getItem(CLOUD_LOG_KEY) ?? "[]"); }
  catch { return []; }
}

export function serializeSavePayload(game, lineup, formation, subs, slots = { starters: 11, bench: 12 }) {
  if (!game) return null;
  const normalize = (list = [], size) => [...list.slice(0, size), ...Array(Math.max(0, size - list.length)).fill(null)];
  return {
    ...game,
    _lineup: normalize(lineup ?? game._lineup ?? [], slots.starters),
    _formation: formation ?? game._formation ?? "4-3-3",
    _subs: normalize(subs ?? game._subs ?? [], slots.bench),
    updatedAt: new Date().toISOString(),
  };
}

export function cloudMetadataFromGame(game, payload = game) {
  return {
    name: game?.name ?? payload?.name ?? "Partida Legacy Manager",
    coach_name: game?.coachCareer?.name ?? game?.legacy?.manager?.name ?? null,
    club_id: game?.teamId ?? null,
    season: String(game?.season ?? "2025"),
    current_game_date: `T${game?.season ?? "2025"}-J${game?.matchday ?? 1}`,
    data_version: String(game?.dataVersion ?? game?.saveDataVersion ?? "1.0.0"),
    app_version: APP_VERSION,
  };
}

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase no está configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

function requireOnline() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("Sin conexión. Se mantiene el guardado local y se reintentará la nube más adelante.");
  }
}

export async function getCurrentSession() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

export async function signInWithEmail(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email, password, username = null) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({ email, password, options: { data: { username } } });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured || !supabase) return { data: { subscription: { unsubscribe() {} } } };
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

export async function listCloudSaves() {
  requireOnline();
  const client = requireSupabase();
  const { data, error } = await client
    .from("savegames")
    .select("id,name,coach_name,club_id,season,current_game_date,data_version,app_version,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function loadCloudSave(saveId) {
  requireOnline();
  const client = requireSupabase();
  const { data, error } = await client
    .from("savegames")
    .select("*")
    .eq("id", saveId)
    .single();
  if (error) throw error;
  return data;
}

export async function getCloudSaveMetadata(saveId) {
  if (!saveId) return null;
  requireOnline();
  const client = requireSupabase();
  const { data, error } = await client
    .from("savegames")
    .select("id,updated_at,name,season,current_game_date")
    .eq("id", saveId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function upsertCloudSave({ userId, cloudSaveId = null, game, payload, expectedCloudUpdatedAt = null, force = false }) {
  requireOnline();
  const client = requireSupabase();
  if (cloudSaveId && !force) {
    const current = await getCloudSaveMetadata(cloudSaveId);
    const cloudTime = current?.updated_at ? new Date(current.updated_at).getTime() : 0;
    const expectedTime = expectedCloudUpdatedAt ? new Date(expectedCloudUpdatedAt).getTime() : 0;
    if (current && expectedTime && cloudTime > expectedTime + 1000) {
      logCloudEvent("warn", "Conflicto de sincronización detectado", { cloudSaveId, cloudUpdatedAt:current.updated_at, localKnownCloudUpdatedAt:expectedCloudUpdatedAt });
      throw new CloudSaveConflictError("La partida en la nube es más reciente que tu copia local.", { cloudSaveId, cloud:current, localKnownCloudUpdatedAt:expectedCloudUpdatedAt });
    }
  }
  const metadata = cloudMetadataFromGame(game, payload);
  const row = {
    ...(cloudSaveId ? { id: cloudSaveId } : {}),
    user_id: userId,
    ...metadata,
    data: payload,
  };
  const { data, error } = await client
    .from("savegames")
    .upsert(row, { onConflict: "id" })
    .select("id,name,coach_name,club_id,season,current_game_date,data_version,app_version,created_at,updated_at")
    .single();
  if (error) throw error;
  logCloudEvent("info", "Partida guardada en Supabase", { cloudSaveId:data.id, updatedAt:data.updated_at, season:data.season });
  return data;
}

export async function deleteCloudSave(saveId) {
  requireOnline();
  const client = requireSupabase();
  const { error } = await client.from("savegames").delete().eq("id", saveId);
  if (error) throw error;
  logCloudEvent("info", "Partida eliminada de Supabase", { saveId });
}

export function compareSaveDates(localUpdatedAt, cloudUpdatedAt) {
  const local = localUpdatedAt ? new Date(localUpdatedAt).getTime() : 0;
  const cloud = cloudUpdatedAt ? new Date(cloudUpdatedAt).getTime() : 0;
  if (local > cloud) return "local";
  if (cloud > local) return "cloud";
  return "equal";
}
