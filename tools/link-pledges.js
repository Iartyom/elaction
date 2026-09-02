// Links pledges to the real Knesset bills their "finding" refers to, so each
// execution claim (methodology's מקור ביצוע) cites an official record with a
// live status. The mapping below is editorial (hand-verified against the bill
// name + status via `node tools/link-bills.js "<keyword>"`); this tool just
// re-fetches each bill's current record and re-applies the links idempotently.
//
// Run: node tools/link-pledges.js   (needs network; rewrites election-research.json)
const fs = require("fs");
const path = require("path");
const { fetchStatusMap, resolveBills } = require("./link-bills.js");

// billId -> which pledges it attaches to. Verified real bills in the 25th Knesset.
const BILL_LINKS = [
  {
    // חוק היועץ המשפטי לממשלה (חוות דעת, ייצוג ופיקוח) — התקבל בקריאה שלישית
    billId: 2197909,
    match: (p) => /היועץ המשפטי|יועמ״?ש|יועמ"ש/.test(p.finding + p.promise),
  },
  {
    // חוק איסור הונאה בכשרות (תיקון מס' 5) — התקבל בקריאה שלישית
    billId: 1046237,
    match: (p) => /כשרות/.test(p.finding + p.promise),
  },
  {
    // הצעת חוק לתיקון פקודת בתי הסוהר — מניעת כניסת הצלב האדום
    billId: 2211922,
    match: (p) => /הצלב האדום/.test(p.finding + p.promise),
  },
];

async function main() {
  const dataPath = path.resolve(process.cwd(), "data", "election-research.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  const statusMap = await fetchStatusMap();
  const fetchedAt = new Date().toISOString();
  const linkedBills = await resolveBills(BILL_LINKS.map((b) => b.billId), statusMap, fetchedAt);

  // A public Knesset link for each bill, plus the verifiable OData record.
  linkedBills.forEach((bill) => {
    bill.knessetUrl = `https://main.knesset.gov.il/Activity/Legislation/Laws/Pages/LawBill.aspx?t=lawsuggestionssearch&lawitemid=${bill.billId}`;
  });

  let links = 0;
  data.pledgeChecks.forEach((pledge) => {
    const refs = BILL_LINKS.filter((b) => b.match(pledge)).map((b) => `bill-${b.billId}`);
    if (refs.length) {
      pledge.billRefs = refs;
      links += refs.length;
    } else {
      delete pledge.billRefs;
    }
  });

  data.linkedBills = linkedBills;
  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`linked ${links} pledge→bill references across ${linkedBills.length} official bills`);
  linkedBills.forEach((b) => console.log(`  ${b.id} [${b.statusDesc}] ${b.name}`));
}

module.exports = { BILL_LINKS };

if (require.main === module) {
  main().catch((err) => {
    console.error("link-pledges failed:", err.message);
    process.exit(1);
  });
}
