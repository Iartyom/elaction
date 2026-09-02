// Coalition / bloc math — the question an Israeli voter actually asks:
// not "how many seats does each party get" but "which camp reaches 61, and
// which governments are formable". Groups the dataset's granular poll blocs into
// three camps, applies the electoral threshold, and sums seats. Pure + tested;
// loaded in the browser as window.ElactionCoalition.
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.ElactionCoalition = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const TOTAL = 120;
  const MAJORITY = 61;
  // The 3.25% threshold is ~3.9 seats; a list needs to round to 4 to enter.
  const THRESHOLD_SEATS = 4;

  const CAMP_LABELS = {
    netanyahu: "גוש נתניהו",
    center: "גוש השינוי",
    arab: "רשימות ערביות",
  };
  const CAMP_ORDER = ["netanyahu", "center", "arab"];

  // Collapse a granular bloc label into one of the three governing camps.
  function campFor(bloc) {
    const b = bloc || "";
    if (b.includes("נתניהו")) return "netanyahu";
    if (b.includes("ערבי")) return "arab";
    return "center";
  }

  // polls: [{ party, mandates, bloc }]. Returns camp seat totals (threshold applied).
  function computeBlocs(polls, opts = {}) {
    const threshold = opts.thresholdSeats ?? THRESHOLD_SEATS;
    const camps = { netanyahu: [], center: [], arab: [] };

    (polls || []).forEach((poll) => {
      if (poll.mandates == null) return;
      const seats = Math.round(poll.mandates);
      const passes = seats >= threshold;
      camps[campFor(poll.bloc)].push({ party: poll.party, seats, passes });
    });

    const result = CAMP_ORDER.map((id) => {
      const parties = camps[id].sort((a, b) => b.seats - a.seats);
      const seats = parties.filter((p) => p.passes).reduce((sum, p) => sum + p.seats, 0);
      return { id, label: CAMP_LABELS[id], seats, parties, reachesMajority: seats >= MAJORITY };
    }).sort((a, b) => b.seats - a.seats);

    return { camps: result, majority: MAJORITY, total: TOTAL };
  }

  // Which pairs of camps together clear the majority line.
  function coalitions(camps, majority = MAJORITY) {
    const out = [];
    for (let i = 0; i < camps.length; i += 1) {
      for (let j = i + 1; j < camps.length; j += 1) {
        const seats = camps[i].seats + camps[j].seats;
        out.push({
          ids: [camps[i].id, camps[j].id],
          labels: [camps[i].label, camps[j].label],
          seats,
          reaches: seats >= majority,
        });
      }
    }
    return out.sort((a, b) => b.seats - a.seats);
  }

  return { TOTAL, MAJORITY, THRESHOLD_SEATS, campFor, CAMP_LABELS, computeBlocs, coalitions };
});
