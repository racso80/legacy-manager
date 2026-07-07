import { useState } from "react";
import { createPortal } from "react-dom";
import PlayerAvatar from "../../PlayerAvatar.jsx";
import { CONTRACT_ROLES, suggestedRenewalSalary } from "../../../contracts/contractEngine.js";

// Portal a document.body — igual que PCMarketTab.jsx's OfferModal: dentro del
// PC shell, .screen-enter deja un transform (fadeIn, fill-mode both) en un
// ancestro, lo que convierte position:fixed en relativo a ese ancestro en vez
// del viewport. Como el portal cae fuera del subárbol de .pc-ct-root, todas
// las var(--ct-*) usadas aquí necesitan su valor de fallback explícito.
export default function PCRenewalForm({ player, onClose, onSubmit }) {
  const [salary, setSalary] = useState(suggestedRenewalSalary(player));
  const [years, setYears] = useState(player.age >= 31 ? 2 : 3);
  const [role, setRole] = useState(player.squadRole ?? (player.overall >= 82 ? "Titular" : "Rotación"));

  return createPortal(
    <div className="pc-ct-modal-overlay" onClick={onClose}>
      <div className="pc-ct-modal" onClick={e => e.stopPropagation()}>
        <div className="pc-ct-modal-head">
          <PlayerAvatar player={player} size={44} />
          <div>
            <div className="pc-ct-p-name">{player.name}</div>
            <div className="pc-ct-p-sub">{player.pos} · {player.age} años · contrato hasta {player.contractEnd ?? "—"}</div>
          </div>
        </div>
        <div className="pc-ct-form">
          <input type="number" value={salary} onChange={e => setSalary(Number(e.target.value))} />
          <select value={years} onChange={e => setYears(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>{y} años</option>)}
          </select>
          <select value={role} onChange={e => setRole(e.target.value)} className="pc-ct-form-role">
            {CONTRACT_ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
          <button className="btn-gold pc-ct-form-submit" onClick={() => onSubmit(salary, years, role)}>Enviar propuesta</button>
        </div>
        <button className="btn-ghost pc-ct-modal-close" onClick={onClose}>Cancelar</button>
      </div>
    </div>,
    document.body
  );
}
