// demo/index.js

import { regular } from "../data/new.js";
import { TableBuilder } from "../src/TableBuilder.js";

document.addEventListener("DOMContentLoaded", () => {
  // language-style destructuring
  const { df, info } = regular;

  console.log("=== REGULAR DF ===");
  console.log(df);
  console.log("=== REGULAR INFO ===");
  console.log(info);

  new TableBuilder()
    .container("table")
    .rows(df)
    .heatmapByDimension("source", "perColumn")
    .groupBorders("source", {
      color: "#ffffff",
      width: "3px",
    })
    .groupBorders("is_weekend", {
      color: "#ffffff",
      width: "3px",
    })
    .build();
});
