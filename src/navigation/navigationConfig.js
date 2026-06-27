export const PRIMARY_NAV = [
  { id:"dashboard", icon:"🏠", label:"Inicio" },
  { id:"squad", icon:"👥", label:"Plantilla" },
  { id:"lineup", icon:"📋", label:"Alineación" },
  { id:"news", icon:"📰", label:"Noticias" },
  { id:"more", icon:"☰", label:"Más" },
];

export const MORE_SECTIONS = [
  { id:"attention", icon:"📥", label:"Centro de atención", description:"Asuntos pendientes", group:"Gestión", accent:"#c9a84c" },
  { id:"cloudSaves", icon:"☁️", label:"Mis partidas", description:"Guardado en la nube", group:"Gestión", accent:"#60a5fa" },
  { id:"career", icon:"🧑‍💼", label:"Mi carrera", description:"Prestigio e historial", group:"Gestión", accent:"#c9a84c" },
  { id:"calendar", icon:"📅", label:"Calendario", description:"Partidos y jornadas", group:"Competición", accent:"#3b82f6" },
  { id:"standings", icon:"🏆", label:"Clasificación", description:"Tabla y goleadores", group:"Competición", accent:"#c9a84c" },
  { id:"transfers", icon:"💰", label:"Fichajes", description:"Mercado y operaciones", group:"Club", accent:"#22c55e" },
  { id:"contracts", icon:"📄", label:"Contratos", description:"Renovaciones y salarios", group:"Club", accent:"#f59e0b" },
  { id:"staff", icon:"🏢", label:"Staff técnico", description:"Responsables e informes", group:"Club", accent:"#c9a84c" },
  { id:"scouting", icon:"🔎", label:"Scouting", description:"Ojeadores e informes", group:"Club", accent:"#60a5fa" },
  { id:"finances", icon:"💵", label:"Finanzas", description:"Ingresos y presupuesto", group:"Club", accent:"#10b981" },
  { id:"tactics", icon:"⚙️", label:"Tácticas", description:"Identidad de juego", group:"Gestión", accent:"#64748b" },
  { id:"lockerRoom", icon:"🗣️", label:"Vestuario", description:"Moral, líderes y conflictos", group:"Gestión", accent:"#f97316" },
  { id:"fans", icon:"📣", label:"Afición", description:"Masa social y ambiente", group:"Gestión", accent:"#c9a84c" },
  { id:"training", icon:"🏋", label:"Entrenamientos", description:"Plan y desarrollo", group:"Gestión", accent:"#f59e0b" },
  { id:"youth", icon:"🌱", label:"Cantera", description:"Juveniles y promoción", group:"Gestión", accent:"#84cc16" },
  { id:"medical", icon:"🏥", label:"Centro médico", description:"Lesiones y riesgos", group:"Gestión", accent:"#ef4444" },
  { id:"board", icon:"🏛", label:"Directiva", description:"Objetivos y Legacy", group:"Club", accent:"#a78bfa" },
  { id:"legacyMuseum", icon:"🏆", label:"Legacy", description:"Historia, trofeos y leyendas", group:"Club", accent:"#c9a84c" },
  { id:"settings", icon:"⚙", label:"Configuración", description:"Preferencias del juego", group:"Sistema", accent:"#9ca3af" },
];

export const SECONDARY_SCREEN_IDS = new Set(MORE_SECTIONS.map(item=>item.id));
