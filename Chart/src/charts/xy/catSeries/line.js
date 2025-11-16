// src/charts/xy/catSeries/line.js

import { buildCatSeriesChart } from "./_baseCatSeries.js";

/**
 * Final chart type for engineType="XY", chartType="line".
 * Uses the generic CatSeries base, which chooses LineSeries based on geom/chartType.
 */
export function lineChart(root, config) {
  return buildCatSeriesChart(root, config);
}
