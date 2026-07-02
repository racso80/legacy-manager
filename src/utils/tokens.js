export const COLORS = {
  bg: "#161a24",
  gold: "#c9a84c",
  muted: "#9aa0b4",
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#f59e0b",
  info: "#60a5fa",
  text: "#e8eaf0",
  textDim: "#6b7280",
};

// Returns relative luminance of a hex color (WCAG formula)
export function getLuminance(hex) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const toLinear = c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
  return 0.2126*toLinear(r) + 0.7152*toLinear(g) + 0.0722*toLinear(b);
}

// Returns text color to use ON TOP of a club color background (black or white)
export function getClubTextColor(hex) {
  return getLuminance(hex) > 0.35 ? '#0d0f14' : '#ffffff';
}

// Returns a brightened version of dark colors for use as text/border on dark bg
// If contrast ratio vs #13161e is < 3, lighten the color until it passes
export function getClubAccentColor(hex) {
  const bgLum = 0.0081; // #13161e
  let lum = getLuminance(hex);
  if ((lum + 0.05) / (bgLum + 0.05) >= 3) return hex; // already OK
  // Lighten by mixing with white until contrast >= 3:1
  let r = parseInt(hex.slice(1,3),16);
  let g = parseInt(hex.slice(3,5),16);
  let b = parseInt(hex.slice(5,7),16);
  for (let i = 0; i < 20; i++) {
    r = Math.min(255, Math.round(r + (255-r)*0.15));
    g = Math.min(255, Math.round(g + (255-g)*0.15));
    b = Math.min(255, Math.round(b + (255-b)*0.15));
    const newHex = '#' + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
    if ((getLuminance(newHex) + 0.05) / (bgLum + 0.05) >= 3) return newHex;
  }
  return '#' + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}
