// Coalition/bloc math — camps, threshold, and who reaches 61.
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../tools/coalition.js");

const polls = [
  { party: "הליכוד", mandates: 23.9, bloc: "גוש נתניהו" },
  { party: "ש״ס", mandates: 8.3, bloc: "גוש נתניהו" },
  { party: "עוצמה יהודית", mandates: 8, bloc: "גוש נתניהו" },
  { party: "יהדות התורה", mandates: 7.9, bloc: "גוש נתניהו/חרדי" },
  { party: "הציונות הדתית", mandates: 4.8, bloc: "גוש נתניהו/ימין דתי" },
  { party: "ישר!", mandates: 22.2, bloc: "אופוזיציה ציונית/מרכז" },
  { party: "ביחד", mandates: 14.1, bloc: "אופוזיציה ציונית/מרכז" },
  { party: "הדמוקרטים", mandates: 9.7, bloc: "אופוזיציה ציונית/שמאל" },
  { party: "ישראל ביתנו", mandates: 9.2, bloc: "אופוזיציה ציונית/ימין ליברלי" },
  { party: "חד״ש/תע״ל", mandates: 5.6, bloc: "ערבי/אזרחי" },
  { party: "רע״מ", mandates: 4.8, bloc: "ערבי/אזרחי" },
  { party: "בל״ד", mandates: 1.5, bloc: "ערבי/לאומי" }, // below threshold → 0
];

test("campFor collapses granular blocs into three camps", () => {
  assert.equal(C.campFor("גוש נתניהו/חרדי"), "netanyahu");
  assert.equal(C.campFor("ערבי/לאומי"), "arab");
  assert.equal(C.campFor("אופוזיציה ציונית/מרכז"), "center");
});

test("computeBlocs sums seats per camp with the threshold applied", () => {
  const { camps, majority } = C.computeBlocs(polls);
  assert.equal(majority, 61);
  const by = Object.fromEntries(camps.map((c) => [c.id, c.seats]));
  // Netanyahu: 24+8+8+8+5 = 53
  assert.equal(by.netanyahu, 53);
  // Center: 22+14+10+9 = 55
  assert.equal(by.center, 55);
  // Arab: 6+5 = 11 (בל״ד dropped by threshold)
  assert.equal(by.arab, 11);
});

test("a below-threshold list contributes 0 but is still listed", () => {
  const { camps } = C.computeBlocs(polls);
  const arab = camps.find((c) => c.id === "arab");
  const balad = arab.parties.find((p) => p.party === "בל״ד");
  assert.equal(balad.passes, false);
  assert.equal(balad.seats, 2); // shown, but not counted
});

test("no single camp reaches a majority in this map", () => {
  const { camps } = C.computeBlocs(polls);
  assert.ok(camps.every((c) => !c.reachesMajority));
});

test("coalitions ranks camp pairs and flags those clearing 61", () => {
  const { camps } = C.computeBlocs(polls);
  const pairs = C.coalitions(camps);
  // center(55) + arab(11) = 66 reaches; netanyahu(53)+arab(11)=64 reaches;
  // netanyahu(53)+center(55)=108 reaches. All pairs clear 61 here.
  assert.ok(pairs[0].seats >= pairs[1].seats); // sorted desc
  assert.ok(pairs.some((p) => p.ids.includes("center") && p.ids.includes("arab") && p.reaches));
});
