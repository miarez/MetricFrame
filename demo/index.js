// /demo/index.js

import { Query as q } from "../Query/src/Query.js";
import { Table } from "../Table/src/Table.js";
import {
  sum,
  mean,
  count,
  quantile,
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
  const left = await q.fetch_csv("./data/left.csv");
  const right = await q.fetch_csv("./data/right.csv");

  console.log("Inner:");
  new Table(left.innerJoin(right, "id").build()).build();

  // const pipeline = await q.fetch_csv("./data/for-unpivot.csv");

  // new Table(
  //   pipeline
  //     .unpivot({
  //       cols: ["imp", "rev", "cost"],
  //       namesTo: "metric",
  //       valuesTo: "value",
  //     })
  //     .build()
  // )
  //   .selectionMode("grain")
  //   .heatmapByDimension("source", "perColumn")
  //   .build();
});
