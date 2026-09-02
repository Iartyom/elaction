// Phase 0 — the JSON is the single source of truth and the app reads it.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { validate, loadData, REQUIRED_TOP_LEVEL } = require("../tools/validate-research.js");

const root = path.resolve(__dirname, "..");
const appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");
const data = loadData(path.join(root, "data", "election-research.json"));

test("dataset passes referential-integrity validation", () => {
  const { errors } = validate(data);
  assert.deepEqual(errors, [], errors.join("\n"));
});

test("dataset has every required top-level key", () => {
  for (const key of REQUIRED_TOP_LEVEL) {
    assert.ok(key in data, `missing ${key}`);
  }
});

test("dataset is non-trivial (real content, not an empty shell)", () => {
  assert.ok(data.parties.length >= 10, "expected the full party set");
  assert.ok(data.sources.length >= 50, "expected the full source registry");
});

test("app.js no longer embeds the data constants", () => {
  // These must be empty containers; the data now lives only in the JSON.
  const mustBeEmpty = [
    ["parties", "[]"],
    ["sources", "[]"],
    ["pledgeChecks", "[]"],
    ["misinfoChecks", "[]"],
    ["beliefQuestions", "[]"],
    ["pollSnapshot", "[]"],
    ["statusLabels", "{}"],
    ["severityLabels", "{}"],
  ];
  for (const [name, empty] of mustBeEmpty) {
    assert.ok(
      appSrc.includes(`const ${name} = ${empty};`),
      `expected \`const ${name} = ${empty};\` in app.js (data must not be inlined)`,
    );
  }
});

test("app.js loads data by fetch (pipeline points forward)", () => {
  assert.match(appSrc, /fetch\(`data\/election-research\.json/, "app should fetch the JSON");
  assert.match(appSrc, /function applyResearchData/, "app should hydrate from fetched data");
});

test("pledge→bill links resolve to real fetched records with provenance", () => {
  const linked = new Map((data.linkedBills || []).map((b) => [b.id, b]));
  assert.ok(linked.size >= 1, "expected at least one linked official bill");
  let linkedRefs = 0;
  for (const pledge of data.pledgeChecks) {
    for (const ref of pledge.billRefs || []) {
      const bill = linked.get(ref);
      assert.ok(bill, `pledge references unknown bill ${ref}`);
      assert.ok(bill.source && bill.source.fetchedAt, `bill ${ref} lacks provenance`);
      assert.ok(bill.name, `bill ${ref} lacks a name`);
      linkedRefs += 1;
    }
  }
  assert.ok(linkedRefs >= 1, "expected at least one pledge linked to a bill");
});

test("validate rejects a pledge referencing a non-existent bill", () => {
  const broken = JSON.parse(JSON.stringify(data));
  broken.pledgeChecks[0].billRefs = ["bill-does-not-exist"];
  const { errors } = validate(broken);
  assert.ok(errors.some((e) => /missing linkedBill/.test(e)), "should flag the bad billRef");
});

test("the reverse export tool is gone", () => {
  assert.ok(
    !fs.existsSync(path.join(root, "tools", "export-research-json.js")),
    "export-research-json.js must be removed — the JSON is the source, not a derived artifact",
  );
});
