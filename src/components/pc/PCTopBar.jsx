import TeamCrest from "../TeamCrest.jsx";
import { CloudSyncIndicator } from "../../App.jsx";

export default function PCTopBar({ team, game, position, cloudSession, cloudSyncState, cloudConflict, onOpenCloudSaves, clubAccent, clubTextOnAccent }) {
  const season = game?.season ?? "2025";
  const seasonLabel = `${season}/${String(parseInt(season, 10) + 1).slice(-2)}`;
  return (
    <div className="pc-topbar">
      <div className="pc-topbar-left">
        <span className="pc-topbar-logo">L</span>
        <span className="pc-topbar-title">LEGACY MANAGER</span>
      </div>
      <div className="pc-topbar-center">
        <span className="pc-club-badge" style={{ background: clubAccent, color: clubTextOnAccent }}>
          <TeamCrest team={team} size={16} />
          {team?.name ?? "—"}
        </span>
        <span>Temporada {seasonLabel} · Jornada {game?.matchday ?? 1} · {position ? `${position}º` : "—"}</span>
      </div>
      <div className="pc-topbar-right">
        <CloudSyncIndicator session={cloudSession} syncState={cloudSyncState} conflict={cloudConflict} onClick={onOpenCloudSaves} />
      </div>
    </div>
  );
}
