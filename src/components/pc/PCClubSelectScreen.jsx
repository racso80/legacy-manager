import { useState } from "react";
import { LEAGUES, getLeaguesByCountry } from "../../data/leagues.js";
import { resolveTeamCrest } from "../../data/dataLoader.js";
import { REAL_SQUADS } from "../../App.jsx";

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

export default function PCClubSelectScreen({ teams, onContinue }) {
  const countries = getAvailableCountries();
  const [countryId, setCountryId] = useState(countries[0]?.id ?? null);
  const [leagueId, setLeagueId] = useState(null);
  const [teamId, setTeamId] = useState(null);

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
          onClick={() => selectedTeam && onContinue(selectedTeam)}
        >
          {selectedTeam ? `Continuar con ${selectedTeam.name} →` : "Continuar →"}
        </button>
      </div>
    </div>
  );
}
