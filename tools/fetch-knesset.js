// Phase 1 — the real-data spine.
// Pulls real records from the official Knesset OData v4 API and writes them to
// data/knesset/*.json, each record stamped with provenance (where it came from,
// when it was fetched) so the site can cite a source and a date for every fact,
// exactly as research-methodology.md requires.
//
// The normalize* functions are pure and unit-tested against fixtures; the network
// fetch lives in main() so the transform is verifiable offline / in CI.
const fs = require("fs");
const path = require("path");

const BASE = "https://knesset.gov.il/Odata/ParliamentInfo.svc/";
const PROVIDER = "Knesset OData v4";
// The 25th Knesset is the outgoing house the 2026 research tracks.
const CURRENT_KNESSET = 25;

// --- pure: URL building ----------------------------------------------------
function buildODataUrl(entity, params = {}, base = BASE) {
  const query = { $format: "json", ...params };
  const search = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
  return `${base}${entity}?${search}`;
}

function recordUrl(entity, keyName, keyValue, base = BASE) {
  return `${base}${entity}(${keyValue})`;
}

// --- pure: normalization ---------------------------------------------------
// A provenance stamp attached to every normalized record.
function provenance(entity, keyName, keyValue, fetchedAt) {
  return {
    provider: PROVIDER,
    entity,
    recordUrl: recordUrl(entity, keyName, keyValue),
    fetchedAt,
  };
}

function normalizeFaction(record, fetchedAt) {
  return {
    id: `faction-${record.FactionID}`,
    factionId: record.FactionID,
    name: record.Name,
    knesset: record.KnessetNum,
    isCurrent: Boolean(record.IsCurrent),
    startDate: record.StartDate || null,
    finishDate: record.FinishDate || null,
    source: provenance("KNS_Faction", "FactionID", record.FactionID, fetchedAt),
  };
}

function normalizeBill(record, fetchedAt) {
  return {
    id: `bill-${record.BillID}`,
    billId: record.BillID,
    name: record.Name,
    knesset: record.KnessetNum,
    type: record.SubTypeDesc || null, // e.g. "ממשלתית" / "פרטית"
    statusId: record.StatusID ?? null,
    number: record.Number ?? null,
    publicationDate: record.PublicationDate || null,
    summary: record.SummaryLaw || null,
    source: provenance("KNS_Bill", "BillID", record.BillID, fetchedAt),
  };
}

// Wrap a normalized list in a documented, dated envelope.
function envelope(entity, queryUrl, records, fetchedAt) {
  return {
    meta: {
      provider: PROVIDER,
      entity,
      queryUrl,
      fetchedAt,
      count: records.length,
    },
    records,
  };
}

// --- impure: fetch + write (CLI only) --------------------------------------
async function fetchValue(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const body = await res.json();
  return body.value || [];
}

// The fetch jobs, shared by the one-shot build (main) and the daily updater.
function buildJobs() {
  return [
    {
      file: "factions.json",
      entity: "KNS_Faction",
      url: buildODataUrl("KNS_Faction", {
        $filter: `KnessetNum eq ${CURRENT_KNESSET}`,
        $orderby: "Name",
      }),
      normalize: normalizeFaction,
    },
    {
      file: "bills.json",
      entity: "KNS_Bill",
      url: buildODataUrl("KNS_Bill", {
        $filter: `KnessetNum eq ${CURRENT_KNESSET}`,
        $orderby: "LastUpdatedDate desc",
        $top: 200,
      }),
      normalize: normalizeBill,
    },
  ];
}

async function main() {
  const fetchedAt = new Date().toISOString();
  const outDir = path.resolve(process.cwd(), "data", "knesset");
  fs.mkdirSync(outDir, { recursive: true });

  for (const job of buildJobs()) {
    const raw = await fetchValue(job.url);
    const records = raw.map((r) => job.normalize(r, fetchedAt));
    const out = envelope(job.entity, job.url, records, fetchedAt);
    fs.writeFileSync(path.join(outDir, job.file), `${JSON.stringify(out, null, 2)}\n`, "utf8");
    console.log(`${job.file}: ${records.length} records`);
  }
  console.log(`Knesset data written to ${outDir}`);
}

module.exports = {
  buildODataUrl,
  recordUrl,
  provenance,
  normalizeFaction,
  normalizeBill,
  envelope,
  buildJobs,
  fetchValue,
  BASE,
  PROVIDER,
  CURRENT_KNESSET,
};

if (require.main === module) {
  main().catch((err) => {
    console.error("fetch-knesset failed:", err.message);
    process.exit(1);
  });
}
