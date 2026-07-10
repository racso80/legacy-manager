import { getFanMood } from "../../../fans/fanEngine.js";

export default function PCFanEvolutionChart({ trend }) {
  // Una barra por entrada de trend, no una por jornada — igual que el móvil:
  // una jornada sin partido ni fichaje no genera entrada, y una jornada con
  // partido + traspaso puede generar dos. No se fuerza un slot por jornada.
  const bars = [...trend].slice(0, 8).reverse();

  return (
    <div className="pc-fb-chart-box">
      <div className="pc-fb-section-label">Evolución reciente (apoyo)</div>
      {bars.length ? (
        <div className="pc-fb-chart-bars">
          {bars.map((entry, index) => {
            const support = entry.support ?? 50;
            const color = getFanMood(support).color;
            return (
              <div key={`${entry.matchday}-${index}`} className="pc-fb-chart-bar-wrap">
                <div className="pc-fb-chart-bar-track">
                  <div className="pc-fb-chart-bar" style={{ height: `${Math.max(8, support)}%`, background: color }}>
                    <span className="pc-fb-chart-bar-value">{support}</span>
                  </div>
                </div>
                <span className="pc-fb-chart-md">J{entry.matchday}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="pc-fb-chart-empty">La evolución empezará a registrarse tras los partidos.</div>
      )}
    </div>
  );
}
