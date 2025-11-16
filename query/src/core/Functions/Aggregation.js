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

  /** min(column[]) */
  static min(vals) {
    const filtered = vals.filter((v) => v != null && v !== "").map(Number);
    if (!filtered.length) return null;
    return filtered.reduce(
      (acc, v) => (acc === null || v < acc ? v : acc),
      null
    );
  }

  /** max(column[]) */
  static max(vals) {
    const filtered = vals.filter((v) => v != null && v !== "").map(Number);
    if (!filtered.length) return null;
    return filtered.reduce(
      (acc, v) => (acc === null || v > acc ? v : acc),
      null
    );
  }

  /** variance (sample) */
  static var(vals) {
    const filtered = vals.filter((v) => v != null && v !== "").map(Number);
    const n = filtered.length;
    if (n < 2) return null;

    const mean = filtered.reduce((acc, v) => acc + v, 0) / n;
    const ss = filtered.reduce((acc, v) => {
      const d = v - mean;
      return acc + d * d;
    }, 0);

    return ss / (n - 1); // sample variance
  }

  /** stddev (sample) */
  static stddev(vals) {
    const v = Agg.var(vals);
    return v == null ? null : Math.sqrt(v);
  }

  /** median(column[]) */
  static median(vals) {
    return Agg.quantile(0.5, vals);
  }

  /** first(column[]) – first non-null value */
  static first(vals) {
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (v !== null && v !== undefined && v !== "") return v;
    }
    return null;
  }

  /** last(column[]) – last non-null value */
  static last(vals) {
    for (let i = vals.length - 1; i >= 0; i--) {
      const v = vals[i];
      if (v !== null && v !== undefined && v !== "") return v;
    }
    return null;
  }
}
