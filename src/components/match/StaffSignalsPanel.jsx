import { useState } from "react";

// Muestra la señal más prioritaria del cuerpo técnico como sugerencia con Aplicar/Ignorar,
// y mantiene un registro local (solo de este partido) de las decisiones tomadas.
export default function StaffSignalsPanel({ signals = [], currentMinute = 0, onApply, onIgnore }) {
  const [collapsed, setCollapsed] = useState(false);
  const [log, setLog] = useState([]);
  const primary = signals[0] ?? null;

  const record = (applied) => {
    if (!primary) return;
    setLog(l => [{ id: `${primary.key}:${currentMinute}:${l.length}`, minute: currentMinute, applied, title: primary.title }, ...l].slice(0, 20));
  };

  return (
    <div className="pc-match-v2-panel">
      <div className="pc-match-v2-panel-head">
        <span className="pc-match-v2-panel-title">Señales del cuerpo técnico</span>
        <button className="pc-match-v2-icon-btn pc-match-v2-icon-btn-sm" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? "▸" : "▾"}
        </button>
      </div>
      {!collapsed && (
        <div className="pc-match-v2-panel-body pc-match-v2-staff-body">
          {primary ? (
            <>
              <div className="pc-match-v2-staff-suggestion">
                <strong>{primary.source === "doctor" ? "Médico" : "Segundo entrenador"}:</strong> {primary.message}
              </div>
              <div className="pc-match-v2-staff-actions">
                <button className="pc-match-v2-btn-primary" onClick={() => { record(true); onApply?.(primary); }}>Aplicar</button>
                <button className="pc-match-v2-btn-ghost" onClick={() => { record(false); onIgnore?.(primary); }}>Ignorar</button>
              </div>
            </>
          ) : (
            <div className="pc-match-v2-empty">Sin avisos por ahora.</div>
          )}
          {log.length > 0 && (
            <div className="pc-match-v2-staff-log">
              {log.map(entry => (
                <div key={entry.id}>
                  {String(entry.minute).padStart(2, "0")}' — {entry.applied ? "Instrucción aplicada" : "Sugerencia ignorada"}: {entry.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
