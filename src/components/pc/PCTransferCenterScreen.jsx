import { useState } from "react";
import { REAL_SQUADS } from "../../App.jsx";
import PCRecruitmentHub from "./transferCenter/PCRecruitmentHub.jsx";
import PCMarketTab from "./transferCenter/PCMarketTab.jsx";
import PCScoutingTab from "./transferCenter/PCScoutingTab.jsx";

const fmt = v => v >= 1000 ? `€${(v / 1000).toFixed(1)}M` : `€${Math.round(v)}K`;

const MAIN_TABS = [["resumen", "Resumen"], ["mercado", "Mercado"], ["scouting", "Scouting"]];

export default function PCTransferCenterScreen({
  game, teams, candidates, budgetSnapshot, initialMainTab = "resumen",
  onOpenPlayer, onTransfer, onClubOffer, onFreeAgentOffer, onAcceptClubCounter, onContractOffer,
  onAcceptPlayerCounter, onAcceptRoleCounter, onWithdrawOffer, onFinalizeOffer, onUserMarketStatus,
  onIncomingOffer, onStartMission, onCancelMission, onToggleWatch,
}) {
  const [mainTab, setMainTab] = useState(initialMainTab);
  const [marketSubTab, setMarketSubTab] = useState("listados");
  const [scoutingSubTab, setScoutingSubTab] = useState("nueva");

  // Hub de Resumen: los enlaces "Ver todas" solo cambian estado local (Resumen/Mercado/
  // Scouting son sub-vistas de una única pantalla, no screens separadas en App.jsx).
  const goTo = (tab, subTab) => {
    setMainTab(tab);
    if (tab === "mercado" && subTab) setMarketSubTab(subTab);
    if (tab === "scouting" && subTab) setScoutingSubTab(subTab);
  };

  // Mismo pool que TransferMarketScreen (App.jsx:1769-1795): plantillas de otros clubes +
  // agentes libres (vendidos por el usuario o migrados). El gate de tier ya lo aplican
  // reportsByPlayer/listingsByPlayer dentro de PCMarketTab, igual que en móvil.
  const boughtFromOthers = new Set((game.transfers ?? []).filter(t => t.type === "buy" && t.fromTeamId).map(t => t.player.id));
  const migratedFreeAgents = (game.freeAgents ?? []).map(p => ({ ...p, _teamId: "agente_libre", _teamName: "Agente libre", _teamColor: "#6b7280" }));
  const soldByUser = (game.transfers ?? []).filter(t => t.type === "sell" && !t.toTeamId).map(t => ({ ...t.player, _teamId: "agente_libre", _teamName: "Agente libre", _teamColor: "#6b7280" }));
  const freeAgentIds = new Set(migratedFreeAgents.map(p => p.id));
  const otherTeamPlayers = teams.filter(t => t.id !== game.teamId)
    .flatMap(t => (REAL_SQUADS[t.id] ?? []).filter(p => !boughtFromOthers.has(p.id) && !freeAgentIds.has(p.id)).map(p => ({ ...p, _teamId: t.id, _teamName: t.name, _teamColor: t.color })));
  const freeAgents = [...migratedFreeAgents, ...soldByUser].filter(p => !game.players.some(owned => owned.id === p.id));
  const allOtherPlayers = [...otherTeamPlayers, ...freeAgents];

  return (
    <div className="pc-tc-root">
      <div className="pc-tc-header">
        <h1>Centro de Fichajes</h1>
        <div className="pc-tc-budget-box">
          <div className="label">Presupuesto disponible</div>
          <div className="amount">{fmt(budgetSnapshot.transferBudget)}</div>
        </div>
      </div>

      <div className="pc-tc-main-tabs">
        {MAIN_TABS.map(([id, label]) => (
          <div key={id} className={`pc-tc-main-tab${mainTab === id ? " active" : ""}`} onClick={() => setMainTab(id)}>{label}</div>
        ))}
      </div>

      {mainTab === "resumen" && <PCRecruitmentHub game={game} teams={teams} budgetSnapshot={budgetSnapshot} onGoTo={goTo} />}

      {mainTab === "mercado" && (
        <PCMarketTab
          game={game} teams={teams} players={game.players} allOtherPlayers={allOtherPlayers}
          subTab={marketSubTab} onSubTabChange={setMarketSubTab}
          onOpenPlayer={onOpenPlayer} onClubOffer={onClubOffer} onFreeAgentOffer={onFreeAgentOffer}
          onAcceptClubCounter={onAcceptClubCounter} onContractOffer={onContractOffer}
          onAcceptPlayerCounter={onAcceptPlayerCounter} onAcceptRoleCounter={onAcceptRoleCounter}
          onWithdrawOffer={onWithdrawOffer} onFinalizeOffer={onFinalizeOffer}
          onUserMarketStatus={onUserMarketStatus} onIncomingOffer={onIncomingOffer}
          onGoScouting={() => goTo("scouting")}
        />
      )}

      {mainTab === "scouting" && (
        <PCScoutingTab
          game={game} candidates={candidates} subTab={scoutingSubTab} onSubTabChange={setScoutingSubTab}
          onStartMission={onStartMission} onCancelMission={onCancelMission} onToggleWatch={onToggleWatch}
          onOpenPlayer={onOpenPlayer} onGoMarket={() => goTo("mercado", "listados")}
        />
      )}
    </div>
  );
}
