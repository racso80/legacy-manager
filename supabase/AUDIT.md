# Auditoría Supabase - Legacy Manager

## Seguridad

- El frontend usa únicamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- No debe usarse nunca `service_role_key` en el cliente.
- RLS está activado en `profiles` y `savegames`.
- Las políticas limitan `select`, `insert`, `update` y `delete` a `auth.uid()`.

## Guardado

- El guardado local sigue siendo el respaldo principal.
- La nube guarda la partida completa como `jsonb` en `savegames.data`.
- Si no hay conexión, la nube no bloquea el juego: se mantiene el local y se registra log.
- Si la sesión caduca o Supabase falla, se muestra error y no se pierde la partida local.

## Conflictos

- Antes de actualizar una partida cloud existente, el cliente consulta `updated_at`.
- Si la nube es más reciente que la copia local conocida, se bloquea la sobrescritura.
- El usuario debe elegir explícitamente:
  - usar nube;
  - sobrescribir nube;
  - decidir luego.

## Rendimiento

- La lista de partidas consulta solo metadatos, no el JSON completo.
- El JSON completo solo se descarga al cargar una partida concreta.
- Los autosaves cloud están agrupados con debounce para evitar ráfagas de peticiones.

## Logs

- Los eventos cloud se guardan en `localStorage` bajo `legacy_manager_cloud_logs`.
- Se registran guardados, cargas, borrados, conflictos, offline y errores.

