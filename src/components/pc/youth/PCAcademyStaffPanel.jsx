import { ensureStaffState } from "../../../staff/staffEngine.js";
import { getStaffCardEffects } from "../staff/staffEffectSummary.js";

export default function PCAcademyStaffPanel({ game, teams }) {
  const ensured = ensureStaffState(game, teams ?? []);
  const { member, effects } = getStaffCardEffects(ensured, "academyDirector");
  const talent = effects.find(effect => effect.key === "talentDevelopment");
  const vision = effects.find(effect => effect.key === "academyVision");
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
        const visionLabel = vision.positive ? "Mejora las probabilidades de encontrar una joya" : vision.negative ? "Reduce las probabilidades de encontrar una joya" : "Efecto neutro en la captación";
        const visionClass = vision.positive ? "" : vision.negative ? " neg" : " neutral";
        return (
          <>
            <div className="pc-yt-staff-name">{member.name}</div>
            <div className="pc-yt-staff-row"><span>Desarrollo de talento</span><span className={`val${talent.negative ? " neg" : ""}`}>{talent.formatted}</span></div>
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
