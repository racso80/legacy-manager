// One-off asset generator — run with `node scripts/generate-icons.mjs`.
// Rasterizes scripts/icon-source.svg into the PNG sizes public/manifest.webmanifest
// and index.html's apple-touch-icon link expect. Not part of the build; output is
// committed as a static asset in public/icons/, same as the team crest images.
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(__dirname, "icon-source.svg");
const outDir = path.join(__dirname, "..", "public", "icons");

const targets = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["icon-512-maskable.png", 512],
  ["apple-touch-icon.png", 180],
];

for (const [file, size] of targets) {
  const outPath = path.join(outDir, file);
  await sharp(source, { density: 384 }).resize(size, size).png().toFile(outPath);
  console.log(`wrote ${file} (${size}x${size})`);
}
