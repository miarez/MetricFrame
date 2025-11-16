import { Csv } from "./io/csv.js";
import { Inference } from "./core/Inference.js";

class Pipeline {
  constructor(rows) {
    this._rows = rows || [];
    this._types = Inference.inferTypes(this._rows);
    this._groupKeys = null;
    this._pivotSpec = null;
  }

  static _copyRows(rows) {
    return rows.map((r) => ({ ...r }));
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
    return this;
  }

  // ---- GROUP / AGG / ORDER / LIMIT ---------------------------

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

  // ---- PIVOT BUILDER API -------------------------------------

  pivot({ rows = [], columns = [], measures = [] } = {}) {
    this._pivotSpec = {
      rows: rows.flat(),
      columns: columns.flat(),
      measures: measures.flat(),
    };
    return this;
  }

  pivotRows(...fields) {
    if (!this._pivotSpec) {
      this._pivotSpec = { rows: [], columns: [], measures: [] };
    }
    this._pivotSpec.rows = fields.flat();
    return this;
  }

  pivotCols(...fields) {
    if (!this._pivotSpec) {
      this._pivotSpec = { rows: [], columns: [], measures: [] };
    }
    this._pivotSpec.columns = fields.flat();
    return this;
  }

  pivotMeasures(...fields) {
    if (!this._pivotSpec) {
      this._pivotSpec = { rows: [], columns: [], measures: [] };
    }
    this._pivotSpec.measures = fields.flat();
    return this;
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

    const outMap = new Map(); // key: JSON(rowDims values) -> row object
    const colIndexObj = {}; // syntheticColId -> { measure, dims, path }

    for (const r of rows) {
      // 1) find or create the pivoted row keyed by rowDims
      const keyValues = rowDims.map((k) => r[k]);
      const rowKey = JSON.stringify(keyValues);
      let outRow = outMap.get(rowKey);
      if (!outRow) {
        outRow = {};
        rowDims.forEach((k, i) => {
          outRow[k] = keyValues[i];
        });
        outMap.set(rowKey, outRow);
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
        const path = [m, ...colDims.map((d) => String(r[d]))];
        const colId = path.join("|"); // e.g. "imp|control|0"
        outRow[colId] = r[m];

        if (!colIndexObj[colId]) {
          colIndexObj[colId] = {
            measure: m,
            dims: { ...dimVals },
            path, // ["imp","control","0"]
          };
        }
      }
    }

    const wideRows = Array.from(outMap.values());

    const columnIndex = Object.entries(colIndexObj).map(([key, meta]) => ({
      key,
      path: meta.path,
      dims: meta.dims,
      measure: meta.measure,
    }));

    const measures =
      measuresSpec.length > 0
        ? measuresSpec.slice()
        : Array.from(new Set(columnIndex.map((c) => c.measure)));

    return { rows: wideRows, rowDims, colDims, measures, columnIndex };
  }

  // ---- INFO / BUILD ------------------------------------------

  _info(rows = this._rows) {
    const nRows = rows.length;
    const cols = nRows ? Object.keys(rows[0]) : [];
    const nCols = cols.length;

    const types = this._types || Inference.inferTypes(rows);
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
    const baseProfile = this._info(this._rows);

    // --- NON-PIVOT CASE --------------------------------------
    if (!this._pivotSpec) {
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

    const info = {
      ...baseProfile,
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
