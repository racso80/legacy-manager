import { STAFF_ROLES } from "../../../staff/staffEngine.js";
import { getStaffCardEffects } from "./staffEffectSummary.js";

// Etiquetas completas para la línea de resumen de esta pantalla — distintas de las
// etiquetas cortas que ya usan Médico/Entrenamientos/Cantera en sus propios paneles,
// porque aquí cada tarjeta tiene que explicarse sola sin contexto de pantalla.
// fitnessCoach.recovery alimenta dos fórmulas reales distintas (médica y de
// entrenamiento) — se distinguen por "key:context" antes de caer a "key" a secas.
const EFFECT_LABELS = {
  medicalDirector: { prevention: "Reduce riesgo de lesión", recovery: "Acelera recuperación" },
  fitnessCoach: {
    fitness: "Desarrollo en entrenamiento",
    loadManagement: "Gestión de carga",
    prevention: "Reduce riesgo de lesión",
    "recovery:medical": "Recuperación médica",
    "recovery:training": "Recuperación de entrenamiento",
  },
  assistantCoach: { tactics: "Fuerza en partido", matchReading: "Detecta patrones", squadManagement: "Penalización por banquillo" },
  sportingDirector: { negotiation: "Mejora aceptación de ofertas y renovaciones" },
  scoutingChief: { reportQuality: "Confianza de informes" },
  academyDirector: { talentDevelopment: "Desarrollo juvenil" },
};

const VISION_TEXT = { positive: "Mejora probabilidad de wonderkids", negative: "Reduce probabilidad de wonderkids", neutral: "Sin efecto en captación" };

function labelFor(roleId, effect) {
  const map = EFFECT_LABELS[roleId] ?? {};
  return map[`${effect.key}:${effect.context}`] ?? map[effect.key] ?? effect.key;
}

function EffectFragment({ roleId, effect }) {
  const colorClass = effect.positive ? "good" : effect.negative ? "bad" : "";
  // academyVision no tiene un número real que mostrar (desplaza umbrales de
  // probabilidad, no un porcentaje) — la etiqueta cualitativa ES el valor.
  if (effect.key === "academyVision") {
    const text = effect.positive ? VISION_TEXT.positive : effect.negative ? VISION_TEXT.negative : VISION_TEXT.neutral;
    return <span className={colorClass}>{text}</span>;
  }
  return <>{labelFor(roleId, effect)} <b className={colorClass}>{effect.formatted}</b></>;
}

export default function PCStaffCard({ roleId, game }) {
  const role = STAFF_ROLES[roleId];
  const { member, effects } = getStaffCardEffects(game, roleId);
  const realKeys = new Set(effects.map(effect => effect.key));
  const isFullyInert = effects.length === 0;

  if (!member) {
    return (
      <div className="pc-sf-card">
        <div className="pc-sf-top">
          <div className="pc-sf-avatar">{role.icon}</div>
          <div><div className="pc-sf-name">Sin cubrir</div><div className="pc-sf-role">{role.title}</div></div>
        </div>
        <div className="pc-sf-empty">No hay nadie en este puesto.</div>
      </div>
    );
  }

  return (
    <div className="pc-sf-card">
      <div className="pc-sf-top">
        <div className="pc-sf-avatar">{role.icon}</div>
        <div>
          <div className="pc-sf-name">{member.name}</div>
          <div className="pc-sf-role">{role.title}</div>
          <div className="pc-sf-meta">{member.age} años · {member.nationality}</div>
        </div>
        {isFullyInert && <span className="pc-sf-inert-badge">Sin efecto aún</span>}
      </div>

      <div className="pc-sf-attr-list">
        {role.attributes.map(key => {
          const isReal = realKeys.has(key);
          const value = member.attributes?.[key] ?? 0;
          return (
            <div key={key} className="pc-sf-attr-row">
              <span className="pc-sf-attr-label">
                <span className={isReal ? "pc-sf-dot-real" : "pc-sf-dot-inert"} />
                {role.labels?.[key] ?? key}
              </span>
              <div className="pc-sf-attr-bar"><div className={`pc-sf-attr-fill${isReal ? "" : " inert"}`} style={{ width: `${value}%` }} /></div>
              <span className="pc-sf-attr-value">{value}</span>
            </div>
          );
        })}
      </div>

      <div className="pc-sf-effect-summary">
        {isFullyInert
          ? <span className="pc-sf-inert-text">Rol narrativo por ahora — sus comentarios son de sabor, sin efecto mecánico</span>
          : effects.map((effect, index) => (
              <span key={`${effect.key}:${effect.context}`}>
                <EffectFragment roleId={roleId} effect={effect} />
                {index < effects.length - 1 ? " · " : ""}
              </span>
            ))}
      </div>
    </div>
  );
}
