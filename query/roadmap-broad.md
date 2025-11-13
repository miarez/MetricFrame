# MetricFrame Analyst Toolkit — Feature Checklist

Below is the full checklist combining:

- Core relational/dataframe operations
- Analyst pattern heuristics (tiering, top-N, dominance)
- Cleaning & enrichment operations
- Exploration & QA utilities

Everything **you already support in your DSL** is checked ✓.  
Everything not yet implemented is unchecked ☐.

---

# ✅ Core Table Operations

### **Loading / Structure**

- [x] `read_csv()`
- [x] `read_json()`
- [x] Auto type inference (happens inside constructor)

### **Row/Column Operations**

- [x] `select()`
- [x] `filter()` with:
  - [x] JS predicate `(r) => …`
  - [x] Column DSL predicate `gt("revenue",1000)`
  - [x] Combined predicates `Column.all`, `Column.any`
- [x] `calc()` (derived columns)
- [x] `group()`
- [x] `agg()`
  - [x] `sum`, `mean`, `count`, `quantile`
  - [ ] `min`, `max`
  - [ ] `stddev`, `var`, `median`, `mode`
- [x] `order("col","-col2")`
- [x] `limit(n)`

### **Missing pieces (core ops)**

- [ ] `distinct()`
- [ ] `cast()`
- [ ] `dropNA()`
- [ ] `fillNA()`
- [ ] `head()`, `tail()`
- [ ] `sample()` (random or stratified)
- [ ] `transpose()`

---

# 🔄 Reshaping & Structure

| Task                            | Feature             | Status                               |
| ------------------------------- | ------------------- | ------------------------------------ |
| Pivot wide → long / long → wide | `pivot()`, `melt()` | ☐                                    |
| Transpose rows ↔ columns        | `transpose()`       | ☐                                    |
| Split one column into many      | `splitCol()`        | ☐                                    |
| Combine columns                 | `combine()`         | ☐ (some pieces doable with `concat`) |
| Append/smart concat             | `concat()`          | ☐                                    |
| Deduplicate                     | `distinct()`        | ☐                                    |

---

# 🔗 Joining & Lookup

| Task                     | Function               | Status |
| ------------------------ | ---------------------- | ------ |
| VLOOKUP/HLOOKUP          | `join(other,{on,how})` | ☐      |
| Merge datasets           | `merge()`              | ☐      |
| Conditional merge        | `joinIf()`             | ☐      |
| Fuzzy join               | `fuzzyJoin()`          | ☐      |
| Mapping table enrichment | `mapValues()`          | ☐      |

---

# 🧹 Cleaning & Quality

| Task                       | Function               | Status |
| -------------------------- | ---------------------- | ------ |
| Fill blanks / forward-fill | `fillNA()`             | ☐      |
| Standardize categories     | `normalize("country")` | ☐      |
| Detect outliers            | `clipOutliers()`       | ☐      |
| Type casting               | `cast()`               | ☐      |
| Handle duplicates w/ rule  | `dedupe()`             | ☐      |
| Validate schema            | `assert.schema()`      | ☐      |

---

# 🧮 Derived / Enrichment

| Task                | Function         | Status                                     |
| ------------------- | ---------------- | ------------------------------------------ |
| YoY / MoM           | `deriveGrowth()` | ☐                                          |
| Running totals      | `cumsum()`       | ☐                                          |
| Rank / percentile   | `rank()`         | ☐                                          |
| Bucketing / binning | `bucket()`       | **(✓ already available in Scalar/Column)** |
| Flag rules          | `flag()`         | ☐                                          |
| Percent share       | `share()`        | ☐                                          |

---

# 🧠 Conditional Segmentation / Tier Logic

These are the **business heuristics** analysts do in Excel all the time.

| Task                                         | Function                | Status                                              |
| -------------------------------------------- | ----------------------- | --------------------------------------------------- |
| Detect when one category dominates 30%+      | `detectDominance()`     | ☐                                                   |
| Take top-N categories, group rest as “Other” | `topN()`                | ☐                                                   |
| Collapse small categories                    | `collapseSmall()`       | ☐                                                   |
| Create quantile or equal-width tiers         | `tier()`                | ☐ (partial via `bucket()` but full tiering not yet) |
| Split DF into top vs rest segments           | `splitByContribution()` | ☐                                                   |
| Compare top vs rest                          | `compareTopRest()`      | ☐                                                   |

---

# ⚖️ Weighting & Proportional Logic

| Task                            | Function              | Status |
| ------------------------------- | --------------------- | ------ |
| Compute share of total          | `share()`             | ☐      |
| Reweight / rebalance groups     | `rebalance()`         | ☐      |
| Measure skew: Gini / Herfindahl | `concentration()`     | ☐      |
| Flag highly concentrated fields | `flagConcentration()` | ☐      |

---

# 🔍 Diagnostic Utilities

| Task                             | Function               | Status              |
| -------------------------------- | ---------------------- | ------------------- |
| Auto profile                     | `profile/info`         | **✓ (implemented)** |
| Schema comparison                | `compareSchemas()`     | ☐                   |
| Data diffing                     | `diff(other)`          | ☐                   |
| Summaries (describe numeric/cat) | `summarize()`          | ☐                   |
| Cardinality diagnostics          | (partially in profile) | ✓ partial           |

---

# 🎨 BI / Visualization Support (Future)

| Task                      | Function          | Status |
| ------------------------- | ----------------- | ------ |
| Suggest facets            | `suggestFacets()` | ☐      |
| Suggest series for charts | `asSeriesSpec()`  | ☐      |
| Auto EDA one-pager        | `autoSummary()`   | ☐      |

---

# 🚀 Your current DSL supports these today

You can already write:

```js
mf
  .read_csv("...")
  .select(...)
  .group("month")
  .filter(gt("revenue", 1000))
  .calc({ margin: sub("revenue","profit") })
  .agg({ total_revenue: sum("revenue"), ... })
  .order("month","-country")
  .limit(5000)
  .build();
```
