const fmt = v => v >= 1000 ? `€${(v / 1000).toFixed(1)}M` : `€${v}K`;

export default function PCFinancesIncomeBox({ totalGate, totalMembers, totalShop, totalAds, totalIncome, homeMatchesPlayed, clubPrestige }) {
  const sources = [
    ["🎟️", "Taquilla", totalGate, "var(--fn-red, #ef4444)", `${homeMatchesPlayed} partidos en casa`],
    ["🎫", "Socios y abonados", totalMembers, "var(--fn-gold, #c9a84c)", "Cuota prorrateada por jornada"],
    ["🛍️", "Tienda y merchandising", totalShop, "var(--fn-orange, #f59e0b)", "Todas las jornadas"],
    ["📺", "Publicidad y patrocinios", totalAds, "var(--fn-purple, #a78bfa)", `Posición + prestigio del club (${Math.round(clubPrestige)}/100)`],
  ];
  return (
    <div className="pc-fn-box pc-fn-income-box">
      <div className="pc-fn-box-title">Fuentes de ingresos</div>
      {sources.map(([icon, label, value, color, sub]) => {
        const pct = totalIncome > 0 ? Math.round((value / totalIncome) * 100) : 0;
        return (
          <div key={label} className="pc-fn-income-row">
            <div className="pc-fn-income-icon">{icon}</div>
            <div>
              <div className="pc-fn-income-name">{label}</div>
              <div className="pc-fn-income-meta">{sub} · {pct}% del total</div>
            </div>
            <div className="pc-fn-income-value" style={{ color }}>{fmt(value)}</div>
          </div>
        );
      })}
    </div>
  );
}
