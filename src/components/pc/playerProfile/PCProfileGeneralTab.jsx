import { formatMedicalDuration } from "../../../medical/medicalEngine.js";

const fmtMoney = value => value >= 1000 ? `€${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}M` : `€${value}K`;

function InfoRow({ label, value, color }) {
  return <div className="pc-pp-info-row"><span>{label}</span><span className="val" style={color ? { color } : undefined}>{value}</span></div>;
}

export default function PCProfileGeneralTab({ player, energy, loadLevel, form, moraleLevel, physicalStatus, injuryRisk, injuryRiskLevel, attributes, marketValue, stats }) {
  return (
    <div>
      {player.academyData && (
        <div className="pc-pp-academy-box">
          <div className="pc-pp-academy-title">🌱 Formado en la cantera</div>
          <div className="pc-pp-academy-body">
            Ingreso: T. {player.academyData.joinedSeason}/{String(Number(player.academyData.joinedSeason) + 1).slice(-2)} · {player.academyData.region}<br />
            Debut: {player.academyData.debutSeason ? `T. ${player.academyData.debutSeason} · J${player.academyData.debutMatchday}` : "Pendiente"}
          </div>
        </div>
      )}

      <div className="pc-pp-info-grid">
        <div className="pc-pp-info-card">
          <div className="pc-pp-info-card-title">Estado Actual</div>
          <InfoRow label="Energía" value={`${energy}%`} color={energy >= 70 ? "var(--pp-green)" : energy >= 45 ? "var(--pp-orange)" : "var(--pp-red)"} />
          <InfoRow label="Carga acumulada" value={`${loadLevel.icon} ${loadLevel.label}`} color={loadLevel.color} />
          <InfoRow label="Forma reciente" value={form.label} color={form.color} />
        </div>
        <div className="pc-pp-info-card">
          <div className="pc-pp-info-card-title">Vestuario</div>
          <InfoRow label="Personalidad" value={player.personality?.profileLabel ?? "Equilibrado"} />
          <InfoRow label="Moral" value={`${moraleLevel.icon} ${moraleLevel.label}`} color={moraleLevel.color} />
          <InfoRow label="Felicidad" value={player.happiness ?? 70} color={(player.happiness ?? 70) >= 55 ? "var(--pp-green)" : "var(--pp-orange)"} />
          <InfoRow label="Confianza" value={player.managerTrust ?? 70} />
        </div>
        <div className="pc-pp-info-card">
          <div className="pc-pp-info-card-title">Ciclo de Vida</div>
          <InfoRow label="Nacimiento" value={player.birthDate ?? "—"} />
          <InfoRow label="Etapa" value={player.lifecycle?.developmentStage ?? "Pico"} color={(player.age ?? 25) >= 34 ? "var(--pp-orange)" : (player.age ?? 25) <= 23 ? "var(--pp-green)" : undefined} />
          {player.lifecycle?.retirementPlan && <InfoRow label="Retirada" value="Última temporada" color="var(--pp-red)" />}
        </div>
        <div className="pc-pp-info-card">
          <div className="pc-pp-info-card-title">Estado Médico</div>
          <InfoRow label="Situación" value={`${physicalStatus.icon} ${physicalStatus.label}`} color={physicalStatus.color} />
          <InfoRow label="Riesgo de lesión" value={`${injuryRisk}% (${injuryRiskLevel.label})`} color={injuryRiskLevel.color} />
          {player.medical?.type && player.medical.phase !== "available" && (
            <>
              <InfoRow label="Lesión" value={`${player.medical.type} · ${formatMedicalDuration(player.medical.remainingDays ?? 0)} restante`} />
              <div className="pc-pp-attr-bar" style={{ marginTop: 6 }}><div className="pc-pp-attr-fill" style={{ width: `${player.medical.recovery ?? 0}%`, background: physicalStatus.color }} /></div>
              <InfoRow label="Recuperación" value={`${player.medical.recovery ?? 0}% · regreso J${player.medical.expectedReturnMatchday ?? "—"}`} />
            </>
          )}
        </div>
      </div>

      <div className="pc-pp-section-label">Evolución de temporada</div>
      <div className="pc-pp-info-grid two">
        <div className="pc-pp-info-card">
          <div className="pc-pp-info-card-title">Media</div>
          <div className="pc-pp-stat-value" style={{ color: player.overall > (player.seasonStartOverall ?? player.overall) ? "var(--pp-green)" : undefined }}>{player.seasonStartOverall ?? player.overall} → {player.overall}</div>
        </div>
        <div className="pc-pp-info-card">
          <div className="pc-pp-info-card-title">Valor</div>
          <div className="pc-pp-stat-value" style={{ color: marketValue > (player.seasonStartValue ?? marketValue) ? "var(--pp-green)" : undefined }}>{fmtMoney(player.seasonStartValue ?? marketValue)} → {fmtMoney(marketValue)}</div>
        </div>
        <div className="pc-pp-info-card">
          <div className="pc-pp-info-card-title">Goles</div>
          <div className="pc-pp-stat-value">0 → {stats.goals}</div>
        </div>
        <div className="pc-pp-info-card">
          <div className="pc-pp-info-card-title">Asistencias</div>
          <div className="pc-pp-stat-value">0 → {stats.assists}</div>
        </div>
      </div>

      <div className="pc-pp-attr-section">
        <div className="pc-pp-info-card-title">Atributos Clave</div>
        {attributes.map(([label, value]) => {
          const attrValue = value ?? player.overall;
          const color = attrValue >= 70 ? "var(--pp-green)" : "var(--pp-orange)";
          return (
            <div key={label} className="pc-pp-attr-row">
              <span className="pc-pp-attr-label">{label}</span>
              <div className="pc-pp-attr-bar"><div className="pc-pp-attr-fill" style={{ width: `${attrValue}%`, background: color }} /></div>
              <span className="pc-pp-attr-value">{attrValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
