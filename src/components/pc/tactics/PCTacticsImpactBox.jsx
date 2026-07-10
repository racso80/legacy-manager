import { tacticModifiers } from "../../../tactics/tacticsEngine.js";

const impactClass = value => (value > 0 ? "pos" : value < 0 ? "neg" : "neutral");

export default function PCTacticsImpactBox({ tactics }) {
  // Mismos pesos que el motor de partido usa de verdad — ver
  // calcTeamStrength/calcDefStrength/matchFatigueDelta en App.jsx. El cansancio
  // se muestra ya proyectado a un partido completo (fatigueExtra*0.75*6) para
  // un jugador "tipo"; el real varía por posición, edad, físico y carga.
  const mod = tacticModifiers(tactics);
  const atkNet = mod.atkBonus * 0.5;
  const defNet = mod.defBonus;
  const fatigueNet = mod.fatigueExtra * 0.75 * 6;
  const chancesPct = Math.round(mod.chancesRate * 100);
  const yellowPct = Math.round(mod.yellowRisk * 100);

  const cards = [
    ["Ataque", atkNet],
    ["Defensa", defNet],
    ["Cansancio (90 min)", fatigueNet],
  ];

  return (
    <div className="pc-tt-impact-box">
      <div className="pc-tt-impact-title">Impacto táctico actual</div>
      <div className="pc-tt-impact-row">
        {cards.map(([label, value]) => (
          <div key={label} className="pc-tt-impact-card">
            <div className="pc-tt-impact-label">{label}</div>
            <div className={`pc-tt-impact-value ${impactClass(value)}`}>
              {value > 0 ? "+" : ""}{Math.round(value * 10) / 10}
            </div>
          </div>
        ))}
      </div>
      <div className="pc-tt-impact-disclaimer">El cansancio real varía según posición, edad y forma física de cada jugador.</div>
      <div className="pc-tt-secondary-row">
        <div className="pc-tt-secondary-chip">
          <span>⚡ Ocasiones generadas</span>
          <span className="val" style={{ color: chancesPct > 0 ? "var(--tt-green, #22c55e)" : chancesPct < 0 ? "var(--tt-red, #ef4444)" : undefined }}>
            {chancesPct > 0 ? "+" : ""}{chancesPct}%
          </span>
        </div>
        <div className="pc-tt-secondary-chip">
          <span>🟨 Riesgo de tarjeta</span>
          <span className="val" style={{ color: yellowPct > 0 ? "var(--tt-orange, #f59e0b)" : undefined }}>
            {yellowPct > 0 ? "+" : ""}{yellowPct}%
          </span>
        </div>
      </div>
    </div>
  );
}
