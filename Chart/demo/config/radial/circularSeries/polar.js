// demo/config/polarLine.js
import { Chart } from "../../../../builder/Chart.js";

const chartConfig = new Chart()
  .htmlContainer("chartdiv")
  .dataLoader({
    type: "csv",
    url: "./data/polar.csv",
    delimiter: ",",
  })
  .engine({
    engineType: "Radial",
    chartType: "polarLine",
    radial: { startAngle: 0, endAngle: 360, innerRadius: 0 },
    axes: {
      x: {
        id: "angle",
        type: "value", // IMPORTANT: numeric angle
        field: "angle",
      },
      y: [
        {
          id: "radius",
          type: "value",
          min: 0,
        },
      ],
    },
    series: [
      {
        field: "value", // radius
        name: "Value",
        geom: "column",
      },
    ],
  })
  .build();

export default chartConfig;
