import { ensureStaffState, getStaffMember, staffModifier } from "../../../staff/staffEngine.js";

// Mismas fórmulas y escalas que trainingEngine.js (talentDevelopment, tope -8%)
// y youthEngine.js generateYouthIntake (academyVision, escala .02). academyVision
// desplaza umbrales de una escalera de probabilidad, no un porcentaje directo
// sobre un valor — mostrar "+X%" ahí sería una precisión que la mecánica no tiene,
// así que se traduce a una etiqueta cualitativa en vez de un número inventado.
const TALENT_SCALE = .12;
const VISION_SCALE = .02;

export default function PCAcademyStaffPanel({ game, teams }) {
  const ensured = ensureStaffState(game, teams ?? []);
  const member = getStaffMember(ensured, "academyDirector");
  const youth = game.youth ?? { players: [] };

  const notes = (youth.players ?? [])
    .flatMap(player => (player.academyData?.developmentNotes ?? []).map(note => ({ ...note, playerId: player.id, playerName: player.name })))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, 8);

  return (
    <div className="pc-yt-side-panel">
      <div className="pc-yt-staff-title">🌱 Director de cantera</div>
      {!member ? (
        <div className="pc-yt-staff-empty">No hay nadie en este puesto. Sin efecto sobre el desarrollo ni el olfato de cantera.</div>
      ) : (() => {
        const talentPct = Math.round(Math.max(-.08, staffModifier(ensured, "academyDirector", "talentDevelopment", TALENT_SCALE)) * 100);
        const visionShift = staffModifier(ensured, "academyDirector", "academyVision", VISION_SCALE);
        const visionLabel = visionShift > .002 ? "Mejora las probabilidades de encontrar una joya" : visionShift < -.002 ? "Reduce las probabilidades de encontrar una joya" : "Efecto neutro en la captación";
        const visionClass = visionShift > .002 ? "" : visionShift < -.002 ? " neg" : " neutral";
        return (
          <>
            <div className="pc-yt-staff-name">{member.name}</div>
            <div className="pc-yt-staff-row"><span>Desarrollo de talento</span><span className={`val${talentPct < 0 ? " neg" : ""}`}>{talentPct >= 0 ? "+" : ""}{talentPct}%</span></div>
            <div className="pc-yt-staff-row"><span>Visión de cantera</span><span className={`val${visionClass}`}>{visionLabel}</span></div>
          </>
        );
      })()}

      <div className="pc-yt-notes-title">Seguimiento reciente</div>
      {notes.length ? (
        <div className="pc-yt-notes-feed">
          {notes.map((note, index) => (
            <div key={`${note.playerId}-${note.matchday}-${index}`} className="pc-yt-note-item">
              <b>{note.playerName}</b> (J{note.matchday}): {note.text}
            </div>
          ))}
        </div>
      ) : <div className="pc-yt-staff-empty">Sin novedades esta semana.</div>}
    </div>
  );
}
