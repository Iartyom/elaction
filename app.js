const issues = [];

const publicDiscourseThemes = [];

const beliefQuestions = [];

const beliefReliabilityByOption = {
  hardline: "B",
  "state-security": "B",
  "civil-equality": "B",
  "jewish-identity": "A",
  "liberal-religion": "A",
  "shared-life": "B",
  governability: "A",
  checks: "A",
  "minority-rights": "B",
  "free-market": "A",
  welfare: "B",
  "sector-services": "B",
  "current-right": "A",
  "replace-government": "B",
  "minority-civic": "B",
  "deal-first": "B",
  "victory-first": "B",
  "political-solution": "B",
  "draft-all": "A",
  "torah-protection": "A",
  "gradual-integration": "B",
  "build-fast": "B",
  "public-housing": "B",
  "periphery-first": "B",
  "housing-mix": "B",
  "core-studies": "A",
  "religious-education": "A",
  "civic-education": "B",
  "policing-first": "B",
  "investment-equality": "B",
  "joint-security-civil": "B",
  "expand-settlements": "A",
  "manage-status-quo": "B",
  "oppose-occupation": "B",
  "clean-government": "A",
  "elected-control": "A",
  "professional-service": "B",
  "free-press": "B",
  "regulate-ai": "A",
  "free-press-ai-rules": "B",
  "anti-elite-media": "C",
  "green-urgent": "B",
  "infrastructure-first": "B",
  "local-quality": "B",
  "liberal-rights": "B",
  "family-values": "B",
  "privacy-freedom": "B",
};

const reliabilityLabels = {};

const reliabilityLevels = [];

const researchPhases = [];

const dailyUpdates = [];

const runnerStatuses = {};

const electionRunners = [];

const pollSnapshot = [];

let pollByParty = Object.fromEntries(pollSnapshot.map((poll) => [poll.party, poll]));

const sources = [];

const parties = [];

const pledgeChecks = [];

const misinfoChecks = [];

const statusLabels = {};

const confidenceLabels = {};

const pledgeStatusLabels = {};

const misinfoStatusLabels = {};

const severityLabels = {};

let sourceById = Object.fromEntries(sources.map((source) => [source.id, source]));

const discourseGrid = document.querySelector("#discourseGrid");
const raceStats = document.querySelector("#raceStats");
const coalitionSummary = document.querySelector("#coalitionSummary");
const raceList = document.querySelector("#raceList");
const issueFilter = document.querySelector("#issueFilter");
const issueLabFilter = document.querySelector("#issueLabFilter");
const issueLabGrid = document.querySelector("#issueLabGrid");
const dataRefreshStatus = document.querySelector("#dataRefreshStatus");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const sortFilter = document.querySelector("#sortFilter");
const partyGrid = document.querySelector("#partyGrid");
const promiseTable = document.querySelector("#promiseTable");
const sourceList = document.querySelector("#sourceList");
const reliabilityGrid = document.querySelector("#reliabilityGrid");
const researchStats = document.querySelector("#researchStats");
const researchPlanGrid = document.querySelector("#researchPlanGrid");
const dailyUpdateList = document.querySelector("#dailyUpdateList");
const electionFeedList = document.querySelector("#electionFeedList");
const beliefQuestionsEl = document.querySelector("#beliefQuestions");
const beliefResults = document.querySelector("#beliefResults");
const resetBeliefs = document.querySelector("#resetBeliefs");
const pledgeLedger = document.querySelector("#pledgeLedger");
const pledgeFocusStats = document.querySelector("#pledgeFocusStats");
const pledgeSearchInput = document.querySelector("#pledgeSearchInput");
const pledgeIssueFilter = document.querySelector("#pledgeIssueFilter");
const pledgePartyFilter = document.querySelector("#pledgePartyFilter");
const pledgeStatusFilter = document.querySelector("#pledgeStatusFilter");
const misinfoList = document.querySelector("#misinfoList");
const misinfoPartyFilter = document.querySelector("#misinfoPartyFilter");
const misinfoSeverityFilter = document.querySelector("#misinfoSeverityFilter");
const misinfoStatusFilter = document.querySelector("#misinfoStatusFilter");
const backToTop = document.querySelector("#backToTop");

// Compass state lives in compassState (defined with the compass flow below).

function renderIssues() {
  const selectedIssue = issueFilter.value || "all";
  const selectedLabIssue = issueLabFilter.value || issues[0]?.id;

  issueFilter.innerHTML = `<option value="all">כל הנושאים</option>`;
  issueFilter.innerHTML += issues
    .map((issue) => `<option value="${issue.id}">${issue.title}</option>`)
    .join("");
  if ([...issueFilter.options].some((option) => option.value === selectedIssue)) {
    issueFilter.value = selectedIssue;
  }

  issueLabFilter.innerHTML = issues
    .map((issue, index) => `<option value="${issue.id}"${index === 0 ? " selected" : ""}>${issue.title}</option>`)
    .join("");
  if ([...issueLabFilter.options].some((option) => option.value === selectedLabIssue)) {
    issueLabFilter.value = selectedLabIssue;
  }
}

function renderPublicDiscourse() {
  if (!discourseGrid) return; // section removed in the streamlined layout
  discourseGrid.innerHTML = publicDiscourseThemes
    .map((theme) => {
      const sources = theme.sourceIds
        .map((id) => sourceById[id])
        .filter(Boolean)
        .map(
          (source) =>
            `<a href="${source.url}" target="_blank" rel="noreferrer" data-grade="${source.grade}">${source.title}</a>`,
        )
        .join("");

      return `
        <article class="discourse-card">
          <strong>${theme.title}</strong>
          <p>${theme.text}</p>
          <span class="discourse-question">${theme.question}</span>
          <details class="compact-details">
            <summary>מקורות</summary>
            <div class="source-links">${sources}</div>
          </details>
        </article>
      `;
    })
    .join("");
}

const pollRunnerAliases = {
  "הדמוקרטים / העבודה-מרצ": ["הדמוקרטים"],
  "יהדות התורה / דגל התורה ואגודת ישראל": ["דגל התורה", "אגודת ישראל"],
  "חד״ש / תע״ל": ["חד״ש", "תע״ל"],
  "כחול לבן / המחנה הממלכתי": ["המחנה הממלכתי / כחול לבן"],
  "בית ציוני / טרופר-הנדל": ["בית ציוני / טרופר-הנדל", "מפלגת המילואימניקים"],
};

function getReliabilityClass(grade) {
  if (grade === "A") {
    return "high";
  }
  if (grade === "B") {
    return "medium";
  }
  return "low";
}

function getRunnerNamesForPoll(poll) {
  return pollRunnerAliases[poll.party] || [poll.party, poll.displayName].filter(Boolean);
}

function getRunnerForPoll(poll) {
  const names = getRunnerNamesForPoll(poll);
  return electionRunners.find((runner) => names.includes(runner.name));
}

function getRaceRows() {
  const representedRunnerNames = new Set();
  const pollRows = [...pollSnapshot]
    .sort((a, b) => b.mandates - a.mandates)
    .map((poll) => {
      const runner = getRunnerForPoll(poll);
      getRunnerNamesForPoll(poll).forEach((name) => representedRunnerNames.add(name));
      if (runner) {
        representedRunnerNames.add(runner.name);
      }

      return {
        name: poll.displayName || poll.party,
        bloc: poll.bloc,
        status: runner?.status || "polling",
        reliability: "C",
        mandates: poll.mandates,
        display: poll.display,
        summary:
          runner?.summary ||
          "מופיעה בממוצע סקרים. זה אינו אישור רשמי לריצה או לרשימת מועמדים סופית.",
        sourceIds: [...new Set([...(poll.sourceIds || []), ...(runner?.sourceIds || [])])],
      };
    });

  const watchRows = electionRunners
    .filter((runner) => !runner.name.startsWith("אין עדיין"))
    .filter((runner) => !representedRunnerNames.has(runner.name))
    .map((runner) => ({
      name: runner.name,
      bloc: runner.bloc,
      status: runner.status,
      reliability: runner.reliability,
      mandates: null,
      display: "אין",
      summary: runner.summary,
      sourceIds: runner.sourceIds,
    }));

  const statusScore = {
    parliamentary: 5,
    declared: 4,
    internal: 4,
    component: 3,
    polling: 2,
    watch: 1,
    approved: 0,
  };

  return [...pollRows, ...watchRows].sort((a, b) => {
    if (a.mandates !== null && b.mandates !== null) {
      return b.mandates - a.mandates;
    }
    if (a.mandates !== null) {
      return -1;
    }
    if (b.mandates !== null) {
      return 1;
    }
    return (statusScore[b.status] || 0) - (statusScore[a.status] || 0) || a.name.localeCompare(b.name, "he");
  });
}

// The coalition question: which camp reaches 61, and which governments are
// formable. Groups poll blocs into three camps (see tools/coalition.js).
function renderCoalition() {
  if (!coalitionSummary || typeof ElactionCoalition === "undefined") return;
  const { camps, majority, total } = ElactionCoalition.computeBlocs(pollSnapshot);
  if (!camps.some((c) => c.seats > 0)) {
    coalitionSummary.innerHTML = "";
    return;
  }
  const pairs = ElactionCoalition.coalitions(camps, majority).filter((p) => p.reaches);
  const winner = camps.find((c) => c.reachesMajority);

  const readout = winner
    ? `<strong>${winner.label}</strong> מגיע לרוב של ${majority} מנדטים (${winner.seats}).`
    : `אף גוש לא מגיע לבד ל-${majority}. צירוף אפשרי: ${
        pairs.length
          ? pairs.map((p) => `${p.labels.join(" + ")} = ${p.seats}`).join(" · ")
          : "אין"
      }.`;

  const bars = camps
    .map((camp) => {
      const pct = Math.min(100, Math.round((camp.seats / total) * 100));
      const majorityPct = Math.round((majority / total) * 100);
      const partyList = camp.parties
        .map(
          (p) =>
            `<span class="camp-party${p.passes ? "" : " below"}">${p.party} <b>${p.seats}</b></span>`,
        )
        .join("");
      return `
        <article class="camp camp-${camp.id}${camp.reachesMajority ? " reaches" : ""}">
          <div class="camp-head">
            <span class="camp-label">${camp.label}</span>
            <span class="camp-seats">${camp.seats}<small>מנדטים</small></span>
          </div>
          <div class="camp-bar">
            <span style="width:${pct}%"></span>
            <i class="camp-majority" style="inset-inline-start:${majorityPct}%" title="רוב ${majority}"></i>
          </div>
          <div class="camp-parties">${partyList}</div>
        </article>`;
    })
    .join("");

  coalitionSummary.innerHTML = `
    <div class="coalition-head">
      <div>
        <p class="eyebrow">מפת גושים · דרך ל-${majority}</p>
        <h3>מי יכול להרכיב ממשלה</h3>
      </div>
      <p class="coalition-readout">${readout}</p>
    </div>
    <div class="camp-grid">${bars}</div>
    <p class="coalition-note">ממוצע סקרים בלבד, לא תוצאה. רשימות מתחת לאחוז החסימה (כ-4 מנדטים) מוצגות אך אינן נספרות. חלוקת הגושים היא לפי מחנה פוליטי, לא הבטחה קואליציונית.</p>
  `;
}

function renderRace() {
  renderCoalition();
  const rows = getRaceRows();
  const counts = electionRunners.reduce((acc, runner) => {
    acc[runner.status] = (acc[runner.status] || 0) + 1;
    return acc;
  }, {});
  const leading = rows.find((row) => row.mandates !== null);
  const aboveThreshold = rows.filter((row) => row.mandates !== null && row.mandates >= 3.25).length;

  raceStats.innerHTML = [
    { label: `המובילה כרגע: ${leading?.name || "-"}`, value: leading?.display || "-" },
    { label: "מעל אחוז החסימה בממוצע", value: aboveThreshold },
    { label: "רשימות/התארגנויות במעקב", value: rows.length },
    { label: "רשימות מועמדים מאושרות", value: 0 },
  ]
    .map(
      (item) => `
        <article class="race-stat">
          <strong>${item.value}</strong>
          <span>${item.label}</span>
        </article>
      `,
    )
    .join("");

  raceList.innerHTML = rows
    .map((row, index) => {
      const rowSources = row.sourceIds
        .map((id) => sourceById[id])
        .filter(Boolean)
        .map(
          (source) =>
            `<a href="${source.url}" target="_blank" rel="noreferrer" data-grade="${source.grade}">${source.title}</a>`,
        )
        .join("");
      const mandateBlock =
        row.mandates === null
          ? `<span class="race-no-poll">אין ממוצע סקרים</span>`
          : `
            <div class="race-meter" aria-label="${row.display} מנדטים">
              <span style="width: ${Math.min(100, (row.mandates / 30) * 100)}%"></span>
            </div>
            <strong class="race-mandates">${row.display}</strong>
          `;

      return `
        <article class="race-row">
          <span class="race-rank">${index + 1}</span>
          <div class="race-name">
            <strong>${row.name}</strong>
            <small>${row.bloc}</small>
          </div>
          <div class="race-meta">
            <span class="chip">${runnerStatuses[row.status]}</span>
            <span class="chip confidence-${getReliabilityClass(row.reliability)}">${reliabilityLabels[row.reliability]}</span>
          </div>
          <div class="race-poll">${mandateBlock}</div>
          <details class="compact-details race-sources">
            <summary>מקורות</summary>
            <p class="research-note">${row.summary}</p>
            <div class="source-links">${rowSources}</div>
          </details>
        </article>
      `;
    })
    .join("");
}

function populatePledgeFilters() {
  const selectedIssue = pledgeIssueFilter.value || "all";
  const selectedParty = pledgePartyFilter.value || "all";

  pledgeIssueFilter.innerHTML = `<option value="all">כל הצירים</option>`;
  pledgeIssueFilter.innerHTML += issues
    .map((issue) => `<option value="${issue.id}">${issue.title}</option>`)
    .join("");

  pledgePartyFilter.innerHTML = `<option value="all">כל המפלגות</option>`;
  pledgePartyFilter.innerHTML += parties
    .map((party) => `<option value="${party.name}">${party.name}</option>`)
    .join("");

  if ([...pledgeIssueFilter.options].some((option) => option.value === selectedIssue)) {
    pledgeIssueFilter.value = selectedIssue;
  }
  if ([...pledgePartyFilter.options].some((option) => option.value === selectedParty)) {
    pledgePartyFilter.value = selectedParty;
  }
}

function populateMisinfoFilters() {
  const selectedParty = misinfoPartyFilter.value || "all";
  const groups = [...new Set(misinfoChecks.map((check) => check.party))].sort((a, b) => a.localeCompare(b, "he"));
  misinfoPartyFilter.innerHTML = `<option value="all">כולם</option>`;
  misinfoPartyFilter.innerHTML += groups
    .map((party) => `<option value="${party}">${party}</option>`)
    .join("");

  if ([...misinfoPartyFilter.options].some((option) => option.value === selectedParty)) {
    misinfoPartyFilter.value = selectedParty;
  }
}

function getPartyByName(name) {
  return parties.find((party) => party.name === name);
}

function parseHebrewDate(date) {
  const [day, month, year] = date.split(".").map(Number);
  return new Date(year, month - 1, day).getTime();
}

function getSortedUpdates() {
  return [...dailyUpdates].sort((a, b) => parseHebrewDate(b.date) - parseHebrewDate(a.date));
}

function getOptionReliability(option) {
  return beliefReliabilityByOption[option.id] || "B";
}

function getMatchReliability(party, selectedOptions) {
  if (party.confidence === "low") {
    return "C";
  }
  if (party.confidence === "medium") {
    return selectedOptions.some((option) => getOptionReliability(option) === "C") ? "C" : "B";
  }
  return selectedOptions.every((option) => getOptionReliability(option) === "A") ? "A" : "B";
}

function getPlatformCoverage(party) {
  const officialPartySources = party.sourceIds
    .map((id) => sourceById[id])
    .filter((source) => source?.grade === "A" && source.type.includes("מפלגתי רשמי"));

  if (party.confidence === "low") {
    return {
      label: "אין עדיין מצע רשמי מלא",
      className: "low",
      note: "התאמה זמנית שמבוססת על דיווחים, סקרים או התארגנות. צריך להצליב לפני מסקנה.",
    };
  }

  if (officialPartySources.length) {
    return {
      label: "נבדק מול מקור מפלגתי רשמי",
      className: "high",
      note: "יש מקור רשמי לעמדות המפלגה, ועדיין צריך לבדוק ביצוע מול חקיקה והצבעות.",
    };
  }

  return {
    label: "דורש מצע רשמי עדכני",
    className: "medium",
    note: "ההתאמה נשענת על מקורות מחקריים/חדשותיים עד לפרסום מצע מפלגתי מלא.",
  };
}

function getPartyPledges(party) {
  return pledgeChecks.filter((pledge) => pledge.party === party.name);
}

function getPartyMisinfo(party) {
  return misinfoChecks.filter((check) => check.party === party.name || check.party.includes(party.name));
}

function getPartySources(party) {
  const pledgeSourceIds = getPartyPledges(party).flatMap((pledge) => pledge.sourceIds);
  const misinfoSourceIds = getPartyMisinfo(party).flatMap((check) => check.sourceIds);
  return [...new Set([...party.sourceIds, ...pledgeSourceIds, ...misinfoSourceIds])]
    .map((id) => sourceById[id])
    .filter(Boolean);
}

function getPartyIntegrity(party) {
  const partySources = getPartySources(party);
  const pledges = getPartyPledges(party);
  const misinfoItems = getPartyMisinfo(party);
  const platformCoverage = getPlatformCoverage(party);
  const grades = partySources.map((source) => source.grade);
  const weakSourceCount = grades.filter((grade) => grade === "C" || grade === "D" || grade === "E").length;
  const highBiasSources = partySources.filter((source) => source.grade === "D" || source.grade === "E");
  const blockedPledges = pledges.filter((pledge) => pledge.status === "blocked");
  const reviewPledges = pledges.filter((pledge) => pledge.status === "review" || pledge.confidence === "low");
  const highSeverityMisinfo = misinfoItems.filter((item) => item.severity === "high");
  const falseOrMisleading = misinfoItems.filter((item) => item.status === "false" || item.status === "misleading");
  const officialSources = partySources.filter((source) => source.grade === "A");
  const flags = [];
  const strengths = [];
  let score = 0;

  if (party.confidence === "low") {
    score += 3;
    flags.push("ביטחון מחקרי נמוך: אין עדיין תשתית מספיקה להציג את זה כעובדה סגורה.");
  }

  if (platformCoverage.className === "low") {
    score += 2;
    flags.push("אין מצע רשמי מלא או רשימת מועמדים מאושרת שניתן למדוד מולה הבטחות.");
  } else if (platformCoverage.className === "medium") {
    score += 1;
    flags.push("נדרש מצע רשמי עדכני לפני שמעלים את רמת הביטחון בהתאמה.");
  } else {
    strengths.push("יש מקור מפלגתי רשמי לעמדות המוצהרות.");
  }

  if (highBiasSources.length) {
    score += 2;
    flags.push("קיימים מקורות פרשנות/הטיה במאגר; הם אינם מספיקים לבד לטענה עובדתית.");
  }

  if (partySources.length && weakSourceCount / partySources.length >= 0.5) {
    score += 1;
    flags.push("חלק גדול מהמידע נשען על חדשות, סקרים או מקורות שדורשים הצלבה.");
  }

  if (blockedPledges.length >= 2) {
    score += 2;
    flags.push(`${blockedPledges.length} הבטחות מרכזיות מסומנות כלא קוימו או נבלמו.`);
  } else if (blockedPledges.length === 1) {
    score += 1;
    flags.push("יש הבטחה מרכזית אחת שמסומנת כלא קוימה או נבלמה.");
  }

  if (reviewPledges.length >= 2) {
    score += 1;
    flags.push(`${reviewPledges.length} הבטחות עדיין דורשות בדיקה או נשענות על אמינות נמוכה.`);
  }

  if (highSeverityMisinfo.length) {
    score += 2;
    flags.push(`${highSeverityMisinfo.length} כרטיסי פייק/דיסאינפורמציה בחומרה גבוהה משויכים למפלגה או לגוש.`);
  } else if (falseOrMisleading.length) {
    score += 1;
    flags.push(`${falseOrMisleading.length} טענות מסומנות כלא נכונות או מטעות בבדיקות עובדה.`);
  }

  if (officialSources.length >= 2) {
    strengths.push("יש כמה מקורות רשמיים/כנסת שמחזקים את בדיקת העובדות.");
  }

  if (!flags.length) {
    flags.push("לא נמצאו דגלי אזהרה חריגים בגרסה הנוכחית, אבל עדיין צריך לבדוק מצע מלא והצבעות.");
  }

  const level =
    score >= 5
      ? { className: "high", label: "דגלי אזהרה גבוהים" }
      : score >= 2
        ? { className: "medium", label: "דורש בדיקה זהירה" }
        : { className: "low", label: "תשתית אמינות טובה" };

  return {
    ...level,
    score,
    flags: flags.slice(0, 4),
    strengths: strengths.slice(0, 3),
  };
}

// --- Phase 3: guided, weighted, shareable compass ---
// State drives a one-question-at-a-time flow; results are computed by the pure
// ElactionCompass engine so the ranking is auditable and shareable via the URL.
const compassState = { step: 0, answers: {}, weights: {}, submitted: false };

function compassTotal() {
  return beliefQuestions.length;
}

function setCompassStep(step) {
  const total = compassTotal();
  compassState.step = Math.max(0, Math.min(step, total - 1));
}

// The chosen option objects (with their matches maps), for reliability scoring.
function selectedOptionObjects() {
  return beliefQuestions
    .map((question) => {
      const option = question.options.find((item) => item.id === compassState.answers[question.id]);
      return option ? { ...option, questionTitle: question.title } : null;
    })
    .filter(Boolean);
}

function updateCompassHash() {
  if (typeof ElactionCompass === "undefined") return;
  const encoded = ElactionCompass.encodeAnswers(compassState.answers, compassState.weights);
  const hash = encoded ? `#compass=${encoded}` : "";
  if (hash) {
    history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);
  }
}

function renderBeliefQuestions() {
  const total = compassTotal();
  if (!total) {
    beliefQuestionsEl.innerHTML = "";
    return;
  }

  const answeredCount = Object.keys(compassState.answers).length;

  // After finishing, collapse the questionnaire into a summary the voter can reopen.
  if (compassState.submitted) {
    beliefQuestionsEl.innerHTML = `
      <div class="compass-done">
        <div>
          <strong>ענית על ${answeredCount} מתוך ${total} שאלות.</strong>
          <p>אפשר לחזור, לשנות תשובות, או לסמן נושא כחשוב במיוחד כדי לשנות את המשקל.</p>
        </div>
        <button type="button" id="compassEdit">חזרה לשאלון</button>
      </div>
    `;
    beliefQuestionsEl.querySelector("#compassEdit").addEventListener("click", () => {
      compassState.submitted = false;
      renderBeliefQuestions();
      renderBeliefResults();
    });
    return;
  }

  setCompassStep(compassState.step);
  const step = compassState.step;
  const question = beliefQuestions[step];
  const selected = compassState.answers[question.id];
  const weighted = compassState.weights[question.id] === 2;
  const isLast = step === total - 1;
  const progress = Math.round(((step + 1) / total) * 100);

  beliefQuestionsEl.innerHTML = `
    <div class="compass">
      <div class="compass-progress">
        <div class="compass-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${step + 1}">
          <span style="width: ${progress}%"></span>
        </div>
        <span class="compass-step">שאלה ${step + 1} מתוך ${total} · ${answeredCount} נענו</span>
      </div>
      <article class="compass-card">
        <span class="chip">${question.title}</span>
        <h3>${question.question}</h3>
        <div class="belief-options" role="group" aria-label="${question.question}">
          ${question.options
            .map(
              (option) => `
                <button type="button" class="belief-option" data-option="${option.id}" aria-pressed="${selected === option.id}">
                  <strong>${option.label}</strong>
                  <small>${reliabilityLabels[getOptionReliability(option)]}</small>
                  <em>${option.text}</em>
                </button>
              `,
            )
            .join("")}
        </div>
        <label class="compass-weight ${weighted ? "is-on" : ""}">
          <input type="checkbox" id="compassWeight" ${weighted ? "checked" : ""} />
          <span>חשוב לי במיוחד — משקל כפול ×2</span>
        </label>
      </article>
      <div class="compass-nav">
        <button type="button" id="compassPrev" ${step === 0 ? "disabled" : ""}>הקודם</button>
        <button type="button" id="compassSkip">${selected ? "דלג בלי לשנות" : "דלג"}</button>
        ${
          isLast
            ? `<button type="button" id="compassFinish" class="compass-primary">הצג התאמות</button>`
            : `<button type="button" id="compassNext" class="compass-primary" ${selected ? "" : "disabled"}>הבא</button>`
        }
      </div>
    </div>
  `;

  beliefQuestionsEl.querySelectorAll(".belief-option").forEach((button) => {
    button.addEventListener("click", () => {
      compassState.answers[question.id] = button.dataset.option;
      updateCompassHash();
      renderBeliefQuestions();
    });
  });

  const weightBox = beliefQuestionsEl.querySelector("#compassWeight");
  if (weightBox) {
    weightBox.addEventListener("change", () => {
      if (weightBox.checked) {
        compassState.weights[question.id] = 2;
      } else {
        delete compassState.weights[question.id];
      }
      updateCompassHash();
      renderBeliefQuestions();
    });
  }

  const prev = beliefQuestionsEl.querySelector("#compassPrev");
  if (prev) prev.addEventListener("click", () => { setCompassStep(step - 1); renderBeliefQuestions(); });
  const skip = beliefQuestionsEl.querySelector("#compassSkip");
  if (skip) skip.addEventListener("click", () => { setCompassStep(step + 1); renderBeliefQuestions(); });
  const next = beliefQuestionsEl.querySelector("#compassNext");
  if (next) next.addEventListener("click", () => { setCompassStep(step + 1); renderBeliefQuestions(); });
  const finish = beliefQuestionsEl.querySelector("#compassFinish");
  if (finish)
    finish.addEventListener("click", () => {
      compassState.submitted = true;
      updateCompassHash();
      renderBeliefQuestions();
      renderBeliefResults();
      beliefResults.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

function renderBeliefResults() {
  if (!compassState.submitted) {
    beliefResults.innerHTML = `
      <article class="belief-empty">
        <strong>ענו על השאלות ולחצו "הצג התאמות".</strong>
        <p>אפשר לענות רק על מה שחשוב לכם, ולסמן נושא כחשוב במיוחד כדי להעלות את משקלו.</p>
      </article>
    `;
    return;
  }

  const selectedOptions = selectedOptionObjects();
  if (!selectedOptions.length || typeof ElactionCompass === "undefined") {
    beliefResults.innerHTML = `
      <article class="belief-empty">
        <strong>לא נבחרו עמדות.</strong>
        <p>חזרו לשאלון ובחרו לפחות עמדה אחת כדי לראות התאמות.</p>
      </article>
    `;
    return;
  }

  const { ranked } = ElactionCompass.computeMatches(
    beliefQuestions,
    compassState.answers,
    compassState.weights,
    { topN: 5 },
  );

  const enriched = ranked
    .map((entry) => {
      const party = getPartyByName(entry.party);
      if (!party) return null;
      return {
        ...entry,
        party,
        reliability: getMatchReliability(party, selectedOptions),
        platformCoverage: getPlatformCoverage(party),
        integrity: getPartyIntegrity(party),
        attributions: entry.contributions.slice(0, 5),
      };
    })
    .filter(Boolean);

  const selectedSummary = selectedOptions
    .map((option) => {
      const weighted = compassState.weights[option.id] === 2 || compassState.weights[Object.keys(compassState.answers).find((k) => compassState.answers[k] === option.id)] === 2;
      return `<span class="chip">${option.label}${weighted ? " ×2" : ""}</span>`;
    })
    .join("");

  beliefResults.innerHTML = `
    <div class="belief-summary">
      <div>
        <strong>העמדות שבחרת</strong>
        <div>${selectedSummary}</div>
      </div>
      <button type="button" id="compassShare" class="compass-share">שתף תוצאה 🔗</button>
    </div>
    <div class="match-list">
      ${enriched
        .map(
          (entry, index) => `
            <article class="match-card">
              <div class="match-head">
                <span class="match-rank">${index + 1}</span>
                <div>
                  <h3>${entry.partyName || entry.party.name}</h3>
                  <p>${entry.party.plain.split(".")[0]}.</p>
                </div>
                <div class="match-score">
                  <strong>${entry.percent}%</strong>
                  <span>${reliabilityLabels[entry.reliability]}</span>
                  <small class="platform-badge confidence-${entry.platformCoverage.className}">${entry.platformCoverage.label}</small>
                  <small class="risk-badge risk-${entry.integrity.className}">${entry.integrity.label}</small>
                </div>
              </div>
              <div class="match-meter" aria-hidden="true"><span style="width: ${entry.percent}%"></span></div>
              <details class="match-details">
                <summary>למה ומה לבדוק</summary>
                <div class="match-detail-grid">
                  <div>
                    <strong>אילו תשובות נתנו ניקוד</strong>
                    <ul>
                      ${entry.attributions
                        .map(
                          (item) =>
                            `<li><strong>${item.questionTitle}:</strong> ${item.optionLabel} <span>${item.value}/3${item.weight === 2 ? " ×2" : ""}</span></li>`,
                        )
                        .join("")}
                    </ul>
                  </div>
                  <div>
                    <strong>דגלי אזהרה לפני שמחליטים</strong>
                    <ul>
                      ${entry.integrity.flags.map((item) => `<li>${item}</li>`).join("")}
                      ${entry.integrity.strengths.map((item) => `<li class="positive">${item}</li>`).join("")}
                    </ul>
                  </div>
                </div>
                <div class="source-links">
                  ${entry.party.sourceIds
                    .slice(0, 4)
                    .map((id) => sourceById[id])
                    .filter(Boolean)
                    .map(
                      (source) =>
                        `<a href="${source.url}" target="_blank" rel="noreferrer" data-grade="${source.grade}">${source.title}</a>`,
                    )
                    .join("")}
                </div>
              </details>
            </article>
          `,
        )
        .join("")}
    </div>
    <a class="compass-next-step" href="#race">
      <span>הצעד הבא</span>
      <strong>מפת הגושים — מי מגיע ל-61 מנדטים?</strong>
      <em>ראו איך המפלגות שהתאימו לכם מתחלקות לגושים והאם יש רוב ←</em>
    </a>
  `;

  const shareBtn = beliefResults.querySelector("#compassShare");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const encoded = ElactionCompass.encodeAnswers(compassState.answers, compassState.weights);
      const url = `${location.origin}${location.pathname}#compass=${encoded}`;
      try {
        await navigator.clipboard.writeText(url);
        shareBtn.textContent = "הקישור הועתק ✓";
      } catch (error) {
        // Clipboard can be blocked; fall back to putting the link in the address bar.
        history.replaceState(null, "", `#compass=${encoded}`);
        shareBtn.textContent = "הקישור בשורת הכתובת";
      }
      setTimeout(() => { shareBtn.textContent = "שתף תוצאה 🔗"; }, 2500);
    });
  }
}

// Restore a shared result from the URL hash (#compass=...), if present.
function restoreCompassFromHash() {
  if (typeof ElactionCompass === "undefined") return false;
  const match = location.hash.match(/compass=([^&]+)/);
  if (!match) return false;
  const { answers, weights } = ElactionCompass.decodeAnswers(decodeURIComponent(match[1]), beliefQuestions);
  if (!Object.keys(answers).length) return false;
  compassState.answers = answers;
  compassState.weights = weights;
  compassState.submitted = true;
  return true;
}


function matchesFilters(party) {
  const query = searchInput.value.trim().toLowerCase();
  const selectedIssue = issueFilter.value;
  const selectedStatus = statusFilter.value;
  const searchable = [
    party.name,
    party.leader,
    party.plain,
    ...party.done,
    ...party.friction,
    party.researchStatus || "",
    ...party.promises.map((promise) => promise.text),
  ]
    .join(" ")
    .toLowerCase();

  return (
    (!query || searchable.includes(query)) &&
    (selectedIssue === "all" || party.issues.includes(selectedIssue)) &&
    (selectedStatus === "all" || party.status === selectedStatus)
  );
}

function getExpectedMandates(party) {
  return pollByParty[party.name]?.mandates ?? null;
}

function getDisplayName(party) {
  return party.displayName || party.name;
}

function sortParties(list) {
  const selectedSort = sortFilter.value;
  return [...list].sort((a, b) => {
    if (selectedSort === "name") {
      return getDisplayName(a).localeCompare(getDisplayName(b), "he");
    }
    if (selectedSort === "confidence") {
      const confidenceScore = { high: 3, medium: 2, low: 1 };
      return (confidenceScore[b.confidence || "medium"] || 0) - (confidenceScore[a.confidence || "medium"] || 0);
    }
    if (selectedSort === "risk") {
      return getPartyIntegrity(b).score - getPartyIntegrity(a).score || getDisplayName(a).localeCompare(getDisplayName(b), "he");
    }
    const aMandates = getExpectedMandates(a);
    const bMandates = getExpectedMandates(b);
    if (aMandates === null && bMandates === null) {
      return getDisplayName(a).localeCompare(getDisplayName(b), "he");
    }
    if (aMandates === null) {
      return 1;
    }
    if (bMandates === null) {
      return -1;
    }
    return bMandates - aMandates || getDisplayName(a).localeCompare(getDisplayName(b), "he");
  });
}

// Build a "verified · grade" trust chip for any record that has sourceIds.
// A claim is only as strong as its best source (methodology A–E); the date is
// the record's own checkedAt when present, otherwise the dataset review date.
function trustChipFor(record) {
  if (typeof ElactionTrust === "undefined") return "";
  const grade = ElactionTrust.bestGrade(record.sourceIds, sourceById);
  return ElactionTrust.trustChipHtml({
    grade,
    gradeLabel: grade ? reliabilityLabels[grade] : "",
    verifiedAt: record.checkedAt || researchMeta.reviewedAt,
  });
}

function renderParties() {
  const visibleParties = sortParties(parties.filter(matchesFilters));

  partyGrid.innerHTML =
    visibleParties
      .map((party) => {
        const partySources = party.sourceIds
          .map((id) => sourceById[id])
          .filter(Boolean)
          .map(
            (source) =>
              `<a href="${source.url}" target="_blank" rel="noreferrer" data-grade="${source.grade}">${source.title}</a>`,
          )
          .join("");
        const confidence = party.confidence || "medium";
        const integrity = getPartyIntegrity(party);
        const expectedMandates = getExpectedMandates(party);
        const pollChip =
          expectedMandates === null
            ? `<span class="chip confidence-low">אין ממוצע סקרים</span>`
            : `<span class="mandate-chip"><strong>${pollByParty[party.name].display}</strong><small>מנדטים צפויים</small></span>`;

        return `
          <article class="party-card">
            <div class="party-top" data-color="${party.color}">
              <div class="party-meta">
                <span class="chip">${statusLabels[party.status]}</span>
                <span class="chip">${party.leader}</span>
                <span class="chip confidence-${confidence}">${confidenceLabels[confidence]}</span>
                <span class="chip risk-${integrity.className}">${integrity.label}</span>
                ${trustChipFor(party)}
              </div>
              <div class="party-title-row">
                <h3>${getDisplayName(party)}</h3>
                ${pollChip}
              </div>
              <p class="plain">${party.plain.split(".")[0]}.</p>
            </div>
            <div class="party-body">
              <div class="truth-strip risk-${integrity.className}">
                <strong>${integrity.label}</strong>
                <p>${integrity.flags[0]}</p>
              </div>
              <details class="compact-details">
                <summary>פירוט מחקר</summary>
                <p class="research-note">${party.researchStatus || "מחקר ראשוני: נדרש המשך הצלבה מול חקיקה, הצבעות ומסמכי מפלגה עדכניים."}</p>
                <div class="evidence-block truth-check">
                  <strong>דגלי אזהרה ואמינות</strong>
                  <ul>
                    ${integrity.flags.map((item) => `<li>${item}</li>`).join("")}
                    ${integrity.strengths.map((item) => `<li class="positive">${item}</li>`).join("")}
                  </ul>
                </div>
                <div class="evidence-block">
                  <strong>מה נעשה או קודם בפועל</strong>
                  <ul>${party.done.map((item) => `<li>${item}</li>`).join("")}</ul>
                </div>
                <div class="evidence-block">
                  <strong>פערים וסימני שאלה</strong>
                  <ul>${party.friction.map((item) => `<li>${item}</li>`).join("")}</ul>
                </div>
                <div class="source-links">${partySources}</div>
              </details>
            </div>
          </article>
        `;
      })
      .join("") || `<p class="plain">לא נמצאו מפלגות שמתאימות לסינון הנוכחי.</p>`;

  renderPromises(visibleParties);
}

function renderPromises(visibleParties = parties) {
  if (!promiseTable) return; // comparison table removed (redundant with pledges)
  promiseTable.innerHTML = visibleParties
    .flatMap((party) =>
      party.promises.map(
        (promise) => `
          <div class="promise-row">
            <strong>${party.name}</strong>
            <span>${promise.text}</span>
            <span class="promise-status ${promise.status}">${promise.label}</span>
          </div>
        `,
      ),
    )
    .join("");
}

function renderIssueLab() {
  const selectedIssue = issueLabFilter.value || issues[0]?.id;
  const relevantParties = parties
    .filter((party) => party.issues.includes(selectedIssue))
    .sort((a, b) => {
      const aMandates = getExpectedMandates(a) ?? -1;
      const bMandates = getExpectedMandates(b) ?? -1;
      return bMandates - aMandates || getDisplayName(a).localeCompare(getDisplayName(b), "he");
    })
    .slice(0, 8);

  issueLabGrid.innerHTML =
    relevantParties
      .map((party) => {
        const issuePledges = pledgeChecks.filter((pledge) => pledge.party === party.name && pledge.issue === selectedIssue);
        const issueMisinfo = getPartyMisinfo(party).filter((check) => check.issue === selectedIssue || check.issue === "democracy");
        const integrity = getPartyIntegrity(party);
        const expectedMandates = getExpectedMandates(party);
        const topPledge = issuePledges[0];
        const topMisinfo = issueMisinfo[0];
        const sourceLinks = [...new Set([...(party.sourceIds || []), ...(topPledge?.sourceIds || []), ...(topMisinfo?.sourceIds || [])])]
          .slice(0, 4)
          .map((id) => sourceById[id])
          .filter(Boolean)
          .map(
            (source) =>
              `<a href="${source.url}" target="_blank" rel="noreferrer" data-grade="${source.grade}">${source.title}</a>`,
          )
          .join("");

        return `
          <article class="issue-lab-card">
            <div class="issue-lab-head">
              <div>
                <span class="chip">${statusLabels[party.status]}</span>
                <span class="chip confidence-${party.confidence || "medium"}">${confidenceLabels[party.confidence || "medium"]}</span>
                <span class="chip risk-${integrity.className}">${integrity.label}</span>
              </div>
              ${
                expectedMandates === null
                  ? `<span class="chip confidence-low">אין ממוצע</span>`
                  : `<span class="mandate-chip"><strong>${pollByParty[party.name].display}</strong><small>מנדטים</small></span>`
              }
            </div>
            <h3>${getDisplayName(party)}</h3>
            <p>${party.plain.split(".")[0]}.</p>
            <div class="issue-lab-evidence">
              <div>
                <strong>עמדה/רקורד</strong>
                <span>${topPledge ? `${pledgeStatusLabels[topPledge.status]} · ${topPledge.finding.split(".")[0]}.` : "אין עדיין בדיקת הבטחה ממוקדת לנושא הזה."}</span>
              </div>
              <div>
                <strong>אזהרת אמינות</strong>
                <span>${topMisinfo ? `${misinfoStatusLabels[topMisinfo.status]} · ${topMisinfo.claim}` : integrity.flags[0]}</span>
              </div>
            </div>
            <details class="compact-details">
              <summary>מקורות והרחבה</summary>
              <div class="source-links">${sourceLinks}</div>
            </details>
          </article>
        `;
      })
      .join("") || `<p class="plain">אין עדיין מפלגות שמסומנות תחת הנושא הזה.</p>`;
}

function matchesPledgeFilters(pledge, options = {}) {
  const query = pledgeSearchInput.value.trim().toLowerCase();
  const selectedIssue = pledgeIssueFilter.value;
  const selectedParty = pledgePartyFilter.value;
  const selectedStatus = pledgeStatusFilter.value;
  const sourceText = pledge.sourceIds
    .map((id) => sourceById[id])
    .filter(Boolean)
    .map((source) => `${source.title} ${source.note || ""}`)
    .join(" ");
  const searchable = [
    pledge.party,
    pledge.promise,
    pledge.claim,
    pledge.finding,
    pledge.next,
    sourceText,
  ]
    .join(" ")
    .toLowerCase();

  return (
    (!query || searchable.includes(query)) &&
    (options.ignoreIssue || selectedIssue === "all" || pledge.issue === selectedIssue) &&
    (selectedParty === "all" || pledge.party === selectedParty) &&
    (selectedStatus === "all" || pledge.status === selectedStatus)
  );
}

function renderPledgeFocusStats(visiblePledges, topicPledges) {
  const focusedIssues = ["security", "cost", "democracy", "religion", "society", "environment"];
  const statusCounts = visiblePledges.reduce((counts, pledge) => {
    counts[pledge.status] = (counts[pledge.status] || 0) + 1;
    return counts;
  }, {});

  const issueStats = focusedIssues.map((issueId) => {
    const issue = issues.find((item) => item.id === issueId);
    const count = topicPledges.filter((pledge) => pledge.issue === issueId).length;
    return { issue, count };
  });

  pledgeFocusStats.innerHTML = `
    <article class="pledge-focus-stat featured">
      <strong>${visiblePledges.length}</strong>
      <span>הבטחות בבדיקה לפי הסינון הנוכחי</span>
    </article>
    <article class="pledge-focus-stat">
      <strong>${statusCounts.done || 0}</strong>
      <span>קוים</span>
    </article>
    <article class="pledge-focus-stat">
      <strong>${(statusCounts.partial || 0) + (statusCounts.open || 0)}</strong>
      <span>חלקי או פתוח</span>
    </article>
    <article class="pledge-focus-stat">
      <strong>${(statusCounts.review || 0) + (statusCounts.blocked || 0)}</strong>
      <span>דורש בדיקה או לא קוים</span>
    </article>
    <div class="pledge-topic-strip">
      ${issueStats
        .map(
          ({ issue, count }) => `
            <button type="button" data-pledge-issue="${issue.id}" aria-pressed="${pledgeIssueFilter.value === issue.id}">
              <span>${issue.title}</span>
              <strong>${count}</strong>
            </button>
          `,
        )
        .join("")}
    </div>
  `;

  pledgeFocusStats.querySelectorAll("[data-pledge-issue]").forEach((button) => {
    button.addEventListener("click", () => {
      pledgeIssueFilter.value = pledgeIssueFilter.value === button.dataset.pledgeIssue ? "all" : button.dataset.pledgeIssue;
      renderPledgeLedger();
    });
  });
}

// Render the official Knesset record(s) a pledge is linked to — the methodology's
// "מקור ביצוע": a real bill with its live status and a link to the source.
function officialRecordHtml(pledge) {
  const bills = (pledge.billRefs || []).map((id) => billById[id]).filter(Boolean);
  if (!bills.length) return "";
  const items = bills
    .map(
      (bill) => `
        <li class="official-bill">
          <a href="${bill.knessetUrl || bill.source?.recordUrl}" target="_blank" rel="noreferrer">${bill.name}</a>
          <span class="official-status">${bill.statusDesc || "סטטוס לא ידוע"}</span>
        </li>`,
    )
    .join("");
  return `
    <div class="official-record">
      <dt>מקור ביצוע רשמי · הכנסת</dt>
      <dd><ul class="official-bill-list">${items}</ul></dd>
    </div>`;
}

function renderPledgeLedger() {
  const visiblePledges = pledgeChecks.filter(matchesPledgeFilters);
  const topicPledges = pledgeChecks.filter((pledge) => matchesPledgeFilters(pledge, { ignoreIssue: true }));
  renderPledgeFocusStats(visiblePledges, topicPledges);

  pledgeLedger.innerHTML =
    visiblePledges
      .map((pledge) => {
        const sourceLinks = pledge.sourceIds
          .map((id) => sourceById[id])
          .filter(Boolean)
          .map(
            (source) =>
              `<a href="${source.url}" target="_blank" rel="noreferrer" data-grade="${source.grade}">${source.title}</a>`,
          )
          .join("");

        return `
          <article class="pledge-card">
            <div class="pledge-card-head">
              <div>
                <span class="chip">${pledge.party}</span>
                <span class="chip">${issues.find((issue) => issue.id === pledge.issue)?.title || "כללי"}</span>
                <span class="chip confidence-${pledge.confidence}">${confidenceLabels[pledge.confidence]}</span>
                ${trustChipFor(pledge)}
              </div>
              <span class="promise-status ${pledge.status}">${pledgeStatusLabels[pledge.status]}</span>
            </div>
            <h3>${pledge.promise}</h3>
            <p class="pledge-short">${pledge.finding.split(".")[0]}.</p>
            <details class="compact-details">
              <summary>הרחבת בדיקה</summary>
              <dl>
                <div>
                  <dt>מה המפלגה אומרת</dt>
                  <dd>${pledge.claim}</dd>
                </div>
                <div>
                  <dt>מה נמצא בפועל</dt>
                  <dd>${pledge.finding}</dd>
                </div>
                ${officialRecordHtml(pledge)}
                <div>
                  <dt>השלמת מחקר נדרשת</dt>
                  <dd>${pledge.next}</dd>
                </div>
              </dl>
              <div class="source-links">${sourceLinks}</div>
            </details>
          </article>
        `;
      })
      .join("") || `<p class="plain">לא נמצאו הבטחות שמתאימות לסינון הנוכחי.</p>`;
}

function matchesMisinfoFilters(check) {
  const selectedParty = misinfoPartyFilter.value;
  const selectedSeverity = misinfoSeverityFilter.value;
  const selectedStatus = misinfoStatusFilter.value;

  return (
    (selectedParty === "all" || check.party === selectedParty) &&
    (selectedSeverity === "all" || check.severity === selectedSeverity) &&
    (selectedStatus === "all" || check.status === selectedStatus)
  );
}

function renderMisinfoChecks() {
  const visibleChecks = misinfoChecks.filter(matchesMisinfoFilters);

  misinfoList.innerHTML =
    visibleChecks
      .map((check) => {
        const issue = issues.find((item) => item.id === check.issue);
        const sourceLinks = check.sourceIds
          .map((id) => sourceById[id])
          .filter(Boolean)
          .map(
            (source) =>
              `<a href="${source.url}" target="_blank" rel="noreferrer" data-grade="${source.grade}">${source.title}</a>`,
          )
          .join("");

        return `
          <article class="misinfo-card severity-${check.severity}">
            <div class="misinfo-card-head">
              <div>
                <span class="chip">${check.party}</span>
                <span class="chip">${issue?.title || "כללי"}</span>
                <span class="chip confidence-${check.confidence}">${confidenceLabels[check.confidence]}</span>
              </div>
              <div>
                <span class="promise-status ${check.status}">${misinfoStatusLabels[check.status]}</span>
                <span class="severity-pill severity-${check.severity}">${severityLabels[check.severity]}</span>
              </div>
            </div>
            <h3>${check.claim}</h3>
            <p class="misinfo-actor">${check.actor}</p>
            <p class="misinfo-truth-short"><strong>האמת בקצרה:</strong> ${check.truth.split(".")[0]}.</p>
            <details class="compact-details">
              <summary>פירוט ומקורות</summary>
              <dl>
                <div>
                  <dt>האמת בפועל</dt>
                  <dd>${check.truth}</dd>
                </div>
                <div>
                  <dt>למה זה חשוב</dt>
                  <dd>${check.whyItMatters}</dd>
                </div>
              </dl>
              <div class="source-links">${sourceLinks}</div>
            </details>
          </article>
        `;
      })
      .join("") || `<p class="plain">לא נמצאו כרטיסי פייק שמתאימים לסינון הנוכחי.</p>`;
}

function renderSources() {
  sourceList.innerHTML = Object.values(sourceById)
    .map(
      (source) => `
        <article class="source-card">
          <a href="${source.url}" target="_blank" rel="noreferrer">${source.title}</a>
          ${source.note ? `<p>${source.note}</p>` : ""}
          <span class="grade">דירוג ${source.grade} · ${source.type}</span>
        </article>
      `,
    )
    .join("");
}

function renderReliability() {
  reliabilityGrid.innerHTML = reliabilityLevels
    .map(
      (level) => `
        <article class="reliability-card">
          <strong>${level.grade} · ${level.title}</strong>
          <p>${level.text}</p>
        </article>
      `,
    )
    .join("");
}

function renderResearchPlan() {
  if (!researchPlanGrid) return; // meta section removed from the voter-facing layout
  const allSources = Object.values(sourceById);
  const gradeCounts = allSources.reduce((counts, source) => {
    counts[source.grade] = (counts[source.grade] || 0) + 1;
    return counts;
  }, {});
  const officialSources = allSources.filter((source) => source.grade === "A").length;
  const weakSources = allSources.filter((source) => source.grade === "D" || source.grade === "E").length;

  researchStats.innerHTML = [
    { value: parties.length, label: "מפלגות ורשימות במעקב" },
    { value: allSources.length, label: "מקורות במאגר" },
    { value: officialSources, label: "מקורות רשמיים בדרגה A" },
    { value: weakSources, label: "מקורות פרשנות/הטיה שלא עומדים לבד" },
  ]
    .map(
      (stat) => `
        <article class="research-stat">
          <strong>${stat.value}</strong>
          <span>${stat.label}</span>
        </article>
      `,
    )
    .join("");

  researchPlanGrid.innerHTML = researchPhases
    .map(
      (phase) => `
        <article class="research-step">
          <span>${phase.title}</span>
          <p>${phase.text}</p>
        </article>
      `,
    )
    .join("");
}

function renderDailyUpdates() {
  if (!dailyUpdateList) return; // section removed in the streamlined layout
  dailyUpdateList.innerHTML = getSortedUpdates()
    .map((update) => {
      const updateSources = update.sourceIds
        .map((id) => sourceById[id])
        .filter(Boolean)
        .map(
          (source) =>
            `<a href="${source.url}" target="_blank" rel="noreferrer" data-grade="${source.grade}">${source.title}</a>`,
        )
        .join("");

      return `
        <article class="daily-update-card">
          <div class="daily-update-head">
            <strong>${update.date}</strong>
            <span class="chip confidence-high">דירוג מקור ${update.reliability}</span>
          </div>
          <h3>${update.status}</h3>
          <p>${update.summary}</p>
          <div class="source-links">${updateSources}</div>
        </article>
      `;
    })
    .join("");
}

function renderElectionFeed() {
  if (!electionFeedList) return; // floating feed removed
  const latestUpdates = getSortedUpdates().slice(0, 6);

  if (!latestUpdates.length) {
    electionFeedList.innerHTML = `
      <div class="election-feed-stream">
        <article class="election-feed-item">
          <strong>אין עדכונים מהותיים כרגע</strong>
          <p>הבדיקה היומית תופיע כאן כשיהיו שינויים רלוונטיים.</p>
        </article>
      </div>
    `;
    return;
  }

  const renderFeedItem = (update, duplicate = false) => {
    const summary = update.summary.split(".")[0];
    const source = update.sourceIds.map((id) => sourceById[id]).find(Boolean);

    return `
      <article class="election-feed-item"${duplicate ? ' aria-hidden="true"' : ""}>
        <div class="election-feed-meta">
          <span>${update.date}</span>
          <span>${reliabilityLabels[update.reliability] || update.reliability}</span>
          ${source ? `<span>${source.type}</span>` : ""}
        </div>
        <strong>${update.status}</strong>
        <p>${summary}.</p>
      </article>
    `;
  };

  electionFeedList.innerHTML = `
    <div class="election-feed-stream">
      ${latestUpdates.map((update) => renderFeedItem(update)).join("")}
      ${latestUpdates.map((update) => renderFeedItem(update, true)).join("")}
    </div>
  `;
}

function replaceArray(target, nextValue) {
  if (!Array.isArray(nextValue)) {
    return;
  }
  target.splice(0, target.length, ...nextValue);
}

function replaceObject(target, nextValue) {
  if (!nextValue || typeof nextValue !== "object") {
    return;
  }
  Object.keys(target).forEach((key) => delete target[key]);
  Object.assign(target, nextValue);
}

function rebuildIndexes(extraSources = []) {
  const allSources = [...sources, ...extraSources].filter(Boolean);
  sourceById = Object.fromEntries(allSources.map((source) => [source.id, source]));
  pollByParty = Object.fromEntries(pollSnapshot.map((poll) => [poll.party, poll]));
}

function renderAll() {
  renderIssues();
  renderPublicDiscourse();
  renderIssueLab();
  renderRace();
  renderBeliefQuestions();
  renderBeliefResults();
  populatePledgeFilters();
  populateMisinfoFilters();
  renderResearchPlan();
  renderDailyUpdates();
  renderElectionFeed();
  renderReliability();
  renderSources();
  renderParties();
  renderPledgeLedger();
  renderMisinfoChecks();
}

// Dataset-level metadata (e.g. reviewedAt) — used as the fallback "verified"
// date for any claim that lacks its own checkedAt stamp.
let researchMeta = {};
// Official Knesset bills linked to pledges, indexed by id (e.g. "bill-2197909").
let billById = {};

function applyResearchData(researchData) {
  researchMeta = researchData.meta || {};
  billById = Object.fromEntries((researchData.linkedBills || []).map((bill) => [bill.id, bill]));
  replaceArray(issues, researchData.taxonomy?.issues);
  replaceArray(publicDiscourseThemes, researchData.discourse);
  replaceArray(beliefQuestions, researchData.questionnaire);
  replaceArray(researchPhases, researchData.researchPlan);
  replaceArray(dailyUpdates, researchData.updates);
  replaceArray(electionRunners, researchData.runners);
  replaceArray(pollSnapshot, researchData.polls);
  replaceArray(parties, researchData.parties);
  replaceArray(pledgeChecks, researchData.pledgeChecks);
  replaceArray(misinfoChecks, researchData.misinfoChecks);
  replaceArray(sources, researchData.sources);

  replaceObject(statusLabels, researchData.taxonomy?.labels?.status);
  replaceObject(confidenceLabels, researchData.taxonomy?.labels?.confidence);
  replaceObject(reliabilityLabels, researchData.taxonomy?.labels?.reliability);
  replaceObject(pledgeStatusLabels, researchData.taxonomy?.labels?.pledgeStatus);
  replaceObject(misinfoStatusLabels, researchData.taxonomy?.labels?.misinfoStatus);
  replaceObject(severityLabels, researchData.taxonomy?.labels?.severity);

  // Taxonomy config now also lives in the JSON so it stays the single source of
  // truth; these two were previously hard-coded and are safe to skip if absent.
  replaceArray(reliabilityLevels, researchData.taxonomy?.reliabilityLevels);
  replaceObject(runnerStatuses, researchData.taxonomy?.runnerStatuses);

  rebuildIndexes(researchData.enrichedSources || []);
}

// data/election-research.json is now the single source of truth: the page
// fetches it on load and renders from it, instead of shipping a hard-coded copy
// inside this file. Must be served over http(s) — opening index.html via file://
// blocks the fetch. See tools/serve.js / `npm run serve`.
async function loadResearchData() {
  if (dataRefreshStatus) {
    dataRefreshStatus.textContent = "טוען נתוני מחקר...";
  }

  const response = await fetch(`data/election-research.json?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function initApp() {
  try {
    const researchData = await loadResearchData();
    applyResearchData(researchData);
    // A shared #compass=... link should open straight to its results.
    restoreCompassFromHash();
    renderAll();

    const reviewedAt = researchData.meta?.reviewedAt || "לא ידוע";
    const pollsAt = researchData.meta?.pollsUpdatedAt;
    const updateCount = researchData.updates?.length || 0;
    if (dataRefreshStatus) {
      // Polls refresh more often than the editorial review, so show both dates.
      const pollsPart = pollsAt ? ` · סקרים עודכנו ${pollsAt}` : "";
      dataRefreshStatus.textContent = `המחקר נטען · נבדק ${reviewedAt}${pollsPart} · ${updateCount} עדכונים במאגר`;
    }
  } catch (error) {
    if (dataRefreshStatus) {
      dataRefreshStatus.textContent =
        "לא ניתן היה לטעון את נתוני המחקר. ודאו שהאתר מוגש משרת (npm run serve) ולא נפתח כקובץ מקומי.";
    }
    // Surface the failure instead of silently showing an empty page.
    console.error("Failed to load research data:", error);
  }
}

// Hydrate from JSON, then render. If the fetch fails the static index.html
// shells remain in place alongside a visible error, rather than a broken render.
initApp();

[searchInput, issueFilter, statusFilter, sortFilter].forEach((control) => {
  control.addEventListener("input", renderParties);
});

issueLabFilter.addEventListener("input", renderIssueLab);

[pledgeSearchInput, pledgeIssueFilter, pledgePartyFilter, pledgeStatusFilter].forEach((control) => {
  control.addEventListener("input", renderPledgeLedger);
});

[misinfoPartyFilter, misinfoSeverityFilter, misinfoStatusFilter].forEach((control) => {
  control.addEventListener("input", renderMisinfoChecks);
});

function updateBackToTopVisibility() {
  backToTop.classList.toggle("is-visible", window.scrollY > 520);
}

window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

updateBackToTopVisibility();

resetBeliefs.addEventListener("click", () => {
  compassState.answers = {};
  compassState.weights = {};
  compassState.step = 0;
  compassState.submitted = false;
  history.replaceState(null, "", location.pathname + location.search);
  renderBeliefQuestions();
  renderBeliefResults();
});
