import TeamCrest from "../TeamCrest.jsx";
import { TEAM_REAL_AVG, REAL_SQUADS } from "../../App.jsx";
import { getMedicalAlerts, buildPlayerState } from "../../state/gameStateSelectors.js";
import { getLockerRoomSummary } from "../../morale/moraleEngine.js";
import { getPrestigeLevel } from "../../legacy/legacyEngine.js";

function formatBudget(value) {
  if (value == null) return "—";
  return value >= 1000 ? `€${(value / 1000).toFixed(1)}M` : `€${Math.round(value)}K`;
}

function FormDot({ result }) {
  const color = result === "V" ? "#22c55e" : result === "E" ? "#f59e0b" : "#ef4444";
  return <span className="pc-form-dot" style={{ background: `${color}22`, border: `1px solid ${color}`, color }}>{result}</span>;
}

export default function PCDashboardContent({
  game, team, teams = [], position, budgetLeft,
  nextFixture, nextOpponent, lineup = [], attentionItems = [],
  formation, setScreen, onPlay, onOpenPlayer,
}) {
  const players = game.players ?? [];
  const standing = (game.standings ?? []).find(s => s.teamId === game.teamId);
  const fixtures = game.fixtures ?? [];
  const playedFixtures = fixtures.filter(f => f.played && (f.homeTeamId === game.teamId || f.awayTeamId === game.teamId));
  const lastResults = playedFixtures.slice(-5);
  const racha = [...lastResults].reverse().map(f => {
    const home = f.homeTeamId === game.teamId;
    const my = home ? f.homeGoals : f.awayGoals;
    const th = home ? f.awayGoals : f.homeGoals;
    return my > th ? "V" : my === th ? "E" : "D";
  });
  const confidence = Math.round(game.legacy?.confidence ?? 65);
  const getOpponent = f => teams.find(t => t.id === (f.homeTeamId === game.teamId ? f.awayTeamId : f.homeTeamId));

  const availablePlayers = players.filter(p => !p.injured && !p.suspended);
  const lineupPlayers = lineup.filter(id => id && availablePlayers.find(p => p.id === id));
  const lineupValid = lineupPlayers.length === 11;
  const lineupCount = lineupPlayers.length;

  const nonInfoAttention = attentionItems.filter(item => item.priority !== "info");

  const agendaItems = [
    nextFixture && { icon: "⚽", title: `Partido de Liga · Jornada ${nextFixture.matchday}`, detail: `${nextFixture.homeTeamId === game.teamId ? "Recibes a" : "Visitas a"} ${nextOpponent?.name ?? "rival por confirmar"}`, action: "match" },
    { icon: "🏋️", title: "Entrenamiento de la plantilla", detail: `Carga ${game.trainingPlan?.load ?? "media"} · revisar si hay fatiga acumulada`, action: "training" },
    (game.matchday <= 8 || game.matchday >= 31) && { icon: "💰", title: "Mercado abierto", detail: game.matchday <= 8 ? `Quedan ${Math.max(0, 9 - game.matchday)} jornadas para el cierre inicial` : `Quedan ${Math.max(0, 39 - game.matchday)} jornadas para el cierre final`, action: "transfers" },
    nonInfoAttention.find(item => item.category === "contracts") && { icon: "📄", title: "Contratos pendientes", detail: "Hay decisiones contractuales que requieren revisión", action: "contracts" },
    (game.transferMarket?.offers ?? []).some(offer => ["clubCounter", "playerCounter", "ready", "clubAccepted"].includes(offer.status)) && { icon: "📬", title: "Negociaciones activas", detail: "Hay respuestas de mercado esperando decisión", action: "transfers" },
  ].filter(Boolean).slice(0, 4);

  const lockerSummary = getLockerRoomSummary(players);
  const fanSupport = Math.round(game.fanbase?.support ?? game.fanLove ?? 70);
  const allMedicalAlerts = getMedicalAlerts(game);
  const avgFatigue = Math.round(players.reduce((s, p) => s + (p.fatigue ?? 20), 0) / Math.max(1, players.length));
  const kpiCards = [
    { label: "Vestuario", value: lockerSummary.atmosphere === "tenso" ? "Tenso" : lockerSummary.atmosphere === "positivo" ? "Positivo" : "Estable", trend: lockerSummary.unhappy.length ? `${lockerSummary.unhappy.length} jugador${lockerSummary.unhappy.length === 1 ? "" : "es"} incómodo${lockerSummary.unhappy.length === 1 ? "" : "s"}` : "Grupo unido", color: lockerSummary.atmosphere === "tenso" ? "#ef4444" : lockerSummary.atmosphere === "positivo" ? "#22c55e" : "#c9a84c", action: "lockerRoom" },
    { label: "Afición", value: `${fanSupport}%`, trend: fanSupport >= 70 ? "Ilusionada" : fanSupport >= 50 ? "Exigente" : "Preocupada", color: fanSupport >= 70 ? "#22c55e" : fanSupport >= 50 ? "#f59e0b" : "#ef4444", action: "fans" },
    { label: "Economía", value: formatBudget(budgetLeft), trend: budgetLeft > 0 ? "Margen para operar" : "Sin margen de fichajes", color: budgetLeft > 0 ? "#22c55e" : "#ef4444", action: "finances" },
    { label: "Carga física", value: allMedicalAlerts.length ? `${allMedicalAlerts.length} alertas` : "Controlada", trend: avgFatigue > 55 ? "Fatiga media elevada" : "Plantilla recuperando bien", color: allMedicalAlerts.length ? "#f97316" : "#22c55e", action: "medical" },
  ];

  const clubPrestigeLevel = getPrestigeLevel(game.legacy?.clubPrestige ?? 30);
  const managerPrestigeLevel = getPrestigeLevel(game.legacy?.manager?.prestige ?? 10, true);
  const objectiveItems = [
    { label: "Liga", value: `${position}º · ${standing?.points ?? 0} pts`, color: position <= 6 ? "#22c55e" : position >= 17 ? "#ef4444" : "#c9a84c" },
    { label: "Confianza presidente", value: `${confidence}/100`, color: confidence >= 60 ? "#22c55e" : "#f59e0b" },
    { label: "Prestigio club", value: clubPrestigeLevel.label, color: clubPrestigeLevel.color },
    { label: "Entrenador", value: managerPrestigeLevel.label, color: managerPrestigeLevel.color },
  ];

  const topPlayers = [...players].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0)).slice(0, 5);
  const availabilityFor = player => {
    const state = buildPlayerState(player, game);
    if (state.isInjured || state.isSuspended) return { label: state.isSuspended && !state.isInjured ? "Sancionado" : "Lesionado", color: "#ef4444" };
    if (state.isRecovering) return { label: "Recuperación", color: "#f59e0b" };
    return { label: "Disponible", color: "#22c55e" };
  };

  const quickActions = [
    ["📋", "Gestionar alineación", "lineup", "Once y suplentes", "#3b82f6"],
    ["💰", "Mercado de fichajes", "transfers", "Altas y bajas", "#22c55e"],
    ["🏋", "Entrenar plantilla", "training", "Plan semanal", "#f59e0b"],
    ["📰", "Ver noticias", "news", "Centro de prensa", "#a78bfa"],
  ];

  const goPlay = () => (lineupValid ? onPlay() : setScreen("lineup"));

  return (
    <div className="pc-dashboard">
      <div className="pc-dashboard-top-row">
        <div className="pc-panel-card pc-club-status-card">
          <div className="pc-club-status-header">
            <TeamCrest team={team} size={48} />
            <div style={{ minWidth: 0 }}>
              <div className="pc-club-status-name">{team?.name}</div>
              <div className="pc-club-status-position">{position ? `${position}º` : "—"}</div>
              <div className="pc-club-status-points">{standing?.points ?? 0} pts</div>
            </div>
          </div>
          {racha.length > 0 && (
            <div className="pc-club-status-form">
              <span className="pc-club-status-form-label">RACHA:</span>
              <div style={{ display: "flex", gap: 4 }}>
                {racha.map((r, i) => <FormDot key={i} result={r} />)}
              </div>
            </div>
          )}
        </div>

        {nextFixture ? (() => {
          const isHome = nextFixture.homeTeamId === game.teamId;
          const homeTeam = teams.find(t => t.id === nextFixture.homeTeamId);
          const awayTeam = teams.find(t => t.id === nextFixture.awayTeamId);
          const nextOpponentStanding = nextOpponent ? [...(game.standings ?? [])].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor).findIndex(row => row.teamId === nextOpponent.id) + 1 : null;
          const nextOpponentLast = nextOpponent ? fixtures.filter(f => f.played && (f.homeTeamId === nextOpponent.id || f.awayTeamId === nextOpponent.id)).slice(-5) : [];
          const nextOpponentForm = nextOpponentLast.map(f => {
            const h = f.homeTeamId === nextOpponent?.id;
            const gf = h ? f.homeGoals : f.awayGoals;
            const ga = h ? f.awayGoals : f.homeGoals;
            return gf > ga ? "V" : gf === ga ? "E" : "D";
          });
          const nextOpponentSquad = nextOpponent ? REAL_SQUADS[nextOpponent.id] ?? [] : [];
          const nextOpponentKeyPlayer = [...nextOpponentSquad].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))[0];
          const importance = position <= 6 || (nextOpponentStanding && nextOpponentStanding <= 6) ? "Partido de prestigio" : position >= 16 ? "Necesitas puntuar" : "Jornada clave";
          return (
            <div className="pc-panel-card pc-next-match-card">
              <div className="pc-panel-title">PRÓXIMO PARTIDO · J{nextFixture.matchday}</div>
              <div className="pc-next-match-teams">
                <div className="pc-next-match-side">
                  <TeamCrest team={homeTeam} size={44} style={{ margin: "0 auto 6px" }} />
                  <div className="pc-next-match-team-name" style={{ color: isHome ? "#c9a84c" : "#e8eaf0" }}>{homeTeam?.name}</div>
                  <div className="pc-next-match-venue-tag">🏠 Local{isHome ? " ★" : ""}</div>
                </div>
                <div className="pc-next-match-vs">VS</div>
                <div className="pc-next-match-side">
                  <TeamCrest team={awayTeam} size={44} style={{ margin: "0 auto 6px" }} />
                  <div className="pc-next-match-team-name" style={{ color: !isHome ? "#c9a84c" : "#e8eaf0" }}>{awayTeam?.name}</div>
                  <div className="pc-next-match-venue-tag">✈️ Visitante{!isHome ? " ★" : ""}</div>
                </div>
              </div>
              <div className="pc-next-match-meta">{nextOpponent?.name} · Media {nextOpponent?.avg ?? TEAM_REAL_AVG[nextOpponent?.id ?? ""] ?? "—"}</div>
              <div className="pc-next-match-stats-grid">
                <div className="pc-next-match-stat">
                  <div className="pc-next-match-stat-label">POSICIÓN RIVAL</div>
                  <div className="pc-next-match-stat-value">{nextOpponentStanding ? `${nextOpponentStanding}º` : "—"}</div>
                </div>
                <div className="pc-next-match-stat">
                  <div className="pc-next-match-stat-label">FORMA RIVAL</div>
                  <div className="pc-next-match-stat-value">
                    {nextOpponentForm.length ? <div style={{ display: "flex", gap: 3 }}>{nextOpponentForm.map((r, i) => <FormDot key={i} result={r} />)}</div> : "Sin racha reciente"}
                  </div>
                </div>
                <div className="pc-next-match-stat">
                  <div className="pc-next-match-stat-label">JUGADOR PELIGROSO</div>
                  <div className="pc-next-match-stat-value">{nextOpponentKeyPlayer ? `${nextOpponentKeyPlayer.name} (${nextOpponentKeyPlayer.overall})` : "Sin referencia"}</div>
                </div>
                <div className="pc-next-match-stat">
                  <div className="pc-next-match-stat-label">IMPORTANCIA</div>
                  <div className="pc-next-match-stat-value">{importance}</div>
                </div>
              </div>
              {formation && <div className="pc-next-match-meta">Formación: {formation}</div>}
              <button
                onClick={goPlay}
                className={lineupValid ? "btn-gold" : ""}
                style={{ width: "100%", marginTop: 12, background: lineupValid ? undefined : "#374151", color: lineupValid ? undefined : "#9aa0b4", border: lineupValid ? undefined : "1px solid rgba(255,255,255,.08)", padding: 13, borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                {lineupValid ? "▶ Jugar partido" : `⚠️ Alineación incompleta (${lineupCount}/11) — Configurar`}
              </button>
            </div>
          );
        })() : (
          <div className="pc-panel-card pc-next-match-card">
            <div className="pc-panel-title">PRÓXIMO PARTIDO</div>
            <div className="pc-right-panel-empty">No hay más partidos programados.</div>
          </div>
        )}
      </div>

      <div className="pc-dashboard-columns">
        <div className="pc-dashboard-col-left">
          {agendaItems.length > 0 && (
            <div className="pc-panel-card">
              <div className="pc-panel-title">📅 AGENDA DEL DÍA</div>
              <div className="pc-agenda-list">
                {agendaItems.map((item, index) => (
                  <button
                    key={`${item.title}-${index}`}
                    className="pc-agenda-item"
                    onClick={() => item.action === "match" ? goPlay() : setScreen(item.action)}
                  >
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong className="pc-agenda-item-title">{item.title}</strong>
                      <small className="pc-agenda-item-detail">{item.detail}</small>
                    </span>
                    <span style={{ color: "#6b7280" }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {lastResults.length > 0 && (
            <div className="pc-panel-card">
              <div className="pc-panel-title">ÚLTIMOS RESULTADOS</div>
              <div className="pc-results-list">
                {[...lastResults].reverse().map(f => {
                  const opp = getOpponent(f);
                  const isHome = f.homeTeamId === game.teamId;
                  const my = isHome ? f.homeGoals : f.awayGoals;
                  const th = isHome ? f.awayGoals : f.homeGoals;
                  const win = my > th; const draw = my === th;
                  const col = win ? "#22c55e" : draw ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={f.id} className="pc-result-row">
                      <TeamCrest team={opp} size={26} />
                      <div style={{ flex: 1, fontSize: 12, color: "#9aa0b4" }}>J{f.matchday} {isHome ? "vs" : "@"} {opp?.short}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf0" }}>{f.homeGoals}-{f.awayGoals}</div>
                      <div style={{ background: `${col}22`, color: col, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>{win ? "V" : draw ? "E" : "D"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="pc-dashboard-col-right">
          <div className="pc-panel-card">
            <div className="pc-panel-title">📊 ESTADO DEL CLUB</div>
            <div className="pc-kpi-grid">
              {kpiCards.map(card => (
                <button key={card.label} className="pc-kpi-card" onClick={() => setScreen(card.action)}>
                  <div className="pc-kpi-card-label">{card.label.toUpperCase()}</div>
                  <div className="pc-kpi-card-value" style={{ color: card.color }}>{card.value}</div>
                  <div className="pc-kpi-card-trend">{card.trend}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="pc-panel-card">
            <div className="pc-panel-title">🎯 OBJETIVOS</div>
            <div className="pc-objective-grid">
              {objectiveItems.map(item => (
                <div key={item.label} className="pc-objective-card">
                  <div className="pc-objective-label">{item.label.toUpperCase()}</div>
                  <div className="pc-objective-value" style={{ color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="pc-panel-card">
            <div className="pc-panel-title">JUGADORES DESTACADOS</div>
            <div className="pc-squad-highlights-list">
              {topPlayers.map(player => {
                const status = availabilityFor(player);
                return (
                  <button key={player.id} className="pc-squad-highlight-row" onClick={() => onOpenPlayer?.(player)}>
                    <span className="pc-squad-highlight-name">{player.name}</span>
                    <span className="pc-squad-highlight-overall">{player.overall}</span>
                    <span className="pc-squad-highlight-status" style={{ color: status.color }}>{status.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pc-panel-card">
            <div className="pc-panel-title">ACCIONES RÁPIDAS</div>
            <div className="quick-actions-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {quickActions.map(([icon, label, target, helper, accent], index) => (
                <button
                  key={target}
                  onClick={() => setScreen(target)}
                  className="quick-action-card"
                  style={{ display: "flex", alignItems: "center", gap: 9, textAlign: "left", background: `linear-gradient(145deg,${accent}10,#161a24)`, border: `1px solid ${accent}22`, borderRadius: 10, padding: 11, minHeight: 72, cursor: "pointer", animationDelay: `${index * 35}ms` }}
                >
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <span>
                    <strong style={{ display: "block", fontSize: 10, color: "#e8eaf0", lineHeight: 1.25 }}>{label}</strong>
                    <small style={{ display: "block", fontSize: 8, color: "#6b7280", marginTop: 3 }}>{helper}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
