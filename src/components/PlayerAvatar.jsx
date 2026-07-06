import { useEffect, useState } from "react";
import { resolvePlayerPhoto } from "../data/dataLoader.js";
import { COLORS } from "../utils/tokens.js";

export default function PlayerAvatar({ player, size = 40, style, className, title }) {
  const source = player ? resolvePlayerPhoto(player) : null;
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  const base = { width: size, height: size, flexShrink: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", ...style };
  if (!player) return <div className={className} style={{ ...base, background: "#1e2330", color: COLORS.textDim }}>—</div>;
  const initials = player.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (failed || !source) return <div className={className} title={title ?? player.name} style={{ ...base, background: "rgba(217,178,95,.14)", border: "1px solid rgba(217,178,95,.4)", color: "#d9b25f", fontSize: Math.max(8, Math.round(size * .32)), fontWeight: 800 }}>{initials}</div>;
  return <div className={className} title={title ?? player.name} style={{ ...base, background: "rgba(255,255,255,.04)", overflow: "hidden" }}><img src={source} alt={player.name} onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>;
}
