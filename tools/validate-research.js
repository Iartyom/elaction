// Referential-integrity checks for the research dataset. data/election-research.json
// is the single source of truth (app.js reads it at runtime), so this guards the
// data itself: every sourceId resolves, party references exist, no duplicate ids.
// Exports validate(data) for tests; runs as a CLI when invoked directly.
const fs = require("fs");
const path = require("path");

const REQUIRED_TOP_LEVEL = [
  "meta",
  "taxonomy",
  "discourse",
  "questionnaire",
  "researchPlan",
  "updates",
  "runners",
  "polls",
  "parties",
  "pledgeChecks",
  "misinfoChecks",
  "sources",
];

// Walk the tree collecting any sourceId that doesn't resolve to a known source.
function collectMissingSources(value, pathLabel, sourceIds, missing) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectMissingSources(item, `${pathLabel}[${index}]`, sourceIds, missing));
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value.sourceIds)) {
    value.sourceIds.forEach((sourceId) => {
      if (!sourceIds.has(sourceId)) {
        missing.push(`${pathLabel}: ${sourceId}`);
      }
    });
  }
  Object.entries(value).forEach(([key, child]) =>
    collectMissingSources(child, `${pathLabel}.${key}`, sourceIds, missing),
  );
}

// Returns { errors: string[] } — empty errors means the dataset is valid.
function validate(data) {
  const errors = [];

  for (const key of REQUIRED_TOP_LEVEL) {
    if (!(key in data)) {
      errors.push(`missing required top-level key: ${key}`);
    }
  }
  if (errors.length) {
    return { errors };
  }

  const allSources = [...(data.sources || []), ...(data.enrichedSources || [])];
  const sourceIds = new Set(allSources.map((source) => source.id));
  const parties = new Set((data.parties || []).map((party) => party.name));

  const duplicateSources = allSources
    .map((source) => source.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicateSources.length) {
    errors.push(`duplicate source ids: ${[...new Set(duplicateSources)].join(", ")}`);
  }

  const missing = [];
  [
    ["discourse", data.discourse],
    ["updates", data.updates],
    ["runners", data.runners],
    ["polls", data.polls],
    ["parties", data.parties],
    ["pledgeChecks", data.pledgeChecks],
    ["misinfoChecks", data.misinfoChecks],
  ].forEach(([name, value]) => collectMissingSources(value, name, sourceIds, missing));
  if (missing.length) {
    errors.push(`missing source ids:\n${missing.join("\n")}`);
  }

  (data.questionnaire || []).forEach((question) => {
    (question.options || []).forEach((option) => {
      Object.keys(option.matches || {}).forEach((partyName) => {
        if (!parties.has(partyName)) {
          errors.push(`questionnaire.${question.id}.${option.id} references missing party: ${partyName}`);
        }
      });
    });
  });

  // Pledge → bill links must resolve to a real, fetched Knesset record.
  const linkedBillIds = new Set((data.linkedBills || []).map((bill) => bill.id));
  (data.pledgeChecks || []).forEach((pledge) => {
    if (!parties.has(pledge.party)) {
      errors.push(`pledgeChecks references missing party: ${pledge.party}`);
    }
    (pledge.billRefs || []).forEach((ref) => {
      if (!linkedBillIds.has(ref)) {
        errors.push(`pledge "${pledge.promise}" references missing linkedBill: ${ref}`);
      }
    });
  });

  // Every linked bill must carry provenance (where/when it was fetched).
  (data.linkedBills || []).forEach((bill) => {
    if (!bill.source || !bill.source.fetchedAt) {
      errors.push(`linkedBill ${bill.id} is missing provenance (source.fetchedAt)`);
    }
  });

  (data.polls || []).forEach((poll) => {
    if (!parties.has(poll.party)) {
      errors.push(`polls references missing party: ${poll.party}`);
    }
  });

  return { errors };
}

function loadData(dataPath = path.resolve(process.cwd(), "data", "election-research.json")) {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

module.exports = { validate, loadData, REQUIRED_TOP_LEVEL };

// CLI entry point.
if (require.main === module) {
  const { errors } = validate(loadData());
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("research data validated");
}
