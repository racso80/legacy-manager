import TeamCrest from "../TeamCrest.jsx";
import { CloudSyncIndicator } from "../../App.jsx";

export default function PCTopBar({ team, game, position, cloudSession, cloudSyncState, cloudConflict, onOpenCloudSaves }) {
  const season = game?.season ?? "2025";
  const seasonLabel = `${season}/${String(parseInt(season, 10) + 1).slice(-2)}`;
  return (
    <div className="pc-topbar">
      <div className="pc-topbar-left">
        <span className="pc-topbar-logo">L</span>
        <span className="pc-topbar-title">LEGACY MANAGER</span>
      </div>
      <div className="pc-topbar-center">
        <TeamCrest team={team} size={22} />
        <span>{team?.name ?? "—"} · Temporada {seasonLabel} · Jornada {game?.matchday ?? 1} · {position ? `${position}º` : "—"}</span>
      </div>
      <div className="pc-topbar-right">
        <CloudSyncIndicator session={cloudSession} syncState={cloudSyncState} conflict={cloudConflict} onClick={onOpenCloudSaves} />
      </div>
    </div>
  );
}
