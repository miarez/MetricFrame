import { XY } from "../../../../builder/XY.js";
import { Series } from "../../../../builder/Series.js";
import { Chart } from "../../../../builder/Chart.js";
import { ValueAxis } from "../../../../builder/Axis.js";

const chartConfig = new Chart()
  .htmlContainer("chartdiv")
  .dataLoader({
    type: "csv",
    url: "./data/category-multi-series.csv",
    delimiter: ",",
  })
  .engine(
    new XY()
      .category("month")
      .addSeries(new Series("revenue"))
      .addSeries(new Series("profit").geom("column"))
      .build()
  )
  .build();

export default chartConfig;
