import { useState } from "react";
import { TACTICS_PRESET_ICONS, normalizeTactics } from "../../../tactics/tacticsEngine.js";

export default function PCTacticsPresetsPanel({ tactics, setTactics, savedTacticsPresets = [], onSaveTacticsPresets }) {
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetIcon, setPresetIcon] = useState(TACTICS_PRESET_ICONS[0]);

  const saveCurrentAsPreset = () => {
    if (!presetName.trim()) return;
    const newPreset = { id: `tactics_${Date.now()}`, name: presetName.trim(), icon: presetIcon, tactics: { ...tactics } };
    onSaveTacticsPresets?.([...(savedTacticsPresets ?? []), newPreset]);
    setSavingPreset(false);
    setPresetName("");
    setPresetIcon(TACTICS_PRESET_ICONS[0]);
  };

  const loadPreset = preset => setTactics(normalizeTactics(preset.tactics));
  const deletePreset = presetId => onSaveTacticsPresets?.((savedTacticsPresets ?? []).filter(p => p.id !== presetId));

  return (
    <div className="pc-tt-presets-panel">
      <div className="pc-tt-presets-title">Presets guardados</div>

      {(!savedTacticsPresets || savedTacticsPresets.length === 0) && (
        <div className="pc-tt-presets-empty">Aún no tienes tácticas guardadas.</div>
      )}

      {(savedTacticsPresets ?? []).map(preset => (
        <div key={preset.id} className="pc-tt-preset-item" onClick={() => loadPreset(preset)}>
          <span className="pc-tt-preset-icon">{preset.icon}</span>
          <span className="pc-tt-preset-name">{preset.name}</span>
          <span className="pc-tt-preset-del" onClick={event => { event.stopPropagation(); deletePreset(preset.id); }}>✕</span>
        </div>
      ))}

      <button className="pc-tt-btn pc-tt-btn-gold" onClick={() => setSavingPreset(true)}>+ Guardar configuración actual</button>

      {savingPreset && (
        <div className="pc-tt-modal-overlay" onClick={() => setSavingPreset(false)}>
          <div className="pc-tt-modal" onClick={event => event.stopPropagation()}>
            <div className="pc-tt-modal-title">Guardar táctica actual</div>
            <input
              className="pc-tt-modal-input"
              value={presetName}
              onChange={event => setPresetName(event.target.value)}
              placeholder="Nombre (ej. Fuera, Contra rival top...)"
              autoFocus
            />
            <div className="pc-tt-modal-icon-label">ICONO</div>
            <div className="pc-tt-modal-icons">
              {TACTICS_PRESET_ICONS.map(icon => (
                <button
                  key={icon}
                  className={`pc-tt-modal-icon-btn${presetIcon === icon ? " active" : ""}`}
                  onClick={() => setPresetIcon(icon)}
                >
                  {icon}
                </button>
              ))}
            </div>
            <div className="pc-tt-modal-actions">
              <button className="pc-tt-btn pc-tt-btn-ghost" onClick={() => { setSavingPreset(false); setPresetName(""); }}>Cancelar</button>
              <button className="pc-tt-btn pc-tt-btn-gold" disabled={!presetName.trim()} onClick={saveCurrentAsPreset}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
