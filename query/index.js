import { MetricFrame as mf } from "./src/MetricFrame.js";
import { sum, mean, count, quantile } from "./src/core/Builders/Aggregation.js";
import { Column } from "./src/core/Builders/Column.js";
const {
  add,
  sub,
  mul,
  div,
  mod,
  abs,
  round,
  floor,
  ceil,
  pct,
  change,
  clip,
  eq,
  neq,
  gt,
  lt,
  gte,
  lte,
  between,
  inSet,
  notIn,
  ifelse,
  coalesce,
  concat,
  upper,
  lower,
  title,
  trim,
  ltrim,
  rtrim,
  substr,
  replace,
  startsWith,
  endsWith,
  contains,
  len,
  today,
  now,
  year,
  month,
  day,
  quarter,
  weekday,
  addDays,
  addMonths,
  addYears,
  diffDays,
  diffMonths,
  formatDate,
  bucket,
  all,
  any,
} = Column;
import { Scalar } from "./src/core/Functions/Scalar.js";

const { df, info } = mf
  .read_csv("./data/df1.csv", "utf8")
  .select("month", "country", "revenue", "profit")
  .group("month")
  .filter(gt("revenue", 1000))
  .filter((r) => Scalar.gt(r.revenue, 1000))
  .calc({
    margin: sub("revenue", "profit"),
    date: today(),
  })
  .agg({
    total_revenue: sum("revenue"),
    profit: mean("profit"),
    margin: quantile(0.5, "margin"),
    n: count(),
  })
  .order("month", "-country")
  .limit(5000)
  .build();

console.log("Processed DataFrame:");
console.table(df);

console.log("Profile:");
console.log(info);
