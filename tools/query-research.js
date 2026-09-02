const fs = require("fs");
const nodeFs = require("fs");
const path = require("path");

const dataPath = path.resolve(process.cwd(), "data", "election-research.json");
const data = JSON.parse(nodeFs.readFileSync(dataPath, "utf8"));

const [command = "summary", ...args] = process.argv.slice(2);
const query = args.join(" ").trim();

function normalizeText(value) {
  return String(value || "")
    .replace(/[׳'״"]/g, "")
    .replace(/[–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nameScore(name, rawQuery) {
  const normalizedName = normalizeText(name);
  const normalizedQuery = normalizeText(rawQuery);
  if (!normalizedQuery) return 0;
  if (normalizedName === normalizedQuery) return 100;

  const tokenPattern = new RegExp(`(^|\\s)${escapeRegExp(normalizedQuery)}($|[\\s!/])`);
  if (tokenPattern.test(normalizedName)) return 90;
  if (normalizedName.startsWith(`${normalizedQuery} `)) return 80;
  if (normalizedName.includes(` ${normalizedQuery} `)) return 70;
  if (normalizedName.includes(normalizedQuery)) return 35;
  return 0;
}

function bestMatches(list, rawQuery, getName) {
  return list
    .map((item) => ({ item, score: nameScore(getName(item), rawQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || getName(a.item).localeCompare(getName(b.item), "he"));
}

function sourceById(id) {
  return [...data.sources, ...data.enrichedSources].find((source) => source.id === id);
}

function sourceGrades(sourceIds = []) {
  return sourceIds
    .map(sourceById)
    .filter(Boolean)
    .map((source) => `${source.grade}:${source.title}`);
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function byParty() {
  if (!query) {
    throw new Error("Usage: node tools/query-research.js party <party name>");
  }
  const partyMatches = bestMatches(data.parties, query, (item) => item.name);
  const runnerMatches = bestMatches(data.runners, query, (item) => item.name);
  const pollMatches = bestMatches(data.polls, query, (item) => item.displayName || item.party);
  const pledgeMatches = bestMatches(data.pledgeChecks, query, (item) => item.party);
  const misinfoMatches = bestMatches(data.misinfoChecks || [], query, (item) => item.party);
  const party = partyMatches[0]?.item || null;
  const runner = runnerMatches[0]?.item || null;
  const pledges = pledgeMatches.filter((entry) => entry.score >= 70).map((entry) => entry.item);
  const misinfo = misinfoMatches.filter((entry) => entry.score >= 70).map((entry) => entry.item);
  const polls = pollMatches.filter((entry) => entry.score >= 70).map((entry) => entry.item);

  printJson({
    query,
    possibleMatches: {
      parties: partyMatches.slice(0, 5).map((entry) => ({ name: entry.item.name, score: entry.score })),
      runners: runnerMatches.slice(0, 5).map((entry) => ({ name: entry.item.name, score: entry.score })),
      polls: pollMatches.slice(0, 5).map((entry) => ({ name: entry.item.displayName || entry.item.party, score: entry.score })),
    },
    party: party
      ? {
          name: party.name,
          leader: party.leader,
          issues: party.issues,
          confidence: party.confidence,
          plain: party.plain,
          sources: sourceGrades(party.sourceIds),
        }
      : null,
    runner: runner
      ? {
          name: runner.name,
          status: runner.status,
          reliability: runner.reliability,
          summary: runner.summary,
          sources: sourceGrades(runner.sourceIds),
        }
      : null,
    polls,
    pledges: pledges.map((pledge) => ({
      issue: pledge.issue,
      status: pledge.status,
      confidence: pledge.confidence,
      promise: pledge.promise,
      finding: pledge.finding,
      sources: sourceGrades(pledge.sourceIds),
    })),
    misinfo: misinfo.map((check) => ({
      issue: check.issue,
      status: check.status,
      severity: check.severity,
      confidence: check.confidence,
      claim: check.claim,
      truth: check.truth,
      sources: sourceGrades(check.sourceIds),
    })),
  });
}

function byIssue() {
  if (!query) {
    throw new Error("Usage: node tools/query-research.js issue <issue id or title>");
  }
  const issue = data.taxonomy.issues.find((item) => item.id === query || item.title.includes(query));
  const issueId = issue?.id || query;
  const parties = data.parties
    .filter((party) => party.issues.includes(issueId))
    .map((party) => ({
      name: party.name,
      confidence: party.confidence,
      plain: party.plain,
    }));
  const pledges = data.pledgeChecks
    .filter((pledge) => pledge.issue === issueId)
    .map((pledge) => ({
      party: pledge.party,
      status: pledge.status,
      confidence: pledge.confidence,
      promise: pledge.promise,
      finding: pledge.finding,
      sources: sourceGrades(pledge.sourceIds),
    }));
  const misinfo = (data.misinfoChecks || [])
    .filter((check) => check.issue === issueId)
    .map((check) => ({
      party: check.party,
      status: check.status,
      severity: check.severity,
      claim: check.claim,
      truth: check.truth,
      sources: sourceGrades(check.sourceIds),
    }));

  printJson({ issue: issue || issueId, parties, pledges, misinfo });
}

function lowConfidence() {
  const weakSourceGrades = new Set(["C", "D", "E"]);
  const weakParties = data.parties
    .filter((party) => {
      const grades = party.sourceIds.map(sourceById).filter(Boolean).map((source) => source.grade);
      return party.confidence === "low" || grades.every((grade) => weakSourceGrades.has(grade));
    })
    .map((party) => ({
      name: party.name,
      confidence: party.confidence,
      researchStatus: party.researchStatus,
      sources: sourceGrades(party.sourceIds),
    }));

  const weakPledges = data.pledgeChecks
    .filter((pledge) => pledge.confidence === "low")
    .map((pledge) => ({
      party: pledge.party,
      issue: pledge.issue,
      status: pledge.status,
      promise: pledge.promise,
      next: pledge.next,
      sources: sourceGrades(pledge.sourceIds),
    }));

  printJson({
    openResearchGaps: data.openResearchGaps,
    weakParties,
    weakPledges,
  });
}

function misinfo() {
  const filtered = query
    ? (data.misinfoChecks || []).filter((check) =>
        [check.party, check.actor, check.issue, check.status, check.severity, check.claim, check.truth, check.whyItMatters]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : data.misinfoChecks || [];

  printJson(
    filtered.map((check) => ({
      party: check.party,
      actor: check.actor,
      issue: check.issue,
      status: check.status,
      severity: check.severity,
      confidence: check.confidence,
      claim: check.claim,
      truth: check.truth,
      whyItMatters: check.whyItMatters,
      sources: sourceGrades(check.sourceIds),
    })),
  );
}

function sources() {
  const allSources = [...data.sources, ...data.enrichedSources];
  const filtered = query
    ? allSources.filter((source) =>
        [source.id, source.title, source.type, source.grade, source.note, source.claimSummary]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : allSources;

  printJson(
    filtered.map((source) => ({
      id: source.id,
      title: source.title,
      grade: source.grade,
      type: source.type,
      url: source.url,
      note: source.note || source.claimSummary || "",
    })),
  );
}

function summary() {
  const sourceCounts = [...data.sources, ...data.enrichedSources].reduce((counts, source) => {
    counts[source.grade] = (counts[source.grade] || 0) + 1;
    return counts;
  }, {});

  printJson({
    reviewedAt: data.meta.reviewedAt,
    parties: data.parties.length,
    runners: data.runners.length,
    polls: data.polls.length,
    pledgeChecks: data.pledgeChecks.length,
    misinfoChecks: (data.misinfoChecks || []).length,
    questions: data.questionnaire.length,
    sources: data.sources.length,
    enrichedSources: data.enrichedSources.length,
    sourceCounts,
    openResearchGaps: data.openResearchGaps.length,
  });
}

const commands = {
  summary,
  party: byParty,
  issue: byIssue,
  "low-confidence": lowConfidence,
  misinfo,
  sources,
};

if (!commands[command]) {
  throw new Error(`Unknown command "${command}". Use: ${Object.keys(commands).join(", ")}`);
}

commands[command]();
