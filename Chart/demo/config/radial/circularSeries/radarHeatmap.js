// demo/config/radarHeatmap.js
import { Chart } from "../../../../builder/Chart.js";

const chartConfig = new Chart()
  .htmlContainer("chartdiv")
  .dataLoader({
    type: "csv",
    url: "./data/heatmap.csv",
    delimiter: ",",
  })
  .engine({
    engineType: "Radial",
    chartType: "radarHeatmap",
    radial: {
      startAngle: 0,
      endAngle: 360,
      innerRadius: 0,
    },
    axes: {
      x: {
        id: "angle",
        type: "category",
        field: "hour", // angle categories
      },
      y: [
        {
          id: "radius",
          type: "category",
          field: "weekday", // radial categories
        },
      ],
    },
    series: [
      {
        field: "value",
        name: "Activity",
      },
    ],
  })
  .build();

export default chartConfig;
