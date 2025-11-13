## Profit For Top 5 Sources Compared to 1/2 Weeks Ago

```js
const today_1w_2w = [today(), addDays(today(), -7), addDays(today(), -14)];

const { df, info } = mf
  .read_csv("profit_by_source_daily.csv")

  // Keep only the rows we care about
  .select("date", "source", "profit")

  // Focus on yesterday, 7 days ago, 14 days ago
  .filter((r) => Scalar.inSet(r.date, today_1w_2w))

  // ---- STEP 1: Identify top 5 sources by *yesterday's* profit ----
  .group("date")
  .calc({
    // total profit per source (no change)
    profit: (r) => +r.profit,
  })
  .order("-profit")
  .topN("source", 5, { restLabel: "Other" })

  // ---- STEP 2: Aggregate to source-level per date ----
  .group("date", "source")
  .agg({
    profit: sum("profit"),
  })

  // ---- STEP 3: Pivot into columns for easy comparison ----
  .pivot_wider({
    index: ["source"],
    columns: "date",
    values: "profit",
  })

  // ---- STEP 4: Calculate absolute + percentage change ----
  .calc({
    abs_change_1w: sub(col("yesterday"), col("1w_ago")),
    abs_change_2w: sub(col("yesterday"), col("2w_ago")),
    pct_change_1w: pct(col("yesterday"), col("1w_ago")),
    pct_change_2w: pct(col("yesterday"), col("2w_ago")),
  })

  .order("-yesterday")
  .build();
```
