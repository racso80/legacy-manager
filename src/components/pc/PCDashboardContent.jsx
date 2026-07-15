import { useState } from "react";
import TeamCrest from "../TeamCrest.jsx";
import { getMedicalAlerts } from "../../state/gameStateSelectors.js";
import { getDashboardNews } from "../../news/newsEngine.js";
import { getLockerRoomSummary } from "../../morale/moraleEngine.js";
import { getPrestigeLevel } from "../../legacy/legacyEngine.js";
import { getStandingsZone, LEAGUES } from "../../data/leagues.js";
import { NEWS_TYPE_LABEL, NEWS_META_TEXT, newsAccent, resolveNewsLeagueId } from "./news/newsPresentation.js";
import NewsRightZone from "./news/NewsRightZone.jsx";
import { PersonAvatar, STAFF_PERSONAS } from "../../App.jsx";

// Mismo mapeo que Dashboard (móvil, App.jsx) — se duplica en vez de exportarse/importarse,
// igual que el resto de lógica derivada compartida entre pantallas PC/móvil en esta sesión.
function emotionMeta(state = "neutral") {
  const key = String(state).toLowerCase();
  if (key.includes("enfad") || key.includes("dolido") || key.includes("tenso")) return { icon: "😠", label: "Enfadado", color: "#ef4444" };
  if (key.includes("preocup") || key.includes("serio") || key.includes("inquiet")) return { icon: "😟", label: "Preocupado", color: "#f59e0b" };
  if (key.includes("agrade") || key.includes("positivo") || key.includes("feliz")) return { icon: "😊", label: "Contento", color: "#22c55e" };
  if (key.includes("motivad")) return { icon: "🔥", label: "Motivado", color: "#f97316" };
  if (key.includes("lesion")) return { icon: "🤕", label: "Tocado", color: "#ef4444" };
  return { icon: "😐", label: "Neutral", color: "#9aa0b4" };
}
const priorityLabel = priority => (priority === "urgent" || priority === "critical") ? "Urgente" : priority === "important" ? "Importante" : "Informativa";
const priorityColor = priority => (priority === "urgent" || priority === "critical") ? "#ef4444" : priority === "important" ? "#f59e0b" : "#22c55e";
const priorityRank = priority => (priority === "urgent" || priority === "critical") ? 0 : priority === "important" ? 1 : 2;

function attentionPersona(item) {
  const title = `${item.title ?? ""} ${item.summary ?? ""}`.toLowerCase();
  if (item.category === "medical" || title.includes("lesion") || title.includes("riesgo físico") || title.includes("fatiga")) {
    return { ...Object.values(STAFF_PERSONAS).find(person => person.role?.toLowerCase().includes("dico")), name: "Médico", emotionalState: "preocupado", line: `${item.summary ?? item.title}`, action: item.actionLabel ?? "Ver informe" };
  }
  if (item.category === "contracts" || title.includes("contrato") || title.includes("renov")) {
    return { ...STAFF_PERSONAS["Director deportivo"], name: "Director deportivo", emotionalState: "serio", line: `He revisado este asunto contractual. ${item.summary ?? "Creo que deberíamos movernos pronto."}`, action: item.actionLabel ?? "Negociar" };
  }
  if (item.category === "market" || title.includes("oferta") || title.includes("mercado")) {
    return { ...STAFF_PERSONAS["Director deportivo"], name: "Director deportivo", emotionalState: "expectante", line: item.summary ?? "Hay movimiento en el mercado y necesitamos decidir.", action: item.actionLabel ?? "Revisar" };
  }
  if (item.category === "match" || title.includes("alineación") || title.includes("partido") || title.includes("sancionado")) {
    return { ...STAFF_PERSONAS["Segundo entrenador"], name: "Segundo entrenador", emotionalState: "directo", line: item.summary ?? "Míster, hay algo del próximo partido que debemos resolver.", action: item.actionLabel ?? "Preparar" };
  }
  if (item.category === "lockerRoom") {
    return { ...STAFF_PERSONAS["Capitán"], name: "Capitán", emotionalState: "preocupado", line: item.summary ?? "Hay un tema del vestuario que conviene atender.", action: item.actionLabel ?? "Hablar" };
  }
  if (item.category === "fans") {
    return { ...STAFF_PERSONAS.Presidente, name: "Presidente", emotionalState: "exigente", line: item.summary ?? "La afición está hablando y conviene escucharla.", action: item.actionLabel ?? "Responder" };
  }
  if (item.category === "staff" || item.category === "training") {
    return { ...STAFF_PERSONAS["Preparador físico"], name: "Preparador físico", emotionalState: "preocupado", line: item.summary ?? "Tengo una recomendación para el trabajo del equipo.", action: item.actionLabel ?? "Revisar" };
  }
  if (item.category === "board" || item.category === "career") {
    return { ...STAFF_PERSONAS.Presidente, name: "Presidente", emotionalState: "serio", line: item.summary ?? "Necesito comentar contigo una cuestión importante.", action: item.actionLabel ?? "Entrar" };
  }
  if (item.category === "youth") {
    return { emoji: "🌱", color: "#84cc16", role: "Responsable de cantera", personality: "protege el futuro", name: "Responsable de cantera", emotionalState: "ilusionado", line: item.summary ?? "Hay un chico que merece tu atención.", action: item.actionLabel ?? "Ver cantera" };
  }
  return { ...STAFF_PERSONAS["Segundo entrenador"], name: "Segundo entrenador", emotionalState: "neutral", line: item.summary ?? item.title, action: item.actionLabel ?? "Revisar" };
}

function clubLifePersona(issue) {
  const actorMap = {
    sportingDirector: "Director deportivo", assistantCoach: "Segundo entrenador", doctor: "Médico",
    fitnessCoach: "Preparador físico", psychologist: "Psicólogo", captain: "Capitán",
    president: "Presidente", academyChief: "Jefe de cantera", pressOfficer: "Responsable de prensa",
  };
  const actorName = actorMap[issue.actorId] ?? "Segundo entrenador";
  const base = STAFF_PERSONAS[actorName] ?? { emoji: "👤", color: "#c9a84c", role: actorName, personality: "necesita una decisión" };
  return {
    ...base,
    name: issue.person?.name ?? actorName,
    role: issue.person?.name ? `${base.name ?? actorName} · ${base.role ?? issue.origin}` : base.role,
    portrait: issue.person?.portrait ?? null,
    emotionalState: issue.emotionalState,
    line: issue.message,
    action: issue.actionLabel,
    consequence: issue.consequenceIfIgnored,
  };
}

function conversationPersona(conversation) {
  if (conversation.actorType === "player") return { name: conversation.actorName, role: conversation.role, portrait: conversation.portrait, emoji: "👤", color: "#c9a84c", emotionalState: conversation.emotionalState, line: conversation.opening, action: "Hablar", personality: conversation.personalityLabel };
  const base = STAFF_PERSONAS[conversation.actorName] ?? { emoji: "👤", color: "#c9a84c", role: conversation.role, personality: "profesional" };
  return { ...base, name: conversation.actorName, role: conversation.role ?? base.role, emotionalState: conversation.emotionalState, line: conversation.opening, action: "Hablar" };
}

const ALL_LEAGUES_FILTER = "all";

const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_LABELS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

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
const fmtBudget = v => (v >= 1000 ? `€${(v / 1000).toFixed(1)}M` : `€${Math.round(v ?? 0)}K`);

function FormDot({ result }) {
  const cls = result === "V" ? "fd-w" : result === "E" ? "fd-d" : "fd-l";
  return <div className={`pc-dash-v2-fd ${cls}`}>{result}</div>;
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
          <TeamCrest team={homeTeam} size={32} />
          <div className="pc-dash-v2-nm2-name">{homeTeam?.short ?? homeTeam?.name}</div>
          {formFor(homeTeam?.id, fixtures).length > 0 && (
            <div className="pc-dash-v2-nm2-form">{formFor(homeTeam?.id, fixtures).slice(0, 3).map((r, i) => <FormDot key={i} result={r} />)}</div>
          )}
        </div>
        <div className="pc-dash-v2-nm2-vs">VS</div>
        <div className="pc-dash-v2-nm2-team">
          <TeamCrest team={awayTeam} size={32} />
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
            const zone = getStandingsZone(pos, total, game.leagueConfig);
            const showHeader = zone.key !== lastZone;
            lastZone = zone.key;
            const team = teams.find(t => t.id === row.teamId);
            const isMe = row.teamId === game.teamId;
            const move = movement[row.teamId] ?? 0;
            const arrow = move > 0 ? "▲" : move < 0 ? "▼" : "—";
            const arrowColor = move > 0 ? "#3ecf8e" : move < 0 ? "#e0524a" : "rgba(255,255,255,0.2)";
            return (
              <div key={row.teamId}>
                {showHeader && (
                  <div className="pc-dash-v2-st-zone-hdr" style={{ color: zone.color }}>{zone.label}</div>
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
  setScreen, onPlay, directorItems = [], chiefBriefing, medicalAlerts = [], consequences = [], budgetSnapshot = null, onOpenScene,
}) {
  const [newsIndex, setNewsIndex] = useState(0);
  const [newsLeagueFilter, setNewsLeagueFilter] = useState(game.leagueId);

  const topNews = getDashboardNews(game.news ?? [], game, 10);
  const newsLeagueIds = [...new Set((game.news ?? []).map(item => resolveNewsLeagueId(item, game, teams)))];
  const filteredNews = newsLeagueFilter === ALL_LEAGUES_FILTER
    ? topNews
    : topNews.filter(item => resolveNewsLeagueId(item, game, teams) === newsLeagueFilter);
  const activeNewsIndex = Math.min(newsIndex, Math.max(0, filteredNews.length - 1));
  const handleNewsLeagueFilterChange = (id) => { setNewsLeagueFilter(id); setNewsIndex(0); };

  const nonInfoDirector = directorItems.filter(item => item.priority !== "info");

  // Misma derivación que waitingPeople en Dashboard (móvil, App.jsx) — duplicada, no
  // importada, mismo criterio que el resto de lógica derivada PC/móvil de esta sesión.
  const waitingPeople = nonInfoDirector.map(item => {
    if (item.issueCard) {
      const issue = item.issueCard;
      return {
        kind: "issue", id: issue.id, priority: issue.priority,
        person: { ...(issue.owner ?? {}), emotionalState: item.issue?.emotionalState ?? item.conversation?.emotionalState ?? item.attention?.emotionalState ?? "neutral", line: issue.summary, action: issue.availableActions?.[0] ?? "Revisar", consequence: issue.consequenceIfIgnored, subjectName: issue.subjectName, title: issue.title },
        onClick: () => onOpenScene?.(item),
      };
    }
    if (item.source === "clubLife") return { kind: "clubLife", id: item.rawId, priority: item.priority, person: { ...clubLifePersona(item.issue), mergedCount: item.mergedCount, protagonistOfDay: item.protagonistOfDay }, onClick: () => onOpenScene?.(item) };
    if (item.source === "conversation") return { kind: "conversation", id: item.rawId, priority: item.priority, person: { ...conversationPersona(item.conversation), mergedCount: item.mergedCount, protagonistOfDay: item.protagonistOfDay }, onClick: () => onOpenScene?.(item) };
    return { kind: "attention", id: item.rawId, priority: item.priority, person: { ...attentionPersona(item.attention), mergedCount: item.mergedCount, protagonistOfDay: item.protagonistOfDay }, onClick: () => onOpenScene?.(item) };
  }).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)).slice(0, 3);

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
      key: "attention", icon: "🔔", title: "Requiere tu atención", titleColor: "#e0524a", badge: waitingPeople.length || null,
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
              {group.key === "attention" ? (
                waitingPeople.length ? (
                  waitingPeople.map(item => {
                    const person = item.person;
                    const mood = emotionMeta(person.emotionalState);
                    const urgent = item.priority === "urgent" || item.priority === "critical";
                    return (
                      <button key={`${item.kind}-${item.id}`} className={`pc-dash-v2-persona-card${urgent ? " urgent" : ""}`} onClick={item.onClick}>
                        <PersonAvatar person={person} size={38} />
                        <span className="pc-dash-v2-persona-body">
                          <span className="pc-dash-v2-persona-top">
                            <strong className="pc-dash-v2-persona-name">{person.name}</strong>
                            <span className="pc-dash-v2-persona-priority" style={{ color: priorityColor(item.priority) }}>{priorityLabel(item.priority).toUpperCase()}</span>
                            <span className="pc-dash-v2-persona-mood" style={{ color: mood.color }}>{mood.icon}</span>
                          </span>
                          {person.title && <span className="pc-dash-v2-persona-role-title">{person.title}</span>}
                          {person.subjectName && <span className="pc-dash-v2-persona-subject">Sobre: {person.subjectName}</span>}
                          <span className="pc-dash-v2-persona-line">"{person.line}"</span>
                          <span className="pc-dash-v2-persona-meta">{person.role} · {mood.label} · {person.personality ?? "necesita una decisión"}</span>
                          {person.consequence && <span className="pc-dash-v2-persona-consequence">Si se ignora: {person.consequence}</span>}
                        </span>
                        <span className="pc-dash-v2-persona-action">{person.action} →</span>
                      </button>
                    );
                  })
                ) : (
                  <button className="pc-dash-v2-inbox-msg" onClick={() => setScreen("attention")}>
                    <span className="pc-dash-v2-inbox-msg-accent" style={{ background: "#e0524a" }} />
                    <span className="pc-dash-v2-inbox-msg-content">
                      <span className="pc-dash-v2-inbox-msg-title">Sin asuntos urgentes</span>
                      <span className="pc-dash-v2-inbox-msg-preview">No hay decisiones pendientes por ahora.</span>
                    </span>
                  </button>
                )
              ) : (
                group.rows.map((row, ri) => (
                  <button key={ri} className="pc-dash-v2-inbox-msg" onClick={row.onClick}>
                    <span className="pc-dash-v2-inbox-msg-accent" style={{ background: row.accent }} />
                    <span className="pc-dash-v2-inbox-msg-content">
                      <span className="pc-dash-v2-inbox-msg-title">{row.title}</span>
                      <span className="pc-dash-v2-inbox-msg-preview">{row.preview}</span>
                    </span>
                  </button>
                ))
              )}
              {gi < inboxGroups.length - 1 && <div className="pc-dash-v2-inbox-sep" />}
            </div>
          ))}
        </div>
      </div>

      <div className="pc-dash-v2-center-col">
        <div className="pc-dash-v2-news-section">
          <div className="pc-dash-v2-sec-label">Noticia destacada</div>
          <div className="pc-dash-v2-news-wrap">
            {filteredNews.length === 0 ? (
              <div className="pc-dash-v2-news-slide">
                <div className="pc-dash-v2-news-content">
                  <div className="pc-dash-v2-empty">Todavía no hay noticias relevantes.</div>
                </div>
              </div>
            ) : (
              <>
                <div className="pc-dash-v2-news-track" style={{ transform: `translateX(-${activeNewsIndex * 100}%)` }}>
                  {filteredNews.map(item => {
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
                {filteredNews.length > 1 && (
                  <div className="pc-dash-v2-news-nav">
                    <button className="pc-dash-v2-news-nav-btn" onClick={(e) => { e.stopPropagation(); setNewsIndex(i => (i - 1 + filteredNews.length) % filteredNews.length); }} aria-label="Noticia anterior">‹</button>
                    <div className="pc-dash-v2-news-dots">
                      {filteredNews.map((_, i) => (
                        <div key={i} className={`pc-dash-v2-ndot${i === activeNewsIndex ? " active" : ""}`} onClick={(e) => { e.stopPropagation(); setNewsIndex(i); }} />
                      ))}
                    </div>
                    <button className="pc-dash-v2-news-nav-btn" onClick={(e) => { e.stopPropagation(); setNewsIndex(i => (i + 1) % filteredNews.length); }} aria-label="Noticia siguiente">›</button>
                  </div>
                )}
              </>
            )}
          </div>
          {newsLeagueIds.length > 0 && (
            <div className="pc-dash-v2-news-league-filters">
              <button
                className={`pc-dash-v2-news-league-pill${newsLeagueFilter === ALL_LEAGUES_FILTER ? " active" : ""}`}
                onClick={() => handleNewsLeagueFilterChange(ALL_LEAGUES_FILTER)}
              >
                Todas
              </button>
              {newsLeagueIds.map(id => (
                <button
                  key={id}
                  className={`pc-dash-v2-news-league-pill${newsLeagueFilter === id ? " active" : ""}`}
                  onClick={() => handleNewsLeagueFilterChange(id)}
                >
                  {LEAGUES.find(l => l.id === id)?.shortName ?? id}
                </button>
              ))}
            </div>
          )}
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
