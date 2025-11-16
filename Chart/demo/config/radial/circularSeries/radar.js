import { Chart } from "../../../../builder/Chart.js";

const chartConfig = new Chart()
  .htmlContainer("chartdiv")
  .dataLoader({
    type: "csv",
    url: "./data/radar.csv",
    delimiter: ",",
  })
  .engine({
    engineType: "Radial",
    chartType: "radar",
    categoryField: "month",
    radial: {
      startAngle: -90,
      endAngle: 270,
      innerRadius: 0, // later: percent for donut-like radar
    },
    axes: {
      x: {
        id: "angle",
        type: "category",
        field: "month",
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
        field: "revenue",
        name: "Revenue",
        geom: "line",
      },
    ],
  })
  .build();

export default chartConfig;
