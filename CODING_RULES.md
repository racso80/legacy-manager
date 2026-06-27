# CODING RULES - Legacy Manager

Estas reglas son permanentes para el desarrollo de Legacy Manager.

1. No romper funcionalidades existentes.
2. Mantener todos los archivos en UTF-8 sin BOM.
3. No convertir nunca archivos a ANSI, Windows-1252 u otras codificaciones.
4. Hacer cambios mínimos y sólo en archivos necesarios.
5. No reformatear archivos completos si no es imprescindible.
6. Toda nueva funcionalidad debe revisar si genera asuntos en el Centro de Atención.
7. Toda pantalla debe seguir funcionando en móvil.
8. Preparar estructura para futura versión Adaptive PC cuando aplique.
9. Evitar renders, consultas y guardados duplicados.
10. Antes de finalizar cualquier tarea ejecutar `npm run build`.
11. Revisar posibles regresiones visuales.
12. Revisar compatibilidad con partidas existentes.
13. Si se añaden nuevos campos a partidas guardadas, crear valores por defecto o migración.
14. Nunca subir ni usar `service_role_key` en frontend.
15. Nunca modificar ni subir archivos `.env`.
