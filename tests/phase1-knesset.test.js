// Phase 1 — normalize real Knesset OData records with provenance (offline).
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildODataUrl,
  normalizeFaction,
  normalizeBill,
  envelope,
  PROVIDER,
} = require("../tools/fetch-knesset.js");

// Real response shapes captured from the live API.
const FACTION = {
  FactionID: 1095,
  Name: 'התאחדות הספרדים שומרי תורה',
  KnessetNum: 25,
  StartDate: "2022-11-15T00:00:00",
  FinishDate: null,
  IsCurrent: true,
  LastUpdatedDate: "2024-10-07T12:24:33.057",
};

const BILL = {
  BillID: 2230015,
  KnessetNum: 25,
  Name: "חוק משפחות חיילים שנספו במערכה (תיקון מס' 47), התשפ\"ו-2026",
  SubTypeDesc: "ממשלתית",
  StatusID: 118,
  Number: 1852,
  PublicationDate: "2026-01-28T14:54:00",
  SummaryLaw: "חוק זה מתקן...",
};

const FETCHED = "2026-08-31T00:00:00.000Z";

test("buildODataUrl encodes filters and always requests json", () => {
  const url = buildODataUrl("KNS_Bill", { $filter: "KnessetNum eq 25", $top: 10 });
  assert.ok(url.startsWith("https://knesset.gov.il/Odata/ParliamentInfo.svc/KNS_Bill?"));
  assert.match(url, /\$format=json/);
  assert.match(url, /KnessetNum%20eq%2025/); // filter value is encoded
  assert.match(url, /\$top=10/);
});

test("normalizeFaction produces a stable id and provenance", () => {
  const f = normalizeFaction(FACTION, FETCHED);
  assert.equal(f.id, "faction-1095");
  assert.equal(f.name, FACTION.Name);
  assert.equal(f.knesset, 25);
  assert.equal(f.isCurrent, true);
  assert.equal(f.source.provider, PROVIDER);
  assert.equal(f.source.fetchedAt, FETCHED);
  assert.match(f.source.recordUrl, /KNS_Faction\(1095\)/);
});

test("normalizeBill carries type, status and a real summary", () => {
  const b = normalizeBill(BILL, FETCHED);
  assert.equal(b.id, "bill-2230015");
  assert.equal(b.type, "ממשלתית");
  assert.equal(b.statusId, 118);
  assert.equal(b.publicationDate, "2026-01-28T14:54:00");
  assert.ok(b.summary.length > 0);
  assert.equal(b.source.entity, "KNS_Bill");
  assert.equal(b.source.fetchedAt, FETCHED);
});

test("every normalized record is stamped with a fetch date", () => {
  const records = [normalizeFaction(FACTION, FETCHED), normalizeBill(BILL, FETCHED)];
  for (const r of records) {
    assert.ok(r.source && r.source.fetchedAt, "record missing provenance date");
  }
});

test("envelope documents the query and counts records", () => {
  const records = [normalizeBill(BILL, FETCHED)];
  const env = envelope("KNS_Bill", "https://example/query", records, FETCHED);
  assert.equal(env.meta.count, 1);
  assert.equal(env.meta.entity, "KNS_Bill");
  assert.equal(env.meta.queryUrl, "https://example/query");
  assert.equal(env.records.length, 1);
});
