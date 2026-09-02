// Poll fetcher — refreshes the seat projections behind the מנדטים list and the
// coalition view with a real, MULTI-HOUSE average (a single pollster is biased).
//
// Source: the israel-polls-2026 tracker, which aggregates every published 2026
// Knesset poll into one dated database (window.DATA) with stable per-party
// lineage ids, blocs, and below-threshold flags. We take a trailing N-day window
// (default 7) and average each party across ALL polls in it, from every house.
//
// Dry-run by default (proposes old→new); writes only with --write. Polls are
// graded C — never stand alone (research-methodology.md). Pure functions
// (extractWindowData/aggregateWindow) are unit-tested; only fetch* hits network.
const fs = require("fs");
const path = require("path");

const TRACKER_URL = "https://israel-polls-2026.pages.dev/";
const POLL_SOURCE_ID = "israel-polls-tracker";

// Tracker lineage id -> our Hebrew party key. Small/niche lineages with no
// equivalent in our set (amcha_israel, erdan_edelstein, reservists, balad,
// joint_list, kahlon) are intentionally omitted and left unchanged.
const LINEAGE_MAP = {
  likud: "הליכוד",
  yashar: "ישר! עם איזנקוט",
  bennett_lapid: "ביחד",
  democrats: "הדמוקרטים / העבודה-מרצ",
  beiteinu: "ישראל ביתנו",
  shas: "ש״ס",
  otzma: "עוצמה יהודית",
  utj: "יהדות התורה / דגל התורה ואגודת ישראל",
  hadash_taal: "חד״ש / תע״ל",
  raam: "רע״מ",
  relzion: "הציונות הדתית",
  blue_white: "כחול לבן / המחנה הממלכתי",
};

// --- pure ------------------------------------------------------------------
// Pull the `window.DATA = [ ... ]` array out of the tracker page (string-aware
// bracket matcher so quoted brackets don't fool it).
function extractWindowData(html) {
  const marker = html.indexOf("window.DATA");
  if (marker === -1) throw new Error("window.DATA not found");
  const start = html.indexOf("[", marker);
  let depth = 0;
  let str = null;
  for (let i = start; i < html.length; i += 1) {
    const c = html[i];
    if (str) {
      if (c === "\\") { i += 1; continue; }
      if (c === str) str = null;
      continue;
    }
    if (c === '"') str = '"';
    else if (c === "[") depth += 1;
    else if (c === "]") {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(start, i + 1));
    }
  }
  throw new Error("window.DATA array not terminated");
}

// Average each party's seats across every real poll in the trailing N-day window.
function aggregateWindow(rows, days = 7) {
  const real = rows.filter(
    (r) => r.scenario === false && typeof r.seats === "number" && r.publication_date,
  );
  const dates = real.map((r) => r.publication_date).sort();
  const newest = dates[dates.length - 1] || null;
  if (!newest) return { parties: {}, polls: 0, houses: [], newest: null, cutoff: null };

  const cutoff = new Date(Date.parse(newest) - days * 86400000).toISOString().slice(0, 10);
  const win = real.filter((r) => r.publication_date > cutoff);
  const pollIds = [...new Set(win.map((r) => r.poll_id))];
  const houses = [...new Set(win.map((r) => r.pollster))];

  const acc = {};
  win.forEach((r) => {
    const a = acc[r.lineage_id] || (acc[r.lineage_id] = { sum: 0, n: 0, he: r.party_he });
    a.sum += r.seats;
    a.n += 1;
  });
  const parties = {};
  Object.entries(acc).forEach(([lineage, v]) => {
    parties[lineage] = { avg: Math.round((v.sum / v.n) * 10) / 10, polls: v.n, he: v.he };
  });
  return { parties, polls: pollIds.length, houses, newest, cutoff };
}

// --- impure ----------------------------------------------------------------
async function fetchTrackerRows() {
  const res = await fetch(TRACKER_URL, { headers: { "User-Agent": "elaction-dev/0.1 (voter guide)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return extractWindowData(await res.text());
}

async function main() {
  const daysArg = process.argv.indexOf("--days");
  const days = daysArg >= 0 ? Number(process.argv[daysArg + 1]) : 7;
  const write = process.argv.includes("--write");

  const rows = await fetchTrackerRows();
  const { parties, polls, houses, newest, cutoff } = aggregateWindow(rows, days);

  const dataPath = path.resolve(process.cwd(), "data", "election-research.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  const proposals = [];
  for (const [lineage, agg] of Object.entries(parties)) {
    const heName = LINEAGE_MAP[lineage];
    if (!heName) continue;
    const poll = data.polls.find((p) => p.party === heName);
    if (!poll) continue;
    proposals.push({ party: heName, from: poll.mandates, to: agg.avg, polls: agg.polls });
  }

  console.log(`israel-polls tracker — ${polls} polls in the last ${days} days (${cutoff} → ${newest})`);
  console.log(`houses: ${houses.join(", ")}\n`);
  console.log("party".padEnd(38), "old →  new  (n)");
  proposals
    .sort((a, b) => b.to - a.to)
    .forEach((p) => console.log(`${p.party.padEnd(38)} ${String(p.from).padStart(4)} → ${String(p.to).padStart(4)}  (${p.polls})`));

  const mappedLineages = new Set(Object.keys(LINEAGE_MAP));
  const skipped = Object.keys(parties).filter((l) => !mappedLineages.has(l));
  if (skipped.length) console.log(`\nℹ tracker lineages with no equivalent in our set (unchanged): ${skipped.join(", ")}`);
  const untouched = data.polls.filter((p) => !proposals.some((x) => x.party === p.party)).map((p) => p.party);
  if (untouched.length) console.log(`ℹ our parties not covered by the tracker (unchanged): ${untouched.join(", ")}`);

  if (!write) {
    console.log("\nDRY RUN — nothing written. Re-run with --write to apply.");
    return;
  }

  proposals.forEach((p) => {
    const poll = data.polls.find((x) => x.party === p.party);
    poll.mandates = p.to;
    poll.display = String(p.to);
    poll.sourceIds = [...new Set([...(poll.sourceIds || []), POLL_SOURCE_ID])];
  });

  const allSources = [...(data.sources || []), ...(data.enrichedSources || [])];
  if (!allSources.some((s) => s.id === POLL_SOURCE_ID)) {
    data.sources.push({
      id: POLL_SOURCE_ID,
      title: "Israel Polls 2026 — מאגר סקרים מצרפי",
      url: TRACKER_URL,
      grade: "C",
      type: "ממוצע סקרים",
      note: "ממוצע כל הסקרים שפורסמו בחלון הזמן, מכל בתי הסקרים. אינו מקור רשמי; מסומן C ולא עומד לבד.",
    });
  }
  data.meta = data.meta || {};
  data.meta.pollsUpdatedAt = newest;
  data.meta.pollsWindow = { days, polls, houses };

  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`\n✓ wrote ${proposals.length} poll updates from ${polls} polls (${houses.length} houses). pollsUpdatedAt=${newest}.`);
  console.log("Run `npm run research:validate` before committing.");
}

module.exports = { extractWindowData, aggregateWindow, LINEAGE_MAP, TRACKER_URL };

if (require.main === module) {
  main().catch((err) => {
    console.error("fetch-polls failed:", err.message);
    process.exit(1);
  });
}
