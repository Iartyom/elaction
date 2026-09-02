// Phase 2 — the trust layer.
// Pure helpers that turn a claim's sources + verification date into the little
// "verified · grade" chips the site shows next to facts. The methodology grades
// sources A–E; a claim is only as strong as its best source, so that's what we
// surface, alongside how fresh the check is. Loaded in the browser as
// window.ElactionTrust and required directly in tests (no DOM, no deps).
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.ElactionTrust = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const GRADE_ORDER = ["A", "B", "C", "D", "E"]; // A is strongest

  // Map a source grade to the site's confidence class (drives chip color).
  function reliabilityClass(grade) {
    if (grade === "A") return "high";
    if (grade === "B") return "medium";
    if (grade === "C") return "low";
    return "watch"; // D / E / unknown: never stands alone
  }

  // The strongest grade among a claim's sources, or null if none resolve.
  function bestGrade(sourceIds, sourceById) {
    let best = null;
    for (const id of sourceIds || []) {
      const grade = sourceById[id] && sourceById[id].grade;
      const rank = GRADE_ORDER.indexOf(grade);
      if (rank === -1) continue;
      if (best === null || rank < GRADE_ORDER.indexOf(best)) {
        best = grade;
      }
    }
    return best;
  }

  // Parse the Hebrew dd.m.yyyy dates used throughout the dataset.
  function parseHebrewDate(value) {
    if (!value) return null;
    const iso = Date.parse(value);
    if (!Number.isNaN(iso) && /\d{4}-\d{2}-\d{2}/.test(value)) return new Date(iso);
    const m = String(value).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (!m) return null;
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  }

  // How stale is a verification date, relative to `now`.
  function freshness(dateValue, now = new Date(), opts = {}) {
    const freshDays = opts.freshDays ?? 14;
    const staleDays = opts.staleDays ?? 60;
    const date = parseHebrewDate(dateValue);
    if (!date) return { level: "unknown", days: null };
    const days = Math.floor((now - date) / 86400000);
    if (days < 0) return { level: "fresh", days: 0 };
    if (days <= freshDays) return { level: "fresh", days };
    if (days <= staleDays) return { level: "aging", days };
    return { level: "stale", days };
  }

  // Human "last verified" label in Hebrew.
  function verifiedLabel(dateValue) {
    const date = parseHebrewDate(dateValue);
    if (!date) return "טרם אומת";
    const dd = date.getDate();
    const mm = date.getMonth() + 1;
    const yyyy = date.getFullYear();
    return `נבדק ${dd}.${mm}.${yyyy}`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
    );
  }

  // Build the trust chip markup for a claim. Pure string → easy to unit test.
  // grade: best source grade; verifiedAt: date value; now: reference date.
  function trustChipHtml({ grade, gradeLabel, verifiedAt, now = new Date() }) {
    const cls = reliabilityClass(grade);
    const fresh = freshness(verifiedAt, now);
    const gradeText = grade ? `${grade} · ${gradeLabel || ""}`.trim() : "ללא מקור מדורג";
    const verified = verifiedLabel(verifiedAt);
    return (
      `<span class="trust-chip trust-${cls} fresh-${fresh.level}" ` +
      `title="${escapeHtml(gradeText)} — ${escapeHtml(verified)}">` +
      `<span class="trust-grade">${escapeHtml(grade || "—")}</span>` +
      `<span class="trust-verified">${escapeHtml(verified)}</span>` +
      `</span>`
    );
  }

  return {
    GRADE_ORDER,
    reliabilityClass,
    bestGrade,
    parseHebrewDate,
    freshness,
    verifiedLabel,
    trustChipHtml,
  };
});
