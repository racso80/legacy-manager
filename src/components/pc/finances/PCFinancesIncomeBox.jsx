const fmt = v => v >= 1000 ? `€${(v / 1000).toFixed(1)}M` : `€${v}K`;

export default function PCFinancesIncomeBox({ totalGate, totalMembers, totalShop, totalAds, totalIncome, homeMatchesPlayed, clubPrestige, incomeLog }) {
  const sources = [
    ["🎟️", "Taquilla", totalGate, "var(--fn-red, #ef4444)", `${homeMatchesPlayed} partidos en casa`],
    ["🎫", "Socios y abonados", totalMembers, "var(--fn-gold, #c9a84c)", "Cuota prorrateada por jornada"],
    ["🛍️", "Tienda y merchandising", totalShop, "var(--fn-orange, #f59e0b)", "Todas las jornadas"],
    ["📺", "Publicidad y patrocinios", totalAds, "var(--fn-purple, #a78bfa)", `Posición + prestigio del club (${Math.round(clubPrestige)}/100)`],
  ];

  const homeEntries = (incomeLog ?? []).filter(e => e.isHome);
  const avgAttendance = homeEntries.length
    ? Math.round(homeEntries.reduce((s, e) => s + (e.matchAttendance ?? 0), 0) / homeEntries.length)
    : 0;
  const avgOccupancy = homeEntries.length
    ? Math.round(homeEntries.reduce((s, e) => s + (e.occupancy ?? 0), 0) / homeEntries.length * 100)
    : 0;
  const lastIncome = (incomeLog ?? [])[(incomeLog ?? []).length - 1];

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

      {lastIncome && (
        <div className="pc-fn-last-matchday">
          <div className="pc-fn-last-matchday-title">Última jornada (J{lastIncome.matchday})</div>
          {lastIncome.isHome ? (
            <div className="pc-fn-last-matchday-row">
              <span>👥 {lastIncome.matchAttendance?.toLocaleString()} espectadores</span>
              <span>{Math.round((lastIncome.occupancy ?? 0) * 100)}% aforo</span>
            </div>
          ) : (
            <div className="pc-fn-last-matchday-away">Partido a domicilio · sin ingresos de taquilla</div>
          )}
          <div className="pc-fn-last-matchday-total">+{fmt(lastIncome.total)} esta jornada</div>
        </div>
      )}

      {avgAttendance > 0 && (
        <div className="pc-fn-avg-grid">
          <div className="pc-fn-avg-card">
            <div className="pc-fn-avg-label">Asistencia media</div>
            <div className="pc-fn-avg-value">{avgAttendance.toLocaleString()}</div>
          </div>
          <div className="pc-fn-avg-card">
            <div className="pc-fn-avg-label">Ocupación media</div>
            <div className="pc-fn-avg-value">{avgOccupancy}%</div>
          </div>
        </div>
      )}
    </div>
  );
}
