// demo/config/polarScatter.js
import { Chart } from "../../../../builder/Chart.js";

const chartConfig = new Chart()
  .htmlContainer("chartdiv")
  .dataLoader({
    type: "csv",
    url: "./data/polar-scatter.csv",
    delimiter: ",",
  })
  .engine({
    engineType: "Radial",
    chartType: "polarScatter",
    radial: { startAngle: 0, endAngle: 360, innerRadius: 0 },
    axes: {
      x: { id: "angle", type: "value", field: "x" },
      y: [{ id: "radius", type: "value", min: 0 }],
    },
    series: [
      {
        angleField: "x",
        field: "y", // radius
        name: "Points",
        geom: "dot",
      },
    ],
  })
  .build();

export default chartConfig;
