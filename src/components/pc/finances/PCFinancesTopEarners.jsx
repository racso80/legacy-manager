import { Initials, RARITY_ACCENT } from "../../../App.jsx";

const fmtW = v => `€${v}K/sem`;

export default function PCFinancesTopEarners({ players }) {
  const topEarners = [...players].sort((a, b) => (b.salary ?? 0) - (a.salary ?? 0)).slice(0, 7);
  return (
    <div className="pc-fn-box">
      <div className="pc-fn-box-title">Mayores salarios</div>
      {topEarners.map((player, index) => {
        const accent = RARITY_ACCENT[player.rarity];
        const pct = topEarners[0]?.salary > 0 ? Math.round(((player.salary ?? 0) / topEarners[0].salary) * 100) : 0;
        return (
          <div key={player.id} className="pc-fn-earner-row">
            <div className="pc-fn-earner-rank">{index + 1}</div>
            <Initials name={player.name} size={32} rarity={player.rarity} borderRadius={6} />
            <div className="pc-fn-earner-info">
              <div className="pc-fn-earner-top">
                <span className="pc-fn-earner-name">{player.name}</span>
                <span className="pc-fn-earner-salary" style={{ color: accent }}>{fmtW(player.salary ?? 0)}</span>
              </div>
              <div className="pc-fn-earner-bar"><div className="pc-fn-earner-bar-fill" style={{ width: `${pct}%`, background: accent }} /></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
