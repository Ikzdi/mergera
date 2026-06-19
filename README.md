# Hotel Mergera — mājaslapa

Statiska 5 valodu mājaslapa Mērsraga viesu namam **Hotel Mergera**.
Tīrs HTML + Tailwind CSS + neliels Node build skripts; nav datu bāzes, nav backend.

## Tehnoloģijas

- **HTML5** — semantiski tagi, pieejamība, SEO
- **Tailwind CSS** — krāsu palete, fonti, izmēri
- **Node 18+** — build skripts (`scripts/build.mjs`) ģenerē 40 HTML failus (8 lapas × 5 valodas)
- **Vanilla JS** — mobilā izvēlne, galerijas filtri, lightbox
- **Google Fonts** — Cormorant Garamond (virsraksti) + Inter (pamatteksts)

## Mapju struktūra

```
src/
├── pages/         # 8 lapas (sākums, naktsmītnes, baļa, pirts, galerija, par mums, kontakti, rezervācija)
├── templates/     # _head, _header, _footer, _room-card, _section-heading partials
├── i18n/          # lv.json, en.json, ru.json, lt.json, et.json
├── styles/        # input.css (Tailwind direktīvas + custom)
└── js/            # main.js (interaktivitāte)

scripts/
├── build.mjs       # render templates × i18n → dist/<lang>/<slug>/index.html
└── copy-assets.mjs # kopē public/ + ģenerē placeholder bildes

public/             # statiski faili (favicon, og-cover, reālās bildes kad būs)
dist/               # gala statiskais output — šeit deploy
```

## Palaišana

```bash
npm install
npm run build      # ģenerē dist/
npm run serve      # palaiž dist/ uz http://localhost:4321
npm run dev        # build + serve vienlaicīgi
```

Atvērt: <http://localhost:4321/lv/>

## Valodas

Atbalstītās: **LV** (noklusētā), **EN**, **RU**, **LT**, **ET**. URL ceļš katrai valodai ir tulkots SEO labad (`/lv/naktsmitnes/`, `/en/stay/`, `/ru/razmeshchenie/` u.t.t.). `hreflang` automātiski ģenerēts katrā lapā un `sitemap.xml`.

Lai pievienotu jaunu valodu — pievieno `src/i18n/<code>.json` un `<code>` masīvā `LANGS` failā `scripts/build.mjs` un definē URL slugu katrai lapai.

## Satura rediģēšana

Visi teksti dzīvo `src/i18n/<lang>.json`. Maini tos un palaid `npm run build`.

## Bildes

Šobrīd `dist/images/` satur SVG placeholder bildes. Lai pievienotu īstos foto:
1. Saglabā `public/images/<kategorija>/<nosaukums>.jpg` (oriģinālos failos JPG/WebP).
2. Palaid `npm run build`.

Vēlams: WebP formātā ar atbilstošu srcset, lai sasniegtu Lighthouse Performance ≥ 90.

## Rezervāciju logrīks

Lapa `/lv/rezervacija/` (un citu valodu ekvivalenti) satur placeholder `<div id="booking-engine">`. Kad būs trešās puses booking engine piegādātājs, ielīmē tā `<script>` failā `src/templates/_head.html` un widget HTML lapā `src/pages/rezervacija.html`, tad palaid `npm run build`.

## SEO

- Katrā lapā: viens `<h1>`, semantiska h2/h3 hierarhija, `<meta description>`, OG/Twitter tags, canonical URL.
- `hreflang` saites uz visām 5 valodām + `x-default`.
- `LodgingBusiness` Schema.org JSON-LD ar adresi, koordinātēm, telefonu un ērtībām.
- `sitemap.xml` ar visiem 40 URL un alternatīvajām valodām.
- `robots.txt` ar `Sitemap:` ierakstu.

Pirms deploy uz produkciju nomaini `SITE_URL` (skat. zemāk).

## Deploy

Iznes `dist/` mapi uz jebkuru statisku hostingu — Netlify, Cloudflare Pages, Vercel, GitHub Pages, parastais HTTP hostings.

Pirms deploy uz reālo domēnu ar pareiziem URL-iem:
```bash
SITE_URL=https://mergera.lv npm run build
```

Vai uz Windows PowerShell:
```powershell
$env:SITE_URL = "https://mergera.lv"; npm run build
```

## Dizaina sistēma

Krāsas, fonti un komponenti definēti `tailwind.config.js` + `src/styles/input.css`:

| Token | Vērtība |
|---|---|
| `bg` | `#FAFAF7` (silts off-white) |
| `bg-dark` | `#1F2937` (grafīts) |
| `ink` | `#111827` (galvenais teksts) |
| `ink-muted` | `#475569` (sekundārais teksts) |
| `accent` | `#D4A24C` (silts dzintara dzeltens) |
| `accent-hover` | `#B8862E` |
| `font-serif` | Cormorant Garamond — virsraksti |
| `font-sans` | Inter — pamatteksts |

Komponenti: `.btn-primary`, `.btn-ghost`, `.card`, `.nav-floating`, `.eyebrow`, `.gold-rule`.

## Licence

© Hotel Mergera. Visas tiesības aizsargātas.
