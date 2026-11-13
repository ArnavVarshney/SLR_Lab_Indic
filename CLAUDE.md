# CLAUDE.md

Kannada akshara statistics for a PhD project on literacy and SEN children (SLR Lab, HKU).
A Python pipeline computes the statistics, and a static Next.js dashboard presents them.

## Branches
- `kannada-dashboard`: this work (pipeline + dashboard). Vercel deploys it with Root Directory `dashboard`.
- `kannada`: the legacy scripts (`kannada.py`, `transition.py`, `mapped/`, `Old Corpus/`).
- `transition`: the default branch (Hindi). It has no dashboard.

## Commands
```bash
.venv/bin/python kn_analysis.py          # from repo root: regenerate dashboard/public/data/*.json, then self-verify
.venv/bin/python -m pytest tests         # syllabifier / akshara features
cd dashboard && npm run dev|build|typecheck|lint|test
```
Setup: `uv venv .venv && uv pip install --python .venv/bin/python -r requirements.txt`; `npm install` in `dashboard/`.

## Architecture
- `kn_analysis.py` does all statistics. Its `verify()` checks that TPs sum to 1, that totals agree, and that skeleton + vowel + coda recomposes each akshara.
  It writes columnar JSON (`{columns, rows}`) with floats at 5 significant digits.
- `dashboard/` reads `summary.json` at build time (`@data/*` alias). The large tables are fetched client-side and cached by `lib/data.ts`.
  The dashboard only filters, sorts, groups (`lib/composition.ts`) and matches (`lib/matching.ts`).
- Pages: Overview, Aksharas, Composition, Transitions, Segmentation, Words, Methods, About. Every route is static.
- Global settings in the sidebar:
  - weighting: token (exposure) or type. For composition, type = word types containing the akshara.
  - min. count: the TP reliability threshold, default `MIN_DENOM = 10`.

## Domain conventions
- Akshara = (C+virama)* C | V, plus a vowel sign and anusvara/visarga. Text is NFC.
  - Coda consonants go to the next akshara (ಅ|ಮ್ಮ).
  - Anusvara stays on the previous one (ಎಂ|ದು).
  - ZWNJ after a virama is an akshara break.
- `#` is the word boundary in bigrams and trigrams. Transitions stay within words, except on Segmentation.
- Composition: skeleton = consonant cluster. Vowel = ಅ (inherent), a vowel sign, or ◌್ (dead consonant).
  - Malformed aksharas (doubled or conflicting signs) have `well_formed = false` and are excluded.
- No p-values: running-text transitions are pseudo-replicated, so report effect sizes (AUC, SMD).

## Next.js 16
- Read `dashboard/AGENTS.md` and `node_modules/next/dist/docs/` before writing Next code. APIs differ from older versions.
- `cacheComponents` is on, and `useSearchParams` needs a `<Suspense>` boundary.
- `typecheck` runs `next typegen` first, because route types live in `.next/`.

## Style
- UI copy should be concise and academic, with no long paragraphs or poetic titles. Use bullets on About.
- Keep tests light: a few essential cases only.
- Charts use ECharts through `components/EChart.tsx` (`base`/`axis`/`legend`) and theme tokens from `lib/theme.ts`. Keep light and dark parity.

## Git
- Commit as `Arnav Varshney <varshney.arnav@gmail.com>`. Never add Co-Authored-By or AI trailers.
- Commit or push only when asked.
- `meta.json` stamps the commit the data came from. For a clean stamp, commit first, then re-run `kn_analysis.py` and commit `meta.json`.
