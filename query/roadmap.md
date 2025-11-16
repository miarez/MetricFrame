## Query Module Core Feature Checklist

### ✅ Must-haves (Core Table Ops)

- [x] Load data
  - [x] `read_csv()` via `Csv.readTableSync`
  - [x] `read_json()` (via `Json.readTableSync`, value = rows array)
- [x] Column selection / projection
  - [x] `select()` by explicit names
  - [ ] `select()` helpers:
    - [ ] select all except (`-col`)
    - [ ] select by regex (`matches("^prefix")`)
    - [ ] select by type (`num`, `cat`, `date`, etc.)
- [x] Row filtering
  - [x] `.filter(row => …)` with raw JS + `Scalar.*`
  - [x] `.filter(Column.*(...))` with column descriptors (pure DSL)
  - [ ] `.filter()` with string expressions (tiny query language)
- [x] Derived columns
  - [x] `.calc({ newCol: Column.*("col", ...) })`
  - [x] `.calc({ newCol: r => Scalar.*(r.col, ...) })`
  - [ ] `.mutateInPlace()` (overwrite existing columns explicitly)
- [x] Grouping + aggregation
  - [x] `.group("col", ...)`
  - [x] `.agg({ out: sum("col"), … })`
  - [x] Aggregators:
    - [x] `sum`
    - [x] `mean`
    - [x] `count`
    - [x] `quantile(p, col)`
  - [x] More aggs:
    - [x] `min`, `max`
    - [x] `stddev`, `var`
    - [x] `median`
    - [x] `first`, `last`,
- [x] Ordering
  - [x] `.order("col", "-col2")` with asc / desc via `-`
  - [ ] `.order()` by expression (`Scalar.*` on the fly)
- [x] Limiting / sampling
  - [x] `.limit(n)`
  - [ ] `.head(n)` / `.tail(n)`
  - [ ] `.sample(n | frac, stratify_by?)`
- [x] Basic profiling
  - [x] `inferTypes()` (and now automatic in constructor)
  - [x] `build().info` / `profile` → types, cardinality, seriesColumns, facetFields
  - [ ] Missingness profile (NA counts / fractions per column)
  - [ ] Simple distribution stats for numeric columns (min, max, mean, q’s)

---

### 🚧 Should-haves (Daily Analyst Comfort Features)

- [ ] Type manipulation
  - [ ] `cast("col", "num" | "cat" | "date" | "bool")`
  - [ ] `parseDate("col", fmt)`
- [ ] Handling missing data
  - [x] `dropNA(cols?)`
  - [x] `fillNA({ col: value | Column.*(...) })`
  - [x] `fillDown()` -- todo: add documentation
- [ ] Distinct / de-duplication
  - [x] `distinct("col", ...)`
  - [x] `dedupeBy("keyCol", "orderCol")`
- [x] Joins
  - [x] `leftJoin(other, on)`
  - [x] `innerJoin(other, on)`
  - [x] `rightJoin(other, on)`
  - [x] `fullJoin(other, on)`
  - [x] `semiJoin` / `antiJoin`
- [ ] Reshaping
  - [x] `pivot_wider({ namesFrom, valuesFrom })`
  - [x] `pivot_longer({ cols, namesTo, valuesTo })`
- [ ] Set operations
  - [x] `union(other)` --> just append
  - [x] `intersect(other)` --> show only in both
  - [x] `except(other)` / `minus(other)` --> show only in A
- [ ] Row numbering / indexing
  - [ ] `withRowNumber("row_id")`
  - [ ] `rank("col", { dense?, desc? })`

---

### 😎 Cool / Quality-of-Life Features

- [x] Function libraries
  - [x] `Scalar` (all the numeric/string/date/bucket helpers)
  - [x] `Column` (descriptor wrappers on top of Scalar)
  - [x] `Columnar` (array/column-wise wrappers on top of Scalar)
- [x] Combined predicates
  - [x] `Column.all(...)`
  - [x] `Column.any(...)`
- [ ] Column selection helpers
  - [ ] `startsWith("prefix")`, `endsWith("suffix")` for select
  - [ ] `contains("substring")` for select
  - [ ] `byType("num" | "cat" | "date")` for select
- [ ] Named pipelines
  - [ ] `.label("step-name")` for debugging
  - [ ] `.explain()` to print the logical plan
- [ ] Simple caching
  - [ ] `.cache()` to freeze intermediate df for reuse

---

### 🧠 Advanced / Future Engine Stuff

- [ ] Window functions
  - [ ] `.windowBy("groupCol").orderBy("date").calc({ ... })`
  - [ ] `cumsum("col")`, `movingAvg("col", k)`, `lag/lead("col", k)`
  - [ ] `zscore("col")` as a true window op
- [ ] Incremental / streaming
  - [ ] Ability to process chunks of CSV / JSON
  - [ ] Partial aggregation (combine intermediate states)
- [ ] Pushdown / optimization
  - [ ] Plan representation separate from MetricFrame
  - [ ] Simple optimizer (reorder filters, push projections)
- [ ] Multi-backend execution
  - [ ] JS in-memory (current)
  - [ ] DuckDB / SQL backend (compile DSL → SQL)
  - [ ] Arrow / WASM backend
  - [ ] Remote engine (send plan over HTTP)

---

### 🎨 Plot-oriented / BI-friendly Extras (later, but relevant)

- [ ] Faceting hints
  - [ ] `profile.facetFields` already exists
  - [ ] `.suggestFacets(maxCardinality?)`
- [ ] Series inference for charts
  - [ ] `.asSeriesSpec()` to drive chart builder
- [ ] Auto-EDA helpers
  - [ ] `.autoSummary()` (one-pager stats)
  - [ ] `.autoBinning("col")` using `bucket()` + heuristics

---

## Future Refactor Notes

### 1. Pivot default aggregation is opinionated

`pivot()` currently defaults to `agg: "sum"` whenever duplicates exist.
This is safe but non-neutral. Later, consider:

- strict reshape mode (error on duplicates)
- per-measure default aggregation
- or a global default agg override.

### 2. Role inference (dims vs measures) is too automatic

Non-pivot `build()` treats:

- numeric → measures
- everything else → dims

This is convenient for dashboards, but not general-purpose.
Later, consider:

- explicit `as_dim()` / `as_measure()` overrides
- or removing automatic role inference from `build()`.

### 3. True `undoPivot()` (inverse pivot) missing

`unpivot()` is a generic pivot_longer, not a true inverse of `pivot()`.
It ignores `pivotSpec` and `columnIndex` and only melts explicit cols.

Later, consider adding a real `undoPivot()` that reconstructs the exact
pre-pivot long shape by using:

- `pivotSpec.rows` (row dims)
- `pivotSpec.columns` (column dims)
- `pivotSpec.measures` (measure fields)
- `info.columnIndex.path` (actual dim-value paths)

This would let any wide table produced by `pivot()` be perfectly
reversible, regardless of measure count or column depth.

### 📝 Future Fill-Function Notes

- [ ] Add `fillUp(col, { by?, orderBy? })`

  - Equivalent to reverse → fillDown → reverse.
  - Pure sugar; no new capability needed.
  - Only add if ergonomics matter.

- [ ] Add interpolation-based fills (optional future feature)

  - `fillLinear(col, { by?, orderBy? })`
  - Cannot be expressed via fillDown; creates new values.
  - Only needed if Query ever supports time-series smoothing.

- [ ] Add statistic-based fills (optional)
  - `fillMean(col)`
  - `fillMedian(col)`
  - `fillMode(col)`
  - Unlike fillDown, these _invent_ new values and cannot be emulated.

### 🚫 Not needed (already achievable)

- Directional carry behaviors (forward, backward, grouped):
  - All reducible to ordering + `fillDown()`
  - No correctness gaps; purely syntactic sugar.

## Possible Otherss

- mutateAt()
- summariseAcross()
- complete()
- relocate(is_weekend, .after = date) # move to 3rd column
