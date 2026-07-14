import TeamCrest from "../TeamCrest.jsx";
import { getFanMood } from "../../fans/fanEngine.js";

const money = value => `€${Math.abs(value ?? 0) >= 1000 ? `${(Math.abs(value) / 1000).toFixed(1)}M` : `${Math.round(Math.abs(value ?? 0))}K`}`;
// Mismo mapeo tipo→icono que BoardLegacyScreen.jsx/PCBoardScreen.jsx/PreseasonScreen.jsx (móvil).
const OBJECTIVE_ICON = { sport: "⚽", economy: "💶", development: "🌱" };

export default function PCPreseasonScreen({ game, team, teams, onStart }) {
  const statement = game.seasonOpeningStatement ?? {};
  const groups = { POR: 0, DEF: 0, MED: 0, DEL: 0 };
  game.players.forEach(player => groups[player.group] = (groups[player.group] ?? 0) + 1);
  const needs = [];
  if (groups.POR < 2) needs.push("Portero suplente");
  if (groups.DEF < 7) needs.push("Refuerzos defensivos");
  if (groups.MED < 6) needs.push("Centrocampista");
  if (groups.DEL < 5) needs.push("Delantero");
  const excess = Object.entries(groups).filter(([, count]) => count > 8).map(([group]) => ({ POR: "Porteros", DEF: "Defensas", MED: "Centrocampistas", DEL: "Delanteros" }[group]));
  const previousSeason = String(Number(game.season) - 1);
  // Mismo filtrado por club que PreseasonScreen.jsx (móvil): fromTeamId cubre sell/loanOut,
  // el chequeo de type cubre buy/loanIn (que nunca guardan toTeamId).
  const seasonTransfers = (game.transfers ?? []).filter(item =>
    String(item.season) === previousSeason &&
    (item.fromTeamId === game.teamId || item.toTeamId === game.teamId || ["buy", "loanIn"].includes(item.type))
  );
  const promoted = game.players.filter(player => player.academyData?.promotedSeason === previousSeason);
  const transferables = game.players.filter(player => player.marketStatus === "transfer"), loanable = game.players.filter(player => player.marketStatus === "loan");
  const fanMood = getFanMood(game.fanLove ?? 65);
  // Despido (v0.98): sin temporada anterior real que cerrar en el club nuevo.
  const hasOpeningBreakdown = statement.previousSeason !== null;
  const changeItems = [
    ...promoted.map(player => ({ key: player.id, label: `⬆ Promoción: ${player.name}`, tag: "Cantera", up: true })),
    ...seasonTransfers.slice(-8).map((item, index) => ({ key: `${item.player.id}-${index}`, label: item.player.name, tag: ["buy", "loanIn"].includes(item.type) ? "⬆ Alta" : "⬇ Baja", up: ["buy", "loanIn"].includes(item.type) })),
  ];

  return (
    <div className="pc-ps-root">
      <div className="pc-ps-header">
        <div className="pc-ps-header-top">
          <div className="pc-ps-crest"><TeamCrest team={team} size={40} /></div>
          <div>
            <div className="pc-ps-label">Pretemporada {game.season}/{String(Number(game.season) + 1).slice(-2)}</div>
            <div className="pc-ps-title">{team?.name}</div>
            <div className="pc-ps-sub">Una nueva campaña empieza aquí.</div>
          </div>
        </div>
        <div className="pc-ps-hero-stats">
          <div className="pc-ps-hero-stat"><div className="pc-ps-hero-value" style={{ color: "var(--ps-gold)" }}>{money(statement.openingBalance)}</div><div className="pc-ps-hero-label">Presupuesto</div></div>
          <div className="pc-ps-hero-stat"><div className="pc-ps-hero-value">{Math.round(game.legacy?.clubPrestige ?? 0)}</div><div className="pc-ps-hero-label">Prestigio</div></div>
          <div className="pc-ps-hero-stat"><div className="pc-ps-hero-value" style={{ color: "#22c55e" }}>{fanMood.label}</div><div className="pc-ps-hero-label">Afición</div></div>
        </div>
        <div className="pc-ps-goal">Objetivo de directiva: <b>{team?.obj}</b></div>
      </div>

      <div className="pc-ps-layout">
        <div className="pc-ps-box">
          <div className="pc-ps-box-title">Objetivos de la directiva</div>
          {(game.legacy?.objectives ?? []).map(objective => (
            <div key={objective.id} className="pc-ps-objective-card">
              <div className="pc-ps-objective-label">{OBJECTIVE_ICON[objective.type] ?? "🎯"} {objective.label}</div>
              <div className="pc-ps-objective-reward">Recompensa: +{objective.reward.prestige} prestigio · €{objective.reward.budget / 1000}M</div>
              <div className="pc-ps-objective-progress"><div className="pc-ps-objective-progress-fill" style={{ width: `${Math.max(0, Math.min(100, objective.progress ?? 0))}%` }} /></div>
            </div>
          ))}
        </div>

        <div className="pc-ps-box">
          <div className="pc-ps-box-title">Desglose de apertura</div>
          {hasOpeningBreakdown ? (
            [["Saldo anterior", statement.closingBalance], ["Derechos TV", statement.tvRights], ["Patrocinios", statement.sponsorship], ["Socios", statement.members], ["Premios", statement.positionPrize], ["Gastos", -(statement.operatingCosts ?? 0)]].map(([label, value]) => (
              <div key={label} className="pc-ps-breakdown-row">
                <span>{label}</span>
                <span className="val" style={{ color: value >= 0 ? "#22c55e" : "#ef4444" }}>{value >= 0 ? "+" : "-"}{money(value)}</span>
              </div>
            ))
          ) : (
            <div className="pc-ps-breakdown-empty">Nuevo club: sin temporada anterior que cerrar aquí.</div>
          )}
        </div>
      </div>

      <div className="pc-ps-layout">
        <div className="pc-ps-box">
          <div className="pc-ps-box-title">Informe del director deportivo</div>
          {needs.length || excess.length ? (
            <div>
              {needs.map(item => <span key={item} className="pc-ps-need-chip need">🔴 {item}</span>)}
              {excess.map(item => <span key={item} className="pc-ps-need-chip excess">🔵 Exceso en {item.toLowerCase()}</span>)}
            </div>
          ) : <div className="pc-ps-need-empty">Plantilla equilibrada, sin necesidades urgentes.</div>}
        </div>

        <div className="pc-ps-box">
          <div className="pc-ps-box-title">Estado de plantilla</div>
          <div className="pc-ps-squad-row">
            {Object.entries(groups).map(([group, count]) => (
              <div key={group} className="pc-ps-squad-card"><div className="pc-ps-squad-value">{count}</div><div className="pc-ps-squad-label">{group}</div></div>
            ))}
          </div>
          <div className="pc-ps-squad-row-2">
            <div className="pc-ps-squad-card"><div className="pc-ps-squad-value">{transferables.length}</div><div className="pc-ps-squad-label">Transferibles</div></div>
            <div className="pc-ps-squad-card"><div className="pc-ps-squad-value">{loanable.length}</div><div className="pc-ps-squad-label">Cedibles</div></div>
            <div className="pc-ps-squad-card"><div className="pc-ps-squad-value">{promoted.length}</div><div className="pc-ps-squad-label">Canteranos</div></div>
          </div>
        </div>
      </div>

      <div className="pc-ps-box pc-ps-changes-box">
        <div className="pc-ps-box-title">Cambios de plantilla</div>
        {changeItems.length ? changeItems.map(item => (
          <div key={item.key} className="pc-ps-change-item">
            <span>{item.label}</span>
            <span className={`pc-ps-change-tag ${item.up ? "up" : "down"}`}>{item.tag}</span>
          </div>
        )) : <div className="pc-ps-change-empty">Sin movimientos recientes.</div>}
      </div>

      <div className="pc-ps-cta-row">
        <button className="btn-gold" onClick={onStart}>Comenzar temporada →</button>
      </div>
    </div>
  );
}
