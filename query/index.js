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
  .read_csv("./data/df2.csv", "utf8")
  .select(
    "day",
    "source",
    "is_weekend",
    "user_type",
    "is_churned",
    "imp",
    "rev",
    "cost"
  )
  .group("day", "source", "is_weekend", "user_type", "is_churned")
  .agg({
    imp: sum("imp"),
    rev: sum("rev"),
    cost: sum("cost"),
  })
  .pivot({
    rows: ["source", "day", "is_weekend"],
    columns: ["user_type", "is_churned"],
    measures: ["imp", "rev", "cost"],
  })
  .build();

console.log("Processed DataFrame:");
console.log(df);

console.log("Profile:");
console.log(info);
