// Phase 4 — automated daily update.
// Re-fetches the Knesset data, diffs it against what's committed, and writes a
// human-readable change summary. In CI this runs on a schedule and the result is
// opened as a Pull Request: automation *proposes*, a human still reviews and
// merges, so the methodology stays in charge (see .github/workflows/daily-update.yml).
//
// diffRecords / summarizeDiff are pure and unit-tested; main() does the IO.
const fs = require("fs");
const path = require("path");
const { buildJobs, fetchValue } = require("./fetch-knesset.js");

// Compare two record lists by a stable key, reporting adds/removes/field changes.
function diffRecords(prev, next, opts = {}) {
  const keyField = opts.keyField || "id";
  const watch = opts.watch || ["name", "statusId", "isCurrent"];
  const prevById = new Map(prev.map((r) => [r[keyField], r]));
  const nextById = new Map(next.map((r) => [r[keyField], r]));

  const added = next.filter((r) => !prevById.has(r[keyField]));
  const removed = prev.filter((r) => !nextById.has(r[keyField]));
  const changed = [];
  for (const [key, nextRec] of nextById) {
    const prevRec = prevById.get(key);
    if (!prevRec) continue;
    const fields = watch.filter((f) => prevRec[f] !== nextRec[f]);
    if (fields.length) {
      changed.push({ key, fields, before: prevRec, after: nextRec });
    }
  }
  return { added, removed, changed };
}

function hasChanges(diff) {
  return diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0;
}

// Render one entity's diff as Markdown for the PR body / CHANGES.md.
function summarizeDiff(label, diff, opts = {}) {
  const sample = opts.sample || 8;
  const lines = [`### ${label}`];
  if (!hasChanges(diff)) {
    lines.push("_ללא שינוי / no change._");
    return lines.join("\n");
  }
  lines.push(
    `- נוספו / added: **${diff.added.length}**`,
    `- הוסרו / removed: **${diff.removed.length}**`,
    `- השתנו / changed: **${diff.changed.length}**`,
  );
  diff.added.slice(0, sample).forEach((r) => lines.push(`  - ➕ ${r.name || r.id}`));
  diff.changed.slice(0, sample).forEach((c) =>
    lines.push(`  - ✏️ ${c.after.name || c.key} (${c.fields.join(", ")})`),
  );
  return lines.join("\n");
}

function readEnvelope(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")).records || [];
  } catch {
    return [];
  }
}

async function main() {
  const fetchedAt = new Date().toISOString();
  const dataDir = path.resolve(process.cwd(), "data", "knesset");
  fs.mkdirSync(dataDir, { recursive: true });

  const sections = [];
  let anyChange = false;

  for (const job of buildJobs()) {
    const file = path.join(dataDir, job.file);
    const prev = readEnvelope(file);
    const raw = await fetchValue(job.url);
    const next = raw.map((r) => job.normalize(r, fetchedAt));

    const diff = diffRecords(prev, next);
    if (hasChanges(diff)) anyChange = true;
    sections.push(summarizeDiff(job.entity, diff));

    const envelope = {
      meta: { provider: "Knesset OData v4", entity: job.entity, queryUrl: job.url, fetchedAt, count: next.length },
      records: next,
    };
    fs.writeFileSync(file, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
  }

  const heading = anyChange ? "עדכון נתונים יומי — נמצאו שינויים" : "בדיקה יומית — לא נמצאו שינויים מהותיים";
  const body = [`# ${heading}`, `נבדק: ${fetchedAt}`, "", ...sections, ""].join("\n");
  fs.writeFileSync(path.join(dataDir, "CHANGES.md"), body, "utf8");

  // Signal to CI whether a PR is warranted.
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${anyChange}\n`);
  }
  console.log(body);
}

module.exports = { diffRecords, summarizeDiff, hasChanges };

if (require.main === module) {
  main().catch((err) => {
    console.error("daily-update failed:", err.message);
    process.exit(1);
  });
}
