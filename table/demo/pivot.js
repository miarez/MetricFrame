// demo/pivot.js

import { pivot } from "../data/new.js";
import { TableBuilder } from "../src/TableBuilder.js";

document.addEventListener("DOMContentLoaded", () => {
  const { df, info } = pivot;

  console.log("=== PIVOT DF ===");
  console.log(df);
  console.log("=== PIVOT INFO ===");
  console.log(info);

  new TableBuilder()
    .container("table")
    .data(df, info)
    .heatmapByDimension("source", "global")
    .selectionMode("value")
    // .groupBorders("source", {
    //   color: "#ffffff",
    //   width: "3px",
    // })
    // .groupBorders("is_weekend", {
    //   color: "#ffffff",
    //   width: "3px",
    // })
    .build();
});
