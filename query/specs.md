## Possible Improvements to AGG

```
Core
• min, max, median (alias quantile(0.5)), q25, q75, iqr (= q75−q25)
• std, var, range (= max−min)
• countDistinct (aka nDistinct), mode

Time/order aware
• first, last (respect current sort)
• nth(k) (0-indexed)

Boolean/text
• any, all (truthy)
• concat (delimiter opt), concatDistinct

Robust / businessy
• sumDistinct
• mad (median absolute deviation)
• weightedMean(weightCol) (and weightedSum)

Nice-to-have later
• geomean, harmean
• percentile(p) alias to quantile(p)
• skew, kurtosis (profiling, not default UI)
```

## Some Smart Shit

```
COLUMN FUNCTION
   ├── (1) Row-wise column function   (calc)
   │         f: row -> value
   │         preserves row count
   │
   ├── (2) Column-wise reduction      (agg)
   │         f: column[] -> value
   │         collapses row count
   │
   ├── (3) Window / transform         (window)
   │         f: column[] -> column[]
   │         preserves row count
   │
   └── (4) Frame-level reshaping      (frame ops)
             f: dataframe -> dataframe
             changes structure


1)
.calc({
  margin: sub("revenue", "profit"),
  date:   today(),
  label:  concat("country", "month", {sep: " "}),
  short:  substr("description", 0, 20),
  bucket: bucket("age", [0,18,35,50], ["Y","A","M"]),
})

2)
.groupBy("month")
.agg({
  total_revenue: sum("revenue"),
  avg_profit:    mean("profit"),
  margin_med:    quantile(0.5, "margin"),
  n:             count(),
})

3)
.calc({
  z_rev: zscore("revenue").by("country"),
  rank_profit: rank("profit").desc().within("month"),
  running_total: cumsum("sales").orderBy("date"),
  rolling_avg: rolling_mean("temperature", 7),
})

4)
.select("month", "country", /^rev/)
.pivot("month", "country", "revenue")
.join(other_df, ["id"])
.melt(["country"], ["revenue","profit"])
.sample(0.1)
.sort("date", "-revenue")
```
