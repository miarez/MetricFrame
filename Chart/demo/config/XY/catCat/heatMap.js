import { Chart } from "../../../../builder/Chart.js";

const chartConfig = new Chart()
  .htmlContainer("chartdiv")
  .dataLoader({
    type: "csv",
    url: "./data/heatmap.csv",
    delimiter: ",",
  })
  .engine({
    engineType: "XY",
    chartType: "heatmap",
    axes: {
      x: {
        id: "x",
        type: "category",
        field: "hour",
        position: "bottom",
        grid: true,
      },
      y: [
        {
          id: "y",
          type: "category",
          field: "weekday",
          position: "left",
          grid: true,
        },
      ],
    },
    series: [
      {
        field: "value",
        name: "Count",
      },
    ],
  })
  .build();

export default chartConfig;
