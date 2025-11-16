import { Csv } from "./io/csv.js";
import { Inference } from "./core/Inference.js";
import { Agg } from "./core/Functions/Aggregation.js"; // adjust path if needed

class Pipeline {
  constructor(rows) {
    this._rows = rows || [];
    this._types = Inference.inferTypes(this._rows);
    this._groupKeys = null;
    this._pivotSpec = null;
  }

  /**
   * summariseAll()
   *
   * Sugar for:
   *  - infer numeric columns
   *  - run stats() on all of them
   *
   * Example (global):
   *   base.clone()
   *     .summariseAll()
   *     .build();
   *
   * Example (by group):
   *   base.clone()
   *     .group("user_type")
   *     .summariseAll()
   *     .build();
   */
  summariseAll() {
    const info = this._info(this._rows);
    const metrics = info.numericColumns || [];
    if (!metrics.length) {
      throw new Error("summariseAll(): no numeric columns found.");
    }
    return this.stats(...metrics);
  }

  static _copyRows(rows) {
    return rows.map((r) => ({ ...r }));
  }

  /**
   * clone()
   *
   * Create a new Pipeline with a copy of the current rows.
   * Useful because Pipeline is mutable: distinct(), dedupeBy(), etc.
   * all mutate `this._rows`.
   *
   * Example:
   *   const base = await q.fetch_csv("./data/raw2.csv");
   *   const a = base.clone().distinct("day").build();
   *   const b = base.clone().dedupeBy("day", "imp").build();
   */
  clone() {
    const rowsCopy = Pipeline._copyRows(this._rows);
    const p = new Pipeline(rowsCopy);
    // do NOT copy group/pivot state; clone is "fresh pipeline on same data"
    return p;
  }

  // --- AGGREGATION HELPERS ------------------------------------

  static _aggSum(values) {
    let acc = 0;
    let seen = false;
    for (const v of values) {
      if (v == null) continue;
      const n = Number(v);
      if (Number.isNaN(n)) continue;
      acc += n;
      seen = true;
    }
    return seen ? acc : null;
  }

  static _aggMean(values) {
    let acc = 0;
    let count = 0;
    for (const v of values) {
      if (v == null) continue;
      const n = Number(v);
      if (Number.isNaN(n)) continue;
      acc += n;
      count++;
    }
    return count ? acc / count : null;
  }

  static _aggMin(values) {
    let res = null;
    for (const v of values) {
      if (v == null) continue;
      const n = Number(v);
      if (Number.isNaN(n)) continue;
      if (res === null || n < res) res = n;
    }
    return res;
  }

  static _aggMax(values) {
    let res = null;
    for (const v of values) {
      if (v == null) continue;
      const n = Number(v);
      if (Number.isNaN(n)) continue;
      if (res === null || n > res) res = n;
    }
    return res;
  }

  static _aggLast(values) {
    for (let i = values.length - 1; i >= 0; i--) {
      const v = values[i];
      if (v != null) return v;
    }
    return null;
  }

  static _resolveAggFn(token) {
    if (typeof token === "function") return token;

    if (typeof token === "string") {
      const key = token.toLowerCase();
      if (key === "sum") return Pipeline._aggSum;
      if (key === "mean" || key === "avg") return Pipeline._aggMean;
      if (key === "min") return Pipeline._aggMin;
      if (key === "max") return Pipeline._aggMax;
      if (key === "last") return Pipeline._aggLast;
    }

    // Fallback default if something weird was passed
    return Pipeline._aggSum;
  }

  // ---- STATIC CONSTRUCTORS ------------------------------------

  static async fetch_csv(url, opts = {}) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch CSV: ${url}`);

    const text = await res.text();
    const rows = Csv.parse(text, opts);
    return new Pipeline(rows);
  }

  static read_csv(input, opts = {}) {
    if (typeof window !== "undefined") {
      throw new Error("read_csv is Node-only. Use fetch_csv in browser.");
    }

    if (typeof opts === "string") opts = { encoding: opts };

    if (typeof input === "string" && !/\r?\n/.test(input)) {
      const rows = Csv.readTableSync(input, opts); // Node-only
      return new Pipeline(rows);
    }

    return new Pipeline(Csv.parse(String(input), opts));
  }

  // ---- COLUMN SELECTION / FILTER / CALC -----------------------

  select(...args) {
    const cols = args.flat();
    const first = this._rows[0];
    if (!first) return this;

    const allCols = Object.keys(first);
    let keep = new Set();
    let drop = new Set();

    for (let token of cols) {
      // regex select
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
    const rows = Pipeline._copyRows(this._rows);

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
    // schema changed → types stale
    this._types = null;
    return this;
  }

  // ---- GROUP / AGG / ORDER / LIMIT ---------------------------

  group(...keys) {
    this._groupKeys = keys.flat();
    return this;
  }

  agg(spec) {
    const hasGroup = this._groupKeys && this._groupKeys.length;

    // ------------------------------------------------------
    // NO-GROUP MODE → treat whole dataset as ONE group
    // ------------------------------------------------------
    if (!hasGroup) {
      const rows = this._rows;
      const out = {};

      for (const outCol in spec) {
        const aggSpec = spec[outCol];

        let impl;
        let inCol;

        if (typeof aggSpec === "function" && aggSpec.__agg__) {
          impl = aggSpec;
          inCol = outCol;
        } else if (aggSpec && typeof aggSpec === "object" && aggSpec.__agg__) {
          impl = aggSpec.__impl__ || aggSpec;
          inCol = aggSpec.__col__ || outCol;
        } else {
          throw new Error(`agg() spec for "${outCol}" is not an aggregator`);
        }

        const vals = inCol
          ? rows.map((r) => r[inCol])
          : rows.map((r) => r[outCol]);

        out[outCol] = impl(vals, inCol, rows);
      }

      this._rows = [out]; // << one summary row
      this._pivotSpec = null;
      this._types = null;
      return this;
    }

    // ------------------------------------------------------
    // GROUPED MODE (original behavior)
    // ------------------------------------------------------
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
          impl = aggSpec;
          inCol = outCol;
        } else if (aggSpec && typeof aggSpec === "object" && aggSpec.__agg__) {
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
    this._pivotSpec = null;
    this._types = null;
    return this;
  }

  /**
   * stats(...cols)
   *
   * Sugar on top of group() + agg() to get "ES-style stats" in one shot.
   *
   * Requires group() first, just like agg().
   *
   * Example:
   *   base.clone()
   *     .group("user_type")
   *     .stats("imp", "rev")
   *     .build();
   *
   * Output columns per metric:
   *   <col>_count, <col>_min, <col>_max,
   *   <col>_mean, <col>_median, <col>_stddev, <col>_var
   */
  stats(...cols) {
    const metrics = cols.flat();
    if (!metrics.length) {
      throw new Error("stats() requires at least one metric column.");
    }

    const hasGroup = this._groupKeys && this._groupKeys.length;

    // ------------------------------------------------------
    // NO-GROUP MODE → global stats in ONE row
    // ------------------------------------------------------
    if (!hasGroup) {
      const rows = this._rows;
      const obj = {};

      for (const m of metrics) {
        const vals = rows.map((r) => r[m]);

        obj[`${m}_count`] = Agg.count(vals, m, rows);
        obj[`${m}_min`] = Agg.min(vals);
        obj[`${m}_max`] = Agg.max(vals);
        obj[`${m}_mean`] = Agg.mean(vals);
        obj[`${m}_median`] = Agg.median(vals);
        obj[`${m}_stddev`] = Agg.stddev(vals);
        obj[`${m}_var`] = Agg.var(vals);
      }

      this._rows = [obj]; // summary row
      this._pivotSpec = null;
      this._types = null;
      return this;
    }

    // ------------------------------------------------------
    // GROUPED MODE (original-style)
    // ------------------------------------------------------
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

      for (const m of metrics) {
        const vals = rows.map((r) => r[m]);

        obj[`${m}_count`] = Agg.count(vals, m, rows);
        obj[`${m}_min`] = Agg.min(vals);
        obj[`${m}_max`] = Agg.max(vals);
        obj[`${m}_mean`] = Agg.mean(vals);
        obj[`${m}_median`] = Agg.median(vals);
        obj[`${m}_stddev`] = Agg.stddev(vals);
        obj[`${m}_var`] = Agg.var(vals);
      }

      out.push(obj);
    }

    this._rows = out;
    this._groupKeys = null;
    this._pivotSpec = null;
    this._types = null;
    return this;
  }

  order(...cols) {
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

  // ---- JOIN HELPERS ------------------------------------------

  _getRowsFrom(other) {
    if (other instanceof Pipeline) return other._rows;
    if (Array.isArray(other)) return other;
    throw new Error("join() 'other' must be a Pipeline or array of rows");
  }

  _normalizeJoinOn(on) {
    if (!on) throw new Error("join() requires 'on' keys");

    let pairs = [];

    if (typeof on === "string") {
      pairs = [[on, on]];
    } else if (Array.isArray(on)) {
      pairs = on.map((k) => [k, k]);
    } else if (on && typeof on === "object") {
      pairs = Object.entries(on); // [leftKey, rightKey]
    } else {
      throw new Error("join() 'on' must be string, array, or object map");
    }

    const leftKeys = pairs.map(([l]) => l);
    const rightKeys = pairs.map(([, r]) => r);
    return { pairs, leftKeys, rightKeys };
  }

  _makeKey(row, keys) {
    return JSON.stringify(keys.map((k) => row[k]));
  }

  _combineRows(leftRow, rightRow, leftCols, rightOnlyCols, joinPairs) {
    const out = {};

    // 1) copy all left columns (even if undefined when leftRow is null)
    for (const c of leftCols) {
      out[c] = leftRow ? leftRow[c] : undefined;
    }

    // 2) ensure join key columns are populated (from right if left is missing)
    if (rightRow) {
      for (const [lKey, rKey] of joinPairs) {
        if (out[lKey] === undefined) {
          out[lKey] = rightRow[rKey];
        }
      }
    }

    // 3) copy right-only columns
    if (rightRow) {
      for (const c of rightOnlyCols) {
        out[c] = rightRow[c];
      }
    } else {
      for (const c of rightOnlyCols) {
        out[c] = undefined;
      }
    }

    return out;
  }

  _join(other, on, type) {
    const leftRows = this._rows;
    const rightRows = this._getRowsFrom(other);

    if (!leftRows.length && !rightRows.length) {
      this._rows = [];
      this._pivotSpec = null;
      this._types = null;
      return this;
    }

    const leftCols = leftRows.length ? Object.keys(leftRows[0]) : [];
    const rightCols = rightRows.length ? Object.keys(rightRows[0]) : [];

    const { pairs, leftKeys, rightKeys } = this._normalizeJoinOn(on);

    // right-only, non-key columns (we'll append these)
    const rightOnlyCols = rightCols.filter(
      (c) => !rightKeys.includes(c) && !leftCols.includes(c)
    );

    // build indexes
    const rightIndex = new Map();
    for (const r of rightRows) {
      const key = this._makeKey(r, rightKeys);
      let arr = rightIndex.get(key);
      if (!arr) {
        arr = [];
        rightIndex.set(key, arr);
      }
      arr.push(r);
    }

    const leftIndex = new Map();
    for (const l of leftRows) {
      const key = this._makeKey(l, leftKeys);
      let arr = leftIndex.get(key);
      if (!arr) {
        arr = [];
        leftIndex.set(key, arr);
      }
      arr.push(l);
    }

    const out = [];

    const combine = (l, r) =>
      this._combineRows(l, r, leftCols, rightOnlyCols, pairs);

    if (type === "inner") {
      for (const l of leftRows) {
        const key = this._makeKey(l, leftKeys);
        const matches = rightIndex.get(key);
        if (!matches || !matches.length) continue;
        for (const r of matches) {
          out.push(combine(l, r));
        }
      }
    } else if (type === "left") {
      for (const l of leftRows) {
        const key = this._makeKey(l, leftKeys);
        const matches = rightIndex.get(key);
        if (matches && matches.length) {
          for (const r of matches) {
            out.push(combine(l, r));
          }
        } else {
          out.push(combine(l, null));
        }
      }
    } else if (type === "right") {
      for (const r of rightRows) {
        const key = this._makeKey(r, rightKeys);
        const matches = leftIndex.get(key);
        if (matches && matches.length) {
          for (const l of matches) {
            out.push(combine(l, r));
          }
        } else {
          out.push(combine(null, r));
        }
      }
    } else if (type === "full") {
      const seenRightKeys = new Set();

      // left side + matches / left-only
      for (const l of leftRows) {
        const key = this._makeKey(l, leftKeys);
        const matches = rightIndex.get(key);
        if (matches && matches.length) {
          for (const r of matches) {
            out.push(combine(l, r));
            seenRightKeys.add(this._makeKey(r, rightKeys));
          }
        } else {
          out.push(combine(l, null));
        }
      }

      // right-only
      for (const r of rightRows) {
        const key = this._makeKey(r, rightKeys);
        if (seenRightKeys.has(key)) continue;
        if (!leftIndex.get(key)) {
          out.push(combine(null, r));
        }
      }
    } else if (type === "semi") {
      // left-semi: only left rows that have a match in right, no right columns
      for (const l of leftRows) {
        const key = this._makeKey(l, leftKeys);
        const matches = rightIndex.get(key);
        if (matches && matches.length) {
          out.push({ ...l });
        }
      }
    } else if (type === "anti") {
      // left-anti: only left rows with no match in right
      for (const l of leftRows) {
        const key = this._makeKey(l, leftKeys);
        const matches = rightIndex.get(key);
        if (!matches || !matches.length) {
          out.push({ ...l });
        }
      }
    } else {
      throw new Error(`Unknown join type: ${type}`);
    }

    this._rows = out;
    this._pivotSpec = null;
    this._types = null;

    return this;
  }

  leftJoin(other, on) {
    return this._join(other, on, "left");
  }

  innerJoin(other, on) {
    return this._join(other, on, "inner");
  }

  rightJoin(other, on) {
    return this._join(other, on, "right");
  }

  fullJoin(other, on) {
    return this._join(other, on, "full");
  }

  semiJoin(other, on) {
    return this._join(other, on, "semi");
  }

  antiJoin(other, on) {
    return this._join(other, on, "anti");
  }

  // ---- PIVOT BUILDER API -------------------------------------

  /**
   * pivot({ rows, columns, measures, agg })
   * - rows: row dimension fields
   * - columns: column dimension fields
   * - measures: value fields to pivot
   * - agg: optional aggregation spec when multiple rows per cell
   *   - function(values, context) => value
   *   - string: "sum" | "mean" | "avg" | "min" | "max" | "last"
   *   - object: { measureName: fnOrString, "*": fnOrString }
   */
  pivot({ rows = [], columns = [], measures = [], agg = null } = {}) {
    this._pivotSpec = {
      rows: rows.flat(),
      columns: columns.flat(),
      measures: measures.flat(),
      agg,
    };
    return this;
  }

  pivotRows(...fields) {
    if (!this._pivotSpec) {
      this._pivotSpec = { rows: [], columns: [], measures: [], agg: null };
    }
    this._pivotSpec.rows = fields.flat();
    return this;
  }

  pivotCols(...fields) {
    if (!this._pivotSpec) {
      this._pivotSpec = { rows: [], columns: [], measures: [], agg: null };
    }
    this._pivotSpec.columns = fields.flat();
    return this;
  }

  pivotMeasures(...fields) {
    if (!this._pivotSpec) {
      this._pivotSpec = { rows: [], columns: [], measures: [], agg: null };
    }
    this._pivotSpec.measures = fields.flat();
    return this;
  }

  // --- INTERNAL: normalize pivot agg spec ---------------------

  _resolvePivotAggFor(measureName) {
    const spec = this._pivotSpec || {};
    const agg = spec.agg;

    if (!agg) {
      // default: sum
      return Pipeline._aggSum;
    }

    // Single function or string → apply to all measures
    if (typeof agg === "function" || typeof agg === "string") {
      return Pipeline._resolveAggFn(agg);
    }

    // Object map: per-measure or wildcard
    if (agg && typeof agg === "object") {
      const token =
        agg[measureName] !== undefined
          ? agg[measureName]
          : agg["*"] !== undefined
          ? agg["*"]
          : "sum";
      return Pipeline._resolveAggFn(token);
    }

    return Pipeline._aggSum;
  }

  // --- INTERNAL: perform wide pivot and build columnIndex ------

  _applyPivot(rows) {
    const spec = this._pivotSpec;
    if (!spec || !spec.columns || !spec.columns.length) {
      return {
        rows,
        rowDims: [],
        colDims: [],
        measures: [],
        columnIndex: [],
      };
    }

    const rowDims = spec.rows || [];
    const colDims = spec.columns || [];
    const measuresSpec = spec.measures || [];

    const outRowMap = new Map(); // rowKey -> outRow
    const cellMap = new Map(); // cellKey -> { rowKey, colId, measure, dims, values: [] }

    for (const r of rows) {
      // 1) find or create the pivoted row keyed by rowDims
      const keyValues = rowDims.map((k) => r[k]);
      const rowKey = JSON.stringify(keyValues);

      let outRow = outRowMap.get(rowKey);
      if (!outRow) {
        outRow = {};
        rowDims.forEach((k, i) => {
          outRow[k] = keyValues[i];
        });
        outRowMap.set(rowKey, outRow);
      }

      // 2) column-dim values for this original row
      const dimVals = {};
      for (const d of colDims) dimVals[d] = r[d];

      // 3) choose measures for this row
      const useMeasures =
        measuresSpec.length > 0
          ? measuresSpec
          : Object.keys(r).filter(
              (c) => !rowDims.includes(c) && !colDims.includes(c)
            );

      for (const m of useMeasures) {
        const dimPath = colDims.map((d) => String(r[d]));
        const path = [...dimPath, m]; // dims first, measure last
        const colId = path.join("|");
        const cellKey = JSON.stringify([rowKey, colId, m]);

        let cell = cellMap.get(cellKey);
        if (!cell) {
          cell = {
            rowKey,
            colId,
            measure: m,
            dims: { ...dimVals },
            path,
            values: [],
          };
          cellMap.set(cellKey, cell);
        }

        cell.values.push(r[m]);
      }
    }

    // 4) aggregate per cell and build final wide rows + columnIndex
    const wideRows = Array.from(outRowMap.values());
    const colIndexObj = {};

    for (const cell of cellMap.values()) {
      const aggFn = this._resolvePivotAggFor(cell.measure);
      const value = aggFn(cell.values, {
        measure: cell.measure,
        dims: cell.dims,
        path: cell.path,
      });

      const outRow = outRowMap.get(cell.rowKey);
      outRow[cell.colId] = value;

      if (!colIndexObj[cell.colId]) {
        colIndexObj[cell.colId] = {
          measure: cell.measure,
          dims: cell.dims,
          path: cell.path,
        };
      }
    }

    let columnIndex = Object.entries(colIndexObj).map(([key, meta]) => ({
      key,
      path: meta.path,
      dims: meta.dims,
      measure: meta.measure,
    }));

    // Ensure deterministic grouping: sort by path lexicographically
    columnIndex.sort((a, b) => {
      const len = Math.max(a.path.length, b.path.length);
      for (let i = 0; i < len; i++) {
        const av = a.path[i] ?? "";
        const bv = b.path[i] ?? "";
        if (av < bv) return -1;
        if (av > bv) return 1;
      }
      return 0;
    });

    const measures =
      measuresSpec.length > 0
        ? measuresSpec.slice()
        : Array.from(new Set(columnIndex.map((c) => c.measure)));

    return { rows: wideRows, rowDims, colDims, measures, columnIndex };
  }

  // ---- UNPIVOT / PIVOT_LONGER --------------------------------

  /**
   * unpivot({
   *   cols,        // which columns to melt (names / regex tokens)
   *   namesTo,     // name of the new "column name" field (default: "name")
   *   valuesTo,    // name of the new "column value" field (default: "value")
   *   dropMissing, // if true, skip null/undefined values
   * })
   */
  unpivot({
    cols = [],
    namesTo = "name",
    valuesTo = "value",
    dropMissing = false,
  } = {}) {
    const rows = this._rows;
    if (!rows.length) return this;

    const allCols = Object.keys(rows[0]);

    // --- resolve which columns to melt ------------------------
    let valueCols;
    if (!cols || cols.length === 0) {
      // default: melt everything
      valueCols = allCols.slice();
    } else {
      const tokens = cols.flat();
      const set = new Set();

      for (let token of tokens) {
        // regex: direct
        if (token instanceof RegExp) {
          allCols.filter((c) => token.test(c)).forEach((c) => set.add(c));
          continue;
        }
        // "regex:foo"
        if (typeof token === "string" && token.startsWith("regex:")) {
          const re = new RegExp(token.slice(6));
          allCols.filter((c) => re.test(c)).forEach((c) => set.add(c));
          continue;
        }
        // "^prefix" style
        if (typeof token === "string" && token.startsWith("^")) {
          const re = new RegExp(token);
          allCols.filter((c) => re.test(c)).forEach((c) => set.add(c));
          continue;
        }

        // plain column name
        if (typeof token === "string") {
          if (allCols.includes(token)) set.add(token);
          continue;
        }
      }

      valueCols = Array.from(set);
    }

    // id columns are everything else
    const idCols = allCols.filter((c) => !valueCols.includes(c));

    const out = [];

    for (const r of rows) {
      for (const vCol of valueCols) {
        const v = r[vCol];
        if (dropMissing && (v === null || v === undefined)) continue;

        const o = {};

        // carry id columns through
        for (const id of idCols) o[id] = r[id];

        // new name/value pair
        o[namesTo] = vCol;
        o[valuesTo] = v;

        out.push(o);
      }
    }

    this._rows = out;
    this._pivotSpec = null;
    this._types = null;

    return this;
  }

  // -------------------------------------------------------------
  // DISTINCT  (projection + deduplication)
  // -------------------------------------------------------------
  /**
   * distinct(...cols)
   *
   * Behaves like:
   *   SQL:   SELECT DISTINCT col1, col2 FROM table
   *   dplyr: df %>% distinct(col1, col2)
   *
   * Meaning:
   *   - Keeps ONLY the requested columns.
   *   - Removes duplicate combinations.
   *   - Uses FIRST occurrence order (stable).
   *
   * Example:
   *   Input:
   *     [{ day:"2025-01-01", src:"Email" },
   *      { day:"2025-01-01", src:"FB"    },
   *      { day:"2025-01-02", src:"Tik"   }]
   *
   *   distinct("day")
   *    → [{ day:"2025-01-01" },
   *       { day:"2025-01-02" }]
   *
   * NOTE:
   *   This is a *terminal-like* op because you lose other columns.
   */
  distinct(...cols) {
    const columns = cols.flat();
    if (!this._rows.length) return this;

    const out = [];
    const seen = new Set();

    for (const r of this._rows) {
      const key = JSON.stringify(columns.map((c) => r[c]));
      if (!seen.has(key)) {
        seen.add(key);
        const newRow = {};
        for (const c of columns) newRow[c] = r[c];
        out.push(newRow);
      }
    }

    this._rows = out;
    this._pivotSpec = null;
    this._types = null;
    return this;
  }

  // -------------------------------------------------------------
  // DEDUPE BY KEY  (row-level keep-one-per-group)
  // -------------------------------------------------------------
  /**
   * dedupeBy(keyCol, orderCol, { direction = "desc" })
   *
   * Row-level deduplication.
   * Pick ONE FULL ROW per key based on an ordering column.
   *
   * This is the clean version of the ugly SQL pattern:
   *   SELECT * FROM (
   *     SELECT *,
   *       ROW_NUMBER() OVER (
   *         PARTITION BY keyCol ORDER BY orderCol DESC
   *       ) AS rn
   *     FROM table
   *   ) WHERE rn = 1;
   *
   * Why it's different from FIRST() / LAST():
   *   FIRST/LAST return single VALUES per group.
   *   dedupeBy returns the entire WINNING ROW.
   *
   * Example:
   *   Input:
   *     [
   *       { user:"A", ts:10, event:"click", revenue:0 },
   *       { user:"A", ts:20, event:"buy",   revenue:50 }
   *     ]
   *
   *   dedupeBy("user", "ts")
   *     → keeps ts=20 row:
   *       { user:"A", ts:20, event:"buy", revenue:50 }
   *
   *   Compare FIRST/LAST:
   *     group("user").agg({
   *       first_ts: FIRST("ts"),
   *       last_ts:  LAST("ts")
   *     })
   *   → loses event + revenue columns:
   *       { user:"A", first_ts:10, last_ts:20 }
   */
  dedupeBy(keyCol, orderCol, { direction = "desc" } = {}) {
    if (!this._rows.length) return this;

    const rows = this._rows;
    const compare = direction === "asc" ? (a, b) => a < b : (a, b) => a > b; // default: keep MAX (latest/biggest)

    const map = new Map(); // key -> best row

    for (const r of rows) {
      const key = r[keyCol];
      const current = map.get(key);

      if (!current) {
        map.set(key, r);
        continue;
      }

      const curVal = current[orderCol];
      const newVal = r[orderCol];

      if (compare(newVal, curVal)) {
        map.set(key, r);
      }
    }

    this._rows = Array.from(map.values());
    this._pivotSpec = null;
    this._types = null;
    return this;
  }

  // ---- INFO / BUILD ------------------------------------------

  _info(rows = this._rows) {
    const nRows = rows.length;
    const cols = nRows ? Object.keys(rows[0]) : [];
    const nCols = cols.length;

    // Always infer fresh types based on current rows
    const types = Inference.inferTypes(rows);

    const cardinality = {};
    for (const c of cols) {
      const set = new Set();
      for (const r of rows) set.add(r[c]);
      cardinality[c] = set.size;
    }

    const numericColumns = cols.filter((c) => types[c] === "num");
    const categoricalColumns = cols.filter((c) => types[c] === "cat");

    return {
      types,
      nRows,
      nCols,
      cardinality,
      numericColumns,
      categoricalColumns,
    };
  }

  build() {
    // --- NON-PIVOT CASE --------------------------------------
    if (!this._pivotSpec) {
      const baseProfile = this._info(this._rows);

      const cols = baseProfile.nRows ? Object.keys(this._rows[0]) : [];
      const measures =
        baseProfile.numericColumns && baseProfile.numericColumns.length
          ? baseProfile.numericColumns.slice()
          : [];
      const rowDims = cols.filter((c) => !measures.includes(c));

      const columnIndex = measures.map((key) => ({
        key,
        path: [key],
        dims: {},
        measure: key,
      }));

      const info = {
        ...baseProfile,
        rowDims,
        colDims: [],
        measures,
        columnIndex,
      };

      return { df: this._rows, info };
    }

    // --- PIVOT CASE ------------------------------------------
    const {
      rows: wideRows,
      rowDims,
      colDims,
      measures,
      columnIndex,
    } = this._applyPivot(this._rows);

    // profile on the *wide* data we actually return
    const finalProfile = this._info(wideRows);

    const info = {
      ...finalProfile,
      rowDims,
      colDims,
      measures,
      columnIndex,
      pivotSpec: { ...this._pivotSpec },
    };

    return { df: wideRows, info };
  }
}

export const Query = {
  read_csv: Pipeline.read_csv,
  fetch_csv: Pipeline.fetch_csv,
};
