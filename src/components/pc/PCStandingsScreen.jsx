import { Fragment } from "react";
import TeamCrest from "../TeamCrest.jsx";
import { REAL_SQUADS } from "../../App.jsx";
import { getStandingsZone } from "../../data/leagues.js";
import { extractNamesFromDescription } from "../../match/statisticalEngine.js";
function sortedStandings(standings) {
  return [...(standings ?? [])].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
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
function resolveCurrentTeamId(playerId, fallbackTeamId, players, teamId) {
  if (players?.some(p => p.id === playerId)) return teamId;
  for (const tId of Object.keys(REAL_SQUADS)) {
    if (REAL_SQUADS[tId]?.some(p => p.id === playerId)) return tId;
  }
  return fallbackTeamId;
}
function findPlayer(playerId, fallbackTeamId, players) {
  return players?.find(p => p.id === playerId) ?? (REAL_SQUADS[fallbackTeamId] ?? []).find(p => p.id === playerId) ?? null;
}
function primaryGoalkeeper(rowTeamId, players, teamId) {
  const roster = rowTeamId === teamId ? (players ?? []) : (REAL_SQUADS[rowTeamId] ?? []);
  const keepers = roster.filter(p => p.pos === "POR" || p.group === "POR");
  return [...keepers].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))[0] ?? null;
}

// Recorre todos los partidos jugados (propios y simulados entre equipos IA) para construir los
// rankings de goleadores/asistencias/tarjetas. Los eventos de tarjeta (YELLOW/RED) solo se generan
// para los partidos que juega el usuario en vivo — simAIGame() (partidos IA vs IA) solo produce
// eventos de gol — así que el ranking de Tarjetas queda necesariamente incompleto (solo refleja
// partidos donde participó el usuario). Se deja así a falta de simulación de tarjetas para IA vs IA.
function buildPlayerRankings({ fixtures, players, teamId }) {
  const goalMap = {}, assistMap = {}, cardMap = {};
  (fixtures ?? []).filter(f => f.played && f.events?.length).forEach(f => {
    f.events.forEach(e => {
      const scoringTeamIdAtTime =
        e.team === "home" ? f.homeTeamId :
        e.team === "away" ? f.awayTeamId :
        e.team === "user" ? teamId :
        f.homeTeamId === teamId ? f.awayTeamId : f.homeTeamId;
      if ((e.type === "GOAL" || e.type === "PENALTY") && e.playerId) {
        const currentTeamId = resolveCurrentTeamId(e.playerId, scoringTeamIdAtTime, players, teamId);
        if (!goalMap[e.playerId]) {
          const pl = findPlayer(e.playerId, scoringTeamIdAtTime, players);
          const fallbackName = pl?.name ?? e.playerName ?? extractNamesFromDescription(e.description).scorerName ?? "Jugador desconocido";
          goalMap[e.playerId] = { id: e.playerId, name: fallbackName, teamId: currentTeamId, count: 0 };
        }
        goalMap[e.playerId].count++;
      }
      if (e.assistId) {
        const currentTeamId = resolveCurrentTeamId(e.assistId, scoringTeamIdAtTime, players, teamId);
        if (!assistMap[e.assistId]) {
          const pl = findPlayer(e.assistId, scoringTeamIdAtTime, players);
          const fallbackName = pl?.name ?? extractNamesFromDescription(e.description).assistName ?? "Jugador desconocido";
          assistMap[e.assistId] = { id: e.assistId, name: fallbackName, teamId: currentTeamId, count: 0 };
        }
        assistMap[e.assistId].count++;
      }
      if (e.type === "YELLOW" && e.playerId) {
        const currentTeamId = resolveCurrentTeamId(e.playerId, scoringTeamIdAtTime, players, teamId);
        if (!cardMap[e.playerId]) {
          const pl = findPlayer(e.playerId, scoringTeamIdAtTime, players);
          cardMap[e.playerId] = { id: e.playerId, name: pl?.name ?? e.playerName ?? "Jugador desconocido", teamId: currentTeamId, count: 0 };
        }
        cardMap[e.playerId].count++;
      }
    });
  });
  return {
    goals: Object.values(goalMap).sort((a, b) => b.count - a.count).slice(0, 5),
    assists: Object.values(assistMap).sort((a, b) => b.count - a.count).slice(0, 5),
    cards: Object.values(cardMap).sort((a, b) => b.count - a.count).slice(0, 5),
  };
}

// El Trofeo Zamora premia al portero con menos goles encajados de media. No se registra qué
// portero concreto jugó cada partido para los rivales IA, así que se aproxima con el portero
// mejor valorado de cada plantilla y la media de encajados del EQUIPO completo por partido.
function buildZamoraRanking({ standings, players, teamId }) {
  return sortedStandings(standings)
    .filter(s => s.played > 0)
    .map(s => {
      const gk = primaryGoalkeeper(s.teamId, players, teamId);
      if (!gk) return null;
      return { id: gk.id, name: gk.name, teamId: s.teamId, avg: s.goalsAgainst / s.played };
    })
    .filter(Boolean)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 5);
}

function RankPanel({ icon, title, rows, teams, unit, onOpenPlayer, valueColor }) {
  return (
    <div className="pc-standings-rank-panel">
      <div className="pc-standings-rank-hdr">
        <span className="pc-standings-rank-icon">{icon}</span>
        <span className="pc-standings-rank-title">{title}</span>
      </div>
      {rows.length === 0 ? (
        <div className="pc-standings-rank-empty">Aún sin datos.</div>
      ) : rows.map((row, i) => {
        const team = teams.find(t => t.id === row.teamId);
        return (
          <div
            key={row.id}
            className="pc-standings-rank-row"
            style={{ cursor: row.playerObj ? "pointer" : "default" }}
            onClick={() => row.playerObj && onOpenPlayer(row.playerObj, row.teamId)}
          >
            <div className="pc-standings-rank-pos">{i + 1}</div>
            <TeamCrest team={team} size={20} className="pc-standings-rank-crest" />
            <div className="pc-standings-rank-info">
              <div className="pc-standings-rank-name">{row.name}</div>
              <div className="pc-standings-rank-team">{team?.name ?? row.teamId}</div>
            </div>
            <div className="pc-standings-rank-val" style={valueColor ? { color: valueColor } : undefined}>{row.value}{unit ?? ""}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function PCStandingsScreen({ standings, teamId, fixtures, players, movement = {}, teams = [], onOpenPlayer, season, leagueConfig }) {
  const sorted = sortedStandings(standings);
  const total = sorted.length;
  const getTeam = id => teams.find(t => t.id === id);

  const rankings = buildPlayerRankings({ fixtures, players, teamId });
  const zamora = buildZamoraRanking({ standings, players, teamId });

  const withPlayerObj = row => ({ ...row, value: row.count, playerObj: findPlayer(row.id, row.teamId, players) });

  let lastZone = null;

  return (
    <div className="pc-standings-page">
      <div className="pc-standings-main">
        <div className="pc-dash-v2-sec-label">Clasificación — {leagueConfig?.shortName ?? "LaLiga"} {season ?? ""}</div>
        <div className="pc-standings-table-wrap">
          <div className="pc-standings-table-hdr">
            <span className="pc-standings-table-hdr-icon">🏆</span>
            <div className="pc-standings-table-hdr-title">{leagueConfig?.name ?? "LaLiga Santander"}</div>
            <div className="pc-standings-table-hdr-sub">Temporada {season ?? "—"}</div>
          </div>
          <div className="pc-standings-table-scroll">
            <table className="pc-standings-table">
              <thead>
                <tr>
                  <th style={{ width: 24 }}>Pos</th>
                  <th style={{ width: 14 }}>Inf</th>
                  <th className="left" style={{ minWidth: 160 }}>Equipo</th>
                  <th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th>
                  <th style={{ width: 60 }}>Forma</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, index) => {
                  const pos = index + 1;
                  const zone = getStandingsZone(pos, total, leagueConfig);
                  const showZone = zone.key !== lastZone;
                  lastZone = zone.key;
                  const team = getTeam(row.teamId);
                  const isMe = row.teamId === teamId;
                  const move = movement[row.teamId] ?? 0;
                  const arrowCls = move > 0 ? "up" : move < 0 ? "dn" : "eq";
                  const arrow = move > 0 ? "▲" : move < 0 ? "▼" : "—";
                  const form = formFor(row.teamId, fixtures ?? []);
                  return (
                    <Fragment key={row.teamId}>
                      {showZone && (
                        <tr className="pc-standings-zone-label">
                          <td colSpan={12} style={{ color: zone.color }}>{zone.label}</td>
                        </tr>
                      )}
                      <tr className={`pc-standings-row${isMe ? " me" : ""}`}>
                        <td><span className={`pc-standings-pos${isMe ? " me" : ""}`}>{pos}</span></td>
                        <td><span className={`pc-standings-arrow ${arrowCls}`}>{arrow}</span></td>
                        <td className="left">
                          <div className="pc-standings-team-cell">
                            <TeamCrest team={team} size={20} />
                            <span className={`pc-standings-team-name${isMe ? " me" : ""}`}>{team?.name ?? row.teamId}</span>
                          </div>
                        </td>
                        <td>{row.played}</td>
                        <td>{row.won}</td>
                        <td>{row.drawn}</td>
                        <td>{row.lost}</td>
                        <td>{row.goalsFor}</td>
                        <td>{row.goalsAgainst}</td>
                        <td style={{ color: row.goalDifference > 0 ? "#3ecf8e" : row.goalDifference < 0 ? "#e0524a" : "rgba(255,255,255,0.3)" }}>
                          {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                        </td>
                        <td><span className={`pc-standings-pts${isMe ? " me" : ""}`}>{row.points}</span></td>
                        <td>
                          {form.length > 0 ? (
                            <div className="pc-standings-form-dots">
                              {form.map((r, i) => <div key={i} className={`pc-standings-fd ${r === "V" ? "fd-w" : r === "E" ? "fd-d" : "fd-l"}`} />)}
                            </div>
                          ) : "—"}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="pc-standings-right-col">
        <div className="pc-dash-v2-sec-label">Rankings individuales</div>
        <RankPanel icon="⚽" title="Goleadores" rows={rankings.goals.map(withPlayerObj)} teams={teams} onOpenPlayer={onOpenPlayer} />
        <RankPanel icon="🎯" title="Asistencias" rows={rankings.assists.map(withPlayerObj)} teams={teams} onOpenPlayer={onOpenPlayer} />
        <RankPanel icon="🟨" title="Tarjetas" rows={rankings.cards.map(withPlayerObj)} teams={teams} onOpenPlayer={onOpenPlayer} valueColor="#eab308" />
        <RankPanel icon="🧤" title="Trofeo Zamora" rows={zamora.map(row => ({ ...row, value: row.avg.toFixed(1), playerObj: findPlayer(row.id, row.teamId, players) }))} teams={teams} onOpenPlayer={onOpenPlayer} valueColor="#60a5fa" />
      </div>
    </div>
  );
}
