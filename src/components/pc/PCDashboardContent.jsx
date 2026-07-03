import { useState } from "react";
import TeamCrest from "../TeamCrest.jsx";
import { Initials } from "../../App.jsx";
import { getMedicalAlerts } from "../../state/gameStateSelectors.js";
import { getDashboardNews } from "../../news/newsEngine.js";

const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_LABELS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const NEWS_TYPE_ICON = { result: "⚽", standings: "📊", streak: "🔥", scorer: "🥇", performance: "⭐", transfer: "🔄", finance: "💶", injury: "🚑", board: "🤝", youth: "🌱", scouting: "🔎" };
const NEWS_TYPE_LABEL = { result: "Liga", standings: "Liga", streak: "Liga", scorer: "Liga", performance: "Liga", transfer: "Mercado", finance: "Finanzas", injury: "Médico", board: "Directiva", youth: "Cantera", scouting: "Scouting" };

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
function zoneColor(pos) {
  if (pos <= 4) return "#3ecf8e";
  if (pos <= 6) return "#60a5fa";
  if (pos >= 18) return "#e0524a";
  return "rgba(255,255,255,0.1)";
}
function sortedStandings(game) {
  return [...(game.standings ?? [])].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
}

function FormDot({ result }) {
  const cls = result === "V" ? "fd-w" : result === "E" ? "fd-d" : "fd-l";
  return <div className={`pc-dash-v2-fd ${cls}`}>{result}</div>;
}

// Zona derecha del slide de noticias: avatar del jugador si la noticia lo menciona,
// escudo del equipo si es una noticia de club, o un emoji genérico si no hay referencia.
function NewsRightZone({ item, game, teams }) {
  const player = item.playerIds?.[0] ? (game.players ?? []).find(p => p.id === item.playerIds[0]) : null;
  if (player) {
    return (
      <>
        <Initials name={player.name} size={44} rarity={player.rarity} borderRadius={999} />
        <div className="pc-dash-v2-news-right-label">{player.name.split(" ").slice(-1)[0]}</div>
      </>
    );
  }
  const team = item.teamIds?.[0] ? teams.find(t => t.id === item.teamIds[0]) : null;
  if (team) {
    return (
      <>
        <TeamCrest team={team} size={44} />
        <div className="pc-dash-v2-news-right-label">{team.short}</div>
      </>
    );
  }
  return <span>{NEWS_TYPE_ICON[item.type] ?? "📌"}</span>;
}

function NextMatchCard({ game, teams, nextFixture, nextOpponent, position, lineup, setScreen, onPlay, anchorDate }) {
  if (!nextFixture) {
    return (
      <div>
        <div className="pc-dash-v2-sec-label">Próximo partido</div>
        <div className="pc-dash-v2-next-match">
          <div className="pc-dash-v2-empty">No hay más partidos programados.</div>
        </div>
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
  const homePos = posFor(homeTeam?.id);
  const awayPos = posFor(awayTeam?.id);
  const oppPos = isHome ? awayPos : homePos;
  const highImportance = position <= 6 || (oppPos && oppPos <= 6);
  const importanceLabel = highImportance ? "⭐ Alta importancia" : position >= 16 ? "Necesitas puntuar" : "Jornada clave";
  const available = (game.players ?? []).filter(p => !p.injured && !p.suspended);
  const lineupValid = lineup.filter(id => id && available.find(p => p.id === id)).length === 11;
  const goPlay = () => (lineupValid ? onPlay() : setScreen("lineup"));
  const kickoff = anchorDate;
  const kickoffLabel = `${WEEKDAY_SHORT[(kickoff.getDay() + 6) % 7]} ${kickoff.getDate()} ${MONTH_SHORT[kickoff.getMonth()]}`;

  return (
    <div>
      <div className="pc-dash-v2-sec-label">Próximo partido · J{nextFixture.matchday}</div>
      <div className="pc-dash-v2-next-match">
        <div className="pc-dash-v2-nm-row">
          <div className="pc-dash-v2-nm-team">
            <TeamCrest team={homeTeam} size={32} className="pc-dash-v2-nm-crest" />
            <div className="pc-dash-v2-nm-name">{homeTeam?.name}</div>
            {formFor(homeTeam?.id, fixtures).length > 0 && (
              <div className="pc-dash-v2-nm-form">{formFor(homeTeam?.id, fixtures).map((r, i) => <FormDot key={i} result={r} />)}</div>
            )}
          </div>
          <div className="pc-dash-v2-nm-center">
            <div className="pc-dash-v2-nm-vs">VS</div>
            <div className="pc-dash-v2-nm-date">{kickoffLabel}</div>
            <div className="pc-dash-v2-nm-venue">{homeTeam?.stadium ?? "—"} · LaLiga</div>
            <div className="pc-dash-v2-nm-tags">
              <span className="pc-dash-v2-nm-tag">{position ?? "—"}º vs {oppPos || "—"}º</span>
              <span className={`pc-dash-v2-nm-tag${highImportance ? " hot" : ""}`}>{importanceLabel}</span>
            </div>
          </div>
          <div className="pc-dash-v2-nm-team">
            <TeamCrest team={awayTeam} size={32} className="pc-dash-v2-nm-crest" />
            <div className="pc-dash-v2-nm-name">{awayTeam?.name}</div>
            {formFor(awayTeam?.id, fixtures).length > 0 && (
              <div className="pc-dash-v2-nm-form">{formFor(awayTeam?.id, fixtures).map((r, i) => <FormDot key={i} result={r} />)}</div>
            )}
          </div>
          <button className="pc-dash-v2-nm-btn" onClick={goPlay}>
            {lineupValid ? "▶ Preparar" : `⚠️ Alineación (${lineup.filter(Boolean).length}/11)`}
          </button>
        </div>
      </div>
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
                      {fixture && (
                        <>
                          <div className="pc-dash-v2-ce-match-icon">⚽</div>
                          <div className="pc-dash-v2-ce-label" style={{ color: "#ff8fa3" }}>J{fixture.matchday}</div>
                        </>
                      )}
                      {isTraining && (
                        <>
                          <div className="pc-dash-v2-ce-icon">🏃</div>
                          <div className="pc-dash-v2-ce-label">Entreno</div>
                        </>
                      )}
                      {isMarketOpenDay && (
                        <>
                          <div className="pc-dash-v2-ce-market-icon">🟢</div>
                          <div className="pc-dash-v2-ce-label" style={{ color: "#3ecf8e" }}>Mercado</div>
                        </>
                      )}
                      {isCloseDay && (
                        <>
                          <div className="pc-dash-v2-ce-market-icon">🔴</div>
                          <div className="pc-dash-v2-ce-label" style={{ color: "#e0524a" }}>Cierra</div>
                        </>
                      )}
                    </div>
                    {fixture && (
                      <div className="pc-dash-v2-cal-crests">
                        <TeamCrest team={teams.find(t => t.id === fixture.homeTeamId)} size={12} />
                        <TeamCrest team={teams.find(t => t.id === fixture.awayTeamId)} size={12} />
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

function NextMatchdayFixtures({ game, teams }) {
  const targetMatchday = (game.fixtures ?? []).find(f => !f.played && (f.homeTeamId === game.teamId || f.awayTeamId === game.teamId))?.matchday ?? game.matchday;
  const rows = (game.fixtures ?? []).filter(f => f.matchday === targetMatchday);
  return (
    <div>
      <div className="pc-dash-v2-sec-label">Jornada {targetMatchday}</div>
      <div className="pc-dash-v2-panel">
        {rows.map(f => {
          const home = teams.find(t => t.id === f.homeTeamId);
          const away = teams.find(t => t.id === f.awayTeamId);
          const isUser = f.homeTeamId === game.teamId || f.awayTeamId === game.teamId;
          return (
            <div key={f.id} className={`pc-dash-v2-fx-row${isUser ? " me" : ""}`}>
              <div className={`pc-dash-v2-fx-team${f.homeTeamId === game.teamId ? " me" : ""}`}>{home?.name}</div>
              <div className="pc-dash-v2-fx-vs" style={isUser ? { color: "var(--club-accent, #c9a84c)" } : undefined}>vs</div>
              <div className={`pc-dash-v2-fx-team right${f.awayTeamId === game.teamId ? " me" : ""}`}>{away?.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StandingsPanel({ game, teams }) {
  const rows = sortedStandings(game);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      <div className="pc-dash-v2-sec-label">Clasificación</div>
      <div className="pc-dash-v2-standings-panel">
        <div className="pc-dash-v2-standings-scroll">
          {rows.map((row, index) => {
            const pos = index + 1;
            const team = teams.find(t => t.id === row.teamId);
            const isMe = row.teamId === game.teamId;
            return (
              <div key={row.teamId} className={`pc-dash-v2-st-row${isMe ? " hl" : ""}`}>
                <div className="pc-dash-v2-st-pos" style={isMe ? { color: "var(--club-accent, #c9a84c)" } : undefined}>{pos}</div>
                <div className="pc-dash-v2-st-zone" style={{ background: zoneColor(pos) }} />
                <div className={`pc-dash-v2-st-team${isMe ? " me" : ""}`}>{team?.name ?? row.teamId}</div>
                <div className="pc-dash-v2-st-pts" style={isMe ? { color: "var(--club-accent, #c9a84c)" } : undefined}>{row.points}</div>
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
  setScreen, onPlay, directorItems = [], chiefBriefing, medicalAlerts = [], consequences = [],
}) {
  const [newsIndex, setNewsIndex] = useState(0);

  const topNews = getDashboardNews(game.news ?? [], game, 5);
  const activeNewsIndex = Math.min(newsIndex, Math.max(0, topNews.length - 1));

  const nonInfoDirector = directorItems.filter(item => item.priority !== "info");
  const firstAttention = nonInfoDirector[0];

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
        <div>
          <div className="pc-dash-v2-sec-label">Noticia destacada</div>
          <div className="pc-dash-v2-news-wrap">
            {topNews.length === 0 ? (
              <div className="pc-dash-v2-news-slide">
                <div className="pc-dash-v2-news-body">
                  <div className="pc-dash-v2-empty">Todavía no hay noticias relevantes.</div>
                </div>
              </div>
            ) : (
              <>
                <div className="pc-dash-v2-news-track" style={{ transform: `translateX(-${activeNewsIndex * 100}%)` }}>
                  {topNews.map(item => (
                    <div className="pc-dash-v2-news-slide" key={item.id ?? item.title}>
                      <div className="pc-dash-v2-news-left">{NEWS_TYPE_ICON[item.type] ?? "📰"}</div>
                      <div className="pc-dash-v2-news-body">
                        <div className="pc-dash-v2-news-cat">{NEWS_TYPE_LABEL[item.type] ?? "Club"}{item.matchday ? ` · J${item.matchday}` : ""}</div>
                        <div className="pc-dash-v2-news-headline">{item.title}</div>
                        {item.summary && <div className="pc-dash-v2-news-summary">{item.summary}</div>}
                      </div>
                      <div className="pc-dash-v2-news-right">
                        <NewsRightZone item={item} game={game} teams={teams} />
                      </div>
                    </div>
                  ))}
                </div>
                {topNews.length > 1 && (
                  <div className="pc-dash-v2-news-nav">
                    <button className="pc-dash-v2-news-nav-btn" onClick={() => setNewsIndex(i => (i - 1 + topNews.length) % topNews.length)} aria-label="Noticia anterior">‹</button>
                    <div className="pc-dash-v2-news-dots">
                      {topNews.map((_, i) => (
                        <div key={i} className={`pc-dash-v2-ndot${i === activeNewsIndex ? " active" : ""}`} onClick={() => setNewsIndex(i)} />
                      ))}
                    </div>
                    <button className="pc-dash-v2-news-nav-btn" onClick={() => setNewsIndex(i => (i + 1) % topNews.length)} aria-label="Noticia siguiente">›</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <NextMatchCard game={game} teams={teams} nextFixture={nextFixture} nextOpponent={nextOpponent} position={position} lineup={lineup} setScreen={setScreen} onPlay={onPlay} anchorDate={anchorDate} />

        <CalendarPanel game={game} teams={teams} anchorMatchday={anchorMatchday} anchorDate={anchorDate} />
      </div>

      <div className="pc-dash-v2-right-col">
        <NextMatchdayFixtures game={game} teams={teams} />
        <StandingsPanel game={game} teams={teams} />
      </div>
    </div>
  );
}
