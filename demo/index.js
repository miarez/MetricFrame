// /demo/index.js

import { Query as q } from "../Query/src/Query.js";
import { Table } from "../Table/src/Table.js";
import {
  sum,
  mean,
  count,
  quantile,
  first,
  last,
  min,
  max,
  stddev,
  variance,
  median,
} from "../Query/src/core/Builders/Aggregation.js";
import { Column } from "../Query/src/core/Builders/Column.js";
import { Scalar } from "../Query/src/core/Functions/Scalar.js";
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
document.addEventListener("DOMContentLoaded", async () => {
  const base = await q.fetch_csv("./data/raw2.csv");

  const stats = base
    .clone()
    .summariseAll()
    // .group("user_type")
    // .stats("imp", "rev", "cost")
    // .agg({ imp: sum("imp") })
    .build();

  new Table(stats).build();
});
