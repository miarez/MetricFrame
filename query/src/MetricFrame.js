import { Csv } from "./io/csv.js";
import { Inference } from "./core/Inference.js";

class Pipeline {
  constructor(rows) {
    this._rows = rows || [];
    this._types = Inference.inferTypes(this._rows);
    this._groupKeys = null;
  }

  static _copyRows(rows) {
    return rows.map((r) => ({ ...r }));
  }

  static read_csv(input, opts = {}) {
    // allow second arg as encoding string
    if (typeof opts === "string") opts = { encoding: opts };
    // if input looks like a file path (no newline), read + parse
    if (typeof input === "string" && !/\r?\n/.test(input)) {
      const rows = Csv.readTableSync(input, opts);
      return new Pipeline(rows);
    }
    // else treat as CSV text
    return new Pipeline(Csv.parse(String(input), opts));
  }

  /**
   * Sugar
   * .select("month", "country", "revenue", "profit")     // regular
   * .select("-profit", "-country")                       // drop syntax
   * .select("^cookie")                                   // regex prefix
   * .select(/cookie/i)                                   // real RegExp
   * .select("regex:^cookie")                             // explicit regex
   * @param  {...any} args
   * @returns
   */
  select(...args) {
    const cols = args.flat();
    const first = this._rows[0];
    if (!first) return this;

    const allCols = Object.keys(first);
    let keep = new Set();
    let drop = new Set();

    for (let token of cols) {
      // regex select: /^cookie/, "regex:^cookie", or string starting with ^
      if (token instanceof RegExp) {
        allCols.filter((c) => token.test(c)).forEach((c) => keep.add(c));
        continue;
      }
      if (typeof token === "string" && token.startsWith("regex:")) {
        const re = new RegExp(token.slice(6));
        allCols.filter((c) => re.test(c)).forEach((c) => keep.add(c));
        continue;
      }
      if (typeof token === "string" && token.startsWith("^")) {
        const re = new RegExp(token);
        allCols.filter((c) => re.test(c)).forEach((c) => keep.add(c));
        continue;
      }

      // drop columns with '-' prefix
      if (typeof token === "string" && token.startsWith("-")) {
        drop.add(token.slice(1));
        continue;
      }

      // normal include
      keep.add(token);
    }

    // if user only provided negatives, start with all and remove drops
    if (!keep.size && drop.size) allCols.forEach((c) => keep.add(c));
    for (const d of drop) keep.delete(d);

    const selected = Array.from(keep);
    this._rows = this._rows.map((r) => {
      const o = {};
      for (const c of selected) o[c] = r[c];
      return o;
    });

    if (this._types) {
      const t = {};
      for (const c of selected) if (this._types[c]) t[c] = this._types[c];
      this._types = t;
    }

    return this;
  }
  filter(fnOrWrapper) {
    if (!fnOrWrapper) throw new Error("filter() requires a predicate");

    const isSeries =
      typeof fnOrWrapper === "object" && fnOrWrapper.__columnfn__;
    const pred = isSeries ? (r) => !!fnOrWrapper.__columnfn__(r) : fnOrWrapper;

    if (typeof pred !== "function") {
      throw new Error("filter() expected a function or Series predicate");
    }
    this._rows = this._rows.filter(pred);
    return this;
  }

  calc(map) {
    const rows = Pipeline._copyRows(this._rows); // 👈 keep this

    for (const r of rows) {
      for (const [k, fn] of Object.entries(map)) {
        if (fn && typeof fn === "object" && fn.__columnfn__) {
          r[k] = fn.__columnfn__(r);
        } else if (typeof fn === "function") {
          r[k] = fn(r);
        } else {
          r[k] = fn;
        }
      }
    }

    this._rows = rows;
    return this;
  }
  group(...keys) {
    this._groupKeys = keys.flat();
    return this;
  }
  agg(spec) {
    if (!this._groupKeys || !this._groupKeys.length)
      throw new Error("agg() requires groupBy() first");

    const gmap = new Map();
    for (const r of this._rows) {
      const key = JSON.stringify(this._groupKeys.map((k) => r[k]));
      if (!gmap.has(key)) gmap.set(key, []);
      gmap.get(key).push(r);
    }

    const out = [];
    for (const [key, rows] of gmap.entries()) {
      const obj = {};
      const keyVals = JSON.parse(key);
      this._groupKeys.forEach((k, i) => (obj[k] = keyVals[i]));

      for (const outCol in spec) {
        const aggSpec = spec[outCol];

        let impl;
        let inCol;

        if (typeof aggSpec === "function" && aggSpec.__agg__) {
          // legacy: profit: mean  → input column = outCol
          impl = aggSpec;
          inCol = outCol;
        } else if (aggSpec && typeof aggSpec === "object" && aggSpec.__agg__) {
          // new: total_revenue: sum("revenue")
          impl = aggSpec.__impl__ || aggSpec;
          inCol = aggSpec.__col__ || outCol;
        } else {
          throw new Error(`agg() spec for "${outCol}" is not an aggregator`);
        }

        const vals = inCol
          ? rows.map((r) => r[inCol])
          : rows.map((r) => r[outCol]);

        obj[outCol] = impl(vals, inCol, rows);
      }

      out.push(obj);
    }

    this._rows = out;
    this._groupKeys = null;
    return this;
  }
  order(...cols) {
    // flatten so order("a","-b") or order(["a","-b"]) both work
    const keys = cols.flat();

    this._rows.sort((a, b) => {
      for (let k of keys) {
        let dir = 1;
        if (k.startsWith("-")) {
          dir = -1;
          k = k.slice(1);
        }

        const av = a[k],
          bv = b[k];
        if (av == null && bv == null) continue;
        if (av == null) return -1 * dir;
        if (bv == null) return 1 * dir;
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
      }
      return 0;
    });

    return this;
  }
  limit(n) {
    this._rows = this._rows.slice(0, n);
    return this;
  }
  _info() {
    const rows = this._rows;
    const nRows = rows.length;
    const nCols = nRows ? Object.keys(rows[0]).length : 0;
    const types = this._types || inferTypes(rows);
    const cardinality = {};
    const cols = nRows ? Object.keys(rows[0]) : [];
    for (const c of cols) {
      const set = new Set();
      for (const r of rows) set.add(r[c]);
      cardinality[c] = set.size;
    }
    const seriesColumns = cols.filter((c) => types[c] === "num");
    const facetFields = cols.filter(
      (c) => types[c] === "cat" && cardinality[c] > 1 && cardinality[c] <= 12
    );
    return { types, nRows, nCols, cardinality, seriesColumns, facetFields };
  }
  build() {
    // if user called groupBy() but never aggregated
    if (this._groupKeys && this._groupKeys.length) {
      throw new Error(
        `SQL-style error: Pending GROUP BY [${this._groupKeys.join(
          ", "
        )}] without aggregation.\n` +
          `→ Either call .agg({...}) or .ungroup() before .build().`
      );
    }

    return { df: this._rows, info: this._info() };
  }
}

export const MetricFrame = {
  read_csv: Pipeline.read_csv,
};
