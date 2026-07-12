import { useState } from "react";

const KEY = "legacy_manager_preferences";
const readPreferences = () => { try { return { animations: true, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return { animations: true }; } };

export default function PCSettingsScreen({ game }) {
  const [preferences, setPreferences] = useState(readPreferences);
  const setAnimations = value => {
    const next = { ...preferences, animations: value };
    setPreferences(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    document.documentElement.classList.toggle("reduce-motion", !value);
  };

  const infoTiles = [
    ["Club", game.name],
    ["Temporada", `${game.season}/${String(Number(game.season) + 1).slice(-2)}`],
    ["Jornada", game.matchday],
    ["Guardado", "Automático"],
  ];

  return (
    <div className="pc-st-root">
      <div className="pc-st-header">
        <div className="pc-st-label">⚙ Configuración</div>
        <div className="pc-st-title">Preferencias</div>
        <div className="pc-st-sub">Ajustes visuales de Legacy Manager y resumen de tu partida actual.</div>
        <div className="pc-st-info-row">
          {infoTiles.map(([label, value]) => (
            <div key={label} className="pc-st-info-card">
              <div className="pc-st-info-value">{value}</div>
              <div className="pc-st-info-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="pc-st-section-label">Interfaz</div>
      <div className="pc-st-toggle-row">
        <div className="pc-st-toggle-icon">✨</div>
        <div className="pc-st-toggle-text">
          <div className="pc-st-toggle-name">Animaciones suaves</div>
          <div className="pc-st-toggle-desc">Transiciones y feedback visual en toda la aplicación.</div>
        </div>
        <button onClick={() => setAnimations(!preferences.animations)} aria-label="Alternar animaciones" className="pc-st-switch">
          <span className="pc-st-switch-track" style={{ background: preferences.animations ? "var(--st-gold, #c9a84c)" : "#374151" }}>
            <span className="pc-st-switch-thumb" style={{ transform: `translateX(${preferences.animations ? 20 : 0}px)` }} />
          </span>
        </button>
      </div>
    </div>
  );
}
