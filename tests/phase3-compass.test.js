// Phase 3 — the compass engine: computed, weighted, auditable, shareable.
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../tools/compass.js");

const questions = [
  {
    id: "security",
    title: "ביטחון",
    options: [
      { id: "hard", label: "הכרעה", reason: "r1", matches: { Alef: 3, Bet: 1 } },
      { id: "soft", label: "הסדרה", reason: "r2", matches: { Gimel: 3, Bet: 2 } },
    ],
  },
  {
    id: "economy",
    title: "כלכלה",
    options: [
      { id: "market", label: "שוק", reason: "r3", matches: { Alef: 2, Bet: 3 } },
      { id: "welfare", label: "רווחה", reason: "r4", matches: { Gimel: 2 } },
    ],
  },
];

test("computeMatches ranks parties and reports percents", () => {
  const { ranked, answeredCount, maxScore } = C.computeMatches(
    questions,
    { security: "hard", economy: "market" },
    {},
  );
  assert.equal(answeredCount, 2);
  assert.equal(maxScore, 6); // 3 + 3, weight 1
  // Alef: 3+2=5, Bet: 1+3=4, Gimel: 0
  assert.equal(ranked[0].party, "Alef");
  assert.equal(ranked[0].score, 5);
  assert.equal(ranked[0].percent, 83); // 5/6
  assert.equal(ranked[1].party, "Bet");
});

test("weighting doubles a question's contribution and its max", () => {
  const base = C.computeMatches(questions, { security: "soft" }, {});
  const weighted = C.computeMatches(questions, { security: "soft" }, { security: 2 });
  const gimelBase = base.ranked.find((r) => r.party === "Gimel").score;
  const gimelWeighted = weighted.ranked.find((r) => r.party === "Gimel").score;
  assert.equal(gimelWeighted, gimelBase * 2);
  assert.equal(weighted.maxScore, 6); // 3 * 2
});

test("contributions explain each score (auditable)", () => {
  const { ranked } = C.computeMatches(questions, { security: "hard", economy: "market" }, { security: 2 });
  const alef = ranked.find((r) => r.party === "Alef");
  const security = alef.contributions.find((c) => c.questionId === "security");
  assert.equal(security.value, 3);
  assert.equal(security.weight, 2);
  assert.equal(security.points, 6);
});

test("unanswered questions and unknown options are ignored", () => {
  const { answeredCount } = C.computeMatches(questions, { security: "nope", missing: "x" }, {});
  assert.equal(answeredCount, 0);
});

test("encode/decode round-trips answers and weights", () => {
  const answers = { security: "hard", economy: "welfare" };
  const weights = { security: 2 };
  const encoded = C.encodeAnswers(answers, weights);
  assert.equal(encoded, "security=hard!;economy=welfare");
  const decoded = C.decodeAnswers(encoded, questions);
  assert.deepEqual(decoded.answers, answers);
  assert.deepEqual(decoded.weights, weights);
});

test("decodeAnswers rejects stale question/option ids", () => {
  const decoded = C.decodeAnswers("security=hard;ghost=old;economy=badopt", questions);
  assert.deepEqual(decoded.answers, { security: "hard" });
});
