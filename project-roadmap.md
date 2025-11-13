MetricFrame / Query Language — Project Roadmap

A modern, opinionated data manipulation language inspired by dplyr, pandas, and SQL — designed for analysts, BI teams, and performance marketing workflows.

⸻

📌 Vision Statement

Build a columnar-first, functional, immutable-by-default data manipulation engine and DSL that:
• works like dplyr (clean chaining, pure transformations)
• feels like pandas (flexible, expressive)
• integrates like SQL (joins, pivots, aggregation)
• supports business logic layers (metric registries)
• supports materialized views (cached or computed on demand)
• allows R-style interactive workflow (run-by-cursor)
• supports reactive pipelines (downstream refreshes)
• is backend-agnostic and eventually can use faster engines under the hood (JS → Python → Rust/C++).

This is not “just a dataframe library.”
It’s a full data experience layer.

⸻

1. Language Core (DSL)

The core syntax is based on chainable transformations:

mf.read_csv("raw.csv")
.select("date", "source", "revenue", "profit")
.filter(Column.gt("revenue", 0))
.calc({ margin: sub("revenue", "cost") })
.group("date", "source")
.agg({ revenue: sum("revenue"), margin: mean("margin") })
.order("-date", "source")
.limit(500)
.build();

Core verbs (implemented)
• read_csv, read_json
• select(...)
• filter(...)
• calc({...}) — row-wise column creation
• group(...)
• agg({...}) — column reductions
• order(...) / orderBy(...) (with -col for descending)
• limit(...)
• build()

Planned core verbs
• distinct()
• dropNA()
• fillNA()
• cast("col", "type")
• rename({ old: new })
• sample(n | frac)
• replace(...)
• pluck("col")

⸻

2. Column-Level Function System

A strict separation:

✔ Scalar Functions

operate on single values
Used inside user-defined functions or manual filter callbacks.
Defined in Scalar.js as static methods.

Examples:
Scalar.add(a,b), Scalar.abs(x), Scalar.gt(a,b), Scalar.bucket(x, bins, labels)…

⸻

✔ Column Functions

return wrappers describing how to apply scalar functions across a dataset.
Used inside .calc() and .filter().

Examples:

calc({
margin: sub("revenue", "cost"),
month_short: substr("month", 0, 3),
label: concat("country", "source", { sep: " - " })
})

These produce descriptors, not values.
The engine resolves them row-by-row.

⸻

3. Aggregation Builder

A unified, extensible aggregation system:
• declarative column-based use: sum("revenue")
• structural use: { gp: sum, revenue: mean("revenue") }
• consistent metadata and column resolution rules

Long-term:
• window functions
• ranks, percentiles
• multi-pass aggregations

⸻

4. Metric Registry

A layered, override-friendly system for reusable business logic:

Motivation:
• Avoid rewriting GP, margin, CPC, CTR, etc.
• Share metrics across teams.
• Allow vertical overrides (global → jobs → jobs/region).
• Track versions to avoid silent changes.

Structure:
• global/metrics.js
• jobs/metrics.js
• promos/metrics.js

Metrics have:

{
version: "2.1.0",
scope: "jobs",
description: "...",
apply(df) { ... }
}

Planned features:
• Layered inheritance (...spread)
• MetricRegistry.forScope("jobs/ca")
• metric version diff when report opens
• metric descriptions + lineage

⸻

5. Materialized Views (Cached Computations)

A system for snapshotting precomputed dataframes with TTLs and fallback:

view("jobs/gp_by_source_today", {
ttl: "1h",
compute: () => { ... MetricFrame chain ... },
});

Calling:

const df = await useView("jobs/gp_by_source_today");

gives:
• cached df if fresh
• or recomputes via compute() if expired

Goals:
• reduce repeated heavy transforms
• allow whole teams to share prepared datasets
• keep dashboards consistent
• avoid “surprise stale” with TTL + freshness constraints

Planned view features:
• TTL-aware view caching
• snapshot metadata storage
• freshness indicators in downstream reports
• invalidation + refresh commands

⸻

6. Reactive Workspace (R-style Local Memory)

A core innovation:
Named transformations with dependency graphs.

Define:

ws.define("df_raw", () => mf.read_csv("raw.csv"));
ws.define("df", ({ df_raw }) => df_raw.filter(...).calc(...));
ws.define("top_n", ({ df }) => df.group(...).agg(...).limit(10));
ws.define("chart", ({ top_n }) => buildChart(top_n));

Use:

ws.get("chart");

Modify df logic → auto-recompute downstream:

ws.refreshDownstream("df");
ws.get("chart"); // updated chart

This is effectively a local DAG engine inside your data language,
allowing for:
• interactive prototyping
• hot-reloads
• stateful exploratory analysis

Inspired by:
RStudio + dbt + Airflow + spreadsheets.

⸻

7. Interactive Runtime (R-style)

A major design choice:

✔ One script file
✔ Run-block-by-cursor
✔ Long-lived runtime
✔ Workspace memory
✔ No Jupyter notebook blocks
✔ No global cells that fall out of sync

This mode allows analysts to:
• experiment fast
• run just the part they are editing
• keep dfs in memory
• reuse upstream results

Core planned features:
• VS Code extension or command “Run selection in MetricFrame Runtime”
• Persistent REPL process
• Inspect memory (workspace.ls())
• Delete/refresh objects
• Print previews (df.head())

⸻

8. Future Execution Engines

MetricFrame is intentionally backend-agnostic.

The plan:

Stage 1 (now)
• JS-only execution in Node
• fully eager
• JSON/CSV I/O

Stage 2
• optional lazy planner
• pluggable execution backends

Backends may include:
• Python (pandas, polars)
• Rust (polars native)
• DuckDB for local SQL execution
• WebAssembly bundles
• Cloud database pushdowns

The DSL stays the same.
The engine changes under the hood.

⸻

9. Perf Marketing–Specific Enhancements

Since one of the first real verticals is performance marketing:

Plans:
• built-in topN + bucketization helpers
• concentration analysis (Herfindahl, pareto)
• attribution helpers
• source dominance detection
• auto-facet detection
• “Other” category collapsing
• time-window join helpers
• snapshot view patterns:
• daily top sources
• yesterday vs last week KPIs
• alerting on metric changes

⸻

10. Long-Term Roadmap (Chronological Rough Order)

Phase 1 — Solidify core
• Immutable Pipeline
• Better error messages
• Finish Column functions
• Finish Aggregation builder
• Add missing core verbs (distinct, pivot, joins, etc.)

Phase 2 — Metric Framework
• Metric Registry
• Metric validation + versioning
• Diff on load

Phase 3 — Views
• View registry
• Snapshot caching
• TTL + freshness + fallback

Phase 4 — Workspace Runtime
• Reactive DAG workspace
• VS Code integration
• Run-by-cursor
• Inspect & refresh commands

Phase 5 — Execution Engine Expansion
• Lazy query planner
• Backend adapters (Python/Rust/SQL)

Phase 6 — Polishing / UX
• Reproducible reports
• Rendering helpers (tables / charts)
• API docs + examples

⸻

11. High-Level End Goal

A full data manipulation environment that:
• lets analysts express transformations clearly
• lets BI folks share formulas safely
• lets devs connect backends flexibly
• unifies SQL / pandas / dplyr concepts
• can power dashboards, scripts, reports, and pipelines
• can scale up or down
• works interactively and in production

All while having one north star:

Make data transformation simple, predictable, explicit, sharable, and fast.

⸻

If you want, I can create a matching CONTRIBUTING.md, directory structure proposals, or a “MetricFrame Philosophy” doc.
