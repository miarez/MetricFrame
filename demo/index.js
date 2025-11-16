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
  const pipeline = await q.fetch_csv("./data/raw2.csv");

  const { df, info } = pipeline
    .group("source", "day", "user_type")
    .agg({
      imp: sum("imp"),
      rev: sum("rev"),
      cost: sum("cost"),
    })
    .order("source", "day")
    // .pivot({
    //   rows: ["source", "day"],
    //   columns: ["user_type"],
    //   measures: ["imp", "rev", "cost"],
    // })
    .build();

  console.log(df);

  new Table()
    .container("table")
    .selectionMode("grain")
    .data(df, info)
    .heatmapByDimension("source", "perColumn")
    // .heatmapGlobal()
    .groupBorders("source", {
      color: "#ffffff",
      width: "3px",
    })
    .build();
});
