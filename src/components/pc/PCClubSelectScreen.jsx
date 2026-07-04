import { useState } from "react";
import { LEAGUES, getLeaguesByCountry } from "../../data/leagues.js";
import { resolveTeamCrest } from "../../data/dataLoader.js";
import { computeRarityCount, computeSquadRatings, getTeamDifficulty, getTopPlayers, lineRatingColor } from "../../data/teamStats.js";
import { NAT_FLAG, RARITY_ACCENT, RARITY_LABEL, REAL_SQUADS, TEAM_DETAILS } from "../../App.jsx";

// País disponibles = países con al menos una liga en LEAGUES. Nunca se hardcodea
// la lista: añadir una liga nueva a LEAGUES basta para que su país aparezca aquí.
function getAvailableCountries() {
  const byCode = new Map();
  LEAGUES.forEach(l => {
    if (!byCode.has(l.country)) byCode.set(l.country, { id: l.country, name: l.countryName, flag: l.flag });
  });
  return [...byCode.values()];
}

// Bandera real en /flags/{code}.svg (mismo patrón que los escudos en /teams/{id}.png);
// si no existe todavía para un país, se cae al emoji de LEAGUES como fallback.
function CountryFlag({ country }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="pc-cs-flag-emoji">{country.flag}</span>;
  return (
    <img
      className="pc-cs-flag-img"
      src={`/flags/${country.id.toLowerCase()}.svg`}
      alt={country.name}
      onError={() => setFailed(true)}
    />
  );
}

function TeamCardCrest({ team }) {
  const [failed, setFailed] = useState(false);
  const source = resolveTeamCrest(team);
  if (failed || !source) {
    return <div className="pc-cs-crest-fallback">{team.short}</div>;
  }
  return <img className="pc-cs-crest-img" src={source} alt={team.name} onError={() => setFailed(true)} />;
}

function DetailCrest({ team }) {
  const [failed, setFailed] = useState(false);
  const source = resolveTeamCrest(team);
  if (failed || !source) {
    return <div className="pc-cs-detail-crest-fallback">{team.short}</div>;
  }
  return <img className="pc-cs-detail-crest-img" src={source} alt={team.name} onError={() => setFailed(true)} />;
}

// Ficha detallada del club elegido: mismo contenido y misma lógica que la ficha
// móvil (TeamSelection en App.jsx — medias por línea, jugadores estrella, info
// del club, dificultad), adaptada al layout de columnas de PC.
function ClubDetail({ team, onBack, onConfirm }) {
  const squad = REAL_SQUADS[team.id] ?? [];
  const details = TEAM_DETAILS[team.id] ?? {};
  const stars = getTopPlayers(squad, 3);
  const { gkAvg, defAvg, medAvg, delAvg, totalAvg } = computeSquadRatings(squad, team.avg);
  const rarityCount = computeRarityCount(squad);
  const diff = getTeamDifficulty(totalAvg);

  return (
    <div className="pc-clubselect">
      <button className="pc-cs-detail-back" onClick={onBack}>← Volver a la selección</button>

      <div className="pc-cs-detail-head">
        <DetailCrest team={team} />
        <div>
          <div className="pc-cs-detail-name">{team.name}</div>
          <div className="pc-cs-detail-meta">📍 {team.city} · {team.stadium}</div>
          <div className="pc-cs-detail-obj" style={{ color: team.color }}>🎯 Objetivo: {team.obj}</div>
        </div>
      </div>

      <div className="pc-cs-detail-grid">
        <div className="pc-cs-detail-panel">
          <div className="pc-cs-detail-panel-title">Nivel de la plantilla</div>
          <div className="pc-cs-rating-row">
            <div className="pc-cs-rating-total">
              <div className="val" style={{ color: lineRatingColor(totalAvg) }}>{totalAvg}</div>
              <div className="lbl">MEDIA</div>
            </div>
            <div className="pc-cs-rating-lines">
              {[["POR", gkAvg], ["DEF", defAvg], ["MED", medAvg], ["DEL", delAvg]].map(([label, val]) => (
                <div key={label} className="pc-cs-rating-line">
                  <div className="val" style={{ color: lineRatingColor(val) }}>{val}</div>
                  <div className="lbl">{label}</div>
                  <div className="pc-cs-rating-bar">
                    <div className="pc-cs-rating-bar-fill" style={{ width: `${((val - 60) / 40) * 100}%`, background: lineRatingColor(val) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pc-cs-rarity-row">
            {Object.entries(rarityCount).filter(([, v]) => v > 0).map(([r, v]) => (
              <div key={r} className="pc-cs-rarity-chip" style={{ background: `${RARITY_ACCENT[r]}18`, border: `1px solid ${RARITY_ACCENT[r]}44`, color: RARITY_ACCENT[r] }}>
                {v} {RARITY_LABEL[r]}
              </div>
            ))}
          </div>
        </div>

        <div className="pc-cs-detail-panel">
          <div className="pc-cs-detail-panel-title">⭐ Jugadores estrella</div>
          {stars.map(p => {
            const acc = RARITY_ACCENT[p.rarity];
            return (
              <div key={p.id} className="pc-cs-star-row">
                <div className="pc-cs-star-badge" style={{ background: `${acc}20`, border: `1.5px solid ${acc}55`, color: acc }}>{p.overall}</div>
                <div className="pc-cs-star-info">
                  <div className="pc-cs-star-name">{p.name}</div>
                  <div className="pc-cs-star-meta">{p.pos} · {p.age} años · {NAT_FLAG[p.nat] ?? ""}</div>
                </div>
                <div className="pc-cs-star-attrs">
                  {Object.entries(p.attrs).filter(([k]) => k !== "porteria" || p.group === "POR").slice(0, 3).map(([k, v]) => (
                    <div key={k} className="pc-cs-star-attr">
                      <div className="v" style={{ color: v >= 80 ? "#22c55e" : v >= 70 ? "#c9a84c" : "#9aa0b4" }}>{v}</div>
                      <div className="k">{k.slice(0, 3).toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                <span className="pc-cs-star-rarity" style={{ color: acc, background: `${acc}18` }}>{RARITY_LABEL[p.rarity]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pc-cs-detail-grid">
        <div className="pc-cs-detail-panel">
          <div className="pc-cs-detail-panel-title">Info del club</div>
          {[
            ["🏟️ Estadio", team.stadium],
            ["📅 Fundación", details.fundacion],
            ["⚔️ Rival", details.rivalidad],
            ["💶 Presupuesto", `€${team.budget}M`],
            ["👥 Plantilla", `${squad.length} jugadores`],
            ["🎮 Estilo", details.estilo],
          ].map(([label, val]) => (
            <div key={label} className="pc-cs-info-row">
              <span className="pc-cs-info-label">{label}</span>
              <span className="pc-cs-info-value">{val}</span>
            </div>
          ))}
        </div>

        <div className="pc-cs-detail-panel">
          <div className="pc-cs-detail-panel-title">Dificultad</div>
          <div className="pc-cs-diff-row">
            <div style={{ flex: 1 }}>
              <div className="pc-cs-diff-label" style={{ color: diff.color }}>{diff.label}</div>
              <div className="pc-cs-diff-desc">{diff.desc}</div>
            </div>
            <div className="pc-cs-diff-dots">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="pc-cs-diff-dot" style={{ background: i <= diff.stars ? diff.color : "#1e2330" }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pc-cs-detail-footer">
        <button className="pc-cs-detail-back" onClick={onBack}>← Volver</button>
        <button className="pc-cs-continue-btn ready" onClick={() => onConfirm(team)}>
          Elegir {team.name} →
        </button>
      </div>
    </div>
  );
}

export default function PCClubSelectScreen({ teams, onContinue }) {
  const countries = getAvailableCountries();
  const [countryId, setCountryId] = useState(countries[0]?.id ?? null);
  const [leagueId, setLeagueId] = useState(null);
  const [teamId, setTeamId] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const leagues = countryId ? [...getLeaguesByCountry(countryId)].sort((a, b) => a.tier - b.tier) : [];
  const activeLeague = leagues.find(l => l.id === leagueId) ?? null;
  const teamsInLeague = activeLeague ? teams.filter(t => t.leagueId === activeLeague.id) : [];
  const selectedTeam = teamsInLeague.find(t => t.id === teamId) ?? null;

  const stepLabel = !countryId ? "Paso 1 · País" : !activeLeague ? "Paso 2 · Liga" : !selectedTeam ? "Paso 3 · Equipo" : "Listo";

  function selectCountry(id) {
    setCountryId(id);
    setLeagueId(null);
    setTeamId(null);
  }
  function selectLeague(id) {
    setLeagueId(id);
    setTeamId(null);
  }

  if (showDetail && selectedTeam) {
    return <ClubDetail team={selectedTeam} onBack={() => setShowDetail(false)} onConfirm={onContinue} />;
  }

  return (
    <div className="pc-clubselect">
      <div className="pc-clubselect-header">
        <h1>Elige tu <span>club</span></h1>
        <div className="pc-clubselect-step">{stepLabel}</div>
      </div>

      <div className="pc-cs-country-wrap">
        <div className="pc-cs-country-title">
          <span>País</span>
          {countries.length <= 1 && <span className="note">Más países próximamente</span>}
        </div>
        <div className="pc-cs-country-strip">
          {countries.map(c => {
            const countLeagues = getLeaguesByCountry(c.id).length;
            return (
              <div key={c.id} className={`pc-cs-country-pill${countryId === c.id ? " active" : ""}`} onClick={() => selectCountry(c.id)}>
                <CountryFlag country={c} />
                <span className="name">{c.name}</span>
                <span className="count">{countLeagues} liga{countLeagues > 1 ? "s" : ""}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pc-cs-columns">
        <div className="pc-cs-panel">
          <div className="pc-cs-panel-head">
            <span>Ligas</span>
            <span className="active">{countries.find(c => c.id === countryId)?.name ?? "—"}</span>
          </div>
          <div className="pc-cs-league-list">
            {!countryId && <div className="pc-cs-empty">Elegí un país arriba</div>}
            {countryId && leagues.map(l => (
              <div key={l.id} className={`pc-cs-league-item${leagueId === l.id ? " active" : ""}`} onClick={() => selectLeague(l.id)}>
                <div className="pc-cs-league-badge">{l.name.split(" ").map(w => w[0]).join("").slice(0, 2)}</div>
                <div className="pc-cs-league-info">
                  <div className="l-name">{l.name}</div>
                  <div className="l-meta">{l.teamsCount} equipos{l.hasPlayoff ? " · con playoff" : ""}</div>
                </div>
                <div className="pc-cs-chevron">›</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pc-cs-panel">
          <div className="pc-cs-panel-head">
            <span>Equipos</span>
            <span className="active">{activeLeague?.name ?? "—"}</span>
          </div>
          <div className="pc-cs-team-grid">
            {!activeLeague && <div className="pc-cs-empty">Elegí una liga para ver sus equipos</div>}
            {activeLeague && teamsInLeague.map(t => (
              <div
                key={t.id}
                className={`pc-cs-team-card${teamId === t.id ? " selected" : ""}`}
                style={{ background: `linear-gradient(150deg, ${t.color} 0%, rgba(0,0,0,0.55) 100%), ${t.color}` }}
                onClick={() => setTeamId(t.id)}
              >
                <TeamCardCrest team={t} />
                <div className="pc-cs-team-info">
                  <div className="pc-cs-team-name">{t.name}</div>
                  <div className="pc-cs-team-stats">
                    <div className="pc-cs-team-stat-row"><span className="label">Presupuesto</span><span className="value">€{t.budget}M</span></div>
                    <div className="pc-cs-team-stat-row"><span className="label">Objetivo</span><span className="value">{t.obj}</span></div>
                    <div className="pc-cs-team-stat-row"><span className="label">Jugadores</span><span className="value">{(REAL_SQUADS[t.id] ?? []).length}</span></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pc-cs-footer">
        <button
          className={`pc-cs-continue-btn${selectedTeam ? " ready" : ""}`}
          disabled={!selectedTeam}
          onClick={() => selectedTeam && setShowDetail(true)}
        >
          {selectedTeam ? `Continuar con ${selectedTeam.name} →` : "Continuar →"}
        </button>
      </div>
    </div>
  );
}
