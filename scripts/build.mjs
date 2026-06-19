// Hotel Mergera — static site build
// Reads templates from src/pages and partials from src/templates,
// merges with i18n JSON, writes one HTML file per (lang, page) into dist/.

import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

const SITE_URL = process.env.SITE_URL || 'https://mergera.lv';

// Page slug map per language. Source page filename → URL segment per language.
// Keep slugs SEO-friendly in each language. Used for routing + sitemap + hreflang.
const PAGES = [
  { src: 'index',        slugs: { lv: '',                en: '',           ru: '',                lt: '',                  et: '' },                 dataKey: 'home' },
  { src: 'naktsmitnes',  slugs: { lv: 'naktsmitnes',     en: 'stay',       ru: 'razmeshchenie',   lt: 'apgyvendinimas',    et: 'majutus' },          dataKey: 'accommodation' },
  { src: 'bala',         slugs: { lv: 'naktsmitnes/bala',en: 'stay/hot-tub', ru: 'razmeshchenie/kupel', lt: 'apgyvendinimas/karsta-vonia', et: 'majutus/tunn' }, dataKey: 'bala' },
  { src: 'pirts',        slugs: { lv: 'naktsmitnes/pirts',en: 'stay/sauna', ru: 'razmeshchenie/banya', lt: 'apgyvendinimas/pirtis', et: 'majutus/saun' }, dataKey: 'pirts' },
  { src: 'pasakumi',     slugs: { lv: 'naktsmitnes/pasakumi', en: 'stay/events', ru: 'razmeshchenie/meropriyatiya', lt: 'apgyvendinimas/renginiai', et: 'majutus/uritused' }, dataKey: 'events' },
  { src: 'galerija',     slugs: { lv: 'galerija',        en: 'gallery',    ru: 'galereya',        lt: 'galerija',          et: 'galerii' },          dataKey: 'gallery' },
  { src: 'par-mums',     slugs: { lv: 'par-mums',        en: 'about',      ru: 'o-nas',           lt: 'apie-mus',          et: 'meist' },            dataKey: 'about' },
  { src: 'kontakti',     slugs: { lv: 'kontakti',        en: 'contact',    ru: 'kontakty',        lt: 'kontaktai',         et: 'kontakt' },          dataKey: 'contacts' },
  { src: 'rezervacija',  slugs: { lv: 'rezervacija',     en: 'book',       ru: 'bronirovanie',    lt: 'rezervacija',       et: 'broneerimine' },     dataKey: 'reservation' }
];

const LANGS = ['lv', 'en', 'ru', 'lt', 'et'];
const DEFAULT_LANG = 'lv';

// ---------- Helpers ----------

const get = (obj, dotted) => dotted.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

async function loadLocales() {
  const out = {};
  for (const lang of LANGS) {
    const file = path.join(SRC, 'i18n', `${lang}.json`);
    out[lang] = JSON.parse(await readFile(file, 'utf8'));
  }
  return out;
}

async function loadPartials() {
  const out = {};
  const dir = path.join(SRC, 'templates');
  for (const f of await readdir(dir)) {
    if (!f.startsWith('_') || !f.endsWith('.html')) continue;
    const name = f.replace(/^_/, '').replace(/\.html$/, '');
    out[name] = await readFile(path.join(dir, f), 'utf8');
  }
  return out;
}

// ---------- Render engine ----------

// Render {{#each path}}...{{/each}} blocks with depth-aware matching so nested
// each-blocks (e.g. {{#each home.rooms.items}}…{{#each this.features}}…{{/each}}…{{/each}})
// pair correctly.
function findMatchingEachClose(s, startIdx) {
  const OPEN = '{{#each ';
  const CLOSE = '{{/each}}';
  let depth = 1;
  let i = s.indexOf('}}', startIdx) + 2;
  while (i < s.length) {
    const nextOpen = s.indexOf(OPEN, i);
    const nextClose = s.indexOf(CLOSE, i);
    if (nextClose < 0) return -1;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth++;
      i = s.indexOf('}}', nextOpen) + 2;
    } else {
      depth--;
      if (depth === 0) return nextClose;
      i = nextClose + CLOSE.length;
    }
  }
  return -1;
}

function renderEach(template, ctx, itemStack = []) {
  const OPEN = '{{#each ';
  const CLOSE = '{{/each}}';
  let out = '';
  let i = 0;
  while (i < template.length) {
    const start = template.indexOf(OPEN, i);
    if (start < 0) { out += template.slice(i); break; }
    out += template.slice(i, start);
    const openEnd = template.indexOf('}}', start);
    const dotted = template.slice(start + OPEN.length, openEnd).trim();
    const close = findMatchingEachClose(template, start);
    if (close < 0) { out += template.slice(start); break; }
    const innerBlock = template.slice(openEnd + 2, close);

    let arr;
    if (dotted.startsWith('this.')) {
      arr = get(itemStack[itemStack.length - 1], dotted.slice(5));
    } else if (dotted === 'this') {
      arr = itemStack[itemStack.length - 1];
    } else {
      arr = get(ctx, dotted);
    }

    if (Array.isArray(arr)) {
      out += arr.map((item) => {
        let block = renderEach(innerBlock, ctx, [...itemStack, item]);
        block = block.replace(/\{\{this\.([\w.]+)\}\}/g, (_m, p) => escapeHtml(get(item, p) ?? ''));
        block = block.replace(/\{\{this\}\}/g, () => escapeHtml(item ?? ''));
        block = block.replace(/\{\{\.\.\/([\w.]+)\}\}/g, (_m, p) => escapeHtml(get(ctx, p) ?? ''));
        return block;
      }).join('');
    }
    i = close + CLOSE.length;
  }
  return out;
}

function renderVars(template, ctx) {
  // Triple braces = raw (no HTML escape). Used for pre-built HTML fragments
  // like hreflangTags and langSwitcher.
  let out = template.replace(/\{\{\{([\w.]+)\}\}\}/g, (_, dotted) => {
    const v = get(ctx, dotted);
    return v == null ? '' : String(v);
  });
  out = out.replace(/\{\{([\w.]+)\}\}/g, (_, dotted) => {
    const v = get(ctx, dotted);
    return v == null ? '' : escapeHtml(v);
  });
  return out;
}

function renderPartials(template, partials) {
  return template.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => partials[name] ?? '');
}

function render(template, ctx, partials) {
  // 1. Inline partials first (they may contain placeholders).
  let out = renderPartials(template, partials);
  // 2. Apply each-loops.
  out = renderEach(out, ctx);
  // 3. Substitute scalar placeholders.
  out = renderVars(out, ctx);
  return out;
}

// ---------- Build per-page context ----------

function urlFor(lang, page) {
  const slug = page.slugs[lang] ?? page.slugs[DEFAULT_LANG];
  return slug ? `/${lang}/${slug}/` : `/${lang}/`;
}

function buildHreflang(page) {
  const tags = LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE_URL}${urlFor(l, page)}" />`);
  tags.push(`<link rel="alternate" hreflang="x-default" href="${SITE_URL}${urlFor(DEFAULT_LANG, page)}" />`);
  return tags.join('\n');
}

// Inline pills — used in mobile menu and footer.
function buildLangList(lang, page) {
  return LANGS.map((l) => {
    const active = l === lang ? ' is-active' : '';
    return `<a href="${urlFor(l, page)}" class="lang-pill${active}" hreflang="${l}" aria-label="${l}">${l.toUpperCase()}</a>`;
  }).join('');
}

// Modern dropdown — used in the desktop header. Shows a globe + current language
// code; the menu lists every language by its native name.
function buildLangDropdown(lang, page, locales) {
  const options = LANGS.map((l) => {
    const name = locales[l]?.meta?.name ?? l;
    const active = l === lang;
    return `<a href="${urlFor(l, page)}" hreflang="${l}" role="menuitem"
      class="lang-option flex items-center justify-between gap-4 px-4 py-2.5 text-sm ${active ? 'text-accent-hover font-semibold bg-accent-soft/40' : 'text-ink hover:bg-bg'}">
      <span>${escapeHtml(name)}</span><span class="text-xs tracking-wideish text-ink-subtle">${l.toUpperCase()}</span></a>`;
  }).join('');
  return `<div class="relative" data-lang-dropdown>
    <button type="button" data-lang-button aria-haspopup="true" aria-expanded="false" aria-label="Language"
      class="flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm font-medium text-ink hover:border-accent transition-colors min-h-[40px] cursor-pointer">
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18"/></svg>
      <span>${lang.toUpperCase()}</span>
      <svg class="w-3.5 h-3.5 transition-transform duration-200" data-lang-chevron viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
    </button>
    <div data-lang-menu role="menu" class="absolute right-0 mt-2 w-48 rounded-xl border border-line bg-white shadow-nav py-1 hidden z-50 overflow-hidden">${options}</div>
  </div>`;
}

function buildCtx({ lang, locales, page }) {
  const data = locales[lang];
  const url = urlFor(lang, page);
  return {
    ...data,
    lang,
    year: new Date().getFullYear(),
    baseUrl: SITE_URL,
    canonical: SITE_URL + url,
    ogLocale: data.meta?.ogLocale ?? lang,
    hreflangTags: buildHreflang(page),
    langDropdown: buildLangDropdown(lang, page, locales),
    langList: buildLangList(lang, page),
    page: {
      title: get(data, `${page.dataKey}.title`) ?? data.brand.name,
      description: get(data, `${page.dataKey}.description`) ?? data.brand.tagline
    }
  };
}

// ---------- Sitemap ----------

function buildSitemap() {
  const urls = [];
  for (const lang of LANGS) {
    for (const page of PAGES) {
      const loc = SITE_URL + urlFor(lang, page);
      const alternates = LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE_URL + urlFor(l, page)}" />`).join('\n');
      urls.push(
`  <url>
    <loc>${loc}</loc>
${alternates}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL + urlFor(DEFAULT_LANG, page)}" />
    <changefreq>monthly</changefreq>
    <priority>${page.src === 'index' ? '1.0' : '0.8'}</priority>
  </url>`
      );
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

function buildRobots() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

function buildRootIndex() {
  // Redirect / to the default language with a small client-side language detection fallback.
  return `<!DOCTYPE html>
<html lang="${DEFAULT_LANG}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Hotel Mergera — Mērsrags, Latvija</title>
<meta http-equiv="refresh" content="0; url=/${DEFAULT_LANG}/" />
<link rel="canonical" href="${SITE_URL}/${DEFAULT_LANG}/" />
<script>
(function(){
  try {
    var saved = localStorage.getItem('mergera-lang');
    var supported = ${JSON.stringify(LANGS)};
    var lang = saved && supported.indexOf(saved) >= 0 ? saved
             : (navigator.language || '${DEFAULT_LANG}').slice(0,2).toLowerCase();
    if (supported.indexOf(lang) < 0) lang = '${DEFAULT_LANG}';
    location.replace('/' + lang + '/');
  } catch (e) {
    location.replace('/${DEFAULT_LANG}/');
  }
})();
</script>
</head>
<body>
<p>Pārvirzīšana uz <a href="/${DEFAULT_LANG}/">/${DEFAULT_LANG}/</a></p>
</body>
</html>
`;
}

// ---------- Main ----------

async function ensureDir(p) {
  if (!existsSync(p)) await mkdir(p, { recursive: true });
}

async function main() {
  await ensureDir(DIST);

  const [locales, partials] = await Promise.all([loadLocales(), loadPartials()]);

  // Render each page in each language.
  for (const page of PAGES) {
    const tplPath = path.join(SRC, 'pages', `${page.src}.html`);
    const tpl = await readFile(tplPath, 'utf8');

    for (const lang of LANGS) {
      const ctx = buildCtx({ lang, locales, page });
      const html = render(tpl, ctx, partials);
      const slug = page.slugs[lang] ?? '';
      const outDir = slug ? path.join(DIST, lang, slug) : path.join(DIST, lang);
      await ensureDir(outDir);
      await writeFile(path.join(outDir, 'index.html'), html, 'utf8');
    }
  }

  // Sitemap, robots, root redirect.
  await writeFile(path.join(DIST, 'sitemap.xml'), buildSitemap(), 'utf8');
  await writeFile(path.join(DIST, 'robots.txt'), buildRobots(), 'utf8');
  await writeFile(path.join(DIST, 'index.html'), buildRootIndex(), 'utf8');

  console.log(`✓ Built ${PAGES.length} pages × ${LANGS.length} languages = ${PAGES.length * LANGS.length} files`);
  console.log(`✓ sitemap.xml, robots.txt, root index written`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
