import { useState } from "react";
import { DEFAULT_TRAINING_PLAN, normalizeTrainingPlan } from "../../training/trainingEngine.js";
import PCWeeklyPlanTab from "./training/PCWeeklyPlanTab.jsx";
import PCWeeklyReportTab from "./training/PCWeeklyReportTab.jsx";
import PCIndividualFocusTab from "./training/PCIndividualFocusTab.jsx";

const TABS = [["plan", "Plan semanal"], ["informe", "Informe de la semana"], ["individual", "Foco individual"]];

export default function PCTrainingScreen({ game, teams, onPlanChange, onOpenPlayer }) {
  const [tab, setTab] = useState("plan");
  const plan = normalizeTrainingPlan(game.trainingPlan ?? DEFAULT_TRAINING_PLAN);
  const individualCount = Object.values(plan.individual).filter(Boolean).length;

  return (
    <div className="pc-tr-root">
      <div className="pc-tr-header"><h1>Entrenamientos</h1></div>

      <div className="pc-tr-tabs">
        {TABS.map(([id, label]) => (
          <div key={id} className={`pc-tr-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>
            {label}{id === "individual" && individualCount > 0 ? ` (${individualCount})` : ""}
          </div>
        ))}
      </div>

      {tab === "plan" && <PCWeeklyPlanTab game={game} teams={teams} plan={plan} onPlanChange={onPlanChange} />}
      {tab === "informe" && <PCWeeklyReportTab game={game} onOpenPlayer={onOpenPlayer} />}
      {tab === "individual" && <PCIndividualFocusTab game={game} plan={plan} onPlanChange={onPlanChange} />}
    </div>
  );
}
