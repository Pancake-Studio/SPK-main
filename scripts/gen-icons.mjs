/* Generate raster PNG icons from SVG sources for PWA install + Web Push.
 * Run: node scripts/gen-icons.mjs
 * Notification icon/badge and iOS apple-touch-icon require PNG (SVG not rendered). */
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const pub = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const read = (f) => readFile(join(pub, f));
const out = (f) => join(pub, f);

const jobs = [
  // PWA manifest icons (purple tile, "any" purpose)
  { src: "icon.svg", size: 192, dst: "icon-192-ro.png" },
  { src: "icon.svg", size: 512, dst: "icon-512-ro.png" },
  // Maskable (safe-zone padded source) for Android adaptive icons
  // iOS home-screen icon — opaque background, 180x180
  { src: "icon.svg", size: 180, dst: "icon-512-full-apple.png", flatten: "#7C3AED" },
  // Android status-bar badge — white glyph on transparent, small
  { src: "icon-512-ro.png", size: 96, dst: "badge.png" },
];

for (const j of jobs) {
  let img = sharp(await read(j.src), { density: 384 }).resize(j.size, j.size, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (j.flatten) img = img.flatten({ background: j.flatten });
  await img.png().toFile(out(j.dst));
  console.log("wrote", j.dst, `(${j.size}x${j.size})`);
}
console.log("done");
