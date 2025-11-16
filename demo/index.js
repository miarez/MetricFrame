// /demo/index.js

import { XY } from "../Chart/builder/XY.js";
import { Series } from "../Chart/builder/Series.js";
import { Chart } from "../Chart/builder/Chart.js";
import { createChart } from "../Chart/src/core/createChart.js";

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

  const casted = base
    .clone()
    .group("day")
    .agg({
      imp: sum("imp"),
      rev: sum("rev"),
      cost: sum("cost"),
    })
    .order("day")
    .build();

  new Table(casted).heatmapPerColumn().build();

  console.table(casted.df);

  const chartConfig = new Chart()
    .htmlContainer("chartdiv")
    .engine(
      new XY()
        .category("day")
        .addSeries(new Series("imp"))
        .addSeries(new Series("rev").axis("y2"))
        .addSeries(new Series("cost").axis("y3"))
        .build()
    )
    .build();

  chartConfig.data = casted.df;

  console.log(chartConfig);

  createChart(chartConfig);
});

/**
 * Render an array of { id, title, dataFrame } as tables
 * inside #table-container.
 *
 * Each demo gets:
 *  - <h3> title
 *  - <div id="{id}"></div> where Table will render
 */
function renderTables(demos) {
  const container = document.getElementById("table-container");
  if (!container) {
    console.error("renderTables: #table-container not found");
    return;
  }

  // Nuke whatever was inside (<table id="table"> etc)
  container.innerHTML = "";

  demos.forEach((demo) => {
    const { id, title, dataFrame } = demo;

    // Wrapper for spacing / styling
    const wrapper = document.createElement("div");
    wrapper.className = "demo-table";

    // Title
    const heading = document.createElement("h3");
    heading.textContent = title;
    wrapper.appendChild(heading);

    // Table container element
    const tableHost = document.createElement("div");
    tableHost.id = id;
    wrapper.appendChild(tableHost);

    container.appendChild(wrapper);

    // Your Table API integrates here
    new Table(dataFrame).container(id).build();
  });
}
