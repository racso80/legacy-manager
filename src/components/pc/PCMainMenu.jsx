export function PCMenuLogo({ className = "pc-pregame-menu-logo" } = {}) {
  return (
    <svg className={className} width="100%" height="100%" viewBox="0 0 150 170" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pcMenuShieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8c874" />
          <stop offset="45%" stopColor="#c9a84c" />
          <stop offset="100%" stopColor="#8a6f2e" />
        </linearGradient>
        <linearGradient id="pcMenuInnerGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2233" />
          <stop offset="100%" stopColor="#0c0f16" />
        </linearGradient>
        <radialGradient id="pcMenuBallGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#c7ccd6" />
        </radialGradient>
      </defs>

      <path d="M75 4 L140 24 V78 C140 122 112 152 75 166 C38 152 10 122 10 78 V24 Z" fill="url(#pcMenuShieldGrad)" />
      <path d="M75 14 L131 31 V78 C131 116 107 142 75 155 C43 142 19 116 19 78 V31 Z" fill="url(#pcMenuInnerGrad)" stroke="#c9a84c" strokeWidth="1.5" />

      <g stroke="#c9a84c" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.85">
        <path d="M30 60 Q22 80 30 100 Q24 112 32 124" />
        <path d="M34 64 Q30 64 27 70" /><path d="M31 76 Q27 76 24 82" />
        <path d="M29 90 Q25 90 22 96" /><path d="M30 104 Q26 106 24 112" />
        <path d="M120 60 Q128 80 120 100 Q126 112 118 124" />
        <path d="M116 64 Q120 64 123 70" /><path d="M119 76 Q123 76 126 82" />
        <path d="M121 90 Q125 90 128 96" /><path d="M120 104 Q124 106 126 112" />
      </g>

      <g transform="translate(75,80)">
        <circle r="26" fill="url(#pcMenuBallGrad)" stroke="#0c0f16" strokeWidth="2" />
        <polygon points="0,-11 10,-4 6,8 -6,8 -10,-4" fill="#161d2e" />
        <path d="M0,-11 L0,-26 M10,-4 L23,-9 M6,8 L14,21 M-6,8 L-14,21 M-10,-4 L-23,-9" stroke="#161d2e" strokeWidth="2" fill="none" />
        <path d="M0,-26 A26,26 0 0,1 23,-9" stroke="#161d2e" strokeWidth="2" fill="none" />
        <path d="M23,-9 A26,26 0 0,1 14,21" stroke="#161d2e" strokeWidth="2" fill="none" />
        <path d="M14,21 A26,26 0 0,1 -14,21" stroke="#161d2e" strokeWidth="2" fill="none" />
        <path d="M-14,21 A26,26 0 0,1 -23,-9" stroke="#161d2e" strokeWidth="2" fill="none" />
        <path d="M-23,-9 A26,26 0 0,1 0,-26" stroke="#161d2e" strokeWidth="2" fill="none" />
      </g>

      <path d="M75 118 L79 128 L90 129 L81 136 L84 147 L75 141 L66 147 L69 136 L60 129 L71 128 Z" fill="#c9a84c" />
      <path d="M40 148 L75 162 L110 148 L104 158 L75 170 L46 158 Z" fill="#8a6f2e" />
    </svg>
  );
}

export default function PCMainMenu({ onNew, onSaves, onCloud, savesCount }) {
  return (
    <div className="pc-pregame pc-pregame-menu">
      <div className="pc-pregame-menu-pitch" />
      <div className="pc-pregame-menu-content">
        <PCMenuLogo />
        <div className="pc-pregame-menu-title">LEGACY <span className="pc-pregame-accent">MANAGER</span></div>
        <div className="pc-pregame-menu-tagline">Construye tu club · Forja tu legado</div>
        <button className="pc-pregame-menu-btn primary" onClick={onNew}>▶ Nueva partida</button>
        {savesCount > 0 && (
          <button className="pc-pregame-menu-btn secondary" onClick={onSaves}>Continuar partida ({savesCount})</button>
        )}
        <button className="pc-pregame-menu-btn link" onClick={onCloud}>☁️ Cargar desde la nube</button>
        <div className="pc-pregame-menu-footer">LALIGA EA SPORTS · 2025/26</div>
      </div>
    </div>
  );
}
