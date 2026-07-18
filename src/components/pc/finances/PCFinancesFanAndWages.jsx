const fmt = v => v >= 1000 ? `€${(v / 1000).toFixed(1)}M` : `€${v}K`;
const fmtW = v => `€${v}K/sem`;
const WAGE_GROUP_COLORS = { POR: "#3b82f6", DEF: "#22c55e", MED: "#c9a84c", DEL: "#ef4444" };
const WAGE_GROUP_LABELS = { POR: "Porteros", DEF: "Defensas", MED: "Centrocampistas", DEL: "Delanteros" };

export default function PCFinancesFanAndWages({ fanLove, weeklyWages, monthlyWages, seasonWages, players }) {
  const fanLoveColor = fanLove >= 70 ? "var(--fn-green, #22c55e)" : fanLove >= 40 ? "var(--fn-orange, #f59e0b)" : "var(--fn-red, #ef4444)";

  const groupWages = { POR: 0, DEF: 0, MED: 0, DEL: 0 };
  players.forEach(p => { if (groupWages[p.group] !== undefined) groupWages[p.group] += (p.salary ?? 0); });
  const totalGroupWage = Object.values(groupWages).reduce((s, v) => s + v, 0);
  return (
    <div>
      <div className="pc-fn-box pc-fn-fan-box-wrap">
        <div className="pc-fn-box-title">Cariño de la afición</div>
        <div className="pc-fn-fan-box">
          <div className="pc-fn-fan-icon">❤️</div>
          <div className="pc-fn-fan-bar-wrap">
            <div className="pc-fn-fan-top">
              <span>Sube ganando partidos · baja con derrotas y rachas negativas</span>
              <span style={{ fontWeight: 800, color: fanLoveColor }}>{fanLove}/100</span>
            </div>
            <div className="pc-fn-fan-bar"><div className="pc-fn-fan-bar-fill" style={{ width: `${fanLove}%` }} /></div>
            <div className="pc-fn-fan-desc">Afecta la ocupación del estadio.</div>
          </div>
        </div>
      </div>

      <div className="pc-fn-box">
        <div className="pc-fn-box-title">Masa salarial</div>
        <div className="pc-fn-wage-row">
          {[["Semanal", fmtW(weeklyWages)], ["Mensual", fmt(monthlyWages)], ["Temporada", fmt(seasonWages)]].map(([label, value]) => (
            <div key={label} className="pc-fn-wage-card">
              <div className="pc-fn-wage-value">{value}</div>
              <div className="pc-fn-wage-label">{label}</div>
            </div>
          ))}
        </div>

        <div className="pc-fn-box-title" style={{ marginTop: 16 }}>Desglose por línea</div>
        {Object.entries(groupWages).map(([group, wages]) => {
          const pct = totalGroupWage > 0 ? Math.round((wages / totalGroupWage) * 100) : 0;
          return (
            <div key={group} className="pc-fn-wage-group-row">
              <div className="pc-fn-wage-group-top">
                <span>{WAGE_GROUP_LABELS[group]}</span>
                <span className="pc-fn-wage-group-value">{fmtW(wages)} <span className="pc-fn-wage-group-pct">({pct}%)</span></span>
              </div>
              <div className="pc-fn-wage-group-bar"><div className="pc-fn-wage-group-bar-fill" style={{ width: `${pct}%`, background: WAGE_GROUP_COLORS[group] }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
