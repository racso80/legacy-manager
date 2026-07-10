import { useMemo } from "react";
import PlayerAvatar from "../../PlayerAvatar.jsx";

// Mismo criterio narrativo que LegacyMuseumScreen.jsx (móvil) — texto de sabor,
// no una fórmula real, así que se duplica en vez de importarse desde una pantalla móvil.
function legendBlurb(player) {
  const appearances = player.appearances ?? 0;
  const goals = player.goals ?? 0;
  const assists = player.assists ?? 0;
  const cleanSheets = player.cleanSheets ?? 0;
  const titles = player.titles ?? 0;
  const group = player.group ?? player.pos;
  if (player.academy && appearances >= 150) return "Canterano que se convirtió en un pilar histórico del club.";
  if (titles >= 2) return "Vivió los años más gloriosos de la entidad.";
  if (group === "POR" && cleanSheets >= 50) return "Un muro bajo los palos durante toda una época.";
  if (goals >= 80) return "Una leyenda goleadora del club.";
  if (group === "DEF" && appearances >= 120) return "Un pilar defensivo durante una era del club.";
  if (assists >= 50) return "El motor creativo de una generación entera.";
  if (appearances >= 180) return "Una pieza fundamental del primer equipo durante años.";
  return "Un nombre que ha dejado huella en la historia reciente del club.";
}

export default function PCLegendsTab({ archive }) {
  const legends = useMemo(() => Object.values(archive.playerRecords ?? {}).sort((a, b) => (b.legacyScore ?? 0) - (a.legacyScore ?? 0)), [archive.playerRecords]);
  const lines = useMemo(() => {
    const take = (group, count) => legends.filter(item => (item.group ?? item.pos) === group).slice(0, count);
    return [{ id: "DEL", players: take("DEL", 3) }, { id: "MED", players: take("MED", 3) }, { id: "DEF", players: take("DEF", 4) }, { id: "POR", players: take("POR", 1) }];
  }, [legends]);

  if (!legends.length) return <div className="pc-lc-empty">Las leyendas necesitan tiempo. Rendimiento, continuidad y títulos decidirán quién entra aquí.</div>;

  return (
    <div>
      <div className="pc-lc-section-label">Once histórico</div>
      <div className="pc-lc-pitch">
        {lines.map(line => (
          <div key={line.id} className="pc-lc-pitch-line">
            {line.players.map(player => (
              <div key={player.id} className="pc-lc-pitch-card" style={{ width: line.players.length === 4 ? "23%" : "29%" }}>
                <div className="pc-lc-pitch-pos">{player.pos}</div>
                <div className="pc-lc-pitch-name">{player.name}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="pc-lc-section-label">Leyendas del club</div>
      <div className="pc-lc-protagonist-list">
        {legends.slice(0, 10).map((player, index) => (
          <div key={player.id} className="pc-lc-protagonist-row">
            <PlayerAvatar player={player} size={34} />
            <div className="pc-lc-protagonist-info">
              <div className="pc-lc-protagonist-name">{player.name}</div>
              <div className="pc-lc-protagonist-label">{player.appearances} partidos · {player.goals} goles · {player.titles} títulos{player.academy ? " · Cantera" : ""}</div>
              <div className="pc-lc-legend-note">{legendBlurb(player)}</div>
            </div>
            <div className="pc-lc-protagonist-value">#{index + 1}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
