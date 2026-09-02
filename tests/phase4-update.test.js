// Phase 4 — the daily updater's diff: adds / removes / field changes.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { diffRecords, summarizeDiff, hasChanges } = require("../tools/daily-update.js");

const prev = [
  { id: "bill-1", name: "חוק א", statusId: 100 },
  { id: "bill-2", name: "חוק ב", statusId: 108 },
  { id: "bill-3", name: "חוק ג", statusId: 118 },
];

test("diffRecords detects additions, removals and field changes", () => {
  const next = [
    { id: "bill-1", name: "חוק א", statusId: 100 }, // unchanged
    { id: "bill-2", name: "חוק ב", statusId: 118 }, // status changed
    { id: "bill-4", name: "חוק ד", statusId: 100 }, // added
    // bill-3 removed
  ];
  const diff = diffRecords(prev, next);
  assert.equal(diff.added.length, 1);
  assert.equal(diff.added[0].id, "bill-4");
  assert.equal(diff.removed.length, 1);
  assert.equal(diff.removed[0].id, "bill-3");
  assert.equal(diff.changed.length, 1);
  assert.equal(diff.changed[0].key, "bill-2");
  assert.deepEqual(diff.changed[0].fields, ["statusId"]);
});

test("hasChanges is false for identical data", () => {
  const diff = diffRecords(prev, prev);
  assert.equal(hasChanges(diff), false);
  assert.equal(diff.changed.length, 0);
});

test("summarizeDiff reports no-change explicitly", () => {
  const md = summarizeDiff("KNS_Bill", diffRecords(prev, prev));
  assert.match(md, /no change/);
});

test("summarizeDiff lists counts and samples when changed", () => {
  const next = [{ id: "bill-1", name: "חוק א", statusId: 200 }];
  const md = summarizeDiff("KNS_Bill", diffRecords(prev, next));
  assert.match(md, /added: \*\*0\*\*/);
  assert.match(md, /removed: \*\*2\*\*/);
  assert.match(md, /changed: \*\*1\*\*/);
  assert.match(md, /statusId/);
});

test("CI and daily-update workflows exist", () => {
  const root = path.resolve(__dirname, "..");
  assert.ok(fs.existsSync(path.join(root, ".github", "workflows", "ci.yml")));
  const daily = fs.readFileSync(path.join(root, ".github", "workflows", "daily-update.yml"), "utf8");
  assert.match(daily, /schedule:/);
  assert.match(daily, /create-pull-request/); // proposes, doesn't auto-commit to main
});
