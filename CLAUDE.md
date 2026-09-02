# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"אלקשן" (Elaction) is a zero-build, single-page Hebrew (RTL) voter guide for an
upcoming Israeli election (the 26th Knesset). It compares parties by platform,
Knesset record, pledges (promise vs. execution), disinformation checks, and
source reliability, and includes a guided "compass" questionnaire that matches a
voter to parties.

It ships as a static site (`index.html` + `styles.css` + `app.js` + `tools/*.js`),
**but it must be served over http** — it fetches its data at runtime, so opening
`index.html` via `file://` will not work. Use `npm run serve`.

The editorial rules that govern the data — source reliability grading (A–E),
pledge-status rules (<he>קויים / חלקי / פתוח / לא קויים</he>), what counts as a
running list, poll handling — live in `research-methodology.md`. The code and the
data encode those rules; keep them in sync.

## Commands (run from repo root)

```bash
npm run serve             # static dev server on http://localhost:4173 (dependency-free)
npm test                  # node --test — the full unit suite (tools/*, engines)
npm run check             # syntax-check app.js
npm run research:validate # referential integrity of the dataset (ids, party refs, dupes)
npm run research:summary  # print a dataset summary; append a query to search
npm run data:build        # fetch fresh Knesset data → data/knesset/*.json (needs network)
npm run data:update       # re-fetch + diff vs committed data + write CHANGES.md
```

No bundler, no dependencies (`package.json` has none by design). Tests use Node's
built-in `node:test`, so `npm test` runs with no install. CI runs check +
validate + test on every push (`.github/workflows/ci.yml`).

## Architecture — the data flow

The pipeline points **forward**: data is the source, the app reads it.

```
data/election-research.json   ← single source of truth (hand-edited)
        │  fetch() at startup
        ▼
app.js  applyResearchData() hydrates the (initially empty) constants → renderAll()
```

`app.js` declares its content constants **empty** (`const parties = [];`, etc.)
and fills them at load time from `data/election-research.json` via `initApp()` →
`loadResearchData()` → `applyResearchData()` → `renderAll()`. To change content,
**edit the JSON**, not `app.js`. (Historically the reverse was true — a tool
scraped the data out of `app.js`; that tool is gone. Don't reintroduce it.)

`app.js` is otherwise plain DOM rendering — one `render*()` per `index.html`
section, wired to filter controls by id, orchestrated by `renderAll()`.

### Pure logic lives in testable UMD modules (`tools/`)

These attach to a `window.*` global in the browser and `module.exports` in Node,
so they run in the page **and** in `node:test` with no DOM:

- `tools/trust.js` (`window.ElactionTrust`) — the trust layer: a claim's best
  source grade + verification freshness → the "verified · grade" chips.
- `tools/compass.js` (`window.ElactionCompass`) — the compass engine: computes a
  weighted, auditable party match from the questionnaire, plus `encodeAnswers` /
  `decodeAnswers` for shareable `#compass=` result links.

Load order in `index.html` matters: `trust.js` and `compass.js` come **before**
`app.js`, which references their globals.

### Data spine + automation (`tools/`)

- `tools/fetch-knesset.js` — pulls real records from the official Knesset OData v4
  API (`knesset.gov.il/Odata/ParliamentInfo.svc/`) and normalizes them with
  provenance (source url + `fetchedAt`) into `data/knesset/*.json`. The
  `normalize*` functions are pure and unit-tested; only `main()` hits the network.
- `tools/daily-update.js` — re-fetches, diffs against the committed data, writes
  `data/knesset/CHANGES.md`. Its `diffRecords`/`summarizeDiff` are pure/tested.
  `.github/workflows/daily-update.yml` runs it on a cron and opens a **PR** on
  change — automation proposes, a human reviews and merges.
- `tools/validate-research.js` — exports `validate(data)`; run by the CLI and the
  Phase 0 tests.

## Conventions

- All UI text is Hebrew, the document is `dir="rtl"` — preserve both.
- Vanilla ES, no modules/build for `app.js`; shared logic goes in a `tools/*.js`
  UMD module so it can be unit-tested (that's the pattern to follow for new logic).
- Every factual claim references `sources` by `id`; parties are keyed by their
  Hebrew `name` string (the join key across `matches`, `pledgeChecks`, `polls`) —
  renaming a party means updating every reference. `research:validate` enforces this.
- When adding rendered facts, attach a trust chip via `trustChipFor(record)`.
