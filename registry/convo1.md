Nice, this is where your thing stops being “just a query library” and becomes an actual semantic layer.

I’ll translate your 1/2/3 into BI/Data-Eng language, answer whether 2 and 3 are the same, and then tell you what’s missing.

⸻

0. First: where in the pipeline?

You’re implicitly mixing row-level stuff and metric-level stuff.

In BI land:
• Row-level (pre-agg): net_revenue = revenue - discounts
• Metric-level (post-agg): ctr = clicks / impressions, gp_margin = gp / revenue
• Window/time metrics: 7d_rolling_avg, WoW deltas, etc.

Your registry needs to know which layer a definition belongs to, not just “calculated field”.

⸻

1. Your #1 – “calculated fields”

essentially formulas that apply (I think after aggregation)?

Sometimes after, sometimes before. You actually want two kinds: 1. Derived columns (row-level)
• “Model” level in dbt / “derived columns” in a data mart.
• Examples:
• gross_profit = revenue - cost
• is_mobile = device IN ('iphone', 'android')
• normalized_spend = spend / fx_rate 2. Metrics (agg-level)
• “Measures” in Looker/Power BI.
• Always defined with:
• agg function (sum, avg, count_distinct…)
• grain (per day, per campaign, per user)
• optional filters (only paid traffic, only active users)
• Examples:
• total_revenue = SUM(revenue)
• ctr = SUM(clicks) / SUM(impressions)
• avg_order_value = SUM(revenue) / COUNT_DISTINCT(order_id)

In your registry, this probably turns into something like:

type MetricDef = {
name: "ctr";
label: "Click-through rate";
formula: Expr; // CTR = sum(clicks) / sum(impressions)
grain: "campaign_day";
filters?: Expr[]; // e.g. only include ad_impressions
tags?: string[];
};

and

type DerivedColumnDef = {
name: "gross_profit";
expr: Expr; // revenue - cost
};

So: don’t collapse “calculated fields” into one blob. Distinguish row vs metric.

⸻

2. Your #2 – “statically coded lists and maps”

like top sources, source to source type mapping etc

This is more “reference data / semantic dimensions” than “metric”.

In BI/data-mart language, you’re talking about:
• Lookup tables / mapping tables
• source → source_type
• country → region
• utm_source → channel
• Named sets / segments
• TOP_SOURCES = ['google', 'facebook', 'tiktok']
• PREMIUM_COUNTRIES = ['US', 'CA', 'UK', 'DE']

These are super useful but they’re not metrics. They are:
• used inside metrics (filters, case expressions),
• used to build segments (“paid_social”, “tier1”),
• used in UI (dropdowns, filters).

In your registry I’d call this something like:

type MappingDef = {
name: "source_to_channel";
description: string;
mapping: Record<string, string>;
};

type NamedSetDef = {
name: "top_sources";
values: string[];
};

⸻

3. Your #3 – date helpers like yesterday(), yesterday_minus_1_week()

are 2 and 3 the same thing? should they be treated the same?

They’re similar in spirit (named reusable things) but different in shape:
• #2 is static sets/mappings of values (strings, ids).
• #3 is time-intelligence presets / macros that resolve to a filter expression or date range.

In BI land, #3 is:
• “Quick filters”: Yesterday, Last 7 days, MTD, Same day last year, etc.
• Often defined centrally so every dashboard uses the same logic.

I’d model them separately:

type DatePresetDef = {
name: "yesterday";
label: "Yesterday";
resolve: (now: Date) => { start: Date; end: Date };
};

type RelativeFilterDef = {
name: "yesterday_minus_1_week";
label: "Yesterday vs same day last week";
expr: Expr; // or a pair of date ranges for comparison
};

So:
• No, 2 and 3 are not the same thing.
• Yes, they belong in the same module (the “semantic registry”), but with different types.

If you force them into one generic “list of stuff”, you’ll regret it when you want more powerful time-intelligence later.

⸻

4. What you’re missing (the important bits)

Here’s what every serious “metric registry / semantic layer” ends up needing, and you will want for MetricFrame:

A. Dimensions & entities

You keep talking metrics, but BI folks think in entities and dimensions:
• Entities: user, session, campaign, ad_group, creative, order.
• Dimensions: country, device_type, channel, date, hour, etc.

You want a registry that can say:

type DimensionDef = {
name: "country";
entity: "user" | "session" | "campaign";
type: "string" | "categorical";
sourceColumn: string; // "country_code"
mappings?: string; // link to MappingDef e.g. source_to_region
hierarchy?: string[]; // [ "country", "region", "global" ]
};

This is what lets you later build:
• consistent filtering (always same “country” everywhere),
• smart chart defaults (“country” → map/bar, “date” → time series).

B. Segments

Not just “list of values”, but reusable filters:
• paid_traffic = source IN ('google', 'facebook', 'tiktok')
• high_value_users = lifetime_value > 500
• mobile_only = device_type IN ('ios', 'android')

type SegmentDef = {
name: "paid_traffic";
entity: "session";
filter: Expr;
};

Segments matter because half of real-world metrics are just “base metric, segmented”.

C. Metric families / templates

Instead of hardcoding every single “sum/avg/rate” combination, define metric templates:
• “rate metric”: sum(numerator) / sum(denominator)
• “ratio metric”: metric_A / metric_B
• “conversion metric”: distinct(events where event='signup') / distinct(users)

Then registries can auto-generate:

createRateMetric("ctr", { num: "clicks", den: "impressions" })
createRatioMetric("gross_margin", { num: "gross_profit", den: "revenue" })

This is how you avoid repeating the same patterns 100x.

D. Time-aware metrics

You’ll eventually care about:
• WoW / MoM / YoY deltas
• rolling windows
• cumulative metrics

They need metadata:

type TimeMetricDef = MetricDef & {
window?: { kind: "rolling"; days: number };
compareTo?: "previous_period" | "same_period_last_year";
};

These hook directly into your DatePresetDef and the planner, so the user can say:

mf.metric("revenue_7d_rolling")

and the system knows it needs a window function over date.

E. Metadata / governance

Boring but real:
• description
• unit (USD, %, count)
• owner
• tags (finance, marketing, core, experimental)
• deprecation flags

Without this, you end up with 12 versions of “revenue” and no idea which is blessed.

F. Tests / validation

You will define metrics wrong. A nice metric registry lets you declare expectations:
• cannot be negative (ctr ∈ [0, 1])
• sum should roughly equal another metric for QA (e.g. gp + cost ≈ revenue)
• allowed value ranges for dimensions

Even a lightweight version like:

type MetricTest = {
metric: string;
rule: "non_negative" | "0_to_1" | "increasing_over_time" | "custom";
customExpr?: Expr;
};

is enough for a first pass. Run tests as part of CI or “profile this metric”.

⸻

5. How I’d structure your Metric Registry module

Given your earlier folder structure, something like:

src/metrics/
Registry.ts # main API: registerMetric, getMetric, listMetrics...
types.ts # MetricDef, DerivedColumnDef, SegmentDef, DimensionDef...

definitions/
metrics.core.ts # ctr, cpc, cpm, revenue, gp, etc.
metrics.marketing.ts
derived_columns.ts
dimensions.ts
segments.ts
mappings.ts # your #2
date_presets.ts # your #3

engine/
evaluateMetric.ts # metric → plan fragment
applySegment.ts
resolveDatePreset.ts
validateMetric.ts # tests/constraints

Then the DSL side just does:

mf
.useRegistry(defaultRegistry)
.metrics("ctr", "gross_margin")
.segment("paid_traffic")
.datePreset("last_7_days")
.build();

The registry module resolves those symbolic names into concrete expressions and filters that your planner can reason about.

⸻

If you want, next step I can take one vertical (e.g. performance marketing) and sketch an actual metrics.marketing.ts with real MetricDefs, SegmentDefs, and a couple of date presets to show how it all hangs together.
