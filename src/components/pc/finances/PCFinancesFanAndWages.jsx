const fmt = v => v >= 1000 ? `€${(v / 1000).toFixed(1)}M` : `€${v}K`;
const fmtW = v => `€${v}K/sem`;

export default function PCFinancesFanAndWages({ fanLove, weeklyWages, monthlyWages, seasonWages }) {
  const fanLoveColor = fanLove >= 70 ? "var(--fn-green, #22c55e)" : fanLove >= 40 ? "var(--fn-orange, #f59e0b)" : "var(--fn-red, #ef4444)";
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
      </div>
    </div>
  );
}
