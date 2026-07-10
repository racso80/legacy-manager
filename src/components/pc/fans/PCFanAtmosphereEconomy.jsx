export default function PCFanAtmosphereEconomy({ fanbase, stadium }) {
  return (
    <div>
      <div className="pc-fb-info-box">
        <div className="pc-fb-info-icon">{stadium.icon}</div>
        <div>
          <div className="pc-fb-info-title" style={{ color: stadium.color }}>{stadium.label}</div>
          <div className="pc-fb-info-desc">El ambiente afecta a los ingresos por taquilla y merchandising.</div>
        </div>
      </div>

      <div className="pc-fb-section-label">Impacto económico acumulado</div>
      <div className="pc-fb-econ-row">
        <div className="pc-fb-econ-card">
          <div className="pc-fb-econ-value">€{Math.round((fanbase.ticketRevenue ?? 0) / 100) / 10}M</div>
          <div className="pc-fb-econ-label">Entradas</div>
        </div>
        <div className="pc-fb-econ-card">
          <div className="pc-fb-econ-value">€{Math.round((fanbase.merchandise ?? 0) / 100) / 10}M</div>
          <div className="pc-fb-econ-label">Merchandising</div>
        </div>
      </div>
    </div>
  );
}
