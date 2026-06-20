export const PRIMARY_NAV = [
  { id:"dashboard", icon:"🏠", label:"Inicio" },
  { id:"squad", icon:"👥", label:"Plantilla" },
  { id:"lineup", icon:"📋", label:"Alineación" },
  { id:"news", icon:"📰", label:"Noticias" },
  { id:"more", icon:"☰", label:"Más" },
];

export const MORE_SECTIONS = [
  { id:"calendar", icon:"📅", label:"Calendario", description:"Partidos y jornadas", group:"Competición", accent:"#3b82f6" },
  { id:"standings", icon:"🏆", label:"Clasificación", description:"Tabla y goleadores", group:"Competición", accent:"#c9a84c" },
  { id:"transfers", icon:"💰", label:"Fichajes", description:"Mercado y operaciones", group:"Club", accent:"#22c55e" },
  { id:"finances", icon:"💵", label:"Finanzas", description:"Ingresos y presupuesto", group:"Club", accent:"#10b981" },
  { id:"tactics", icon:"⚙️", label:"Tácticas", description:"Identidad de juego", group:"Gestión", accent:"#64748b" },
  { id:"training", icon:"🏋", label:"Entrenamientos", description:"Plan y desarrollo", group:"Gestión", accent:"#f59e0b" },
  { id:"youth", icon:"🌱", label:"Cantera", description:"Juveniles y promoción", group:"Gestión", accent:"#84cc16" },
  { id:"medical", icon:"🏥", label:"Centro médico", description:"Lesiones y riesgos", group:"Gestión", accent:"#ef4444" },
  { id:"board", icon:"🏛", label:"Directiva", description:"Objetivos y Legacy", group:"Club", accent:"#a78bfa" },
  { id:"settings", icon:"⚙", label:"Configuración", description:"Preferencias del juego", group:"Sistema", accent:"#9ca3af" },
];

export const SECONDARY_SCREEN_IDS = new Set(MORE_SECTIONS.map(item=>item.id));
