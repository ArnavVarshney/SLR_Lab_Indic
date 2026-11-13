# SLR_Lab_Indic

Python backend and dashboard for a PhD project on Indic language literacy at SLR Lab, HKU.
This branch covers Kannada.

## Kannada akshara statistics

`kn_analysis.py` computes akshara-level statistics from `final Kannada corpus - cleaned.txt`.
It writes JSON tables to `dashboard/public/data/` and checks them for internal consistency
(TPs sum to 1, totals agree across tables).

```bash
uv venv .venv && uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python kn_analysis.py      # regenerate dashboard/public/data/*.json
.venv/bin/python -m pytest tests     # syllabifier / akshara feature tests
```

| File            | Contents                                                              |
| --------------- | --------------------------------------------------------------------- |
| `summary.json`  | totals and distributions                                              |
| `aksharas.json` | akshara inventory: structure, skeleton, frequency, position, next-akshara entropy |
| `bigrams.json`  | within-word bigrams: forward/backward TP, PMI (token and type weighted) |
| `trigrams.json` | within-word trigrams: P(C \| A,B)                                      |
| `words.json`    | word types: frequency, length, complexity, TP, neighbourhood size     |
| `meta.json`     | provenance: corpus, thresholds, commit, timestamp                     |

Definitions are on the dashboard's Methods page.

## Dashboard

A Next.js app in `dashboard/` with no server-side code: every route is prerendered and
the data is served from `public/data`.

```bash
cd dashboard
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm test             # unit tests (matching, CSV, stats)
```

`meta.json` records the commit the data was generated from. To get a clean stamp, commit first,
then re-run `kn_analysis.py` and commit the regenerated `meta.json`.

## History

The original scripts (`kannada.py`, `transition.py`), their spreadsheet outputs (`mapped/`) and
`Old Corpus/` have been removed in favour of `kn_analysis.py` and the dashboard. They remain on the
`kannada` branch. Note: in the old `mapped/first_order_kn.xlsx`, the column labelled `CV1 | CV2` holds P(CV2 | CV1).
