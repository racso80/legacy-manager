import PlayerAvatar from "../../PlayerAvatar.jsx";

const PHASE_META = {
  injured: { label: "Lesionado", cls: "injured" },
  recovery: { label: "Recuperación", cls: "recovery" },
  limited: { label: "Limitado", cls: "limited" },
};

export default function PCPatientCard({ player, teamId, onOpenPlayer }) {
  const medical = player.medical ?? {};
  const meta = PHASE_META[medical.phase] ?? PHASE_META.injured;
  const recovery = Math.max(0, Math.min(100, Math.round(medical.recovery ?? 0)));
  const remaining = medical.remainingDays ?? 0;

  return (
    <div className="pc-md-patient-card" onClick={() => onOpenPlayer(player, teamId)}>
      <div className="pc-md-pt-top">
        <PlayerAvatar player={player} size={38} />
        <div>
          <div className="pc-md-p-name">{player.name}</div>
          <div className="pc-md-injury-type">{medical.type ?? "Lesión muscular"}</div>
        </div>
        <span className={`pc-md-phase-tag ${meta.cls}`}>{meta.label}</span>
      </div>
      <div className="pc-md-recovery-track"><div className={`pc-md-recovery-fill ${meta.cls}`} style={{ width: `${recovery}%` }} /></div>
      <div className="pc-md-recovery-meta">
        <span>Recuperación: <b>{recovery}%</b></span>
        <span>{medical.expectedReturnMatchday ? `Vuelve: J${medical.expectedReturnMatchday} · ` : ""}{remaining} día{remaining === 1 ? "" : "s"} restante{remaining === 1 ? "" : "s"}</span>
      </div>
    </div>
  );
}
