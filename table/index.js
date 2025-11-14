// index.js
import { loadCsv } from "./utils/csv.js";
import { TableBuilder } from "./src/TableBuilder.js";

const CSV_PATH = "./data/data3.csv";

document.addEventListener("DOMContentLoaded", () => {
  loadCsv(CSV_PATH)
    .then((rows) => {
      const table = new TableBuilder()
        .container("table")
        .rows(rows)
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

      window.table = table;
    })
    .catch(console.error);
});
