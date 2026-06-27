import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

export { isSupabaseConfigured };

export const APP_VERSION = "1.0.0";

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
  const client = requireSupabase();
  const { data, error } = await client
    .from("savegames")
    .select("id,name,coach_name,club_id,season,current_game_date,data_version,app_version,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function loadCloudSave(saveId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("savegames")
    .select("*")
    .eq("id", saveId)
    .single();
  if (error) throw error;
  return data;
}

export async function upsertCloudSave({ userId, cloudSaveId = null, game, payload }) {
  const client = requireSupabase();
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
  return data;
}

export async function deleteCloudSave(saveId) {
  const client = requireSupabase();
  const { error } = await client.from("savegames").delete().eq("id", saveId);
  if (error) throw error;
}

export function compareSaveDates(localUpdatedAt, cloudUpdatedAt) {
  const local = localUpdatedAt ? new Date(localUpdatedAt).getTime() : 0;
  const cloud = cloudUpdatedAt ? new Date(cloudUpdatedAt).getTime() : 0;
  if (local > cloud) return "local";
  if (cloud > local) return "cloud";
  return "equal";
}
