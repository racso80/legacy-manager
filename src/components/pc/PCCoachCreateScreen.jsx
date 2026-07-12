import { useState } from "react";
import { COACH_PHILOSOPHIES } from "../../coach/coachCareerEngine.js";

export default function PCCoachCreateScreen({ team, onCreate, onBack }) {
  const [form, setForm] = useState({ firstName: "Oscar", lastName: "Funes", birthDate: "1988-07-01", nationality: "España", avatar: "🧑‍💼", philosophy: "balanced", prestige: 12 });
  const submit = () => onCreate?.(form);

  return (
    <div className="pc-pregame pc-pregame-cc">
      <div className="pc-pregame-cc-header"><h1>Crea tu entrenador</h1></div>

      <div className="pc-pregame-cc-intro">
        <div className="pc-pregame-cc-intro-label">Modo carrera</div>
        <div className="pc-pregame-cc-intro-title">Crea tu entrenador</div>
        <div className="pc-pregame-cc-intro-desc">La partida seguirá tu carrera profesional. El {team?.name} será tu primer club, no necesariamente el último.</div>
      </div>

      <div className="pc-pregame-cc-form-grid">
        <div className="pc-pregame-cc-field">
          <label>Nombre</label>
          <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
        </div>
        <div className="pc-pregame-cc-field">
          <label>Apellidos</label>
          <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
        </div>
      </div>
      <div className="pc-pregame-cc-form-grid">
        <div className="pc-pregame-cc-field">
          <label>Fecha de nacimiento</label>
          <input type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} />
        </div>
        <div className="pc-pregame-cc-field">
          <label>Nacionalidad</label>
          <input value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} />
        </div>
      </div>

      <div className="pc-pregame-cc-avatar-row">
        <div className="pc-pregame-cc-field" style={{ flex: 0 }}>
          <label>Avatar</label>
          <input className="pc-pregame-cc-avatar-box" value={form.avatar} maxLength={4} onChange={e => setForm({ ...form, avatar: e.target.value })} />
        </div>
        <div className="pc-pregame-cc-field" style={{ flex: 1 }}>
          <label>Filosofía</label>
        </div>
      </div>

      <div className="pc-pregame-cc-philosophy-grid">
        {COACH_PHILOSOPHIES.map(item => (
          <div
            key={item.id}
            className="pc-pregame-cc-philosophy-pill"
            data-active={form.philosophy === item.id ? "" : undefined}
            onClick={() => setForm({ ...form, philosophy: item.id })}
          >
            {item.icon} {item.label}
          </div>
        ))}
      </div>

      <div className="pc-pregame-cc-summary">
        Club inicial: <strong>{team?.name}</strong> · Prestigio inicial estimado: <strong className="pc-pregame-accent">{form.prestige}/100</strong>
      </div>

      <div className="pc-pregame-cc-actions">
        <button className="pc-pregame-btn pc-pregame-btn-ghost" onClick={onBack}>Atrás</button>
        <button className="pc-pregame-btn pc-pregame-btn-gold" onClick={submit}>Comenzar carrera →</button>
      </div>
    </div>
  );
}
