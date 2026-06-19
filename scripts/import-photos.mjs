// Photo importer for Hotel Mergera.
//
// Drop all hotel photos (any names) into a single folder, then run:
//   npm run photos                       (uses C:\Users\PC\Desktop\mergera-foto)
//   npm run photos -- "D:\path\to\fotos"  (custom folder)
//
// The script sorts photos into public/images/<category>/ by filename keywords,
// fills the named slots the templates expect, and spreads everything across the
// gallery. Anything it can't classify goes to the gallery. Re-run any time.

import { readdir, copyFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUB = path.join(ROOT, 'public', 'images');
const DEFAULT_SRC = 'C:\\Users\\PC\\Desktop\\mergera-foto';

const SRC = process.argv[2] || DEFAULT_SRC;
const IMG_RE = /\.(jpe?g|png|webp)$/i;

// Keyword → category. First match wins; otherwise the photo goes to the gallery.
const RULES = [
  { cat: 'rooms',   kw: ['room', 'istab', 'numur', 'gulam', 'guļam', 'bedroom', 'suite', 'apartament', 'divviet', 'gimen', 'ģimen', 'luksus', 'premium', 'guest'] },
  { cat: 'sauna',   kw: ['sauna', 'pirt'] },
  { cat: 'hot-tub', kw: ['tub', 'bala', 'baļ', 'kubl', 'jacuzzi', 'hottub', 'hot-tub', 'hot_tub', 'spa'] },
  { cat: 'exterior',kw: ['exterior', 'aussen', 'ara', 'arpus', 'ārpus', 'drone', 'drons', 'fasad', 'facade', 'building', 'eka', 'ēka', 'muiz', 'manor', 'yard', 'pagalm', 'terase', 'terrace', 'garden', 'darz', 'dārz', 'aerial'] }
];

// Named slots filled from each category, in priority order.
const SLOTS = {
  exterior: ['hero/hero-poster.jpg', 'about/about-1.jpg', 'og-cover.jpg'],
  rooms:    ['rooms/room-1.jpg', 'rooms/room-2.jpg', 'rooms/room-3.jpg'],
  sauna:    ['sauna/sauna-hero.jpg', 'sauna/sauna-1.jpg', 'sauna/sauna-2.jpg'],
  'hot-tub':['hot-tub/hot-tub-hero.jpg', 'hot-tub/hot-tub-1.jpg', 'hot-tub/hot-tub-2.jpg']
};

const categorize = (name) => {
  const n = name.toLowerCase();
  for (const r of RULES) if (r.kw.some((k) => n.includes(k))) return r.cat;
  return 'gallery';
};

async function ensureDir(p) { if (!existsSync(p)) await mkdir(p, { recursive: true }); }

async function main() {
  if (!existsSync(SRC)) {
    await ensureDir(SRC);
    await writeFile(path.join(SRC, 'IELIEC-FOTO-SEIT.txt'),
      'Iemet šeit visus Hotel Mergera foto (jpg/png/webp).\n' +
      'Tad palaid:  npm run photos\n\n' +
      'Padoms: ja faila nosaukumā ir "room"/"istaba", "sauna"/"pirts", "bala"/"tub", "ara"/"drone",\n' +
      'tas nonāks pareizajā sadaļā. Pārējie — galerijā.\n', 'utf8');
    console.log(`Izveidoju mapi: ${SRC}`);
    console.log('Iemet tur foto un palaid vēlreiz: npm run photos');
    return;
  }

  const entries = (await readdir(SRC)).filter((f) => IMG_RE.test(f));
  if (entries.length === 0) {
    console.log(`Mapē nav foto: ${SRC}`);
    console.log('Iemet tur jpg/png/webp failus un palaid vēlreiz.');
    return;
  }

  // Group by category, sorted by name for stable ordering.
  const groups = { rooms: [], sauna: [], 'hot-tub': [], exterior: [], gallery: [] };
  for (const f of entries.sort()) groups[categorize(f)].push(f);

  const report = [];
  const allPlaced = [];

  // Fill named slots from each category.
  for (const [cat, slots] of Object.entries(SLOTS)) {
    const files = groups[cat];
    for (let i = 0; i < slots.length && i < files.length; i++) {
      const src = path.join(SRC, files[i]);
      const dest = path.join(PUB, slots[i]);
      await ensureDir(path.dirname(dest));
      await copyFile(src, dest);
      report.push(`${cat.padEnd(8)} → ${slots[i]}   (${files[i]})`);
      allPlaced.push(files[i]);
    }
  }

  // Gallery: spread every photo across g1..g12, round-robin from each category for variety.
  const galleryDir = path.join(PUB, 'gallery');
  await ensureDir(galleryDir);
  const pool = [];
  const buckets = [groups.exterior, groups.rooms, groups.sauna, groups['hot-tub'], groups.gallery];
  let added = true;
  while (added) {
    added = false;
    for (const b of buckets) {
      if (b.length) { pool.push(b.shift()); added = true; }
    }
  }
  for (let i = 0; i < Math.min(12, pool.length); i++) {
    await copyFile(path.join(SRC, pool[i]), path.join(galleryDir, `g${i + 1}.jpg`));
  }

  console.log(`\n✓ Apstrādāti ${entries.length} foto no: ${SRC}\n`);
  console.log('Nolikti slotos:');
  report.forEach((r) => console.log('  ' + r));
  console.log(`\nGalerijā: ${Math.min(12, pool.length + allPlaced.length > 0 ? 12 : 0)} (g1..g${Math.min(12, Math.max(1, pool.length))}.jpg)`);
  console.log('\nTagad palaid:  npm run build\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
