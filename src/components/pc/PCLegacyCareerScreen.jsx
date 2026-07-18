import { useState } from "react";
import PCCareerOverviewTab from "./legacy/PCCareerOverviewTab.jsx";
import PCSeasonsTab from "./legacy/PCSeasonsTab.jsx";
import PCTrophiesTab from "./legacy/PCTrophiesTab.jsx";
import PCRecordsTab from "./legacy/PCRecordsTab.jsx";
import PCLegendsTab from "./legacy/PCLegendsTab.jsx";
import PCCareerPathTab from "./legacy/PCCareerPathTab.jsx";

const TABS = [
  ["career", "Carrera"],
  ["seasons", "Temporadas"],
  ["trophies", "Trofeos"],
  ["records", "Récords"],
  ["legends", "Leyendas"],
  ["path", "Trayectoria"],
];

export default function PCLegacyCareerScreen({ game, team, teams = [], initialTab = "career" }) {
  const [tab, setTab] = useState(initialTab);
  const legacy = game.legacy;
  const archive = legacy.archive ?? { seasons: [], playerRecords: {}, milestones: [], prestigeHistory: [] };
  const coach = game.coachCareer;

  return (
    <div className="pc-lc-root">
      <div className="pc-lc-header">
        <div>
          <h1>Legado y Carrera</h1>
          <div className="pc-lc-sub">{team?.name}</div>
        </div>
      </div>

      <div className="pc-lc-tabs">
        {TABS.map(([id, label]) => (
          <div key={id} className={`pc-lc-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>{label}</div>
        ))}
      </div>

      {tab === "career" && <PCCareerOverviewTab game={game} team={team} legacy={legacy} archive={archive} coach={coach} />}
      {tab === "seasons" && <PCSeasonsTab archive={archive} teams={teams} />}
      {tab === "trophies" && <PCTrophiesTab legacy={legacy} />}
      {tab === "records" && <PCRecordsTab archive={archive} />}
      {tab === "legends" && <PCLegendsTab archive={archive} />}
      {tab === "path" && <PCCareerPathTab coach={coach} />}
    </div>
  );
}
