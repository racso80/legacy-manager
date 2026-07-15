import { useState } from "react";
import TeamCrest from "../TeamCrest.jsx";

// Recibe fixtures/teamId ya resueltos para la liga que se está viendo (calculado por
// CalendarScreen en App.jsx, igual que PCStandingsScreen recibe standings/fixtures ya
// resueltos) — este componente no sabe nada de cambio de liga.
export default function PCCalendarScreen({ fixtures, teamId, isViewingActive, onPlay, lineup, players, setScreen, teams }) {
  const teamFixtures = fixtures.filter(f => f.homeTeamId === teamId || f.awayTeamId === teamId);
  const nextUnplayed = teamFixtures.find(f => !f.played);
  const [matchday, setMatchday] = useState(nextUnplayed?.matchday ?? 1);
  const [tab, setTab] = useState("todos");

  const getTeam = id => teams.find(t => t.id === id);
  const available = players ? players.filter(p => !p.injured && !p.suspended) : [];
  const lineupValid = lineup.filter(id => id && available.find(p => p.id === id)).length === 11;

  const allDayFixtures = fixtures.filter(f => f.matchday === matchday)
    .sort((a, b) => {
      const aUser = a.homeTeamId === teamId || a.awayTeamId === teamId ? 1 : 0;
      const bUser = b.homeTeamId === teamId || b.awayTeamId === teamId ? 1 : 0;
      return bUser - aUser;
    });
  const myFixture = allDayFixtures.find(f => f.homeTeamId === teamId || f.awayTeamId === teamId);
  const isNextMatchday = myFixture?.id === nextUnplayed?.id;
  const myResults = teamFixtures.filter(f => f.played).reverse();
  const myPlayed = myResults.length;
  const myWon = myResults.filter(f => { const h = f.homeTeamId === teamId; return h ? f.homeGoals > f.awayGoals : f.awayGoals > f.homeGoals; }).length;
  const myDrawn = myResults.filter(f => f.homeGoals === f.awayGoals).length;
  const myLost = myPlayed - myWon - myDrawn;
  const myGF = myResults.reduce((s, f) => s + (f.homeTeamId === teamId ? f.homeGoals : f.awayGoals), 0);
  const myGA = myResults.reduce((s, f) => s + (f.homeTeamId === teamId ? f.awayGoals : f.homeGoals), 0);
  const totalMD = fixtures.length ? Math.max(...fixtures.map(f => f.matchday)) : 38;
  const mdOptions = Array.from({ length: totalMD }, (_, i) => i + 1);

  const resultLabel = f => {
    if (!f.played) return "";
    const h = f.homeTeamId === teamId; const my = h ? f.homeGoals : f.awayGoals; const th = h ? f.awayGoals : f.homeGoals;
    return my > th ? "V" : my === th ? "E" : "D";
  };
  const resultClass = f => { const lbl = resultLabel(f); return lbl === "V" ? "win" : lbl === "E" ? "draw" : "loss"; };

  const shownFixtures = tab === "mi_equipo"
    ? allDayFixtures.filter(f => f.homeTeamId === teamId || f.awayTeamId === teamId)
    : allDayFixtures;

  return (
    <div className="pc-cal-layout">
      <div>
        <div className="pc-cal-md-nav">
          <button className="pc-cal-md-btn" onClick={() => setMatchday(m => Math.max(1, m - 1))}>←</button>
          <select className="pc-cal-md-select" value={matchday} onChange={e => setMatchday(Number(e.target.value))}>
            {mdOptions.map(md => (
              <option key={md} value={md}>Jornada {md}{md === nextUnplayed?.matchday ? " ← siguiente" : ""}</option>
            ))}
          </select>
          <button className="pc-cal-md-btn" onClick={() => setMatchday(m => Math.min(totalMD, m + 1))}>→</button>
        </div>

        <div className="pc-cal-tabs">
          {[["todos", "🗓️ Todos"], ...(isViewingActive ? [["mi_equipo", "⚽ Mi partido"]] : [])].map(([id, label]) => (
            <div key={id} className={`pc-cal-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>{label}</div>
          ))}
        </div>

        {tab === "todos" && myFixture && !myFixture.played && isNextMatchday && (
          <button className="btn-gold" style={{ width: "100%", marginBottom: 16, padding: 13, borderRadius: 8, fontSize: 13.5 }}
            onClick={lineupValid ? onPlay : () => setScreen("lineup")}>
            {lineupValid ? `▶ Jugar Jornada ${matchday}` : `⚠️ Alineación incompleta (${lineup.filter(Boolean).length}/11)`}
          </button>
        )}

        <div className="pc-cal-fixture-grid">
          {shownFixtures.map(f => {
            const home = getTeam(f.homeTeamId), away = getTeam(f.awayTeamId);
            const isUserGame = f.homeTeamId === teamId || f.awayTeamId === teamId;
            const isNext = f.id === nextUnplayed?.id;
            return (
              <div key={f.id} className={`pc-cal-fixture-card${isNext ? " next-match" : ""}${isUserGame ? " user-match" : ""}`}>
                {isUserGame && <div className="pc-cal-fixture-eyebrow">{isNext ? "▶ Tu próximo partido" : "Tu partido"}</div>}
                <div className="pc-cal-fixture-teams">
                  <div className="pc-cal-team-side">
                    <TeamCrest team={home} size={24} />
                    <span className={`pc-cal-team-name${f.homeTeamId === teamId ? " user" : ""}`}>{home?.name}</span>
                  </div>
                  <div className="pc-cal-score-box">
                    {f.played ? (
                      <>
                        <div>{f.homeGoals}-{f.awayGoals}</div>
                        {isUserGame && <div className={`pc-cal-result-chip ${resultClass(f)}`}>{resultLabel(f)}</div>}
                      </>
                    ) : "VS"}
                  </div>
                  <div className="pc-cal-team-side away">
                    <TeamCrest team={away} size={24} />
                    <span className={`pc-cal-team-name${f.awayTeamId === teamId ? " user" : ""}`}>{away?.name}</span>
                  </div>
                </div>
                {isNext && !f.played && tab === "mi_equipo" && (
                  <button className="btn-gold pc-cal-inline-play-btn" onClick={lineupValid ? onPlay : () => setScreen("lineup")}>
                    {lineupValid ? "▶ Jugar este partido" : "⚠️ Configura tu alineación primero"}
                  </button>
                )}
              </div>
            );
          })}
          {shownFixtures.length === 0 && <div className="pc-cal-empty">No hay partidos programados para esta jornada.</div>}
        </div>
      </div>

      <div>
        {isViewingActive ? (
          <>
            <div className="pc-cal-box">
              <div className="pc-cal-box-title">Tu temporada</div>
              <div className="pc-cal-stats-grid">
                {[["PJ", myPlayed, "#e8eaf0"], ["V", myWon, "#22c55e"], ["E", myDrawn, "#f59e0b"], ["D", myLost, "#ef4444"], ["GF", myGF, "#c9a84c"], ["GC", myGA, "#9aa0b4"]].map(([l, v, c]) => (
                  <div key={l} className="pc-cal-stat-mini">
                    <div className="pc-cal-stat-mini-value" style={{ color: c }}>{v}</div>
                    <div className="pc-cal-stat-mini-label">{l}</div>
                  </div>
                ))}
              </div>
              <div className="pc-cal-form-row">
                {myResults.slice(0, 5).map((f, i) => (
                  <div key={i} className={`pc-cal-form-chip ${resultClass(f)}`}>{resultLabel(f)}</div>
                ))}
              </div>
            </div>

            {tab === "mi_equipo" && myResults.length > 0 && (
              <div className="pc-cal-box">
                <div className="pc-cal-box-title">Historial reciente</div>
                {myResults.slice(0, 10).map(f => {
                  const opp = getTeam(f.homeTeamId === teamId ? f.awayTeamId : f.homeTeamId);
                  const isH = f.homeTeamId === teamId;
                  return (
                    <div key={f.id} className="pc-cal-history-item">
                      <div className={`pc-cal-history-chip ${resultClass(f)}`}>{resultLabel(f)}</div>
                      <span className="pc-cal-history-jornada">J{f.matchday}</span>
                      <span>{isH ? "vs" : "@"} {opp?.name}</span>
                      <span className="pc-cal-history-score">{f.homeGoals}-{f.awayGoals}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="pc-cal-box pc-cal-other-league-note">Viendo el calendario de otra liga — no es la tuya.</div>
        )}
      </div>
    </div>
  );
}
