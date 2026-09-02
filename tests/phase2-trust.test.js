// Phase 2 — trust chips: best source grade + verification freshness.
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../tools/trust.js");

const sourceById = {
  likud: { grade: "A" },
  ynet: { grade: "C" },
  shakuf: { grade: "B" },
  op: { grade: "D" },
};

test("reliabilityClass maps grades to confidence classes", () => {
  assert.equal(T.reliabilityClass("A"), "high");
  assert.equal(T.reliabilityClass("B"), "medium");
  assert.equal(T.reliabilityClass("C"), "low");
  assert.equal(T.reliabilityClass("E"), "watch");
  assert.equal(T.reliabilityClass(undefined), "watch");
});

test("bestGrade returns the strongest available source grade", () => {
  assert.equal(T.bestGrade(["ynet", "likud", "shakuf"], sourceById), "A");
  assert.equal(T.bestGrade(["ynet", "shakuf"], sourceById), "B");
  assert.equal(T.bestGrade(["op"], sourceById), "D");
});

test("bestGrade ignores unknown ids and returns null when none resolve", () => {
  assert.equal(T.bestGrade(["nope", "missing"], sourceById), null);
  assert.equal(T.bestGrade([], sourceById), null);
});

test("parseHebrewDate handles dd.m.yyyy and ISO", () => {
  const d = T.parseHebrewDate("5.8.2026");
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 7); // August
  assert.equal(d.getDate(), 5);
  assert.ok(T.parseHebrewDate("2026-08-05") instanceof Date);
  assert.equal(T.parseHebrewDate("garbage"), null);
});

test("freshness classifies by age against a reference date", () => {
  const now = new Date(2026, 7, 31); // 31 Aug 2026
  assert.equal(T.freshness("30.8.2026", now).level, "fresh");
  assert.equal(T.freshness("1.8.2026", now).level, "aging");
  assert.equal(T.freshness("1.1.2026", now).level, "stale");
  assert.equal(T.freshness(null, now).level, "unknown");
});

test("trustChipHtml renders grade, verified date and semantic classes", () => {
  const now = new Date(2026, 7, 31);
  const html = T.trustChipHtml({ grade: "A", gradeLabel: "מקור רשמי", verifiedAt: "5.8.2026", now });
  assert.match(html, /trust-high/);
  assert.match(html, /fresh-aging/);
  assert.match(html, /trust-grade">A</);
  assert.match(html, /נבדק 5\.8\.2026/);
});

test("trustChipHtml degrades gracefully with no source", () => {
  const html = T.trustChipHtml({ grade: null, verifiedAt: null });
  assert.match(html, /trust-watch/);
  assert.match(html, /trust-grade">—</);
  assert.match(html, /טרם אומת/);
});
