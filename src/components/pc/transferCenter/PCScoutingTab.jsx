import { useMemo, useState } from "react";
import { getSquadNeeds, SCOUT_SPECIALTIES } from "../../../scouting/scoutingEngine.js";

const fmt = v => v >= 1000 ? `€${(v / 1000).toFixed(1)}M` : `€${Math.round(v)}K`;
const NEED_COLOR = { Alta: "var(--tc-red)", Media: "var(--tc-orange)", Baja: "var(--tc-green)" };

// Filas de la pizarra de posiciones — mismo layout que el mockup aprobado.
// El campo real bindeado es `position` (código exacto de createScoutingMission),
// no un grupo — igual que pedía la especificación.
const PITCH_ROWS = [
  ["DC"],
  ["EI", "MCO", "ED"],
  ["LI", "MC", "LD"],
  ["DFC", "DFC"],
  ["POR"],
];

// Chips de línea (group) — mismo nivel de granularidad que el <select> de móvil
// (Missions, ScoutingScreen.jsx). Mutuamente excluyentes con una posición
// específica de la pizarra: createScoutingMission acepta group Y position de
// forma independiente, pero la UI solo debe activar uno de los dos a la vez.
const LINE_GROUPS = [["POR", "Portería"], ["DEF", "Defensa"], ["MED", "Medio"], ["DEL", "Delantera"]];

function PositionPicker({ position, group, onChangePosition, onChangeGroup, onChangeAny }) {
  return (
    <div className="pc-tc-position-picker">
      <div className="pc-tc-line-row">
        {LINE_GROUPS.map(([id, label]) => (
          <button key={id} type="button" className={`pc-tc-line-chip${group === id ? " selected" : ""}`} onClick={() => onChangeGroup(id)}>{label}</button>
        ))}
      </div>
      {PITCH_ROWS.map((row, i) => (
        <div key={i} className="pc-tc-pos-row">
          {row.map((pos, j) => (
            <button key={`${pos}-${j}`} type="button" className={`pc-tc-pos-btn${position === pos ? " selected" : ""}`} onClick={() => onChangePosition(pos)}>{pos}</button>
          ))}
        </div>
      ))}
      <button type="button" className={`pc-tc-pos-btn any${!position && !group ? " selected" : ""}`} onClick={onChangeAny}>Cualquiera</button>
    </div>
  );
}

// Mismo flujo que PlayerSearch (móvil, ScoutingScreen.jsx): busca por nombre/club en
// `candidates` (el mismo pool que móvil, getScoutingPool ya llega a este tab por props)
// y crea una misión individual con el primer ojeador libre — sin selector de ojeador,
// igual que móvil.
function PCPlayerSearch({ game, candidates, onRequest }) {
  const [query, setQuery] = useState("");
  const [teamId, setTeamId] = useState("");
  const [durationDays, setDurationDays] = useState("7");
  const activeScoutIds = new Set(game.scouting.missions.filter(m => m.status === "active").map(m => m.scoutId));
  const availableScout = game.scouting.scouts.find(s => !activeScoutIds.has(s.id));
  const teams = useMemo(() => Array.from(new Map(candidates.map(item => [item._teamId, item._teamName])).entries()).sort((a, b) => a[1].localeCompare(b[1])), [candidates]);
  const results = useMemo(() => {
    if (!query.trim() && !teamId) return [];
    const needle = query.trim().toLocaleLowerCase("es");
    return candidates.filter(item => (!teamId || item._teamId === teamId) && (!needle || item.name.toLocaleLowerCase("es").includes(needle))).slice(0, 40);
  }, [candidates, query, teamId]);
  const existing = new Set(game.scouting.reports.map(item => item.playerId));

  const request = player => {
    if (!availableScout) return;
    onRequest({ playerId: player.id, teamId: player._teamId, label: `Informe individual de ${player.name}`, durationDays, scoutId: availableScout.id, region: player._teamName });
  };

  return (
    <div>
      <div className="pc-tc-mission-form">
        <div>
          <label>Buscar jugador</label>
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar: Oyarzabal..." />
        </div>
        <div>
          <label>Club</label>
          <select value={teamId} onChange={e => setTeamId(e.target.value)}>
            <option value="">Todos los clubes</option>
            {teams.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
        <div>
          <label>Duración</label>
          <select value={durationDays} onChange={e => setDurationDays(e.target.value)}>
            {[3, 7, 14, 21].map(v => <option key={v} value={v}>{v} días</option>)}
          </select>
        </div>
      </div>

      <div className="pc-tc-section-label" style={{ marginTop: 18 }}>{results.length ? `${results.length} jugadores encontrados` : "Búsqueda directa"}</div>
      {results.length ? (
        <div className="pc-tc-search-results">
          {results.map(player => {
            const hasReport = existing.has(player.id);
            const pending = game.scouting.missions.some(m => m.status === "active" && m.playerId === player.id);
            const label = pending ? "EN CURSO" : !availableScout ? "SIN SCOUT" : hasReport ? "AMPLIAR" : "PEDIR INFORME";
            return (
              <div key={player.id} className="pc-tc-search-row">
                <div className="pc-tc-search-pos">{player.pos}</div>
                <div className="pc-tc-search-info">
                  <div className="pc-tc-p-name">{player.name}</div>
                  <div className="pc-tc-p-sub">{player.age} años · {player._teamName} · {player.nat}</div>
                </div>
                <button className={`pc-tc-search-btn${hasReport ? " has-report" : ""}`} disabled={pending || !availableScout} onClick={() => request(player)}>{label}</button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="pc-tc-empty">Escribe el nombre de un jugador o selecciona un club para revisar su plantilla.</div>
      )}
    </div>
  );
}

function ReportCard({ report, watched, onWatch, onOpen, onRescout, onGoMarket, playerList }) {
  const locked = report.confidence < 88;
  return (
    <div className="pc-tc-report-card" onClick={() => !locked && onOpen(report.player, report.teamId, playerList)} style={{ cursor: locked ? "default" : "pointer" }}>
      <div className="pc-tc-report-top">
        <div>
          <div className="pc-tc-report-name">{report.player.name}</div>
          <div className="pc-tc-report-meta">{report.teamName} · {report.player.pos} · {report.player.age} años · {report.scoutName}</div>
        </div>
        {report.talent && <div className="pc-tc-talent-badge" style={{ background: `${report.talent.color}22`, color: report.talent.color }}>{report.talent.icon} {report.talent.label}</div>}
      </div>
      <div className="pc-tc-range-row">
        <div className="pc-tc-range-block">Media<span className="val">{report.overallRange[0]}–{report.overallRange[1]}</span></div>
        <div className="pc-tc-range-block">Potencial<span className="val">{report.potentialRange[0]}–{report.potentialRange[1]}</span></div>
        <div className="pc-tc-range-block">Valor<span className="val">{fmt(report.marketValueRange[0])}–{fmt(report.marketValueRange[1])}</span></div>
      </div>
      <div className="pc-tc-confidence-row">
        <div className="pc-tc-confidence-bar"><div className="pc-tc-confidence-fill" style={{ width: `${report.confidence}%` }} /></div>
        <div className="pc-tc-confidence-pct">{report.confidence}%</div>
      </div>
      {report.opportunity && <div className="pc-tc-opportunity-tag">● {report.opportunity}</div>}
      {locked && <div className="pc-tc-lock-notice">🔒 Perfil completo bloqueado hasta 88% de confianza.</div>}
      <div className="pc-tc-report-actions">
        <button className={`pc-tc-star-btn${watched ? " active" : ""}`} onClick={event => { event.stopPropagation(); onWatch(report.id); }}>{watched ? "★" : "👁"}</button>
        <button className="btn-ghost pc-tc-btn-sm" onClick={event => { event.stopPropagation(); onRescout(report); }}>Ojear de nuevo</button>
        <button className="btn-gold pc-tc-btn-sm" onClick={event => { event.stopPropagation(); onGoMarket(); }} disabled={locked} title={locked ? "Necesita más confianza para ofertar" : undefined}>Oferta</button>
      </div>
    </div>
  );
}

const DURATIONS = [[3, "3 días (1 jornada)"], [10, "10 días (2 jornadas)"], [21, "21 días (3 jornadas)"]];
const GROUP_LABEL = { POR: "portero", DEF: "defensa", MED: "centrocampista", DEL: "delantero" };

export default function PCScoutingTab({ game, candidates = [], subTab, onSubTabChange, onStartMission, onCancelMission, onToggleWatch, onOpenPlayer, onGoMarket }) {
  const scouting = game.scouting ?? { scouts: [], missions: [], reports: [], watchlist: [] };
  const activeScoutIds = new Set(scouting.missions.filter(m => m.status === "active").map(m => m.scoutId));
  const [form, setForm] = useState({ scoutId: scouting.scouts.find(s => !activeScoutIds.has(s.id))?.id ?? scouting.scouts[0]?.id ?? "", position: null, group: null, maxAge: "23", minOverall: "70", maxValue: "15000000", durationDays: 3, region: "España" });
  const watched = new Set(scouting.watchlist);
  const reports = scouting.reports ?? [];
  const watchReports = reports.filter(r => watched.has(r.id));
  const activeMissions = scouting.missions.filter(m => m.status === "active");
  const isAthletic = game.teamId === "athletic";
  const needs = getSquadNeeds(game);

  const submit = () => {
    const target = form.position ? form.position : form.group ? GROUP_LABEL[form.group] : null;
    const label = target ? `Buscar ${target}${form.maxAge ? ` menor de ${Number(form.maxAge) + 1} años` : ""}` : `Búsqueda general${form.maxAge ? ` sub-${Number(form.maxAge) + 1}` : ""}`;
    onStartMission({ position: form.position, group: form.group, maxAge: form.maxAge ? Number(form.maxAge) : null, minOverall: form.minOverall ? Number(form.minOverall) : null, maxValue: form.maxValue ? Number(form.maxValue) : null, scoutId: form.scoutId, durationDays: form.durationDays, region: form.region, label });
  };

  const rescout = report => {
    onStartMission({ playerId: report.playerId, teamId: report.teamId, scoutId: form.scoutId || scouting.scouts.find(s => !activeScoutIds.has(s.id))?.id, durationDays: form.durationDays, region: form.region, label: `Informe individual de ${report.player.name}` });
  };

  return (
    <div className="pc-tc-tab">
      {isAthletic && (
        <div className="pc-tc-athletic-note">
          🦁 Como Athletic Club, tu red de scouting solo puede fichar jugadores vascos o formados en la cantera de clubes vascos (Real Sociedad, Osasuna, Alavés) — el resto de la plantilla mundial no aparece en tu mercado.
        </div>
      )}

      <div className="pc-tc-sub-tabs">
        {[["nueva", "Nueva misión"], ["informes", `Informes (${reports.length})`], ["seguimiento", `Seguimiento (${watchReports.length})`], ["buscar", "Buscar"]].map(([id, label]) => (
          <button key={id} className={`pc-tc-sub-tab${subTab === id ? " active" : ""}`} onClick={() => onSubTabChange(id)}>{label}</button>
        ))}
      </div>

      {subTab === "nueva" && (
        <>
          <div className="pc-tc-section-label">Necesidades de plantilla</div>
          <div className="pc-tc-needs-grid">
            {needs.map(item => (
              <div key={item.group} className="pc-tc-need-card" style={{ borderLeftColor: NEED_COLOR[item.level] }}>
                <div className="pc-tc-need-label">{item.label}</div>
                <div className="pc-tc-need-detail">{item.count}/{item.target} jugadores · Media {item.quality}</div>
                <div className="pc-tc-need-level" style={{ color: NEED_COLOR[item.level] }}>Necesidad {item.level.toLowerCase()}</div>
              </div>
            ))}
          </div>

          <div className="pc-tc-scout-grid">
          <div className="pc-tc-mission-form">
            <div>
              <label>Ojeador asignado</label>
              <select value={form.scoutId} onChange={e => setForm({ ...form, scoutId: e.target.value })}>
                {scouting.scouts.map(s => <option key={s.id} value={s.id} disabled={activeScoutIds.has(s.id)}>{s.name} (Nivel {s.level} · {SCOUT_SPECIALTIES[s.specialty]?.label ?? "Generalista"}){activeScoutIds.has(s.id) ? " — en misión" : ""}</option>)}
              </select>
            </div>
            <div>
              <label>Posición</label>
              <PositionPicker
                position={form.position} group={form.group}
                onChangePosition={pos => setForm({ ...form, position: pos, group: null })}
                onChangeGroup={g => setForm({ ...form, group: g, position: null })}
                onChangeAny={() => setForm({ ...form, position: null, group: null })}
              />
            </div>
            <div><label>Edad máxima</label><input type="number" value={form.maxAge} onChange={e => setForm({ ...form, maxAge: e.target.value })} /></div>
            <div><label>Media mínima</label><input type="number" value={form.minOverall} onChange={e => setForm({ ...form, minOverall: e.target.value })} /></div>
            <div><label>Valor máximo de mercado</label><input type="number" value={form.maxValue} onChange={e => setForm({ ...form, maxValue: e.target.value })} /></div>
            <div>
              <label>Duración</label>
              <select value={form.durationDays} onChange={e => setForm({ ...form, durationDays: Number(e.target.value) })}>{DURATIONS.map(([d, label]) => <option key={d} value={d}>{label}</option>)}</select>
            </div>
            <div>
              <label>Región</label>
              <select value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}>{["España", "Europa", "Sudamérica", "Internacional"].map(r => <option key={r}>{r}</option>)}</select>
              <div className="pc-tc-region-hint">🔧 Próximamente filtrará resultados — por ahora es solo informativo.</div>
            </div>
            <button className="btn-gold pc-tc-mission-submit" onClick={submit} disabled={!form.scoutId}>Enviar ojeador</button>
          </div>

          <div>
            <div className="pc-tc-section-label">Misiones activas</div>
            {activeMissions.length === 0 && <div className="pc-tc-empty" style={{ marginBottom: 20 }}>No hay misiones en curso.</div>}
            {activeMissions.map(m => (
              <div key={m.id} className="pc-tc-mission-card">
                <div className="pc-tc-status-line"><span className="pc-tc-status-dot pending" /><span>{m.scoutName}</span></div>
                <div className="pc-tc-status-detail">{m.label} · {m.progress}% completado</div>
                <button className="btn-ghost pc-tc-btn-sm" onClick={() => onCancelMission(m.id)}>Cancelar misión</button>
              </div>
            ))}

            <div className="pc-tc-section-label">Tu equipo de ojeadores</div>
            <div className="pc-tc-scout-roster">
              {scouting.scouts.map(s => {
                const active = scouting.missions.find(m => m.scoutId === s.id && m.status === "active");
                const specialty = SCOUT_SPECIALTIES[s.specialty];
                return (
                  <div key={s.id} className="pc-tc-listing-card pc-tc-scout-card">
                    <div className="pc-tc-listing-top">
                      <div className="pc-tc-scout-avatar">{specialty?.icon ?? "🔎"}</div>
                      <div>
                        <div className="pc-tc-p-name">{s.name}</div>
                        <div className="pc-tc-p-sub">Nivel {s.level} · {specialty?.label ?? "Generalista"}</div>
                      </div>
                    </div>
                    <div className={`pc-tc-deal-badge ${active ? "transfer" : "free"}`}>{active ? "En misión" : "Disponible"}</div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </>
      )}

      {subTab === "informes" && (
        <div className="pc-tc-report-grid">
          {reports.length === 0 && <div className="pc-tc-empty">No hay informes disponibles. Inicia una misión para empezar.</div>}
          {reports.map(r => <ReportCard key={r.id} report={r} watched={watched.has(r.id)} onWatch={onToggleWatch} onOpen={onOpenPlayer} onRescout={rescout} onGoMarket={onGoMarket} playerList={reports.map(item => item.player)} />)}
        </div>
      )}

      {subTab === "seguimiento" && (
        <div className="pc-tc-report-grid">
          {watchReports.length === 0 && <div className="pc-tc-empty">Marca jugadores con ★ desde Informes para seguirlos aquí.</div>}
          {watchReports.map(r => (
            <div key={r.id} className="pc-tc-report-card">
              <div className="pc-tc-report-top">
                <div>
                  <div className="pc-tc-report-name">{r.player.name}</div>
                  <div className="pc-tc-report-meta">{r.teamName} · {r.player.pos} · {r.player.age} años</div>
                </div>
                {r.talent && <div className="pc-tc-talent-badge" style={{ background: `${r.talent.color}22`, color: r.talent.color }}>{r.talent.icon} {r.talent.label}</div>}
              </div>
              <div className="pc-tc-range-row">
                <div className="pc-tc-range-block">Media actual<span className="val">{r.overallRange[0]}–{r.overallRange[1]}</span></div>
                <div className="pc-tc-range-block">Potencial<span className="val">{r.potentialRange[0]}–{r.potentialRange[1]}</span></div>
                <div className="pc-tc-range-block">Valor estimado<span className="val">{fmt(r.marketValueRange[0])}–{fmt(r.marketValueRange[1])}</span></div>
              </div>
              <div className="pc-tc-report-actions">
                <button className="btn-ghost pc-tc-btn-sm" onClick={() => onToggleWatch(r.id)}>Quitar de seguimiento</button>
                <button className="btn-gold pc-tc-btn-sm" onClick={onGoMarket}>Oferta al club</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === "buscar" && <PCPlayerSearch game={game} candidates={candidates} onRequest={onStartMission} />}
    </div>
  );
}
