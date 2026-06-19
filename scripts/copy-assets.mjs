// Copies public/ assets and src/js/main.js into dist/.
// Creates placeholder images for any referenced image that doesn't exist yet,
// so the site can be previewed locally before real photos arrive.

import { mkdir, copyFile, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_PUBLIC = path.join(ROOT, 'public');
const SRC_JS = path.join(ROOT, 'src', 'js');
const DIST = path.join(ROOT, 'dist');

async function ensureDir(p) { if (!existsSync(p)) await mkdir(p, { recursive: true }); }

async function copyDir(from, to) {
  if (!existsSync(from)) return;
  await ensureDir(to);
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await copyFile(s, d);
  }
}

// Generates a soft gradient SVG used as a placeholder image when real assets are missing.
function placeholderSvg(label, w = 1600, h = 1200) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1F2937"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <g fill="#FAFAF7" font-family="Georgia, serif" text-anchor="middle">
    <text x="${w/2}" y="${h/2 - 20}" font-size="${Math.round(w/22)}" opacity="0.85">Hotel Mergera</text>
    <text x="${w/2}" y="${h/2 + 60}" font-size="${Math.round(w/40)}" opacity="0.6">${label}</text>
  </g>
</svg>`;
}

const PLACEHOLDER_IMAGES = [
  ['hero/hero-poster.jpg', 'Hero — drona kadrs (placeholder)'],
  ['rooms/room-1.jpg', 'Divvietīga istaba'],
  ['rooms/room-2.jpg', 'Ģimenes apartaments'],
  ['rooms/room-3.jpg', 'Luksusa istaba'],
  ['sauna/sauna-1.jpg', 'Pirts'],
  ['sauna/sauna-2.jpg', 'Pirts iekšskats'],
  ['sauna/sauna-hero.jpg', 'Pirts — hero'],
  ['hot-tub/hot-tub-1.jpg', 'Āra baļa'],
  ['hot-tub/hot-tub-2.jpg', 'Āra baļa naktī'],
  ['hot-tub/hot-tub-hero.jpg', 'Āra baļa — hero'],
  ['about/about-1.jpg', 'Saimnieki'],
  ['og-cover.jpg', 'Open Graph cover'],
  ['favicon.svg', 'Favicon']
];
for (let i = 1; i <= 12; i++) PLACEHOLDER_IMAGES.push([`gallery/g${i}.jpg`, `Galerija ${i}`]);

async function writePlaceholders() {
  const imgDir = path.join(DIST, 'images');
  await ensureDir(imgDir);
  for (const [rel, label] of PLACEHOLDER_IMAGES) {
    const dest = path.join(imgDir, rel);
    if (existsSync(dest)) continue;
    await ensureDir(path.dirname(dest));
    // Use SVG placeholder content but keep .jpg extension so the same path works once real
    // photos drop in. Browsers render the SVG content fine via <img src="...jpg">? No —
    // browsers sniff by extension. So write as .svg too and keep the .jpg slot for real files.
    // To keep things simple here: write the SVG content under a sibling .svg name and let the
    // .jpg slot stay empty until real photos arrive.
    const svgPath = dest.replace(/\.jpg$/, '.svg');
    await writeFile(svgPath, placeholderSvg(label), 'utf8');
    // Also write a tiny stub .jpg redirect HTML? No — that breaks <img>.
    // Instead: write the SVG content *as* the .jpg so img renders something. SVG-in-jpg
    // works only because some servers serve by content-sniffing; safer is to also write
    // a minimal data file. We'll write the SVG to the .jpg path too (Chrome/Edge sniff SVG).
    await writeFile(dest, placeholderSvg(label), 'utf8');
  }
  // Favicon
  const fav = path.join(imgDir, 'favicon.svg');
  if (!existsSync(fav)) {
    await writeFile(fav, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1F2937"/><text x="50%" y="56%" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="#D4A24C">M</text></svg>`, 'utf8');
  }
}

async function copyJs() {
  const src = path.join(SRC_JS, 'main.js');
  if (!existsSync(src)) return;
  const dest = path.join(DIST, 'assets', 'js', 'main.js');
  await ensureDir(path.dirname(dest));
  await copyFile(src, dest);
}

async function main() {
  await ensureDir(DIST);
  await copyDir(SRC_PUBLIC, DIST);
  await writePlaceholders();
  await copyJs();
  console.log('✓ Assets copied; placeholders generated for missing images.');
}

main().catch((err) => { console.error(err); process.exit(1); });
