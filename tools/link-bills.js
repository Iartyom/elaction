// Research aid + data helper for linking pledges to real Knesset bills.
// A pledge's "execution" claim (methodology's מקור ביצוע) must point at an
// official record. This searches the live Knesset OData for bills whose name
// contains a keyword, resolves their status text, and can fetch specific bills
// by id to bake into data (with provenance). Pure-ish: only fetch* touch network.
const { buildODataUrl, fetchValue, normalizeBill, CURRENT_KNESSET } = require("./fetch-knesset.js");

// StatusID -> Hebrew description (bills move through KNS_Status states).
async function fetchStatusMap() {
  const rows = await fetchValue(buildODataUrl("KNS_Status", { $top: 500 }));
  return Object.fromEntries(rows.map((r) => [r.StatusID, r.Desc]));
}

// Bills in the current Knesset whose Name contains `keyword` (OData v3 substringof).
async function searchBills(keyword) {
  const url = buildODataUrl("KNS_Bill", {
    $filter: `KnessetNum eq ${CURRENT_KNESSET} and substringof('${keyword.replace(/'/g, "''")}',Name)`,
    $orderby: "LastUpdatedDate desc",
    $top: 50,
  });
  return fetchValue(url);
}

// Fetch specific bills by id and normalize them (for baking into linkedBills).
async function resolveBills(billIds, statusMap, fetchedAt = new Date().toISOString()) {
  const out = [];
  for (const id of billIds) {
    const rows = await fetchValue(buildODataUrl("KNS_Bill", { $filter: `BillID eq ${id}` }));
    if (!rows.length) continue;
    const rec = normalizeBill(rows[0], fetchedAt);
    rec.statusDesc = statusMap[rec.statusId] || null;
    out.push(rec);
  }
  return out;
}

module.exports = { fetchStatusMap, searchBills, resolveBills };

// CLI: `node tools/link-bills.js "keyword"` — prints candidate bills to link.
if (require.main === module) {
  const keyword = process.argv.slice(2).join(" ").trim();
  if (!keyword) {
    console.error('usage: node tools/link-bills.js "keyword"');
    process.exit(1);
  }
  (async () => {
    const statusMap = await fetchStatusMap();
    const hits = await searchBills(keyword);
    if (!hits.length) {
      console.log(`no bills matched "${keyword}"`);
      return;
    }
    hits.forEach((b) => {
      console.log(`${b.BillID}\t[${statusMap[b.StatusID] || b.StatusID}]\t${b.Name}`);
    });
  })().catch((err) => {
    console.error("link-bills failed:", err.message);
    process.exit(1);
  });
}
