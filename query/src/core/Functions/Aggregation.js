// ------------------------------------------------------------
// PURE aggregation implementations (no metadata, no builders)
// These are REAL reducers: column[] -> scalar
// Exported as a single class with static methods.
// ------------------------------------------------------------

export class Agg {
  /** sum(column[]) */
  static sum(vals) {
    return vals.reduce((acc, v) => acc + (v == null || v === "" ? 0 : +v), 0);
  }

  /** mean(column[]) */
  static mean(vals) {
    const filtered = vals.filter((v) => v != null && v !== "");
    const n = filtered.length;
    if (!n) return null;

    const total = filtered.reduce(
      (acc, v) => acc + (v == null || v === "" ? 0 : +v),
      0
    );
    return total / n;
  }

  /** count(rows or column) */
  static count(vals, _col, rows) {
    // If rows is available (group context), use it
    return rows ? rows.length : vals.length;
  }

  /** quantile(p, column[]) */
  static quantile(p, vals) {
    const a = vals
      .filter((v) => v != null && v !== "")
      .map(Number)
      .sort((x, y) => x - y);

    if (!a.length) return null;

    const idx = (a.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);

    if (lo === hi) return a[lo];

    const h = idx - lo;
    return a[lo] * (1 - h) + a[hi] * h;
  }
}
