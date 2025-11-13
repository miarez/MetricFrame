// src/core/Functions/Scalar.js
// ------------------------------------------------------------
// A small, opinionated toolbelt for row-level calculations (SCALARS).
// Use inside .calculate(...) and .filter(...).
// Aggregators live separately in AggImpl / Aggregation builders.
// ------------------------------------------------------------

export class Scalar {
  /**
   * SCALAR: add(a, b)
   * Input: numbers/strings convertible to number (row fields or literals)
   * Output: number
   * Examples:
   *   .calculate({ total: r => f.add(r.revenue, r.tax) })
   *   .calculate({ x: r => f.add(5, 7) }) // 12
   */
  static add(a, b) {
    return +a + +b;
  }

  /**
   * SCALAR: sub(a, b) — a - b
   * Examples: Scalar.sub(r.revenue, r.cost)
   */
  static sub(a, b) {
    return +a - +b;
  }

  /**
   * SCALAR: mul(a, b) — a * b
   * Examples: Scalar.mul(r.qty, r.price)
   */
  static mul(a, b) {
    return +a * +b;
  }

  /**
   * SCALAR: div(a, b) — safe divide; returns null on 0/NaN
   * Examples: Scalar.div(r.profit, r.revenue)
   */
  static div(a, b) {
    const x = +a,
      y = +b;
    if (!isFinite(x) || !isFinite(y) || y === 0) return null;
    return x / y;
  }

  /**
   * SCALAR: mod(a, b) — remainder
   * Examples: Scalar.mod(r.dayIndex, 7)
   */
  static mod(a, b) {
    return +a % +b;
  }

  /**
   * SCALAR: abs(x)
   * Examples: Scalar.abs(r.delta)
   */
  static abs(x) {
    return Math.abs(+x);
  }

  /**
   * SCALAR: round(x, n=0) — banker's-agnostic simple rounding
   * Examples: Scalar.round(r.rate, 2)
   */
  static round(x, n = 0) {
    const m = 10 ** n;
    return Math.round(+x * m) / m;
  }

  /**
   * SCALAR: floor(x), ceil(x)
   */
  static floor(x) {
    return Math.floor(+x);
  }
  static ceil(x) {
    return Math.ceil(+x);
  }

  /**
   * SCALAR: pct(a, b) — percentage (a/b)*100 with safe divide
   * Examples: Scalar.pct(r.profit, r.revenue)  // margin %
   */
  static pct(a, b) {
    const q = Scalar.div(a, b);
    return q == null ? null : q * 100;
  }

  /**
   * SCALAR: change(oldVal, newVal) — % change
   * Examples: Scalar.change(r.prev_rev, r.revenue)
   */
  static change(oldVal, newVal) {
    const o = +oldVal,
      n = +newVal;
    if (!isFinite(o) || o === 0 || !isFinite(n)) return null;
    return ((n - o) / o) * 100;
  }

  /**
   * SCALAR: clip(x, lo, hi) — clamp to range
   * Examples: Scalar.clip(r.score, 0, 100)
   */
  static clip(x, lo, hi) {
    return Math.max(+lo, Math.min(+hi, +x));
  }

  /* ========================= LOGICAL / COMPARISON ========================= */

  /**
   * SCALAR: eq/neq/gt/lt/gte/lte — strict-ish comparisons (numeric-aware)
   * Examples: Scalar.gt(r.revenue, 0)
   */
  static eq(a, b) {
    return a === b || (+a === +b && !isNaN(+a) && !isNaN(+b));
  }
  static neq(a, b) {
    return !Scalar.eq(a, b);
  }
  static gt(a, b) {
    return +a > +b;
  }
  static lt(a, b) {
    return +a < +b;
  }
  static gte(a, b) {
    return +a >= +b;
  }
  static lte(a, b) {
    return +a <= +b;
  }

  /**
   * SCALAR: between(x, lo, hi) inclusive
   * Examples: Scalar.between(r.age, 18, 34)
   */
  static between(x, lo, hi) {
    return +x >= +lo && +x <= +hi;
  }

  /**
   * SCALAR: inSet(x, arr), notIn(x, arr)
   * Examples: Scalar.inSet(r.country, ["US","CA"])
   */
  static inSet(x, arr) {
    return arr.includes(x);
  }
  static notIn(x, arr) {
    return !arr.includes(x);
  }

  /**
   * SCALAR: ifelse(cond, a, b) — ternary helper
   * Examples: Scalar.ifelse(r.rev > 10000, "A", "B")
   */
  static ifelse(cond, a, b) {
    return cond ? a : b;
  }

  /**
   * SCALAR: coalesce(...xs) — first non-null/undefined/empty-string
   * Examples: Scalar.coalesce(r.alias, r.name, "Unknown")
   */
  static coalesce(...xs) {
    for (const x of xs) if (x !== null && x !== undefined && x !== "") return x;
    return null;
  }

  /* ========================= STRING / TEXT ========================= */

  /**
   * SCALAR: concat(...xs, sep="") — joins values
   * Examples: Scalar.concat(r.city, r.state, {sep:", "})
   */
  static concat(...xs) {
    const last = xs[xs.length - 1];
    const sep =
      last && typeof last === "object" && "sep" in last ? last.sep : "";
    const vals = (sep ? xs.slice(0, -1) : xs).map(String);
    return vals.join(sep);
  }

  /**
   * SCALAR: upper/lower/title
   */
  static upper(s) {
    return String(s).toUpperCase();
  }
  static lower(s) {
    return String(s).toLowerCase();
  }
  static title(s) {
    return String(s).replace(
      /\w\S*/g,
      (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()
    );
  }

  /**
   * SCALAR: trim/ltrim/rtrim
   */
  static trim(s) {
    return String(s).trim();
  }
  static ltrim(s) {
    return String(s).replace(/^\s+/, "");
  }
  static rtrim(s) {
    return String(s).replace(/\s+$/, "");
  }

  /**
   * SCALAR: substr(s, start, len), replace(s, find, rep)
   */
  static substr(s, start, len) {
    return String(s).substr(+start, len == null ? undefined : +len);
  }
  static replace(s, find, rep) {
    return String(s).replace(find, rep);
  }

  /**
   * SCALAR: startsWith/endsWith/contains
   */
  static startsWith(s, prefix) {
    return String(s).startsWith(prefix);
  }
  static endsWith(s, suffix) {
    return String(s).endsWith(suffix);
  }
  static contains(s, sub) {
    return String(s).includes(sub);
  }

  /**
   * SCALAR: len(s) — string length
   */
  static len(s) {
    return String(s).length;
  }

  /* ========================= DATE / TIME ========================= */

  /**
   * SCALAR: today(), now()
   * Examples: Scalar.today() // 'YYYY-MM-DD'
   */
  static today() {
    return new Date().toISOString().slice(0, 10);
  }
  static now() {
    return new Date().toISOString();
  }

  /**
   * SCALAR: year/month/day/quarter/week/weekday
   * Input: date string or Date
   */
  static toDate(d) {
    return d instanceof Date ? d : new Date(d);
  }
  static year(d) {
    return Scalar.toDate(d).getFullYear();
  }
  static month(d) {
    return Scalar.toDate(d).getMonth() + 1;
  }
  static day(d) {
    return Scalar.toDate(d).getDate();
  }
  static quarter(d) {
    return Math.floor((Scalar.month(d) - 1) / 3) + 1;
  }
  static weekday(d) {
    return Scalar.toDate(d).getDay();
  }

  /**
   * SCALAR: addDays/addMonths/addYears
   */
  static addDays(d, n) {
    const x = Scalar.toDate(d);
    x.setDate(x.getDate() + +n);
    return x.toISOString();
  }
  static addMonths(d, n) {
    const x = Scalar.toDate(d);
    x.setMonth(x.getMonth() + +n);
    return x.toISOString();
  }
  static addYears(d, n) {
    const x = Scalar.toDate(d);
    x.setFullYear(x.getFullYear() + +n);
    return x.toISOString();
  }

  /**
   * SCALAR: diffDays(a,b), diffMonths(a,b)
   */
  static diffDays(a, b) {
    return Math.round(
      (Scalar.toDate(b) - Scalar.toDate(a)) / (1000 * 60 * 60 * 24)
    );
  }
  static diffMonths(a, b) {
    return (
      (Scalar.year(b) - Scalar.year(a)) * 12 +
      (Scalar.month(b) - Scalar.month(a))
    );
  }

  /**
   * SCALAR: formatDate(d, fmt='YYYY-MM-DD')
   * Tokens: YYYY, MM, DD
   */
  static formatDate(d, fmt = "YYYY-MM-DD") {
    const Y = Scalar.year(d),
      M = String(Scalar.month(d)).padStart(2, "0"),
      D = String(Scalar.day(d)).padStart(2, "0");
    return fmt.replace("YYYY", Y).replace("MM", M).replace("DD", D);
  }

  /* ========================= CATEGORICAL / BUCKETING ========================= */

  /**
   * SCALAR: bucket(x, bins, labels?)
   * bins: array of lower cut points (e.g., [0,18,35,50,65])
   * labels: optional array same length as bins; else auto 'bin_i'
   *
   * Behavior:
   *   - Each bin[i] represents a lower bound.
   *   - For i < last: bin covers [bins[i], bins[i+1])
   *   - The final bin covers [bins[last], +∞)
   *
   * Returns: label of the bin containing x, or null if below the first cutoff.
   */
  static bucket(x, bins, labels) {
    const v = +x;
    const n = bins.length;

    for (let i = 0; i < n - 1; i++) {
      if (v >= bins[i] && v < bins[i + 1]) {
        return labels?.[i] ?? `bin_${i}`;
      }
    }

    // catch-all final bin
    if (v >= bins[n - 1]) {
      return labels?.[n - 1] ?? `bin_${n - 1}`;
    }

    return null;
  }
}
