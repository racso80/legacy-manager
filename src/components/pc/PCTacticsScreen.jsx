import PCTacticsImpactBox from "./tactics/PCTacticsImpactBox.jsx";
import PCTacticsDimensionSection from "./tactics/PCTacticsDimensionSection.jsx";
import PCTacticsPresetsPanel from "./tactics/PCTacticsPresetsPanel.jsx";

const DIMENSIONS = [
  ["mentalidad", "Mentalidad", [["defensiva", "Defensiva"], ["equilibrada", "Equilibrada"], ["ofensiva", "Ofensiva"]]],
  ["presion", "Presión", [["baja", "Baja"], ["media", "Media"], ["alta", "Alta"]]],
  ["ritmo", "Ritmo", [["lento", "Lento"], ["normal", "Normal"], ["rapido", "Rápido"]]],
  ["estilo", "Estilo de ataque", [["directo", "Directo"], ["posesion", "Posesión"], ["bandas", "Bandas"], ["contraataque", "Contra"]]],
  ["riesgo", "Riesgo", [["conservador", "Conservador"], ["normal", "Normal"], ["agresivo", "Agresivo"]]],
];

export default function PCTacticsScreen({ tactics, setTactics, savedTacticsPresets = [], onSaveTacticsPresets, nextFixture, nextOpponent }) {
  const subtitle = nextFixture && nextOpponent
    ? `Próximo rival: ${nextOpponent.name} · J${nextFixture.matchday}`
    : "Sin próximo partido programado";

  return (
    <div className="pc-tt-root">
      <div className="pc-tt-header">
        <div>
          <h1>Táctica</h1>
          <div className="pc-tt-sub">{subtitle}</div>
        </div>
      </div>

      <div className="pc-tt-layout">
        <div>
          <PCTacticsImpactBox tactics={tactics} />
          {DIMENSIONS.map(([field, title, options]) => (
            <PCTacticsDimensionSection key={field} field={field} title={title} options={options} tactics={tactics} setTactics={setTactics} />
          ))}
        </div>

        <div>
          <PCTacticsPresetsPanel tactics={tactics} setTactics={setTactics} savedTacticsPresets={savedTacticsPresets} onSaveTacticsPresets={onSaveTacticsPresets} />
        </div>
      </div>
    </div>
  );
}
