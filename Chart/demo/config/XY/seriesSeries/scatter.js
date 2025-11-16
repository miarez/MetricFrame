import { Chart } from "../../../../builder/Chart.js";

const chartConfig = new Chart()
  .htmlContainer("chartdiv")
  .dataLoader({
    type: "csv",
    url: "./data/scatter.csv",
    delimiter: ",",
  })
  .engine({
    engineType: "XY",
    chartType: "scatter",
    axes: {
      x: {
        id: "x",
        type: "value",
        position: "bottom",
        min: 0,
        // max: optional, or let amCharts auto-range
      },
      y: [
        {
          id: "y",
          type: "value",
          position: "left",
          min: 0,
        },
      ],
    },
    series: [
      {
        name: "Points",
        xField: "x", // numeric column in CSV
        yField: "y", // numeric column in CSV
        radius: 4, // optional override
      },
    ],
  })
  .build();

export default chartConfig;
