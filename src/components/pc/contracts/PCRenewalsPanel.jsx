const fmt = value => value >= 1000 ? `€${(value / 1000).toFixed(1)}M` : `€${Math.round(value)}K`;

const STATUS_LABELS = {
  pending: ["Esperando respuesta", "pending"],
  accepted: ["Aceptada", "good"],
  salaryCounter: ["Pide más salario", "counter"],
  yearsCounter: ["Pide más años", "counter"],
  roleCounter: ["Pide otro rol", "counter"],
};

// Contra-oferta del jugador: contractEngine.js solo guarda UN aspecto
// contraofertado a la vez (status = "salaryCounter" | "yearsCounter" |
// "roleCounter"), pero se muestra como tres filas independientes — las dos
// que no forman parte de la contraoferta actual conservan los valores de la
// propuesta original y se marcan "(aceptado)", ya que acceptRenewalCounter
// (contractEngine.js:64-67) solo sustituye el campo realmente contraofertado.
function detailRows(renewal) {
  return [
    { key: "salary", label: "Salario", value: `${fmt(renewal.counterSalary ?? renewal.salary)}/sem`, isCounter: renewal.status === "salaryCounter" },
    { key: "years", label: "Años", value: `${renewal.counterYears ?? renewal.years}`, isCounter: renewal.status === "yearsCounter" },
    { key: "role", label: "Rol", value: `${renewal.counterRole ?? renewal.role}`, isCounter: renewal.status === "roleCounter" },
  ];
}

function acceptLabel(renewal) {
  if (renewal.status === "salaryCounter") return `Aceptar ${fmt(renewal.counterSalary)}/sem`;
  if (renewal.status === "yearsCounter") return `Aceptar ${renewal.counterYears} años`;
  if (renewal.status === "roleCounter") return `Aceptar ${renewal.counterRole}`;
  return null;
}

export default function PCRenewalsPanel({ renewals, selectedId, onSelect, onAcceptCounter, onComplete, onWithdraw }) {
  const selected = renewals.find(r => r.id === selectedId) ?? renewals[0] ?? null;
  const accept = selected ? acceptLabel(selected) : null;

  return (
    <div className="pc-ct-renewals-panel">
      <div className="pc-ct-renewals-title">Renovaciones en curso</div>
      {!renewals.length && <div className="pc-ct-empty">No hay renovaciones activas. Abre "Renovar" en un jugador para empezar una negociación.</div>}
      {renewals.map(renewal => {
        const [label, cls] = STATUS_LABELS[renewal.status] ?? [renewal.status, "pending"];
        return (
          <div key={renewal.id} className={`pc-ct-renewal-item${selected?.id === renewal.id ? " selected" : ""}`} onClick={() => onSelect(renewal.id)}>
            <div className="pc-ct-ri-name">{renewal.playerName}</div>
            <div className="pc-ct-ri-detail">Ofrecido: {fmt(renewal.salary)}/sem · {renewal.years} años · {renewal.role}</div>
            <span className={`pc-ct-ri-status ${cls}`}>{label}</span>
          </div>
        );
      })}

      {selected && (
        <div className="pc-ct-detail-block">
          <div className="pc-ct-detail-title">
            {selected.playerName} {["salaryCounter", "yearsCounter", "roleCounter"].includes(selected.status) ? "pide:" : selected.status === "accepted" ? "acepta renovar:" : "estudia la propuesta:"}
          </div>
          {detailRows(selected).map(row => (
            <div key={row.key} className="pc-ct-db-row">
              <span className="lbl">{row.label}</span>
              <span className={`val${row.isCounter ? " counter" : ""}`}>{row.value}{!row.isCounter && selected.status !== "pending" ? " (aceptado)" : ""}</span>
            </div>
          ))}
          <div className="pc-ct-counter-actions">
            <button className="btn-ghost pc-ct-btn-sm" onClick={() => onWithdraw(selected.id)}>Retirar</button>
            {accept && <button className="btn-gold pc-ct-btn-sm" onClick={() => onAcceptCounter(selected.id)}>{accept}</button>}
            {selected.status === "accepted" && <button className="btn-gold pc-ct-btn-sm" onClick={() => onComplete(selected.id)}>Firmar renovación</button>}
          </div>
        </div>
      )}
    </div>
  );
}
