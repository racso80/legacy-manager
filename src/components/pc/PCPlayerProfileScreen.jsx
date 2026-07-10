import { useMemo, useState } from "react";
import PlayerAvatar from "../PlayerAvatar.jsx";
import { COUNTRY_NAMES, FLAGS } from "../PlayerProfileScreen.jsx";
import { PC_SCREEN_LABELS } from "./PCSidebar.jsx";
import { getKeyAttributes, getMarketValue, getPlayerSeasonStats, getPlayerTags, getPotential, getRecentForm } from "../../players/playerProfile.js";
import { calculateInjuryRisk, getAccumulatedLoad, getLoadLevel, getPhysicalStatus, getRiskLevel } from "../../medical/medicalEngine.js";
import { ensurePlayerMorale, getMoraleLevel } from "../../morale/moraleEngine.js";
import PCProfileGeneralTab from "./playerProfile/PCProfileGeneralTab.jsx";
import PCProfileStatsTab from "./playerProfile/PCProfileStatsTab.jsx";
import PCProfileDevelopmentTab from "./playerProfile/PCProfileDevelopmentTab.jsx";
import PCProfileContractTab from "./playerProfile/PCProfileContractTab.jsx";
import PCProfileHistoryTab from "./playerProfile/PCProfileHistoryTab.jsx";
import PCProfileNewsTab from "./playerProfile/PCProfileNewsTab.jsx";

const TABS = [["general", "General"], ["stats", "Estadísticas"], ["development", "Desarrollo"], ["contract", "Contrato"], ["history", "Historial"], ["news", "Noticias"]];

export default function PCPlayerProfileScreen({ player, players = [], game, team, teams = [], returnScreen, onBack, onGoLineup, onGoTraining, onMarketStatus, onRenewalOffer, onGoContracts, onNavigatePlayer, onPayClause, onOpenPlayer }) {
  player = ensurePlayerMorale(player, game.season);
  const [tab, setTab] = useState("general");

  const navList = players.length ? players : [player];
  const currentIndex = navList.findIndex(item => item.id === player.id);
  const prevPlayer = currentIndex > 0 ? navList[currentIndex - 1] : null;
  const nextPlayer = currentIndex >= 0 && currentIndex < navList.length - 1 ? navList[currentIndex + 1] : null;

  const stats = useMemo(() => getPlayerSeasonStats(player, game, team?.id), [player, game, team?.id]);
  const form = useMemo(() => getRecentForm(player, game, team?.id), [player, game, team?.id]);
  const potential = getPotential(player);
  const marketValue = getMarketValue(player);
  const tags = getPlayerTags(player, stats, form, game.season);
  const attributes = getKeyAttributes(player);
  const history = player.careerHistory ?? [];
  const energy = Math.max(0, Math.round(100 - (player.fatigue ?? 0)));
  const accumulatedLoad = getAccumulatedLoad(player);
  const loadLevel = getLoadLevel(accumulatedLoad);
  const moraleLevel = getMoraleLevel(player.morale);
  const physicalStatus = getPhysicalStatus(player);
  const injuryRisk = calculateInjuryRisk(player, { fixtures: game.fixtures, teamId: team?.id, game });
  const injuryRiskLevel = getRiskLevel(injuryRisk);
  const isOwnPlayer = game.players.some(item => item.id === player.id);
  const isAcademyPlayer = player.academyStatus === "academy";
  const activeRenewal = (game.contracts?.renewals ?? []).find(item => item.playerId === player.id && !["completed", "withdrawn"].includes(item.status));
  const activeTransferOffer = (game.transferMarket?.offers ?? []).find(item => item.playerId === player.id && !["completed", "withdrawn", "rejected", "playerRejected", "outbid"].includes(item.status));
  const trainingReport = (isAcademyPlayer ? game.lastYouthTrainingReport : game.lastTrainingReport)?.changes?.find(item => item.playerId === player.id);
  const relatedNews = (game.news ?? []).filter(item => item.playerIds?.includes(player.id));

  const backLabel = PC_SCREEN_LABELS[returnScreen] ?? "Despacho";

  return (
    <div className="pc-pp-root">
      <div className="pc-pp-back-row">
        <div className="pc-pp-back-link" onClick={onBack}>← Volver a {backLabel}</div>
        {(prevPlayer || nextPlayer) && (
          <div className="pc-pp-player-nav">
            <button className="pc-pp-nav-btn" disabled={!prevPlayer} onClick={() => onNavigatePlayer?.(-1)}>← Anterior</button>
            <button className="pc-pp-nav-btn" disabled={!nextPlayer} onClick={() => onNavigatePlayer?.(1)}>Siguiente →</button>
          </div>
        )}
      </div>

      <div className="pc-pp-profile-header">
        <PlayerAvatar player={player} size={120} className="pc-pp-photo" style={{ width: 120, height: 140, borderRadius: 10 }} />
        <div className="pc-pp-header-info">
          <div className="pc-pp-club-line">{team?.name ?? "Agente libre"}</div>
          <div className="pc-pp-player-name">{player.name}</div>
          <div className="pc-pp-player-sub">{player.pos} · {player.age} años · {FLAGS[player.nat] ?? "🌍"} {COUNTRY_NAMES[player.nat] ?? player.nat ?? "Internacional"}</div>
          <div className="pc-pp-rating-row">
            <div className="pc-pp-rating-block"><div className="pc-pp-rating-value gold">{player.overall}</div><div className="pc-pp-rating-label">Media</div></div>
            <div className="pc-pp-rating-block"><div className="pc-pp-rating-value">{potential}</div><div className="pc-pp-rating-label">Potencial</div></div>
          </div>
          {tags.length > 0 && (
            <div className="pc-pp-tag-row">
              {tags.map(tagItem => <span key={tagItem.label} className="pc-pp-tag-pill" style={{ background: `${tagItem.color}18`, color: tagItem.color }}>{tagItem.icon} {tagItem.label}</span>)}
            </div>
          )}
        </div>
      </div>

      <div className="pc-pp-tabs">
        {TABS.map(([id, label]) => (
          <div key={id} className={`pc-pp-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>{label}</div>
        ))}
      </div>

      {tab === "general" && <PCProfileGeneralTab player={player} tags={tags} energy={energy} loadLevel={loadLevel} accumulatedLoad={accumulatedLoad} form={form} moraleLevel={moraleLevel} physicalStatus={physicalStatus} injuryRisk={injuryRisk} injuryRiskLevel={injuryRiskLevel} attributes={attributes} marketValue={marketValue} stats={stats} />}
      {tab === "stats" && <PCProfileStatsTab player={player} game={game} stats={stats} history={history} />}
      {tab === "development" && <PCProfileDevelopmentTab player={player} potential={potential} trainingReport={trainingReport} />}
      {tab === "contract" && <PCProfileContractTab player={player} game={game} team={team} marketValue={marketValue} activeRenewal={activeRenewal} activeTransferOffer={activeTransferOffer} isOwnPlayer={isOwnPlayer} onRenewalOffer={onRenewalOffer} onGoContracts={onGoContracts} onPayClause={onPayClause} />}
      {tab === "history" && <PCProfileHistoryTab history={history} medicalHistory={player.medicalHistory ?? []} />}
      {tab === "news" && <PCProfileNewsTab relatedNews={relatedNews} game={game} teams={teams} onOpenPlayer={onOpenPlayer} />}

      <div className="pc-pp-actions-footer">
        <button className="pc-pp-btn ghost" onClick={() => setTab("contract")}>Ver contrato</button>
        {isOwnPlayer && <button className="pc-pp-btn ghost" onClick={() => onMarketStatus?.(player.id, "transfer")}>{player.marketStatus === "transfer" ? "Quitar transferible" : "Poner transferible"}</button>}
        {isOwnPlayer && <button className="pc-pp-btn ghost" onClick={() => onMarketStatus?.(player.id, "loan")}>{player.marketStatus === "loan" ? "Quitar cedible" : "Poner cedible"}</button>}
        {(isOwnPlayer || isAcademyPlayer) && <button className="pc-pp-btn ghost" onClick={onGoTraining}>Entrenar</button>}
        {isOwnPlayer && <button className="pc-pp-btn gold" onClick={onGoLineup}>Hacer titular</button>}
      </div>
    </div>
  );
}
