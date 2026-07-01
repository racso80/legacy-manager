const PC_NAV_GROUPS = [
  {
    label: "PRINCIPAL",
    items: [
      { id: "dashboard", icon: "🏠", label: "Despacho" },
      { id: "squad", icon: "👥", label: "Plantilla" },
      { id: "lineup", icon: "📋", label: "Alineación" },
      { id: "match", icon: "⚽", label: "Partido" },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      { id: "transfers", icon: "💰", label: "Mercado" },
      { id: "contracts", icon: "📄", label: "Contratos" },
      { id: "medical", icon: "🏥", label: "Médico" },
      { id: "training", icon: "🏋", label: "Entrenamiento" },
      { id: "staff", icon: "🏢", label: "Staff" },
      { id: "youth", icon: "🌱", label: "Cantera" },
      { id: "scouting", icon: "🔍", label: "Scouting" },
      { id: "finances", icon: "💶", label: "Finanzas" },
      { id: "lockerRoom", icon: "👕", label: "Vestuario" },
      { id: "fans", icon: "📣", label: "Afición" },
      { id: "tactics", icon: "⚙️", label: "Tácticas" },
    ],
  },
  {
    label: "CLUB",
    items: [
      { id: "news", icon: "📰", label: "Noticias" },
      { id: "board", icon: "🏛", label: "Directiva" },
      { id: "legacyMuseum", icon: "🏆", label: "Legado" },
      { id: "standings", icon: "🏆", label: "Clasificación" },
      { id: "calendar", icon: "📅", label: "Calendario" },
      { id: "settings", icon: "⚙", label: "Ajustes" },
      { id: "attention", icon: "🔔", label: "Centro de Atención", badge: true },
      { id: "career", icon: "📈", label: "Carrera" },
      { id: "cloudSaves", icon: "☁️", label: "Guardado en nube" },
    ],
  },
];

export default function PCSidebar({ screen, setScreen, attentionCount = 0 }) {
  return (
    <nav className="pc-sidebar">
      {PC_NAV_GROUPS.map(group => (
        <div key={group.label} className="pc-sidebar-group">
          <div className="pc-sidebar-group-label">{group.label}</div>
          {group.items.map(item => {
            const active = screen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                className={`pc-nav-item${active ? " active" : ""}`}
              >
                <span className="pc-nav-item-icon">{item.icon}</span>
                <span className="pc-nav-item-label">{item.label}</span>
                {item.badge && attentionCount > 0 && (
                  <span className="pc-nav-item-badge">{attentionCount}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
