// Inference: types, cardinality, and chart-friendly profile
export class Inference {
  static inferValueType(v) {
    if (v === "" || v == null) return "other";
    const s = String(v);
    if (s === "true" || s === "false") return "bool";
    if (!isNaN(+s) && s.trim() !== "") return "num";
    if (
      /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(
        s
      )
    )
      return "date";
    return s.length < 64 ? "cat" : "text";
  }

  static inferTypes(rows) {
    const types = {};
    if (!rows || !rows.length) return types;
    const cols = Object.keys(rows[0] || {});
    for (const c of cols) {
      const samples = rows
        .slice(0, Math.min(rows.length, 100))
        .map((r) => r[c]);
      const counts = { num: 0, cat: 0, date: 0, bool: 0, text: 0, other: 0 };
      for (const v of samples) counts[Inference.inferValueType(v)]++;
      let best = "cat",
        max = -1;
      for (const k in counts)
        if (counts[k] > max) {
          max = counts[k];
          best = k;
        }
      types[c] = best;
    }
    return types;
  }

  static cardinality(rows) {
    const card = {};
    if (!rows || !rows.length) return card;
    const cols = Object.keys(rows[0] || {});
    for (const c of cols) {
      const set = new Set();
      for (const r of rows) set.add(r[c]);
      card[c] = set.size;
    }
    return card;
  }

  static profile(rows, { types = null, facetMaxCard = 12 } = {}) {
    const nRows = rows?.length || 0;
    const nCols = nRows ? Object.keys(rows[0]).length : 0;
    const t = types || Inference.inferTypes(rows || []);
    const cardinality = Inference.cardinality(rows || []);
    const cols = nRows ? Object.keys(rows[0]) : [];
    const seriesColumns = cols.filter((c) => t[c] === "num");
    const facetFields = cols.filter(
      (c) =>
        t[c] === "cat" && cardinality[c] > 1 && cardinality[c] <= facetMaxCard
    );
    return { types: t, nRows, nCols, cardinality, seriesColumns, facetFields };
  }
}
