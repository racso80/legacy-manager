const fmt = v => v >= 1000 ? `€${(v / 1000).toFixed(1)}M` : `€${v}K`;

export default function PCFinancesReserveBox({ budgetSnapshot, budgetPct, budgetColor }) {
  const rows = [
    ["Salarios pendientes", budgetSnapshot.pendingSalaries],
    ["Operativa pendiente", budgetSnapshot.pendingOperating],
    ["Cobertura salarios", budgetSnapshot.salaryReserve],
    ["Cobertura operativa", budgetSnapshot.operatingReserve],
    ["Fondo seguridad", budgetSnapshot.securityFund],
  ];
  return (
    <div className="pc-fn-box">
      <div className="pc-fn-box-title">Gastos y reserva</div>
      {rows.map(([label, value]) => (
        <div key={label} className="pc-fn-breakdown-row">
          <span>{label}</span>
          <span className="val">{fmt(value)}</span>
        </div>
      ))}
      <div className="pc-fn-free-bar-wrap">
        <div className="pc-fn-free-bar-label">
          <span>Parte libre para fichajes</span>
          <span style={{ color: budgetColor, fontWeight: 700 }}>{budgetPct}% de caja</span>
        </div>
        <div className="pc-fn-free-bar"><div className="pc-fn-free-bar-fill" style={{ width: `${budgetPct}%`, background: budgetColor }} /></div>
      </div>
    </div>
  );
}
