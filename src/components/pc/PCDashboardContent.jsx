import { useState } from "react";
import TeamCrest from "../TeamCrest.jsx";
import { Initials } from "../../App.jsx";
import { getMedicalAlerts } from "../../state/gameStateSelectors.js";
import { getDashboardNews } from "../../news/newsEngine.js";
import { getLockerRoomSummary } from "../../morale/moraleEngine.js";
import { getPrestigeLevel } from "../../legacy/legacyEngine.js";

const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_LABELS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const NEWS_TYPE_ICON = { result: "⚽", standings: "📊", streak: "🔥", scorer: "🥇", performance: "⭐", transfer: "🔄", finance: "💶", injury: "🚑", board: "🤝", youth: "🌱", scouting: "🔎" };
const NEWS_TYPE_LABEL = { result: "Liga", standings: "Liga", streak: "Liga", scorer: "Liga", performance: "Liga", transfer: "Mercado", finance: "Finanzas", injury: "Médico", board: "Directiva", youth: "Cantera", scouting: "Scouting" };
const NEWS_META_TEXT = { result: "LaLiga", standings: "LaLiga", streak: "LaLiga", scorer: "LaLiga", performance: "LaLiga", transfer: "Mercado de fichajes", finance: "Finanzas del club", injury: "Parte médico", board: "Directiva del club", youth: "Academia", scouting: "Departamento de scouting" };
const ZONE_LABEL = { cl: "Champions League", el: "Europa League", liga: "Liga", descenso: "Descenso" };

// El juego no tiene un calendario real (solo número de jornada), así que las fechas de
// partidos/entrenos/mercado en el calendario se sintetizan anclando la próxima jornada del
// usuario al próximo sábado y espaciando el resto de jornadas de 7 en 7 días desde ahí.
function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function nextSaturdayOnOrAfter(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return addDays(d, (6 - d.getDay() + 7) % 7);
}
function matchdayDate(matchday, anchorMatchday, anchorDate) {
  return addDays(anchorDate, (matchday - anchorMatchday) * 7);
}
function formFor(teamId, fixtures) {
  return fixtures
    .filter(f => f.played && (f.homeTeamId === teamId || f.awayTeamId === teamId))
    .slice(-5).reverse()
    .map(f => {
      const home = f.homeTeamId === teamId;
      const gf = home ? f.homeGoals : f.awayGoals;
      const ga = home ? f.awayGoals : f.homeGoals;
      return gf > ga ? "V" : gf === ga ? "E" : "D";
    });
}
function sortedStandings(game) {
  return [...(game.standings ?? [])].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
}
function zoneForPos(pos, total) {
  if (pos <= 4) return "cl";
  if (pos <= 6) return "el";
  if (pos > total - 3) return "descenso";
  return "liga";
}
function newsAccent(type) {
  if (type === "youth") return "#3ecf8e";
  if (type === "board") return "#c9a84c";
  return "var(--club-accent, #c9a84c)";
}
const fmtBudget = v => (v >= 1000 ? `€${(v / 1000).toFixed(1)}M` : `€${Math.round(v ?? 0)}K`);

function FormDot({ result }) {
  const cls = result === "V" ? "fd-w" : result === "E" ? "fd-d" : "fd-l";
  return <div className={`pc-dash-v2-fd ${cls}`}>{result}</div>;
}

// Zona derecha del slide de noticias: avatar del jugador si la noticia lo menciona (con el
// escudo del club debajo), o el escudo del equipo en grande si es una noticia de club.
function NewsRightZone({ item, game, teams }) {
  const player = item.playerIds?.[0] ? (game.players ?? []).find(p => p.id === item.playerIds[0]) : null;
  const team = item.teamIds?.[0] ? teams.find(t => t.id === item.teamIds[0]) : (player ? teams.find(t => t.id === game.teamId) : null);
  if (player) {
    return (
      <>
        <Initials name={player.name} size={64} rarity={player.rarity} borderRadius={999} />
        <div className="pc-dash-v2-news-right-label">{player.name.split(" ").slice(-1)[0]}</div>
        {team && <TeamCrest team={team} size={26} />}
      </>
    );
  }
  if (team) {
    return (
      <>
        <TeamCrest team={team} size={52} />
        <div className="pc-dash-v2-news-right-label">{team.name}</div>
      </>
    );
  }
  return <span style={{ fontSize: 36 }}>{NEWS_TYPE_ICON[item.type] ?? "📌"}</span>;
}

function NextMatchPanel({ game, teams, nextFixture, nextOpponent, position, lineup, setScreen, onPlay, anchorDate }) {
  if (!nextFixture) {
    return (
      <div className="pc-dash-v2-panel-sm">
        <div className="pc-dash-v2-panel-sm-title">Próximo Partido</div>
        <div className="pc-dash-v2-empty">No hay más partidos programados.</div>
      </div>
    );
  }
  const isHome = nextFixture.homeTeamId === game.teamId;
  const homeTeam = teams.find(t => t.id === nextFixture.homeTeamId);
  const awayTeam = teams.find(t => t.id === nextFixture.awayTeamId);
  const oppTeam = nextOpponent ?? (isHome ? awayTeam : homeTeam);
  const fixtures = game.fixtures ?? [];
  const standings = sortedStandings(game);
  const posFor = id => standings.findIndex(s => s.teamId === id) + 1;
  const oppPos = posFor(oppTeam?.id);
  const highImportance = position <= 6 || (oppPos && oppPos <= 6);
  const importanceLabel = highImportance ? "⭐ Alta importancia" : position >= 16 ? "Necesitas puntuar" : "Jornada clave";
  const available = (game.players ?? []).filter(p => !p.injured && !p.suspended);
  const lineupValid = lineup.filter(id => id && available.find(p => p.id === id)).length === 11;
  const goPlay = () => (lineupValid ? onPlay() : setScreen("lineup"));
  const kickoff = anchorDate;
  const kickoffLabel = `${WEEKDAY_SHORT[(kickoff.getDay() + 6) % 7]} ${kickoff.getDate()} ${MONTH_SHORT[kickoff.getMonth()]}`;

  return (
    <div className="pc-dash-v2-panel-sm">
      <div className="pc-dash-v2-panel-sm-title">Próximo Partido · J{nextFixture.matchday}</div>
      <div className="pc-dash-v2-nm2-teams">
        <div className="pc-dash-v2-nm2-team">
          <TeamCrest team={homeTeam} size={44} />
          <div className="pc-dash-v2-nm2-name">{homeTeam?.short ?? homeTeam?.name}</div>
          {formFor(homeTeam?.id, fixtures).length > 0 && (
            <div className="pc-dash-v2-nm2-form">{formFor(homeTeam?.id, fixtures).slice(0, 3).map((r, i) => <FormDot key={i} result={r} />)}</div>
          )}
        </div>
        <div className="pc-dash-v2-nm2-vs">VS</div>
        <div className="pc-dash-v2-nm2-team">
          <TeamCrest team={awayTeam} size={44} />
          <div className="pc-dash-v2-nm2-name">{awayTeam?.short ?? awayTeam?.name}</div>
          {formFor(awayTeam?.id, fixtures).length > 0 && (
            <div className="pc-dash-v2-nm2-form">{formFor(awayTeam?.id, fixtures).slice(0, 3).map((r, i) => <FormDot key={i} result={r} />)}</div>
          )}
        </div>
      </div>
      <div className="pc-dash-v2-nm2-date">{kickoffLabel} · {isHome ? "Local" : "Visitante"}</div>
      <div className="pc-dash-v2-nm2-tag">{importanceLabel}</div>
      <button className="pc-dash-v2-nm2-btn" onClick={goPlay}>
        {lineupValid ? "▶ Preparar" : `⚠️ Alineación (${lineup.filter(Boolean).length}/11)`}
      </button>
    </div>
  );
}

function ClubStatePanel({ game, setScreen, budgetSnapshot, medicalAlerts }) {
  const lockerSummary = getLockerRoomSummary(game.players ?? []);
  const fanSupport = Math.round(game.fanbase?.support ?? game.fanLove ?? 70);
  const budgetLeft = budgetSnapshot?.transferBudget ?? 0;
  const cells = [
    { label: "Vestuario", value: lockerSummary.atmosphere === "tenso" ? "Tenso" : lockerSummary.atmosphere === "positivo" ? "Positivo" : "Estable", color: lockerSummary.atmosphere === "tenso" ? "#e0524a" : lockerSummary.atmosphere === "positivo" ? "#3ecf8e" : "#c9a84c", onClick: () => setScreen("lockerRoom") },
    { label: "Afición", value: `${fanSupport}%`, color: fanSupport >= 70 ? "#3ecf8e" : fanSupport >= 50 ? "#e0a83e" : "#e0524a", onClick: () => setScreen("fans") },
    { label: "Economía", value: fmtBudget(budgetLeft), color: budgetLeft > 0 ? "#e9edf6" : "#e0524a", onClick: () => setScreen("finances") },
    { label: "Carga física", value: medicalAlerts.length ? `${medicalAlerts.length} alerta${medicalAlerts.length === 1 ? "" : "s"}` : "Controlada", color: medicalAlerts.length ? "#e0a83e" : "#3ecf8e", onClick: () => setScreen("medical") },
  ];
  return (
    <div className="pc-dash-v2-panel-sm">
      <div className="pc-dash-v2-panel-sm-title">Estado del Club</div>
      <div className="pc-dash-v2-club-state-grid">
        {cells.map(cell => (
          <div key={cell.label} className="pc-dash-v2-club-state-item" onClick={cell.onClick}>
            <div className="pc-dash-v2-club-state-label">{cell.label}</div>
            <div className="pc-dash-v2-club-state-val" style={{ color: cell.color }}>{cell.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ObjectivesPanel({ game, position }) {
  const sportObjective = (game.legacy?.objectives ?? []).find(o => o.type === "sport");
  const target = sportObjective?.target ?? 17;
  const sportProgress = Math.max(0, Math.min(100, sportObjective?.progress ?? 0));
  const confidence = Math.round(game.legacy?.confidence ?? 65);
  const clubPrestigeLevel = getPrestigeLevel(game.legacy?.clubPrestige ?? 30);
  const managerPrestigeLevel = getPrestigeLevel(game.legacy?.manager?.prestige ?? 10, true);
  const rows = [
    { label: `Liga · Top ${target}`, value: `${position ?? "—"}º`, fill: sportProgress, color: "var(--club-accent, #c9a84c)" },
    { label: "Confianza directiva", value: `${confidence}%`, fill: confidence, color: confidence >= 60 ? "#3ecf8e" : "#e0a83e" },
    { label: "Prestigio club", value: clubPrestigeLevel.label, fill: game.legacy?.clubPrestige ?? 30, color: clubPrestigeLevel.color },
    { label: "Entrenador", value: managerPrestigeLevel.label, fill: game.legacy?.manager?.prestige ?? 10, color: managerPrestigeLevel.color },
  ];
  return (
    <div className="pc-dash-v2-panel-sm">
      <div className="pc-dash-v2-panel-sm-title">Objetivos</div>
      {rows.map(row => (
        <div className="pc-dash-v2-obj-row" key={row.label}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pc-dash-v2-obj-label">{row.label}</div>
            <div className="pc-dash-v2-obj-bar"><div className="pc-dash-v2-obj-fill" style={{ width: `${row.fill}%`, background: row.color }} /></div>
          </div>
          <div className="pc-dash-v2-obj-val" style={{ color: row.color }}>{row.value}</div>
        </div>
      ))}
    </div>
  );
}

function CalendarPanel({ game, teams, anchorMatchday, anchorDate }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  const base = addDays(startOfWeekMonday(today), weekOffset * 14);
  const days = Array.from({ length: 14 }, (_, i) => addDays(base, i));
  const userFixtures = (game.fixtures ?? []).filter(f => f.homeTeamId === game.teamId || f.awayTeamId === game.teamId);
  const fixtureForDay = day => userFixtures.find(f => isSameDay(matchdayDate(f.matchday, anchorMatchday, anchorDate), day));
  const marketOpen = game.matchday <= 8 || game.matchday >= 31;
  const closeMatchday = game.matchday <= 8 ? 9 : 39;
  const closeDate = matchdayDate(closeMatchday, anchorMatchday, anchorDate);
  const firstWednesday = days.find(d => d.getDay() === 3) ?? days[0];
  const weeks = [days.slice(0, 7), days.slice(7, 14)];
  const monthLabel = `${MONTH_LABELS[days[0].getMonth()]} ${days[0].getFullYear()}`;

  return (
    <div className="pc-dash-v2-cal-wrap">
      <div className="pc-dash-v2-sec-label">Calendario — próximas 2 semanas</div>
      <div className="pc-dash-v2-calendar">
        <div className="pc-dash-v2-cal-hdr">
          <div className="pc-dash-v2-cal-title">{monthLabel}</div>
          <div className="pc-dash-v2-cal-nav">
            <button className="pc-dash-v2-cal-nav-btn" onClick={() => setWeekOffset(o => o - 1)} aria-label="Semana anterior">‹</button>
            <button className="pc-dash-v2-cal-nav-btn" onClick={() => setWeekOffset(o => o + 1)} aria-label="Semana siguiente">›</button>
          </div>
        </div>
        <div className="pc-dash-v2-cal-weeks">
          {weeks.map((week, wi) => (
            <div className="pc-dash-v2-cal-week" key={wi}>
              {week.map((day, di) => {
                const isToday = isSameDay(day, today);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const fixture = fixtureForDay(day);
                const isMarketOpenDay = marketOpen && isSameDay(day, firstWednesday);
                const isCloseDay = marketOpen && isSameDay(day, closeDate);
                const isTraining = !isWeekend && !fixture;
                return (
                  <div key={di} className={`pc-dash-v2-cal-day${isToday ? " today" : ""}${isWeekend ? " weekend" : ""}${fixture ? " match" : ""}`}>
                    <div className="pc-dash-v2-cal-dn">{WEEKDAY_SHORT[di]}</div>
                    <div className="pc-dash-v2-cal-num">{day.getDate()}</div>
                    <div className="pc-dash-v2-cal-events">
                      {fixture && <div className="pc-dash-v2-ce-icon">⚽</div>}
                      {isTraining && <div className="pc-dash-v2-ce-icon">🏃</div>}
                      {isMarketOpenDay && <div className="pc-dash-v2-ce-icon">🟢</div>}
                      {isCloseDay && <div className="pc-dash-v2-ce-icon">🔴</div>}
                    </div>
                    {fixture && (
                      <div className="pc-dash-v2-cal-crests">
                        <TeamCrest team={teams.find(t => t.id === fixture.homeTeamId)} size={28} />
                        <TeamCrest team={teams.find(t => t.id === fixture.awayTeamId)} size={28} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NextMatchdayFixtures({ game, teams, setScreen }) {
  const targetMatchday = (game.fixtures ?? []).find(f => !f.played && (f.homeTeamId === game.teamId || f.awayTeamId === game.teamId))?.matchday ?? game.matchday;
  const rows = (game.fixtures ?? []).filter(f => f.matchday === targetMatchday);
  return (
    <div>
      <div className="pc-dash-v2-sec-label">Jornada {targetMatchday}</div>
      <div className="pc-dash-v2-panel" onClick={() => setScreen("calendar")}>
        {rows.map(f => {
          const home = teams.find(t => t.id === f.homeTeamId);
          const away = teams.find(t => t.id === f.awayTeamId);
          const isUser = f.homeTeamId === game.teamId || f.awayTeamId === game.teamId;
          return (
            <div key={f.id} className={`pc-dash-v2-fx-row${isUser ? " me" : ""}`}>
              <TeamCrest team={home} size={16} />
              <div className={`pc-dash-v2-fx-team${f.homeTeamId === game.teamId ? " me" : ""}`}>{home?.name}</div>
              <div className="pc-dash-v2-fx-vs" style={isUser ? { color: "var(--club-accent, #c9a84c)" } : undefined}>vs</div>
              <TeamCrest team={away} size={16} />
              <div className={`pc-dash-v2-fx-team right${f.awayTeamId === game.teamId ? " me" : ""}`}>{away?.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StandingsPanel({ game, teams, setScreen }) {
  const rows = sortedStandings(game);
  const total = rows.length;
  const movement = game.standingsMovement ?? {};
  let lastZone = null;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      <div className="pc-dash-v2-sec-label">Clasificación</div>
      <div className="pc-dash-v2-standings-panel" onClick={() => setScreen("standings")}>
        <div className="pc-dash-v2-standings-scroll">
          {rows.map((row, index) => {
            const pos = index + 1;
            const zone = zoneForPos(pos, total);
            const showHeader = zone !== lastZone;
            lastZone = zone;
            const team = teams.find(t => t.id === row.teamId);
            const isMe = row.teamId === game.teamId;
            const move = movement[row.teamId] ?? 0;
            const arrow = move > 0 ? "▲" : move < 0 ? "▼" : "—";
            const arrowColor = move > 0 ? "#3ecf8e" : move < 0 ? "#e0524a" : "rgba(255,255,255,0.2)";
            return (
              <div key={row.teamId}>
                {showHeader && (
                  <div className="pc-dash-v2-st-zone-hdr" style={zone === "descenso" ? { color: "#e0524a" } : undefined}>{ZONE_LABEL[zone]}</div>
                )}
                <div className={`pc-dash-v2-st-row${isMe ? " hl" : ""}`}>
                  <div className="pc-dash-v2-st-pos" style={isMe ? { color: "var(--club-accent, #c9a84c)" } : undefined}>{pos}</div>
                  <div className="pc-dash-v2-st-arrow" style={{ color: arrowColor }}>{arrow}</div>
                  <TeamCrest team={team} size={16} />
                  <div className={`pc-dash-v2-st-team${isMe ? " me" : ""}`}>{team?.name ?? row.teamId}</div>
                  <div className="pc-dash-v2-st-pj">{row.played ?? 0}</div>
                  <div className="pc-dash-v2-st-pts" style={isMe ? { color: "var(--club-accent, #c9a84c)" } : undefined}>{row.points}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PCDashboardContent({
  game, teams = [], position, nextFixture, nextOpponent, lineup = [],
  setScreen, onPlay, directorItems = [], chiefBriefing, medicalAlerts = [], consequences = [], budgetSnapshot = null,
}) {
  const [newsIndex, setNewsIndex] = useState(0);

  const topNews = getDashboardNews(game.news ?? [], game, 5);
  const activeNewsIndex = Math.min(newsIndex, Math.max(0, topNews.length - 1));

  const nonInfoDirector = directorItems.filter(item => item.priority !== "info");

  const allMedicalAlerts = medicalAlerts.length ? medicalAlerts : getMedicalAlerts(game);
  const topMedical = allMedicalAlerts.slice(0, 2);

  const chiefParts = (chiefBriefing ?? "").split(". ").filter(Boolean);
  const chiefTitle = chiefParts[0] ? `${chiefParts[0]}.` : "Buenos días, míster.";
  const chiefPreview = chiefParts.slice(1).join(". ");

  const consTitle = consequences[0]?.text ?? "Sin novedades relevantes.";
  const consPreview = consequences.slice(1, 3).map(c => c.text).join(" ");

  // Cada grupo del inbox corresponde a una fuente de datos ya existente; solo cambia
  // cómo se agrupan visualmente (cabecera + una o más filas de mensaje por grupo).
  const inboxGroups = [
    {
      key: "briefing", icon: "👔", title: "Jefe de Gabinete", titleColor: "var(--club-accent, #c9a84c)",
      rows: [{ title: chiefTitle, preview: chiefPreview, accent: "var(--club-accent, #c9a84c)", onClick: () => setScreen("attention") }],
    },
    {
      key: "attention", icon: "🔔", title: "Requiere tu atención", titleColor: "#e0524a", badge: nonInfoDirector.length || null,
      rows: nonInfoDirector.length
        ? nonInfoDirector.slice(0, 2).map(item => ({
            title: item.issueCard?.title ?? item.title ?? "Asunto pendiente",
            preview: item.issueCard?.summary ?? item.summary ?? "",
            accent: "#e0524a",
            onClick: () => setScreen("attention"),
          }))
        : [{ title: "Sin asuntos urgentes", preview: "No hay decisiones pendientes por ahora.", accent: "#e0524a", onClick: () => setScreen("attention") }],
    },
    {
      key: "medical", icon: "🏥", title: "Informe Médico", titleColor: "#e0a83e",
      rows: topMedical.length
        ? topMedical.map(alert => ({
            title: `${alert.player.name} — riesgo de lesión ${alert.risk}%`,
            preview: alert.state?.availabilityReason || "Carga elevada. Se recomienda descanso antes del próximo partido.",
            accent: "#e0a83e",
            onClick: () => setScreen("medical"),
          }))
        : [{ title: "Plantilla sin alertas", preview: "El cuerpo médico no reporta riesgos activos.", accent: "#e0a83e", onClick: () => setScreen("medical") }],
    },
    {
      key: "news", icon: "📰", title: "Noticias del Club", titleColor: "rgba(255,255,255,0.5)",
      rows: [{ title: topNews[0]?.title ?? "Sin noticias recientes", preview: topNews[0]?.summary ?? "", accent: "rgba(255,255,255,0.15)", onClick: () => setScreen("news") }],
    },
    {
      key: "consequences", icon: "⚡", title: "Últimas Consecuencias", titleColor: "rgba(255,255,255,0.4)",
      rows: [{ title: consTitle, preview: consPreview, accent: "rgba(255,255,255,0.08)", onClick: () => setScreen("attention") }],
    },
  ];

  const anchorMatchday = nextFixture?.matchday ?? game.matchday ?? 1;
  const anchorDate = nextSaturdayOnOrAfter(new Date());

  return (
    <div className="pc-dash-v2">
      <div className="pc-dash-v2-inbox-col">
        <div className="pc-dash-v2-sec-label">Mensajes del día</div>
        <div className="pc-dash-v2-inbox">
          {inboxGroups.map((group, gi) => (
            <div key={group.key} className="pc-dash-v2-inbox-group">
              <div className="pc-dash-v2-inbox-group-hdr">
                <span className="pc-dash-v2-inbox-group-icon">{group.icon}</span>
                <span className="pc-dash-v2-inbox-group-title" style={{ color: group.titleColor }}>{group.title}</span>
                {group.badge ? <span className="pc-dash-v2-inbox-group-badge">{group.badge}</span> : null}
              </div>
              {group.rows.map((row, ri) => (
                <button key={ri} className="pc-dash-v2-inbox-msg" onClick={row.onClick}>
                  <span className="pc-dash-v2-inbox-msg-accent" style={{ background: row.accent }} />
                  <span className="pc-dash-v2-inbox-msg-content">
                    <span className="pc-dash-v2-inbox-msg-title">{row.title}</span>
                    <span className="pc-dash-v2-inbox-msg-preview">{row.preview}</span>
                  </span>
                </button>
              ))}
              {gi < inboxGroups.length - 1 && <div className="pc-dash-v2-inbox-sep" />}
            </div>
          ))}
        </div>
      </div>

      <div className="pc-dash-v2-center-col">
        <div className="pc-dash-v2-news-section">
          <div className="pc-dash-v2-sec-label">Noticia destacada</div>
          <div className="pc-dash-v2-news-wrap">
            {topNews.length === 0 ? (
              <div className="pc-dash-v2-news-slide">
                <div className="pc-dash-v2-news-content">
                  <div className="pc-dash-v2-empty">Todavía no hay noticias relevantes.</div>
                </div>
              </div>
            ) : (
              <>
                <div className="pc-dash-v2-news-track" style={{ transform: `translateX(-${activeNewsIndex * 100}%)` }}>
                  {topNews.map(item => {
                    const accent = newsAccent(item.type);
                    return (
                      <div className="pc-dash-v2-news-slide" key={item.id ?? item.title} onClick={() => setScreen("news")}>
                        <div className="pc-dash-v2-news-bg" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 12%, transparent), transparent 60%)` }} />
                        <div className="pc-dash-v2-news-content">
                          <div className="pc-dash-v2-news-cat" style={{ color: accent }}>
                            <span className="pc-dash-v2-news-cat-bar" style={{ background: accent }} />
                            {NEWS_TYPE_LABEL[item.type] ?? "Club"}{item.matchday ? ` · J${item.matchday}` : ""}
                          </div>
                          <div className="pc-dash-v2-news-headline">{item.title}</div>
                          {item.summary && <div className="pc-dash-v2-news-summary">{item.summary}</div>}
                          <div className="pc-dash-v2-news-meta">{NEWS_META_TEXT[item.type] ?? "Club"}</div>
                        </div>
                        <div className="pc-dash-v2-news-right">
                          <NewsRightZone item={item} game={game} teams={teams} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {topNews.length > 1 && (
                  <div className="pc-dash-v2-news-nav">
                    <button className="pc-dash-v2-news-nav-btn" onClick={(e) => { e.stopPropagation(); setNewsIndex(i => (i - 1 + topNews.length) % topNews.length); }} aria-label="Noticia anterior">‹</button>
                    <div className="pc-dash-v2-news-dots">
                      {topNews.map((_, i) => (
                        <div key={i} className={`pc-dash-v2-ndot${i === activeNewsIndex ? " active" : ""}`} onClick={(e) => { e.stopPropagation(); setNewsIndex(i); }} />
                      ))}
                    </div>
                    <button className="pc-dash-v2-news-nav-btn" onClick={(e) => { e.stopPropagation(); setNewsIndex(i => (i + 1) % topNews.length); }} aria-label="Noticia siguiente">›</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="pc-dash-v2-three-row">
          <NextMatchPanel game={game} teams={teams} nextFixture={nextFixture} nextOpponent={nextOpponent} position={position} lineup={lineup} setScreen={setScreen} onPlay={onPlay} anchorDate={anchorDate} />
          <ClubStatePanel game={game} setScreen={setScreen} budgetSnapshot={budgetSnapshot} medicalAlerts={allMedicalAlerts} />
          <ObjectivesPanel game={game} position={position} />
        </div>

        <CalendarPanel game={game} teams={teams} anchorMatchday={anchorMatchday} anchorDate={anchorDate} />
      </div>

      <div className="pc-dash-v2-right-col">
        <NextMatchdayFixtures game={game} teams={teams} setScreen={setScreen} />
        <StandingsPanel game={game} teams={teams} setScreen={setScreen} />
      </div>
    </div>
  );
}
