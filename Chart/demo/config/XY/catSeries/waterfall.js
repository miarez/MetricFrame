import { XY } from "../../../../builder/XY.js";
import { Series } from "../../../../builder/Series.js";
import { Chart } from "../../../../builder/Chart.js";

const chartConfig = new Chart()
  .htmlContainer("chartdiv")
  .dataLoader({
    type: "csv",
    url: "./data/waterfall.csv", // put the CSV below here
    delimiter: ",",
  })
  .engine(
    new XY()
      .category("step") // category field
      .chartType("waterfall") // forces registry → waterfallChart
      .addSeries(
        new Series("change").geom("column") // deltas per step
      )
      .build()
  )
  .build();

export default chartConfig;
