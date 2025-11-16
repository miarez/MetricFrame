import { XY } from "../../../../builder/XY.js";
import { Series } from "../../../../builder/Series.js";
import { Chart } from "../../../../builder/Chart.js";

const chartConfig = new Chart()
  .htmlContainer("chartdiv")
  .dataLoader({
    type: "csv",
    url: "./data/category-single-series.csv",
    delimiter: ",",
  })
  .engine(
    new XY()
      .category("month")
      .addSeries(new Series("revenue").geom("area"))
      .build()
  )
  .build();

export default chartConfig;
