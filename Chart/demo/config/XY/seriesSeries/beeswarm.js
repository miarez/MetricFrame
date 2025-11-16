import { Chart } from "../../../../builder/Chart.js";

const chartConfig = new Chart()
  .htmlContainer("chartdiv")
  .dataLoader({
    type: "csv",
    url: "./data/beeswarm.csv",
    delimiter: ",",
  })
  .engine({
    engineType: "XY",
    chartType: "beeswarm",
    axes: {
      x: {
        id: "x",
        type: "value",
        position: "bottom",
        // min / max optional; chart auto-fits to data
      },
      y: [
        {
          id: "y",
          type: "value",
          position: "left",
        },
      ],
    },
    series: [
      {
        // required fields in CSV:
        //   x   → horizontal position
        //   y   → (optional) base vertical position, default 0
        //   value → controls radius
        xField: "x",
        yField: "y",
        valueField: "value",
        name: "Bees",
        minRadius: 2,
        maxRadius: 9,
      },
    ],
  })
  .build();

export default chartConfig;
