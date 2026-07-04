const SPEEDS = [1, 2, 4];

export default function MatchScreenHeader({
  leftTeam, rightTeam, leftGoals, rightGoals, leftIsUser, rightIsUser,
  clockLabel, phaseLabel, momentumPct = 50, scorePop,
  playing, onTogglePlay, onManualAdvance, matchSpeed = 1, onSetSpeed,
  alertText, onDismissAlert,
  settingsOpen, onToggleSettings, onAbandon, canAbandon = true,
}) {
  return (
    <div className="pc-match-v2-topbar">
      <div className="pc-match-v2-topbar-main">
        {alertText ? (
          <div className="pc-match-v2-tactic-alert">
            <div className="pc-match-v2-alert-dot" />
            <div className="pc-match-v2-alert-txt">{alertText}</div>
            {onDismissAlert && (
              <button onClick={onDismissAlert} aria-label="Descartar aviso">✕</button>
            )}
          </div>
        ) : <div />}

        <div className="pc-match-v2-scorebar">
          <div className="pc-match-v2-team-chip">
            <span className="pc-match-v2-crest home">{(leftTeam?.short ?? "—").slice(0, 3)}</span>
            <span style={{ color: leftIsUser ? "var(--home)" : "var(--text-primary)" }}>{leftTeam?.short ?? "—"}</span>
          </div>
          <div className="pc-match-v2-clock">
            {clockLabel}
            {phaseLabel && <div className="pc-match-v2-phase">{phaseLabel}</div>}
          </div>
          <div className="pc-match-v2-score-box">
            <span className={`pc-match-v2-score-num ${scorePop === "left" ? "pop" : ""}`}>{leftGoals}</span>
            <span className="pc-match-v2-score-sep">—</span>
            <span className={`pc-match-v2-score-num ${scorePop === "right" ? "pop" : ""}`}>{rightGoals}</span>
          </div>
          <div className="pc-match-v2-team-chip pc-match-v2-team-chip-away">
            <span style={{ color: rightIsUser ? "var(--home)" : "var(--text-primary)" }}>{rightTeam?.short ?? "—"}</span>
            <span className="pc-match-v2-crest away">{(rightTeam?.short ?? "—").slice(0, 3)}</span>
          </div>
        </div>

        <div className="pc-match-v2-topbar-right">
          <div className="pc-match-v2-speed-group">
            {SPEEDS.map(speed => (
              <button
                key={speed}
                className={`pc-match-v2-speed-btn ${matchSpeed === speed ? "on" : ""}`}
                onClick={() => onSetSpeed(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
          <button className="pc-match-v2-icon-btn" onClick={onTogglePlay} aria-label="Pausar/Reanudar">{playing ? "⏸" : "▶"}</button>
          <button className="pc-match-v2-icon-btn" onClick={onManualAdvance} aria-label="Avance manual" title="Avance manual">⏭</button>
          <div className="pc-match-v2-settings-wrap">
            <button className="pc-match-v2-icon-btn" onClick={onToggleSettings} aria-label="Ajustes">⚙</button>
            {settingsOpen && (
              <>
                <div className="pc-match-v2-menu-backdrop" onClick={onToggleSettings} />
                <div className="pc-match-v2-settings-menu">
                  <button
                    onClick={canAbandon ? onAbandon : undefined}
                    disabled={!canAbandon}
                    title={canAbandon ? undefined : "No puedes abandonar un partido en curso"}
                    style={canAbandon ? undefined : { opacity: .4, cursor: "not-allowed" }}
                  >
                    🟥 Abandonar partido
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="pc-match-v2-momentum">
        <div className="pc-match-v2-home-side" style={{ width: `${momentumPct}%` }} />
      </div>
    </div>
  );
}
