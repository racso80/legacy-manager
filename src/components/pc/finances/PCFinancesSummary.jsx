const fmt = v => v >= 1000 ? `€${(v / 1000).toFixed(1)}M` : `€${v}K`;
const fmtW = v => `€${v}K/sem`;

export default function PCFinancesSummary({ matchdaysPlayed, players, budgetK, weeklyWages }) {
  const rows = [
    ["Jornadas jugadas", `${matchdaysPlayed} / 38`],
    ["Plantilla", `${players.length} jugadores`],
    ["Presupuesto inicial", fmt(budgetK)],
    ["Coste salarial/sem", fmtW(weeklyWages)],
    ["Lesionados", `${players.filter(p => p.injured).length} jugadores`],
    ["Sancionados", `${players.filter(p => p.suspended).length} jugadores`],
  ];
  return (
    <div className="pc-fn-box">
      <div className="pc-fn-box-title">Resumen del club</div>
      {rows.map(([label, value]) => (
        <div key={label} className="pc-fn-summary-row">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
