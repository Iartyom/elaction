// Poll fetcher — multi-house aggregation from the tracker's window.DATA (offline).
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../tools/fetch-polls.js");

// A tiny page in the tracker's shape: 3 polls (2 real, 1 scenario), 2 parties.
const rowsData = [
  { poll_id: "a", pollster: "Midgam", publication_date: "2026-09-02", scenario: false, lineage_id: "likud", party_he: "הליכוד", seats: 26 },
  { poll_id: "a", pollster: "Midgam", publication_date: "2026-09-02", scenario: false, lineage_id: "shas", party_he: "ש״ס", seats: 8 },
  { poll_id: "b", pollster: "Lazar", publication_date: "2026-08-30", scenario: false, lineage_id: "likud", party_he: "הליכוד", seats: 24 },
  { poll_id: "b", pollster: "Lazar", publication_date: "2026-08-30", scenario: false, lineage_id: "shas", party_he: "ש״ס", seats: 7 },
  { poll_id: "c", pollster: "OldHouse", publication_date: "2026-07-01", scenario: false, lineage_id: "likud", party_he: "הליכוד", seats: 30 }, // outside 7d
  { poll_id: "d", pollster: "Scenario", publication_date: "2026-09-01", scenario: true, lineage_id: "likud", party_he: "הליכוד", seats: 99 }, // hypothetical
];
const HTML = `<html><script>window.DATA = ${JSON.stringify(rowsData)};</script></html>`;

test("extractWindowData pulls the embedded array out of the page", () => {
  const rows = P.extractWindowData(HTML);
  assert.equal(rows.length, 6);
  assert.equal(rows[0].lineage_id, "likud");
});

test("aggregateWindow averages each party across real polls in the window", () => {
  const { parties, polls, houses, newest } = P.aggregateWindow(P.extractWindowData(HTML), 7);
  assert.equal(polls, 2); // only the 2 real polls inside 7 days
  assert.equal(newest, "2026-09-02");
  assert.deepEqual(houses.sort(), ["Lazar", "Midgam"]);
  assert.equal(parties.likud.avg, 25); // (26+24)/2 — the 30 and 99 excluded
  assert.equal(parties.likud.polls, 2);
  assert.equal(parties.shas.avg, 7.5); // (8+7)/2
});

test("aggregateWindow excludes scenario rows and out-of-window polls", () => {
  const { parties } = P.aggregateWindow(P.extractWindowData(HTML), 7);
  // 99 (scenario) and 30 (July) must not affect the average
  assert.ok(parties.likud.avg < 26);
});

test("a wider window pulls in older polls", () => {
  const { polls } = P.aggregateWindow(P.extractWindowData(HTML), 120);
  assert.equal(polls, 3); // now the July poll is included
});

test("LINEAGE_MAP maps tracker ids to our party keys", () => {
  assert.equal(P.LINEAGE_MAP.likud, "הליכוד");
  assert.equal(P.LINEAGE_MAP.hadash_taal, "חד״ש / תע״ל");
  assert.equal(P.LINEAGE_MAP.yashar, "ישר! עם איזנקוט");
});
