// Phase 3 — the compass scoring engine.
// Pure, deterministic matching so a result is computed and auditable (not a
// black box): given the questionnaire, the voter's answers, and which questions
// they marked as extra-important (weight ×2), it returns a ranked list of
// parties with the per-answer contributions that produced each score.
// Loaded in the browser as window.ElactionCompass; required directly in tests.
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.ElactionCompass = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MAX_OPTION_VALUE = 3; // strongest single-question affinity in the data

  // questions: [{id, title, options:[{id, label, matches:{party:value}, reason}]}]
  // answers:   { questionId: optionId }
  // weights:   { questionId: 1 | 2 }  (a voter can double-weight what matters)
  function computeMatches(questions, answers, weights = {}, opts = {}) {
    const topN = opts.topN ?? 5;
    const byId = Object.fromEntries(questions.map((q) => [q.id, q]));

    const scores = new Map();
    const contributions = new Map();
    let maxScore = 0;
    let answeredCount = 0;

    Object.keys(answers).forEach((qid) => {
      const question = byId[qid];
      if (!question) return;
      const option = question.options.find((o) => o.id === answers[qid]);
      if (!option) return;

      answeredCount += 1;
      const weight = weights[qid] === 2 ? 2 : 1;
      maxScore += MAX_OPTION_VALUE * weight;

      Object.entries(option.matches || {}).forEach(([party, value]) => {
        const points = value * weight;
        scores.set(party, (scores.get(party) || 0) + points);
        if (!contributions.has(party)) contributions.set(party, []);
        contributions.get(party).push({
          questionId: qid,
          questionTitle: question.title,
          optionId: option.id,
          optionLabel: option.label,
          value,
          weight,
          points,
          reason: option.reason,
        });
      });
    });

    const ranked = [...scores.entries()]
      .map(([party, score]) => ({
        party,
        score,
        percent: maxScore ? Math.round((score / maxScore) * 100) : 0,
        contributions: contributions.get(party).sort((a, b) => b.points - a.points),
      }))
      .sort((a, b) => b.score - a.score || a.party.localeCompare(b.party, "he"));

    return { ranked: ranked.slice(0, topN), answeredCount, maxScore };
  }

  // Compact, human-legible encoding for a shareable URL hash.
  // { security:"hardline" } weighted → "security=hardline!;cost=welfare"
  function encodeAnswers(answers, weights = {}) {
    return Object.keys(answers)
      .filter((qid) => answers[qid])
      .map((qid) => `${qid}=${answers[qid]}${weights[qid] === 2 ? "!" : ""}`)
      .join(";");
  }

  // Parse the hash back, keeping only questions/options that still exist.
  function decodeAnswers(encoded, questions) {
    const answers = {};
    const weights = {};
    if (!encoded) return { answers, weights };
    const valid = questions
      ? Object.fromEntries(questions.map((q) => [q.id, new Set(q.options.map((o) => o.id))]))
      : null;
    encoded.split(";").forEach((pair) => {
      const m = pair.match(/^([^=]+)=(.+?)(!)?$/);
      if (!m) return;
      const [, qid, oid, weighted] = m;
      if (valid && (!valid[qid] || !valid[qid].has(oid))) return;
      answers[qid] = oid;
      if (weighted) weights[qid] = 2;
    });
    return { answers, weights };
  }

  return { MAX_OPTION_VALUE, computeMatches, encodeAnswers, decodeAnswers };
});
